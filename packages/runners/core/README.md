# @runners/core

Core SDK for writing and executing runners.

## Overview

This package provides the foundational types, utilities, and execution logic for the runners SDK. It includes:

- Runner type definitions (`Runner`, `RunnerContext`, `RunnerResult`)
- Runner discovery utilities
- Runner execution logic
- Schema validation
- Debug utilities

## Installation

**Note:** This is an internal package. End users should install `runners` instead:

```bash
pnpm add runners
```

For internal development:

```bash
pnpm add @runners/core
```

## Usage

### Basic Types

End users import from the main `runners` package:

```ts
import type { Runner, RunnerContext, RunnerResult } from "runners";
```

Internal packages can import directly:

```ts
import type { Runner, RunnerContext, RunnerResult } from "@runners/core";

const myRunner: Runner = async (ctx: RunnerContext) => {
  "use runner";
  
  return {
    name: "my_runner",
    status: "pass",
    details: { message: "Hello" },
  };
};
```

### Discovering Runners

```ts
import { discoverRunners } from "runners";

const runners = await discoverRunners({
  patterns: ["src/**/*.ts", "runners/**/*.ts"],
});
```

### Running Runners

```ts
import { runRunners } from "runners";

const result = await runRunners({
  runners: [myRunner],
  region: "us-east-1",
  runId: "test-run",
});
```

### Getting Runner Info

```ts
import { getRunnerInfo } from "runners";

const info = getRunnerInfo(runners, {
  region: "us-east-1",
  usageExample: {
    method: "POST",
    endpoint: "/api/runner/execute",
    exampleUrl: "https://example.com",
  },
});
```

## API

### Types

- `Runner<TInput>` - A runner function type
- `RunnerContext` - Context passed to runners
- `RunnerResult` - Result returned by runners
- `RunStatus` - Status type: `"pass" | "fail" | "error"`

### Functions

- `discoverRunners(options)` - Discover runners from file patterns
- `runRunners(options)` - Execute multiple runners
- `getRunnerInfo(runners, options)` - Get information about available runners

## See Also

- [`@runners/http`](../http/README.md) - HTTP handler for runners
- [`@runners/playwright`](../playwright/README.md) - Playwright integration
- [`@runners/config`](../../shared/config/README.md) - Configuration utilities

