# @runners/orchestrator

Orchestrator for running tests across multiple regions.

## Overview

This package provides an orchestrator service that can coordinate runner execution across multiple regions. It manages run state, schedules runners, and aggregates results.

## Installation

```bash
pnpm add runners
```

This package is available as `runners/orchestrator` from the main `runners` package.

## Usage

### Create Orchestrator Handler

```ts
import { createOrchestratorHandler } from "runners/orchestrator";

const handler = createOrchestratorHandler();

// Use with any framework
export default handler;
```

### Configuration

Configure remote runners via environment variable:

```bash
PLAYWRIGHT_RUNNERS='{"us-east-1":"https://runner-us-east-1.example.com/api/runner","eu-west-1":"https://runner-eu-west-1.example.com/api/runner"}'
```

The orchestrator will use these URLs to execute runners in different regions.

## API Endpoints

When mounted at `/api/orchestrator`, the handler provides:

- `POST /api/orchestrator/run` - Submit a new run request
- `GET /api/orchestrator/run/{runId}/status` - Get run status
- `GET /api/orchestrator/run/{runId}` - Get run results
- `GET /api/orchestrator/docs` - Interactive API documentation
- `GET /api/orchestrator/spec.json` - OpenAPI specification

## Run Lifecycle

1. **Submit**: Client submits a run request with runners and regions
2. **Schedule**: Orchestrator schedules runners across regions
3. **Execute**: Runners are executed in parallel
4. **Aggregate**: Results are collected and aggregated
5. **Complete**: Run status is updated to completed

## Run States

- `pending` - Run has been submitted but not started
- `running` - Run is in progress
- `completed` - Run has finished
- `failed` - Run encountered an error

## Example Request

```json
{
  "runners": [
    {
      "name": "cookieBannerVisibleTest",
      "region": "us-east-1",
      "input": {
        "url": "https://example.com"
      }
    }
  ],
  "mode": "remote"
}
```

## See Also

- [`@runners/nitro-orchestrator`](../nitro-orchestrator/README.md) - Nitro integration
- [`@runners/contracts`](../../shared/contracts/README.md) - API contracts
- [`@runners/http`](../../runners/http/README.md) - Runner HTTP handler

