# @runners/typescript-plugin

A TypeScript Language Service Plugin that adds IDE IntelliSense for the [Runners SDK](https://github.com/your-org/runners).

## Features

- **Typo Detection**: Detects common typos in the `"use runner"` directive and suggests corrections
- **Async Validation**: Ensures runner functions are async or return a Promise
- **Hover Documentation**: Provides helpful documentation when hovering over the `"use runner"` directive
- **Quick Fixes**: Offers code fixes for directive typos

## Installation

```bash
npm install --save-dev @runners/typescript-plugin
# or
pnpm add -D @runners/typescript-plugin
# or
yarn add -D @runners/typescript-plugin
```

## Configuration

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@runners/typescript-plugin"
      }
    ]
  }
}
```

### Configuration Options

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@runners/typescript-plugin",
        "enableDiagnostics": true
      }
    ]
  }
}
```

- `enableDiagnostics` (default: `true`): Enable diagnostic checks for runner functions

## Usage

Once configured, the plugin will automatically:

1. **Validate runner functions**: Check that functions with `"use runner"` are async
2. **Detect typos**: Suggest fixes for common typos like `"use runer"` → `"use runner"`
3. **Provide documentation**: Show helpful information when hovering over the directive

Example:

```ts
import type { Runner } from "runners";

export const myRunner: Runner = async (ctx) => {
  "use runner"; // ← Hover here for documentation

  const { page, url, log } = ctx;
  // ... runner implementation
};
```

## Requirements

- TypeScript >= 5.0.0
- Node.js >= 18.0.0
