Creating a Nitro module that auto-discovers orchestrator workflows and exposes them as API endpoints, similar to `@runners/nitro`. Example:


[1 tool called]


Example of a Nitro module that auto-discovers orchestrator workflows and exposes them as API endpoints:

## 1. Orchestrator Workflow Files (No Directive Needed)

```typescript
// workflows/orchestrate-runners.ts
import type { RunnerJob } from '@runners/orchestrator';
import {
  executeRunnerStep,
  findAvailableServersStep,
  selectBestServerStep,
  aggregateResults,
  type ServerRegistry,
  type LoadBalancer,
} from '@runners/orchestrator';
import { start } from 'workflow/api';

/**
 * Main orchestrator workflow - automatically discovered by Nitro module
 * No directive needed - just export async functions that match the pattern
 */
export async function orchestrateRunners(
  jobs: RunnerJob[],
  options?: {
    registry?: ServerRegistry;
    loadBalancer?: LoadBalancer;
    region?: string;
    maxConcurrency?: number;
  }
) {
  'use workflow'; // Workflow directive, not orchestrator directive

  const {
    registry = getDefaultRegistry(),
    loadBalancer = getDefaultLoadBalancer(),
    region,
    maxConcurrency = 10,
  } = options || {};

  console.log(`Orchestrating ${jobs.length} runner jobs`);

  // Find available servers (durable step)
  const servers = await findAvailableServersStep(registry, region);

  if (servers.length === 0) {
    throw new Error(`No runner servers available${region ? ` for region ${region}` : ''}`);
  }

  // Execute jobs with concurrency control
  const jobBatches = chunkArray(jobs, maxConcurrency);
  const allResults: PromiseSettledResult<any>[] = [];

  for (const batch of jobBatches) {
    const batchResults = await Promise.allSettled(
      batch.map(async (job) => {
        const server = await selectBestServerStep(servers, loadBalancer, job.region || region);
        const result = await executeRunnerStep(server, job);
        return { job, server: server.id, result };
      })
    );
    allResults.push(...batchResults);
  }

  return aggregateResults(allResults, jobs);
}

/**
 * Execute a single runner job
 */
export async function executeSingleRunner(job: RunnerJob) {
  'use workflow';

  const registry = getDefaultRegistry();
  const loadBalancer = getDefaultLoadBalancer();

  const servers = await findAvailableServersStep(registry, job.region);
  if (servers.length === 0) {
    throw new Error(`No runner servers available for region ${job.region || 'default'}`);
  }

  const server = await selectBestServerStep(servers, loadBalancer, job.region);
  const result = await executeRunnerStep(server, job);

  return {
    job,
    server: server.id,
    result,
  };
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function getDefaultRegistry(): ServerRegistry {
  // Would be injected by Nitro module
  throw new Error('Registry must be configured');
}

function getDefaultLoadBalancer(): LoadBalancer {
  // Would be injected by Nitro module
  throw new Error('Load balancer must be configured');
}
```

## 2. Nitro Module for Orchestrators

```typescript
// packages/orchestrator-nitro/src/index.ts
import type { Nitro, NitroModule } from "nitro/types";
import { join } from "pathe";
import { OrchestratorBuilder } from "./builders";
import type { ModuleOptions } from "./types";

export type { ModuleOptions } from "./types";

export default {
  name: "runners/orchestrator-nitro",
  async setup(nitro: Nitro) {
    const options = (nitro.options as ModuleOptions).orchestrator || {};
    
    // Default patterns: scan workflows/ directory
    let patterns: string[];
    if (options.pattern) {
      patterns = Array.isArray(options.pattern)
        ? options.pattern
        : [options.pattern];
    } else {
      patterns = ["workflows/**/*.ts", "src/workflows/**/*.ts"];
    }

    const builder = new OrchestratorBuilder(nitro, patterns);
    const outDir = join(nitro.options.buildDir, "orchestrators");

    // Externalize to prevent dev reloads
    if (nitro.options.dev) {
      nitro.options.externals ||= {};
      nitro.options.externals.external ||= [];
      nitro.options.externals.external.push((id) => id.startsWith(outDir));
    }

    // Build orchestrator bundle on build:before hook
    nitro.hooks.hook("build:before", async () => {
      if (nitro.options.dev) {
        await builder.watch();
      } else {
        await builder.build();
      }
    });

    // HMR support
    if (nitro.options.dev) {
      nitro.hooks.hook("dev:reload", async () => {
        // Watch mode handles incremental rebuilds automatically
      });
    }

    // Create virtual handler for orchestrator API
    addOrchestratorHandler(nitro, "/api/orchestrator", "orchestrators/handler", options);

    // Add handler route
    nitro.options.handlers.push({
      route: "/api/orchestrator/*",
      handler: "#orchestrators/handler",
    });
  },
} satisfies NitroModule;

function addOrchestratorHandler(
  nitro: Nitro,
  _route: string,
  virtualKey: string,
  options: ModuleOptions["orchestrator"]
) {
  const orchestratorsBundlePath = join(
    nitro.options.buildDir,
    "orchestrators/orchestrators.mjs"
  );

  // Get registry and load balancer from options or env
  const registryConfig = options?.registry || process.env.ORCHESTRATOR_REGISTRY;
  const loadBalancerConfig = options?.loadBalancer || process.env.ORCHESTRATOR_LOAD_BALANCER;

  if (!nitro.routing) {
    // Nitro v2 (legacy)
    nitro.options.virtual[`#${virtualKey}`] = /* js */ `
    import { fromWebHandler } from "h3";
    import { createOrchestratorHandler } from '@runners/orchestrator/http';
    import { orchestrators } from "${orchestratorsBundlePath}";
    
    const handler = createOrchestratorHandler({
      orchestrators,
      registry: ${registryConfig ? JSON.stringify(registryConfig) : "undefined"},
      loadBalancer: ${loadBalancerConfig ? JSON.stringify(loadBalancerConfig) : "undefined"},
    });
    
    export default fromWebHandler(handler);
  `;
  } else {
    // Nitro v3+ (native web handlers)
    nitro.options.virtual[`#${virtualKey}`] = /* js */ `
    import { createOrchestratorHandler } from '@runners/orchestrator/http';
    import { orchestrators } from "${orchestratorsBundlePath}";
    import { start, getRun } from 'workflow/api';
    
    const handler = createOrchestratorHandler({
      orchestrators,
      registry: ${registryConfig ? JSON.stringify(registryConfig) : "undefined"},
      loadBalancer: ${loadBalancerConfig ? JSON.stringify(loadBalancerConfig) : "undefined"},
    });
    
    export default async ({ req, url }) => {
      try {
        return await handler(req, url);
      } catch (error) {
        console.error('[runners/orchestrator-nitro] Handler error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            details: error.message,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  `;
  }
}
```

## 3. Orchestrator Builder

```typescript
// packages/orchestrator-nitro/src/builders.ts
import { mkdir } from "node:fs/promises";
import { BaseBuilder } from "@runners/builders";
import type { RunnerBuilderConfig } from "@runners/builders";
import type { Nitro } from "nitro/types";
import { join } from "pathe";

export class OrchestratorBuilder extends BaseBuilder {
  #outDir: string;

  constructor(nitro: Nitro, patterns?: string[]) {
    const outDir = join(nitro.options.buildDir, "orchestrators");
    const config: RunnerBuilderConfig = {
      workingDir: nitro.options.rootDir,
      watch: nitro.options.dev,
      patterns: patterns || ["workflows/**/*.ts", "src/workflows/**/*.ts"],
      outDir,
    };
    super(config);
    this.#outDir = outDir;
  }

  override async build(): Promise<void> {
    const inputFiles = await this.getInputFiles();
    await mkdir(this.#outDir, { recursive: true });

    // Build orchestrator workflows bundle
    await this.createOrchestratorsBundle({
      inputFiles,
      outfile: join(this.#outDir, "orchestrators.mjs"),
      format: "esm",
    });
  }

  private async createOrchestratorsBundle(options: {
    inputFiles: string[];
    outfile: string;
    format: "esm" | "cjs";
  }) {
    // Similar to createRunnersBundle but for orchestrators
    // Discovers exported async functions that use 'use workflow'
    // and bundles them into a manifest
  }
}
```

## 4. HTTP Handler for Orchestrators

```typescript
// packages/orchestrator/http/src/index.ts
import { start, getRun } from 'workflow/api';
import type {
  CreateOrchestratorHandlerOptions,
  OrchestratorRequest,
} from './types';

/**
 * Creates an HTTP handler for orchestrator workflows
 */
export function createOrchestratorHandler(
  options: CreateOrchestratorHandlerOptions
): (req: Request, url: URL) => Promise<Response> {
  const { orchestrators, registry, loadBalancer } = options;

  return async (req: Request, url: URL): Promise<Response> {
    // Parse route: /api/orchestrator/{workflowName}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const workflowName = pathParts[pathParts.length - 1];

    // Handle GET requests - return orchestrator info or workflow run status
    if (req.method === 'GET') {
      const runId = url.searchParams.get('runId');
      
      if (runId) {
        // Get workflow run status
        try {
          const run = getRun(runId);
          const returnValue = await run.returnValue;
          return new Response(JSON.stringify(returnValue), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          if (error.name === 'WorkflowRunNotCompletedError') {
            return new Response(
              JSON.stringify({ status: 'running', runId }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            );
          }
          throw error;
        }
      }

      // Return available orchestrators
      return new Response(
        JSON.stringify({
          orchestrators: Object.keys(orchestrators),
          usage: {
            method: 'POST',
            endpoint: '/api/orchestrator/{orchestratorName}',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle POST requests - start orchestrator workflow
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const body: OrchestratorRequest = await req.json();
      const orchestrator = orchestrators[workflowName];

      if (!orchestrator) {
        return new Response(
          JSON.stringify({
            error: `Orchestrator "${workflowName}" not found`,
            availableOrchestrators: Object.keys(orchestrators),
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Start workflow with injected registry/load balancer
      const args = [
        body.jobs || body.job ? [body.jobs || body.job].flat() : [],
        {
          registry,
          loadBalancer,
          ...body.options,
        },
      ];

      const run = await start(orchestrator as any, args);

      return new Response(
        JSON.stringify({
          runId: run.runId,
          orchestrator: workflowName,
          status: 'started',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return new Response(
        JSON.stringify({
          error: 'Orchestrator execution failed',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
```

## 5. Types

```typescript
// packages/orchestrator-nitro/src/types.ts
export type ModuleOptions = {
  orchestrator?: {
    /**
     * Pattern to scan for orchestrator workflow files.
     * @default ['workflows/**\/*.ts', 'src/workflows/**\/*.ts']
     */
    pattern?: string | string[];

    /**
     * Registry configuration (can be a class name or config object)
     */
    registry?: string | Record<string, unknown>;

    /**
     * Load balancer configuration (can be a class name or config object)
     */
    loadBalancer?: string | Record<string, unknown>;
  };
};

declare module "nitro/types" {
  type NitroOptions = {
    orchestrator?: ModuleOptions["orchestrator"];
  };
}
```

## 6. Usage in Nitro Config

```typescript
// nitro.config.ts
import { defineConfig } from 'nitro';
import { InMemoryServerRegistry, LeastLoadLoadBalancer } from '@runners/orchestrator';

export default defineConfig({
  modules: [
    '@runners/nitro', // For runner servers
    '@runners/orchestrator-nitro', // For orchestrator workflows
  ],
  
  orchestrator: {
    pattern: ['workflows/**/*.ts'],
    registry: {
      type: 'in-memory',
      servers: [
        { id: 'server-1', url: process.env.RUNNER_SERVER_1_URL, region: 'us-east-1' },
        { id: 'server-2', url: process.env.RUNNER_SERVER_2_URL, region: 'us-west-1' },
      ],
    },
    loadBalancer: {
      type: 'least-load',
    },
  },
});
```

## 7. API Usage

```bash
# List available orchestrators
curl http://localhost:3000/api/orchestrator

# Start orchestrator workflow
curl -X POST http://localhost:3000/api/orchestrator/orchestrateRunners \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "url": "https://example.com",
        "runners": ["cookieBannerVisibleTest"],
        "region": "us-east-1"
      }
    ],
    "options": {
      "maxConcurrency": 5
    }
  }'

# Check workflow status
curl http://localhost:3000/api/orchestrator/orchestrateRunners?runId=<runId>
```

## Benefits

1. Auto-discovery: Finds orchestrator workflows automatically
2. No directives needed: Just export async workflow functions
3. Auto-routing: Creates API endpoints automatically
4. Type-safe: Full TypeScript support
5. Framework integration: Works with Nitro/Hono/Next.js
6. Configuration: Registry and load balancer configured in Nitro config

This follows the same pattern as `@runners/nitro` but for orchestrator workflows.