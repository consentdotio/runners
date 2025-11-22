import type { RunnerResult } from "@runners/core";

/**
 * Run mode - determines how jobs are executed
 */
export type RunMode = "sandbox" | "geo-playwright";

/**
 * Job state tracking
 */
export type JobState = "queued" | "running" | "completed" | "failed" | "timed_out";

/**
 * Runner configuration with pattern, region, and input schema
 */
export type RunnerConfig = {
  pattern: string;
  region?: string;
  input?: Record<string, unknown>;
};

/**
 * Run request input
 */
export type RunRequest = {
  sites: string[];
  runners: RunnerConfig[];
  mode: RunMode;
  concurrency?: number;
  timeout?: number;
  tags?: string[];
  runId?: string;
};

/**
 * Individual job definition
 */
export type Job = {
  jobId: string;
  site: string;
  region?: string;
  runners: RunnerConfig[];
  runId: string;
};

/**
 * Result from a single job execution
 */
export type JobResult = {
  jobId: string;
  site: string;
  region?: string;
  state: JobState;
  results: RunnerResult[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
};

/**
 * Run status
 */
export type RunStatus = {
  runId: string;
  state: JobState;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Aggregated results for entire run
 */
export type RunSummary = {
  runId: string;
  state: JobState;
  jobs: JobResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errored: number;
  };
  createdAt: Date;
  completedAt?: Date;
  durationMs?: number;
};

/**
 * Stored run metadata (for Workflow world storage)
 */
export type RunRecord = {
  runId: string;
  request: RunRequest;
  status: RunStatus;
  createdAt: Date;
  updatedAt: Date;
};

