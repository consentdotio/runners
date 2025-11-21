#!/usr/bin/env node
// Bridge to @runner/cli - delegates to the actual CLI implementation
// When 'runners' package is installed, this allows using 'runners' command
// Uses dynamic import to avoid build-time dependency cycle

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

// Get the directory of this file (dist/) to resolve relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths to find the CLI
const paths = [
  "@runner/cli", // When installed via npm/pnpm (package resolution - uses package.json exports)
  "@runner/cli/dist/index.mjs", // Fallback: explicit path
  join(__dirname, "../cli/dist/index.mjs"), // Workspace development: packages/core/dist -> packages/cli/dist
  join(__dirname, "../../packages/cli/dist/index.mjs"), // Alternative: from workspace root
];

(async () => {
  let imported = false;
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      // For absolute paths, convert to file:// URL for ESM import
      const importPath =
        path.startsWith("/") || path.startsWith(".")
          ? pathToFileURL(resolve(path)).href
          : path;

      await import(importPath);
      imported = true;
      break;
    } catch (error) {
      lastError = error as Error;
      // Continue to next path
      if (process.env.DEBUG) {
        console.error(`Failed to import ${path}:`, error);
      }
    }
  }

  if (!imported) {
    console.error("Failed to load CLI. Make sure @runner/cli is installed.");
    console.error("Tried paths:", paths.join(", "));
    if (process.env.DEBUG && lastError) {
      console.error("Last error:", lastError.message);
    }
    process.exit(1);
  }
})().catch((error) => {
  console.error("Error loading CLI:", error);
  process.exit(1);
});
