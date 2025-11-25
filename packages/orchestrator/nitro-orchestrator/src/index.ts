import type { Nitro, NitroModule } from "nitro/types";
import type { OrchestratorModuleOptions } from "./types";

export type { OrchestratorModuleOptions } from "./types";

export default {
  name: "runners/nitro-orchestrator",
  setup(nitro: Nitro) {

    const options =
      (nitro.options as unknown as { orchestrator?: OrchestratorModuleOptions })
        .orchestrator || {};
    
    // Default patterns: scan both src/** and runners/**
    let patterns: string[];
    if (options.pattern) {
      patterns = Array.isArray(options.pattern)
        ? options.pattern
        : [options.pattern];
    } else {
      patterns = ["src/**/*.ts", "runners/**/*.ts"];
    }

    // Externalize orchestrator package to prevent bundling
    nitro.options.externals ||= {};
    const externals = nitro.options.externals;
    if (Array.isArray(externals.external)) {
      if (!externals.external.includes("@runners/orchestrator")) {
        externals.external.push("@runners/orchestrator");
      }
    } else {
      // If externals.external is a function or undefined, convert to array
      externals.external = ["@runners/orchestrator"];
    }

    // Configure remote runner URLs if provided
    if (options.runners) {
      // Set PLAYWRIGHT_RUNNERS environment variable for remote mode
      // This is read by getRunnerUrl() in the orchestrator
      process.env.PLAYWRIGHT_RUNNERS = JSON.stringify(options.runners);
    }

    // Create virtual handler for orchestrator API
    addOrchestratorHandler(nitro, patterns);

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

function addOrchestratorHandler(nitro: Nitro, _patterns: string[]) {
  if (nitro.routing) {
    // Nitro v3+ (native web handlers)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
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
  } else {
    // Nitro v2 (legacy)
    nitro.options.virtual["#orchestrator/handler"] = /* js */ `
    import { fromWebHandler } from "h3";
    import { createOrchestratorHandler } from 'runners/orchestrator';
    
    const handler = createOrchestratorHandler();
    
    export default fromWebHandler(handler);
  `;
  }
}

