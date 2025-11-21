# Using Standard Schema with Runners

The Runners SDK now supports [Standard Schema](https://github.com/standard-schema/standard-schema), allowing you to use schemas from any Standard Schema-compliant library (Zod, Valibot, ArkType, etc.).

## Current Support

✅ **Zod** - Already works (Zod implements Standard Schema)  
✅ **Valibot** - Works with Standard Schema  
✅ **ArkType** - Works with Standard Schema  
✅ **Any Standard Schema-compliant library**

## Usage Examples

### With Zod (Current Way - Still Works)

```ts
import { z } from "zod";
import type { Runner } from "runners";

const InputSchema = z.object({
  selectors: z.array(z.string()).optional(),
  timeout: z.number().optional(),
});

const OutputSchema = z.object({
  visible: z.boolean(),
  selector: z.string().optional(),
});

export const myRunner: Runner<
  z.infer<typeof InputSchema>,
  z.infer<typeof OutputSchema>
> = async (ctx, input) => {
  "use runner";
  // input is typed correctly
  return { name: "test", status: "pass", details: { visible: true } };
};
```

### With Valibot (Standard Schema)

```ts
import { string, object, type InferInput, type InferOutput } from "valibot";
import type { Runner, StandardSchemaV1 } from "runners";

const InputSchema = object({
  selectors: string(),
});

const OutputSchema = object({
  visible: string(),
});

// Valibot schemas implement Standard Schema automatically
export const myRunner: Runner<
  typeof InputSchema,
  typeof OutputSchema
> = async (ctx, input) => {
  "use runner";
  // input is typed as InferInput<typeof InputSchema>
  return { name: "test", status: "pass", details: { visible: "yes" } };
};
```

### With ArkType (Standard Schema)

```ts
import { type } from "arktype";
import type { Runner } from "runners";

const InputSchema = type({
  selectors: "string[]",
});

const OutputSchema = type({
  visible: "boolean",
});

export const myRunner: Runner<
  typeof InputSchema,
  typeof OutputSchema
> = async (ctx, input) => {
  "use runner";
  // input is typed correctly
  return { name: "test", status: "pass", details: { visible: true } };
};
```

## Validating Standard Schema Schemas

If you need to validate input/output using Standard Schema directly:

```ts
import { validateStandardSchema } from "runners";
import { string } from "valibot";

const schema = string();

try {
  const result = await validateStandardSchema(schema, "hello");
  // result is typed as string
} catch (error) {
  // Handle validation error
  console.error(error);
}
```

## Type Inference

The `Runner` type automatically infers types from Standard Schema:

```ts
import type { Runner, StandardSchemaV1 } from "runners";

// Input type is inferred from Standard Schema
type InputType = StandardSchemaV1.InferInput<typeof MySchema>;

// Output type is inferred from Standard Schema  
type OutputType = StandardSchemaV1.InferOutput<typeof MySchema>;
```

## Benefits

1. **Library Choice** - Use Zod, Valibot, ArkType, or any Standard Schema library
2. **Type Safety** - Full TypeScript inference from Standard Schema schemas
3. **Interoperability** - Mix and match schema libraries if needed
4. **Future-Proof** - Works with any Standard Schema-compliant library

## Migration Guide

If you're currently using Zod, **no changes needed** - Zod implements Standard Schema, so everything continues to work.

To switch to another library:

1. Install the Standard Schema-compliant library
2. Replace Zod schemas with the new library's schemas
3. Update type annotations if needed (the `Runner` type handles Standard Schema automatically)

## See Also

- [Standard Schema Specification](https://github.com/standard-schema/standard-schema)
- [Compatible Libraries](https://github.com/standard-schema/standard-schema#compatible-libraries)

