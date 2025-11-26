# Runners with Hono (Nitro v3)

This example demonstrates how to use the `runners` SDK with Hono and Nitro.

- Learn more about Hono: https://hono.dev
- Learn more about Nitro: https://v3.nitro.build/
- Learn more about Runners: See the main README.md

## Setup

Runners are automatically discovered from `src/**/*.ts` and `runners/**/*.ts`. Files must have a `"use runner"` directive - either at the module level (top of file) or function level (inside async functions). The directive will be removed during compilation by the SWC plugin.

### Configuration

Configure the orchestrator in `nitro.config.ts`:

```ts
import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro-orchestrator"],
  orchestrator: {
    // Optional: Configure where to discover local runners
    // pattern: ["src/**/*.ts", "runners/**/*.ts"],
    
    // Configure remote runner endpoints for remote mode
    runners: {
      "us-east-1": "https://us-east.runner.example.com/api/runner",
      "eu-west-1": "https://eu-west.runner.example.com/api/runner",
      // Add more regions as needed
    },
  },
});
```

The `runners` configuration maps region names to remote runner endpoint base URLs. When using `mode: "remote"` in run requests, the orchestrator will call these endpoints (appending `/execute`) based on the region specified in each runner config.

## Commands

**Local development:**

```sh
pnpm dev
```

**Production build (Vercel):**

```sh
NITRO_PRESET=vercel pnpm build
npx vercel --prebuilt
```

**Production build (Node.js):**

```sh
pnpm build
node .output/server/index.mjs
```

## API Endpoints

### GET /api/orchestrator/{runId}/status

Get the status of a run:

```bash
curl http://localhost:3000/api/orchestrator/{runId}/status
```

### GET /api/orchestrator/{runId}

Get the results of a completed run:

```bash
curl http://localhost:3000/api/orchestrator/{runId}
```

### POST /api/orchestrator/orchestrator

Submit a new run request. Accepts JSON body:

```json
{
  "runners": [
    {
      "name": "exampleTitleVisibleTest",
      "region": "us-east-1",
      "input": {"url": "https://example.com"}
    }
  ],
  "mode": "remote",
  "concurrency": 1,
  "timeout": 30000
}
```

Example curl:
```bash
curl -X POST http://localhost:3000/api/orchestrator/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "runners": [{
      "name": "exampleTitleVisibleTest",
      "region": "us-east-1",
      "input": {"url": "https://example.com"}
    }],
    "mode": "remote"
  }'
```

### GET /health

Health check endpoint that returns available runners and region.
