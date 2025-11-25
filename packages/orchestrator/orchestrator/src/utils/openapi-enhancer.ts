import type { OpenAPI } from "@orpc/contract";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { z } from "zod";
import { getAllRunnerSchemaInfo } from "./runner-schemas";

/**
 * Get configured remote runner endpoints from environment
 */
function getConfiguredRunners(): Record<string, string> | undefined {
  const runnersEnv = process.env.PLAYWRIGHT_RUNNERS;
  if (!runnersEnv) {
    return undefined;
  }

  try {
    return JSON.parse(runnersEnv) as Record<string, string>;
  } catch {
    return undefined;
  }
}

/**
 * Enhances OpenAPI spec with runner-specific input schema documentation
 */
export async function enhanceOpenAPIWithRunnerSchemas(
  spec: OpenAPI.Document,
  pattern?: string
): Promise<OpenAPI.Document> {
  const runnerSchemas = await getAllRunnerSchemaInfo(pattern);
  const converter = new ZodToJsonSchemaConverter();
  const configuredRunners = getConfiguredRunners();

  // Add runner schemas to components.schemas
  if (!spec.components) {
    spec.components = {};
  }
  if (!spec.components.schemas) {
    spec.components.schemas = {};
  }

  // Add each runner's input schema to components
  for (const runnerInfo of runnerSchemas) {
    if (runnerInfo.schema) {
      const [required, jsonSchema] = await converter.convert(runnerInfo.schema, {
        strategy: "input",
      });

      // Add schema to components
      const schemaName = `${runnerInfo.name}Input`;
      spec.components.schemas![schemaName] = jsonSchema as any;

      // Add description if available
      if (runnerInfo.description) {
        (spec.components.schemas![schemaName] as any).description = runnerInfo.description;
      }
    }
  }

  // Add configured remote runners to components if available
  if (configuredRunners && Object.keys(configuredRunners).length > 0) {
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    // Add RemoteRunners schema
    spec.components.schemas!["RemoteRunners"] = {
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
  if (spec.paths?.["/orchestrator"]?.post) {
    const operation = spec.paths["/orchestrator"].post;
    
    // Add examples to the request body schema
    // Check if requestBody is a RequestBodyObject (not a ReferenceObject)
    if (operation.requestBody && "$ref" in operation.requestBody === false) {
      const requestBody = operation.requestBody as OpenAPI.RequestBodyObject;
      if (requestBody.content?.["application/json"]?.schema) {
        const schema = requestBody.content["application/json"].schema as any;
        
        // Add examples showing how to use different runners with their inputs
        if (!schema.examples) {
          schema.examples = {};
        }

        // Add local mode example
        for (const runnerInfo of runnerSchemas.slice(0, 3)) {
          // Limit to first 3 runners for examples
          if (runnerInfo.schema) {
            const exampleName = runnerInfo.name;
            schema.examples[exampleName] = {
              summary: `Example using ${runnerInfo.name} runner (local mode)`,
              value: {
                runners: [
                  {
                    name: runnerInfo.name,
                    input: {
                      url: "https://example.com",
                      ...getExampleInputFromSchema(runnerInfo.schema),
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
          
          if (firstRunner) {
            schema.examples["remote-mode"] = {
              summary: `Example using remote mode with region ${firstRegion}`,
              value: {
                runners: [
                  {
                    name: firstRunner.name,
                    region: firstRegion,
                    input: {
                      url: "https://example.com",
                      ...getExampleInputFromSchema(firstRunner.schema || {} as z.ZodTypeAny),
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
      const regions = Object.keys(configuredRunners).join(", ");
      operation.description += `\n\n**Configured Remote Runners:**\n` +
        Object.entries(configuredRunners)
          .map(([region, url]) => `- ${region}: ${url}`)
          .join("\n");
    }
  }

  return spec;
}

/**
 * Generates example input from a Zod schema
 */
function getExampleInputFromSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const example: Record<string, unknown> = {};

  // Try to extract shape from object schema (Zod v4 uses _zod)
  if ("_zod" in schema) {
    const zodSchema = schema as any;
    if (zodSchema._zod?.def?.type === "object" && zodSchema._zod.def.shape) {
      const shape = zodSchema._zod.def.shape;
      for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as z.ZodTypeAny;
        
        // Handle optional types in Zod v4
        let innerType = zodValue;
        if ("_zod" in zodValue && zodValue._zod?.def?.type === "optional") {
          innerType = (zodValue._zod.def as any).innerType as z.ZodTypeAny;
        }
        
        // Generate example based on type (Zod v4 structure)
        if ("_zod" in innerType) {
          const innerZod = innerType as any;
          if (innerZod._zod?.def?.type === "string") {
            example[key] = key === "url" ? "https://example.com" : `example-${key}`;
          } else if (innerZod._zod?.def?.type === "number") {
            example[key] = 0;
          } else if (innerZod._zod?.def?.type === "boolean") {
            example[key] = true;
          } else {
            example[key] = null;
          }
        }
      }
    }
  }
  // Fallback for Zod v3 structure
  else if ("_def" in schema) {
    const zodSchema = schema as any;
    const def = zodSchema._def;
    if (def && typeof def === "object" && "typeName" in def && def.typeName === "ZodObject") {
      const shape = def.shape();
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          const zodValue = value as any;
          const valueDef = zodValue?._def;
          
          // Handle optional types
          let innerDef = valueDef;
          if (valueDef?.typeName === "ZodOptional") {
            innerDef = valueDef.innerType?._def;
          }
          
          // Generate example based on type
          if (innerDef?.typeName === "ZodString") {
            example[key] = key === "url" ? "https://example.com" : `example-${key}`;
          } else if (innerDef?.typeName === "ZodNumber") {
            example[key] = 0;
          } else if (innerDef?.typeName === "ZodBoolean") {
            example[key] = true;
          } else {
            example[key] = null;
          }
        }
      }
    }
  }

  return example;
}

