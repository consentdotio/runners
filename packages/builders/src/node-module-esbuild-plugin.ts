import builtinModules from "builtin-modules";
import type { Plugin } from "esbuild";

// Match exact Node.js built-in module names:
// - "fs", "path", "stream" etc. (exact match)
// - "node:fs", "node:path" etc. (with node: prefix)
// But NOT "some-package/stream" or "eventsource-parser/stream"
const nodeModulesRegex = new RegExp(`^(${builtinModules.join("|")})$`);

/**
 * Creates an esbuild plugin that errors when Node.js built-in modules
 * are imported in runner files. This helps catch issues early.
 *
 * Note: This is optional for runners since they run in Node.js context,
 * but it can help catch accidental imports that might cause issues.
 */
export function createNodeModuleErrorPlugin(): Plugin {
  return {
    name: "runners-node-module-error",
    setup(build) {
      build.onResolve({ filter: nodeModulesRegex }, (args) => {
        // Allow Node.js modules - runners run in Node.js context
        // This plugin exists for consistency with workflow, but we don't
        // need to error on Node.js modules for runners
        return null;
      });
    },
  };
}
