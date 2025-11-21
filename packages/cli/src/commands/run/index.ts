import { runRunners } from "runners";
import { defineConfig } from "@runners/config";
import { loadRunners } from "../../utils/load-runners";
import type { CliContext } from "../../context/types";

export async function run(context: CliContext): Promise<void> {
  const { logger, flags, commandArgs, error: errorHandler } = context;

  let config: {
    url: string;
    region?: string;
    runners: string[];
  };

  // Extract options from flags and command args
  const url = flags.url as string | undefined;
  const region = flags.region as string | undefined;
  const configPath = flags.config as string | undefined;
  // Runners are passed as command args (positional arguments after 'run')
  const runners = commandArgs.length > 0 ? commandArgs : undefined;

  if (configPath) {
    // Load config from file
    const { pathToFileURL } = await import("node:url");
    const { resolve } = await import("node:path");
    const resolvedPath = configPath.startsWith("/")
      ? configPath
      : resolve(context.cwd, configPath);
    const configUrl = pathToFileURL(resolvedPath).href;
    const configModule = await import(configUrl);
    const configExport = configModule.default || configModule;
    config = defineConfig(configExport);
  } else {
    // Use CLI options
    if (!url) {
      errorHandler.handleError(
        new Error("--url is required when --config is not provided"),
        "Missing required option"
      );
      // handleError never returns, but TypeScript needs this for type narrowing
      return;
    }
    config = {
      url,
      region,
      runners: runners || [],
    };
  }

  // Directives are now required by default
  const runnerFunctions = await loadRunners(
    config.runners.length > 0 ? config.runners : undefined,
    true
  );

  if (runnerFunctions.length === 0) {
    logger.error(
      'No runners found. Make sure you have runner files with "use runner" directive in src/**/*.ts'
    );
    const noExit = flags["no-exit"] as boolean | undefined;
    if (!noExit) {
      process.exit(1);
    }
    return;
  }

  logger.info(
    `Running ${runnerFunctions.length} runner(s) against ${config.url}...`
  );

  const result = await runRunners({
    url: config.url,
    runners: runnerFunctions,
    region: config.region,
  });

  // Print results
  logger.message("\nResults:");
  logger.message(JSON.stringify(result, null, 2));

  // Exit with non-zero if any runner failed
  const hasFailures = result.results.some(
    (r: { status: string }) => r.status === "fail" || r.status === "error"
  );

  const noExit = flags["no-exit"] as boolean | undefined;

  if (hasFailures) {
    logger.error("Some runners failed");
    if (!noExit) {
      process.exit(1);
    }
  } else {
    logger.success("All runners passed!");
    // Only exit if --no-exit flag is not set
    // (process will naturally exit when script completes)
  }
}
