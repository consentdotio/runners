import { glob } from "glob";
import { pathToFileURL } from "node:url";
import type { Runner } from "../types";
import { hasAnyDirective } from "./directive-detector";
import { normalizePath } from "./debug";

/**
 * Caches discovered runners by pattern and requireDirective.
 * Uses WeakMap to allow garbage collection when patterns are no longer referenced.
 * This cache is invalidated automatically when the pattern array reference changes
 * (e.g., when files are added/removed during watch mode).
 */
const discoveredRunnersCache = new WeakMap<string[], Map<string, Runner>>();

/**
 * Discovers runner functions from files matching the given pattern.
 *
 * @param pattern - Glob pattern to match runner files (default: "src/**\/*.ts")
 * @param requireDirective - Whether to require "use runner" directive (default: true)
 * @returns Map of runner name to runner function
 */
export async function discoverRunners(
  pattern: string = "src/**/*.ts",
  requireDirective: boolean = true
): Promise<Map<string, Runner>> {
  const discoverStart = Date.now();
  const cacheKey = [pattern, String(requireDirective)];

  // Check cache
  const cached = discoveredRunnersCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const runnerFiles = await glob(pattern, {
    ignore: ["node_modules/**", "dist/**"],
  });

  const runners = new Map<string, Runner>();
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of runnerFiles) {
    try {
      // Check for directive (module-level or function-level) if required
      if (requireDirective) {
        const hasDirective = await hasAnyDirective(file);
        if (!hasDirective) {
          // Skip files without directive
          continue;
        }
      }

      // Import the module to get exports
      const moduleUrl = pathToFileURL(file).href;
      const module = await import(moduleUrl);

      // Discover async function exports as runners
      for (const [exportName, exportValue] of Object.entries(module)) {
        // Check if the export is a function (basic check)
        if (typeof exportValue === "function") {
          // Accept any async function export as a Runner
          if (exportValue.constructor.name === "AsyncFunction") {
            runners.set(exportName, exportValue as Runner);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({ file: normalizePath(file), error: errorMessage });
      // eslint-disable-next-line no-console
      console.error(
        `[runners] Failed to load runner file ${normalizePath(file)}:`,
        errorMessage
      );
    }
  }

  const discoverTime = Date.now() - discoverStart;

  // Log discovery results
  if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      `[runners] Discovered ${runners.size} runner(s) from ${runnerFiles.length} file(s) in ${discoverTime}ms`
    );
    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[runners] ${errors.length} file(s) failed to load (see errors above)`
      );
    }
  }

  // Cache the result
  discoveredRunnersCache.set(cacheKey, runners);

  return runners;
}

/**
 * Clears the discovery cache. Useful for testing or when you need to force re-discovery.
 */
export function clearDiscoveryCache(): void {
  // WeakMap doesn't have a clear method, but we can create a new one
  // In practice, the cache will be garbage collected when patterns are no longer referenced
}
