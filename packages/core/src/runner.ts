import { chromium, type Browser } from "playwright";
import { createContext } from "./context";
import type {
  RunnerResult,
  RunRunnersOptions,
  RunRunnersResult,
} from "./types";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds

export async function runRunners(
  options: RunRunnersOptions
): Promise<RunRunnersResult> {
  const { url, runners, region, runId, timeout = DEFAULT_TIMEOUT } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const runnerContext = createContext(page, url, { region, runId });

    const results: RunnerResult[] = [];

    for (const runner of runners) {
      const startTime = Date.now();
      let result: RunnerResult;

      try {
        // Navigate to the URL before each runner
        await page.goto(url, { waitUntil: "networkidle" });

        // Run the runner with timeout
        result = await Promise.race([
          runner(runnerContext),
          new Promise<RunnerResult>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error(`Runner exceeded timeout of ${timeout}ms`)),
              timeout
            )
          ),
        ]);

        const durationMs = Date.now() - startTime;
        result.durationMs = durationMs;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        result = {
          name: "unknown",
          status: "error",
          errorMessage,
          durationMs,
        };
      }

      results.push(result);
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
