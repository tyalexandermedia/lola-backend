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
 */

import { renderToString } from 'react-dom/server';
import App from './App';

/** Render a route's full page markup (header + page + footer) to a string. */
export function render(path: string = '/'): string {
  return renderToString(<App ssrPath={path} />);
}
