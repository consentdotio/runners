export type TestStatus = 'pass' | 'fail' | 'error';

export type RunnerTestResult = {
  name: string;
  status: TestStatus;
  details?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
};

export type RunnerTestContext = {
  page: import('playwright').Page;
  url: string;
  region?: string;
  runId?: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
};

export type RunnerTest = (ctx: RunnerTestContext) => Promise<RunnerTestResult>;

export type RunTestsOptions = {
  url: string;
  tests: RunnerTest[];
  region?: string;
  runId?: string;
  timeout?: number;
};

export type RunTestsResult = {
  url: string;
  region?: string;
  runId?: string;
  results: RunnerTestResult[];
};
