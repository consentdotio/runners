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
 */
export const RunnerConfigRequestSchema = z.object({
  pattern: z.string(),
  input: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for run runners request
 * Supports both legacy format (array of strings) and new format (array of configs)
 */
export const RunRunnersRequestSchema = z.object({
  url: z.string().url().optional(),
  runners: z.array(z.union([z.string(), RunnerConfigRequestSchema])).min(1, "At least one runner is required"),
  runId: z.string().optional(),
  region: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(), // Legacy: single input for all runners
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
  .route({
    method: "POST",
    path: "/runner",
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
 */
export const getRunnerInfo = oc
  .route({
    method: "GET",
    path: "/runner",
    summary: "Get runner information",
    tags: ["Runner"],
  })
  .output(
    z.object({
      runners: z.array(z.string()),
      count: z.number(),
      region: z.string().optional(),
      usage: z
        .object({
          method: z.string(),
          endpoint: z.string(),
          example: z.object({
            url: z.string(),
            runners: z.array(z.string()),
          }),
        })
        .optional(),
    })
  );

/**
 * Runner contract router
 */
export const runnerContract = {
  execute: executeRunners,
  info: getRunnerInfo,
};

