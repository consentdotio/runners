import { readFile } from "node:fs/promises";

/**
 * Matches: 'use runner'; "use runner"; at line start with optional whitespace
 * Supports both single and double quotes, optional semicolon
 */
export const useRunnerPattern = /^\s*(['"])use runner\1;?\s*$/m;

/**
 * Matches function-level 'use runner'; "use runner"; inside function bodies
 * Matches the directive anywhere in the file (not just at line start)
 */
export const useRunnerFunctionPattern = /['"]use runner['"];?/;

/**
 * Checks if a file has a module-level "use runner" directive
 * Uses regex pattern matching similar to workflow package for simplicity and performance
 */
export async function hasModuleDirective(filePath: string): Promise<boolean> {
  try {
    const source = await readFile(filePath, "utf-8");
    return useRunnerPattern.test(source);
  } catch {
    return false;
  }
}

/**
 * Checks if a file has any "use runner" directive (module-level or function-level)
 * This is more permissive and allows both directive styles
 */
export async function hasAnyDirective(filePath: string): Promise<boolean> {
  try {
    const source = await readFile(filePath, "utf-8");
    return (
      useRunnerPattern.test(source) || useRunnerFunctionPattern.test(source)
    );
  } catch {
    return false;
  }
}

/**
 * Synchronous version for cases where file is already read
 */
export function hasModuleDirectiveSync(source: string): boolean {
  return useRunnerPattern.test(source);
}

/**
 * Synchronous version that checks for any directive (module or function level)
 */
export function hasAnyDirectiveSync(source: string): boolean {
  return useRunnerPattern.test(source) || useRunnerFunctionPattern.test(source);
}
