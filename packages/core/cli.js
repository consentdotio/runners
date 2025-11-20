#!/usr/bin/env node

// Bridge to @runner/cli - delegates to the actual CLI implementation
// When 'runners' package is installed, this allows using 'runners' command
// Uses dynamic import to avoid build-time dependency cycle

// Try multiple paths to find the CLI
const paths = [
  '@runner/cli/dist/index.mjs', // When installed via npm/pnpm
  '../cli/dist/index.mjs', // Workspace development (relative)
  '../../cli/dist/index.mjs', // Alternative workspace path
];

let imported = false;
for (const path of paths) {
  try {
    await import(path);
    imported = true;
    break;
  } catch {
    // Continue to next path
  }
}

if (!imported) {
  console.error('Failed to load CLI. Make sure @runner/cli is installed.');
  console.error('Tried paths:', paths.join(', '));
  process.exit(1);
}

