import { runTests } from "runners";
import type {
  CreateHttpRunnerOptions,
  HttpRunnerRequest,
  RunnerTest,
} from "./types.js";

/**
 * Creates an HTTP handler for running tests via API
 *
 * @param options - Configuration options
 * @param options.tests - Record of test name to test function
 * @param options.region - Optional region identifier
 * @returns HTTP request handler function
 */
export function createHttpRunner(
  options: CreateHttpRunnerOptions
): (req: Request) => Promise<Response> {
  const { tests, region } = options;

  return async (req: Request): Promise<Response> => {
    // Only handle POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
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

      if (!Array.isArray(body.tests) || body.tests.length === 0) {
        return new Response(
          JSON.stringify({
            error:
              'Missing or empty "tests" array. At least one test is required.',
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Resolve test functions by name
      const resolvedTests: RunnerTest[] = [];
      const missingTests: string[] = [];

      for (const testName of body.tests) {
        if (typeof testName !== "string") {
          return new Response(
            JSON.stringify({
              error: `Invalid test name: ${String(testName)}. Test names must be strings.`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const test = tests[testName];
        if (!test) {
          missingTests.push(testName);
        } else {
          resolvedTests.push(test);
        }
      }

      if (missingTests.length > 0) {
        return new Response(
          JSON.stringify({
            error: "One or more tests not found",
            missingTests,
            availableTests: Object.keys(tests),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Use region from options or request body (options takes precedence)
      const finalRegion = region || body.region;

      // Run tests
      const result = await runTests({
        url: body.url,
        tests: resolvedTests,
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
          error: "Test execution failed",
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
