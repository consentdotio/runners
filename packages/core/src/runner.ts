import { chromium, type Browser } from "playwright";
import { createContext } from "./context.js";
import type {
  RunnerTestResult,
  RunTestsOptions,
  RunTestsResult,
} from "./types.js";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds

export async function runTests(
  options: RunTestsOptions
): Promise<RunTestsResult> {
  const { url, tests, region, runId, timeout = DEFAULT_TIMEOUT } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const testContext = createContext(page, url, { region, runId });

    const results: RunnerTestResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      let result: RunnerTestResult;

      try {
        // Navigate to the URL before each test
        await page.goto(url, { waitUntil: "networkidle" });

        // Run the test with timeout
        result = await Promise.race([
          test(testContext),
          new Promise<RunnerTestResult>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Test exceeded timeout of ${timeout}ms`)),
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
