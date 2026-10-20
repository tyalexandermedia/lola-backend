# Build Brief F4 — Charge the real plans: $797/mo + one-time setup fees (the money-path gap)

**Status:** DRAFT — awaiting Ty's approval. **The heaviest, most sensitive change in the series: it touches money.** No change ships until approved; built behind a flag, validated in Stripe **test mode** (never a real card), fail-closed webhook preserved.
**Date:** 2026-10-19 · **Repo:** tyalexandermedia/lola-backend · **Author:** Claude (implementation layer)
**Why:** today the system can only charge **$397/mo**. The recommended **$797/mo** plan and **both** one-time fees ($397 activation / $997 launch) have **no code path** — they're collected by hand or not at all. This is the one backlog item with direct dollars attached.

> **Money-path guardrails up front** (CLAUDE.md: "money paths fail closed"). Everything below is built behind `STRIPE_CHECKOUT_SESSIONS=false` (dormant), proven end-to-end against **Stripe test keys + test cards** before any live key is touched, keeps the webhook's fail-closed HMAC verification, and never guesses a fulfillment. Nothing live changes until Ty flips the flag with live keys.

---

## 0. What I verified in code first

- **One paid charge exists:** the `$397/mo` Payment Link (`main.py:331` `STRIPE_MONTHLY_URL`, `checkout.ts:42`). `STRIPE_MONTHLY_AMOUNT=39700` (`main.py:344`). No link, price, or path for `$797/mo`, `$397 activation`, or `$997 launch`.
- **Fulfillment is amount-based and fragile:** `_tier_for_amount(amount)` (`main.py:4011-4027`) returns `"monthly"` for `>= 39700`, else `None`. Its own docstring records a past **live-fire bug**: a $397/mo payer was classified "diy" and sent a retired page. Amount-matching **cannot** safely distinguish $797/mo from a $997 one-time from a combined first invoice. **F4 must fulfill by session metadata, not amount.**
- **The backend already calls Stripe via raw httpx + `STRIPE_SECRET_KEY`** (`_stripe_get_session`, `main.py:3994-4008`; `/checkout/verify`, `:4030`). So *creating* a Checkout Session is the same pattern (`POST /v1/checkout/sessions`) — **no new dependency, no SDK**. The key is already an env (`main.py:339`), used today when set.
- **The webhook fails closed** (`main.py:4105`, 503 w/o secret; HMAC verify; paid-only) and now also carries the dormant F5 customer push. Any F4 change must stay inside that contract.
- **`checkout.ts` already documents why static links can't solve this** (`:65-85`): "a generic Start button must NOT go straight to Stripe… one Payment Link… can't represent a chosen plan, its one-time fee, or the territory-availability check — and docs/PRICING.md requires plan terms to be clear before any charge." The architecture already anticipates F4.
- **Territory exclusivity** (one client per trade per territory, `PRICING.md`) means a **pure one-click self-serve checkout is impossible** — you can't let two roofers in one town both buy. There must be a gate.

---

## 1. The problem (F4)

```
Local Visibility  $397/mo + $397 activation   → only the $397/mo recurring is chargeable; activation is manual
Local Growth Sys  $797/mo + $997 launch       → NOTHING is chargeable in code
Expansion         custom                        → manual (fine; stays manual)
```

So your pushed, recommended offer can't actually be bought through the system, and no setup fee is ever collected automatically. The site funnels every buyer to `/apply` (correct — the gate), but after approval there's no systematized way to take the right money.

---

## 2. The design — approval-gated, server-created Checkout Sessions

**The gate is Ty's approval** (which is already how it works — every application is reviewed, F6). That human step IS the territory check. Pure self-serve stays off the table until there's an automated availability check (a later enhancement, not MVP).

**Recommended flow:**
```
/apply (exists)           applicant picks plan + submits; emailed to Ty; (F5) lands in GHL
   │
Ty reviews + confirms      territory open? scope agreed? → APPROVE
   │
backend mints a Stripe     Checkout Session for THAT plan:
Checkout Session             • mode = subscription (the recurring price)
                             • one-time setup fee on the first invoice
                               (subscription_data.add_invoice_items)
                             • metadata = { plan, application_id }
                             • success_url = /start?session_id={CHECKOUT_SESSION_ID}
   │
buyer pays (card/Apple Pay) hosted by Stripe
   │
webhook fulfills BY METADATA (plan), not amount → subscription live + setup fee captured in one go
```

**Why not the cheap alternatives** (stated so the choice is honest):
- **More static Payment Links** (one per plan/fee): can't bundle the one-time fee with the subscription, can't carry per-application metadata, can't gate territory, and keeps the fragile amount-matching. **Not recommended.**
- **Stripe Invoices** (approve → Stripe emails a hosted invoice): workable for one-time, clumsier for subscription + setup in one. A fine fallback, but Checkout Sessions are cleaner for subscription + first-invoice setup fee.

**Key Stripe mechanics (so implementation is correct):** in `mode: subscription`, line items must be recurring; the one-time setup fee is added via `subscription_data.add_invoice_items: [{ price: <setup_price_id> }]` so it lands on the first invoice — one payment, one session. Stripe Prices are immutable (set once).

---

## 3. Exact changes (components to modify)

| Change | File | Note |
|--------|------|------|
| `create_checkout_session(plan, application_id, email)` — raw httpx `POST /v1/checkout/sessions` (mode=subscription, recurring price + `add_invoice_items` setup fee, `metadata={plan, application_id}`, success_url=/start). Returns the URL. | `main.py` (near `_stripe_get_session`) | Mirrors the existing Stripe-over-httpx pattern. |
| Admin-gated trigger to generate + send the approved buyer's checkout link (reuse `X-Admin-Key`, like `/applications` GET). Simplest: a link in Ty's application-notification email that, when he clicks "approve", creates the session and emails the buyer. | `main.py` + `_send_application_notification` | Keeps the human territory gate. |
| **Fulfill by metadata first:** read `session.metadata.plan`; fall back to `_tier_for_amount` only for the legacy $397 link. Preserve "unrecognized → skip, don't guess." | `main.py` webhook `:4117+` | Fixes the fragility; back-compat with the live link. |
| **Idempotency:** guard against Stripe's duplicate webhook deliveries so a customer isn't provisioned twice (record fulfilled session ids). | `main.py` webhook | Real provisioning must be idempotent. |
| New env + flag: `STRIPE_CHECKOUT_SESSIONS` (default `false`), price IDs `STRIPE_PRICE_GROWTH_MONTHLY` / `STRIPE_PRICE_GROWTH_LAUNCH` / `STRIPE_PRICE_VISIBILITY_MONTHLY` / `STRIPE_PRICE_VISIBILITY_ACTIVATION`. | `main.py` | Dormant + safe-by-default; unset → new path off, `/apply` unchanged. |
| (Minimal, later) a frontend "complete your checkout" surface if we move from emailed links to on-site. | `frontend/` | **Not in MVP** — MVP uses an emailed link after approval. |

**Reuses what exists:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the `/start?session_id=` success flow, `_stripe_get_session`, `/checkout/verify`. No new paid dependency.

---

## 4. Money-path safety (non-negotiable)

- **Stripe TEST MODE for all development + validation.** Test secret key + test price IDs + Stripe test cards (`4242…`). **No real card, ever,** until the live cutover.
- **Webhook stays fail-closed:** HMAC verification untouched; new fulfillment runs only on verified, paid events; unrecognized plan/metadata → skip (never guess), same principle as today.
- **Idempotent fulfillment** so a retried webhook can't double-charge-provision.
- **Feature-flagged + dormant:** `STRIPE_CHECKOUT_SESSIONS=false` ships inert; `/apply` + the $397 link behave exactly as today until Ty activates with live keys.
- **Prices set once in Stripe** (immutable) and matched to canon: `$797/mo`, `$997` launch, `$397/mo`, `$397` activation — no pricing change, just wiring the existing numbers.

---

## 5. Your Stripe setup (test mode first)

In your Stripe dashboard (Test mode), create Products + Prices and give me the IDs:
- Local Growth System: recurring **$797/mo** price + one-time **$997** launch price.
- Local Visibility: recurring **$397/mo** price + one-time **$397** activation price.
- Confirm `STRIPE_SECRET_KEY` (test) + `STRIPE_WEBHOOK_SECRET` (test) are set in a staging/Railway env for validation.
I'll hand you the exact session-creation spec so the dashboard setup is copy-paste.

---

## 6. Rollout (Railway + Stripe test → live)

1. Build behind `STRIPE_CHECKOUT_SESSIONS=false` with **test** Stripe keys/prices.
2. Validate the full flow with **test cards**: approve an application → session minted → pay test card → webhook fulfills **by metadata** → subscription + setup fee show in Stripe test → buyer lands on `/start`.
3. Cut over: set **live** keys + live price IDs, flip `STRIPE_CHECKOUT_SESSIONS=true`.
4. Rollback = flip the flag `false` → falls back to `/apply` + the $397 link. (Deploy is Railway, gated — yours.)

---

## 7. Test plan (synthetic only)

- Unit: `create_checkout_session` builds the right line items + metadata per plan (no network — stub httpx, like `test_ghl_bridge.py`).
- Webhook: a test `checkout.session.completed` with `metadata.plan="growth"` fulfills as growth; an unrecognized metadata → skipped (no guess); the existing $397-amount path still works; a duplicate event is a no-op (idempotency). Extend `test_stripe_webhook_failclosed.py` / add a fulfillment test.
- E2E in Stripe **test** mode with `4242 4242 4242 4242`. **Never a live charge in testing.**

---

## 8. Decisions for Ty

1. **Approach:** approval-gated server-created Checkout Sessions (recommended) — confirm, vs. the cheaper static-link option (not recommended, can't bundle the setup fee).
2. **One payment or two:** setup fee on the **same** first invoice as the subscription (recommended) vs. a separate charge.
3. **Trigger:** emailed "approved — complete checkout" link after you approve (recommended MVP) vs. an admin dashboard button vs. (later) automated territory check for true self-serve.
4. **Stripe setup:** you create the test-mode Products/Prices (I give the spec) and confirm the secret/webhook keys are in a staging env.
5. **Scope:** MVP = the **Growth System ($797 + $997)** only, or both plans wired at once? (Rec: wire both — the code is the same, only price IDs differ.)

---

## 9. Effort / risk / honest alternative

**Effort:** M–L — the biggest brief. Backend session creation + metadata fulfillment + idempotency + tests + your Stripe config + a staged test→live cutover.
**Risk:** Medium–High (it's money) — mitigated by test-mode-first, the dormant flag, the preserved fail-closed webhook, metadata fulfillment, and idempotency.
**Honest alternative:** at under ~5 clients, **manually invoicing** the $797 + setup fee in Stripe is a perfectly fine interim — F4 pays off as volume grows and makes the buy feel professional/instant. Worth **building test-mode-ready now** so it's there when you want it; not worth rushing a live money path.

---

## 10. Out of scope / preserve

The $397 Payment Link (back-compat), the fail-closed webhook + HMAC, `/start` success flow, `/checkout/verify`, the canonical prices (no change — F4 only *wires* them), territory exclusivity (the approval gate stays), no frontend redesign in MVP. F4 does **not** touch the Growth Score, GHL (beyond the existing F5 customer push firing on the new purchases too), or any other money logic.

## Rollout gate
Approve §8 → I build behind the flag against **test** Stripe, add tests, and hand you (a) the Stripe Products/Prices spec and (b) the env + cutover steps. The live-key cutover + the flag flip are **yours**. Nothing live until then.
