import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIGenerator } from "@orpc/openapi";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { router } from "../routers/index";
import {
  RunRequestSchema,
  RunStatusSchema,
  RunSummarySchema,
  RunnerConfigSchema,
} from "../schemas/run";

/**
 * Create oRPC handler for orchestrator API with Scalar/Swagger UI
 */
export function createOrchestratorHandler() {
  const handler = new OpenAPIHandler(router, {
    interceptors: [
      onError((error: unknown) => {
        console.error("[orchestrator] Error:", error);
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
    if (pathname === "/spec.json" || pathname === "/api/spec.json") {
      const spec = await openAPIGenerator.generate(router, {
        info: {
          title: "Runners Orchestrator API",
          version: "1.0.0",
          description: "Workflow orchestrator for running tests across multiple sites and regions",
        },
        servers: [
          { url: "/api" },
        ],
        commonSchemas: {
          RunRequest: { schema: RunRequestSchema },
          RunStatus: { schema: RunStatusSchema },
          RunSummary: { schema: RunSummarySchema },
          RunnerConfig: { schema: RunnerConfigSchema },
        },
      });

      return Response.json(spec);
    }

    // Serve Scalar UI (before API handler)
    if (pathname === "/docs" || pathname === "/api/docs") {
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
                url: '/api/spec.json',
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
    const { response, matched } = await handler.handle(request, {
      prefix: "/api",
      context: {},
    });

    if (matched && response) {
      return response;
    }

    return response ?? new Response("Not found", { status: 404 });
  };
}

