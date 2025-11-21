import { z } from "zod";
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";

const CookieBannerInputSchema = z.object({
  url: z.string(),
});

export const cookieBannerVisibleTest: Runner<
  z.infer<typeof CookieBannerInputSchema>
> = async (ctx, input) => {
  "use runner";
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, url, region, log } = await withPlaywright(ctx, input.url);

  log('Checking cookie banner', { url, region });

  const banner = page
    .locator('[data-cookie-banner], .cookie-banner, #cookie-banner')
    .first();
  const visible = await banner.isVisible();

  return {
    name: 'cookie_banner_visible',
    status: visible ? 'pass' : 'fail',
    details: { visible },
  };
};

