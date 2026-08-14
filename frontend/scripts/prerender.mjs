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
 * Only `/` is prerendered here: every other route is lazy-loaded, so a Node
 * string-render would capture only a Suspense fallback, not real copy. The
 * homepage component is eager, so it renders in full.
 *
 * ── Zero-regression contract ─────────────────────────────────────────────
 * This script NEVER fails the build. Any error → warn + exit 0, leaving the
 * normal SPA `dist/` exactly as `vite build` produced it. Worst case is
 * today's behavior; best case is prerendered HTML. There is no downside.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const ROOT_DIV = '<div id="root"></div>';

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

  let appHtml;
  try {
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
    appHtml = render('/');
  } finally {
    await vite.close();
  }

  if (!appHtml || appHtml.trim().length < 300) {
    console.warn(`[prerender] rendered markup suspiciously small (${(appHtml || '').length} chars) — skipping.`);
    return;
  }

  const html = template.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`);
  await writeFile(INDEX, html, 'utf8');
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`[prerender] ✓ / → dist/index.html (${kb} KB, ${(appHtml.length / 1024).toFixed(0)} KB of rendered content)`);
}

main().catch((err) => {
  // Absolute backstop: prerender must never break the build.
  console.warn('[prerender] skipped (SPA build intact):', err?.message || err);
  process.exit(0);
});
