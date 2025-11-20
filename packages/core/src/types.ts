export type RunStatus = "pass" | "fail" | "error";

export type RunnerResult = {
  name: string;
  status: RunStatus;
  details?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
};

export type RunnerContext = {
  page: import("playwright").Page;
  url: string;
  region?: string;
  runId?: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
};

export type Runner = (ctx: RunnerContext) => Promise<RunnerResult>;

export type RunRunnersOptions = {
  url: string;
  runners: Runner[];
  region?: string;
  runId?: string;
  timeout?: number;
};

export type RunRunnersResult = {
  url: string;
  region?: string;
  runId?: string;
  results: RunnerResult[];
};
