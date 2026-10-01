import type { APIRoute } from 'astro';
import { site } from '../data/site';

// Generated so the sitemap URL follows site.url when the domain changes.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site.url).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
