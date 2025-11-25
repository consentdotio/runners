import { oc } from "@orpc/contract";
import { z } from "zod";

/**
 * Schema for runner result
 */
export const RunnerResultSchema = z.object({
  name: z.string(),
  status: z.enum(["pass", "fail", "error"]),
  details: z.record(z.string(), z.unknown()).optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().optional(),
});

/**
 * Schema for individual runner config in request
 * 
 * @example
 * ```json
 * {
 *   "name": "exampleTitleVisibleTest",
 *   "input": {
 *     "url": "https://example.com"
 *   }
 * }
 * ```
 */
export const RunnerConfigRequestSchema = z.object({
  name: z.string().describe("Name of the runner to execute"),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Input parameters for the runner. The exact schema depends on the runner. Common fields include 'url' for web-based runners."),
});

/**
 * Schema for run runners request
 * Supports both legacy format (array of strings) and new format (array of configs)
 * 
 * @example
 * ```json
 * {
 *   "url": "https://example.com",
 *   "runners": [
 *     {
 *       "name": "exampleTitleVisibleTest",
 *       "input": {
 *         "url": "https://example.com"
 *       }
 *     }
 *   ],
 *   "runId": "optional-run-id",
 *   "region": "us-east-1"
 * }
 * ```
 */
export const RunRunnersRequestSchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .describe("Optional URL to pass to all runners. Can be overridden by runner-specific input."),
  runners: z
    .array(z.union([z.string(), RunnerConfigRequestSchema]))
    .min(1, "At least one runner is required")
    .describe("Array of runners to execute. Can be runner names (strings) or runner configs with name and input."),
  runId: z
    .string()
    .optional()
    .describe("Optional unique identifier for this run. If not provided, one will be generated."),
  region: z
    .string()
    .optional()
    .describe("Optional region identifier for this run."),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Legacy: Single input object to pass to all runners. Prefer using runner-specific input in the runners array."),
});

/**
 * Schema for run runners response
 */
export const RunRunnersResponseSchema = z.object({
  region: z.string().optional(),
  runId: z.string().optional(),
  results: z.array(RunnerResultSchema),
});

/**
 * Contract for executing runners
 */
export const executeRunners = oc
  .$route({ inputStructure: "compact" })
  .route({
    method: "POST",
    path: "/execute",
    summary: "Execute runners",
    tags: ["Runner"],
  })
  .input(RunRunnersRequestSchema)
  .output(RunRunnersResponseSchema)
  .errors({
    RUNNER_NOT_FOUND: {
      message: "One or more runners not found",
      data: z.object({
        missingRunners: z.array(z.string()),
        availableRunners: z.array(z.string()),
      }),
    },
    EXECUTION_FAILED: {
      message: "Runner execution failed",
      data: z.object({
        details: z.string(),
      }),
    },
  });

/**
 * Contract for getting runner info
 * Returns information about available runners including their names and usage examples
 */
export const getRunnerInfo = oc
  .route({
    method: "GET",
    path: "/info",
    summary: "Get runner information",
    description: "Returns a list of available runners, their count, and usage examples. Use this endpoint to discover which runners are available and how to call them.",
    tags: ["Runner"],
  })
  .output(
    z.object({
      runners: z.array(z.string()).describe("List of available runner names"),
      count: z.number().describe("Total number of available runners"),
      region: z.string().optional().describe("Region identifier for this runner server"),
      usage: z
        .object({
          method: z.string().describe("HTTP method to use"),
          endpoint: z.string().describe("API endpoint path"),
          example: z.object({
            url: z.string().describe("Example URL to test"),
            runners: z.array(z.string()).describe("Example runner names to execute"),
          }),
        })
        .optional()
        .describe("Usage information and examples"),
    })
  );

/**
 * Runner contract router
 */
export const runnerContract = {
  execute: executeRunners,
  info: getRunnerInfo,
};

