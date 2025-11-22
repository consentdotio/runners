import type { Nitro, NitroModule } from "nitro/types";

export default {
  name: "runners/nitro-orchestrator",
  async setup(nitro: Nitro) {
    // Create virtual handler for orchestrator API
    addOrchestratorHandler(nitro);

    // Add handlers for orchestrator routes
    nitro.options.handlers.push(
      {
        route: "/api/run",
        handler: "#orchestrator/handler",
      },
      {
        route: "/api/run/*",
        handler: "#orchestrator/handler",
      },
      {
        route: "/docs",
        handler: "#orchestrator/handler",
      },
      {
        route: "/api/docs",
        handler: "#orchestrator/handler",
      },
      {
        route: "/spec.json",
        handler: "#orchestrator/handler",
      },
      {
        route: "/api/spec.json",
        handler: "#orchestrator/handler",
      }
    );
  },
} satisfies NitroModule;

function addOrchestratorHandler(nitro: Nitro) {
  if (!nitro.routing) {
    // Nitro v2 (legacy)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
    import { fromWebHandler } from "h3";
    import { createOrchestratorHandler } from '@runners/orchestrator';
    
    const handler = createOrchestratorHandler();
    
    export default fromWebHandler(handler);
  `;
  } else {
    // Nitro v3+ (native web handlers)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
    import { createOrchestratorHandler } from '@runners/orchestrator';
    
    const handler = createOrchestratorHandler();
    
    export default async ({ req }) => {
      try {
        return await handler(req);
      } catch (error) {
        console.error('[runners/nitro-orchestrator] Handler error:', error);
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

