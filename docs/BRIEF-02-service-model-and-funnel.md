# Build Brief #2 — Productize "access to Ty" into a structured Client Success model + tighten the acquisition funnel

**Status:** DRAFT — awaiting Ty's approval. No pricing change. No production deploy. Preview-first, build-gated.
**Date:** 2026-10-19 · **Repo:** tyalexandermedia/lola-backend · **Author:** Claude (implementation layer)
**Mission tie-in:** first five profitable clients → ~$10k+ MRR at ~15–25 founder hrs/week. This brief is the offer-integrity + funnel work that makes that *physically reachable* without burning Ty out.

> **Read-order note.** This brief mixes two things the CLAUDE.md flow keeps separate:
> **(1) strategy decisions only Ty can make** (§"Decisions for Ty") and **(2) implementation that
> follows approval** (everything else). I propose; you decide; then I build on a preview. Nothing
> here ships to production, and no price moves, without your explicit second approval — exactly like
> Brief #1.

---

## 0. What I verified first (so nothing here is a guess)

- **Pricing in your prompt matches canon exactly** — `docs/PRICING.md` + `frontend/src/lib/pricing.ts`:
  Local Visibility `$397/mo + $397 activation`; Local Growth System `$797/mo + $997 launch` (recommended);
  Expansion custom `from $1,497/mo`. **No pricing conflict to resolve. No price change proposed.**
- **The "90-day initial term, then month-to-month" is real and already in the copy** (`pricing.ts:84,120`;
  `PRICING.md:87`). I preserve it. It is **not** the retired "90-Day *Promise*" (the ranking guarantee),
  which canon retired and replaced with the implementation **COMMITMENT** (`pricing.ts:212-219`). I keep
  those two from being confused anywhere in this work.
- **The routed funnel** (from `App.tsx`): `home → /growth-score → /r/{id} (report) → /pricing → /apply?plan=`.
- **`RetainerPage.tsx` and `ManagedPage.tsx` are dead code** — no longer imported (`App.tsx:94-95`). The
  "90-Day Promise" text in `RetainerPage.tsx` is therefore **not live**. (It's still a landmine on disk — see #5.)
- **Checkout guardrail is canonical, not accidental** (`PRICING.md:269-279`): both paid plans route to
  `/apply` (with `?plan=`), **not** straight to Stripe, so territory + launch scope are confirmed before any
  charge. The live Stripe subscription charges `$397/mo` (`db/pricing.py` `MONTHLY_PRICE`). `TRIAL_DAYS = 0`.
- **The report was already de-fabricated in Brief #1** (live in prod, commit `e398b2d0`). Deliverable 4 below
  builds on that — it does not re-open it.
- **The live funnel is now fully mapped** (route table + every CTA + analytics + CRM, confirmed in code):
  one hand-rolled router (`App.tsx`), every buy control routes to `/pricing` → `/apply` (never Stripe —
  `checkout.ts:91-93`), **no live self-serve checkout exists**, and **PostHog is the (only) analytics**,
  already wired. Findings F4–F6 below come straight from that map.

---

## 1. Current conversion audit (Deliverable 1)

**Honesty first — what we can measure today vs. what we can't.** I will not invent a funnel number. A
funnel-instrumentation audit is running; until events are confirmed wired, treat every rate below as
**"instrument, then measure" — not a known value.** The business is pre-first-five-clients, so there is no
meaningful historical conversion baseline to report, and pretending otherwise would break the #1 rule.

### Offer-integrity findings (verified in code — these are real)

| # | Finding | Where | Why it costs money / time |
|---|---------|-------|---------------------------|
| F1 | **"Access to Ty" is promised with zero structure** — no response window, no request channel, no revision limit, no out-of-scope rule exists anywhere in the repo. | `pricing.ts:97, 171, 325, 385`; `pageMeta.ts:190` | Uncapped continuity liability. One needy client can eat the margin of three, and it makes the ~15–25 hr/week × ~12-client math impossible (see §3). It also reads as *vague* to a premium buyer — "access" with no promise behind it. |
| F2 | **Retired ranking-guarantee language in the tree** ("90-Day Promise", "page one / map pack in 90 days", "get you ranked", "half back"). | Live suspects: `Marquee.tsx:12` (garbled "30-Day 90-Day Promise"), `featureDemos.tsx:363`, `RoadmapJourney.tsx:53`, `Start.tsx` (rendered copy). Confirmed **dead/unrouted**: `RetainerPage.tsx`, `BuildOnboarding.tsx:31,52`. | Canon says these **must be migrated** (`PRICING.md:182-185`); any live one breaks *"Never promise guaranteed rankings."* The funnel map shows the **main path (home / growth-score / report / pricing / apply) is clean** — no live 90-Day-Promise copy on it. Reachability of each suspect is verified Day 2 before editing. |
| F3 | **Dead retired-model files on disk** carrying old prices + the guarantee. | `RetainerPage.tsx`, `ManagedPage.tsx`, `BuildOnboarding.tsx` (all unrouted — `App.tsx:94-96`) | Not live, but a stray future import could ship a dead price/guarantee. `pricing.ts:417-422` keeps back-compat aliases *because* of this risk — delete the source. |
| F4 | **Payment/offer mismatch (verified).** The pushed offer is **$797/mo** (homepage hero + report buttons say "$797/mo"), but the only self-serve charge is the **$397/mo** link, and **no code path collects either plan's one-time fee** ($397 activation / $997 launch). | `main.py:326,338` ($397 link, `STRIPE_MONTHLY_AMOUNT=39700`); `checkout.ts:42,91-93`; display in `AuditFlow` report + `Homepage`. | Setup revenue and the recommended plan's monthly are **collected manually today**, not systematized. Big economic finding — see §"Decisions for Ty". Flagged, **not fixed in #2** (money-path change needs its own brief + approval). |
| F5 | **CRM captures free leads only — not applicants or customers (verified).** The GoHighLevel push fires **only** on Growth Score submit; `/applications` and the Stripe purchase webhook push **nothing** to GHL. | `main.py:1390-1401` (fires on `/audit`); `1776-1802` (`/applications` — no GHL); `4067-4137` (webhook — no GHL). | Your **hottest leads (applicants) and real customers** aren't auto-entered into the pipeline — follow-up/onboarding rides on Ty seeing an email. Fixable; candidate to ride along (see §"Decisions"). |
| F6 | **`/apply` does not qualify — it captures.** No scoring logic; validation is field-completeness only; every submission is accepted and emailed to Ty. The "pre-qualification" docstring overstates it. | `ApplyPage.tsx:87-95`; `main.py:1776-1802` | Qualification is **manual** (Ty reads the email). The form *does* capture the signal — revenue band (`ApplyPage.tsx:34-39`) + trade + frustration — so light auto-qualification is possible later to save founder time. |

### Funnel-friction findings (now confirmed against the route/CTA map)

- **Competing CTAs are real and specific** (prompt Step 5 bans them):
  - **Homepage** leads with "Run my free Growth Score" ✓ but also shows "Start — $397/mo" → `/pricing`, a
    Sandbar dashboard link, and a text-Ty `sms:` link — **plus** the mobile sticky bar adds a *third*
    persistent "Get Started" set (`App.tsx:450-506`, no analytics on it).
  - **The report is the worst offender** — no single clean next step: a "$797/month" hero → `/apply`, a
    "Fix this for me" → `/pricing`, a "Get all four done — $797/mo" → `/pricing`, **and** a side-by-side
    "See pricing →" + "Apply… →" pair in the closing block (`AuditFlow.tsx` ~610–1480). Five+ exits
    competing on the highest-intent page.
  - **Growth Score page** shows competing "Build My Growth System — $797/mo" and "See what's included" →
    `/pricing` below the form.
- **Report → client bridge missing**: Brief #1 made the report honest; it still doesn't end with *"here's
  what happens after you become a client"* (Deliverable 4, item 5).
- **Self-serve purchase is gated by design, not broken** — `startHref()` routes every buy control to
  `/pricing` → `/apply`, never to Stripe (`checkout.ts:91-93`). Territory exclusivity makes true one-click
  checkout impossible without an availability gate. A *correct* constraint to design around (see F4).

---

## 2. Recommended customer journey (Deliverable 2)

One obvious next step per surface. Nothing rebuilt — this is sequencing + copy, not new infrastructure.

```
HOME  ──────────────▶  one-line value: "We install growth systems that get local
 (/)                    contractors found, win more customers, and chase fewer leads."
                        → single primary CTA: Run My Free Growth Score
   │
   ▼
GROWTH SCORE  ──────▶  one-minute form (phone, business, website; email optional + consent)
 (/growth-score)        → on-screen report
   │
   ▼
REPORT  ────────────▶  (honest, post Brief #1)  1) what's working  2) the ONE verified
 (/r/{id})              opportunity  3) recommended next action  4) how Coach Ty Leads helps
                        5) what happens after you become a client  ← NEW bridge
                        → single primary CTA: See the plan that fits
   │
   ▼
PRICING  ───────────▶  free Growth Score is the primary CTA; two plans side-by-side +
 (/pricing)             Expansion below. Break-even calculator (client-side, nothing stored).
                        → plan CTA: Improve My Visibility / Build My Growth System
   │
   ▼
APPLY  ─────────────▶  captures lead + qualifying signal; qualification is MANUAL — Ty reviews (F6). Confirms territory
 (/apply?plan=)         and launch scope. Writes the application, emails Ty, preserves UTMs.
   │
   ▼
CONFIRM + CHECKOUT ─▶  territory + scope agreed in writing → Stripe ($397 live). No surprise charge.
   │
   ▼
ONBOARDING  ────────▶  AFTER_YOU_START steps (already defined, pricing.ts:251): run score →
                        confirm scope+territory → build & go live, progress on the Lola dashboard.
   │
   ▼
FIRST DELIVERABLE ──▶  first visible win (GBP optimized / tracking live / first report),
                        shown on the dashboard that shipped in the Brief #0 dashboard work.
```

**Remove friction, keep the gates that protect the model:** the territory + scope confirmation is a
feature (it's what makes exclusivity real and keeps you from selling the same outcome twice), not friction
to strip. The single biggest one-step-per-page win is the **report** (§1): collapse its 5+ competing exits
to one. Qualification stays manual for now (F6) — Ty's judgment on the first five clients is worth more than
an auto-filter; auto-qualification is a later, optional time-saver.

---

## 3. The business-model math — why #2 is the unlock, not just tidy copy (Deliverable 1 cont. + Step 3)

> **This is an illustrative model, clearly labeled as such — not a claim about any client's actual
> numbers.** The hour inputs are assumptions **you confirm**; I'm showing the shape, not asserting facts.

**Implementation value vs. continuity value:**
- **Implementation (upfront, mostly one-time):** the website build, GBP setup, tracking install, launch
  pages. Funded by the one-time fees (`$397` activation / `$997` launch). High hours, but *bounded* and
  *paid for at the start*.
- **Continuity (recurring, forever):** GBP management, review engine, lead follow-up, monthly reporting,
  and **"access to Ty."** Funded by the monthly ($397 / $797). This is where margin lives or dies.

**The uncapped-access problem, in arithmetic you can sanity-check:**
- Goal: ~$10k MRR at ~15–25 hrs/week. On the recommended $797 plan that's ≈ **12–13 active clients**.
- 20 hrs/week ÷ 12 clients ≈ **~1.5 hrs per client per week for *all* continuity work** — management +
  reporting + every support touch.
- "Direct access to Ty" with **no structure** is a real-time, interrupt-driven promise. At 12 clients it
  doesn't fit in 1.5 hrs/client — so either the hours blow past 25, the margin collapses, or clients get
  quietly ignored (the worst outcome for a premium, trust-based brand).
- **Structured support is therefore not a downgrade — it's the only way the stated goal is physically
  reachable.** Async intake + batched responses + automated reporting + a *scheduled* strategy touch is
  how 1.5 hrs/client holds and still feels premium.

**Margin protection, plainly:** every hour of unscheduled, uncapped access is an hour of pure cost with no
revenue attached. Converting "access" into a defined, scheduled, mostly-async service turns a liability
into a *feature you can name and sell*.

---

## 4. Offer & support recommendations — the structured Client Success model (Deliverables 3 & 4, Step 3)

**Keep the real differentiator. Bound it. Don't reduce legitimate support.** "You reach Ty, not an account
manager" stays — it's true and on-brand. What changes is the shape around it.

Replace the bare *"Direct access to Ty"* with a **named, bounded service model** (exact numbers are yours to
set — see §"Decisions for Ty"):

1. **Defined deliverables** — formalize cadence per plan: monthly GBP management, monthly dashboard +
   plain-language summary, review engine running, lead follow-up live. (Most already listed; make the
   *cadence* explicit.)
2. **Support request system** — one channel (request form / dedicated inbox / portal), async-first. Not
   scattered texts and calls. One place, tracked.
3. **Standard response window** — e.g. *"We reply within 1 business day."* Honest, bounded, still premium.
4. **Clear revision limits** — define the "reasonable scope" already promised at `pricing.ts:135`: e.g. a
   set number of website update requests per month, bundled into one monthly release.
5. **Out-of-scope = paid** — new pages beyond launch, redesigns, ad management, extra locations → quoted
   (Expansion or a named add-on). Already implied by `excludes[]`; make it a *process*, not fine print.
6. **Optional strategy sessions** — this is where "access to Ty" becomes a **feature**: a scheduled monthly
   or quarterly strategy call (or paid ad-hoc), instead of "text me anytime." Named, valued, calendared.
7. **Automated reporting** — the Lola dashboard + monthly summary does the "what happened this month," so
   Ty isn't hand-reporting. Leans on the dashboard shipped in the earlier dashboard work.
8. **Transparent escalation** — a clear line between *urgent* (site down, tracking broken) and *routine*
   (a copy tweak), each with its own path and expectation.

**Copy reframe (illustrative — final wording in implementation):**
`"Direct access to Ty"` → **"A direct line to Ty — structured so you always get a real answer"**, shown with
the response window + the monthly strategy touch + the request channel. That reads *more* premium and *more*
credible than an open-ended "access," because calm confidence beats a vague promise.

**Deliverable 4 — Growth Score report additions (small, builds on Brief #1):** add item 5, *"what happens
after you become a client"* — a short, honest bridge from diagnosis to the onboarding steps already defined
in `AFTER_YOU_START` (`pricing.ts:251`). No new fabrication; no rankings/revenue/lead estimates.

---

## 5. Exact components requiring modification (Deliverable 5)

**Source-of-truth order is mandatory** (`PRICING.md` header): `docs/PRICING.md` → `frontend/src/lib/pricing.ts`
→ `db/pricing.py` → `frontend/scripts/gen_lp.py`.

| Change | File(s) | Note |
|--------|---------|------|
| Add a **"Service & support model"** section (the canonical definition). | `docs/PRICING.md` | Source of truth; written first. |
| Add a `SERVICE_MODEL` / `SUPPORT` constant (deliverables cadence, response window, request channel, revision scope, strategy-session cadence, escalation). Reword the 4 access lines. | `frontend/src/lib/pricing.ts` (`:97, :171, :325, :385`) | Mirror of the doc. |
| Reword the FAQ access line. | `frontend/src/lib/pageMeta.ts:190` | — |
| Surface the service model where plans are sold. | `PricingPage.tsx`, homepage (`App.tsx`), `ApplyPage.tsx` | Also the one-screen-one-CTA sweep. |
| **Verify reachability, then migrate live** retired-guarantee copy to `COMMITMENT`; fix the garbled "30-Day 90-Day Promise". | `Marquee.tsx:12`, `featureDemos.tsx:363`, `RoadmapJourney.tsx:53`, `BuildOnboarding.tsx:31,52`, `Start.tsx` | **Reachability checked before each edit.** |
| **Delete dead retired-model files** (confirm zero imports first). | `RetainerPage.tsx`, `ManagedPage.tsx`, `BuildOnboarding.tsx` | All unrouted (`App.tsx:94-96`). Removes the landmine; lets us start deleting the back-compat aliases later. |
| Add the *"after you become a client"* bridge to the report. | `AuditFlow.tsx` | Small; builds on Brief #1. |
| Append the dated **service-model decision** once approved. | `DECISIONS.md` | Also append the stale-pricing supersede note flagged in the audit. |
| Audit `/apply`; reflect that qualification is manual (F6); set one clear next step; keep territory/scope + plan capture. | `ApplyPage.tsx` | Light touch. |
| **Collapse the report's 5+ competing CTAs to one** clear next step. | `AuditFlow.tsx` (~610–1480) | Highest one-step-per-page win (Day 4). |
| De-dupe homepage + mobile sticky CTAs to one primary; **add explicit `track()`** to hero + sticky bar. | `Homepage.tsx`, `App.tsx:450-506` | Day 3; also closes measurement gap §7.1. |
| **Preserve** `startHref()` routing (buy → `/pricing` → `/apply`, never Stripe). | `checkout.ts:91-93` | Do not break the gate. |

**Out of scope / preserve (do not touch):** Stripe webhook + money paths, GHL contact/pipeline/tags, Growth
Score scoring logic (`main.py`), forms, tracking, UTMs, consent text, SMS "Reply STOP", territory-exclusivity
logic, the `$397/$797/$1,497` prices, the 90-day initial term, accessibility/mobile rules, SEO/prerender.

---

## 6. Seven-day execution plan (Deliverable 6) — preview-first, build-gated

Each day is a shippable, reversible slice on the preview branch. Build gate (`cd frontend && npm run build`:
tsc + vite + prerender 17 routes + check-seo) must pass before anything is considered done.

- **Day 1 — Decisions locked + canon written.** Ty answers §"Decisions for Ty". Write the service-model
  section into `docs/PRICING.md`; add `SERVICE_MODEL` constant to `pricing.ts`. No visible change yet.
- **Day 2 — Honesty sweep.** Verify reachability of each F2 surface; migrate the live ones to `COMMITMENT`;
  fix the garbled marquee; delete dead files after confirming no imports. Build green on preview.
- **Day 3 — Offer surfaces.** Pricing + homepage: bounded-access copy + the service model, one obvious CTA
  per screen (competing-CTA sweep). Break-even calc and free-score-primary untouched.
- **Day 4 — Report bridge + apply tighten.** Add "after you become a client" to the report; confirm `/apply`
  single next step + plan/territory/scope capture.
- **Day 5 — QA.** Mobile 390px (no horizontal scroll), accessibility, build gate, a synthetic `/apply` run
  (test data only — never fabricated proof), confirm Stripe/GHL/tracking untouched and still firing.
- **Day 6 — Ty review on the preview URL.** Nothing to production yet.
- **Day 7 — Approved merge to `main`** (your separate approval), then measure (§7).

---

## 7. Measurement & testing plan (Deliverable 7)

**Good news: the funnel is already instrumented — PostHog is wired** (`analytics.ts`, booted `main.tsx:7`;
autocapture + pageviews + session recording + heatmaps). No new paid dependency needed. GA/Plausible are
referenced in a `trackClick` fallback but never actually loaded, so PostHog is the single source. **No
fabricated baselines — any rate we haven't captured yet stays "unavailable" until it does.**

**Events already firing** (use these — don't rebuild them): `growth_score_step` / `_submit` / `_success`
(with score + grade) · `start_clicked_hero` · `diy_unlock_click` · `roadmap_cta_clicked` / `_apply_clicked` ·
`application_completed {tier}` · `start_*` · server-side `ghl_lead_bridged` on each Growth Score lead.

**Three measurement gaps to close (small, part of this work):**
1. **Homepage + MobileStickyCTA fire no explicit events** — the highest-traffic surface and the persistent
   mobile buy bar are autocapture-only, so hero-CTA vs. sticky-CTA attribution isn't clean. Add explicit
   `track()` calls.
2. **No server-side purchase event** — the Stripe webhook emits nothing to PostHog, so apply→sale closes
   only via the client `application_completed`, not a confirmed purchase. Add a server-side `purchase` event
   in the webhook (read-only addition; does **not** touch the fail-closed money logic). *Needs your nod — see
   Decision #7.*
3. **Support-load is unmeasurable until the request system exists** — once it does: requests/client/week,
   median response time vs. the promised window, hours/client/week, out-of-scope→paid conversion. This is
   the dial that proves the 15–25 hr/week goal holds.

**Funnel rates to read from the above:** Growth Score start→complete · report→pricing CTR · pricing→apply ·
apply→sale (once the purchase event lands) · setup revenue booked (manual today — see F4) · retention at the
90-day-term boundary.

**Testing posture:** at the first-five-clients stage, traffic is too thin for clean A/B tests. Change **one
thing at a time**, read it directionally in PostHog, decide by judgment. Keep the previous production build as
the one-click rollback on every merge (same as Brief #1).

---

## Three highest-ROI changes (Deliverable 3) — the short answer, sequenced smallest-first

1. **Bound "access to Ty" and publish the service model.** Highest ROI: protects margin, sets premium
   expectations, and is the thing that makes 12 clients at 15–25 hrs/week *possible*. Mostly copy + one
   constant. (Days 1, 3.)
2. **Kill the retired-guarantee leakage + delete the dead retired-model files.** Pure honesty/credibility
   fix; removes a guaranteed-ranking exposure. (Day 2.)
3. **One obvious next step per surface + the report's "after you become a client" bridge.** Tightens the
   path diagnosis → plan → apply so no qualified visitor is left guessing. (Days 3–4.)

*(Deliberately **not** on the list: building the $797 + one-time checkout (F4). It's a real money gap, but it
touches the fail-closed Stripe webhook and collides with territory exclusivity — so it belongs in its own
money-path brief, gated and approved separately, not bolted onto #2.)*

---

## Decisions for Ty (strategy room — I can't set these honestly for you)

1. **Response window** — what do we promise? (e.g. "within 1 business day.")
2. **Revision scope** — how many website update requests per month are "reasonable scope," bundled how?
3. **Strategy-session cadence** — monthly? quarterly? included vs. paid ad-hoc?
4. **Access differentiation** — same service model on both plans, or a lighter touch on $397 Visibility vs.
   a scheduled strategy session on $797 Growth? (Right now the comparison table shows "Direct access to Ty"
   as identical on both — `pricing.ts:171`.)
5. **Payment architecture (F4) — the big one.** Today only **$397/mo** is collectible self-serve and **no
   one-time fee is captured in code**; the pushed $797 plan has no checkout. Do we build the real $797
   subscription + activation/launch collection behind a territory-availability gate? **My rec: yes — but as
   its own money-path brief, not inside #2** (it touches the fail-closed webhook). Confirm parked.
6. **Auto-push applicants + customers to GHL (F5)?** Small, high value — completes the CRM pipeline so your
   hottest leads and real customers aren't email-only. Can ride along with #2 if you say yes.
7. **Add a server-side `purchase` event (§7.2)?** Read-only addition to close apply→sale measurement. Yes/no.

---

## Guardrails honored (your §11 + CLAUDE.md non-negotiables)

No production changes until approval · preview-first · preserve working forms / payment / tracking /
attribution / UTMs / Stripe / Growth Score / GoHighLevel · **no fabricated testimonials, ROI, revenue, lead
estimates, or ranking guarantees** · no new paid dependencies · preserve accessibility / mobile / SEO · pricing
conflicts resolved only against canon (none found — your prompt matches `PRICING.md`) · **do not reduce
legitimate customer support** (we're restructuring it, not cutting it) · no price change · 90-day initial
term preserved.

---

## Rollout

Approve the §"Decisions for Ty" → I implement Days 1–5 on the preview branch, build-gated → you review on the
preview URL (Day 6) → your separate explicit approval → merge to `main` (Day 7), prior build retained as
one-click rollback. **Nothing ships to production without that second approval.**
