import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { transform } from "@swc/core";

const require = createRequire(import.meta.url);

export type RunnerManifest = {
  runners?: {
    [relativeFileName: string]: {
      [functionName: string]: {
        runnerId: string;
      };
    };
  };
};

export type SwcTransformOptions = {
  paths?: Record<string, string[]>;
  // this must be absolute path
  baseUrl?: string;
  minify?: boolean;
  sourceMaps?: boolean;
};

const RUNNER_MANIFEST_REGEX = /\/\*\*__internal_runners({.*?})\*\//s;

/**
 * Applies SWC transform to source code, removing "use runner" directives
 * and applying TypeScript path mappings.
 *
 * @param filename - Relative path from working directory (important for manifest generation)
 * @param source - Source code to transform
 * @param options - Transform options
 */
export async function applySwcTransform(
  filename: string,
  source: string,
  options: SwcTransformOptions = {}
): Promise<{
  code: string;
  runnerManifest: RunnerManifest;
  map?: string;
}> {
  // Determine if this is a TypeScript file
  const isTypeScript = filename.endsWith(".ts") || filename.endsWith(".tsx");
  const isTsx = filename.endsWith(".tsx");

  // Resolve SWC plugin path
  let swcPluginPath: string | undefined;
  try {
    // Try to resolve the package directory first
    let resolved: string;
    try {
      // Try resolving the package.json to get the package directory
      resolved = require.resolve("@runners/swc-plugin/package.json");
    } catch {
      // Fall back to resolving the main export
      resolved = require.resolve("@runners/swc-plugin");
    }

    // Get the package directory and construct absolute path to WASM file
    const pluginDir = dirname(resolved);
    const wasmPath = resolve(pluginDir, "swc_plugin_runners.wasm");

    // Verify the WASM file exists
    try {
      await access(wasmPath);
      swcPluginPath = wasmPath;
    } catch {
      // If the constructed path doesn't exist, try the resolved path directly
      // (in case require.resolve already returned the WASM file)
      if (resolved.endsWith(".wasm")) {
        const absoluteResolved = resolve(resolved);
        try {
          await access(absoluteResolved);
          swcPluginPath = absoluteResolved;
        } catch {
          // Plugin WASM file not found
          throw new Error(
            `SWC plugin WASM file not found at ${wasmPath} or ${absoluteResolved}`
          );
        }
      } else {
        throw new Error(`SWC plugin WASM file not found at ${wasmPath}`);
      }
    }
  } catch (error) {
    // Plugin not found, continue without it
    // eslint-disable-next-line no-console
    console.warn(
      `[runners/builders] @runners/swc-plugin not found, skipping directive removal: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Transform with SWC
  try {
    const result = await transform(source, {
      filename,
      swcrc: false,
      jsc: {
        parser: {
          syntax: isTypeScript ? "typescript" : "ecmascript",
          tsx: isTsx,
        },
        target: "es2022",
        experimental: swcPluginPath
          ? {
              plugins: [[swcPluginPath, {}]],
            }
          : undefined,
        ...(options.paths && options.baseUrl
          ? {
              paths: options.paths,
              baseUrl: options.baseUrl,
            }
          : {}),
      },
      sourceMaps: options.sourceMaps ?? false,
      minify: options.minify ?? false,
    });

    // Extract manifest from SWC plugin output (if plugin adds it)

    const runnerCommentMatch = result.code.match(RUNNER_MANIFEST_REGEX);

    const parsedRunners = JSON.parse(
      runnerCommentMatch?.[1] || "{}"
    ) as RunnerManifest;

    return {
      code: result.code,
      runnerManifest: parsedRunners || {},
      map: result.map,
    };
  } catch (error) {
    // If plugin fails, try without it
    if (swcPluginPath && error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      // Check for plugin-related errors (case-insensitive)
      if (
        errorMsg.includes("plugin") ||
        errorMsg.includes("wasm") ||
        errorMsg.includes("invoke")
      ) {
        // Only log warning in debug mode to reduce noise
        if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(
            `[runners/builders] SWC plugin failed (${swcPluginPath}), transforming without plugin: ${error.message}`
          );
        }
        // Retry without plugin
        const result = await transform(source, {
          filename,
          swcrc: false,
          jsc: {
            parser: {
              syntax: isTypeScript ? "typescript" : "ecmascript",
              tsx: isTsx,
            },
            target: "es2022",
            ...(options.paths && options.baseUrl
              ? {
                  paths: options.paths,
                  baseUrl: options.baseUrl,
                }
              : {}),
          },
          sourceMaps: options.sourceMaps ?? false,
          minify: options.minify ?? false,
        });
        return {
          code: result.code,
          runnerManifest: {},
          map: result.map,
        };
      }
    }
    throw error;
  }
}
