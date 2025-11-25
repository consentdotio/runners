import { defineConfig } from '@runners/config';

export default defineConfig({
  url: 'https://example.com',
  region: 'eu-west-1',
  tests: ['exampleTitleVisibleTest', 'cookieBannerVisibleTest'],
});



