/// <reference types="vite/client" />
/**
 * Stripe checkout — ONE monthly subscription.
 *
 * 2026-08-15: the two one-time Payment Links (VITE_STRIPE_DIY_URL for the $197
 * DIY guide, VITE_STRIPE_BUILD_URL for the $997 build) are retired along with
 * the tiers they sold. There is a single paid offer now, so there is a single
 * link.
 *
 * ── The link ─────────────────────────────────────────────────────────────
 * A Stripe Payment Link is NOT a secret. It is a public URL a customer visits,
 * and it is already served inside this client bundle — so unlike an API key it
 * belongs in the code, where the site works on a fresh clone with no
 * configuration. VITE_STRIPE_MONTHLY_URL still overrides it, which is how you
 * point the site at a test-mode link without touching this file.
 *
 * Secret Stripe credentials (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) are a
 * different thing entirely and live in Railway, never here.
 *
 * The live link must be, and this file cannot verify:
 *   • RECURRING at $397/month — not one-time. Stripe prices are immutable, so
 *     a one-time price cannot be converted later; the link gets rebuilt.
 *   • Redirecting on success to:
 *       https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}
 *     /start branches on that parameter to show "You're in" and the intake,
 *     instead of selling to someone who just paid.
 *
 * In the link's settings:
 *   • Enable Apple Pay / Google Pay / Link — the one-tap path is most of the
 *     conversion win on a phone, and it is a checkbox.
 *   • Set the success redirect to:
 *       https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}
 *
 * If the constant is ever emptied, checkoutUrl() returns null and every caller
 * falls back to /apply — the site degrades to lead capture rather than
 * dead-ending.
 */

import { FOUNDER } from './lola';

/** Live $397/month Payment Link. Public by design — see the note above. */
const DEFAULT_MONTHLY_URL = 'https://buy.stripe.com/aFabJ00LEdVd3bj3j33oA07';

export const STRIPE_MONTHLY_URL =
  (import.meta.env.VITE_STRIPE_MONTHLY_URL as string | undefined)?.trim() ||
  DEFAULT_MONTHLY_URL;

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
 *   • Already ON the offer (/pricing, /start) → `/apply`, the intake form.
 *     Sending them to /pricing from /pricing is a dead button on the money
 *     page, which is exactly what the mobile sticky bar was doing.
 *
 * The offer-page fallback is the FORM, not a text. A text arrives with no
 * business name, no trade, no site — Ty has to run the whole qualification by
 * hand. /apply posts to the backend, writes the applications row and emails
 * him the details, so an unconfigured Payment Link still produces a real lead
 * record instead of a stranger's phone number. The pre-filled text stays
 * available as an explicit secondary ("or just text me").
 *
 * Pass `atOffer` when the caller is already showing the full offer.
 *
 * Deliberately a same-tab link everywhere. A Payment Link redirects back to
 * /start on success, so target=_blank just strands the customer in a detached
 * tab — and target on an `sms:` href is meaningless anyway.
 */
export function startHref(atOffer = false): string {
  return checkoutUrl() || (atOffer ? '/apply' : '/pricing');
}
