import type { Runner } from 'runners';

export const exampleTitleVisibleTest: Runner = async (ctx) => {
  'use runner';

  const { page, url, log } = ctx;

  log('Checking page title', { url });

  const title = await page.title();
  const ok = title.length > 0;

  return {
    name: 'example_title_visible',
    status: ok ? 'pass' : 'fail',
    details: { title },
  };
};


