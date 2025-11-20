# @runners/cli

Command-line interface for runners.

## Structure

This CLI follows a structured pattern:

- `src/index.ts` - Main entry point
- `src/commands/` - Command implementations (one subdirectory per command)
- `src/context/` - CLI context creation and utilities
- `src/utils/` - Shared utilities
- `src/components/` - Reusable UI components
- `src/actions/` - Action handlers

## Adding a Command

1. Create a new directory in `src/commands/{command-name}/`
2. Create `index.ts` with your command implementation
3. Export a function that takes `CliContext` as parameter
4. Add the command to the `commands` array in `src/index.ts`

Example:

```ts
// src/commands/run/index.ts
import type { CliContext } from '~/context/types';

export async function run(context: CliContext): Promise<void> {
  const { logger } = context;
  logger.info('Running...');
  // Your command logic here
}
```

Then in `src/index.ts`:

```ts
import { run } from './commands/run';

const commands: CliCommand[] = [
  {
    name: 'run',
    label: 'Run',
    hint: 'Run tests',
    description: 'Run tests against a URL',
    action: (context) => run(context),
  },
];
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm check-types

# Test
pnpm test
```
