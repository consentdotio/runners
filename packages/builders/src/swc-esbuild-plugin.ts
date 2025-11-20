import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { promisify } from "node:util";
import enhancedResolveOriginal from "enhanced-resolve";
import type { Plugin } from "esbuild";
import { applySwcTransform, type RunnerManifest } from "./apply-swc-transform";
import { jsTsRegex, parentHasChild } from "./discover-plugin";

const PATH_SEPARATOR_REGEX = /\\/g;
const TRAILING_SLASH_REGEX = /\/$/;
const ABSOLUTE_PATH_REGEX = /^\/|:/;
const LOCAL_IMPORT_REGEX = /^\./;
const ABSOLUTE_IMPORT_REGEX = /^\//;

export type SwcPluginOptions = {
  tsPaths?: Record<string, string[]>;
  tsBaseUrl?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  entriesToBundle?: string[];
  outdir?: string;
  runnerManifest?: RunnerManifest;
};

const NODE_RESOLVE_OPTIONS = {
  dependencyType: "commonjs",
  modules: ["node_modules"],
  exportsFields: ["exports"],
  importsFields: ["imports"],
  conditionNames: ["node", "require"],
  descriptionFiles: ["package.json"],
  extensions: [".ts", ".mts", ".cjs", ".js", ".json", ".node"],
  enforceExtensions: false,
  symlinks: true,
  mainFields: ["main"],
  mainFiles: ["index"],
  roots: [],
  fullySpecified: false,
  preferRelative: false,
  preferAbsolute: false,
  restrictions: [],
};

const NODE_ESM_RESOLVE_OPTIONS = {
  ...NODE_RESOLVE_OPTIONS,
  dependencyType: "esm",
  conditionNames: ["node", "import"],
};

/**
 * Creates an esbuild plugin that applies SWC transforms to TypeScript/JavaScript files.
 * This removes "use runner" directives and applies TypeScript path mappings.
 *
 * Uses enhanced-resolve for better module resolution and supports externalization
 * logic similar to workflow builders.
 */
export function createSwcPlugin(options: SwcPluginOptions = {}): Plugin {
  return {
    name: "swc-runners-plugin",
    setup(build) {
      // Enhanced resolve for better module resolution
      const cjsResolver = promisify(
        enhancedResolveOriginal.create(NODE_RESOLVE_OPTIONS)
      );
      const esmResolver = promisify(
        enhancedResolveOriginal.create(NODE_ESM_RESOLVE_OPTIONS)
      );

      const enhancedResolve = async (context: string, path: string) => {
        try {
          return await esmResolver(context, path);
        } catch (_) {
          return cjsResolver(context, path);
        }
      };

      // Externalization logic: only bundle files with directives and their dependencies
      if (options.entriesToBundle) {
        build.onResolve({ filter: /.*/ }, async (args) => {
          try {
            let resolvedPath: string | false | undefined = args.path;

            // Handle local imports e.g. ./hello or ../another
            if (args.path.startsWith(".")) {
              resolvedPath = await enhancedResolve(args.resolveDir, args.path);
            } else {
              resolvedPath = await enhancedResolve(
                // `args.resolveDir` is not used here to ensure we only
                // externalize packages that can be resolved in the
                // project's working directory
                build.initialOptions.absWorkingDir || process.cwd(),
                args.path
              );
            }

            if (!resolvedPath) return null;

            // Normalize to forward slashes for cross-platform comparison
            const normalizedResolvedPath = resolvedPath.replace(
              PATH_SEPARATOR_REGEX,
              "/"
            );

            if (!options.entriesToBundle) {
              return null;
            }

            for (const entryToBundle of options.entriesToBundle) {
              const normalizedEntry = entryToBundle.replace(/\\/g, "/");

              if (normalizedResolvedPath === normalizedEntry) {
                return null; // Bundle this file
              }

              // If the current entry imports a child that needs to be bundled,
              // then it needs to also be bundled so that the child can have
              // our transform applied
              if (parentHasChild(normalizedResolvedPath, normalizedEntry)) {
                return null; // Bundle this file
              }
            }

            // Externalize this file
            const isFilePath =
              args.path.startsWith(".") || args.path.startsWith("/");

            const relativeExternalPath = isFilePath
              ? relative(options.outdir || process.cwd(), resolvedPath).replace(
                  PATH_SEPARATOR_REGEX,
                  "/"
                )
              : args.path;

            return {
              external: true,
              path: relativeExternalPath,
            };
          } catch (_) {
            // If resolution fails, let esbuild handle it
            return null;
          }
        });
      }

      // Handle TypeScript and JavaScript files
      build.onLoad({ filter: jsTsRegex }, async (args) => {
        try {
          // Determine the loader based on the file extension
          let loader: "js" | "jsx" = "js";
          if (args.path.endsWith(".jsx")) {
            loader = "jsx";
          }

          const source = await readFile(args.path, "utf8");

          // Calculate relative path for SWC plugin
          // The filename parameter is used for proper source maps and error reporting
          // CRITICAL: SWC plugins need relative paths (not absolute) for proper ID generation
          const workingDir =
            build.initialOptions.absWorkingDir || process.cwd();

          // Normalize paths: convert backslashes to forward slashes and remove trailing slashes
          const normalizedWorkingDir = workingDir
            .replace(PATH_SEPARATOR_REGEX, "/")
            .replace(TRAILING_SLASH_REGEX, "");
          const normalizedPath = args.path.replace(PATH_SEPARATOR_REGEX, "/");

          // Windows fix: Always do case-insensitive path comparison as the PRIMARY logic
          // to work around node:path.relative() not recognizing paths with different drive
          // letter casing (e.g., D: vs d:) as being in the same tree
          const lowerWd = normalizedWorkingDir.toLowerCase();
          const lowerPath = normalizedPath.toLowerCase();

          let relativeFilepath: string;
          if (lowerPath.startsWith(lowerWd + "/")) {
            // File is under working directory - manually calculate relative path
            // This ensures we get a relative path even with drive letter casing issues
            relativeFilepath = normalizedPath.substring(
              normalizedWorkingDir.length + 1
            );
          } else if (lowerPath === lowerWd) {
            // File IS the working directory
            relativeFilepath = ".";
          } else {
            // File is outside working directory - use relative() and strip ../ prefixes if needed
            relativeFilepath = relative(
              normalizedWorkingDir,
              normalizedPath
            ).replace(PATH_SEPARATOR_REGEX, "/");

            // Handle files discovered outside the working directory
            // These come back as ../path/to/file, but we want just path/to/file
            if (relativeFilepath.startsWith("../")) {
              relativeFilepath = relativeFilepath
                .split("/")
                .filter((part) => part !== "..")
                .join("/");
            }
          }

          // Final safety check - ensure we never pass an absolute path to SWC
          if (ABSOLUTE_PATH_REGEX.test(relativeFilepath)) {
            // This should never happen, but if it does, use just the filename as last resort
            // eslint-disable-next-line no-console
            console.error(
              `[ERROR] relativeFilepath is still absolute: ${relativeFilepath}`
            );
            relativeFilepath = normalizedPath.split("/").pop() || "unknown.ts";
          }

          // Apply SWC transform with relative path
          const {
            code: transformedCode,
            runnerManifest,
            map,
          } = await applySwcTransform(relativeFilepath, source, {
            paths: options.tsPaths,
            baseUrl: options.tsBaseUrl,
            minify: options.minify,
            sourceMaps: options.sourceMaps,
          });

          // Merge manifest if provided
          if (options.runnerManifest && runnerManifest.runners) {
            options.runnerManifest.runners = Object.assign(
              options.runnerManifest.runners || {},
              runnerManifest.runners
            );
          }

          return {
            contents: transformedCode,
            loader,
            ...(map && options.sourceMaps
              ? {
                  sourcemap: map,
                }
              : {}),
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.error(
            `[runners/builders] SWC transform error in ${args.path}:`,
            errorMessage
          );
          return {
            errors: [
              {
                text: `SWC transform failed: ${errorMessage}`,
                location: { file: args.path, line: 0, column: 0 },
              },
            ],
          };
        }
      });
    },
  };
}
