# runners

A small SDK for writing Playwright runners that can be executed by an API orchestrator or a local CLI, without worrying about browsers, containers, or regions.

You write tiny runner functions:

```ts
// src/runners/cookie-banner-visible.ts
import type { Runner } from "runners";

export const cookieBannerVisibleTest: Runner = async (ctx) => {
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

The same runner file can be run:

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

**Runner**

A single Playwright based runner, expressed as an async function that:

* receives a `RunnerContext`
* returns a `RunnerResult`

**Runner Harness**

Something that:

* loads a URL in Playwright
* executes one or more `Runner` functions against it
* returns normalised JSON

**Orchestrator**

Anything that:

* decides which URLs, regions and runners to run
* calls one or more runner harnesses
* stores and aggregates results

`runners` only handles the **runner** part and the small harness around it. Your own code can be the orchestrator, or you can wire it into a workflow engine.

---

## Writing your first runner

Create a file anywhere in `src/`:

```ts
// src/runners/example-title-visible.ts
import type { Runner } from "runners";

export const exampleTitleVisibleTest: Runner = async (ctx) => {
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

The `"use runner"` directive is required for runner discovery. It tells the runner harness that this function should be executed as a runner.
You do not need to launch Playwright or close the browser yourself.

Only functions with this directive will be discovered as runners.
This allows you to have helper functions or utilities in the same file without them being treated as runners.

### Context

The `RunnerContext` looks like:

```ts
type RunnerContext = {
  page: import("playwright").Page;
  url: string;
  region?: string;
  runId?: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
};
```

---

## Running runners locally (CLI)

Install the CLI (same package):

```bash
npx runner run \
  --url https://example.com \
  exampleTitleVisibleTest \
  cookieBannerVisibleTest
```

By default the CLI will:

* scan `src/**/*.ts` for runner files
* discover only exported async functions that have the `"use runner"` directive
* run the requested runners against the URL
* print a summary and exit non zero on failures

You can provide a config file to avoid long flags:

```bash
npx runner run --config runners.config.ts
```

### Directive-based runner discovery

The CLI only discovers runners that have the `"use runner"` directive. This ensures that helper functions and utilities in your runner files are not accidentally executed as runners.

* **Module-level directive**: If a file has `"use runner";` at the top, all exported async functions in that file are considered runners
* **Function-level directive**: If a function has `"use runner";` as its first statement, that function is considered a runner

Example with function-level directive:

```ts
export const myRunner: Runner = async (ctx) => {
  "use runner";
  // ... runner implementation
};
```

Example with module-level directive:

```ts
"use runner";

export const runner1: Runner = async (ctx) => {
  // ... runner implementation
};

export const runner2: Runner = async (ctx) => {
  // ... runner implementation
};
```

Example `runners.config.ts`:

```ts
import { defineConfig } from "runners/config";

export default defineConfig({
  url: "https://example.com",
  region: "eu-west-1",
  runners: ["cookieBannerVisibleTest", "exampleTitleVisibleTest"],
});
```

---

## Using runners behind an API

You can expose a runner as an HTTP endpoint, for use by an orchestrator:

```ts
// api/runner.ts
import { createHttpRunner } from "@runners/http";
import * as runners from "../runners";

const region = process.env.RUNNER_REGION || "eu-west-1";

export const handler = createHttpRunner({
  runners,
  region,
});
```

`createHttpRunner` produces a request handler with a simple JSON contract.

### Request

```json
{
  "url": "https://example.com",
  "runners": ["cookieBannerVisibleTest"],
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

import { withRunners } from "runner/next";

const nextConfig: NextConfig = {
  // your existing Next.js config here
};

export default withRunners(nextConfig);
```

This will:

* register an API route such as `/api/runner`
* load runners from your `runners/` directory
* use the current deployment region (or a `RUNNER_REGION` env variable) in the context

You can then point your orchestrator at:

```http
POST /api/runner
Content-Type: application/json

{
  "url": "https://example.com",
  "runners": ["cookieBannerVisibleTest"],
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
  modules: ["runner/nitro"],
  routes: {
    "/**": "./src/index.ts",
  },
});
```

The `runner/nitro` module will:

* register a runner endpoint (for example `/api/runner`)
* wire in your `runners/` directory
* attach region and run metadata to the context

Your Hono app then focuses purely on your normal routes, while the runner endpoint is handled by the adapter.

---

## Programmatic usage

You can also use `runners` directly from Node without HTTP or the CLI:

```ts
import { runRunners } from "runners";
import * as runners from "./runners";

const result = await runRunners({
  url: "https://example.com",
  runners: [runners.cookieBannerVisibleTest],
  region: "eu-west-1",
  runId: "local-dev",
});

console.log(result.results);
```

---

## Types

The main public types are:

```ts
import type { Runner, RunnerContext, RunnerResult } from "runners";
```

Roughly:

```ts
type RunStatus = "pass" | "fail" | "error";

type RunnerResult = {
  name: string;
  status: RunStatus;
  details?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
};

type Runner = (ctx: RunnerContext) => Promise<RunnerResult>;
```

The exact shape may grow with more metadata, but this is the core.

---

## What this project is and is not

This project **is**:

* a small SDK for defining Playwright based runners as pure functions
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

* [x] Basic Playwright based runner ✅
* [x] CLI with `run` command and config file ✅
* [x] HTTP handler helper for API based runners ✅
* [x] Simple runner discovery in a `runners/` folder ✅
* [x] Minimal logging hooks ✅
* [ ] Examples with multi region deployment

Pull requests and early feedback are very welcome.

