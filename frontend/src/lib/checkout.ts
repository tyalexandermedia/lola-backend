/// <reference types="vite/client" />
/**
 * Stripe checkout — ONE monthly subscription.
 *
 * 2026-08-15: the two one-time Payment Links (VITE_STRIPE_DIY_URL for the $197
 * DIY guide, VITE_STRIPE_BUILD_URL for the $997 build) are retired along with
 * the tiers they sold. There is a single paid offer now, so there is a single
 * link.
 *
 * ── Env var to set ───────────────────────────────────────────────────────
 *   VITE_STRIPE_MONTHLY_URL=https://buy.stripe.com/...
 *
 * Create it in Stripe as a **recurring** Payment Link at $397/month, and in the
 * link's settings:
 *   • Enable Apple Pay / Google Pay / Link — the one-tap path is most of the
 *     conversion win on a phone, and it is a checkbox.
 *   • Set the success redirect to:
 *       https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}
 *
 * Until it is configured, checkoutUrl() returns null and every caller falls
 * back to the free Growth Score or booking a call — so nothing breaks or dead-
 * ends before the link exists.
 */

export const STRIPE_MONTHLY_URL =
  (import.meta.env.VITE_STRIPE_MONTHLY_URL as string | undefined)?.trim() || '';

/** The Stripe Payment Link for the monthly plan, or null if not configured. */
export function checkoutUrl(): string | null {
  return STRIPE_MONTHLY_URL || null;
}

/** True once the monthly Payment Link is configured. */
export function checkoutEnabled(): boolean {
  return Boolean(STRIPE_MONTHLY_URL);
}
