import type { OpenAPI } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import type { Runner } from "@runners/core";
import type { CreateHttpRunnerOptions } from "./types";
import type { RunnerSchemaInfo } from "./schema-discovery";

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
 * Enhances OpenAPI spec with runner-specific information
 */
export async function enhanceRunnerOpenAPISpec(
  spec: OpenAPI.Document,
  options: CreateHttpRunnerOptions & { schemas?: Map<string, RunnerSchemaInfo> }
): Promise<OpenAPI.Document> {
  const { runners, region, schemas } = options;
  const converter = new ZodToJsonSchemaConverter();
  const runnerMetadata = getRunnerMetadata(runners);

  // Ensure components.schemas exists
  if (!spec.components) {
    spec.components = {};
  }
  if (!spec.components.schemas) {
    spec.components.schemas = {};
  }

  // Add runner input schemas to components if available
  if (schemas) {
    for (const [runnerName, schemaInfo] of schemas.entries()) {
      if (schemaInfo.schema) {
        try {
          const jsonSchema = converter.convert(schemaInfo.schema);
          const schemaName = `${runnerName}Input`;
          spec.components.schemas![schemaName] = {
            ...jsonSchema,
            description: schemaInfo.description || `Input schema for ${runnerName} runner`,
          };
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
  spec.components.schemas!["AvailableRunners"] = {
    type: "array",
    description: "List of available runner names",
    items: {
      type: "string",
    },
    example: Object.keys(runners),
  };

  // Add runner region info if available
  if (region) {
    spec.components.schemas!["RunnerRegion"] = {
      type: "string",
      description: "Region where this runner server is located",
      example: region,
    };
  }

  // Enhance the execute endpoint description with available runners
  if (spec.paths && spec.paths["/execute"]) {
    const executePath = spec.paths["/execute"];
    if (executePath && "post" in executePath && executePath.post) {
      const postOp = executePath.post;
      
      // Update description to include available runners
      const runnerList = Object.keys(runners);
      const runnerListFormatted = runnerList.length > 0 
        ? runnerList.map((name) => `- \`${name}\``).join("\n")
        : "No runners available";
      
      const currentDescription = postOp.description || "";
      postOp.description = `${currentDescription}\n\n**Available Runners:**\n${runnerListFormatted}\n\nEach runner may have specific input requirements. Check the runner documentation or use the \`/info\` endpoint to get more details.`;

      // Enhance request body with examples
      if (postOp.requestBody && "content" in postOp.requestBody) {
        const content = postOp.requestBody.content;
        if (content["application/json"]) {
          // Add examples to requestBody
          if (!postOp.requestBody.content["application/json"].examples) {
            postOp.requestBody.content["application/json"].examples = {};
          }
          
          const examples = postOp.requestBody.content["application/json"].examples as any;
          
          // Example 1: Single runner with input
          if (runnerList.length > 0) {
            examples.singleRunner = {
              summary: "Single runner with input",
              description: `Example executing ${runnerList[0]} runner`,
              value: {
                runners: [
                  {
                    name: runnerList[0],
                    input: {
                      url: "https://example.com",
                    },
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
                runners: runnerList.slice(0, 2).map((name) => ({
                  name,
                  input: {
                    url: "https://example.com",
                  },
                })),
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
  if (spec.paths && spec.paths["/info"]) {
    const infoPath = spec.paths["/info"];
    if (infoPath && "get" in infoPath && infoPath.get) {
      const getOp = infoPath.get;
      const runnerList = Object.keys(runners).join(", ");
      const currentDescription = getOp.description || "";
      getOp.description = `${currentDescription}\n\n**Available Runners:** ${runnerList}`;
    }
  }

  return spec;
}

