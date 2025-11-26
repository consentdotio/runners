import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";
import { z } from "zod";

// Define schemas
export const CookieBannerInputSchema = z.object({
  selectors: z
    .array(z.string())
    .optional()
    .default(["[data-cookie-banner]", ".cookie-banner", "#cookie-banner"]),
  timeout: z.number().optional().default(5000),
  url: z.string(),
});

export const CookieBannerOutputSchema = z.object({
  visible: z.boolean(),
  selector: z.string().optional(),
  elementCount: z.number().optional(),
});

export const cookieBannerVisibleTest: Runner<
  typeof CookieBannerInputSchema,
  typeof CookieBannerOutputSchema
> = async (ctx, input) => {
  "use runner";
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, url, region, log } = await withPlaywright(ctx, input.url);

  // Use input with defaults - input is typed as CookieBannerInput
  const { selectors, timeout } = input || {};
  const finalSelectors = selectors || [
    "[data-cookie-banner]",
    ".cookie-banner",
    "#cookie-banner",
  ];
  const finalTimeout = timeout || 5000;

  log("Checking cookie banner", { url, region, selectors: finalSelectors });

  let visible = false;
  let matchedSelector: string | undefined;
  let elementCount = 0;

  // Try each selector
  for (const selector of finalSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();

    if (count > 0) {
      elementCount = count;
      matchedSelector = selector;
      visible = await elements.first().isVisible({ timeout: finalTimeout });
      if (visible) {
        break;
      }
    }
  }

  return {
    name: "cookie_banner_visible",
    status: visible ? "pass" : "fail",
    details: {
      visible,
      selector: matchedSelector,
      elementCount,
    },
  };
};
