#!/usr/bin/env node
/**
 * Script to auto-generate stderr files using SWC's built-in UPDATE feature
 * Usage: pnpm test:update-stderr
 *
 * The SWC testing framework supports UPDATE=1 to automatically update
 * stderr files. This script runs that command.
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("Updating stderr files using SWC testing framework...\n");
console.log("Running: UPDATE=1 cargo test --test errors\n");

try {
  // Use SWC's built-in UPDATE feature to auto-generate stderr files
  execSync("cargo test --test errors", {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: "inherit",
    env: {
      ...process.env,
      UPDATE: "1",
    },
  });

  console.log("\n✅ All stderr files updated!");
} catch (_error) {
  // Tests may fail, but UPDATE should have generated the files
  console.log("\n✅ Stderr files should be updated (check output above)");
  console.log("Run: cargo test --test errors to verify");
  process.exit(0); // Exit successfully since UPDATE is what matters
}
