# @runners/nitro-orchestrator

Nitro module for orchestrator.

## Overview

This package provides a Nitro module that automatically sets up orchestrator endpoints in Nitro applications.

## Installation

```bash
pnpm add runners
```

This package is available as `runners/nitro-orchestrator` from the main `runners` package.

## Usage

### Basic Setup

Add the module to your `nitro.config.ts`:

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro-orchestrator"],
});
```

### Configuration

Configure remote runners via environment variable:

```bash
PLAYWRIGHT_RUNNERS='{"us-east-1":"https://runner-us-east-1.example.com/api/runner","eu-west-1":"https://runner-eu-west-1.example.com/api/runner"}'
```

## API Endpoints

The module automatically creates:

- `POST /api/orchestrator/run` - Submit a new run request
- `GET /api/orchestrator/run/{runId}/status` - Get run status
- `GET /api/orchestrator/run/{runId}` - Get run results
- `GET /api/orchestrator/docs` - Interactive API documentation
- `GET /api/orchestrator/spec.json` - OpenAPI specification

## Features

- Automatic endpoint registration
- OpenAPI documentation generation
- Type-safe API contracts
- Multi-region runner coordination

## See Also

- [`@runners/orchestrator`](../orchestrator/README.md) - Orchestrator implementation
- [`@runners/nitro`](../../runners/nitro/README.md) - Runner Nitro integration
- [Nitro Documentation](https://v3.nitro.build/)

