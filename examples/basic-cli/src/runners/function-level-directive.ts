import { z } from "zod";
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";

const TestInputSchema = z.object({
  url: z.string(),
});

// Function-level directive - each function has its own directive
export const testWithDirective: Runner<typeof TestInputSchema> =
  async (ctx, input) => {
    "use runner";
    if (!input?.url) {
      throw new Error("url is required in input");
    }
    const { page, url, log } = await withPlaywright(ctx, input.url);
    log("Test with directive", { url });
    return {
      name: "test_with_directive",
      status: "pass",
      details: {},
    };
  };

export const testWithoutDirective: Runner<typeof TestInputSchema> =
  async (ctx, input) => {
    // This function doesn't have the directive
    if (!input?.url) {
      throw new Error("url is required in input");
    }
    const { page, url, log } = await withPlaywright(ctx, input.url);
    log("Test without directive", { url });
    return {
      name: "test_without_directive",
      status: "pass",
      details: {},
    };
  };

