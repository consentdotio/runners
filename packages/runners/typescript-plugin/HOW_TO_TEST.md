# How to Test if the TypeScript Plugin is Working

## Important Note

**TypeScript Language Service Plugins only work in IDEs** (VS Code, WebStorm, etc.), not with `tsc --noEmit`. The plugin hooks into the TypeScript Language Service that IDEs use for IntelliSense, error checking, and hover information.

## Quick Test

1. **Open VS Code** in the `examples/hono` directory
2. **Open** `runners/cookie-banner-visible.ts`
3. **Look at line 23** - it has a typo: `"use runer"` instead of `"use runner"`

### If the plugin is working, you should see:

✅ **Red squiggly line** under `"use runer"`  
✅ **Error message**: `'use runer' looks like a typo. Did you mean 'use runner'?`  
✅ **Quick fix** (lightbulb icon) to correct it  
✅ **Hover documentation** when hovering over `"use runner"` in other files

### If you don't see errors:

1. **Make sure the plugin is built**:
   ```bash
   cd packages/typescript-plugin
   pnpm build
   ```

2. **Restart TypeScript Server in VS Code**:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "TypeScript: Restart TS Server"
   - Press Enter

3. **Check VS Code is using workspace TypeScript**:
   - Open any `.ts` file
   - Click the TypeScript version in the bottom-right corner
   - Select "Use Workspace Version"

4. **Verify plugin is loaded**:
   - Command Palette → "TypeScript: Open TS Server Log"
   - Look for: `@runners/typescript-plugin: Initializing plugin`

## Test Cases

### 1. Typo Detection (Error 9008)
```ts
export const myRunner = async (ctx) => {
  "use runer"; // ← Should show error
};
```

### 2. Async Validation (Error 9001)
```ts
export const badRunner = (ctx) => { // ← Not async
  "use runner"; // ← Should show error
};
```

### 3. Hover Documentation
Hover over `"use runner"` in a valid runner function - should show documentation.

## Configuration

Your `tsconfig.json` should have:
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@runners/typescript-plugin"
      }
    ]
  },
  "include": ["src/**/*", "runners/**/*"]
}
```

## Troubleshooting

- **No errors?** The plugin might not be loaded. Check TS Server logs.
- **Plugin not found?** Make sure `@runners/typescript-plugin` is in `devDependencies`
- **Still not working?** Try restarting VS Code completely

