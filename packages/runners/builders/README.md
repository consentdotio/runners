# @runners/builders

Build-time bundling utilities for runners.

## Overview

This package provides utilities for bundling runners at build time. It includes:

- esbuild plugins for bundling runners
- SWC transform integration
- Runner discovery during build
- Module resolution and externalization

## Installation

**Note:** This is an internal package used by `@runners/nitro`. End users should install `runners` instead:

```bash
pnpm add runners
```

For internal development:

```bash
pnpm add @runners/builders
```

## Usage

### LocalBuilder

The `LocalBuilder` class handles bundling runners for local execution:

```ts
import { LocalBuilder } from "@runners/builders";

const builder = new LocalBuilder(nitro, ["src/**/*.ts", "runners/**/*.ts"]);

// Build once
await builder.build();

// Or watch for changes
await builder.watch();
```

### SWC Transform

Apply SWC transforms to runner files:

```ts
import { applySwcTransform } from "@runners/builders";

const transformed = await applySwcTransform({
  code: sourceCode,
  filename: "runner.ts",
});
```

### esbuild Plugins

The package provides esbuild plugins for:

- **SWC Transform Plugin**: Transforms TypeScript/JavaScript using SWC
- **Node Module Plugin**: Handles Node.js module resolution
- **Discovery Plugin**: Discovers runners during build

## Architecture

The builder system:

1. **Discovery**: Scans files matching patterns for runners
2. **Transformation**: Applies SWC transforms to remove directives and optimize code
3. **Bundling**: Bundles runners into a single file using esbuild
4. **Externalization**: Marks external dependencies to prevent bundling

## Integration

This package is primarily used by:

- `@runners/nitro` - For Nitro build integration
- Build tools that need to bundle runners

## See Also

- [`@runners/nitro`](../nitro/README.md) - Nitro integration
- [`@runners/swc-plugin`](../swc-plugin-runners/README.md) - SWC plugin for directive removal

