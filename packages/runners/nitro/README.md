# @runners/nitro

Nitro module for runners SDK.

## Overview

This package provides a Nitro module that automatically sets up runner endpoints, handles build-time bundling, and integrates with Nitro's build system.

## Installation

```bash
pnpm add runners
```

This package is available as `runners/nitro` from the main `runners` package.

## Usage

### Basic Setup

Add the module to your `nitro.config.ts`:

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro"],
});
```

### Configuration

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro"],
  runners: {
    pattern: ["src/**/*.ts", "runners/**/*.ts"], // Default patterns
    region: process.env.RUNNER_REGION || "us-east-1",
  },
});
```

## Features

- **Automatic Runner Discovery**: Scans `src/**/*.ts` and `runners/**/*.ts` by default
- **Build-time Bundling**: Bundles runners at build time for optimal performance
- **Schema Extraction**: Extracts runner schemas at build time for validation and documentation
- **Watch Mode**: Supports incremental rebuilds in development
- **Virtual Handlers**: Creates virtual handlers for runner endpoints

## API Endpoints

The module automatically creates:

- `POST /api/runner/execute` - Execute runners
- `GET /api/runner/info` - Get runner information
- `GET /api/runner/docs` - Interactive API documentation
- `GET /api/runner/spec.json` - OpenAPI specification

## Build Process

1. **Schema Extraction**: Extracts runner schemas using the Rust schema-extractor tool
2. **Runner Bundling**: Bundles runners into a single file using esbuild
3. **Virtual Handler Creation**: Creates a virtual handler that imports the bundled runners

## Development

In development mode, the module:

- Watches for changes and rebuilds incrementally
- Externalizes runner bundles to prevent dev reloads
- Supports HMR (Hot Module Replacement)

## Production

In production mode, the module:

- Performs a one-time build
- Optimizes bundles for size and performance
- Includes build-time extracted schemas

## See Also

- [`@runners/http`](../http/README.md) - HTTP handler implementation
- [`@runners/builders`](../builders/README.md) - Build-time bundling utilities
- [Nitro Documentation](https://v3.nitro.build/)

