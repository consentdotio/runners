import { implement } from "@orpc/server";
import { orchestratorContract } from "@runners/contracts";
import { getRun as getRunState, storeRun, updateRun } from "./state";
import type { RunRequest, RunStatus } from "./types";
import { runWorkflow } from "./workflows/run";

/**
 * Create orchestrator router implementing the orchestrator contract
 */
export function createOrchestratorRouter() {
  const pub = implement(orchestratorContract);

  const submitRun = pub.submitRun.handler(
    ({ input }: { input: RunRequest }) => {
      // With compact inputStructure, input is the RunRequest directly
      const request = input;

      if (process.env.DEBUG || process.env.ORCHESTRATOR_DEBUG) {
        console.log("[orchestrator] Starting run with request:", {
          runners: request.runners.length,
          mode: request.mode,
          concurrency: request.concurrency,
          timeout: request.timeout,
        });
      }

      // Generate runId if not provided
      const runId =
        request.runId ||
        `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const createdAt = new Date();

      // Store run in memory
      storeRun(runId, createdAt);

      // Ensure runId is set in request for consistency
      const requestWithRunId = { ...request, runId };

      // Execute run directly (non-blocking)
      runWorkflow(requestWithRunId)
        .then((summary) => {
          // Update run state with completed summary
          updateRun(runId, {
            status: "completed",
            summary,
          });
        })
        .catch((error) => {
          // Update run state with error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          updateRun(runId, {
            status: "failed",
            error: errorMessage,
          });
        });

      return {
        runId,
      };
    }
  );

  const getRunStatus = pub.getRunStatus.handler(
    ({ input }: { input: { runId: string } }) => {
      // With compact inputStructure, path params are in input directly
      const { runId } = input;

      const runState = getRunState(runId);
      if (!runState) {
        throw new Error(`Run ${runId} not found`);
      }

      if (runState.status === "completed" && runState.summary) {
        // Run completed - extract status from summary
        const summary = runState.summary;
        const status: RunStatus = {
          runId: summary.runId,
          state: summary.state,
          totalJobs: summary.jobs.length,
          completedJobs: summary.jobs.filter((j) => j.state === "completed")
            .length,
          failedJobs: summary.jobs.filter(
            (j) => j.state === "failed" || j.state === "timed_out"
          ).length,
          createdAt: summary.createdAt,
          updatedAt: summary.completedAt || summary.createdAt,
        };
        return status;
      }

      if (runState.status === "failed") {
        // Run failed
        const status: RunStatus = {
          runId,
          state: "failed",
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          createdAt: runState.createdAt,
          updatedAt: runState.updatedAt,
        };
        return status;
      }

      // Run still running
      const status: RunStatus = {
        runId,
        state: "running",
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        createdAt: runState.createdAt,
        updatedAt: runState.updatedAt,
      };
      return status;
    }
  );

  const getRunResults = pub.getRunResults.handler(
    ({ input }: { input: { runId: string } }) => {
      // With compact inputStructure, path params are in input directly
      const { runId } = input;

      const runState = getRunState(runId);
      if (!runState) {
        throw new Error(`Run ${runId} not found`);
      }

      if (runState.status === "running") {
        throw new Error(
          `Run ${runId} is still running. Use GET /api/orchestrator/${runId}/status to check status.`
        );
      }

      if (runState.status === "failed") {
        throw new Error(
          `Run ${runId} failed: ${runState.error || "Unknown error"}`
        );
      }

      if (runState.status === "completed" && runState.summary) {
        return runState.summary;
      }

      throw new Error(`Run ${runId} has invalid state`);
    }
  );

  // Use .router() to create the router structure matching the contract
  // This ensures the router structure matches what OpenAPIHandler expects
  return pub.router({
    submitRun,
    getRunStatus,
    getRunResults,
  });
}
