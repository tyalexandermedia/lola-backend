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
 *       https://www.coachtyleads.com/start?session_id={CHECKOUT_SESSION_ID}
 *     /start branches on that parameter to show "You're in" and the intake,
 *     instead of selling to someone who just paid.
 *
 * In the link's settings:
 *   • Enable Apple Pay / Google Pay / Link — the one-tap path is most of the
 *     conversion win on a phone, and it is a checkbox.
 *   • Set the success redirect to:
 *       https://www.coachtyleads.com/start?session_id={CHECKOUT_SESSION_ID}
 *
 * If the constant is ever emptied, checkoutUrl() returns null and every caller
 * falls back to /apply — the site degrades to lead capture rather than
 * dead-ending.
 */

import { FOUNDER } from './lola';

/** Live $397/month Payment Link. Public by design — see the note above. */
const DEFAULT_MONTHLY_URL = 'https://buy.stripe.com/00w3cu8e6g3lcLTcTD3oA0c';

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
 * 2026-09-12: with the two-plan model (Local Visibility $397/mo + $397
 * activation, Local Growth System $797/mo + $997 launch, plus custom
 * Expansion), a generic "Start" button must NOT go straight to Stripe. The one
 * Payment Link is a single recurring charge that can't represent a chosen plan,
 * its one-time fee, or the territory-availability check — and docs/PRICING.md
 * requires plan terms to be clear before any charge. So every Start control now
 * routes through the site instead:
 *
 *   • Somewhere in the pitch (home, /vs, a case study) → `/pricing`, to see the
 *     two plans and the free Growth Score laid out.
 *   • Already ON the offer (/pricing, /start) → `/apply`, the intake form, which
 *     confirms plan + territory + scope, writes the applications row, captures
 *     UTMs and emails Ty the details.
 *
 * `checkoutUrl()` / `STRIPE_MONTHLY_URL` are intentionally preserved (the /start
 * success flow still branches on the Stripe session_id, and Ty can still hand a
 * link to a specific buyer), they're just no longer the target of a generic
 * Start button.
 *
 * Pass `atOffer` when the caller is already showing the offer. Same-tab links
 * everywhere — these are in-site navigations now, so target=_blank would only
 * strand the visitor in a detached tab.
 */
export function startHref(atOffer = false): string {
  return atOffer ? '/apply' : '/pricing';
}
