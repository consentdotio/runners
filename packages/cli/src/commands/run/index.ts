import { runTests, type RunnerTestResult } from "runners";
import { defineConfig } from "@runners/config";
import { loadTests } from "../../utils/load-tests.js";
import type { CliContext } from "../../context/types.js";

export async function run(context: CliContext): Promise<void> {
  const { logger, flags, commandArgs, error: errorHandler } = context;

  let config: {
    url: string;
    region?: string;
    tests: string[];
  };

  // Extract options from flags and command args
  const url = flags.url as string | undefined;
  const region = flags.region as string | undefined;
  const configPath = flags.config as string | undefined;
  // Tests are passed as command args (positional arguments after 'run')
  const tests = commandArgs.length > 0 ? commandArgs : undefined;

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
      tests: tests || [],
    };
  }

  // Directives are now required by default
  const testFunctions = await loadTests(
    config.tests.length > 0 ? config.tests : undefined,
    true
  );

  if (testFunctions.length === 0) {
    logger.error(
      'No tests found. Make sure you have test files with "use runner" directive in src/**/*.ts'
    );
    process.exit(1);
  }

  logger.info(
    `Running ${testFunctions.length} test(s) against ${config.url}...`
  );

  const result = await runTests({
    url: config.url,
    tests: testFunctions,
    region: config.region,
  });

  // Print results
  logger.message("\nResults:");
  logger.message(JSON.stringify(result, null, 2));

  // Exit with non-zero if any test failed
  const hasFailures = result.results.some(
    (r: RunnerTestResult) => r.status === "fail" || r.status === "error"
  );

  if (hasFailures) {
    logger.error("Some tests failed");
    process.exit(1);
  } else {
    logger.success("All tests passed!");
  }
}
