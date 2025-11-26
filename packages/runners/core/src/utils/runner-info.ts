import type { Runner } from "../types";

export type RunnerInfo = {
  runners: string[];
  count: number;
};

export type RunnerInfoOptions = {
  region?: string;
  usageExample?: {
    method?: string;
    endpoint?: string;
    exampleUrl?: string;
  };
};

/**
 * Generates metadata about available runners.
 * This is useful for API endpoints that need to list available runners.
 *
 * @param runners - Record of runner name to runner function
 * @param options - Optional configuration for the info response
 * @returns Runner metadata including names, count, and optional usage info
 */
export function getRunnerInfo(
  runners: Record<string, Runner>,
  options: RunnerInfoOptions = {}
): RunnerInfo & {
  region?: string;
  usage?: {
    method: string;
    endpoint: string;
    example: {
      url: string;
      runners: string[];
    };
  };
} {
  const runnerNames = Object.keys(runners);
  const { region, usageExample } = options;

  const result: ReturnType<typeof getRunnerInfo> = {
    runners: runnerNames,
    count: runnerNames.length,
  };

  if (region) {
    result.region = region;
  }

  if (usageExample) {
    result.usage = {
      method: usageExample.method || "POST",
      endpoint: usageExample.endpoint || "/api/runner/execute",
      example: {
        url: usageExample.exampleUrl || "https://example.com",
        runners: runnerNames.slice(0, 2), // Show first 2 as example
      },
    };
  }

  return result;
}
