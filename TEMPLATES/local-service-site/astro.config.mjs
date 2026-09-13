// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import site from './config/site.json' with { type: 'json' };

// Every page is static HTML. The one exception is src/pages/api/lead.ts,
// which opts out with `export const prerender = false` and becomes a single
// Vercel function so GHL / Resend secrets never reach the browser.
export default defineConfig({
  site: site.domain,
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  integrations: [
    sitemap({
      // Never advertise the confirmation page or the API route.
      filter: (page) => !page.includes('/thank-you') && !page.includes('/api/'),
    }),
  ],
});
