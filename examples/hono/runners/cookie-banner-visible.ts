import { z } from "zod";
import type { Runner } from "runners";

// Define schemas
const CookieBannerInputSchema = z.object({
  selectors: z
    .array(z.string())
    .optional()
    .default(["[data-cookie-banner]", ".cookie-banner", "#cookie-banner"]),
  timeout: z.number().optional().default(5000),
});

const CookieBannerOutputSchema = z.object({
  visible: z.boolean(),
  selector: z.string().optional(),
  elementCount: z.number().optional(),
});

export const cookieBannerVisibleTest: Runner<
  z.infer<typeof CookieBannerInputSchema>,
  z.infer<typeof CookieBannerOutputSchema>
> = async (ctx, input) => {
  "use runner";
  const { page, url, region, log } = ctx;

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
      if (visible) break;
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
