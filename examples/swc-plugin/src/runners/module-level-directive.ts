"use runner";

import { z } from "zod";
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";

const TestInputSchema = z.object({
  url: z.string(),
});

// Module-level directive applies to all exported functions in this file
export const testOne: Runner<typeof TestInputSchema> = async (
  ctx,
  input
) => {
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, url, log } = await withPlaywright(ctx, input.url);
  log("Test one", { url });
  return {
    name: "test_one",
    status: "pass",
    details: {},
  };
};

export const testTwo: Runner<typeof TestInputSchema> = async (
  ctx,
  input
) => {
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, url, log } = await withPlaywright(ctx, input.url);
  log("Test two", { url });
  return {
    name: "test_two",
    status: "pass",
    details: {},
  };
};

