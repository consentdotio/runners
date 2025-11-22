import {
  runRunners,
  type Runner,
  type RunnerContext,
  type RunnerResult,
} from "@runners/core";
import type { Job, JobResult } from "../types";
import { discoverAvailableRunners, getRunnersByName } from "../runners";
import { normalizeJobResult } from "../utils";

/**
 * Execute a sandbox job step
 * Uses 'use step' directive for Workflow
 * 
 * @param job - Job definition
 * @returns Job result
 */
export async function runSandboxStep(job: Job): Promise<JobResult> {
  "use step";

  const startedAt = new Date();

  try {
    // Discover all available runners
    const discoveredRunners = await discoverAvailableRunners();

    // Get the specific runners requested for this job
    const runnerNames = job.runners.map((r) => r.pattern);
    const runners = getRunnersByName(runnerNames, discoveredRunners);

    // Wrap runners to pass input (each runner can have its own input)
    const runnersToRun = runners.map((runner, index) => {
      const runnerConfig = job.runners[index];
      if (!runnerConfig) {
        throw new Error(`Runner config not found for index ${index}`);
      }
      // Merge site URL with runner-specific input
      const runnerInput = {
        url: job.site,
        ...runnerConfig.input,
      };

      return async (ctx: RunnerContext): Promise<RunnerResult<unknown>> =>
        runner(ctx, runnerInput);
    });

    // Run the runners
    const result = await runRunners({
      runners: runnersToRun as Runner[],
      region: job.region,
      runId: job.runId,
    });

    const completedAt = new Date();

    // Normalize the result
    return normalizeJobResult(
      job,
      result.results,
      "completed",
      undefined,
      startedAt,
      completedAt
    );
  } catch (error) {
    const completedAt = new Date();
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return normalizeJobResult(
      job,
      [],
      "failed",
      errorMessage,
      startedAt,
      completedAt
    );
  }
}

