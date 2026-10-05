import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://studio-marion.cz',
  // Keep the live site's URL shape: /masaze, /sluzba/masaze/relaxacni-masaz (no trailing slash).
  trailingSlash: 'never',
  build: { format: 'file' },
});
