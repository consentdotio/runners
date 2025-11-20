import { glob } from "glob";
import { pathToFileURL } from "node:url";
import type { RunnerTest } from "../types.js";
import { detectDirectives } from "./directive-detector.js";

export async function discoverTests(
  pattern: string = "src/**/*.ts",
  requireDirective: boolean = true
): Promise<Map<string, RunnerTest>> {
  const testFiles = await glob(pattern, {
    ignore: ["node_modules/**", "dist/**"],
  });

  const tests = new Map<string, RunnerTest>();

  for (const file of testFiles) {
    try {
      // Always check directives - directive requirement is now default
      let directiveInfo:
        | Awaited<ReturnType<typeof detectDirectives>>
        | undefined;
      if (requireDirective) {
        try {
          directiveInfo = detectDirectives(file);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Failed to parse directives in ${file}:`,
            error instanceof Error ? error.message : String(error)
          );
          // Skip this file if we can't parse it and directive is required
          continue;
        }
      }

      const moduleUrl = pathToFileURL(file).href;
      const module = await import(moduleUrl);

      const hasModuleDirective = directiveInfo?.hasModuleDirective ?? false;

      for (const [exportName, exportValue] of Object.entries(module)) {
        // Check if the export is a function (basic check)
        if (typeof exportValue === "function") {
          // Try to infer if it's a RunnerTest by checking if it's async
          // In a real implementation, we might use TypeScript's type checking
          // For now, we'll accept any async function export
          if (exportValue.constructor.name === "AsyncFunction") {
            // Check if this export has a directive (required by default)
            if (requireDirective) {
              // Check for module-level directive or function-level directive
              const hasFunctionDirective =
                directiveInfo?.functionDirectives.get(exportName) ?? false;
              const isDefaultExport = exportName === "default";
              const defaultHasDirective =
                directiveInfo?.defaultExportHasDirective ?? false;

              if (
                hasModuleDirective ||
                hasFunctionDirective ||
                (isDefaultExport && defaultHasDirective)
              ) {
                tests.set(exportName, exportValue as RunnerTest);
              }
            } else {
              // Legacy mode: include all async functions (not recommended)
              tests.set(exportName, exportValue as RunnerTest);
            }
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
