# LOLA — Pricing & Offer (Canonical Source of Truth)

> **This file is the single source of truth for LOLA pricing and positioning.**
> When pricing changes, update THIS file first, then sync the three mirrors:
> - `frontend/src/lib/pricing.ts` (frontend constant — imported by all React surfaces)
> - `db/pricing.py` (backend constant — `/pricing` API + email reports)
> - `frontend/scripts/gen_lp.py` (landing-page generator constants — regenerate after)
>
> Last updated: 2026-08-15 — **collapsed to a single paid offer.** The free Growth
> Score now leads to ONE all-inclusive monthly plan. The two-tier one-time model
> (DIY $197, Full Build $997) and the Half-Back Guarantee are retired: that
> guarantee was written against a one-time build that no longer exists.

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
- **One** paid option is ever shown. No tier tables, no comparison grid — a single price and a single button. Choice is friction when there is only one right answer.

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

Funnel: **Free Growth Score → the monthly plan.** One free thing, one paid thing, nothing in between.

---

## The offer — one all-inclusive monthly

> **MONTHLY_PRICE = `$397/month`** — change it HERE and nowhere else, then sync the
> three mirrors listed at the top of this file. Every surface reads from those.

- **Price:** `$397`/month, all-inclusive. No setup fee. No one-time build charge.
- **Positioning line:** *"Website design included free. Then I get you found."*
- **Day framing (use under the price):** *"About $13/day — one new client covers months."*
- **Includes (4–5 bullets max):**
  - Your website designed and built — **included free**, no setup fee
  - Written so AI can read it, so ChatGPT and Google name *you* when someone asks
  - Google Business Profile managed and posted to — the map pin people actually tap
  - Every fix written for your business, not pulled off a template
  - A direct line to Ty, not an account manager

**Why the website line matters:** an owner already knows a site costs thousands, so
"included free" is the most legible value in the offer. Say what it *does* — brings
work in, gets read by AI — never how it's built. No schema/backlink lectures.
- **Terms:** cancel anytime after the first 3 months. The first 90 days are the work;
  anything shorter cannot be judged fairly, in either direction.
- **CTA:** "Start my monthly" (one CTA per surface).

### What happens after you start

1. **Checkout** — one tap, Apple Pay or card.
2. **A 2-minute intake** — no call required unless you want one.
3. **First wins inside 7 days** — they appear on your dashboard as they land.

---

## The offer in Ty's words (verbatim — the elevator pitch)

The single flowing statement of the whole offer, in Coach Ty's own voice. Use it
where the offer is told as a story rather than a bullet list (the `/lolaleads`
front door, sales conversations, email). Mirrored as `OFFER_FULL` in
`frontend/src/lib/pricing.ts` and `db/pricing.py` — the price reads from the
`$397` constant so there is still one source for the number.

> For $397/month — about $13 a day, and one new job covers months — I design and
> build your website for free (no setup fee, the thing most shops charge $3,000+
> for), then I get you found: it's written so Google and AI tools like ChatGPT
> can actually read it and name you when someone asks for a company like yours.
> Every month I manage your Google Business Profile so you land in the map pack
> neighbors actually tap, write every fix by hand for your trade and your town,
> and run the systems that turn traffic into booked work — missed-call text-back
> so a lead you can't answer doesn't ring out to the next guy, an automatic
> review engine, and text-and-email follow-up so nothing goes cold while you're
> in the field. You watch all of it on a live dashboard and text me, Ty,
> directly — never an account manager. It starts with a free Growth Score (a
> 60-second scan of how you show up on Google and in AI answers), I only take one
> client per trade, per city, and it's backed by my 90-Day Promise: we pick your
> money keywords in week one, and if I don't get you on page one or in the map
> pack within 90 days, your next two months are free.

**The one-breath summary** (`OFFER_ONE_LINER`):

> That's the whole offer in one breath: free website + AI visibility + Google
> Business + the follow-up systems, $397/mo, one client per market, ranking
> guarantee.

---

## Guarantee (exact language — use on every paid surface)

> **The 90-Day Promise**
> We pick your money keywords together in week 1. If I don't get you ranking on page
> one or in the map pack within 90 days, your next 2 months are free.

The **Half-Back Guarantee** is retired along with the $997 build it was attached to;
the **First Win Promise** was retired before it. The 90-Day Promise is the only
guarantee — 90 days because that is how long the work honestly takes, and the remedy
is more work rather than a partial refund.

---

## FAQ addition (on paid surfaces)

> **What if you don't rank me?**
> Your next 2 months are free. I only make money if the work lands.

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

---

## Exclusivity — one client per trade, per city

**This is a real constraint, not a scarcity tactic.** Two pressure washers in
Dunedin cannot both be ranked first for "soft wash Dunedin" — the work for one
is work against the other. Taking both would mean selling the same outcome
twice and delivering it once.

State it plainly wherever the offer appears. Never dress it up with a counter
("3 spots left in Tampa") — an invented number is exactly the kind of thing
this business is positioned against, and it is trivially disprovable.

## Free start — TRIAL_DAYS

`TRIAL_DAYS` in `frontend/src/lib/pricing.ts` controls whether any trial copy
renders. **It defaults to 0, meaning off, and every trial line disappears.**

Before raising it above 0, the Stripe Payment Link MUST have a matching trial
period configured. Publishing "14 days free" against a link that charges
immediately is worse than having no trial at all — it is a promise the
checkout breaks in the same session, in front of a card form.

The rationale for a trial over a lower price: the barrier to a $397 monthly
from a stranger is trust, not the number. A smaller first yes removes the risk
without permanently discounting the work or signalling that it is cheap.
