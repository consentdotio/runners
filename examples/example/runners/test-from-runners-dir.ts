import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";
import { z } from "zod";

export const TestInputSchema = z.object({
  url: z.url(),
});

export const testFromRunnersDir: Runner<typeof TestInputSchema> = async (
  ctx,
  input
) => {
  "use runner";
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, log } = await withPlaywright(ctx, input.url);

  try {
    await page.goto(input.url);
    await page.waitForLoadState("networkidle");
    const title = await page.title();
    const ok = title.length > 0;

    log(title);
    log("Test from runners/ directory");
    return {
      name: "test_from_runners_dir",
      status: ok ? "pass" : "fail",
      details: { title },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Navigation failed: ${message}`);
    return {
      name: "test_from_runners_dir",
      status: "fail",
      details: { error: message },
    };
  } finally {
    // Ensure page is closed to avoid resource leaks
    await page.close().catch(() => {
      // Ignore errors during cleanup
    });
  }
};
