/**
 * Build-time prerender for the homepage — BROWSER-FREE.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The app is a client-rendered Vite SPA: `dist/index.html` ships an empty
 * `<div id="root">` and all copy is painted by React after the JS loads. So
 * Google (partially) and the AI answer crawlers that DON'T run JS (GPTBot,
 * ClaudeBot, PerplexityBot, Google-Extended) see a blank page — no headline,
 * no offer, no story.
 *
 * ── Why it no longer uses a headless browser ─────────────────────────────
 * The previous version drove headless Chromium (Playwright). That works on a
 * dev box but SILENTLY SKIPS on Vercel's build image, which lacks the shared
 * libraries Chromium needs (`libnspr4.so: cannot open shared object file`).
 * The result shipped to production was the empty shell — the exact bug this
 * step is meant to fix. This version renders the React tree to a string in
 * pure Node via `react-dom/server` (see src/entry-server.tsx), so it runs
 * anywhere Node runs, Vercel included. No browser, no system libs, no network.
 *
 * ── How the pieces fit ───────────────────────────────────────────────────
 * `vite build` emits `dist/index.html` (JSON-LD + linked hashed CSS/JS, empty
 * root). We spin up Vite's SSR module loader, render `/`, and inject the real
 * markup into that `#root`. Humans still get the live React app, which mounts
 * on top (createRoot REPLACES the prerendered markup — no hydration contract).
 * The linked stylesheet means the prerendered HTML is fully styled before JS.
 *
 * Every marketing route is prerendered, not just `/`. That matters more than
 * it sounds: Vercel's catch-all rewrite (`/(.*) -> /index.html`) means a
 * crawler asking for /pricing was served the HOMEPAGE's prerendered markup —
 * so the pricing page could never rank for a pricing question, and every route
 * looked like duplicate content. Writing dist/<route>/index.html fixes that,
 * because Vercel serves a matching static file before it consults rewrites.
 *
 * Lazy routes are handled by entry-server's streaming render (see the note
 * there); a route that fails or times out is skipped individually and leaves
 * the SPA shell in place.
 *
 * ── Zero-regression contract ─────────────────────────────────────────────
 * This script NEVER fails the build. Any error → warn + exit 0, leaving the
 * normal SPA `dist/` exactly as `vite build` produced it. Worst case is
 * today's behavior; best case is prerendered HTML. There is no downside.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROUTES } from './routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const ROOT_DIV = '<div id="root"></div>';
/**
 * Canonical origin. Mirrors SITE_ORIGIN in src/lib/pageMeta.ts, and reads the
 * same env var, so a domain move is one variable rather than a sweep.
 */
const SITE = (process.env.VITE_SITE_ORIGIN || 'https://www.coachtyalexander.com').replace(/\/$/, '');

/**
 * Rewrite the shared <head> for one route.
 *
 * The template's head is the HOMEPAGE's head. Before this existed, every route
 * file got it verbatim: one title, one description, one og:url across all 14
 * pages, no canonical anywhere, and the homepage's FAQPage schema claimed on
 * pages that never render those questions. A JS-executing crawler eventually
 * saw the right tags via useSeo; GPTBot / ClaudeBot / PerplexityBot, which
 * mostly don't run JS, never did.
 *
 * Everything here comes from src/lib/pageMeta.ts, which useSeo also reads, so
 * the static HTML and the client-side tags cannot disagree.
 */
function renderHead(template, route, meta, schemaBlocks) {
  const canonical = route === '/' ? `${SITE}/` : `${SITE}${route}`;
  let html = template;

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`);

  // Replace a meta tag by name/property, whatever its attribute order or
  // line wrapping. The template writes description across three lines.
  const setMeta = (attr, key, value) => {
    const re = new RegExp(`<meta\\s+${attr}="${key}"[\\s\\S]*?/?>`, 'i');
    const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`;
    html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
  };

  setMeta('name', 'description', meta.description);
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('property', 'og:url', canonical);
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', meta.description);

  // Self-referencing canonical. Absent from every page before this.
  html = html.replace(/\s*<link\s+rel="canonical"[\s\S]*?>/gi, '');
  html = html.replace('</head>', `    <link rel="canonical" href="${canonical}" />\n  </head>`);

  // Swap the template's hand-written JSON-LD for this route's graph. The
  // template blocks were sitewide copies; these are per-route and include the
  // FAQPage only where the questions actually render.
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
  const ld = schemaBlocks
    .map((b) => `    <script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n    </script>`)
    .join('\n');
  html = html.replace('</head>', `${ld}\n  </head>`);

  return html;
}

async function main() {
  if (!existsSync(INDEX)) {
    console.warn('[prerender] dist/index.html missing — did vite build run? Skipping.');
    return;
  }

  const template = await readFile(INDEX, 'utf8');
  if (!template.includes(ROOT_DIV)) {
    console.warn(`[prerender] "${ROOT_DIV}" not found in dist/index.html — skipping (SPA intact).`);
    return;
  }

  // Spin up Vite's SSR module loader (no HTTP server, no browser) and render
  // the app to an HTML string. `createServer` in middleware mode compiles the
  // TSX on the fly using the project's own vite.config (React plugin).
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: ROOT,
    logLevel: 'warn',
    appType: 'custom',
    server: { middlewareMode: true },
  });

  let ok = 0;
  let skipped = 0;
  try {
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
    const { PAGE_META, schemaFor } = await vite.ssrLoadModule('/src/lib/pageMeta.ts');

    for (const route of ROUTES) {
      let appHtml;
      try {
        appHtml = await render(route);
      } catch (err) {
        console.warn(`[prerender] ${route} — render failed (${err?.message || err}); leaving SPA shell.`);
        skipped += 1;
        continue;
      }

      // A Suspense fallback or an error boundary renders as a sliver of markup.
      // Refuse to write it: shipping a spinner as the crawlable copy is worse
      // than shipping the shell, because it looks like real content.
      if (!appHtml || appHtml.trim().length < 300) {
        console.warn(`[prerender] ${route} — markup suspiciously small (${(appHtml || '').length} chars); skipping.`);
        skipped += 1;
        continue;
      }

      const meta = PAGE_META[route];
      if (!meta) {
        // A route with no metadata entry would ship the homepage's head, which
        // is the exact bug this step exists to fix. Refuse rather than write it.
        console.warn(`[prerender] ${route} — no PAGE_META entry; skipping so it can't ship duplicate metadata.`);
        skipped += 1;
        continue;
      }
      const head = renderHead(template, route, meta, schemaFor(route));
      const html = head.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`);
      const outFile =
        route === '/' ? INDEX : path.join(DIST, route.replace(/^\//, ''), 'index.html');
      await mkdir(path.dirname(outFile), { recursive: true });
      await writeFile(outFile, html, 'utf8');

      const rel = path.relative(DIST, outFile);
      const kb = (appHtml.length / 1024).toFixed(0);
      console.log(`[prerender] ✓ ${route} → dist/${rel} (${kb} KB of rendered content)`);
      ok += 1;
    }
  } finally {
    await vite.close();
  }

  console.log(`[prerender] ${ok} route(s) prerendered${skipped ? `, ${skipped} skipped` : ''}.`);
}

main().catch((err) => {
  // Absolute backstop: prerender must never break the build.
  console.warn('[prerender] skipped (SPA build intact):', err?.message || err);
  process.exit(0);
});
