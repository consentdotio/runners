// Re-export types from runners core
export type {
  Runner,
  RunnerContext,
  RunnerResult,
  RunRunnersOptions,
  RunRunnersResult,
  RunStatus,
} from "@runners/core";

// HTTP-specific types
export type HttpRunnerRequest = {
  url?: string;
  runners: string[];
  runId?: string;
  region?: string;
  // Input data to pass to runners (can include url if runner needs it)
  input?: Record<string, unknown>;
};

export type CreateHttpRunnerOptions = {
  runners: Record<string, import("@runners/core").Runner>;
  region?: string;
  /**
   * If true, only runners with "use runner" directive will be discovered.
   * Note: This option is currently unused as runners are passed directly.
   * It's reserved for future extensibility when HTTP runner may discover runners dynamically.
   */
  requireDirective?: boolean;
};
