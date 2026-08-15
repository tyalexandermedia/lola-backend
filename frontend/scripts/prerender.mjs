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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const ROOT_DIV = '<div id="root"></div>';

/**
 * Marketing routes worth making crawlable. Deliberately excludes anything
 * private or per-user — /r/<id> reports, /r/client/<slug> dashboards and the
 * admin screens are noindex by design and have no business in a static build.
 */
const ROUTES = [
  '/',
  '/pricing',
  '/work',
  '/growth-score',
  '/retainer',
  '/methodology',
  '/vs',
  '/apply',
];

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

      const html = template.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`);
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
