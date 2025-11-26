import {
  discoverRunnerSchemas as discoverRunnerSchemasCore,
  getAllRunnerSchemaInfo as getAllRunnerSchemaInfoCore,
  getRunnerSchemaInfo as getRunnerSchemaInfoCore,
  type RunnerSchemaInfo,
  type SchemaDiscoveryOptions,
} from "@runners/core";

// Re-export types for convenience
export type { RunnerSchemaInfo, SchemaDiscoveryOptions };

/**
 * HTTP-specific schema discovery options
 */
const httpDiscoveryOptions: SchemaDiscoveryOptions = {
  ignore: ["node_modules/**", "dist/**", ".nitro/**"],
  logPrefix: "[runners/http]",
};

/**
 * Discovers runner input schemas from runner files.
 * Wrapper around the shared implementation with HTTP-specific defaults.
 *
 * @param patterns - Glob pattern(s) to match runner files
 * @returns Map of runner name to schema info
 */
export function discoverRunnerSchemas(
  patterns: string | string[] = ["src/**/*.ts", "runners/**/*.ts"]
): Promise<Map<string, RunnerSchemaInfo>> {
  return discoverRunnerSchemasCore(patterns, httpDiscoveryOptions);
}

/**
 * Gets runner schema info for a specific runner name
 */
export function getRunnerSchemaInfo(
  runnerName: string,
  patterns?: string | string[]
): Promise<RunnerSchemaInfo | undefined> {
  return getRunnerSchemaInfoCore(runnerName, patterns, httpDiscoveryOptions);
}

/**
 * Gets all discovered runner schema info
 */
export function getAllRunnerSchemaInfo(
  patterns?: string | string[]
): Promise<RunnerSchemaInfo[]> {
  return getAllRunnerSchemaInfoCore(patterns, httpDiscoveryOptions);
}
