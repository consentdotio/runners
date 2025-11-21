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
    log("Test from runners/ directory");
    return { name: "test_from_runners_dir", status: "pass", details: {} };
  };
