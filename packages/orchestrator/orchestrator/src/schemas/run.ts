import { z } from "zod";

/**
 * Zod schema for RunnerConfig validation
 */
export const RunnerConfigSchema = z.object({
  name: z.string().min(1, "Runner name is required"),
  region: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod schema for RunRequest validation
 */
export const RunRequestSchema = z.object({
  runners: z
    .array(RunnerConfigSchema)
    .min(1, "At least one runner is required"),
  mode: z.enum(["local", "remote"]),
  concurrency: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  runId: z.string().optional(),
});

/**
 * Zod schema for RunStatus validation
 */
export const RunStatusSchema = z.object({
  runId: z.string(),
  state: z.enum(["queued", "running", "completed", "failed", "timed_out"]),
  totalJobs: z.number().int().nonnegative(),
  completedJobs: z.number().int().nonnegative(),
  failedJobs: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Zod schema for RunnerResult (re-exported from @runners/core types)
 */
export const RunnerResultSchema = z.object({
  name: z.string(),
  status: z.enum(["pass", "fail", "error"]),
  details: z.record(z.string(), z.unknown()).optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().optional(),
});

/**
 * Zod schema for JobResult validation
 */
export const JobResultSchema = z.object({
  jobId: z.string(),
  region: z.string().optional(),
  state: z.enum(["queued", "running", "completed", "failed", "timed_out"]),
  results: z.array(RunnerResultSchema),
  error: z.string().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  durationMs: z.number().optional(),
});

/**
 * Zod schema for RunSummary validation
 */
export const RunSummarySchema = z.object({
  runId: z.string(),
  state: z.enum(["queued", "running", "completed", "failed", "timed_out"]),
  jobs: z.array(JobResultSchema),
  summary: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    errored: z.number().int().nonnegative(),
  }),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  durationMs: z.number().optional(),
});
