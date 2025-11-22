# Nitro Orchestrator Example

This example demonstrates how to use the orchestrator with Nitro.

## Setup

The orchestrator is automatically set up via the `runners/nitro-orchestrator` module in `nitro.config.ts`.

## Usage

Start the dev server:

```bash
pnpm dev
```

## Endpoints

- **`/api/run`** - Submit a new run request
- **`/api/run/{runId}/status`** - Get run status
- **`/api/run/{runId}`** - Get run results
- **`/docs`** - API documentation (Scalar UI)
- **`/api/docs`** - API documentation (alternative path)
- **`/spec.json`** - OpenAPI specification
- **`/api/spec.json`** - OpenAPI specification (alternative path)

## Example Request

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "sites": ["https://example.com"],
    "runners": [
      {
        "pattern": "cookieBannerVisibleTest",
        "region": "us-east-1",
        "input": {}
      }
    ],
    "mode": "geo-playwright"
  }'
```

