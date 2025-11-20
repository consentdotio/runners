import { glob } from 'glob';
import { pathToFileURL } from 'node:url';
import type { RunnerTest } from 'runners';

export async function discoverTests(
  pattern: string = 'tests/**/*.ts'
): Promise<Map<string, RunnerTest>> {
  const testFiles = await glob(pattern, {
    ignore: ['node_modules/**', 'dist/**'],
  });

  const tests = new Map<string, RunnerTest>();

  for (const file of testFiles) {
    try {
      const moduleUrl = pathToFileURL(file).href;
      const module = await import(moduleUrl);

      for (const [exportName, exportValue] of Object.entries(module)) {
        // Check if the export is a function (basic check)
        if (typeof exportValue === 'function') {
          // Try to infer if it's a RunnerTest by checking if it's async
          // In a real implementation, we might use TypeScript's type checking
          // For now, we'll accept any async function export
          if (exportValue.constructor.name === 'AsyncFunction') {
            tests.set(exportName, exportValue as RunnerTest);
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load test file ${file}:`, error);
    }
  }

  return tests;
}

