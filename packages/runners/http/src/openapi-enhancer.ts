import type { OpenAPI } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { Runner } from "@runners/core";
import type { RunnerSchemaInfo } from "./schema-discovery";
import type { CreateHttpRunnerOptions } from "./types";

/**
 * Extracts runner metadata from the runners map
 * Attempts to infer input schemas from Runner types if available
 */
function getRunnerMetadata(
  runners: Record<string, Runner>
): Array<{ name: string; description?: string }> {
  return Object.keys(runners).map((name) => ({
    name,
    description: `Runner: ${name}`,
  }));
}

/**
 * Generates an example input object from a runner's schema.
 * Returns undefined if no schema is available.
 */

function generateExampleFromSchema(
  schemaInfo: RunnerSchemaInfo | undefined
): Record<string, unknown> | undefined {
  if (!schemaInfo?.schema) {
    return;
  }

  try {
    // Get the schema shape to generate example values
    const schema = schemaInfo.schema;
    if ("shape" in schema && typeof schema.shape === "object") {
      const shape = schema.shape as Record<string, unknown>;
      const example: Record<string, unknown> = {};

      for (const [key, fieldSchema] of Object.entries(shape)) {
        // Try to extract example or default from field schema
        const field = fieldSchema as Record<string, unknown>;
        if ("_zod" in field) {
          const zodDef = (field as { _zod: { def: Record<string, unknown> } })
            ._zod.def;
          if (zodDef.defaultValue !== undefined) {
            example[key] = zodDef.defaultValue;
          } else if (zodDef.type === "string") {
            example[key] =
              key === "url" ? "https://example.com" : `example-${key}`;
          } else if (zodDef.type === "number") {
            example[key] = 0;
          } else if (zodDef.type === "boolean") {
            example[key] = true;
          }
        }
      }

      if (Object.keys(example).length > 0) {
        return example;
      }
    }
  } catch {
    // Fall through to undefined
  }

  return;
}

/**
 * Enhances OpenAPI spec with runner-specific information
 */
export function enhanceRunnerOpenAPISpec(
  spec: OpenAPI.Document,
  options: CreateHttpRunnerOptions
): OpenAPI.Document {
  const { runners, region, schemas } = options;
  const converter = new ZodToJsonSchemaConverter();
  getRunnerMetadata(runners);

  // Ensure components.schemas exists
  if (!spec.components) {
    spec.components = {};
  }
  if (!spec.components.schemas) {
    spec.components.schemas = {};
  }

  // Use local variable to avoid repeated non-null assertions
  const componentSchemas = spec.components.schemas;

  // Add runner input schemas to components if available
  if (schemas) {
    for (const [runnerName, schemaInfo] of schemas.entries()) {
      if (schemaInfo.schema) {
        try {
          const [, jsonSchema] = converter.convert(schemaInfo.schema, {
            strategy: "input",
          });
          const schemaName = `${runnerName}Input`;
          // Cast to OpenAPI schema type - the converter output is compatible but typed differently
          componentSchemas[schemaName] = {
            ...(jsonSchema as Record<string, unknown>),
            description:
              schemaInfo.description || `Input schema for ${runnerName} runner`,
          } as OpenAPI.SchemaObject;
        } catch (error) {
          if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
            console.warn(
              `[runners/http] Failed to convert schema for ${runnerName}:`,
              error
            );
          }
        }
      }
    }
  }

  // Add available runners list to components
  componentSchemas.AvailableRunners = {
    type: "array",
    description: "List of available runner names",
    items: {
      type: "string",
    },
    example: Object.keys(runners),
  };

  // Add runner region info if available
  if (region) {
    componentSchemas.RunnerRegion = {
      type: "string",
      description: "Region where this runner server is located",
      example: region,
    };
  }

  // Enhance the execute endpoint description with available runners
  if (spec.paths?.["/execute"]) {
    const executePath = spec.paths["/execute"];
    if (executePath && "post" in executePath && executePath.post) {
      const postOp = executePath.post;

      // Update description to include available runners
      const runnerList = Object.keys(runners);
      const runnerListFormatted =
        runnerList.length > 0
          ? runnerList.map((name) => `- \`${name}\``).join("\n")
          : "No runners available";

      const currentDescription = postOp.description || "";
      postOp.description = `${currentDescription}\n\n**Available Runners:**\n${runnerListFormatted}\n\nEach runner may have specific input requirements. Check the runner documentation or use the \`/info\` endpoint to get more details.`;

      // Enhance request body with examples
      if (postOp.requestBody && "content" in postOp.requestBody) {
        const content = postOp.requestBody.content;
        const jsonContent = content["application/json"];
        if (jsonContent) {
          // Add examples to requestBody
          if (!jsonContent.examples) {
            jsonContent.examples = {};
          }

          const examples = jsonContent.examples as Record<
            string,
            OpenAPI.ExampleObject
          >;

          // Example 1: Single runner with input (use schema-derived example if available)
          if (runnerList.length > 0) {
            const firstRunner = runnerList[0];
            const schemaInfo = firstRunner
              ? schemas?.get(firstRunner)
              : undefined;
            const exampleInput = generateExampleFromSchema(schemaInfo) || {
              url: "https://example.com",
            };

            examples.singleRunner = {
              summary: "Single runner with input",
              description: `Example executing ${firstRunner} runner`,
              value: {
                runners: [
                  {
                    name: firstRunner,
                    input: exampleInput,
                  },
                ],
                runId: "example-run-id",
                region: region || "us-east-1",
              },
            };
          }

          // Example 2: Multiple runners
          if (runnerList.length > 1) {
            examples.multipleRunners = {
              summary: "Multiple runners",
              description: "Example executing multiple runners",
              value: {
                runners: runnerList.slice(0, 2).map((name) => {
                  const schemaInfo = schemas?.get(name);
                  const exampleInput = generateExampleFromSchema(
                    schemaInfo
                  ) || { url: "https://example.com" };
                  return {
                    name,
                    input: exampleInput,
                  };
                }),
                runId: "example-run-id",
              },
            };
          }

          // Example 3: Legacy format (array of strings)
          if (runnerList.length > 0) {
            examples.legacyFormat = {
              summary: "Legacy format (array of strings)",
              description: "Simplified format using just runner names",
              value: {
                url: "https://example.com",
                runners: runnerList.slice(0, 2),
                runId: "example-run-id",
              },
            };
          }
        }
      }
    }
  }

  // Enhance the info endpoint description
  if (spec.paths?.["/info"]) {
    const infoPath = spec.paths?.["/info"];
    if (infoPath && "get" in infoPath && infoPath.get) {
      const getOp = infoPath.get;
      const runnerList = Object.keys(runners).join(", ");
      const currentDescription = getOp.description || "";
      getOp.description = `${currentDescription}\n\n**Available Runners:** ${runnerList}`;
    }
  }

  return spec;
}
