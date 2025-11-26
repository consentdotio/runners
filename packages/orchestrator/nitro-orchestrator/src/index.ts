import type { Nitro, NitroModule } from "nitro/types";
import type {
  NitroOptionsWithOrchestrator,
  OrchestratorModuleOptions,
} from "./types";

export type { OrchestratorModuleOptions } from "./types";

/**
 * Type-safe helper to extract orchestrator options from Nitro config.
 * This works around TypeScript's limitation with type alias merging in module augmentation.
 */
function getOrchestratorOptions(nitro: Nitro): OrchestratorModuleOptions {
  const options = nitro.options as Nitro["options"] &
    NitroOptionsWithOrchestrator;
  return options.orchestrator || {};
}

export default {
  name: "runners/nitro-orchestrator",
  setup(nitro: Nitro) {
    const options = getOrchestratorOptions(nitro);

    // Externalize orchestrator package to prevent bundling
    nitro.options.externals ||= {};
    const externals = nitro.options.externals;
    if (Array.isArray(externals.external)) {
      if (!externals.external.includes("@runners/orchestrator")) {
        externals.external.push("@runners/orchestrator");
      }
    } else if (typeof externals.external === "function") {
      // Preserve existing function behavior by wrapping it
      const originalFn = externals.external as (
        id: string,
        importer?: string
      ) => boolean | Promise<boolean>;
      const wrappedFn = (
        id: string,
        importer?: string
      ): boolean | Promise<boolean> => {
        // Always externalize @runners/orchestrator
        if (id === "@runners/orchestrator") {
          return true;
        }
        // Call original function (handles both sync and async)
        return originalFn(id, importer);
      };
      // Use type assertion to assign function (TypeScript can't narrow union type)
      (externals as unknown as { external: typeof wrappedFn }).external =
        wrappedFn;
    } else {
      // Only set to array when undefined/null
      externals.external = ["@runners/orchestrator"];
    }

    // Create virtual handler for orchestrator API
    // Pass runners config to handler (will be set in handler module scope, not global)
    addOrchestratorHandler(nitro, options.runners);

    // Add handlers for orchestrator routes
    nitro.options.handlers.push(
      {
        route: "/api/orchestrator",
        handler: "#orchestrator/handler",
      },
      {
        route: "/api/orchestrator/*",
        handler: "#orchestrator/handler",
      }
    );
  },
} satisfies NitroModule;

function addOrchestratorHandler(
  nitro: Nitro,
  runners?: Record<string, string>
) {
  // Set PLAYWRIGHT_RUNNERS in handler module scope (not global setup)
  // This is read by getRunnerUrl() in the orchestrator
  const runnersEnvSetup =
    runners && Object.keys(runners).length > 0
      ? `process.env.PLAYWRIGHT_RUNNERS = ${JSON.stringify(JSON.stringify(runners))};`
      : "";

  if (nitro.routing) {
    // Nitro v3+ (native web handlers)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
    ${runnersEnvSetup}
    import { createOrchestratorHandler } from 'runners/orchestrator';
    
    const handler = createOrchestratorHandler();
    
    export default async ({ req }) => {
      try {
        return await handler(req);
      } catch (error) {
        console.error('[runners/nitro-orchestrator] Handler error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  `;
  } else {
    // Nitro v2 (legacy)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
    ${runnersEnvSetup}
    import { fromWebHandler } from "h3";
    import { createOrchestratorHandler } from 'runners/orchestrator';
    
    const handler = createOrchestratorHandler();
    
    export default fromWebHandler(handler);
  `;
  }
}
