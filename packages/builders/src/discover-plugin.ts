import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import enhancedResolveOriginal from "enhanced-resolve";
import type { Plugin } from "esbuild";
import { useRunnerPattern, useRunnerFunctionPattern } from "@runners/core";
import { normalizePath } from "@runners/core";
import { applySwcTransform } from "./apply-swc-transform.js";

const enhancedResolve = promisify(
  enhancedResolveOriginal.create({
    conditionNames: ["node", "require"],
    modules: ["node_modules"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  })
);

export const jsTsRegex = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// parent -> child relationship for import tracking
export const importParents = new Map<string, string>();

/**
 * Checks if a parent file imports a child file in its import chain.
 * Used to determine if a dependency needs to be bundled because it has
 * a 'use runner' directive.
 */
export function parentHasChild(parent: string, childToFind: string): boolean {
  let child: string | undefined;
  let currentParent: string | undefined = parent;
  const visited = new Set<string>();

  do {
    if (currentParent) {
      // Detect circular imports to prevent infinite loop
      if (visited.has(currentParent)) {
        break;
      }
      visited.add(currentParent);
      child = importParents.get(currentParent);
    }

    if (child === childToFind) {
      return true;
    }
    currentParent = child;
  } while (child && currentParent);

  return false;
}

export function createDiscoverRunnersPlugin(state: {
  discoveredRunners: string[];
}): Plugin {
  return {
    name: "discover-runners-esbuild-plugin",
    setup(build) {
      // Track import relationships
      build.onResolve({ filter: jsTsRegex }, async (args) => {
        try {
          const resolved = await enhancedResolve(args.resolveDir, args.path);
          if (resolved) {
            importParents.set(args.importer, resolved);
          }
        } catch (_) {
          // Ignore resolve errors during discovery
        }
        return null;
      });

      // Handle TypeScript and JavaScript files
      build.onLoad({ filter: jsTsRegex }, async (args) => {
        try {
          const source = await readFile(args.path, "utf8");
          // Check for both module-level and function-level directives
          const hasUseRunner =
            useRunnerPattern.test(source) ||
            useRunnerFunctionPattern.test(source);

          // Normalize path separators to forward slashes for cross-platform compatibility
          const normalizedPath = normalizePath(args.path);

          if (hasUseRunner) {
            state.discoveredRunners.push(normalizedPath);
          }

          // Transform code during discovery (like workflow does)
          // This helps catch errors early and ensures consistent processing
          const { code: transformedCode } = await applySwcTransform(
            normalizedPath,
            source,
            {
              // Don't apply plugin during discovery, just transform syntax
              // This helps catch syntax errors early
            }
          );

          // Determine the loader based on the output
          let loader: "js" | "jsx" = "js";
          const isTypeScript =
            args.path.endsWith(".ts") || args.path.endsWith(".tsx");
          if (!isTypeScript && args.path.endsWith(".jsx")) {
            loader = "jsx";
          }

          return {
            contents: transformedCode,
            loader,
          };
        } catch (_) {
          // Ignore errors during discover phase
          return {
            contents: "",
            loader: "js",
          };
        }
      });
    },
  };
}
