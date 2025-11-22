# Runners with Hono (Nitro v3)

This example demonstrates how to use the `runners` SDK with Hono and Nitro.

- Learn more about Hono: https://hono.dev
- Learn more about Nitro: https://v3.nitro.build/
- Learn more about Runners: See the main README.md

## Setup

Runners are automatically discovered from `src/**/*.ts` and `runners/**/*.ts`. Files must have a `"use runner"` directive - either at the module level (top of file) or function level (inside async functions). The directive will be removed during compilation by the SWC plugin.

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

### GET /api/runner

Get information about all available runners:

```bash
curl http://localhost:3000/api/runner
```

Returns:
```json
{
  "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
  "count": 2,
  "region": "us-east-1",
  "usage": {
    "method": "POST",
    "endpoint": "/api/runner",
    "example": {
      "url": "https://example.com",
      "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"]
    }
  }
}
```

### POST /api/runner

Run runners via HTTP API. Accepts JSON body:

```json
{
  "url": "https://example.com",
  "runners": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
  "runId": "optional-run-id",
  "region": "optional-region"
}
```

### GET /health

Health check endpoint that returns available runners and region.
