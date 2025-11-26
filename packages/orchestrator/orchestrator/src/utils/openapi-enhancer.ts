import type { OpenAPI } from "@orpc/contract";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { z } from "zod";
import { getAllRunnerSchemaInfo } from "./runner-schemas";

/**
 * JSON Schema type for example generation
 */
type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
};

/**
 * Get configured remote runner endpoints from environment
 */
function getConfiguredRunners(): Record<string, string> | undefined {
  const runnersEnv = process.env.PLAYWRIGHT_RUNNERS;
  if (!runnersEnv) {
    return;
  }

  try {
    return JSON.parse(runnersEnv) as Record<string, string>;
  } catch {
    return;
  }
}

/**
 * Enhances OpenAPI spec with runner-specific input schema documentation
 */
export async function enhanceOpenAPIWithRunnerSchemas(
  spec: OpenAPI.Document,
  pattern?: string
): Promise<OpenAPI.Document> {
  // Deep clone the spec to avoid mutating the input
  const clonedSpec = structuredClone(spec);
  const runnerSchemas = await getAllRunnerSchemaInfo(pattern);
  const converter = new ZodToJsonSchemaConverter();
  const configuredRunners = getConfiguredRunners();

  // Add runner schemas to components.schemas
  if (!clonedSpec.components) {
    clonedSpec.components = {};
  }
  if (!clonedSpec.components.schemas) {
    clonedSpec.components.schemas = {};
  }

  // Add each runner's input schema to components
  for (const runnerInfo of runnerSchemas) {
    if (runnerInfo.schema) {
      const [, jsonSchema] = await converter.convert(runnerInfo.schema, {
        strategy: "input",
      });

      // Add schema to components
      const schemaName = `${runnerInfo.name}Input`;
      if (clonedSpec.components.schemas) {
        clonedSpec.components.schemas[schemaName] = {
          ...(jsonSchema as Record<string, unknown>),
        } as OpenAPI.SchemaObject;

        // Add description if available
        if (runnerInfo.description) {
          const schemaObj = clonedSpec.components.schemas[
            schemaName
          ] as OpenAPI.SchemaObject;
          if (schemaObj) {
            schemaObj.description = runnerInfo.description;
          }
        }
      }
    }
  }

  // Add configured remote runners to components if available
  if (
    configuredRunners &&
    Object.keys(configuredRunners).length > 0 &&
    clonedSpec.components.schemas
  ) {
    // Add RemoteRunners schema
    clonedSpec.components.schemas.RemoteRunners = {
      type: "object",
      description: "Configured remote runner endpoints mapped by region",
      additionalProperties: {
        type: "string",
        format: "uri",
        description: "URL of the remote runner endpoint for this region",
      },
      example: configuredRunners,
    };
  }

  // Enhance the submitRun operation with runner input examples
  if (clonedSpec.paths?.["/orchestrator"]?.post) {
    const operation = clonedSpec.paths["/orchestrator"].post;

    // Add examples to the request body schema
    // Check if requestBody is a RequestBodyObject (not a ReferenceObject)
    if (operation.requestBody && "$ref" in operation.requestBody === false) {
      const requestBody = operation.requestBody as OpenAPI.RequestBodyObject;
      if (requestBody.content?.["application/json"]?.schema) {
        const schema = requestBody.content["application/json"]
          .schema as OpenAPI.SchemaObject;

        // Add examples showing how to use different runners with their inputs
        // OpenAPI SchemaObject.examples can be an array, but we use it as a Record
        // Cast through unknown to allow this usage pattern
        if (!schema.examples) {
          schema.examples = {} as unknown as typeof schema.examples;
        }

        const examples = schema.examples as unknown as Record<
          string,
          OpenAPI.ExampleObject
        >;

        // Add local mode example
        for (const runnerInfo of runnerSchemas.slice(0, 3)) {
          // Limit to first 3 runners for examples
          if (runnerInfo.schema) {
            const exampleName = runnerInfo.name;
            const exampleInput = await getExampleInputFromSchema(
              runnerInfo.schema,
              converter
            );
            examples[exampleName] = {
              summary: `Example using ${runnerInfo.name} runner (local mode)`,
              value: {
                runners: [
                  {
                    name: runnerInfo.name,
                    input: {
                      url: "https://example.com",
                      ...exampleInput,
                    },
                  },
                ],
                mode: "local",
              },
            };
          }
        }

        // Add remote mode example if runners are configured
        if (configuredRunners && Object.keys(configuredRunners).length > 0) {
          const firstRegion = Object.keys(configuredRunners)[0];
          const firstRunner = runnerSchemas[0];

          if (firstRunner?.schema) {
            const exampleInput = await getExampleInputFromSchema(
              firstRunner.schema,
              converter
            );
            examples["remote-mode"] = {
              summary: `Example using remote mode with region ${firstRegion}`,
              value: {
                runners: [
                  {
                    name: firstRunner.name,
                    region: firstRegion,
                    input: {
                      url: "https://example.com",
                      ...exampleInput,
                    },
                  },
                ],
                mode: "remote",
              },
            };
          }
        }
      }
    }

    // Add description about remote runners if configured
    if (configuredRunners && Object.keys(configuredRunners).length > 0) {
      if (!operation.description) {
        operation.description = "";
      }
      operation.description +=
        "\n\n**Configured Remote Runners:**\n" +
        Object.entries(configuredRunners)
          .map(([region, url]) => `- ${region}: ${url}`)
          .join("\n");
    }
  }

  return clonedSpec;
}

/**
 * Generates example input from a Zod schema by converting to JSON Schema first
 */
async function getExampleInputFromSchema(
  schema: z.ZodTypeAny,
  converter: ZodToJsonSchemaConverter
): Promise<Record<string, unknown>> {
  try {
    const [, jsonSchema] = await converter.convert(schema, {
      strategy: "input",
    });

    const example = generateExampleFromJsonSchema(jsonSchema as JsonSchema);
    // Ensure we return an object (in case schema is not an object type)
    return typeof example === "object" &&
      example !== null &&
      !Array.isArray(example)
      ? (example as Record<string, unknown>)
      : {};
  } catch {
    // Fallback: return empty object if conversion fails
    return {};
  }
}

/**
 * Generates example values from a JSON Schema
 */
function generateExampleFromJsonSchema(
  jsonSchema: JsonSchema,
  key?: string
): unknown {
  // Handle $ref (references) - return null as we can't resolve them here
  if (jsonSchema.$ref) {
    return null;
  }

  // Handle oneOf/anyOf/allOf - use first option
  if (jsonSchema.oneOf && jsonSchema.oneOf.length > 0 && jsonSchema.oneOf[0]) {
    return generateExampleFromJsonSchema(jsonSchema.oneOf[0], key);
  }
  if (jsonSchema.anyOf && jsonSchema.anyOf.length > 0 && jsonSchema.anyOf[0]) {
    return generateExampleFromJsonSchema(jsonSchema.anyOf[0], key);
  }
  if (jsonSchema.allOf && jsonSchema.allOf.length > 0 && jsonSchema.allOf[0]) {
    // Merge allOf schemas - use the first one for simplicity
    return generateExampleFromJsonSchema(jsonSchema.allOf[0], key);
  }

  const type = Array.isArray(jsonSchema.type)
    ? jsonSchema.type[0]
    : jsonSchema.type;

  switch (type) {
    case "object": {
      const example: Record<string, unknown> = {};
      if (jsonSchema.properties) {
        for (const [propKey, propSchema] of Object.entries(
          jsonSchema.properties
        )) {
          example[propKey] = generateExampleFromJsonSchema(propSchema, propKey);
        }
      }
      return example;
    }
    case "array": {
      if (jsonSchema.items) {
        return [generateExampleFromJsonSchema(jsonSchema.items, key)];
      }
      return [];
    }
    case "string": {
      // Special handling for URL format or "url" key
      if (jsonSchema.format === "uri" || key === "url") {
        return "https://example.com";
      }
      return key ? `example-${key}` : "example";
    }
    case "number":
    case "integer": {
      return 0;
    }
    case "boolean": {
      return true;
    }
    case "null": {
      return null;
    }
    default: {
      return null;
    }
  }
}
