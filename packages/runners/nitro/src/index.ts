import type { Nitro, NitroModule } from "nitro/types";
import { join } from "pathe";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { LocalBuilder } from "./builders";
import type { ModuleOptions } from "./types";

export type { ModuleOptions } from "./types";

export default {
  name: "runners/nitro",
  // biome-ignore lint/suspicious/useAwait: nitro.options is not typed
  async setup(nitro: Nitro) {
    const options =
      (nitro.options as unknown as { runners?: ModuleOptions }).runners || {};
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

    const builder = new LocalBuilder(nitro, patterns);
    const outDir = join(nitro.options.buildDir, "runners");

    // NOTE: Externalize .nitro/runners to prevent dev reloads
    if (nitro.options.dev) {
      nitro.options.externals ||= {};
      nitro.options.externals.external ||= [];
      nitro.options.externals.external.push((id) => id.startsWith(outDir));
    }

    // Extract schemas at build time
    const schemaMetadataPath = join(
      nitro.options.buildDir,
      "runner-schemas.json"
    );

    // Build runners bundle on build:before hook
    nitro.hooks.hook("build:before", async () => {
      // Extract schema metadata using Rust tool
      await extractSchemaMetadata(
        patterns,
        schemaMetadataPath,
        nitro.options.rootDir
      );

      if (nitro.options.dev) {
        // Start watch mode for incremental rebuilds
        await builder.watch();
      } else {
        // One-time build for production
        await builder.build();
      }
    });

    // Allows for HMR - rebuild on dev reload
    if (nitro.options.dev) {
      nitro.hooks.hook("dev:reload", async () => {
        // Watch mode handles incremental rebuilds automatically
        // No need to rebuild manually
      });
    }

    // Create virtual handler that imports the bundled runners
    addVirtualHandler(
      nitro,
      "/api/runner",
      "runners/handler",
      region,
      schemaMetadataPath
    );

    // Add handlers for /api/runner and its sub-paths (docs, spec.json)
    nitro.options.handlers.push(
      {
        route: "/api/runner",
        handler: "#runners/handler",
      },
      {
        route: "/api/runner/*",
        handler: "#runners/handler",
      }
    );
  },
} satisfies NitroModule;

async function extractSchemaMetadata(
  patterns: string[],
  outputPath: string,
  cwd: string
): Promise<void> {
  try {
    // Try to find schema-extractor binary
    // First check if it's in node_modules
    const possiblePaths = [
      join(
        process.cwd(),
        "node_modules/@runners/schema-extractor/target/release/schema-extractor"
      ),
      join(__dirname, "../../schema-extractor/target/release/schema-extractor"),
      join(
        process.cwd(),
        "packages/runners/schema-extractor/target/release/schema-extractor"
      ),
    ];

    let extractorPath: string | undefined;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        extractorPath = path;
        break;
      }
    }

    if (!extractorPath) {
      console.warn(
        "[runners/nitro] Schema extractor not found. Schema discovery will use runtime scanning."
      );
      return;
    }

    const patternsStr = patterns.join(",");
    execSync(
      `${extractorPath} --patterns "${patternsStr}" --output "${outputPath}" --cwd "${cwd}"`,
      { stdio: "inherit" }
    );
  } catch (error) {
    console.warn(
      "[runners/nitro] Failed to extract schema metadata:",
      error instanceof Error ? error.message : String(error)
    );
    console.warn("[runners/nitro] Falling back to runtime schema discovery");
  }
}

function addVirtualHandler(
  nitro: Nitro,
  _route: string,
  virtualKey: string,
  region?: string,
  schemaMetadataPath?: string
) {
  // The actual runners bundle is at runners/runners.mjs
  const runnersBundlePath = join(nitro.options.buildDir, "runners/runners.mjs");
  const schemaMetadataImport = schemaMetadataPath
    ? `process.env.RUNNER_SCHEMAS_METADATA = ${JSON.stringify(schemaMetadataPath)};`
    : "";

  if (!nitro.routing) {
    // Nitro v2 (legacy)
    nitro.options.virtual[`#${virtualKey}`] = /* js */ `
    import { fromWebHandler } from "h3";
    import { createOrpcRunnerHandler } from 'runners/http';
    import { runners } from "${runnersBundlePath}";
    ${schemaMetadataImport}
    
    const handler = await createOrpcRunnerHandler({
      runners,
      region: ${region ? JSON.stringify(region) : "undefined"},
    });
    
    export default fromWebHandler(handler);
  `;
  } else {
    // Nitro v3+ (native web handlers)
    nitro.options.virtual[`#${virtualKey}`] = /* js */ `
    import { createOrpcRunnerHandler } from 'runners/http';
    import { runners } from "${runnersBundlePath}";
    ${schemaMetadataImport}
    
    const handler = await createOrpcRunnerHandler({
      runners,
      region: ${region ? JSON.stringify(region) : "undefined"},
    });
    
    export default async ({ req }) => {
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
  }
}
