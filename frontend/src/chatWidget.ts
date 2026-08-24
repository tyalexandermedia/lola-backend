/// <reference types="vite/client" />
/**
 * GoHighLevel (LeadConnector) web-chat widget loader.
 *
 * Dormant by default — the same safe-by-default posture as every other
 * integration in this codebase (GHL webhook, Twilio, the explainer video).
 * If VITE_GHL_CHAT_WIDGET_ID is unset, nothing is injected and no chat bubble
 * ever appears. Paste the widget id from GHL and the bubble goes live
 * site-wide on the next deploy — no code change.
 *
 * Where the id comes from (GHL): Sites → Chat Widget → build/style the widget →
 * Copy embed code → use the value of `data-widget-id`. Drop it into
 * VITE_GHL_CHAT_WIDGET_ID (Vercel env) and redeploy.
 *
 * Loaded deferred (requestIdleCallback, after first paint) so the third-party
 * chat bundle never blocks render — same approach as analytics.ts. Runs only in
 * the browser, so the prerender/SSR pass (entry-server.tsx) is untouched.
 *
 * The loader + resources URLs are LeadConnector-global — identical for every
 * account — so only the per-account widget id is required. The two URLs are
 * overridable via env only for the white-label / resource-domain-moved case.
 */

const WIDGET_ID = (
  (import.meta as ImportMeta).env.VITE_GHL_CHAT_WIDGET_ID as string | undefined
)?.trim();

const LOADER_SRC =
  ((import.meta as ImportMeta).env.VITE_GHL_CHAT_LOADER_SRC as
    | string
    | undefined)?.trim() || 'https://widgets.leadconnectorhq.com/loader.js';

const RESOURCES_URL =
  ((import.meta as ImportMeta).env.VITE_GHL_CHAT_RESOURCES_URL as
    | string
    | undefined)?.trim() ||
  'https://widgets.leadconnectorhq.com/chat-widget/loader.js';

let injected = false;

function inject(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement('script');
  s.src = LOADER_SRC;
  s.async = true;
  s.setAttribute('data-resources-url', RESOURCES_URL);
  s.setAttribute('data-widget-id', WIDGET_ID as string);
  document.body.appendChild(s);
}

export function initChatWidget(): void {
  if (typeof window === 'undefined') return; // never run during prerender/SSR
  if (!WIDGET_ID) {
    // eslint-disable-next-line no-console
    console.info(
      '[chat] VITE_GHL_CHAT_WIDGET_ID not set — chat widget dormant.'
    );
    return;
  }
  // Defer past first paint so the chat bundle never blocks render.
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(inject, { timeout: 3000 });
  } else {
    setTimeout(inject, 1500);
  }
}
