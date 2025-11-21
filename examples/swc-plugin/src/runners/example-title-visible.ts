import { z } from "zod";
import type { Runner } from "runners";
import { withPlaywright } from "runners/playwright";

const ExampleTitleInputSchema = z.object({
  url: z.string(),
});

export const exampleTitleVisibleTest: Runner<
  typeof ExampleTitleInputSchema
> = async (ctx, input) => {
  "use runner";
  if (!input?.url) {
    throw new Error("url is required in input");
  }
  const { page, url, log } = await withPlaywright(ctx, input.url);

  log('Checking page title', { url });

  const title = await page.title();
  const ok = title.length > 0;

  return {
    name: 'example_title_visible',
    status: ok ? 'pass' : 'fail',
    details: { title },
  };
};

