import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIGenerator } from "@orpc/openapi";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { createRunnerRouter } from "./orpc";
import type { CreateHttpRunnerOptions } from "./types";
import {
  RunRunnersRequestSchema,
  RunRunnersResponseSchema,
  RunnerConfigRequestSchema,
  RunnerResultSchema,
} from "@runners/contracts";

/**
 * Create oRPC handler for runner API with Scalar/Swagger UI
 * Uses the shared runner contract for type-safe communication
 */
export function createOrpcRunnerHandler(
  options: CreateHttpRunnerOptions
): (req: Request) => Promise<Response> {
  const router = createRunnerRouter(options);
  const handler = new OpenAPIHandler(router, {
    interceptors: [
      onError((error: unknown) => {
        console.error("[runner] Error:", error);
      }),
    ],
    plugins: [],
  });

  const openAPIGenerator = new OpenAPIGenerator({
    schemaConverters: [
      new ZodToJsonSchemaConverter(),
    ],
  });

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    
    // Debug: log all requests
    console.log(`[runner/http] ${req.method} ${url.pathname}`);

    // Serve OpenAPI spec - check FIRST before API handler
    if (url.pathname === "/api/runner/spec.json") {
      const spec = await openAPIGenerator.generate(router, {
        info: {
          title: "Runners HTTP API",
          version: "1.0.0",
          description: "HTTP API for executing runners remotely",
        },
        servers: [
          { url: "/api/runner" },
        ],
        commonSchemas: {
          RunRunnersRequest: { schema: RunRunnersRequestSchema },
          RunRunnersResponse: { schema: RunRunnersResponseSchema },
          RunnerConfigRequest: { schema: RunnerConfigRequestSchema },
          RunnerResult: { schema: RunnerResultSchema },
        },
      });

      return Response.json(spec);
    }

    // Serve Scalar UI - check FIRST before API handler
    if (url.pathname === "/api/runner/docs") {
      const html = `
        <!doctype html>
        <html>
          <head>
            <title>Runner API Documentation</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
          </head>
          <body>
            <div id="app"></div>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
            <script>
              Scalar.createApiReference('#app', {
                url: '/api/runner/spec.json',
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
    // The contract routes are at /runner, so with prefix /api they become /api/runner
    // But implement() creates routes at /execute and /info based on property names.
    // We need to use prefix /api/runner to match the contract paths.
    const { response, matched } = await handler.handle(req, {
      prefix: "/api/runner",
      context: {},
    });

    if (matched && response) {
      return response;
    }

    // Debug: log what didn't match
    if (!matched) {
      console.log(`[runner/http] No match for ${req.method} ${url.pathname}`);
      console.log(`[runner/http] Handler matched: ${matched}, has response: ${!!response}`);
    }

    return response ?? new Response("Not found", { status: 404 });
  };
}
