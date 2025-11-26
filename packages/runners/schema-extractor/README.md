# Schema Extractor

A build-time tool for extracting runner and schema metadata from TypeScript files. Uses tree-sitter for robust AST parsing to identify exported async runner functions and their associated schemas.

## Overview

The schema extractor scans TypeScript files and extracts metadata about:
- **Runners**: Exported async functions that serve as runners
- **Schemas**: Exported schema variables (typically Zod schemas) associated with runners

This metadata is used at build time to enable schema discovery and validation in the runners framework.

## Features

- ✅ **Robust AST Parsing**: Uses tree-sitter-typescript for accurate parsing
- ✅ **Multi-line Support**: Handles complex TypeScript syntax including generics, decorators, and multi-line declarations
- ✅ **Pattern Matching**: Supports glob patterns for flexible file discovery
- ✅ **Cross-platform**: Works on Windows, macOS, and Linux
- ✅ **Fast**: Written in Rust for optimal performance

## Requirements

- **Rust**: The tool is written in Rust and requires Rust/Cargo to build
  - Install from [rustup.rs](https://rustup.rs)

## Installation

### Building from Source

```bash
# Clone the repository and navigate to the schema-extractor directory
cd packages/runners/schema-extractor

# Build the release binary
npm run build
# or
node build.js

# The binary will be available at: target/release/schema-extractor
```

### Using as a Dependency

The schema extractor is typically used as a build-time dependency in other packages. The binary is located at:

```
node_modules/@runners/schema-extractor/target/release/schema-extractor
```

## Usage

### Basic Usage

```bash
schema-extractor --patterns "runners/**/*.ts" --output runner-schemas.json
```

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--patterns` | `-p` | `src/**/*.ts,runners/**/*.ts` | Comma-separated glob patterns to match runner files |
| `--output` | `-o` | `runner-schemas.json` | Output file path for metadata JSON |
| `--cwd` | `-c` | `.` | Working directory for resolving relative paths |

### Examples

#### Extract from specific directories

```bash
schema-extractor \
  --patterns "src/runners/**/*.ts,tests/**/*.ts" \
  --output dist/metadata.json \
  --cwd /path/to/project
```

#### Multiple patterns

```bash
schema-extractor \
  --patterns "runners/**/*.ts,lib/**/*.ts,src/**/*.ts"
```

## Output Format

The tool generates a JSON file containing an array of metadata objects, one per file:

```json
[
  {
    "file": "runners/example.ts",
    "runners": [
      {
        "name": "exampleRunner",
        "line": 15
      }
    ],
    "schemas": [
      {
        "name": "ExampleInputSchema",
        "runner_name": "exampleRunner",
        "line": 20
      }
    ]
  }
]
```

### Schema

- **`file`**: Relative path to the source file (normalized with forward slashes)
- **`runners`**: Array of runner information
  - **`name`**: Function name
  - **`line`**: Line number where the runner is defined
- **`schemas`**: Array of schema information
  - **`name`**: Schema variable name
  - **`runner_name`**: Associated runner name (if matched)
  - **`line`**: Line number where the schema is defined

## How It Works

1. **File Discovery**: Scans files matching the provided glob patterns
2. **Filtering**: Only processes files containing the `"use runner"` directive
3. **AST Parsing**: Uses tree-sitter to parse TypeScript files into an AST
4. **Extraction**: Identifies:
   - Exported async function declarations (`export async function name()`)
   - Exported const/let declarations with async arrow functions (`export const name = async () => {}`)
   - Exported schema variables containing "Schema" in their name
5. **Matching**: Attempts to match schemas with runners based on naming conventions
6. **Output**: Generates JSON metadata file

### What Gets Extracted

#### Runners

The tool identifies exported async functions:

```typescript
"use runner"

// ✅ Function declaration
export async function myRunner(input: string) {
  // ...
}

// ✅ Arrow function
export const anotherRunner = async (input: number) => {
  // ...
}

// ✅ Let declaration
export let yetAnotherRunner = async () => {
  // ...
}
```

#### Schemas

The tool identifies exported schema variables:

```typescript
"use runner"

// ✅ Matched with runner name
export const MyRunnerInputSchema = z.object({ ... });

// ✅ Generic schema
export const InputSchema = z.object({ ... });
```

### File Filtering

The tool automatically skips:
- `node_modules/` directories
- `dist/` directories
- `.nitro/` directories

## Integration

The schema extractor is typically integrated into build processes. For example, in Nitro:

```typescript
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const extractorPath = join(
  process.cwd(),
  'node_modules/@runners/schema-extractor/target/release/schema-extractor'
);

if (existsSync(extractorPath)) {
  execSync(
    `${extractorPath} --patterns "runners/**/*.ts" --output "schemas.json"`,
    { stdio: 'inherit' }
  );
}
```

## Troubleshooting

### Binary Not Found

If the binary is not found, ensure:
1. The build completed successfully (`npm run build`)
2. The binary exists at `target/release/schema-extractor`
3. On Windows, check for `target/release/schema-extractor.exe`

### No Files Processed

If no files are processed:
1. Verify files contain the `"use runner"` directive
2. Check that glob patterns match your file structure
3. Ensure files are not in excluded directories (`node_modules`, `dist`, `.nitro`)

### Parsing Errors

The tool uses tree-sitter for robust parsing. If you encounter issues:
1. Ensure valid TypeScript syntax
2. Check for syntax errors in source files
3. The tool will skip files it cannot parse and log warnings

## Development

### Project Structure

```
src/
  ├── main.rs      # Entry point and orchestration
  ├── cli.rs       # CLI argument parsing
  ├── ast.rs       # AST parsing logic
  ├── file.rs      # File processing
  └── types.rs     # Data structures
```

### Building

```bash
# Debug build
cargo build

# Release build
cargo build --release

# Using npm script
npm run build
```

### Testing

```bash
# Run tests
cargo test

# Test with sample files
./target/release/schema-extractor \
  --patterns "examples/**/*.ts" \
  --output test-output.json
```

## License

MIT

