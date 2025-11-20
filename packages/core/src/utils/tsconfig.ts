import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findUp } from "find-up";
import { parse } from "comment-json";

/**
 * Extracts TypeScript path mappings and baseUrl from tsconfig.json/jsconfig.json.
 * Used to properly resolve module imports during bundling.
 *
 * @param workingDir - The working directory to search from
 * @returns Object with baseUrl and paths from tsconfig
 */
export async function getTsConfigOptions(
  workingDir: string = process.cwd()
): Promise<{
  baseUrl?: string;
  paths?: Record<string, string[]>;
}> {
  const options: {
    paths?: Record<string, string[]>;
    baseUrl?: string;
  } = {};

  const tsJsConfig = await findUp(["tsconfig.json", "jsconfig.json"], {
    cwd: workingDir,
  });

  if (tsJsConfig) {
    try {
      const rawJson = await readFile(tsJsConfig, "utf-8");
      const parsed: null | {
        compilerOptions?: {
          paths?: Record<string, string[]> | undefined;
          baseUrl?: string;
        };
      } = parse(rawJson) as any;

      if (parsed) {
        options.paths = parsed.compilerOptions?.paths;

        if (parsed.compilerOptions?.baseUrl) {
          options.baseUrl = resolve(workingDir, parsed.compilerOptions.baseUrl);
        } else {
          options.baseUrl = workingDir;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn(
        `[runners] Failed to parse ${tsJsConfig} - path mappings might not apply properly: ${errorMessage}`
      );
    }
  }

  return options;
}
