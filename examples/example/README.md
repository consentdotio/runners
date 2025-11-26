# Example Runners

This directory contains example runner implementations that demonstrate how to write runners.

## Runner Files

All runners are in the `runners/` directory:

- `cookie-banner-visible.ts` - Checks if a cookie banner is visible on a page
- `example-title-visible.ts` - Checks if a page title exists
- `test-from-runners-dir.ts` - Example runner demonstrating basic functionality

## Writing Runners

Runners are async functions that:

1. Have a `"use runner"` directive (module-level or function-level)
2. Accept a `RunnerContext` and input parameters
3. Return a `RunnerResult`

### Example

```ts
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string(),
});

export const myRunner: Runner<z.infer<typeof InputSchema>> = async (ctx, input) => {
  "use runner";
  
  const { page, log } = await withPlaywright(ctx, input.url);
  
  log("Checking page", { url: input.url });
  
  const title = await page.title();
  
  return {
    name: "page_title_check",
    status: title.length > 0 ? "pass" : "fail",
    details: { title },
  };
};
```

## Running Runners

These runners can be executed using:

- The CLI: `runners run myRunner --url https://example.com`
- HTTP API: `POST /api/runner/execute`
- Programmatically: `runRunners({ runners: [myRunner] })`

## See Also

- [Main README](../../README.md) - General runners documentation
- [`@runners/core`](../../packages/runners/core/README.md) - Core runner types
- [`@runners/playwright`](../../packages/runners/playwright/README.md) - Playwright integration

