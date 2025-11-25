import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIGenerator } from "@orpc/openapi";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createOrchestratorRouter } from "../orpc";
import { orchestratorContract } from "@runners/contracts";
import {
  RunRequestSchema,
  RunStatusSchema,
  RunSummarySchema,
  RunnerConfigSchema,
} from "@runners/contracts";
import { enhanceOpenAPIWithRunnerSchemas } from "../utils/openapi-enhancer";

/**
 * Create oRPC handler for orchestrator API with Scalar/Swagger UI
 * Uses the shared orchestrator contract for type-safe communication
 */
export function createOrchestratorHandler() {
  const router = createOrchestratorRouter();
  const handler = new OpenAPIHandler(router, {
    interceptors: [
      onError((error: unknown) => {
        // Log errors but don't interfere with their handling
        // oRPC will return validation errors as 400 Bad Request automatically
        if (error instanceof SyntaxError) {
          console.error("[orchestrator] JSON parsing error:", error.message);
        } else if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "BAD_REQUEST"
        ) {
          console.error("[orchestrator] Validation error:", error);
        } else {
          console.error("[orchestrator] Error:", {
            error,
            type: typeof error,
            isError: error instanceof Error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            cause: error instanceof Error ? error.cause : undefined,
          });
        }
      }),
    ],
    plugins: [],
  });

  const openAPIGenerator = new OpenAPIGenerator({
    schemaConverters: [
      new ZodToJsonSchemaConverter(),
    ],
  });

  return async (request: Request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Serve OpenAPI spec first (before API handler)
    if (pathname === "/api/orchestrator/spec.json") {
      try {
        // Use the contract directly instead of router for OpenAPI generation
        // This ensures path parameters are correctly recognized (router doesn't preserve path params)
        // Get configured runners for description
        const configuredRunners = process.env.PLAYWRIGHT_RUNNERS
          ? (() => {
              try {
                return JSON.parse(process.env.PLAYWRIGHT_RUNNERS) as Record<string, string>;
              } catch {
                return undefined;
              }
            })()
          : undefined;

        let description = "Orchestrator for running tests across multiple regions";
        if (configuredRunners && Object.keys(configuredRunners).length > 0) {
          description += "\n\n**Available Remote Runner Regions:**\n" +
            Object.keys(configuredRunners).map(region => `- ${region}`).join("\n");
        }

        let spec = await openAPIGenerator.generate(orchestratorContract, {
          info: {
            title: "Runners Orchestrator API",
            version: "1.0.0",
            description,
          },
          servers: [
            { url: "/api/orchestrator" },
          ],
          commonSchemas: {
            RunRequest: { schema: RunRequestSchema },
            RunStatus: { schema: RunStatusSchema },
            RunSummary: { schema: RunSummarySchema },
            RunnerConfig: { schema: RunnerConfigSchema },
          },
        });

        // Enhance spec with runner-specific input schemas
        spec = await enhanceOpenAPIWithRunnerSchemas(spec);

        return Response.json(spec);
      } catch (error) {
        console.error("[orchestrator] OpenAPI generation error:", error);
        return Response.json(
          {
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Serve Scalar UI (before API handler)
    if (pathname === "/api/orchestrator/docs") {
      const html = `
        <!doctype html>
        <html>
          <head>
            <title>Orchestrator API Documentation</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
          </head>
          <body>
            <div id="app"></div>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
            <script>
              Scalar.createApiReference('#app', {
                url: '/api/orchestrator/spec.json',
              })
            </script>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Handle API requests
    try {
      const { response, matched } = await handler.handle(request, {
        prefix: "/api/orchestrator",
        context: {},
      });

      // If response exists and is an error response, check if we can improve it
      if (response && response.status >= 400) {
        // For 500 errors, try to extract the actual error details
        if (response.status === 500) {
          try {
            const errorBody = await response.clone().json();
            console.error("[orchestrator] 500 Error details:", JSON.stringify(errorBody, null, 2));
          } catch (parseError) {
            console.error("[orchestrator] Failed to parse error response:", parseError);
            // Try to read as text
            try {
              const errorText = await response.clone().text();
              console.error("[orchestrator] Error response text:", errorText);
            } catch (textError) {
              console.error("[orchestrator] Failed to read error as text:", textError);
            }
          }
        }
        return response;
      }

      if (matched && response) {
        return response;
      }

      return response ?? new Response("Not found", { status: 404 });
    } catch (error: unknown) {
      // Check if it's a JSON parsing error (SyntaxError) - could be direct or wrapped
      // Check error itself, its cause chain, and message content
      let syntaxError: SyntaxError | undefined;
      
      if (error instanceof SyntaxError) {
        syntaxError = error;
      } else if (error instanceof Error) {
        if (error.name === "SyntaxError" || 
            (error.message.includes("JSON") && error.message.includes("parse")) ||
            error.message.includes("Expected double-quoted property name")) {
          syntaxError = error as SyntaxError;
        }
        // Check cause chain
        let cause = (error as { cause?: unknown }).cause;
        while (cause && !syntaxError) {
          if (cause instanceof SyntaxError) {
            syntaxError = cause;
            break;
          }
          if (cause instanceof Error && cause.name === "SyntaxError") {
            syntaxError = cause as SyntaxError;
            break;
          }
          cause = (cause as { cause?: unknown }).cause;
        }
      }

      if (syntaxError) {
        return Response.json(
          {
            error: "Invalid JSON",
            message: syntaxError.message,
            details: "The request body contains invalid JSON. Please check your JSON syntax.",
          },
          { status: 400 }
        );
      }

      // Check if it's an oRPC validation error that wasn't caught by handler
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        "status" in error &&
        error.code === "BAD_REQUEST" &&
        typeof error.status === "number"
      ) {
        // Extract validation issues if available
        const issues = "data" in error && 
          typeof error.data === "object" && 
          error.data !== null &&
          "issues" in error.data
          ? (error.data as { issues: unknown[] }).issues
          : undefined;

        return Response.json(
          {
            error: "Validation failed",
            message: error instanceof Error ? error.message : "Input validation failed",
            issues: issues || (error instanceof Error ? [error.message] : [String(error)]),
          },
          { status: error.status }
        );
      }

      // For other errors, log and return 500
      console.error("[orchestrator] Unexpected error:", error);
      return Response.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  };
}

