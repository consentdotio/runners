import type { RunnerTest } from 'runners';
import { discoverTests } from './discover.js';

export async function loadTests(testNames?: string[]): Promise<RunnerTest[]> {
  const allTests = await discoverTests();

  if (!testNames || testNames.length === 0) {
    return Array.from(allTests.values());
  }

  const selectedTests: RunnerTest[] = [];

  for (const name of testNames) {
    const test = allTests.get(name);
    if (!test) {
      throw new Error(
        `Test "${name}" not found. Available tests: ${Array.from(allTests.keys()).join(', ')}`
      );
    }
    selectedTests.push(test);
  }

  return selectedTests;
}

