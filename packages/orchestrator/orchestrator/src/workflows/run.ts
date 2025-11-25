import type { RunRequest, JobResult } from "../types";
import { generateRunId, fanoutJobs, aggregateResults } from "../utils";
import { runLocalStep } from "../steps/local-step";
import { runRemoteStep } from "../steps/remote-step";

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
  
  // Default concurrency: if not specified, run all jobs in parallel (unlimited)
  const concurrency = input.concurrency ?? jobs.length;
  
  // Execute jobs with concurrency control
  const jobResults: JobResult[] = [];
  
  if (concurrency >= jobs.length) {
    // Run all jobs in parallel
    const jobPromises: Promise<JobResult>[] = [];
    for (const job of jobs) {
      if (input.mode === "local") {
        jobPromises.push(runLocalStep(job));
      } else {
        // In remote mode, jobs should have a region from runner configs
        if (!job.region) {
          throw new Error("Region is required for remote mode");
        }
        jobPromises.push(runRemoteStep(job as typeof job & { region: string }));
      }
    }
    jobResults.push(...await Promise.all(jobPromises));
  } else {
    // Run jobs in batches with concurrency limit
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const batchPromises: Promise<JobResult>[] = [];
      
      for (const job of batch) {
        if (input.mode === "local") {
          batchPromises.push(runLocalStep(job));
        } else {
          // In remote mode, jobs should have a region from runner configs
          if (!job.region) {
            throw new Error("Region is required for remote mode");
          }
          batchPromises.push(runRemoteStep(job as typeof job & { region: string }));
        }
      }
      
      jobResults.push(...await Promise.all(batchPromises));
    }
  }

  // Aggregate results
  const completedAt = new Date();
  const summary = aggregateResults(runId, jobs, jobResults, createdAt, completedAt);

  return summary;
}

