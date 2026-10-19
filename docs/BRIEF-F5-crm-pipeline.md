# Build Brief F5 — Put applicants + customers into GoHighLevel (complete the CRM pipeline)

**Status:** DRAFT — awaiting Ty's approval. **Backend change** (first one in this series). No pricing, no frontend, no new paid dependency. Safe-by-default + money-path fail-closed preserved.
**Date:** 2026-10-19 · **Repo:** tyalexandermedia/lola-backend · **Author:** Claude (implementation layer)
**Why this one:** highest-leverage item left in the audit — your hottest leads (applicants) and your actual paying customers never reach the CRM automatically today. Follow-up and onboarding ride entirely on you seeing an email.

> **Two moving parts.** F5 is (1) a small backend change *I* make, and (2) a GoHighLevel workflow *you* configure (no-code, in the GHL workflow builder). The code does nothing useful until the GHL side exists — so the code ships **dormant by default** and you flip it on when GHL is ready. Nothing here deploys to production without your separate approval.

---

## 0. What I verified in code first (so none of this is a guess)

- **The bridge is an inbound webhook, not the GHL API** (`api_clients/ghl.py`). The backend POSTs a flat JSON payload to `GHL_INBOUND_WEBHOOK_URL`; your GHL *workflow* maps the keys onto contact fields, tags, and pipeline stage (the file's own docstring says so, `ghl.py:4-11,19-21,116`). Today it sends `source`, `tags:["growth-score"]`, `pipeline_stage:"New Growth Score Lead"` (`ghl.py:35-36,117-126`).
- **It only fires on the Growth Score** — `asyncio.create_task(push_growth_score_lead(...))` at `main.py:1390-1401`. That's the exact fire-and-forget, safe-by-default pattern to reuse.
- **`/applications` pushes nothing to GHL** (`main.py:1776-1802`): it validates, `save_application(...)` to SQLite, then `_send_application_notification(...)` (Resend email to applicant + ty@). No GHL. Fields captured: first/last name, email, business, website, `monthly_revenue`, `trade`, `frustration`, `tier` (`ApplicationRequest`, `main.py:1669-1679`). **No phone field** → email-only contact, no new SMS-consent surface.
- **The Stripe webhook pushes nothing to GHL** (`main.py:4067-4137`). It **fails closed** (503 without `STRIPE_WEBHOOK_SECRET`), verifies the HMAC signature, handles only paid `checkout.session.completed`, then fires `asyncio.create_task(mark_followup_purchased(...))`, `mark_audit_submitted`, `_send_purchase_email`, `send_sms`, and returns 200. It has `email`, `phone`, `tier`, `amount`, `session_id` to work with.
- **Safe-by-default is the house rule** (`ghl.py:8-11`, CLAUDE.md): every integration no-ops when its env var is blank and swallows network errors so the real flow never breaks.
- **Heads-up for implementation (not an F5 fix):** `ApplicationRequest.tier` is documented as `retainer | pro | both` (`main.py:1678`) but the live apply form sends `visibility | growth | expansion`. Map whatever actually arrives to the GHL tag; don't assume. Flagging it, not fixing it here.

---

## 1. The problem (F5)

```
Growth Score lead  → GHL ✅ (contact, "growth-score" tag, "New Growth Score Lead" stage)
Application        → SQLite + email to Ty ❌ not in GHL
Paid customer      → email + SMS, follow-up stopped ❌ not in GHL
```

So the two highest-intent events in the funnel — someone *applying* and someone *paying* — never enter the pipeline as a stage move. Your CRM knows your free top-of-funnel but not your money. Consequence: onboarding and follow-up depend on you catching an email; there's no automated "applicant → nurture" or "customer → onboarding" sequence, and no clean pipeline view of where real revenue is.

---

## 2. The design (minimal, safe, reuses what exists)

**Backend (me):** two new pushes that mirror `push_growth_score_lead`, plus the shared bridge refactor so there's no copy-paste.

- Generalize the existing push into a private `_bridge_contact(*, source, tags, pipeline_stage, event, distinct_id, **contact)` in `ghl.py`. `push_growth_score_lead` becomes a thin wrapper over it (behavior **unchanged**).
- `push_application_lead(...)` — source `"application"`, tags `["application", f"plan-{tier}"]`, stage `GHL_PIPELINE_STAGE_APPLICATION`, maps trade / revenue band / frustration / tier. PostHog event `ghl_application_bridged`.
- `push_customer(...)` — source `"customer"`, tags `["customer", f"plan-{tier}"]`, stage `GHL_PIPELINE_STAGE_CUSTOMER`, maps tier / amount / session_id. PostHog event `ghl_customer_bridged`.

**Both new pushes are gated by their own opt-in flag, default OFF** (`GHL_BRIDGE_APPLICATIONS`, `GHL_BRIDGE_PURCHASES`). So the code merges and deploys with **zero behavior change** until you configure GHL and flip the flags. This is the safety valve that lets a backend change ship without risk.

**GHL side (you, no-code):** extend the inbound-webhook workflow (or add two) to route the new `source` values:
- `source: application` → create/update contact, tag `application`, move to your "Applied / Reviewing" stage, (optional) start an applicant nurture.
- `source: customer` → create/update contact, tag `customer`, move to your "Customer / Won" stage, start onboarding automation.

**Fail-closed preserved:** the customer push sits in the webhook **after** signature verification and the `paid` check, as one more `asyncio.create_task(...)` side effect next to `mark_followup_purchased`. It can't block, can't change fulfillment, can't affect the 200 to Stripe, and only ever runs on a verified, paid event. A GHL outage = a swallowed error, nothing more.

---

## 3. Exact changes (Deliverable: components to modify)

| Change | File | Note |
|--------|------|------|
| Refactor to `_bridge_contact(...)`; keep `push_growth_score_lead` as a wrapper (unchanged behavior); add `push_application_lead(...)` + `push_customer(...)`; add `ghl_application_bridged` / `ghl_customer_bridged` PostHog events. | `api_clients/ghl.py` | Mirrors the existing push exactly. |
| New constants/env: `GHL_BRIDGE_APPLICATIONS` (default `false`), `GHL_BRIDGE_PURCHASES` (default `false`), `GHL_PIPELINE_STAGE_APPLICATION` (default `"Application"`), `GHL_PIPELINE_STAGE_CUSTOMER` (default `"Customer"`). | `api_clients/ghl.py` | Dormant until you flip the flags. |
| After `save_application(...)`, add `asyncio.create_task(push_application_lead(...))`. | `main.py:~1797` | Same pattern as `/audit`; never blocks the response. |
| Next to `mark_followup_purchased(...)`, add `asyncio.create_task(push_customer(...))`. | `main.py:~4120` | Post-verification, post-paid, fire-and-forget. |
| **F7 rider (recommended):** add `asyncio.create_task(posthog_capture("purchase", ...))` in the webhook. | `main.py:~4120` | Closes the apply→sale measurement gap from Brief #2 §7.2, same file, same safe pattern. |

**Env vars already present and reused (no new secret):** `GHL_INBOUND_WEBHOOK_URL`, `POSTHOG_API_KEY`. No new paid dependency.

---

## 4. Your GHL setup (the dependency — code is inert without it)

In the GHL workflow builder (same place the "New Growth Score Lead" mapping already lives):
1. Confirm contact de-dup is by email/phone (GHL default) so a Growth Score → application → purchase updates **one** contact and moves it forward, not three duplicates.
2. Branch the inbound-webhook workflow on `source`: `growth-score` (exists) → leave as-is; `application` → Applied stage + tag + (optional) nurture; `customer` → Customer/Won stage + tag + onboarding.
3. Any **SMS** automation you attach must include "Reply STOP to opt out" (existing compliance rule — unchanged).

I'll give you the exact field list each payload sends so the mapping is copy-paste.

---

## 5. Rollout (backend = Railway, not Vercel — different from Briefs #1/#2)

1. **Ship dormant.** Merge the code; deploy to Railway. With both flags default-off, **nothing changes** — the growth-score push keeps working exactly as today.
2. **You configure GHL** (step 4 above) and confirm the stage names.
3. **Activate under your control:** set `GHL_PIPELINE_STAGE_*`, then flip `GHL_BRIDGE_APPLICATIONS=true`, verify, then `GHL_BRIDGE_PURCHASES=true`.
4. Because activation is env-flag only, rollback = flip the flag back to `false` (no redeploy).

> Railway production deploys are gated/manual on your side — so this brief's build step is "merge to the branch + verify locally/staging"; the actual Railway promotion + env flips are yours, same as the GBP env work.

---

## 6. Test plan (synthetic only — never a real charge)

- **Applications:** POST a throwaway application to a staging/local backend with `GHL_BRIDGE_APPLICATIONS=true` → confirm one GHL contact appears, tagged `application`, in the Applied stage. Confirm `ghl_application_bridged` lands in PostHog.
- **Purchases:** fire a **Stripe test-mode** `checkout.session.completed` (Stripe CLI / test webhook) → confirm the customer contact + stage move + `ghl_customer_bridged` + the `purchase` event. **No live card, ever.**
- **Safety:** confirm both pushes no-op with flags off; confirm a simulated GHL 500/timeout is swallowed and the endpoint still returns normally; confirm the webhook still returns 200 and fulfills email/SMS even if the GHL push fails.

---

## 7. Decisions for Ty

1. **Stage names** — what exactly are your "Applied" and "Customer/Won" stages called in GHL? (I'll default to "Application"/"Customer"; you confirm.)
2. **Plan tag** — add `plan-visibility` / `plan-growth` / `plan-expansion` to the contact? (Rec: yes — lets you segment by offer.)
3. **F7 purchase event** — include it in this same change? (Rec: yes — same file, free measurement win.)
4. **Confirm you'll build the GHL workflow** — this is the hard dependency; the code is inert without it.

---

## 8. Effort / risk / preserve

**Effort:** S–M — ~2 new functions + a small refactor + 2 call sites + 4 env flags.
**Risk:** Low–Medium. One call site is in the money-path webhook, so the change is strictly **additive, post-verification, fire-and-forget, dormant-by-default** — no existing behavior changes until you activate, and the fail-closed logic is untouched.
**Preserve / out of scope:** the fail-closed verification + HMAC + `_tier_for_amount` + fulfillment emails/SMS + `mark_followup_purchased`; the growth-score push (becomes a wrapper, behavior identical); no frontend, no pricing, no new paid dependency. F4 ($797 + one-time checkout) stays its own future brief.

---

## 9. Rollout gate

Approve the §7 decisions → I implement on the branch, validate locally + with synthetic/test events, and hand you (a) the exact GHL field-mapping list and (b) the env flags to flip. Code ships dormant; **you** own the GHL workflow + the activation flips. Nothing live changes until then.
