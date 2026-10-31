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
> Last updated: 2026-10-30 — **collapsed the two paid plans into a single flagship:
> the Lola Local Growth System at `$497/month` + a one-time setup `from $497`, with a
> conversion-focused website built in on every engagement.** The retired $397 "Local
> Visibility" (no website) and $797/$997 "Local Growth System" split the offer in two
> and forced the buyer to self-diagnose "do I need a website?"; one plan at one price is
> the honest answer. Expansion stays as the custom route below the flagship. The simple
> website build is included in setup; complex websites and migrations are quoted on top
> (hence "from $497"). The **90-Day Promise** and the old ranking guarantee remain
> retired, replaced by the **implementation commitment** below.

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
- One flagship plan, plus a narrower custom Expansion section below it. The
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

Funnel: **Free Growth Score → start the Growth System.** The score is the low-friction
front door; the flagship Local Growth System is the honest destination.

---

## The offer — one flagship + a custom route

> Prices are the source of truth. Change them HERE, then sync the three mirrors.
> **90-day initial term, then month-to-month.**

### THE LOLA LOCAL GROWTH SYSTEM · `$497/month` + one-time setup `from $497` — the one plan

**The complete done-for-you system a local contractor owns** — a conversion-focused
website, Google visibility, reviews, tracking and automated lead follow-up — built and
run so more searches turn into calls, estimates and booked jobs.

**One-time setup — from $497** (built before monthly management starts):
- A simple conversion-focused website build or strategic rebuild
- Google Business Profile set up and optimized
- Lead capture, call/form tracking and UTM attribution wired up
- *The simple build is included. Complex websites and migrations are quoted
  separately — hence "from $497."*

**Every month — $497:**
- Website hosted, maintained and kept current — up to two edits a month
- Google Business Profile managed — up to four posts and one profile update a month
- Review engine — happy customers asked for a Google review automatically
- Missed-call text-back + automated text and email lead follow-up (consent-based)
- Call, form and UTM tracking on your Lola dashboard
- A monthly plain-language report + a live dashboard link
- A direct line to Ty — replies within 1 business day, plus a monthly strategy call

Does **not** include (state plainly, never hidden):
- Paid advertising or ad spend
- Complex website rebuilds or migrations (quoted separately)
- Unlimited pages or redesign requests
- Custom software development
- Multiple locations or territories (see Expansion)
- Photography, drone or 360° media
- Guaranteed leads, revenue or rankings

- Day framing: *"About $16/day + a one-time setup from $497."*
- CTA: **"Build My Growth System"** → `/apply?plan=growth`

> **Why one plan.** The retired $397 "Local Visibility" (no website) and $797/$997
> "Local Growth System" split the offer in two and made the buyer self-diagnose. One
> flagship — `$497/mo` + setup `from $497`, website built in — is the single honest
> answer: the system is run for them, the price is one number. A business that already
> has a strong site still gets the full system around it; we don't discount for skipping
> a build we'd do anyway — the setup scales with the actual work ("from $497").

### EXPANSION — Custom, starting at `$1,497/month`

Shown as a **narrower section below the flagship — NOT an equal second card.**

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

## Service & support model (how "access to Ty" actually works)

"Direct access to Ty" is a real differentiator — but left unbounded it doesn't scale past
a handful of clients, and it reads as vague to a premium buyer. State it as a **structured
commitment** so the client knows exactly what they get:

- **One channel.** Requests go through one tracked place — not scattered texts and calls.
- **Response window.** Routine requests get a reply **within 1 business day**.
- **Scheduled strategy.** A **monthly strategy call** — scheduled, not open-ended.
- **Website updates, defined.** Update requests are bundled into a **monthly release**
  within the clearly defined reasonable scope agreed in writing.
- **Out-of-scope is quoted, never surprise-billed.** New pages beyond launch, redesigns,
  ad management, or extra locations are scoped and priced up front (Expansion or a named
  add-on).
- **Automated reporting.** The Lola dashboard shows calls, forms, rankings and what shipped
  this month — no waiting on a manual report.
- **Clear escalation.** Urgent (site down, tracking broken) jumps the queue; routine
  requests ride the standard window.

You reach **Ty — the person doing the work** — not an account manager or a support desk.
*Lola watches. Ty does the work.*

> These windows and limits are commitments to the client. Set them where Ty can honestly
> hold them at 12+ active clients, and keep the copy identical everywhere (sync the mirrors:
> `pricing.ts` → `db/pricing.py` → `gen_lp.py`).

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
- The flagship and Expansion route to **`/apply`** (with a `?plan=` hint), NOT
  straight to Stripe. Territory availability and launch scope must be confirmed before
  any charge, and plan terms must be clear before payment — never send a user directly
  to Stripe without first making the plan terms clear.
- `/apply` preserves lead capture, attribution and UTMs, writes the application record,
  and emails Ty the details. Preserve working forms, analytics, attribution, UTMs,
  Stripe links, Growth Score functionality and GoHighLevel integrations — do not
  duplicate forms, pipelines, contacts, workflows or analytics properties.
