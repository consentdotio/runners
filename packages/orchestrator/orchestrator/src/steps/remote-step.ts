import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { runnerContract } from "@runners/contracts";
import type { Job, JobResult } from "../types";
import {
  getRunnerUrl as getRunnerEndpointUrl,
  normalizeJobResult,
} from "../utils";

/**
 * Check if an error is a timeout error using robust detection
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    // Check error name
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return true;
    }

    // Check error code (Node.js standard timeout codes)
    if (
      "code" in error &&
      (error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED" ||
        error.code === "TIMEOUT")
    ) {
      return true;
    }
  }

  // Check for timeout in error object code property
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "ETIMEDOUT" ||
      error.code === "ECONNABORTED" ||
      error.code === "TIMEOUT")
  ) {
    return true;
  }

  // Fallback: check error message (case-insensitive)
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.toLowerCase().includes("timeout");
}

/**
 * Execute a remote job step (calls runner via oRPC)
 *
 * @param job - Job definition (must have region)
 * @returns Job result
 */
export async function runRemoteStep(
  job: Job & { region: string }
): Promise<JobResult> {
  const startedAt = new Date();

  try {
    // Get runner URL for this region
    const runnerEndpointUrl = getRunnerEndpointUrl(job.region);

    // Create oRPC client using the contract
    const link = new RPCLink({
      url: runnerEndpointUrl,
    });

    const client: ContractRouterClient<typeof runnerContract> =
      createORPCClient(link);

    // Extract URL from first runner's input (all runners in a job should have the same URL)
    const firstRunner = job.runners[0];
    if (!firstRunner) {
      throw new Error("Job must have at least one runner");
    }
    const url = firstRunner.input?.url as string | undefined;
    if (!url) {
      throw new Error("Runner input must contain a 'url' field");
    }

    // Validate all runners have the same URL
    for (const runner of job.runners) {
      const runnerInputUrl = runner.input?.url as string | undefined;
      if (runnerInputUrl !== url) {
        throw new Error(
          `All runners in a job must have the same URL. Found "${url}" and "${runnerInputUrl}"`
        );
      }
    }

    // Prepare runner configs with name and input
    const runnerConfigs = job.runners.map((r) => ({
      name: r.name,
      input: r.input || {},
    }));

    // Prepare request payload
    const requestPayload = {
      url,
      runners: runnerConfigs,
      runId: job.runId,
      region: job.region,
    };

    // Log payload only in debug mode to avoid leaking sensitive data
    if (process.env.DEBUG || process.env.ORCHESTRATOR_DEBUG) {
      console.log(
        "[orchestrator/remote-step] Calling runner with payload:",
        JSON.stringify(requestPayload, null, 2)
      );
    }

    // Call the runner using the contract with per-runner configs
    const result = await client.execute(requestPayload);

    const completedAt = new Date();

    // Normalize the result
    return normalizeJobResult(job, result.results || [], {
      state: "completed",
      startedAt,
      completedAt,
    });
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine if it's a timeout or other error using robust detection
    const state: JobResult["state"] = isTimeoutError(error)
      ? "timed_out"
      : "failed";

    return normalizeJobResult(job, [], {
      state,
      error: errorMessage,
      startedAt,
      completedAt,
    });
  }
}
