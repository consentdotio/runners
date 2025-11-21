import type { RunnerContext } from "@runners/core";
import { chromium, type Browser, type Page } from "playwright";

export type PlaywrightContext = RunnerContext & {
  page: Page;
  url: string;
};

// Browser instance cache - reuse across runners
let browserInstance: Browser | null = null;
let browserContext: Awaited<ReturnType<Browser["newContext"]>> | null = null;

/**
 * Enhances a RunnerContext with Playwright page and URL.
 * Launches and reuses a browser instance across multiple calls.
 *
 * @param ctx - The base RunnerContext
 * @param url - The URL to navigate to
 * @returns Enhanced context with page and url
 */
export async function withPlaywright(
  ctx: RunnerContext,
  url: string
): Promise<PlaywrightContext> {
  // Launch browser if not already launched
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
    });
    browserContext = await browserInstance.newContext();
  }

  if (!browserContext) {
    throw new Error("Failed to create browser context");
  }

  // Create a new page for this runner
  const page = await browserContext.newPage();

  // Navigate to the URL
  await page.goto(url, { waitUntil: "networkidle" });

  return {
    ...ctx,
    page,
    url,
  };
}

/**
 * Closes the browser instance.
 * Should be called when all runners are done.
 */
export async function closeBrowser(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
  }
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

