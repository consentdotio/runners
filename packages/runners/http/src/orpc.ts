import { implement } from "@orpc/server";
import { runRunners, getRunnerInfo, type Runner, type RunnerContext, type RunnerResult } from "@runners/core";
import { runnerContract } from "@runners/contracts";
import type { CreateHttpRunnerOptions } from "./types";

/**
 * Create oRPC router implementing the runner contract
 */
export function createRunnerRouter(options: CreateHttpRunnerOptions) {
  const { runners, region } = options;

  // Use implement() on the full contract - it creates an implementer that we can use
  // to attach handlers. After attaching handlers, we use .router() to create the router.
  const pub = implement(runnerContract);

  const executeRunners = pub
    .execute
    .handler(async ({ input, errors }: { input: any; errors: any }) => {
      console.log("[runner/orpc] Received input:", JSON.stringify(input, null, 2));
      console.log("[runner/orpc] Input type:", typeof input);
      console.log("[runner/orpc] Input keys:", input ? Object.keys(input) : "null/undefined");
      
      // Resolve runner functions by name
      const resolvedRunners: Runner[] = [];
      const missingRunners: string[] = [];

      // Handle both legacy format (array of strings) and new format (array of configs)
      const runnerConfigs: Array<{ name: string; input?: Record<string, unknown> }> = [];
      
      for (const runnerItem of input.runners) {
        if (typeof runnerItem === "string") {
          // Legacy format: string
          runnerConfigs.push({ name: runnerItem });
        } else {
          // New format: config object
          runnerConfigs.push({
            name: runnerItem.name,
            input: runnerItem.input,
          });
        }
      }

      for (const config of runnerConfigs) {
        const runner = runners[config.name];
        if (runner) {
          resolvedRunners.push(runner);
        } else {
          missingRunners.push(config.name);
        }
      }

      if (missingRunners.length > 0) {
        throw errors.RUNNER_NOT_FOUND({
          data: {
            missingRunners,
            availableRunners: Object.keys(runners),
          },
        });
      }

      try {
        // Use region from options or request body (options takes precedence)
        const finalRegion = region || input.region;

        // Prepare runner inputs - merge url and per-runner inputs
        const runnersToRun = resolvedRunners.map((runner, index) => {
          const config = runnerConfigs[index];
          if (!config) {
            throw new Error(`Runner config not found for index ${index}`);
          }
          // Merge: legacy input (if provided) + runner-specific input + url
          const runnerInput = {
            ...(input.input || {}),
            ...(config.input || {}),
            ...(input.url ? { url: input.url } : {}),
          };

          const hasInput = Object.keys(runnerInput).length > 0;
          return hasInput
            ? async (ctx: RunnerContext): Promise<RunnerResult<unknown>> =>
                runner(ctx, runnerInput)
            : runner;
        });

        // Run runners
        const result = await runRunners({
          runners: runnersToRun as typeof resolvedRunners,
          region: finalRegion,
          runId: input.runId,
        });

        // Transform result to match contract schema
        return {
          region: result.region || finalRegion,
          runId: result.runId || input.runId,
          results: result.results.map((r) => ({
            name: r.name,
            status: r.status,
            details: typeof r.details === "object" && r.details !== null && !Array.isArray(r.details)
              ? r.details as Record<string, unknown>
              : undefined,
            errorMessage: r.errorMessage,
            durationMs: r.durationMs,
          })),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw errors.EXECUTION_FAILED({
          data: {
            details: errorMessage,
          },
        });
      }
    });

  const infoHandler = pub
    .info
    .handler(() => {
      return getRunnerInfo(runners, {
        region,
        usageExample: {
          method: "POST",
          endpoint: "/api/runner/execute",
          exampleUrl: "https://example.com",
        },
      });
    });

  // Use .router() to create the router structure matching the contract
  // This ensures the router structure matches what OpenAPIHandler expects
  return pub.router({
    execute: executeRunners,
    info: infoHandler,
  });
}

