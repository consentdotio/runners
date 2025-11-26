# Basic CLI Example

This example demonstrates how to use the runners CLI to execute runners locally.

## Setup

Install dependencies:

```bash
pnpm install
```

## Running Runners

### Using Command Line Arguments

```bash
pnpm test
```

This runs:
```bash
runners run --url https://consent.io --no-exit
```

### Using Configuration File

```bash
pnpm test:config
```

This runs:
```bash
runners run --config runners.config.ts --no-exit
```

## Runner Files

Runners are located in:
- `src/runners/` - Runner implementations
- `tests/` - Test files (if using test framework)

## Example Runners

The example includes:
- `cookie-banner-visible.ts` - Checks if cookie banner is visible
- `example-title-visible.ts` - Checks if page title exists

## Configuration

Create a `runners.config.ts` file to configure:

```ts
import { defineConfig } from "runners/config";

export default defineConfig({
  url: "https://example.com",
  runners: ["cookieBannerVisibleTest", "exampleTitleVisibleTest"],
});
```

## See Also

- [Main README](../../README.md) - General runners documentation
- [`@runners/cli`](../../packages/shared/cli/README.md) - CLI package documentation

