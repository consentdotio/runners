import type {
  Job,
  JobResult,
  RunRequest,
  RunSummary,
  RunnerConfig,
} from "./types";

/**
 * Generate a unique run ID (workflow-safe, no Node.js dependencies)
 */
export function generateRunId(): string {
  // Use timestamp + random for uniqueness (workflow-safe)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `run_${timestamp}_${random}`;
}

/**
 * Generate a unique job ID (workflow-safe, no Node.js dependencies)
 */
export function generateJobId(): string {
  // Use timestamp + random for uniqueness (workflow-safe)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `job_${timestamp}_${random}`;
}

/**
 * Extract URL from runner input
 */
function getUrlFromRunnerInput(runner: RunnerConfig): string | undefined {
  return runner.input?.url as string | undefined;
}

/**
 * Fan out jobs from run request
 * Groups runners by URL and region to create jobs
 */
export function fanoutJobs(request: RunRequest, runId: string): Job[] {
  const jobs: Job[] = [];

  if (request.mode === "local") {
    // Local mode: group runners by URL
    const runnersByUrl = new Map<string, typeof request.runners>();

    for (const runner of request.runners) {
      const url = getUrlFromRunnerInput(runner);
      if (!url) {
        throw new Error(
          `Runner "${runner.name}" must specify a URL in its input when mode is 'local'`
        );
      }

      const urlRunners = runnersByUrl.get(url) || [];
      urlRunners.push(runner);
      runnersByUrl.set(url, urlRunners);
    }

    // Create one job per URL
    for (const [url, runners] of runnersByUrl) {
      jobs.push({
        jobId: generateJobId(),
        runners,
        runId,
        timeout: request.timeout,
      });
    }
  } else {
    // Remote mode: group runners by URL and region
    const runnersByUrlAndRegion = new Map<
      string,
      Map<string, typeof request.runners>
    >();

    for (const runner of request.runners) {
      if (!runner.region) {
        throw new Error(
          `Runner "${runner.name}" must specify a region when mode is 'remote'`
        );
      }

      const url = getUrlFromRunnerInput(runner);
      if (!url) {
        throw new Error(
          `Runner "${runner.name}" must specify a URL in its input when mode is 'remote'`
        );
      }

      let regionMap = runnersByUrlAndRegion.get(url);
      if (!regionMap) {
        regionMap = new Map();
        runnersByUrlAndRegion.set(url, regionMap);
      }

      const regionRunners = regionMap.get(runner.region) || [];
      regionRunners.push(runner);
      regionMap.set(runner.region, regionRunners);
    }

    if (runnersByUrlAndRegion.size === 0) {
      throw new Error(
        "At least one runner with a URL and region is required when mode is 'remote'"
      );
    }

    // Create one job per URL-region combination
    for (const [url, regionMap] of runnersByUrlAndRegion) {
      for (const [region, runners] of regionMap) {
        jobs.push({
          jobId: generateJobId(),
          region,
          runners,
          runId,
          timeout: request.timeout,
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
  results: Array<{
    name: string;
    status: string;
    details?: unknown;
    errorMessage?: string;
    durationMs?: number;
  }>,
  state: JobResult["state"] = "completed",
  error?: string,
  startedAt?: Date,
  completedAt?: Date
): JobResult {
  return {
    jobId: job.jobId,
    region: job.region,
    state,
    results: results.map((r, index) => ({
      name: r.name || job.runners[index]?.name || `runner_${index}`,
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
    durationMs: completedAt
      ? completedAt.getTime() - createdAt.getTime()
      : undefined,
  };
}
