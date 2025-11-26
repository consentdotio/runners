# @runners/http

HTTP handler for API-based runner execution.

## Overview

This package provides an HTTP handler that exposes runners as REST API endpoints. It uses oRPC for type-safe API contracts and includes OpenAPI documentation.

## Installation

```bash
pnpm add runners
```

This package is available as `runners/http` from the main `runners` package.

## Usage

### Basic Setup

```ts
import { createOrpcRunnerHandler } from "runners/http";
import * as runners from "./runners";

const handler = await createOrpcRunnerHandler({
  runners,
  region: process.env.RUNNER_REGION || "us-east-1",
});

// Use with any framework that accepts Request/Response
export default handler;
```

### With Nitro

The `@runners/nitro` package provides a Nitro module that uses this handler automatically.

### With Custom Framework

```ts
import { createOrpcRunnerHandler } from "runners/http";

const handler = await createOrpcRunnerHandler({
  runners: {
    myRunner: async (ctx, input) => {
      return { name: "my_runner", status: "pass" };
    },
  },
  region: "us-east-1",
});

// In your framework handler
export async function handleRequest(req: Request): Promise<Response> {
  return handler(req);
}
```

## API Endpoints

When mounted at `/api/runner`, the handler provides:

- `POST /api/runner/execute` - Execute runners
- `GET /api/runner/info` - Get runner information
- `GET /api/runner/docs` - Interactive API documentation (Scalar UI)
- `GET /api/runner/spec.json` - OpenAPI specification

## Options

```ts
interface CreateHttpRunnerOptions {
  runners: Record<string, Runner>;
  region?: string;
  schemas?: Map<string, RunnerSchemaInfo>;
  schemaPattern?: string | string[];
}
```

## Schema Discovery

The handler automatically discovers runner schemas from build-time metadata or runtime scanning. Schemas are used to:

- Validate runner inputs
- Generate OpenAPI documentation
- Provide better error messages

## See Also

- [`@runners/core`](../core/README.md) - Core runner types and utilities
- [`@runners/nitro`](../nitro/README.md) - Nitro integration
- [`@runners/contracts`](../../shared/contracts/README.md) - API contracts

