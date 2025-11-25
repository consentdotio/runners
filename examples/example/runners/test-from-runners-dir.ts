import { z } from "zod";
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";

const TestInputSchema = z.object({
  url: z.string(),
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

  page.goto(input.url);
  await page.waitForLoadState("networkidle");
  const title = await page.title();
  const ok = title.length > 0;

  log(title);
  log("Test from runners/ directory");
  return { name: "test_from_runners_dir", status: ok ? "pass" : "fail", details: { title } };
};
