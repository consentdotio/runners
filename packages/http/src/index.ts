import { runRunners, getRunnerInfo } from "runners";
import type {
  CreateHttpRunnerOptions,
  HttpRunnerRequest,
  Runner,
} from "./types";

/**
 * Creates an HTTP handler for running runners via API
 *
 * @param options - Configuration options
 * @param options.runners - Record of runner name to runner function
 * @param options.region - Optional region identifier
 * @returns HTTP request handler function
 */
export function createHttpRunner(
  options: CreateHttpRunnerOptions
): (req: Request) => Promise<Response> {
  const { runners, region } = options;

  return async (req: Request): Promise<Response> => {
    // Handle GET requests - return runner information
    if (req.method === "GET") {
      const info = getRunnerInfo(runners, {
        region,
        usageExample: {
          method: "POST",
          endpoint: "/api/runner",
          exampleUrl: "https://example.com",
        },
      });
      return new Response(JSON.stringify(info), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle POST requests - run runners
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use GET or POST." }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Parse request body
      let body: HttpRunnerRequest;
      try {
        body = await req.json();
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON in request body",
            details: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate request
      if (!body.url || typeof body.url !== "string") {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid "url" field' }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!Array.isArray(body.runners) || body.runners.length === 0) {
        return new Response(
          JSON.stringify({
            error:
              'Missing or empty "runners" array. At least one runner is required.',
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Resolve runner functions by name
      const resolvedRunners: Runner[] = [];
      const missingRunners: string[] = [];

      for (const runnerName of body.runners) {
        if (typeof runnerName !== "string") {
          return new Response(
            JSON.stringify({
              error: `Invalid runner name: ${String(runnerName)}. Runner names must be strings.`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const runner = runners[runnerName];
        if (!runner) {
          missingRunners.push(runnerName);
        } else {
          resolvedRunners.push(runner);
        }
      }

      if (missingRunners.length > 0) {
        return new Response(
          JSON.stringify({
            error: "One or more runners not found",
            missingRunners,
            availableRunners: Object.keys(runners),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Use region from options or request body (options takes precedence)
      const finalRegion = region || body.region;

      // Run runners
      const result = await runRunners({
        url: body.url,
        runners: resolvedRunners,
        region: finalRegion,
        runId: body.runId,
      });

      // Return success response
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle execution errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return new Response(
        JSON.stringify({
          error: "Runner execution failed",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}
