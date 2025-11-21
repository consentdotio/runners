import { chromium, type Browser } from "playwright";
import { RunnerExecutionError, RunnerTimeoutError } from "@runners/errors";
import { createContext } from "./context";
import type {
  Runner,
  RunnerResult,
  RunRunnersOptions,
  RunRunnersResult,
} from "./types";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds

export async function runRunners<const TRunners extends readonly Runner[]>(
  options: RunRunnersOptions<TRunners>
): Promise<RunRunnersResult<TRunners>> {
  const { url, runners, region, runId, timeout = DEFAULT_TIMEOUT } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const runnerContext = createContext(page, url, { region, runId });

    const results = [] as RunRunnersResult<TRunners>["results"];

    for (const runner of runners) {
      if (!runner) {
        continue;
      }

      const startTime = Date.now();
      let result: RunnerResult<unknown>;

      try {
        // Navigate to the URL before each runner
        await page.goto(url, { waitUntil: "networkidle" });

        // Run the runner with timeout
        // Note: We don't have runner name here, so we'll use "unknown" and update it later if available
        result = await Promise.race([
          runner(runnerContext),
          new Promise<RunnerResult<unknown>>((_, reject) =>
            setTimeout(
              () => reject(new RunnerTimeoutError("unknown", timeout)),
              timeout
            )
          ),
        ]);

        const durationMs = Date.now() - startTime;
        result.durationMs = durationMs;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        // Extract runner name from error if it's a RunnerTimeoutError or RunnerExecutionError
        let runnerName = "unknown";
        if (error instanceof RunnerTimeoutError) {
          runnerName = error.runnerName;
        } else if (error instanceof RunnerExecutionError) {
          runnerName = error.runnerName;
        }

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        result = {
          name: runnerName,
          status: "error",
          errorMessage,
          durationMs,
        };
      }

      // TypeScript preserves tuple structure through the generic, but needs assertion for array operations
      (results as RunnerResult<unknown>[]).push(result);
    }

    await context.close();

    return {
      url,
      region,
      runId,
      results,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
