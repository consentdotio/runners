# HTTP API Example

This example demonstrates how to use the `@runners/http` package to expose a runner as an HTTP endpoint.

## Setup

```bash
cd examples/http-api
pnpm install
```

## Running the Server

Start the HTTP server:

```bash
pnpm start
```

The server will start on `http://localhost:3000` (or the port specified by `PORT` environment variable).

**Note:** This example uses `tsx` to run TypeScript files directly. The `"use runner"` directives in test files are present but **not transformed** - they work perfectly fine as-is! Directives are optional markers for documentation and tooling.

## Testing

In another terminal, run the test client:

```bash
pnpm test https://example.com
```

Or use curl:

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tests": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
    "runId": "my-test-run"
  }'
```

## About the Directives

**Yes, the test files contain `"use runner"` directives:**

```ts
export const exampleTitleVisibleTest: RunnerTest = async (ctx) => {
  'use runner';  // ✅ Directive is present in the code
  
  const { page, url, log } = ctx;
  // ... test code
};
```

**Key points:**
- ✅ Directives are present in the TypeScript source files
- ✅ They work perfectly fine without transformation
- ✅ They're optional - just documentation/tooling markers
- ✅ The runner executes tests correctly whether directives are transformed or not

**What the directives do:**
1. **Documentation** - Marks functions that run in the runner harness
2. **Tooling** - Can be used by linters/IDEs for context awareness
3. **Convention** - Follows the pattern from the README examples

**Transformation is optional:** If you want to see directive transformation in action, check out the `swc-plugin` example. For this HTTP API example, directives work fine as-is!

## Request Format

```json
{
  "url": "https://example.com",
  "tests": ["exampleTitleVisibleTest"],
  "runId": "optional-run-id",
  "region": "optional-region-override"
}
```

## Response Format

```json
{
  "url": "https://example.com",
  "region": "us-east-1",
  "runId": "optional-run-id",
  "results": [
    {
      "name": "example_title_visible",
      "status": "pass",
      "details": { "title": "Example Domain" },
      "durationMs": 1234
    }
  ]
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `RUNNER_REGION` - Default region for tests (default: us-east-1)
