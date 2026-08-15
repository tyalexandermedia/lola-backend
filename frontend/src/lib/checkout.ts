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

import { FOUNDER } from './lola';

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

/** Pre-filled text to Ty — the buy path until the Payment Link exists. */
export function startSmsHref(
  message = "Hi Ty — I want to start the $397/month plan.",
): string {
  return `sms:${FOUNDER.phone}?&body=${encodeURIComponent(message)}`;
}

/**
 * Where a "Start" control should point.
 *
 * With the Payment Link configured this is always checkout — every Start button
 * on the site goes straight there, no interstitial. Until it is, the fallback
 * has to depend on where the reader is standing:
 *
 *   • Somewhere in the pitch (home, /vs, a case study) → `/pricing`. They
 *     haven't seen the offer laid out yet, so the page is the right next step.
 *   • Already ON the offer (/pricing, /start) → the pre-filled text. Sending
 *     them to /pricing from /pricing is a dead button on the money page, which
 *     is exactly what the mobile sticky bar was doing.
 *
 * Pass `atOffer` when the caller is already showing the full offer.
 *
 * Deliberately a same-tab link everywhere. A Payment Link redirects back to
 * /start on success, so target=_blank just strands the customer in a detached
 * tab — and target on an `sms:` href is meaningless anyway.
 */
export function startHref(atOffer = false): string {
  return checkoutUrl() || (atOffer ? startSmsHref() : '/pricing');
}
