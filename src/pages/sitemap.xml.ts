import type { APIRoute } from 'astro';
import { categories, serviceUrl } from '../data/services';
import { site } from '../data/site';

export const GET: APIRoute = () => {
  const paths = [
    '/',
    ...categories.map((c) => `/${c.id}`),
    ...categories.flatMap((c) => c.services.map((s) => serviceUrl(c.id, s.slug))),
    '/terminy',
    '/poukaz',
    '/ochrana-osobnich-udaju',
  ];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site.url).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
