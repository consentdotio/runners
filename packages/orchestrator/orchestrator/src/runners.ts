import { discoverRunners, type Runner } from "@runners/core";

/**
 * Discover all available runners with 'use runner' directives
 * 
 * @param pattern - Glob pattern to match runner files (default: "src/**\/*.ts" or "runners/**\/*.ts")
 * @returns Map of runner name to runner function
 */
export async function discoverAvailableRunners(
  pattern?: string
): Promise<Map<string, Runner>> {
  // Try common patterns if not specified
  const patterns = pattern
    ? [pattern]
    : ["src/**/*.ts", "runners/**/*.ts"];

  const allRunners = new Map<string, Runner>();

  for (const p of patterns) {
    try {
      const runners = await discoverRunners(p, true); // requireDirective = true
      for (const [name, runner] of runners) {
        allRunners.set(name, runner);
      }
    } catch (error) {
      // Log but continue - some patterns might not match
      if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
        console.warn(`[orchestrator] Failed to discover runners from pattern "${p}":`, error);
      }
    }
  }

  return allRunners;
}

/**
 * Get runners by name from discovered runners
 * 
 * @param runnerNames - Array of runner names to retrieve
 * @param discoveredRunners - Map of all discovered runners
 * @returns Array of runner functions
 */
export function getRunnersByName(
  runnerNames: string[],
  discoveredRunners: Map<string, Runner>
): Runner[] {
  const runners: Runner[] = [];
  const missing: string[] = [];

  for (const name of runnerNames) {
    const runner = discoveredRunners.get(name);
    if (runner) {
      runners.push(runner);
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Runners not found: ${missing.join(", ")}. Available runners: ${Array.from(discoveredRunners.keys()).join(", ")}`
    );
  }

  return runners;
}

