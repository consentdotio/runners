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

## Configuration

The plugin accepts an empty config object (for future extensibility):

```json
{}
```

