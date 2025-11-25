import type { RunnerSchemaInfo } from "./schema-discovery";

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
   * Glob pattern(s) to discover runner schemas from source files.
   * Defaults to ["src/**\/*.ts", "runners/**\/*.ts"] if not provided.
   */
  schemaPattern?: string | string[];
  /**
   * Pre-discovered schemas map. If provided, schema discovery will be skipped.
   * Useful when schemas are already discovered elsewhere.
   */
  schemas?: Map<string, RunnerSchemaInfo>;
  /**
   * If true, only runners with "use runner" directive will be discovered.
   * Note: This option is currently unused as runners are passed directly.
   * It's reserved for future extensibility when HTTP runner may discover runners dynamically.
   */
  requireDirective?: boolean;
};
