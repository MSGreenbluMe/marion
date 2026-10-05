import { defineConfig } from 'astro/config';

// Hosted previews (e.g. v0 / Vercel sandboxes) load the dev server from another origin,
// which Astro's dev server rejects with "Cross-origin request blocked". Dev only: the
// production build is plain static files and is not affected.
const allowCrossOriginPreview = {
  name: 'allow-cross-origin-preview',
  configureServer(server) {
    // Post hook, so this runs after Astro has added its own guard and lands in front of it.
    return () => {
      server.middlewares.stack.unshift({
        route: '',
        handle(req, _res, next) {
          delete req.headers['sec-fetch-site'];
          next();
        },
      });
    };
  },
};

export default defineConfig({
  site: 'https://studio-marion.cz',
  // Keep the live site's URL shape: /masaze, /sluzba/masaze/relaxacni-masaz (no trailing slash).
  trailingSlash: 'never',
  build: { format: 'file' },
  server: { host: true },
  vite: {
    server: { allowedHosts: true },
    plugins: [allowCrossOriginPreview],
  },
});
