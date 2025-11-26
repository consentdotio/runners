import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { RunnerSchemaInfo } from "./schema-discovery";

/**
 * Zod schema for schema metadata structure
 */
const RunnerInfoSchema = z.object({
  name: z.string(),
  line: z.number().int().positive(),
});

const SchemaInfoSchema = z.object({
  name: z.string(),
  runner_name: z.string().optional(),
  line: z.number().int().positive(),
});

const FileMetadataSchema = z.object({
  file: z.string(),
  runners: z.array(RunnerInfoSchema),
  schemas: z.array(SchemaInfoSchema),
});

const MetadataSchema = z.array(FileMetadataSchema);

type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Load pre-extracted schema metadata from build-time extraction
 */
export async function loadBuildTimeSchemas(
  metadataPath: string
): Promise<Map<string, RunnerSchemaInfo>> {
  let metadataContent: string;
  let metadata: Metadata;

  try {
    // Read file
    metadataContent = await readFile(metadataPath, "utf-8");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read schema metadata file at ${metadataPath}: ${errorMessage}`
    );
  }

  try {
    // Parse JSON
    const parsed = JSON.parse(metadataContent);
    
    // Validate with Zod schema
    metadata = MetadataSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid schema metadata format in ${metadataPath}: ${error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ")}`
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON from schema metadata file at ${metadataPath}: ${errorMessage}`
    );
  }

  try {
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
            if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
              console.log(
                `[runners/http] No schema found for runner "${runner.name}"`
              );
            }
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
    // This catch handles errors during schema loading/importing
    // The file read/parse/validate errors are already handled above
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load schemas from metadata file at ${metadataPath}: ${errorMessage}`
    );
  }
}
