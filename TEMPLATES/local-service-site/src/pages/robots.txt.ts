import type { APIRoute } from 'astro';
import { ORIGIN } from '../lib/config';

// /thank-you is noindex rather than disallowed on purpose: a disallowed URL
// can never be crawled, so its noindex tag is never read.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
