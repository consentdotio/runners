import { pathToFileURL } from "node:url";
import { types } from "node:util";
import { glob } from "glob";
import type { z } from "zod";
import { hasAnyDirective } from "./directive-detector";

/**
 * Runner schema metadata extracted from runner files
 */
export type RunnerSchemaInfo = {
  name: string;
  schema?: z.ZodTypeAny;
  description?: string;
};

/**
 * Options for schema discovery
 */
export type SchemaDiscoveryOptions = {
  /**
   * Glob patterns to ignore (default: ["node_modules/**", "dist/**"])
   */
  ignore?: string[];
  /**
   * Log prefix for debug messages (default: "[runners]")
   */
  logPrefix?: string;
};

/**
 * Discovers runner input schemas from runner files.
 * Looks for exported schemas following the convention: `{runnerName}InputSchema` or `{runnerName}Schema`
 *
 * @param patterns - Glob pattern(s) to match runner files
 * @param options - Discovery options
 * @returns Map of runner name to schema info
 */
export async function discoverRunnerSchemas(
  patterns: string | string[] = ["src/**/*.ts", "runners/**/*.ts"],
  options: SchemaDiscoveryOptions = {}
): Promise<Map<string, RunnerSchemaInfo>> {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const ignore = options.ignore ?? ["node_modules/**", "dist/**"];
  const logPrefix = options.logPrefix ?? "[runners]";

  const runnerFiles = await glob(patternArray, {
    ignore,
  });

  const schemas = new Map<string, RunnerSchemaInfo>();

  for (const file of runnerFiles) {
    try {
      // Check for directive
      const hasDirective = await hasAnyDirective(file);
      if (!hasDirective) {
        continue;
      }

      // Import the module
      const moduleUrl = pathToFileURL(file).href;
      const module = await import(moduleUrl);

      // Look for runner exports and their corresponding schemas
      for (const [exportName, exportValue] of Object.entries(module)) {
        // Check if it's a runner function
        if (
          typeof exportValue === "function" &&
          types.isAsyncFunction(exportValue)
        ) {
          // Try to find corresponding schema exports
          // Convention: {runnerName}InputSchema, {runnerName}Schema, or InputSchema
          const schemaName = exportName.endsWith("Schema")
            ? exportName
            : `${exportName}InputSchema`;

          const schemaExport =
            module[schemaName] ||
            module[`${exportName}Schema`] ||
            module.InputSchema;

          if (schemaExport && typeof schemaExport === "object") {
            // Check if it's a Zod schema (v3 or v4)
            const isZodSchema =
              "_def" in schemaExport || "_zod" in schemaExport;

            if (isZodSchema) {
              schemas.set(exportName, {
                name: exportName,
                schema: schemaExport as z.ZodTypeAny,
              });
            } else {
              // No schema found, but we still record the runner
              schemas.set(exportName, {
                name: exportName,
              });
            }
          } else {
            // No schema found, but we still record the runner
            schemas.set(exportName, {
              name: exportName,
            });
          }
        }
      }
    } catch (error) {
      // Log but continue
      if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
        console.warn(
          `${logPrefix} Failed to discover schemas from ${file}:`,
          error
        );
      }
    }
  }

  return schemas;
}

/**
 * Gets runner schema info for a specific runner name
 */
export async function getRunnerSchemaInfo(
  runnerName: string,
  patterns?: string | string[],
  options?: SchemaDiscoveryOptions
): Promise<RunnerSchemaInfo | undefined> {
  const schemas = await discoverRunnerSchemas(patterns, options);
  return schemas.get(runnerName);
}

/**
 * Gets all discovered runner schema info
 */
export async function getAllRunnerSchemaInfo(
  patterns?: string | string[],
  options?: SchemaDiscoveryOptions
): Promise<RunnerSchemaInfo[]> {
  const schemas = await discoverRunnerSchemas(patterns, options);
  return Array.from(schemas.values());
}
