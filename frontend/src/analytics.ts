/// <reference types="vite/client" />
/**
 * PostHog wrapper. Single import surface so trackClick/identify stay stable
 * even if we swap providers later.
 *
 * Boot is lazy: if VITE_POSTHOG_KEY isn't set, all calls become console.log
 * shims so dev/staging still see events without spamming the prod project.
 *
 * Session recordings + heatmaps are enabled by default. To kill recording
 * for a specific page, call `posthog.opt_out_capturing()` from that route.
 */

import posthog from 'posthog-js';

// PostHog Project API key is a *public* client-side key (designed to be in
// browser bundles). Safe to commit. Override via env for staging/test projects.
const POSTHOG_KEY =
  ((import.meta as ImportMeta).env.VITE_POSTHOG_KEY as string | undefined) ||
  'phc_wSpZvSfqfZ9dLxujkupapvEbZyqLLQ5T6MZaBSd2XTXn';
const POSTHOG_HOST =
  ((import.meta as ImportMeta).env.VITE_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

let booted = false;

export function initAnalytics(): void {
  if (booted) return;
  booted = true;

  if (!POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.info('[analytics] VITE_POSTHOG_KEY not set — events logged locally only.');
    return;
  }

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
    loaded: (ph) => {
      if ((import.meta as ImportMeta).env.DEV) {
        ph.debug();
      }
    },
  });
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!booted) {
    // eslint-disable-next-line no-console
    console.log('[analytics:not-booted]', event, props);
    return;
  }
  if (!POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.log('[analytics:local]', event, props);
    return;
  }
  posthog.capture(event, props);
}

export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(distinctId, props);
}

export function reset(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

// Feature flag helper — backs A/B test infrastructure.
export function featureFlag(key: string): boolean | string | undefined {
  if (!POSTHOG_KEY) return undefined;
  return posthog.getFeatureFlag(key);
}
