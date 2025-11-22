import { os } from "@orpc/server";
import { start, getRun } from "workflow/api";
import {
  WorkflowRunNotCompletedError,
  WorkflowRunFailedError,
} from "workflow/internal/errors";
import { z } from "zod";
import { runWorkflow } from "../workflows/run";
import {
  RunRequestSchema,
  RunStatusSchema,
  RunSummarySchema,
} from "../schemas/run";
import type { RunRequest, RunStatus, RunSummary } from "../types";

/**
 * Submit a new run request
 * Triggers workflow asynchronously and returns runId immediately
 */
export const submitRun = os
  .route({
    method: "POST",
    path: "/run",
    summary: "Submit a new run request",
    tags: ["Run"],
  })
  .input(RunRequestSchema)
  .output(
    z.object({
      runId: z.string(),
    })
  )
  .handler(async ({ input }: { input: RunRequest }) => {
    const request = input;

    // Start the workflow
    const run = await start(runWorkflow, [request]);

    return {
      runId: run.runId,
    };
  });

/**
 * Get run status by runId
 */
export const getRunStatus = os
  .route({
    method: "GET",
    path: "/run/{runId}/status",
    summary: "Get run status by runId",
    tags: ["Run"],
  })
  .input(
    z.object({
      runId: z.string(),
    })
  )
  .output(RunStatusSchema)
  .handler(async ({ input }: { input: { runId: string } }) => {
    const { runId } = input;

    try {
      const run = getRun(runId);
      
      // Try to get return value - this will throw if not completed
      try {
        const returnValue = await run.returnValue;
        
        // Workflow completed - extract status from summary
        const summary = returnValue as RunSummary;
        return {
          runId: summary.runId,
          state: summary.state,
          totalJobs: summary.jobs.length,
          completedJobs: summary.jobs.filter((j) => j.state === "completed").length,
          failedJobs: summary.jobs.filter((j) => j.state === "failed" || j.state === "timed_out").length,
          createdAt: summary.createdAt,
          updatedAt: summary.completedAt || summary.createdAt,
        } as RunStatus;
      } catch (error) {
        if (WorkflowRunNotCompletedError.is(error)) {
          // Workflow still running - return basic status
          // Note: We can't get detailed job counts until workflow completes
          return {
            runId,
            state: "running",
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as RunStatus;
        }
        throw error;
      }
    } catch (error) {
      if (WorkflowRunFailedError.is(error)) {
        // Workflow failed
        return {
          runId,
          state: "failed",
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as RunStatus;
      }

      throw error;
    }
  });

/**
 * Get run results by runId
 */
export const getRunResults = os
  .route({
    method: "GET",
    path: "/run/{runId}",
    summary: "Get run results by runId",
    tags: ["Run"],
  })
  .input(
    z.object({
      runId: z.string(),
    })
  )
  .output(RunSummarySchema)
  .handler(async ({ input }: { input: { runId: string } }) => {
    const { runId } = input;

    try {
      const run = getRun(runId);
      const returnValue = await run.returnValue;

      if (returnValue === undefined) {
        throw new WorkflowRunNotCompletedError(runId, "running");
      }

      return returnValue as RunSummary;
    } catch (error: unknown) {
      if (WorkflowRunNotCompletedError.is(error)) {
        throw new Error(`Run ${runId} is still running. Use GET /run/${runId}/status to check status.`);
      }

      if (WorkflowRunFailedError.is(error)) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Run ${runId} failed: ${errorMessage}`);
      }

      throw error;
    }
  });

