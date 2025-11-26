import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { z } from "zod";
import type { RunnerSchemaInfo } from "./schema-discovery";

/**
 * Load pre-extracted schema metadata from build-time extraction
 */
export async function loadBuildTimeSchemas(
  metadataPath: string
): Promise<Map<string, RunnerSchemaInfo>> {
  try {
    const metadataContent = readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent) as Array<{
      file: string;
      runners: Array<{ name: string; line: number }>;
      schemas: Array<{ name: string; runner_name?: string; line: number }>;
    }>;

    const schemas = new Map<string, RunnerSchemaInfo>();

    // Import actual Zod schemas from the files
    for (const fileMetadata of metadata) {
      try {
        const moduleUrl = pathToFileURL(fileMetadata.file).href;
        const module = await import(moduleUrl);

        // Map runners to their schemas
        for (const runner of fileMetadata.runners) {
          // Find matching schema
          const schemaInfo = fileMetadata.schemas.find(
            (s) =>
              s.runner_name === runner.name ||
              s.name === `${runner.name}InputSchema` ||
              s.name === `${runner.name}Schema`
          );

          if (schemaInfo) {
            const schemaExport = module[schemaInfo.name];
            if (schemaExport && typeof schemaExport === "object") {
              const isZodSchema =
                "_def" in schemaExport || "_zod" in schemaExport;
              if (isZodSchema) {
                schemas.set(runner.name, {
                  name: runner.name,
                  schema: schemaExport as z.ZodTypeAny,
                });
              }
            }
          } else {
            // No schema found, but still record the runner
            schemas.set(runner.name, {
              name: runner.name,
            });
          }
        }
      } catch (error) {
        if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
          console.warn(
            `[runners/http] Failed to load schemas from ${fileMetadata.file}:`,
            error
          );
        }
      }
    }

    return schemas;
  } catch (error) {
    if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
      console.warn(
        `[runners/http] Failed to load build-time schema metadata from ${metadataPath}:`,
        error
      );
    }
    return new Map();
  }
}
