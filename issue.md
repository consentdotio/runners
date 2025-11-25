# ZodToJsonSchemaConverter fails with Zod v4 schemas when using default import

## Environment

- `@orpc/openapi@1.11.3`
- `@orpc/zod@1.11.3`
- `zod@4.1.12`
- Node.js 22.19.0

## Reproduction

When using `zod` v4, the default `ZodToJsonSchemaConverter` imported from `@orpc/zod` fails to recognize schemas, causing OpenAPI generation to fail.

**Minimal reproduction:**

```typescript
import { z } from 'zod'; // v4.1.12
import { oc } from '@orpc/contract';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod'; // v3 converter

const base = oc.$route({ inputStructure: "compact" });

const getRunStatus = base
  .route({
    method: "GET",
    path: "/orchestrator/{runId}/status",
  })
  .input(z.object({ runId: z.string().min(1) }))
  .output(z.object({ runId: z.string() }));

const orchestratorContract = { getStatus: getRunStatus };

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

// This throws an error
const spec = await generator.generate(orchestratorContract, {
  info: { title: "Test", version: "1.0.0" },
});
```

**Root cause:**
The default `ZodToJsonSchemaConverter` from `@orpc/zod` targets Zod v3 and has this condition check:
```typescript
condition(schema) {
  return schema !== undefined && schema["~standard"].vendor === "zod" && !("_zod" in schema);
}
```

Since Zod v4 schemas include a `_zod` property, the v3 converter rejects them. When the converter is forced to process a v4 schema, it falls back to `{ not: {} }`, which causes the OpenAPI generator to fail validation.

## Describe the bug

When using `zod` v4, importing `ZodToJsonSchemaConverter` from `@orpc/zod` (the default export) fails to properly convert Zod schemas. The converter's `condition()` method explicitly checks for the **absence** of the `_zod` property, which is present in Zod v4 schemas.

This results in:
1. The converter either rejecting the schema or producing an invalid fallback schema (`{ "not": {} }`)
2. `OpenAPIGenerator` throwing errors like: "When input structure is 'compact', and path has dynamic params, input schema must be an object with all dynamic params as required."

The issue affects any route with path parameters when using Zod v4 schemas with the default converter.

## Additional context

**Workaround:**
Import the Zod v4 compatible converter explicitly:

```typescript
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
```

This converter correctly handles Zod v4 schemas by checking for the **presence** of `_zod`:

```typescript
condition(schema) {
  return schema !== undefined && schema["~standard"].vendor === "zod" && "_zod" in schema;
}
```

**Expected behavior:**
The default `ZodToJsonSchemaConverter` should either:
1. Auto-detect the Zod version and use the appropriate converter, or
2. Include both converters and let `OpenAPIGenerator` select the correct one via the `condition()` method

**Affected files in my codebase:**
- `packages/orchestrator/orchestrator/src/api/handler.ts`
- `packages/runners/http/src/handler.ts`

## Logs

```
OpenAPIGeneratorError: Some error occurred during OpenAPI generation:

[OpenAPIGenerator] Error occurred while generating OpenAPI for procedure at path: getStatus
When input structure is "compact", and path has dynamic params, input schema must be an object with all dynamic params as required.

[OpenAPIGenerator] Error occurred while generating OpenAPI for procedure at path: getResults
When input structure is "compact", and path has dynamic params, input schema must be an object with all dynamic params as required.
```
