import { runRunners, defineConfig } from "@runners/core";
import type { RunnerContext, RunnerResult } from "@runners/core";
import { loadRunners } from "../../utils/load-runners";
import type { CliContext } from "../../context/types";

export async function run(context: CliContext): Promise<void> {
  const { logger, flags, commandArgs, error: errorHandler } = context;

  let config: {
    url?: string;
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

  if (config.url) {
    logger.info(
      `Running ${runnerFunctions.length} runner(s) against ${config.url}...`
    );
  } else {
    logger.info(`Running ${runnerFunctions.length} runner(s)...`);
  }

  // Prepare runner input - include url if provided
  const runnerInput = config.url ? { url: config.url } : undefined;

  // Wrap runners to pass input if url is provided
  const runnersToRun = runnerInput
    ? runnerFunctions.map((runner) => {
        return async (ctx: RunnerContext): Promise<RunnerResult<unknown>> => {
          return runner(ctx, runnerInput);
        };
      })
    : runnerFunctions;

  const result = await runRunners({
    runners: (runnersToRun as typeof runnerFunctions),
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
