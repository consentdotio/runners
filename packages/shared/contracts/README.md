# @runners/contracts

Shared oRPC contracts for runners orchestrator and HTTP runner.

## Overview

This package defines the API contracts used for communication between:

- Runner HTTP handlers (`runners/http`)
- Orchestrator services (`runners/orchestrator`)

The contracts are defined using oRPC and include Zod schemas for validation.

## Installation

**Note:** This is an internal package. End users should install `runners` instead:

```bash
pnpm add runners
```

For internal development:

```bash
pnpm add @runners/contracts
```

## Contracts

### Runner Contract

Defines the API for executing runners:

- `POST /execute` - Execute one or more runners
- `GET /info` - Get information about available runners

### Orchestrator Contract

Defines the API for orchestrating runs across regions:

- `POST /run` - Submit a new run request
- `GET /run/{runId}/status` - Get run status
- `GET /run/{runId}` - Get run results

## Usage

### Runner Contract

Internal packages can import directly:

```ts
import { runnerContract } from "@runners/contracts";

// Use with oRPC server
const router = implement(runnerContract);
```

### Orchestrator Contract

```ts
import { orchestratorContract } from "@runners/contracts";

// Use with oRPC server
const router = implement(orchestratorContract);
```

## Schemas

The package exports Zod schemas for:

- `RunRunnersRequestSchema` - Request to execute runners
- `RunRunnersResponseSchema` - Response from runner execution
- `RunRequestSchema` - Request to submit a run
- `RunStatusSchema` - Run status information
- `RunSummarySchema` - Run summary information

## Type Safety

Contracts provide end-to-end type safety:

- Request/response types are inferred from schemas
- Path parameters are type-checked
- Error types are defined in contracts

## See Also

- [`runners/http`](../../runners/http/README.md) - HTTP handler implementation
- [`runners/orchestrator`](../../orchestrator/orchestrator/README.md) - Orchestrator implementation
- [oRPC Documentation](https://orpc.dev/)

