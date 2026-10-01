// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/data/site.ts';

export default defineConfig({
  site: site.url,
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
