# runners

A small SDK for writing Playwright tests that can be executed by an API orchestrator or a local CLI, without worrying about browsers, containers, or regions.

You write tiny test functions:

```ts
// tests/cookie-banner-visible.ts
import type { RunnerTest } from "runners";

export const cookieBannerVisibleTest: RunnerTest = async (ctx) => {
  "use runner";

  const { page, url, region, log } = ctx;

  log("Checking cookie banner", { url, region });

  const banner = page
    .locator("[data-cookie-banner], .cookie-banner, #cookie-banner")
    .first();
  const visible = await banner.isVisible();

  return {
    name: "cookie_banner_visible",
    status: visible ? "pass" : "fail",
    details: { visible },
  };
};
````

The `runners` SDK takes care of:

* launching and closing Playwright
* handling timeouts and errors
* normalising results
* exposing a HTTP handler for remote orchestration
* exposing a CLI command for local or CI use

The same test file can be run:

* locally in your terminal
* in a container in a specific region
* behind an HTTP API that a workflow engine calls

---

## Status

This is an early work in progress, shaped README first.
APIs described here are the target surface and may change slightly as the implementation lands.

---

## Installation

```bash
npm install runners
# or
pnpm add runners
# or
yarn add runners
```

---

## Core concepts

**RunnerTest**

A single Playwright based test, expressed as an async function that:

* receives a `RunnerTestContext`
* returns a `RunnerTestResult`

**Runner**

Something that:

* loads a URL in Playwright
* executes one or more `RunnerTest` functions against it
* returns normalised JSON

**Orchestrator**

Anything that:

* decides which URLs, regions and tests to run
* calls one or more runners
* stores and aggregates results

`runners` only handles the **runner** part and the small harness around it. Your own code can be the orchestrator, or you can wire it into a workflow engine.

---

## Writing your first test

Create a file in `tests/`:

```ts
// tests/example-title-visible.ts
import type { RunnerTest } from "runners";

export const exampleTitleVisibleTest: RunnerTest = async (ctx) => {
  "use runner";

  const { page, url, log } = ctx;

  log("Checking page title", { url });

  const title = await page.title();
  const ok = title.length > 0;

  return {
    name: "example_title_visible",
    status: ok ? "pass" : "fail",
    details: { title },
  };
};
```

The `"use runner"` directive is a convention that tells humans and tooling that this function runs inside the runner harness.
You do not need to launch Playwright or close the browser yourself.

### Context

The `RunnerTestContext` looks like:

```ts
type RunnerTestContext = {
  page: import("playwright").Page;
  url: string;
  region?: string;
  runId?: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
};
```

---

## Running tests locally (CLI)

Install the CLI (same package):

```bash
npx runners run \
  --url https://example.com \
  --tests exampleTitleVisibleTest \
  --tests cookieBannerVisibleTest
```

By default the CLI will:

* load `tests/**/*.ts`
* look for exported values typed as `RunnerTest`
* run the requested tests against the URL
* print a summary and exit non zero on failures

You can provide a config file to avoid long flags:

```bash
npx runners run --config runners.config.ts
```

Example `runners.config.ts`:

```ts
import { defineConfig } from "runners/config";

export default defineConfig({
  url: "https://example.com",
  region: "eu-west-1",
  tests: ["cookieBannerVisibleTest", "exampleTitleVisibleTest"],
});
```

---

## Using runners behind an API

You can expose a runner as an HTTP endpoint, for use by an orchestrator:

```ts
// api/runner.ts
import { createHttpRunner } from "runners/http";
import * as tests from "../tests";

const region = process.env.RUNNER_REGION || "eu-west-1";

export const handler = createHttpRunner({
  tests,
  region,
});
```

`createHttpRunner` produces a request handler with a simple JSON contract.

### Request

```json
{
  "url": "https://example.com",
  "tests": ["cookieBannerVisibleTest"],
  "runId": "optional-run-id"
}
```

### Response

```json
{
  "url": "https://example.com",
  "region": "eu-west-1",
  "runId": "optional-run-id",
  "results": [
    {
      "name": "cookie_banner_visible",
      "status": "pass",
      "details": { "visible": true },
      "durationMs": 1234
    }
  ]
}
```

You can deploy this handler in multiple regions and let your own orchestrator decide which runner endpoint to call for which region.

---

## Framework adapters

You can mount a runner behind your existing framework without wiring HTTP handlers by hand. The adapters expose a `/api/runner` style endpoint (or equivalent) that accepts JSON input and returns normalised results.

### Next.js

Wrap your `next.config` with the `withRunners` helper:

```ts
// next.config.mts or next.config.js

import type { NextConfig } from "next";

import { withRunners } from "runners/next";

const nextConfig: NextConfig = {
  // your existing Next.js config here
};

export default withRunners(nextConfig);
```

This will:

* register an API route such as `/api/runner`
* load tests from your `tests/` directory
* use the current deployment region (or a `RUNNER_REGION` env variable) in the context

You can then point your orchestrator at:

```http
POST /api/runner
Content-Type: application/json

{
  "url": "https://example.com",
  "tests": ["cookieBannerVisibleTest"],
  "runId": "my-run-id"
}
```

and receive the standard runner JSON result.

### Nitro / Hono

If you are using Nitro (which Hono can run under), you can enable the runner via a module:

```ts
// nitro.config.ts

import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro"],
  routes: {
    "/**": "./src/index.ts",
  },
});
```

The `runners/nitro` module will:

* register a runner endpoint (for example `/api/runner`)
* wire in your `tests/` directory
* attach region and run metadata to the context

Your Hono app then focuses purely on your normal routes, while the runner endpoint is handled by the adapter.

---

## Programmatic usage

You can also use `runners` directly from Node without HTTP or the CLI:

```ts
import { runTests } from "runners/core";
import * as tests from "./tests";

const result = await runTests({
  url: "https://example.com",
  tests: [tests.cookieBannerVisibleTest],
  region: "eu-west-1",
  runId: "local-dev",
});

console.log(result.results);
```

---

## Types

The main public types are:

```ts
import type { RunnerTest, RunnerTestContext, RunnerTestResult } from "runners";
```

Roughly:

```ts
type TestStatus = "pass" | "fail" | "error";

type RunnerTestResult = {
  name: string;
  status: TestStatus;
  details?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
};

type RunnerTest = (ctx: RunnerTestContext) => Promise<RunnerTestResult>;
```

The exact shape may grow with more metadata, but this is the core.

---

## What this project is and is not

This project **is**:

* a small SDK for defining Playwright based tests as pure functions
* a runner harness that hides browser and container details
* a thin HTTP and CLI surface around that runner

This project **is not**:

* a full workflow engine
* a reporting dashboard
* a replacement for Playwright Test

You are expected to bring your own orchestrator, database and UI if you want a full platform. `runners` gives you the execution building block.

---

## Roadmap

Planned for early versions:

* [ ] Basic Playwright based runner
* [ ] CLI with `run` command and config file
* [ ] HTTP handler helper for API based runners
* [ ] Simple test discovery in a `tests/` folder
* [ ] Minimal logging hooks
* [ ] Examples with multi region deployment

Pull requests and early feedback are very welcome.

