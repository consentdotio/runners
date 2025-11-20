import type { Nitro, NitroModule } from "nitro/types";
import { discoverTests } from "runners";
export type { ModuleOptions } from "./types";

export default {
  name: "runners/nitro",
  async setup(nitro: Nitro) {
    const options: ModuleOptions = nitro.options.runners || {};
    // Default patterns: scan both src/** and runners/**
    let patterns: string[];
    if (options.pattern) {
      patterns = Array.isArray(options.pattern)
        ? options.pattern
        : [options.pattern];
    } else {
      patterns = ["src/**/*.ts", "runners/**/*.ts"];
    }
    const region = options.region || process.env.RUNNER_REGION;

    // Discover tests to validate they can be found
    async function initializeRunner() {
      try {
        // Discover tests from all patterns and merge results
        const allTests = new Map<string, import("runners").RunnerTest>();
        for (const pattern of patterns) {
          const testsMap = await discoverTests(pattern);
          // Merge into allTests, overwriting duplicates (later patterns take precedence)
          for (const [name, test] of testsMap) {
            allTests.set(name, test);
          }
        }
        const tests = Object.fromEntries(allTests);
        console.log(
          `[runners/nitro] Discovered ${Object.keys(tests).length} test(s) from patterns: ${patterns.join(", ")}`
        );
      } catch (error) {
        console.error("[runners/nitro] Failed to discover tests:", error);
      }
    }

    // Initialize runner on setup
    await initializeRunner();

    // Re-initialize on dev reload
    if (nitro.options.dev) {
      nitro.hooks.hook("dev:reload", async () => {
        await initializeRunner();
      });
    }

    // Add handler for /api/runner
    nitro.options.handlers.push({
      route: "/api/runner",
      handler: "#runners/handler",
    });

    // Create virtual handler that uses the discovered tests
    nitro.options.virtual["#runners/handler"] = /* js */ `
      import { createHttpRunner } from '@runners/http';
      import { discoverTests } from 'runners';

      let handler = null;
      const patterns = ${JSON.stringify(patterns)};
      const region = ${region ? JSON.stringify(region) : "undefined"};

      async function initialize() {
        try {
          // Discover tests from all patterns and merge results
          const allTests = new Map();
          for (const pattern of patterns) {
            const testsMap = await discoverTests(pattern);
            for (const [name, test] of testsMap) {
              allTests.set(name, test);
            }
          }
          const tests = Object.fromEntries(allTests);
          handler = createHttpRunner({
            tests,
            region,
          });
        } catch (error) {
          console.error('[runners/nitro] Failed to initialize:', error);
          handler = async () => {
            return new Response(
              JSON.stringify({
                error: 'Failed to initialize runner',
                details: error.message,
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          };
        }
      }

      await initialize();

      export default async ({ req }) => {
        if (!handler) {
          await initialize();
        }
        try {
          return await handler(req);
        } catch (error) {
          console.error('[runners/nitro] Handler error:', error);
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
  },
} satisfies NitroModule;
