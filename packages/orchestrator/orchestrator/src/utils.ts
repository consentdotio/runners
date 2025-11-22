import type { Job, JobResult, RunRequest, RunSummary } from "./types";
import { nanoid } from "nanoid";

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  return `run_${nanoid()}`;
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `job_${nanoid()}`;
}

/**
 * Fan out jobs from run request
 * Creates one job per {site, region} pair based on runner configurations
 */
export function fanoutJobs(request: RunRequest, runId: string): Job[] {
  const jobs: Job[] = [];

  if (request.mode === "sandbox") {
    // Sandbox mode: one job per site (all runners run locally)
    for (const site of request.sites) {
      jobs.push({
        jobId: generateJobId(),
        site,
        runners: request.runners,
        runId,
      });
    }
  } else {
    // Geo-playwright mode: group runners by region and create jobs per site-region
    const runnersByRegion = new Map<string, typeof request.runners>();
    
    for (const runner of request.runners) {
      if (!runner.region) {
        throw new Error(
          `Runner "${runner.pattern}" must specify a region when mode is 'geo-playwright'`
        );
      }
      
      const regionRunners = runnersByRegion.get(runner.region) || [];
      regionRunners.push(runner);
      runnersByRegion.set(runner.region, regionRunners);
    }

    if (runnersByRegion.size === 0) {
      throw new Error(
        "At least one runner with a region is required when mode is 'geo-playwright'"
      );
    }

    // Create one job per site-region combination
    for (const site of request.sites) {
      for (const [region, runners] of runnersByRegion) {
        jobs.push({
          jobId: generateJobId(),
          site,
          region,
          runners,
          runId,
        });
      }
    }
  }

  return jobs;
}

/**
 * Map region to runner URL
 * Reads from environment variable PLAYWRIGHT_RUNNERS (JSON object)
 * Format: {"eu-west-1": "https://eu.runner.example.com/api/runner", ...}
 */
export function getRunnerUrl(region: string): string {
  const runnersEnv = process.env.PLAYWRIGHT_RUNNERS;
  if (!runnersEnv) {
    throw new Error(
      `PLAYWRIGHT_RUNNERS environment variable is not set. Expected JSON object mapping regions to URLs.`
    );
  }

  let runners: Record<string, string>;
  try {
    runners = JSON.parse(runnersEnv);
  } catch (error) {
    throw new Error(
      `Failed to parse PLAYWRIGHT_RUNNERS: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const url = runners[region];
  if (!url) {
    throw new Error(
      `No runner URL found for region "${region}". Available regions: ${Object.keys(runners).join(", ")}`
    );
  }

  return url;
}

/**
 * Normalize job result format
 */
export function normalizeJobResult(
  job: Job,
  results: Array<{ name: string; status: string; details?: unknown; errorMessage?: string; durationMs?: number }>,
  state: JobResult["state"] = "completed",
  error?: string,
  startedAt?: Date,
  completedAt?: Date
): JobResult {
  return {
    jobId: job.jobId,
    site: job.site,
    region: job.region,
    state,
    results: results.map((r, index) => ({
      name: r.name || job.runners[index]?.pattern || `runner_${index}`,
      status: r.status as "pass" | "fail" | "error",
      details: r.details as Record<string, unknown> | undefined,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs,
    })),
    error,
    startedAt,
    completedAt,
    durationMs:
      startedAt && completedAt
        ? completedAt.getTime() - startedAt.getTime()
        : undefined,
  };
}

/**
 * Aggregate job results into run summary
 */
export function aggregateResults(
  runId: string,
  jobs: Job[],
  jobResults: JobResult[],
  createdAt: Date,
  completedAt?: Date
): RunSummary {
  // Determine overall state
  const allCompleted = jobResults.every((r) => r.state === "completed");
  const hasFailed = jobResults.some((r) => r.state === "failed");
  const hasTimedOut = jobResults.some((r) => r.state === "timed_out");
  const allQueued = jobResults.every((r) => r.state === "queued");
  const anyRunning = jobResults.some((r) => r.state === "running");

  let state: RunSummary["state"];
  if (allQueued) {
    state = "queued";
  } else if (anyRunning) {
    state = "running";
  } else if (hasTimedOut) {
    state = "timed_out";
  } else if (hasFailed) {
    state = "failed";
  } else if (allCompleted) {
    state = "completed";
  } else {
    state = "failed";
  }

  // Aggregate test results
  let total = 0;
  let passed = 0;
  let failed = 0;
  let errored = 0;

  for (const jobResult of jobResults) {
    for (const result of jobResult.results) {
      total++;
      if (result.status === "pass") {
        passed++;
      } else if (result.status === "fail") {
        failed++;
      } else if (result.status === "error") {
        errored++;
      }
    }
  }

  return {
    runId,
    state,
    jobs: jobResults,
    summary: {
      total,
      passed,
      failed,
      errored,
    },
    createdAt,
    completedAt,
    durationMs:
      completedAt ? completedAt.getTime() - createdAt.getTime() : undefined,
  };
}

