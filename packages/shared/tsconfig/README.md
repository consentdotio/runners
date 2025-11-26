# @runners/tsconfig

Shared TypeScript configuration for runners packages.

## Overview

This package provides a shared base TypeScript configuration that all runners packages extend.

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@runners/tsconfig/base.json"
}
```

## Configuration

The base configuration includes:

- Strict type checking
- ES2022 target
- Module resolution settings
- Path mappings
- Common compiler options

## See Also

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

