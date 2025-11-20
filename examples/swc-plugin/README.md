# SWC Plugin Example

This example demonstrates how to use the `@runners/swc-plugin` to transform `"use runner"` directives in your test files.

## What the Plugin Does

The SWC plugin:
- Removes `"use runner"` directives from your code
- Validates that functions with the directive are async
- Supports both module-level and function-level directives

## Setup

```bash
cd examples/swc-plugin
pnpm install
```

## Building

Build the TypeScript files with the SWC plugin:

```bash
pnpm build
```

This will transform the source files in `src/` and output to `dist/`, removing all `"use runner"` directives.

## Example Files

### Function-level directive

```ts
// src/tests/example-title-visible.ts
export const exampleTitleVisibleTest: RunnerTest = async (ctx) => {
  'use runner'; // This will be removed by the plugin
  // ... test code
};
```

After transformation:

```ts
// dist/tests/example-title-visible.js
export const exampleTitleVisibleTest = async (ctx) => {
  // ... test code (directive removed)
};
```

### Module-level directive

```ts
// src/tests/module-level-directive.ts
'use runner'; // Applies to all exports in this file

export const testOne: RunnerTest = async (ctx) => { /* ... */ };
export const testTwo: RunnerTest = async (ctx) => { /* ... */ };
```

After transformation:

```ts
// dist/tests/module-level-directive.js
export const testOne = async (ctx) => { /* ... */ };
export const testTwo = async (ctx) => { /* ... */ };
```

## Configuration

The plugin is configured in `.swcrc`:

```json
{
  "jsc": {
    "experimental": {
      "plugins": [
        ["@runners/swc-plugin", {}]
      ]
    }
  }
}
```

## Validation

The plugin will emit compilation errors for:
- Non-async functions with `"use runner"` directive
- Misplaced directives (not at the top of function/module)

See `src/tests/invalid-non-async.ts` for an example that will fail compilation.

