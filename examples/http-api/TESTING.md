# Testing the HTTP API Example

## Quick Start

### 1. Install Dependencies

```bash
cd examples/http-api
pnpm install
```

**Note:** 
- The example uses `@runners/http` package, which is automatically installed as a workspace dependency
- Uses `tsx` to run TypeScript files directly (no compilation needed)

### 2. Start the Server

In one terminal:

```bash
pnpm start
```

You should see:
```text
Runners HTTP API server running on http://localhost:3000
Region: us-east-1
Available tests: exampleTitleVisibleTest, cookieBannerVisibleTest

Example request:
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tests": ["exampleTitleVisibleTest"]}'
```

### 3. Test the API

#### Option A: Using the Test Client Script

In another terminal:

```bash
cd examples/http-api
pnpm test https://example.com
```

This will:
- Send a POST request with both tests
- Display the response
- Exit with code 0 if all tests pass, 1 if any fail

#### Option B: Using curl

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tests": ["exampleTitleVisibleTest", "cookieBannerVisibleTest"],
    "runId": "my-test-run"
  }'
```

#### Option C: Using a Custom URL

```bash
# Test against a different URL
pnpm test https://consent.io

# Or with curl
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://consent.io",
    "tests": ["exampleTitleVisibleTest"]
  }'
```

## Expected Response

A successful response looks like:

```json
{
  "url": "https://example.com",
  "region": "us-east-1",
  "runId": "test-1234567890",
  "results": [
    {
      "name": "example_title_visible",
      "status": "pass",
      "details": { "title": "Example Domain" },
      "durationMs": 1234
    },
    {
      "name": "cookie_banner_visible",
      "status": "pass",
      "details": { "visible": true },
      "durationMs": 567
    }
  ]
}
```

## Error Cases

### Invalid Request (Missing URL)

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"tests": ["exampleTitleVisibleTest"]}'
```

Response: `400 Bad Request` with error message

### Invalid Request (Empty Tests)

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tests": []}'
```

Response: `400 Bad Request` with error message

### Invalid Request (Unknown Test)

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "tests": ["unknownTest"]}'
```

Response: `400 Bad Request` with list of missing tests

### Wrong HTTP Method

```bash
curl -X GET http://localhost:3000
```

Response: `405 Method Not Allowed`

## Environment Variables

You can customize the server:

```bash
# Change port
PORT=8080 pnpm start

# Change default region
RUNNER_REGION=eu-west-1 pnpm start

# Both
PORT=8080 RUNNER_REGION=eu-west-1 pnpm start
```

Then test with:

```bash
API_URL=http://localhost:8080 pnpm test https://example.com
```

## Testing Different Scenarios

### Test Single Test

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tests": ["exampleTitleVisibleTest"]
  }'
```

### Test with Custom Run ID

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tests": ["exampleTitleVisibleTest"],
    "runId": "custom-run-123"
  }'
```

### Test with Region Override

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "tests": ["exampleTitleVisibleTest"],
    "region": "eu-west-1"
  }'
```

## Troubleshooting

### Server won't start

- Make sure dependencies are installed: `pnpm install`
- Check if port 3000 is already in use
- Verify the `runners` package is built: `cd ../../packages/core && pnpm build`

### Tests fail to load

- Ensure test files are in `tests/` directory
- Check that `tests/index.ts` exports all tests
- Verify test files use `.js` extension in imports (ESM)

### Connection refused

- Make sure the server is running
- Check the port matches (default 3000)
- Verify firewall isn't blocking the connection

