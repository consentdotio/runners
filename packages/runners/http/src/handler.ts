import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import {
  RunnerConfigRequestSchema,
  RunnerResultSchema,
  RunRunnersRequestSchema,
  RunRunnersResponseSchema,
  runnerContract,
} from "@runners/contracts";
import { enhanceRunnerOpenAPISpec } from "./openapi-enhancer";
import { createRunnerRouter } from "./orpc";
import { discoverRunnerSchemas } from "./schema-discovery";
import { loadBuildTimeSchemas } from "./schema-loader";
import type { CreateHttpRunnerOptions } from "./types";

/**
 * Create oRPC handler for runner API with Scalar/Swagger UI
 * Uses the shared runner contract for type-safe communication
 */
export async function createOrpcRunnerHandler(
  options: CreateHttpRunnerOptions
): Promise<(req: Request) => Promise<Response>> {
  // Load schemas: prefer pre-extracted build-time metadata, fallback to runtime discovery
  let schemas = options.schemas;

  if (!schemas) {
    // Try to load build-time extracted schemas first
    const buildTimeMetadataPath =
      process.env.RUNNER_SCHEMAS_METADATA || "runner-schemas.json";
    try {
      schemas = await loadBuildTimeSchemas(buildTimeMetadataPath);
      if (schemas.size > 0) {
        console.log(
          `[runners/http] Loaded ${schemas.size} schemas from build-time metadata`
        );
      }
    } catch (e) {
      // Fallback to runtime discovery
      if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
        console.log(
          "[runners/http] Build-time schema metadata not found, using runtime discovery:",
          e
        );
      }
    }
  }

  // Fallback to runtime discovery if build-time schemas not available
  if (!schemas || schemas.size === 0) {
    if (options.schemaPattern) {
      schemas = await discoverRunnerSchemas(options.schemaPattern);
    } else {
      // Default patterns
      schemas = await discoverRunnerSchemas(["src/**/*.ts", "runners/**/*.ts"]);
    }
  }

  // Create router with schemas for validation
  const router = createRunnerRouter({ ...options, schemas });
  const handler = new OpenAPIHandler(router, {
    interceptors: [
      onError((error: unknown) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "BAD_REQUEST" &&
          "data" in error &&
          error.data &&
          typeof error.data === "object" &&
          "issues" in error.data
        ) {
          console.error(
            "[runner] Validation error:",
            JSON.stringify(error.data, null, 2)
          );
        } else {
          console.error("[runner] Error:", error);
        }
      }),
    ],
    plugins: [],
  });

  const openAPIGenerator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  /**
   * Unwrap oRPC client's json wrapper if present (for compact inputStructure compatibility)
   */
  async function unwrapRequestIfNeeded(req: Request): Promise<Request> {
    if (req.method !== "POST") {
      return req;
    }

    try {
      const body = await req.clone().json();
      // Check if body is wrapped in "json" field (oRPC client default format)
      if (
        body &&
        typeof body === "object" &&
        "json" in body &&
        Object.keys(body).length === 1
      ) {
        // Unwrap and create new request with unwrapped body
        const unwrappedBody = body.json;
        return new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(unwrappedBody),
        });
      }
    } catch (e) {
      // If parsing fails, use original request
      console.log(
        "[runner/http] Failed to parse request body for unwrapping:",
        e
      );
    }

    return req;
  }

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    // Debug: log all requests
    if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
      console.log(`[runner/http] ${req.method} ${url.pathname}`);
    }

    // Serve OpenAPI spec - check FIRST before API handler
    // Use contract directly (not router) to ensure correct paths are used
    if (url.pathname === "/api/runner/spec.json") {
      let spec = await openAPIGenerator.generate(runnerContract, {
        info: {
          title: "Runners HTTP API",
          version: "1.0.0",
          description: "HTTP API for executing runners remotely",
        },
        servers: [{ url: "/api/runner" }],
        commonSchemas: {
          RunRunnersRequest: { schema: RunRunnersRequestSchema },
          RunRunnersResponse: { schema: RunRunnersResponseSchema },
          RunnerConfigRequest: { schema: RunnerConfigRequestSchema },
          RunnerResult: { schema: RunnerResultSchema },
        },
      });

      // Enhance spec with runner-specific information including schemas
      spec = enhanceRunnerOpenAPISpec(spec, { ...options, schemas });

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
    // Contract routes are /execute and /info, with prefix /api/runner they become:
    // POST /api/runner/execute and GET /api/runner/info

    // Unwrap oRPC client's json wrapper if present (for compact inputStructure compatibility)
    const requestToHandle = await unwrapRequestIfNeeded(req);

    const { response, matched } = await handler.handle(requestToHandle, {
      prefix: "/api/runner",
      context: {},
    });

    if (matched && response) {
      return response;
    }

    // Debug: log what didn't match
    if (!matched) {
      console.log(`[runner/http] No match for ${req.method} ${url.pathname}`);
      console.log(
        `[runner/http] Handler matched: ${matched}, has response: ${!!response}`
      );
    }

    return response ?? new Response("Not found", { status: 404 });
  };
}
