# Coach Ty Leads — Pricing & Offer (Canonical Source of Truth)

> **This file is the single source of truth for Coach Ty Leads pricing and positioning.**
> When pricing changes, update THIS file first, then sync the three mirrors:
> - `frontend/src/lib/pricing.ts` (frontend constant — imported by all React surfaces)
> - `db/pricing.py` (backend constant — `/pricing` API + email reports)
> - `frontend/scripts/gen_lp.py` (landing-page generator constants — regenerate after)
>
> Company (customer-facing brand): **Coach Ty Leads**. Product/system: **The Lola
> Local Growth System** (and "Lola" the dog). Founder: **Ty Alexander** ("Coach Ty").
> Legal entity **Ty Alexander Media LLC** only where legally appropriate (footer,
> schema `legalName`). Tagline: **"Get found. Get called. Get booked."**
>
> Last updated: 2026-09-12 — **migrated from the single $397 all-inclusive plan to a
> free diagnostic + TWO genuinely different paid plans + a custom Expansion route.**
> The old "one plan, one button, website included free" model and the **90-Day
> Promise** are retired. The 90-Day Promise guaranteed a *search-placement outcome*
> (page one / map pack, or two months free) that no honest operator controls; it is
> replaced by an **implementation commitment** — the thing we actually control (see
> below). The single-offer mandate ("no tier tables, no comparison grid") is
> replaced by a deliberately-small two-plan comparison, because the two plans now
> solve genuinely different problems (already-have-a-website vs. need-one-built).

---

## Positioning

Coach Ty Leads gets **local home-service contractors** found on Google, chosen by
customers, and booked — by fixing the things that actually turn a search into a
phone call: Google Business Profile, reviews, lead response, tracking, and (when
needed) a website built to convert.

Core narrative:

- Every line answers **"what does this get me"** — calls, booked jobs, visibility —
  never "what does this do" (no schema / backlinks / technical-SEO lectures).
- Lead with **calls, not marketing clutter**. Do **not** lead with AI terminology.
  AI-search readability is a supporting capability, never the headline.
- Confident, direct, no-BS authority voice. Zero jargon overload.
- Personality line, used sparingly (at most once per surface): **"Lola watches.
  Ty does the work."**

### Voice rules (hard constraints)

- **Never** call the free lead magnet an "audit." It is always the **Growth Score**.
- **Never** fabricate rankings, revenue, leads, reviews, customer counts, urgency,
  discounts, countdowns, or results.
- **Never** present "Lola Leads" as the company name. The company is **Coach Ty Leads**.
- **Never** promise guaranteed leads, guaranteed revenue, guaranteed rankings, or
  guaranteed AI recommendations.
- Two paid plans, shown side by side, plus a narrower custom Expansion section. The
  **free Growth Score is the primary conversion** on the pricing page.

---

## Lead magnet (free — top of funnel, PRIMARY conversion)

**Free Growth Score — $0.** A fast diagnostic of why a business isn't being found and
chosen — delivered before anyone pays to fix anything.

Includes:
- Local visibility snapshot
- Website and on-page review
- Google Business Profile review
- Review and reputation snapshot
- Lead-response gap check
- The single highest-priority fix

- CTA: **"Run My Free Growth Score"** → `/growth-score`
- Supporting line: *"See where leads are leaking before you pay to fix anything."*
- Clarify plainly: it is a **diagnostic, not a guarantee and not a complete SEO
  campaign.**
- Form fields: **Phone (required)**, **Business Name (required)**, **Website
  (required)**, **Email (optional)**.
- Consent checkbox (required), exact text:
  *"By submitting, you agree to receive texts and emails about your results."*
- No pricing mentioned on the opt-in form.

Funnel: **Free Growth Score → choose the plan that fits.** The score is the low-friction
front door; the two paid plans are the two honest destinations.

---

## The offer — two plans + a custom route

> Prices are the source of truth. Change them HERE, then sync the three mirrors.
> All plans: **90-day initial term, then month-to-month.**

### Plan 1 — LOCAL VISIBILITY · `$397/month` + one-time `$397` activation

**For a business that ALREADY has a usable website** and needs stronger Google
visibility, more reviews, and faster lead response.

Includes:
- Google Business Profile optimization and monthly management
- Service and category alignment
- Review-request system
- Missed-call text-back
- Basic lead follow-up
- Local citation / NAP review
- Call and form tracking
- Monthly Lola dashboard
- Direct access to Ty

Does **not** include (state plainly, never hidden):
- A new custom website
- Paid advertising or ad spend
- Unlimited content
- Unlimited service-area pages
- Logo or full brand design
- Photography, drone or 360° media
- Multiple locations

- Day framing: *"About $13/day + a one-time $397 to set it up."*
- CTA: **"Improve My Visibility"** → `/apply?plan=visibility`

### Plan 2 — LOCAL GROWTH SYSTEM · `$797/month` + one-time `$997` launch — **RECOMMENDED**

**For a contractor who needs the complete foundation** — website + visibility +
reviews + tracking + follow-up in one system.

**Everything in Local Visibility, plus:**
- Conversion-focused website build or strategic rebuild
- Up to five essential launch pages
- Technical SEO foundation
- LocalBusiness / service structured data where accurate
- Service and primary-market optimization
- Quote / estimate conversion path
- Automated text and email follow-up
- Lead-source and UTM attribution
- Estimate pipeline connection
- Monthly conversion and ranking review
- Ongoing website updates within a clearly defined reasonable scope

Does **not** include:
- Paid-media budget
- Unlimited pages or redesign requests
- Custom software development
- Multiple businesses, locations or territories
- Drone / 360° production
- Guaranteed leads, revenue or rankings

- Day framing: *"About $27/day + a one-time $997 to build and launch."*
- CTA: **"Build My Growth System"** → `/apply?plan=growth`
- **Recommended.** Emphasize $797 as the fuller answer **without making $397 look
  inferior** — they solve different problems.

### EXPANSION — Custom, starting at `$1,497/month`

Shown as a **narrower section below the two cards — NOT an equal third card.**

For businesses that need:
- Multiple locations
- Multiple territories
- Advanced content and service-area expansion
- Advanced revenue attribution
- Custom integrations
- Higher-volume implementation
- Original drone or 360° content, coordinated through **Ty Alexander Media**

- Always use **"starting at" / "custom"** — every engagement is scoped and priced
  to the work.
- CTA: **"Discuss Expansion"** → `/apply?plan=expansion`

---

## Launch commitment (exact language — replaces the retired 90-Day Promise)

Use this VERBATIM on every paid surface where the old guarantee appeared:

> We agree on the launch scope and the tracked search terms before work begins. If
> the agreed foundation deliverables aren't completed within the documented launch
> window for reasons under our control, we continue the unfinished implementation
> work without an additional management charge until it is complete.

Always pair it with this qualification:

> Results depend on competition, proximity, business history, reviews, how quickly
> you respond to leads, and market conditions. We commit to the work — not to a
> specific ranking, lead count, or AI recommendation.

The **90-Day Promise**, the **Half-Back Guarantee**, and the **First Win Promise**
are all retired. Any surface still rendering "your next 2 months are free" or "page
one or the map pack in 90 days" is out of date and must be migrated to the language
above.

---

## Break-even framing (pricing-page calculator)

- Input: **average profit from one completed job** (profit, not total ticket value).
- Output: approximate number of additional jobs needed to cover the monthly plan.
- Label plainly: **"This is cost math — not a lead or revenue promise."**
- **Do NOT store or transmit calculator inputs.** The math runs entirely client-side;
  nothing typed is persisted or sent anywhere.

---

## The Growth Score (dashboard positioning)

The client dashboard stays the **Growth Score** — every client logs in and sees where
they are. Dimensions (0–100 each, rolled into an overall score):

1. **Foundation**
2. **Growth**
3. **Authority**
4. **AI Visibility**
5. **Reputation**
6. **Revenue Tracking**

Dashboard tracks (available when connected): calls · forms · messages · website clicks ·
Google Business activity · SEO movement.

Note: the free **Growth Score diagnostic** (top of funnel) and the client **Growth
Score dashboard** share a name deliberately — the free score is the first look at the
same six dimensions the client later watches every month.

---

## SMS / text compliance

Every outbound text/SMS template — initial outreach, follow-ups, GHL-automated
sequences, and the Growth Score delivery text — must include the opt-out line:
**"Reply STOP to opt out."**

---

## Reusable-template tokens

Flag vertical- and case-study-specific mentions with `{{VERTICAL}}` and `{{CASE_STUDY}}`
so this becomes a reusable template for future verticals (plumbing, roofing, soft wash).
Primary vertical today: **home-service contractors (Tampa Bay)**. Proof story:
**Sandbar Soft Wash** — Ty's father's business and the original testing ground for the
Lola Local Growth System (disclose that relationship wherever Sandbar is cited).

---

## Territory exclusivity — one client per trade, per agreed territory

**This is a real constraint, not a scarcity tactic.** State it plainly:

> One active Coach Ty Leads client per primary trade, per agreed local territory.

- Your territory is **defined in writing** before work begins.
- Exclusivity applies **only while your account is active and current**.
- Nearby territories and different trades **may still be available**.
- **Never** dress it up with a fake countdown ("3 spots left in Tampa") — an invented
  number is exactly what this business is positioned against, and it is trivially
  disprovable.

Two pressure washers in the same town cannot both be ranked first for the same search —
the work for one is work against the other. Taking both would mean selling the same
outcome twice and delivering it once.

---

## Free start — TRIAL_DAYS

`TRIAL_DAYS` in `frontend/src/lib/pricing.ts` controls whether any trial copy renders.
**It defaults to 0, meaning off, and every trial line disappears.**

Before raising it above 0, the Stripe payment path MUST have a matching trial period
configured. Publishing "14 days free" against a link that charges immediately is worse
than having no trial at all — it is a promise the checkout breaks in the same session,
in front of a card form.

---

## Checkout / conversion path

- The **free Growth Score** is the primary CTA everywhere on the pricing page.
- Both paid plans and Expansion route to **`/apply`** (with a `?plan=` hint), NOT
  straight to Stripe. Territory availability and launch scope must be confirmed before
  any charge, and plan terms must be clear before payment — never send a user directly
  to Stripe without first making the plan terms clear.
- `/apply` preserves lead capture, attribution and UTMs, writes the application record,
  and emails Ty the details. Preserve working forms, analytics, attribution, UTMs,
  Stripe links, Growth Score functionality and GoHighLevel integrations — do not
  duplicate forms, pipelines, contacts, workflows or analytics properties.
