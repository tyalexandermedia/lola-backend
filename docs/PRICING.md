# LOLA — Pricing & Offer (Canonical Source of Truth)

> **This file is the single source of truth for LOLA pricing and positioning.**
> When pricing changes, update THIS file first, then sync the three mirrors:
> - `frontend/src/lib/pricing.ts` (frontend constant — imported by all React surfaces)
> - `db/pricing.py` (backend constant — `/pricing` API + email reports)
> - `frontend/scripts/gen_lp.py` (landing-page generator constants — regenerate after)
>
> Last updated: 2026-07-07 — final offer reconciliation: simplified two-tier model
> (replaces the retired Foundation → Growth → Scale roadmap).

---

## Positioning

LOLA is the **AI Leads Expert** for local service businesses: we get you ranked on
Google **and** in the AI answer engines (ChatGPT, Perplexity, Gemini) — so you get found
when people ask for a company like yours, wherever they search now.

Core narrative:

- Every line answers **"what does this get me"** — calls, leads, rankings — never "what does
  this do" (no schema / backlinks / technical-SEO lectures).
- Plain-English AI-search line: *"We get you found when people ask ChatGPT or Google for a
  company like yours."*
- Confident, slightly ahead-of-the-curve authority voice. Zero jargon overload.

### Voice rules (hard constraints)

- **Never** call the free lead magnet an "audit." It is always the **Growth Score**.
- **Never** fabricate rankings, revenue, leads, or performance claims beyond the guarantee below.
- Only two paid options are ever shown on a page. No tier tables with more than two options.

---

## Lead magnet (free — top of funnel)

**Free Growth Score** — a 60-second scan of how you show up on Google and in AI answers,
plus the one move that lifts you fastest.

- Form fields: **Phone (required)**, **Business Name (required)**, **Website (required)**,
  **Email (optional)**.
- Consent checkbox (required), exact text:
  *"By submitting, you agree to receive texts and emails about your results."*
- Delivered via **text + email within 24 hours** of submission.
- No pricing mentioned on the opt-in form.

Funnel: **Free Growth Score → (DIY $197) or (Full Build $997) → optional $297/mo retainer (email only).**

---

## The two-tier offer

### Tier 1 — DIY
- **Price:** `$197` one-time
- **Positioning line:** *"See your score. Fix it yourself."*
- **Includes:** your full Growth Score · a simple 5-step fix-it checklist
- **Support:** self-service, no ongoing support included.
- **CTA:** "Get the DIY guide"
- One line up to the build: *"Prefer we just handle it? See the full build."*

### Tier 2 — Full Build
- **Price:** `$997` one-time
- **Positioning line:** *"We build it. We rank it — everywhere people search now."*
- **Includes (4–5 bullets max):**
  - Custom website build
  - 30 days of visibility work across Google and AI answer engines (ChatGPT, Perplexity, Gemini)
  - Google Business Profile optimization
  - Direct access to Ty during the build
- **Guarantee:** Half-Back Guarantee (below) — attached to this tier specifically.
- **Onboarding line:** *"We'll choose your 5 target keywords together in week 1."*
- **CTA:** "Book a Call" or "Start My Build" (one CTA per surface).

---

## Optional retainer — EMAIL ONLY (never on any page)

- **$297/month** ongoing management. Totally optional. (D-013: standardized to $297 —
  matches the nurture default, GO-LIVE, COWORK_BRIEF, and the Stripe Managed link.)
- Introduced **only in the final follow-up email touch** after a prospect has engaged, framed
  exactly as:
  > "Once it's live, some clients want us to keep it optimized — that's $297/month, totally optional."

---

## Guarantee (exact language — use on $997 build surfaces)

> **Half-Back Guarantee**
> We pick 5 money keywords for your business together in week 1. If we don't get at least 1 of
> them ranking on page 1 or in the map pack within 30 days, you get half your investment back.
> No fine print.

The old **First Win Promise** is retired. Half-Back is the only guarantee.

---

## FAQ addition (on $997 build surfaces)

> **What if you don't rank me?**
> You get half back, no argument. We only succeed if you do.

---

## The Growth Score (dashboard positioning)

The client dashboard stays the **Growth Score** — every client logs in and sees where they
are. Dimensions (0–100 each, rolled into an overall score):

1. **Foundation**
2. **Growth**
3. **Authority**
4. **AI Visibility**
5. **Reputation**
6. **Revenue Tracking**

Dashboard tracks (available when connected): calls · forms · messages · website clicks · Google
Business activity · SEO movement.

---

## SMS / text compliance

Every outbound text/SMS template — initial outreach, follow-ups, GHL-automated sequences, and
the Growth Score delivery text — must include the opt-out line: **"Reply STOP to opt out."**

---

## Reusable-template tokens

Flag vertical- and case-study-specific mentions with `{{VERTICAL}}` and `{{CASE_STUDY}}` so this
becomes a reusable template for future verticals (plumbing, roofing, soft wash). Primary vertical
today: **HVAC (Tampa Bay)**. Proof story: **Sandbar** (map-pack before/after).
