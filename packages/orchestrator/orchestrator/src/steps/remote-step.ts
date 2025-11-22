import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { runnerContract } from "@runners/contracts";
import type { Job, JobResult } from "../types";
import { getRunnerUrl, normalizeJobResult } from "../utils";

/**
 * Execute a remote job step (calls runner via oRPC)
 * Uses 'use step' directive for Workflow
 * 
 * @param job - Job definition (must have region)
 * @returns Job result
 */
export async function runRemoteStep(job: Job & { region: string }): Promise<JobResult> {
  "use step";

  const startedAt = new Date();

  if (!job.region) {
    throw new Error("Region is required for geo-playwright mode");
  }

  try {
    // Get runner URL for this region
    const runnerUrl = getRunnerUrl(job.region);

    // Create oRPC client using the contract
    const link = new RPCLink({
      url: runnerUrl,
    });

    const client: ContractRouterClient<typeof runnerContract> = createORPCClient(link);

    // Prepare runner configs with pattern and input
    const runnerConfigs = job.runners.map((r) => ({
      pattern: r.pattern,
      input: {
        url: job.site,
        ...r.input,
      },
    }));

    // Call the runner using the contract with per-runner configs
    const result = await client.execute({
      url: job.site,
      runners: runnerConfigs,
      runId: job.runId,
      region: job.region,
    });

    const completedAt = new Date();

    // Normalize the result
    return normalizeJobResult(
      job,
      result.results || [],
      "completed",
      undefined,
      startedAt,
      completedAt
    );
  } catch (error) {
    const completedAt = new Date();
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Determine if it's a timeout or other error
    const state: JobResult["state"] =
      errorMessage.includes("timeout") || errorMessage.includes("Timeout")
        ? "timed_out"
        : "failed";

    return normalizeJobResult(
      job,
      [],
      state,
      errorMessage,
      startedAt,
      completedAt
    );
  }
}

