import { glob } from "glob";
import { pathToFileURL } from "node:url";
import type { z } from "zod";
import type { Runner } from "@runners/core";
import { hasAnyDirective } from "@runners/core";

/**
 * Runner schema metadata extracted from runner files
 */
export type RunnerSchemaInfo = {
  name: string;
  schema?: z.ZodTypeAny;
  description?: string;
};

/**
 * Discovers runner input schemas from runner files.
 * Looks for exported schemas following the convention: `{runnerName}InputSchema` or `{runnerName}Schema`
 *
 * @param pattern - Glob pattern to match runner files
 * @returns Map of runner name to schema info
 */
export async function discoverRunnerSchemas(
  pattern: string = "runners/**/*.ts"
): Promise<Map<string, RunnerSchemaInfo>> {
  const runnerFiles = await glob(pattern, {
    ignore: ["node_modules/**", "dist/**"],
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
          exportValue.constructor.name === "AsyncFunction"
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

          if (
            schemaExport &&
            typeof schemaExport === "object" &&
            "_def" in schemaExport
          ) {
            // It's a Zod schema
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
        }
      }
    } catch (error) {
      // Log but continue
      if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
        console.warn(
          `[orchestrator] Failed to discover schemas from ${file}:`,
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
  pattern?: string
): Promise<RunnerSchemaInfo | undefined> {
  const schemas = await discoverRunnerSchemas(pattern);
  return schemas.get(runnerName);
}

/**
 * Gets all discovered runner schema info
 */
export async function getAllRunnerSchemaInfo(
  pattern?: string
): Promise<RunnerSchemaInfo[]> {
  const schemas = await discoverRunnerSchemas(pattern);
  return Array.from(schemas.values());
}
