import type { RunRequest, JobResult } from "../types";
import { generateRunId, fanoutJobs, aggregateResults } from "../utils";
import { runSandboxStep } from "../steps/sandbox-step";
import { runRemoteStep } from "../steps/remote-step";

/**
 * Main workflow function for orchestrating runner jobs
 * Uses 'use workflow' directive for Workflow
 * 
 * @param input - Run request
 * @returns Run summary with aggregated results
 */
export async function runWorkflow(input: RunRequest) {
  "use workflow";

  const runId = input.runId || generateRunId();
  const createdAt = new Date();

  // Fan out jobs
  const jobs = fanoutJobs(input, runId);
  const jobPromises: Promise<JobResult>[] = [];

  // Execute jobs based on mode
  for (const job of jobs) {
    if (input.mode === "sandbox") {
      jobPromises.push(runSandboxStep(job));
    } else {
      // In geo-playwright mode, jobs should have a region from runner configs
      if (!job.region) {
        throw new Error("Region is required for geo-playwright mode");
      }
      jobPromises.push(runRemoteStep(job as typeof job & { region: string }));
    }
  }

  // Wait for all jobs to complete
  const jobResults = await Promise.all(jobPromises);

  // Aggregate results
  const completedAt = new Date();
  const summary = aggregateResults(runId, jobs, jobResults, createdAt, completedAt);

  return summary;
}

