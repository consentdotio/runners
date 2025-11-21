# Standard Schema Implementation

## What is Standard Schema?

[Standard Schema](https://github.com/standard-schema/standard-schema) is a common interface for TypeScript validation libraries (like Zod, Valibot, ArkType). It allows libraries to accept schemas from any Standard Schema-compliant library without needing custom adapters.

## Current Implementation Status

✅ **Standard Schema V1 interface is implemented** in `packages/core/src/types.ts`

The implementation includes:
- `StandardSchemaV1` interface with `~standard` property
- `StandardSchemaV1.Props` with `version`, `vendor`, `validate`, and optional `types`
- `StandardSchemaV1.Result` type (`{ value: Output } | { issues: Issue[] }`)
- `StandardSchemaV1.Issue` interface
- Helper types: `InferInput`, `InferOutput`
- Helper function: `validateStandardSchema()`

## Current Usage

Right now, your codebase uses **Zod directly**:

```ts
import { z } from "zod";
import type { Runner } from "runners";

const InputSchema = z.object({ ... });
const OutputSchema = z.object({ ... });

export const myRunner: Runner<
  z.infer<typeof InputSchema>,
  z.infer<typeof OutputSchema>
> = async (ctx, input) => {
  "use runner";
  // ...
};
```

## Benefits of Using Standard Schema

If you switch to Standard Schema, users could use **any** Standard Schema-compliant library:

```ts
// With Zod (already works)
import { z } from "zod";
const schema = z.string();

// With Valibot (would work with Standard Schema)
import { string } from "valibot";
const schema = string();

// With ArkType (would work with Standard Schema)
import { type } from "arktype";
const schema = type("string");
```

## Do You Need Standard Schema?

**You don't need it if:**
- You only want to support Zod
- Your current Zod-based API works well
- You don't need to accept schemas from other libraries

**You should use it if:**
- You want to support multiple schema libraries (Zod, Valibot, ArkType, etc.)
- You want users to choose their preferred validation library
- You're building a framework/tool that should be library-agnostic

## How to Use Standard Schema

### Option 1: Accept Standard Schema directly

```ts
import type { StandardSchemaV1 } from "runners";

function myFunction<T extends StandardSchemaV1<any, any>>(
  schema: T,
  data: unknown
): Promise<StandardSchemaV1.InferOutput<T>> {
  return validateStandardSchema(schema, data);
}
```

### Option 2: Update Runner type to accept Standard Schema

The `Runner` type already supports Standard Schema! You can use it like:

```ts
import type { Runner, StandardSchemaV1 } from "runners";
import { string } from "valibot"; // or any Standard Schema library

const InputSchema: StandardSchemaV1<unknown, string> = string();

export const myRunner: Runner<typeof InputSchema> = async (ctx, input) => {
  "use runner";
  // input is typed as string
};
```

## Libraries That Support Standard Schema

- ✅ **Zod** (v3.23+)
- ✅ **Valibot** (v1.0+)
- ✅ **ArkType** (v2.0+)
- ✅ **Yup** (via adapter)
- ✅ **io-ts** (via adapter)

See the [full list](https://github.com/standard-schema/standard-schema#compatible-libraries).

## Next Steps

1. **Keep current Zod-only approach** - Works fine if Zod is sufficient
2. **Add Standard Schema support** - Update docs/examples to show Standard Schema usage
3. **Make Standard Schema primary** - Migrate internal code to use Standard Schema

The implementation is ready - you just need to decide if you want to use it!

