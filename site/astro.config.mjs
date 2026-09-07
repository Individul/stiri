// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Domeniul oficial, folosit pentru adresele canonice.
  site: 'https://stiri.dumitru.cloud',
  output: 'server',
  adapter: cloudflare(),
});
