import { runLocalStep } from "../steps/local-step";
import { runRemoteStep } from "../steps/remote-step";
import type { Job, JobResult, RunRequest } from "../types";
import { aggregateResults, fanoutJobs, generateRunId } from "../utils";

/**
 * Execute a single job based on the run mode
 */
function executeJob(job: Job, input: RunRequest): Promise<JobResult> {
  if (input.mode === "local") {
    return runLocalStep(job);
  }
  // In remote mode, jobs should have a region from runner configs
  if (!job.region) {
    throw new Error("Region is required for remote mode");
  }
  return runRemoteStep(job as typeof job & { region: string });
}

/**
 * Main workflow function for orchestrating runner jobs
 *
 * @param input - Run request
 * @returns Run summary with aggregated results
 */
export async function runWorkflow(input: RunRequest) {
  const runId = input.runId || generateRunId();
  const createdAt = new Date();

  // Fan out jobs
  const jobs = fanoutJobs(input, runId);

  // Default concurrency: if not specified or non-positive, run all jobs in parallel (unlimited)
  const concurrency =
    input.concurrency != null && input.concurrency > 0
      ? input.concurrency
      : jobs.length;

  // Execute jobs with concurrency control
  const jobResults: JobResult[] = [];

  if (concurrency >= jobs.length) {
    // Run all jobs in parallel
    const jobPromises = jobs.map((job) => executeJob(job, input));
    jobResults.push(...(await Promise.all(jobPromises)));
  } else {
    // Run jobs in batches with concurrency limit
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const batchPromises = batch.map((job) => executeJob(job, input));
      jobResults.push(...(await Promise.all(batchPromises)));
    }
  }

  // Aggregate results
  const completedAt = new Date();
  const summary = aggregateResults(runId, jobs, jobResults, {
    createdAt,
    completedAt,
  });

  return summary;
}
