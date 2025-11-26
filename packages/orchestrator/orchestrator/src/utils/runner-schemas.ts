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
 * Orchestrator-specific schema discovery options
 */
const orchestratorDiscoveryOptions: SchemaDiscoveryOptions = {
  ignore: ["node_modules/**", "dist/**"],
  logPrefix: "[orchestrator]",
};

/**
 * Discovers runner input schemas from runner files.
 * Wrapper around the shared implementation with orchestrator-specific defaults.
 *
 * @param pattern - Glob pattern to match runner files
 * @returns Map of runner name to schema info
 */
export function discoverRunnerSchemas(
  pattern: string | string[] = "runners/**/*.ts"
): Promise<Map<string, RunnerSchemaInfo>> {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return discoverRunnerSchemasCore(patterns, orchestratorDiscoveryOptions);
}

/**
 * Gets runner schema info for a specific runner name
 */
export function getRunnerSchemaInfo(
  runnerName: string,
  pattern?: string | string[]
): Promise<RunnerSchemaInfo | undefined> {
  let patterns: string[] | undefined;
  if (pattern) {
    patterns = Array.isArray(pattern) ? pattern : [pattern];
  }
  return getRunnerSchemaInfoCore(
    runnerName,
    patterns,
    orchestratorDiscoveryOptions
  );
}

/**
 * Gets all discovered runner schema info
 */
export function getAllRunnerSchemaInfo(
  pattern?: string | string[]
): Promise<RunnerSchemaInfo[]> {
  let patterns: string[] | undefined;
  if (pattern) {
    patterns = Array.isArray(pattern) ? pattern : [pattern];
  }
  return getAllRunnerSchemaInfoCore(patterns, orchestratorDiscoveryOptions);
}
