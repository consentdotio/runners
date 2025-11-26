import {
  type Runner,
  type RunnerContext,
  type RunnerResult,
  runRunners,
} from "@runners/core";
import { discoverAvailableRunners, getRunnersByName } from "../runners";
import type { Job, JobResult } from "../types";
import { normalizeJobResult } from "../utils";

/**
 * Execute a local job step
 *
 * @param job - Job definition
 * @returns Job result
 */
export async function runLocalStep(job: Job): Promise<JobResult> {
  const startedAt = new Date();

  try {
    // Discover all available runners
    const discoveredRunners = await discoverAvailableRunners();

    // Get the specific runners requested for this job
    const runnerNames = job.runners.map((r) => r.name);
    const runners = getRunnersByName(runnerNames, discoveredRunners);

    // Wrap runners to pass input (each runner can have its own input)
    const runnersToRun = runners.map((runner, index) => {
      const runnerConfig = job.runners[index];
      if (!runnerConfig) {
        throw new Error(`Runner config not found for index ${index}`);
      }
      // Use runner's input directly (URL should be in input.url)
      const runnerInput = runnerConfig.input || {};

      return async (ctx: RunnerContext): Promise<RunnerResult<unknown>> =>
        runner(ctx, runnerInput);
    });

    // Run the runners
    const result = await runRunners({
      runners: runnersToRun as Runner[],
      region: job.region,
      runId: job.runId,
      timeout: job.timeout,
    });

    const completedAt = new Date();

    // Normalize the result
    return normalizeJobResult(job, result.results, {
      state: "completed",
      startedAt,
      completedAt,
    });
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    return normalizeJobResult(job, [], {
      state: "failed",
      error: errorMessage,
      startedAt,
      completedAt,
    });
  }
}
