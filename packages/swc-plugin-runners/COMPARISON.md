# Comparison: Our Plugin vs Workflow Plugin

## Key Architectural Differences

### Workflow Plugin Structure
- **Separate transform crate**: Uses a `transform/` subdirectory with its own Cargo.toml
  - Main plugin (`src/lib.rs`) is thin wrapper
  - Core logic in `transform/src/lib.rs` (4500+ lines)
  - Allows testing transform logic independently
- **Workspace dependencies**: Uses workspace-level Cargo.toml for dependency management
- **Complex transformation**: Multiple modes (step, workflow, client) with different behaviors
- **Extensive test suite**: Snapshot tests for fixtures and error cases

### Our Plugin Structure
- **Single crate**: All logic in `src/lib.rs` (~170 lines)
  - Simpler, more straightforward
  - Easier to understand and maintain
- **Direct dependencies**: Explicit version pins (serde = "=1.0.219")
- **Simple transformation**: Single mode - just removes directives and validates
- **No test suite yet**: Would benefit from adding tests

## Detailed Differences

### 1. Cargo.toml

**Workflow:**
```toml
[dependencies]
serde        = { workspace = true }  # Uses workspace version
serde_json   = { workspace = true }
swc_core     = { workspace = true, features = ["ecma_plugin_transform"] }
swc_workflow = { path = "./transform" }  # Separate transform crate
```

**Ours:**
```toml
[dependencies]
serde = "=1.0.219"  # Pinned version
serde_json = "1"
swc_core = { version = "26", features = ["ecma_plugin_transform"] }
# No separate transform crate
```

### 2. Build Configuration

**Workflow:**
- Uses `.cargo/config.toml` with build aliases (`build-wasm32`)
- Build script uses `cargo build-wasm32` alias
- More sophisticated error handling with debug output

**Ours:**
- No `.cargo/config.toml` (could add for consistency)
- Build script uses direct `cargo build --target wasm32-unknown-unknown`
- Simpler error handling

### 3. Plugin Entry Point

**Workflow:**
```rust
// Extracts filename and makes it relative
let filename = metadata.get_context(...);
let cwd = metadata.get_context(...);
let relative_filename = /* complex path resolution */;
let normalized_filename = relative_filename.replace('\\', "/");

// Uses config with mode
let plugin_config: WasmConfig = serde_json::from_str(...);
let mut visitor = StepTransform::new(plugin_config.mode, normalized_filename);
```

**Ours:**
```rust
// No filename extraction (not needed for our use case)
// No config parsing (empty config struct)
let mut visitor = RunnerTransform::new();
```

### 4. Transformation Complexity

**Workflow:**
- Multiple transform modes (Step, Workflow, Client)
- Registers functions, replaces bodies, adds metadata
- Handles complex cases: object properties, nested functions, exports
- ~4500 lines of transformation logic

**Ours:**
- Single mode: directive removal + validation
- Simple visitor pattern
- Handles: module-level and function-level directives
- ~170 lines of transformation logic

### 5. Error Handling

**Workflow:**
- Comprehensive error types
- Typo detection for directives
- Multiple validation checks
- Detailed error messages

**Ours:**
- Basic error types (some unused)
- Async function validation
- Simpler error messages
- Some error variants defined but not used

### 6. Testing

**Workflow:**
- Extensive test suite with fixtures
- Snapshot testing for transformations
- Error case testing
- Tests in `transform/tests/`

**Ours:**
- No tests yet
- Would benefit from adding fixture tests

## What We Could Improve

1. **Add `.cargo/config.toml`** for build aliases
2. **Add test suite** with fixture tests
3. **Remove unused error variants** or implement them
4. **Consider extracting transform logic** if it grows complex
5. **Add filename extraction** if needed for future features
6. **Update peer dependency** to match workflow's exact version requirement

## What We Did Well

1. **Simpler architecture** - easier to understand and maintain
2. **Direct approach** - no unnecessary abstraction
3. **Working implementation** - builds and functions correctly
4. **Clean code** - straightforward visitor pattern

## Recommendations

### Short Term
- Add `.cargo/config.toml` for consistency
- Remove or implement unused error variants
- Add basic test fixtures

### Long Term
- Consider adding test suite if plugin grows
- Extract transform logic to separate module if complexity increases
- Add filename extraction if needed for future features

