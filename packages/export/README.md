# runners

Main package that re-exports all runners SDK functionality.

## Overview

This is the main entry point for the runners SDK. It re-exports functionality from all sub-packages and provides a unified API.

## Installation

```bash
npm install runners
# or
pnpm add runners
# or
yarn add runners
```

## Usage

### Core Functionality

```ts
import { runRunners, type Runner, type RunnerContext } from "runners";
```

### Configuration

```ts
import { defineConfig } from "runners/config";
```

### HTTP Handler

```ts
import { createOrpcRunnerHandler } from "runners/http";
```

### Playwright Integration

```ts
import { withPlaywright } from "runners/playwright";
```

### Nitro Integration

```ts
// In nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro"],
});
```

### Orchestrator

```ts
import { createOrchestratorHandler } from "runners/orchestrator";
```

## Exports

The package provides the following exports:

- `runners` - Main package (re-exports core functionality)
- `runners/config` - Configuration utilities
- `runners/nitro` - Nitro module
- `runners/errors` - Error types
- `runners/http` - HTTP handler
- `runners/playwright` - Playwright integration
- `runners/orchestrator` - Orchestrator service
- `runners/nitro-orchestrator` - Nitro orchestrator module

## CLI

The package includes a CLI:

```bash
npx runners run --url https://example.com myRunner
```

## See Also

- [Main README](../../README.md) - Full documentation
- [`@runners/core`](../runners/core/README.md) - Core functionality
- [`@runners/http`](../runners/http/README.md) - HTTP handler
- [`@runners/playwright`](../runners/playwright/README.md) - Playwright integration

