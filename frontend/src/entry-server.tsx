/**
 * Build-time server entry — used ONLY by scripts/prerender.mjs.
 *
 * The app is a client-rendered Vite SPA whose shipped `dist/index.html` is an
 * empty `<div id="root">`. That means Google (partially) and the AI answer
 * crawlers that don't run JS (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
 * see a blank page — no headline, no offer, no story.
 *
 * This module renders the real React tree to an HTML string in pure Node (no
 * headless browser, so it runs anywhere — including Vercel's build image, which
 * lacks the system libraries Chromium needs). The prerender script injects the
 * result into `dist/index.html`'s `#root`. Humans still get the live SPA, which
 * mounts on top via `createRoot` (it replaces the prerendered markup — there is
 * no hydration contract to satisfy, so a perfect DOM match is not required).
 *
 * ── Why the streaming API and not renderToString ─────────────────────────
 * Every route except the homepage is `React.lazy`. `renderToString` does not
 * wait on Suspense, so rendering /pricing that way captures the FALLBACK — a
 * loading spinner — and we would have shipped a spinner as the crawlable copy
 * for the money pages, which is worse than shipping nothing.
 *
 * `renderToPipeableStream` resolves Suspense boundaries, and `onAllReady`
 * fires only once every lazy chunk has loaded and rendered. That is what makes
 * per-route prerendering possible at all.
 */

import { PassThrough } from 'node:stream';

import { renderToPipeableStream } from 'react-dom/server';

import App from './App';

/**
 * Render a route's full page markup (header + page + footer) to a string,
 * waiting for lazy routes to resolve.
 *
 * Rejects rather than returning partial markup: the caller treats any failure
 * as "skip this route and leave the SPA shell alone", so a broken render can
 * never overwrite a good file.
 */
export function render(path: string = '/', timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    sink.on('error', reject);
    sink.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));

    let settled = false;
    const { pipe, abort } = renderToPipeableStream(<App ssrPath={path} />, {
      onAllReady() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pipe(sink);
      },
      onError(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      abort();
      reject(new Error(`render(${path}) timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}
