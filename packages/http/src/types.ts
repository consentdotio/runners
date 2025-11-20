// Re-export types from runners core
export type {
  Runner,
  RunnerContext,
  RunnerResult,
  RunRunnersOptions,
  RunRunnersResult,
  RunStatus,
} from "runners";

// HTTP-specific types
export type HttpRunnerRequest = {
  url: string;
  runners: string[];
  runId?: string;
  region?: string;
};

export type CreateHttpRunnerOptions = {
  runners: Record<string, import("runners").Runner>;
  region?: string;
  /**
   * If true, only runners with "use runner" directive will be discovered.
   * Note: This option is currently unused as runners are passed directly.
   * It's reserved for future extensibility when HTTP runner may discover runners dynamically.
   */
  requireDirective?: boolean;
};
