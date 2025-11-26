# @runners/config

Configuration support for runners.

## Overview

This package provides configuration utilities for the runners SDK, including a `defineConfig` helper for type-safe configuration files.

## Installation

```bash
pnpm add runners
```

This package is available as `runners/config` from the main `runners` package.

## Usage

### Define Configuration

Create a `runners.config.ts` file:

```ts
import { defineConfig } from "runners/config";

export default defineConfig({
  url: "https://example.com",
  region: "us-east-1",
  runners: ["cookieBannerVisibleTest", "exampleTitleVisibleTest"],
});
```

### Configuration Schema

```ts
interface RunnersConfig {
  url?: string;
  region?: string;
  runners?: string[];
  pattern?: string | string[];
}
```

### Loading Configuration

The CLI and other tools automatically load configuration from:

1. `runners.config.ts` (or `.js`, `.mjs`)
2. Command-line arguments (override config values)

## Integration

This package is used by:

- `@runners/core` - For configuration loading
- `@runners/cli` - For CLI configuration
- User projects - For defining runner configurations

## See Also

- [`@runners/core`](../../runners/core/README.md) - Core runner utilities
- [`@runners/cli`](../../shared/cli/README.md) - CLI implementation

