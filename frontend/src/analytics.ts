/// <reference types="vite/client" />
/**
 * PostHog wrapper. Single import surface so track/identify stay stable even if
 * we swap providers later.
 *
 * Boot is deferred + code-split: posthog-js (~150KB) is dynamically imported
 * during browser idle time AFTER first paint, so analytics never blocks
 * render/hydration (the old static import bundled it into the critical path).
 * Events fired before the library finishes loading are buffered and flushed on
 * load, so early conversions aren't lost. If VITE_POSTHOG_KEY isn't set, all
 * calls become console.log shims so dev/staging still see events.
 *
 * Session recordings + heatmaps are enabled by default. To kill recording for
 * a specific page, call `posthog.opt_out_capturing()` from that route.
 */

import type { PostHog } from 'posthog-js';

// PostHog Project API key is a *public* client-side key (designed to be in
// browser bundles). Safe to commit. Override via env for staging/test projects.
const POSTHOG_KEY =
  ((import.meta as ImportMeta).env.VITE_POSTHOG_KEY as string | undefined) ||
  'phc_wSpZvSfqfZ9dLxujkupapvEbZyqLLQ5T6MZaBSd2XTXn';
const POSTHOG_HOST =
  ((import.meta as ImportMeta).env.VITE_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

// Loaded instance (null until the deferred dynamic import resolves).
let ph: PostHog | null = null;
let booting = false;

// Buffers for calls made before PostHog finishes loading. Capped so a failed
// load can never grow them unbounded.
const queue: Array<{ event: string; props?: Record<string, unknown> }> = [];
let pendingIdentify: { id: string; props?: Record<string, unknown> } | null = null;

function flush(): void {
  if (!ph) return;
  if (pendingIdentify) {
    ph.identify(pendingIdentify.id, pendingIdentify.props);
    pendingIdentify = null;
  }
  while (queue.length) {
    const q = queue.shift()!;
    ph.capture(q.event, q.props);
  }
}

function boot(): void {
  if (ph || booting) return;
  booting = true;
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: { password: true, email: false },
        },
        // Heatmaps require autocapture (already on)
        enable_heatmaps: true,
        loaded: (loaded) => {
          if ((import.meta as ImportMeta).env.DEV) {
            loaded.debug();
          }
        },
      });
      ph = posthog;
      flush();
    })
    .catch(() => {
      // Analytics is non-critical — never surface a load failure to users.
      booting = false;
    });
}

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.info('[analytics] VITE_POSTHOG_KEY not set — events logged locally only.');
    return;
  }
  // Defer the load past first paint so the analytics bundle never blocks
  // render. requestIdleCallback when available, otherwise a short timeout.
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(boot, { timeout: 3000 });
  } else {
    setTimeout(boot, 1500);
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.log('[analytics:local]', event, props);
    return;
  }
  if (ph) {
    ph.capture(event, props);
    return;
  }
  // Buffer until the deferred library loads (bounded so it can't leak).
  if (queue.length < 50) queue.push({ event, props });
}

export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  if (ph) {
    ph.identify(distinctId, props);
    return;
  }
  pendingIdentify = { id: distinctId, props };
}

export function reset(): void {
  if (!POSTHOG_KEY) return;
  ph?.reset();
}

// Feature flag helper — backs A/B test infrastructure. Returns undefined until
// PostHog has loaded (callers already treat undefined as "no flag / control").
export function featureFlag(key: string): boolean | string | undefined {
  if (!POSTHOG_KEY || !ph) return undefined;
  return ph.getFeatureFlag(key);
}
