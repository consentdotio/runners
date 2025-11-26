# @runners/playwright

Playwright integration for runners SDK.

## Overview

This package provides Playwright functionality for runners. It includes a `withPlaywright()` helper that enhances a `RunnerContext` with a Playwright page and URL.

## Installation

```bash
pnpm add runners
# Install Playwright browsers
pnpm exec playwright install
```

This package is available as `runners/playwright` from the main `runners` package.

## Usage

### Basic Example

```ts
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string(),
});

export const myRunner: Runner<z.infer<typeof InputSchema>> = async (ctx, input) => {
  "use runner";
  
  const { page, url, log } = await withPlaywright(ctx, input.url);
  
  log("Checking page", { url });
  
  const title = await page.title();
  
  return {
    name: "page_title_check",
    status: title.length > 0 ? "pass" : "fail",
    details: { title },
  };
};
```

### Browser Management

The `withPlaywright()` function automatically manages browser instances:

- Launches a browser on first use
- Reuses the browser across multiple runners
- Creates a new page for each runner
- Navigates to the specified URL

### Closing Browsers

Browsers are automatically closed when the process exits. To manually close:

```ts
import { closeBrowser } from "runners/playwright";

// Close browser when done
await closeBrowser();
```

## API

### `withPlaywright(ctx, url)`

Enhances a `RunnerContext` with Playwright functionality.

**Parameters:**
- `ctx: RunnerContext` - Base runner context
- `url: string` - URL to navigate to

**Returns:**
- `Promise<PlaywrightContext>` - Enhanced context with `page` and `url`

### `closeBrowser()`

Closes the browser instance and all pages.

## PlaywrightContext

```ts
type PlaywrightContext = RunnerContext & {
  page: Page;
  url: string;
};
```

The enhanced context includes:
- `page` - Playwright Page instance
- `url` - The URL that was navigated to
- All properties from `RunnerContext` (region, runId, log)

## Browser Configuration

Browsers are launched with default settings:

```ts
chromium.launch({
  headless: true,
});
```

To customize browser settings, you would need to modify the `withPlaywright` implementation or use Playwright directly.

## See Also

- [`@runners/core`](../core/README.md) - Core runner types
- [Playwright Documentation](https://playwright.dev/)

