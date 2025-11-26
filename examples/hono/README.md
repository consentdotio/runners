# Runners with Hono (Nitro v3)

This example demonstrates how to use the `runners` SDK with Hono and Nitro.

- Learn more about Hono: https://hono.dev
- Learn more about Nitro: https://v3.nitro.build/
- Learn more about Runners: See the main README.md

## Setup

Runners are automatically discovered from `src/**/*.ts` and `runners/**/*.ts`. Files must have a `"use runner"` directive - either at the module level (top of file) or function level (inside async functions). The directive will be removed during compilation by the SWC plugin.

**If your runners use Playwright**, you need to install Playwright browsers:

```sh
pnpm exec playwright install
```

This only needs to be done once per machine. If you see an error about Playwright executables not existing, run this command.

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

### GET /api/runner/info

Get information about all available runners:

```bash
curl http://localhost:3001/api/runner/info
```

Returns:
```json
{
  "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
  "count": 2,
  "region": "us-east-1",
  "usage": {
    "method": "POST",
    "endpoint": "/api/runner/execute",
    "example": {
      "url": "https://example.com",
      "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"]
    }
  }
}
```

### POST /api/runner/execute

Run runners via HTTP API. Accepts JSON body with runners as strings or config objects:

**Simple format (strings):**
```json
{
  "url": "https://example.com",
  "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
  "runId": "optional-run-id",
  "region": "optional-region"
}
```

**Advanced format (with runner-specific input):**
```json
{
  "runners": [
    {
      "name": "exampleTitleVisibleTest",
      "input": {
        "url": "https://example.com"
      }
    },
    {
      "name": "cookieBannerVisibleTest",
      "input": {
        "url": "https://example.com"
      }
    }
  ],
  "runId": "optional-run-id",
  "region": "optional-region"
}
```

Example curl:
```bash
curl -X POST http://localhost:3001/api/runner/execute \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "runners": ["exampleTitleVisibleTest"]
  }'
```

Returns:
```json
{
  "region": "us-east-1",
  "runId": "generated-run-id",
  "results": [
    {
      "name": "exampleTitleVisibleTest",
      "status": "pass",
      "durationMs": 1234
    }
  ]
}
```

### GET /api/runner/docs

Interactive API documentation (Scalar UI):

```bash
open http://localhost:3001/api/runner/docs
```

### GET /api/runner/spec.json

OpenAPI specification:

```bash
curl http://localhost:3001/api/runner/spec.json
```

### GET /health

Health check endpoint that returns API status and region:

```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "ok",
  "message": "Runners API is available at /api/runner/execute",
  "region": "us-east-1"
}
```
