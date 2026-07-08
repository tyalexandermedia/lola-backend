/// <reference types="vite/client" />
/**
 * Stripe Payment Links — pay-now → instant access.
 *
 * The two links are created in the Stripe dashboard (one for the $197 DIY guide,
 * one for the $997 Full Build) and injected at build time:
 *   VITE_STRIPE_DIY_URL=https://buy.stripe.com/...
 *   VITE_STRIPE_BUILD_URL=https://buy.stripe.com/...
 *
 * Set each link's success redirect in Stripe to the matching access page:
 *   DIY   → https://lola.tyalexandermedia.com/diy?session_id={CHECKOUT_SESSION_ID}
 *   Build → https://lola.tyalexandermedia.com/build/start?session_id={CHECKOUT_SESSION_ID}
 *
 * Until a link is configured, checkoutUrl() returns null and callers fall back
 * to their prior behavior (free Growth Score / book a call), so nothing breaks
 * before the links exist.
 */

export const STRIPE_DIY_URL =
  (import.meta.env.VITE_STRIPE_DIY_URL as string | undefined)?.trim() || '';
export const STRIPE_BUILD_URL =
  (import.meta.env.VITE_STRIPE_BUILD_URL as string | undefined)?.trim() || '';

export type PaidTier = 'diy' | 'build';

/** The Stripe Payment Link for a tier, or null if not configured yet. */
export function checkoutUrl(tier: PaidTier): string | null {
  const url = tier === 'diy' ? STRIPE_DIY_URL : STRIPE_BUILD_URL;
  return url || null;
}

/** True once at least one Payment Link is configured. */
export function checkoutEnabled(): boolean {
  return Boolean(STRIPE_DIY_URL || STRIPE_BUILD_URL);
}
