# Runners with Hono (Nitro v3)

This example demonstrates how to use the `runners` SDK with Hono and Nitro.

- Learn more about Hono: https://hono.dev
- Learn more about Nitro: https://v3.nitro.build/
- Learn more about Runners: See the main README.md

## Setup

Tests are automatically discovered from `src/runners/**/*.ts`. Only functions with the `"use runner"` directive are discovered.

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

### POST /api/runner

Run tests via HTTP API. Accepts JSON body:

```json
{
  "url": "https://example.com",
  "tests": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
  "runId": "optional-run-id",
  "region": "optional-region"
}
```

### GET /health

Health check endpoint that returns available tests and region.
