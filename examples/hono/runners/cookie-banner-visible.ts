

import type { Runner } from 'runners';

export const cookieBannerVisibleTest: Runner = async (ctx) => {
'use runner';
  const { page, url, region, log } = ctx;

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

