# Verifying the TypeScript Plugin is Working

TypeScript Language Service Plugins **only work in IDEs** (like VS Code, WebStorm, etc.), not with `tsc --noEmit`. The plugin hooks into the TypeScript Language Service that IDEs use.

## How to Verify It's Working

### 1. In VS Code (or your IDE)

1. **Open the runner file** with a typo:
   ```ts
   export const myRunner = async (ctx) => {
     "use runer"; // ← Typo here
     // ...
   };
   ```

2. **Check for errors**: You should see:
   - A red squiggly line under `"use runer"`
   - Error message: `'use runer' looks like a typo. Did you mean 'use runner'?`
   - Quick fix option to correct it

3. **Hover over `"use runner"`**: You should see documentation explaining what the directive does

4. **Try a non-async function**:
   ```ts
   export const badRunner = (ctx) => { // ← Not async
     "use runner";
     // ...
   };
   ```
   You should see: `Runner functions must be async or return a Promise`

### 2. Check Plugin is Loaded

The plugin logs to the TypeScript Language Service. In VS Code:
1. Open Command Palette (Cmd+Shift+P)
2. Run "TypeScript: Open TS Server Log"
3. Look for: `@runners/typescript-plugin: Initializing plugin`

### 3. Verify Configuration

Make sure your `tsconfig.json` has:
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

### 4. Test File

The file `examples/hono/runners/cookie-banner-visible.ts` has a typo on line 23:
- Current: `"use runer"`
- Should be: `"use runner"`

If the plugin is working, VS Code should show an error and offer a quick fix.

## Troubleshooting

- **No errors showing?** Make sure the plugin is built: `pnpm --filter @runners/typescript-plugin build`
- **Plugin not loading?** Check VS Code is using the workspace TypeScript version
- **Still not working?** Restart VS Code's TypeScript server: Command Palette → "TypeScript: Restart TS Server"

