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
  const failures: Array<{ file: string; error: string }> = [];

  for (const file of runnerFiles) {
    let hasDirective = false;
    try {
      // Check for directive
      hasDirective = await hasAnyDirective(file);
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
          (types.isAsyncFunction(exportValue) ||
            exportValue.constructor.name === "AsyncFunction")
        ) {
          // Try to find corresponding schema exports
          // Convention: {runnerName}InputSchema, {runnerName}Schema, or InputSchema
          // Build ordered list of candidate schema names
          const potentialSchemaNames: string[] = [];
          
          if (exportName.endsWith("Schema")) {
            // If exportName already ends with Schema, use it as-is first
            potentialSchemaNames.push(exportName);
            // Also try InputSchema variant (e.g., "MyRunnerSchema" -> "MyRunnerInputSchema")
            const baseName = exportName.slice(0, -6); // Remove "Schema" suffix
            potentialSchemaNames.push(`${baseName}InputSchema`);
          } else {
            // Standard naming convention
            potentialSchemaNames.push(`${exportName}InputSchema`);
            potentialSchemaNames.push(`${exportName}Schema`);
          }
          
          // Fallback to generic InputSchema
          potentialSchemaNames.push("InputSchema");

          // Find the first candidate that exists on the module
          const schemaExport = potentialSchemaNames
            .map((name) => module[name])
            .find((schema) => schema !== undefined);

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
      // Only track failures for files that contain the runner directive
      if (hasDirective) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failures.push({ file, error: errorMessage });

        // Always emit concise error-level log for files with runner directive
        console.error(
          `${logPrefix} Failed to discover schemas from ${file}: ${errorMessage}`
        );
      }

      // Preserve existing debug-only verbose logging with full error stack
      if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
        console.warn(
          `${logPrefix} Failed to discover schemas from ${file}:`,
          error
        );
      }
    }
  }

  // Log summary of failures after discovery completes
  if (failures.length > 0) {
    const failureCount = failures.length;
    const showDetails =
      process.env.DEBUG || process.env.RUNNERS_DEBUG || failureCount <= 5;
    
    if (showDetails) {
      console.error(
        `${logPrefix} Schema discovery completed with ${failureCount} failure(s):`
      );
      for (const { file, error } of failures) {
        console.error(`  - ${file}: ${error}`);
      }
    } else {
      console.error(
        `${logPrefix} Schema discovery completed with ${failureCount} failure(s). Set DEBUG=1 to see details.`
      );
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
