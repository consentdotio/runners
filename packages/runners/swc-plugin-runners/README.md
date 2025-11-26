# @runners/swc-plugin

SWC transform plugin to transform the `"use runner"` directive for the Runners SDK.

## Development

[Install Rust](https://www.rust-lang.org/tools/install)

Add build target using rustup

```bash
rustup target add wasm32-unknown-unknown
```

Ensure you can test/build

```bash
cargo test
cargo check
cargo build --target wasm32-unknown-unknown
# Or use the alias:
cargo build-wasm32
```

Build the WASM plugin

```bash
pnpm build
```

## Usage

The plugin removes `"use runner"` directives from your code and validates that functions with the directive are async.

### Function-level directive

```ts
export async function myTest(ctx) {
  "use runner";
  // test code
}
```

Becomes:

```ts
export async function myTest(ctx) {
  // test code
}
```

### Module-level directive

```ts
"use runner";

export async function test1(ctx) { /* ... */ }
export async function test2(ctx) { /* ... */ }
```

Becomes:

```ts
export async function test1(ctx) { /* ... */ }
export async function test2(ctx) { /* ... */ }
```

## Features

- ✅ **Directive Removal**: Removes `"use runner"` directives (module and function level)
- ✅ **Async Validation**: Ensures runner functions are async
- ✅ **Typo Detection**: Detects common typos like `"use runer"` → suggests `"use runner"`
- ✅ **Misplaced Directive Detection**: Warns if directive is not at the top of file/function
- ✅ **Filename Extraction**: Extracts and normalizes filenames for better error messages
- ✅ **Arrow Function Support**: Handles arrow functions with directives
- ✅ **Test Suite**: Comprehensive test fixtures and error cases

## Configuration

The plugin accepts an empty config object (for future extensibility):

```json
{}
```

## Error Detection

The plugin detects and reports:

1. **Non-async functions**: Functions with `"use runner"` must be async
2. **Misplaced directives**: Directives must be at the top of file/function
3. **Misspelled directives**: Common typos are detected and suggested

## Testing

Run tests with:

```bash
cargo test
```

Test fixtures are in `tests/fixture/` and error cases in `tests/errors/`.

### Updating stderr files

The SWC testing framework automatically compares stderr output. To update the expected stderr files when error messages change, use:

```bash
UPDATE=1 cargo test --test errors
```

Or use the convenience script:

```bash
pnpm test:update-stderr
```

This will automatically update all `output.stderr` files to match the actual test output.
