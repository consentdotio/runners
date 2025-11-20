// Re-export types from runners core
export type {
  RunnerTest,
  RunnerTestContext,
  RunnerTestResult,
  RunTestsOptions,
  RunTestsResult,
  TestStatus,
} from "runners";

// HTTP-specific types
export type HttpRunnerRequest = {
  url: string;
  tests: string[];
  runId?: string;
  region?: string;
};

export type CreateHttpRunnerOptions = {
  tests: Record<string, import("runners").RunnerTest>;
  region?: string;
  /**
   * If true, only tests with "use runner" directive will be discovered.
   * Note: This option is currently unused as tests are passed directly.
   * It's reserved for future extensibility when HTTP runner may discover tests dynamically.
   */
  requireDirective?: boolean;
};
