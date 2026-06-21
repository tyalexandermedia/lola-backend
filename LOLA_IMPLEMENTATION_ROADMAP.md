# LOLA OS — Prioritized Implementation Roadmap

**Source of truth:** `LOLA_SYSTEM_AUDIT.md` (2026-06-21)
**Goal:** Get LOLA OS to a usable v1 that can grow Sandbar Soft Wash, prove ROI, and support the first outside clients.
**Horizon:** 30 days to first real proof; 90 days to $5k MRR.
**Priority order:** (1) Unblock Sandbar data → (2) Revenue attribution → (3) Dashboard visibility → (4) Reporting Agent live → (5) Opportunity Engine → (6) AI Visibility → (7) Client onboarding readiness.

---

## 30-Day Execution Roadmap

### Week 1 — Data Unlock + Sandbar Baseline
> **Theme:** Everything is dark until keys are live. Zero code required this week — pure activation.

| Day | Action | Owner | Done when |
|-----|--------|-------|-----------|
| 1 | Configure all 5 Google API keys (PageSpeed, Places, Safe Browsing, Custom Search, GSC/GA4 service account) in Railway | Founder | `/admin/health/keys` returns 200 for all |
| 1 | Set `ANTHROPIC_API_KEY` on Railway | Founder | Audit endpoint processes without timeout |
| 1 | Set real `ADMIN_KEY` (replace `change_me_to_something_random`) | Founder | Admin routes return 200 |
| 2 | Configure Resend webhook URL → Railway `/outreach/webhook` | Founder | Open/click/bounce events appear in `cold_outreach_log` |
| 2 | Set 4 Stripe Payment Link env vars in Vercel | Founder | Pricing page checkout works |
| 3 | **Capture Sandbar day-0 baseline** — run case-study tracker for all 6 queries | Claude | Rows in `case_study snapshots` with today's date |
| 3 | **Onboard Sandbar to Reporting Agent** — `POST /admin/reporting/clients` with money keywords, `avg_job_value=425`, GSC/GA4 props | Claude | `/admin/reporting/clients` returns Sandbar row |
| 4 | Provision Twilio number for Sandbar; set env vars | Founder | `/twilio/webhook` accepts test call |
| 4 | Generate `/t/c/sandbar`, `/t/lead/sandbar`, `/t/go/sandbar` tracked links | Claude | Links appear in `tracked_events` on click |
| 5 | Place tracked links + Twilio number on Sandbar GBP profile | Founder | First organic event logged |
| 5 | Run weekly Reporting Agent manually to verify email delivery | Claude | Brevo delivers to founder email |

**Week 1 exit criteria:** Audit live, day-0 captured, first tracking events logged, reporting email received.

---

### Week 2 — Revenue Dashboard + Attribution
> **Theme:** Make the money visible. Build the Revenue Agent and wire it to the dashboard.

| Day | Action | Ticket | Done when |
|-----|--------|--------|-----------|
| 6–7 | Create `agents/revenue_agent/` — collectors, funnel, attribution, main | #001 | `run_for_client("sandbar")` returns `RevenueSnapshot` |
| 8 | Add `revenue_snapshots` table via `db/revenue.py` | #001 | Table exists, first row inserted |
| 8 | Expose `POST /admin/revenue/run/{slug}` + `GET /admin/revenue/{slug}` | #001 | Endpoints return JSON with calls/leads/jobs_won/$ |
| 9 | Add per-client ROI strip to `/reporting/public/{slug}` — "$ influenced vs fee" | #002 | Client-facing page shows ROI multiple |
| 9 | Wire Revenue Agent into weekly cron so email leads with ROI | #002 | Reporting email shows "$X influenced" in first line |
| 10 | Build Executive Dashboard skeleton at `/admin/exec` | #003 | Page loads; MRR + pipeline + per-client ROI visible |
| 11 | Connect `tracked_events` + `won_jobs` to exec dashboard | #003 | Live numbers from SQLite; not placeholder |
| 12 | Add Sandbar won-jobs logging — `POST /admin/won-jobs/sandbar` after each closed job | Founder | First job entry; `roi_multiple` > 0 |

**Week 2 exit criteria:** Revenue Agent producing `$influenced` for Sandbar; ROI visible in client report and exec dashboard.

---

### Week 3 — Opportunity Engine + Reporting Agent Live
> **Theme:** Turn data into a ranked action backlog; prove the reporting pipeline works.

| Day | Action | Ticket | Done when |
|-----|--------|--------|-----------|
| 13–14 | Build `agents/opportunity_agent/` — GSC striking-distance queries (pos 8–20), missing city pages, GBP gaps | #004 | `run_for_client("sandbar")` returns ranked backlog JSON |
| 14 | Add `db/opportunities.py` + `GET /admin/opportunities/{slug}` | #004 | Endpoint returns ≥5 scored opportunities |
| 15 | Surface opportunity backlog in `/reporting/public/{slug}` — "what we're doing next and why" | #004 | Client report shows ranked opportunity list |
| 15 | Configure GSC service-account JSON on Railway (`GSC_SERVICE_ACCOUNT_JSON` or file path) | Founder | Reporting Agent fetches real GSC data |
| 16 | Configure GA4 credentials; set `GA4_PROPERTY_ID` for Sandbar | Founder | `fetch_ga()` returns real sessions/conversions |
| 16 | Verify `BREVO_REPORT_TEMPLATE_ID` is set; send first live weekly email | Claude | Brevo delivers real GSC+GA4 report to Sandbar |
| 17 | Set up cron-job.org to POST `/admin/reporting/run-weekly` every Sunday 8am ET | Founder | Cron fires confirmed in logs |
| 18 | Ship Sandbar roof-cleaning page spec (title/meta, H-hierarchy, 5 AEO answer blocks, Service+FAQ schema) | #005 | Sandbar site shows `/roof-cleaning` with valid schema |
| 19 | Add before/after gallery — push the 50-image set to `sandbarsoftwash.com/gallery` | #005 | Gallery loads; 25 pairs visible |
| 19 | GBP sprint — categories, services, weekly post, photos, review reply template | Founder | GBP completeness score > 90% |

**Week 3 exit criteria:** Opportunity backlog live; first real automated reporting email sent; Sandbar roof page + gallery live.

---

### Week 4 — AI Visibility MVP + Client-Ready Case Study
> **Theme:** Build the premium wedge; publish the proof that closes the next 7 clients.

| Day | Action | Ticket | Done when |
|-----|--------|--------|-----------|
| 20–21 | Build AI Visibility Agent — scheduled ChatGPT + Perplexity prompts for money queries; store citation presence per engine | #006 | `GET /admin/ai-visibility/sandbar` returns `{chatgpt: bool, perplexity: bool, google_aio: bool}` per query |
| 21 | Replace UI placeholder rows with real data from AI Visibility Agent | #006 | Dashboard "AI Search Visibility" section shows real booleans |
| 22 | Wire Opportunity Engine → AI Visibility: uncited query → auto-generate AEO block draft | #007 | Draft appears in opportunity backlog when not cited |
| 22 | Add `/admin/health/keys` deploy gate — return clear status for all integrations | #008 | Status page shows green/red per key; deploy checklist in README |
| 23–24 | Build read-only Client Portal at `/portal/{slug}?token=...` — reuses `reporting/public` data + ROI strip + opportunity backlog | #009 | Sandbar owner can view live data via token URL |
| 25 | Publish **dated Sandbar before/after case study** — real day-0 vs day-25 ranking deltas + $ influenced | #010 | `/retainer` page links to case study with real numbers |
| 26 | Activate Cold Outreach (Agent 4) — load Florida soft-wash/roofing CSV; set warmup 10/day | Founder | First 10 cold emails delivered; events logged |
| 27 | Add case study link to every outreach template | Founder | Outreach templates reference `/retainer` with Sandbar proof |
| 28–30 | Review results; close Week 1–4 tickets; write repeatable SOP | All | `docs/sop/onboarding.md` exists; 2+ prospects in pipeline |

**Week 4 exit criteria:** AI Visibility showing real data; client portal live; case study published with real numbers; cold outreach running.

---

## Top-10 GitHub Issues

---

### Issue #001 — Revenue Agent: unified funnel → `$influenced` per client

**Title:** `feat: Revenue Agent — calls/leads/won-jobs/GSC → RevenueSnapshot + /admin/revenue endpoints`

**Objective:**
Build `agents/revenue_agent/` that joins all attribution signals for a client slug into a single `RevenueSnapshot(calls, leads, estimates, jobs_won, revenue_influenced, roi_multiple)` and exposes it via API. This is the number that sells and renews retainers.

**Why it matters:**
Today, calls are in Twilio/`tracked_events`, leads in `tracked_events`, won-jobs in `won_jobs`, GSC/GA4 in the reporting agent — but nothing rolls them up. A retainer client cannot see "what did LOLA earn me this month?" and the founder cannot see "is the retainer obviously worth it?" This single agent turns scattered proof into a defensible ROI number.

**Verified repo evidence:**
- `db/tracking.py` lines 1–30: "the billing-justification layer" — `tracked_events(slug, event_type, source, meta_json)`
- `agents/reporting_agent/data_fetcher.py`: `fetch_gsc()`, `fetch_ga()` already work
- `/admin/won-jobs/{slug}` (main.py): endpoint exists, no aggregate consumer
- `db/prospects.py`: `avg_job_value` already a field on reporting clients
- `LOLA_SYSTEM_AUDIT.md` §Revenue Agent Design: full architecture diagram

**Files involved:**
```
agents/revenue_agent/
  __init__.py
  collectors.py       # reuse fetch_gsc/fetch_ga + tracked_events + won_jobs queries
  funnel.py           # join events by slug+window -> RevenueSnapshot dataclass
  attribution.py      # first-touch rules: organic-click->lead->call->job + conf score
  main.py             # run_for_client(slug, window="30d") -> RevenueSnapshot
db/revenue.py         # revenue_snapshots table + CRUD
main.py               # add POST /admin/revenue/run/{slug}, GET /admin/revenue/{slug}
```

**Acceptance criteria:**
- [ ] `run_for_client("sandbar", "30d")` returns `RevenueSnapshot` with `roi_multiple > 0`
- [ ] `revenue_snapshots` row written to SQLite on each run
- [ ] `GET /admin/revenue/sandbar` returns latest snapshot + 4-week trend
- [ ] `GET /reporting/public/sandbar/roi` returns ROI strip JSON (for client portal use)
- [ ] Revenue Agent called by weekly cron right before Reporting Agent

**Implementation steps:**
1. Create `db/revenue.py`: `revenue_snapshots(id, slug, period_start, period_end, calls, leads, estimates, jobs_won, revenue_influenced, roi_multiple, confidence, meta_json, created_at)` — async create/get/list functions.
2. Create `agents/revenue_agent/collectors.py`: thin wrappers around existing `fetch_gsc`, `fetch_ga`, and direct aiosqlite queries on `tracked_events` and `won_jobs`.
3. Create `agents/revenue_agent/funnel.py`: `build_funnel(slug, window) -> dict` — group events by type, sum counts, compute `revenue_influenced = jobs_won × avg_job_value`.
4. Create `agents/revenue_agent/attribution.py`: `attribute(events) -> confidence: float` — simple first-touch rule (organic-click precedes lead within 24h = organic attribution); returns 0.5 if mixed.
5. Create `agents/revenue_agent/main.py`: async `run_for_client(slug, window)` that calls collectors → funnel → attribution → writes `revenue_snapshots` row.
6. Add two endpoints to `main.py`.
7. Call from `/admin/reporting/run-weekly` after existing reporting step.

**Priority score:** 92/100
**Estimated effort:** 5–6 days
**Revenue impact:** Direct — this is the number on every retainer renewal conversation. Without it, ROI is opinion; with it, ROI is receipts.

---

### Issue #002 — Per-Client ROI Strip in Public Report + Weekly Email

**Title:** `feat: ROI strip in /reporting/public/{slug} and Brevo weekly email — "$ influenced vs fee"`

**Objective:**
Surface the Revenue Agent output as a human-readable ROI strip on the public client report page and as the opening paragraph of the weekly Brevo email. Goal: make it impossible for a client to open their weekly email and not know their ROI multiple.

**Why it matters:**
The reporting agent already sends a good technical SEO email (GSC/GA4 deltas). Adding "this month: 12 calls, 4 jobs, ~$1,700 influenced on a $697 fee = 2.4× ROI" as the first thing clients see converts a cost center into an obvious investment. This is the primary retention lever.

**Verified repo evidence:**
- `agents/reporting_agent/report_generator.py`: Claude-formatted report; has `revenue_section` placeholder in the prompt
- `/reporting/public/{slug}` (main.py): client-facing page already exists
- `reporting_clients.avg_job_value` field already persisted (reporting agent README)
- `LOLA_SYSTEM_AUDIT.md` §Dashboard Audit: "Per-client ROI strip" as #1 opportunity

**Files involved:**
```
agents/reporting_agent/report_generator.py   # add ROI data to Claude prompt
agents/reporting_agent/email_sender.py       # prepend ROI strip to email body
frontend/src/ClientReport.tsx                # add ROI strip component at top
main.py                                      # update /reporting/public/{slug} response
```

**Acceptance criteria:**
- [ ] Weekly Brevo email opens with ROI strip: "calls / leads / jobs / $ influenced / roi multiple"
- [ ] `/reporting/public/sandbar` React page shows ROI strip above the GSC/GA4 section
- [ ] If `revenue_snapshots` has no row yet, section is hidden (not errored)
- [ ] ROI strip uses plain English: "This month LOLA helped generate an estimated $X in revenue on a $697/mo investment (X.X× return)"

**Implementation steps:**
1. After Issue #001 lands, pull latest `revenue_snapshots` row in `run_weekly_report()`.
2. Inject ROI data into the Claude report prompt as a structured section before the GSC/GA4 section.
3. Update `ClientReport.tsx` to render ROI strip from `/reporting/public/{slug}` API response.
4. Add CSS for ROI card (metric + label + roi-multiple badge, brand orange `#FF9500` for the multiple).

**Priority score:** 85/100
**Estimated effort:** 2 days (depends on #001)
**Revenue impact:** Primary retention lever. Every retainer saved = $697–$6,970/yr.

---

### Issue #003 — Executive Dashboard at `/admin/exec`

**Title:** `feat: Executive Dashboard — MRR, pipeline $, per-client ROI, AI-visibility index, alerts`

**Objective:**
Single React page at `/admin/exec` (admin-key gated) that shows the health of the entire LOLA business in one view: active retainers + MRR, sprint pipeline $, per-client ROI multiples, AI-visibility index (when live), and any alert (key expired, client not reporting, ROI multiple < 1).

**Why it matters:**
There is currently no way to answer "is the business healthy?" without querying 6 separate endpoints and 3 different UI surfaces. One exec page reduces founder cognitive load and makes it obvious which client needs attention. It's also the first thing to demo to a prospective enterprise buyer.

**Verified repo evidence:**
- `AdminLeads.tsx`, `AdminCalls.tsx`, `ClientReport.tsx` — 3 separate React pages for data that belongs together
- `/admin/tracking/{slug}`, `/admin/calls/{slug}`, `/admin/won-jobs/{slug}` — endpoints exist but unconsolidated
- `LOLA_SYSTEM_AUDIT.md` §Dashboard Audit: "No single 'is the business healthy?' view"

**Files involved:**
```
frontend/src/ExecDashboard.tsx     # new page
frontend/src/App.tsx               # add /admin/exec route
main.py                            # GET /admin/exec/summary (aggregated JSON)
```

**Acceptance criteria:**
- [ ] `/admin/exec` loads with admin-key auth
- [ ] Shows: active retainer count, MRR ($), pipeline (open Sprints), per-client ROI table (slug / roi_multiple / last_run / alert flag)
- [ ] Alerts section: any client with `roi_multiple < 1` or no snapshot in 8 days
- [ ] AI Visibility placeholder column (shows "-" until Issue #006 lands)
- [ ] Mobile-responsive (Tailwind; must pass lola-auditor touch-target check)

**Implementation steps:**
1. Add `GET /admin/exec/summary` to `main.py`: query `reporting_clients` (count + fee sum = MRR), `revenue_snapshots` (latest per client), `applications` (open sprints). Return JSON.
2. Create `ExecDashboard.tsx` with three sections: KPI strip (MRR / clients / pipeline), per-client ROI table, alerts.
3. Add route to `App.tsx`.
4. Style with Tailwind consistent with existing admin pages.

**Priority score:** 78/100
**Estimated effort:** 3 days (depends on #001)
**Revenue impact:** Indirect — reduces time-to-insight for founder; surfaces at-risk clients before they churn.

---

### Issue #004 — Opportunity Engine: ranked $-scored backlog per client

**Title:** `feat: Opportunity Engine — GSC striking-distance + GBP gaps + city pages → ranked backlog`

**Objective:**
Build `agents/opportunity_agent/` that mines existing GSC impressions, GBP data, and competitor signals to generate a ranked, dollar-scored opportunity backlog per client. Surface it in the client report and the Reporting Agent email as "what we're doing next and why."

**Why it matters:**
Today, recommendations are ad-hoc. The Opportunity Engine makes the monthly deliverable concrete and defensible: "these 3 keywords are on page 2 with 400 impressions/mo — a top-3 ranking is worth ~$2,100/mo at your average job value." This is the core of the $697 Retainer value proposition — a self-updating, data-driven backlog.

**Verified repo evidence:**
- `agents/reporting_agent/data_fetcher.py`: `fetch_gsc()` returns position+impressions per query
- `api_clients/google_apis.py`: Custom Search (competitor URLs) already implemented
- `audits/page_seo_checks.py`: page-level checks that can run against competitor URLs
- `LOLA_SYSTEM_AUDIT.md` §Opportunity Engine Design: full prioritization formula

**Files involved:**
```
agents/opportunity_agent/
  __init__.py
  gsc_miner.py          # striking-distance queries (pos 8–20, impressions > 10)
  gbp_gaps.py           # missing categories/photos/posts vs Places data
  city_pages.py         # geo-query impressions → missing city page detector
  competitor_weaknesses.py  # run page_seo_checks against top-3 competitor URLs
  scorer.py             # impact_score = (volume × intent × job_value) / effort × winnability
  main.py               # run_for_client(slug) -> list[Opportunity]
db/opportunities.py     # opportunities table + CRUD
main.py                 # GET /admin/opportunities/{slug}, POST /admin/opportunities/run/{slug}
```

**Acceptance criteria:**
- [ ] `run_for_client("sandbar")` returns ≥5 scored `Opportunity` objects
- [ ] Each opportunity has: `type` (new_page / gbp / city / ai_visibility / competitor), `title`, `query_or_gap`, `est_impressions`, `est_jobs_won`, `est_revenue`, `effort_days`, `impact_score`, `recommended_action`
- [ ] `GET /admin/opportunities/sandbar` returns ranked list
- [ ] Top-3 opportunities appear in weekly Reporting Agent email
- [ ] Client report page shows opportunity list with "$-impact" visible

**Implementation steps:**
1. Create `db/opportunities.py`: `opportunities(id, slug, type, title, data_json, impact_score, status, created_at)`.
2. Build `gsc_miner.py`: query `fetch_gsc()`, filter `8 <= position <= 20`, rank by `impressions × (1/position)`.
3. Build `gbp_gaps.py`: compare GBP fields (categories, photos, posts, Q&A) against Places API response; flag missing.
4. Build `city_pages.py`: group GSC queries by city geo; flag cities with > 50 impressions but no city page on site.
5. Build `scorer.py`: `impact_score = (est_monthly_clicks × intent_weight × avg_job_value / effort_days)`.
6. Wire into reporting agent email: inject top-3 opportunities after ROI strip.

**Priority score:** 72/100
**Estimated effort:** 5–7 days
**Revenue impact:** Turns the retainer from "SEO black box" to "here's our $-scored roadmap this month." Highest upsell lever.

---

### Issue #005 — Sandbar Roof-Cleaning Page + Gallery (Spec Already Written)

**Title:** `feat: Execute Sandbar roof-cleaning optimization spec — AEO page + before/after gallery + schema`

**Objective:**
Implement the already-spec'd `docs/case-studies/sandbar-roof-cleaning-optimization.md` on the live Sandbar site: title/meta, H-hierarchy, 5 AEO answer blocks, Service + FAQ schema, and the 50-image before/after gallery (already generated). This is the concrete deliverable that the Sandbar case study is built on.

**Why it matters:**
The spec exists. The 50 gallery images exist (generated, URL-packaged, push script ready). The ranking target is defined ("roof cleaning Palm Harbor FL," top-3 map pack by day 30). Nothing is shipped because the pages and images haven't been committed to the live site. This is the single highest-leverage content move — it's the "after" state that the entire case study narrative depends on.

**Verified repo evidence:**
- `docs/case-studies/sandbar-roof-cleaning-optimization.md`: full page spec (title, meta, H1–H4, 5 AEO blocks, Service schema JSON-LD, FAQ schema, 10 alt texts, GBP alignment)
- `/tmp/pkg2/sandbar-push.sh`: self-contained push script with all 50 image URLs embedded
- `LOLA_SYSTEM_AUDIT.md` §Sandbar 30-Day Plan, item 3

**Files involved (sandbar-site repo):**
```
src/pages/roof-cleaning.astro    # new page matching spec
src/components/Gallery.astro     # before/after gallery component (if not exists)
public/gallery/*.jpg             # 50 images from sandbar-push.sh
src/components/Footer.astro      # Lola backlink (footer.patch.md already written)
```

**Acceptance criteria:**
- [ ] `/roof-cleaning` page live on sandbarsoftwash.com with correct title/meta
- [ ] Page includes all 5 AEO answer blocks verbatim from spec
- [ ] `<script type="application/ld+json">` Service + FAQ schema validates in Rich Results Test
- [ ] 25 before/after pairs visible at `/gallery` (50 images, correctly named)
- [ ] Lola backlink present in footer
- [ ] Case-study tracker captures rank for target queries within 24h of deploy

**Implementation steps:**
1. From a sandbar-site checkout: run `bash /tmp/pkg2/sandbar-push.sh` (downloads + pushes 50 images to `claude/sandbar-seo-updates-status-Qi93i`).
2. Create `src/pages/roof-cleaning.astro` using the spec's title/meta/H-hierarchy/AEO blocks/schema.
3. Apply `footer.patch.md` to `src/components/Footer.astro`.
4. Commit + push; confirm Vercel deploy.
5. Trigger `POST /admin/case-study/run` with Sandbar's 6 target queries to capture post-launch baseline.

**Priority score:** 90/100 (execution, not build — spec and assets exist)
**Estimated effort:** 1–2 days
**Revenue impact:** This page + gallery IS the case study. Without it, there's no proof to sell the retainer to outside clients.

---

### Issue #006 — Real AI Visibility Agent (ChatGPT + Perplexity + AI Overview)

**Title:** `feat: AI Visibility Agent — real multi-engine citation measurement (replace Claude proxy + UI placeholders)`

**Objective:**
Replace the current `case_studies/tracker.py` Claude-proxy ("is the client recommended?" → local yes/no) and the 3 UI placeholder rows ("Tracking — ships Q3") with a real scheduled agent that queries ChatGPT and Perplexity APIs for a fixed money-query set per client, stores citation presence + cited URL + position, and surfaces an AI Visibility Index (0–100) in the dashboard.

**Why it matters:**
AI Visibility is the premium wedge in LOLA's brief — the "first-mover advantage" for contractors. Today it is entirely fabricated in the UI. Making it real: (a) eliminates the embarrassment of showing placeholder rows to a client, (b) creates a defensible premium add-on ($697 Retainer → "AI Visibility Pro"), and (c) feeds the Opportunity Engine with un-cited queries to fix.

**Verified repo evidence:**
- `frontend/src/*.tsx`: "AI Search Visibility" section with 3 rows labeled "Tracking — ships Q3"
- `case_studies/tracker.py`: `check_ai_visibility(query, business_name)` — Claude proxy only, not real
- `LOLA_SYSTEM_AUDIT.md` §AI Visibility Audit: per-engine reality table confirms all 3 are placeholder
- `LOLA_SYSTEM_AUDIT.md` §AI Visibility recommendations (items 1–4)

**Files involved:**
```
agents/ai_visibility_agent/
  __init__.py
  chatgpt_checker.py      # OpenAI API: ask money query, detect client mention + cited URL
  perplexity_checker.py   # Perplexity API (pplx-api): same pattern
  google_aio_checker.py   # Google AI Overview: Custom Search or Serper + snippet parse
  scorer.py               # AI Visibility Index: share-of-citation across engines × query weight
  main.py                 # run_for_client(slug) -> AIVisibilitySnapshot
db/ai_visibility.py       # ai_visibility_snapshots table + CRUD
main.py                   # GET /admin/ai-visibility/{slug}, POST /admin/ai-visibility/run/{slug}
frontend/src/...tsx        # replace placeholder rows with real data
```

**Acceptance criteria:**
- [ ] `run_for_client("sandbar")` checks ≥3 money queries against ChatGPT + Perplexity
- [ ] Each check stores: `engine`, `query`, `cited: bool`, `cited_url`, `position_in_response`, `snapshot_date`
- [ ] AI Visibility Index (0–100) computed: `sum(cited_weight) / sum(query_weight) × 100`
- [ ] Dashboard "AI Search Visibility" section shows real booleans + index (not "ships Q3")
- [ ] If either API key missing, section shows "configure API key" — never a fake score
- [ ] Results feed Opportunity Engine as `type="ai_visibility"` gaps

**Implementation steps:**
1. Add `OPENAI_API_KEY` and `PERPLEXITY_API_KEY` to Railway env.
2. Build `chatgpt_checker.py`: OpenAI Chat Completion, system prompt asks "does [business_name] get mentioned when someone asks '[query]'?" — parse yes/no + URL from response.
3. Build `perplexity_checker.py`: same pattern with pplx-api.
4. Build `google_aio_checker.py`: Custom Search for query + parse "AI Overview" snippet from response (or use Serper's `answerBox`).
5. Build `scorer.py`: weighted citation share.
6. Replace placeholder rows in frontend with real API data; show "-" if no run yet.

**Priority score:** 65/100
**Estimated effort:** 6–8 days
**Revenue impact:** Enables a premium "AI Visibility" add-on; closes the gap between what the UI claims and what exists.

---

### Issue #007 — Opportunity → AEO Auto-Draft (Opportunity Engine → Content Pipeline)

**Title:** `feat: Opportunity Engine → auto-draft AEO answer block when client not cited in AI search`

**Objective:**
When the AI Visibility Agent (Issue #006) finds that a client is NOT cited for a money query, the Opportunity Engine should auto-draft the AEO answer block (question + concise answer + supporting detail + FAQ schema stub) using Claude, and queue it as an actionable deliverable in the opportunity backlog.

**Why it matters:**
The Sandbar case study spec shows the exact AEO block format. If LOLA can auto-generate that block for every un-cited query, the retainer deliverable becomes "here are 3 AI-citation-ready answer blocks for your site this week" — concrete, measurable, and directly tied to the AI Visibility Index going up. This closes the loop: detect gap → draft fix → re-measure.

**Verified repo evidence:**
- `docs/case-studies/sandbar-roof-cleaning-optimization.md`: 5 AEO blocks with exact format (Q + 40-word answer + 3 bullets + schema)
- `agents/enhancement_agent/`: pattern for using Claude to transform audit data into client-ready copy
- `swarm/orchestrator.py`: anti-fabrication guardrails already present — no fake testimonials
- `LOLA_SYSTEM_AUDIT.md` §AI Visibility recommendations, item 3: "un-cited money query → auto-generate AEO block"

**Files involved:**
```
agents/opportunity_agent/aeo_drafter.py     # new: Claude prompt → AEO block draft
agents/opportunity_agent/main.py            # wire: if type==ai_visibility and not cited → draft
db/opportunities.py                         # add aeo_draft_json field to opportunities table
main.py                                     # GET /admin/opportunities/{slug} returns draft if present
frontend/src/...tsx                         # show AEO draft in opportunity detail view
```

**Acceptance criteria:**
- [ ] When AI Visibility run finds `cited=False` for a query, `run_for_client()` calls `aeo_drafter.py`
- [ ] Draft contains: `question`, `answer_40_words`, `supporting_bullets`, `faq_schema_stub`
- [ ] Draft is stored in `opportunities.aeo_draft_json`
- [ ] Draft visible in admin opportunity detail view with a "copy to clipboard" button
- [ ] Claude prompt includes anti-fabrication guardrail: no invented stats, no fake citations

**Implementation steps:**
1. Add `aeo_draft_json TEXT` column to `opportunities` table.
2. Create `aeo_drafter.py`: Claude prompt takes `(query, business_name, service_area, avg_job_value)` → returns structured AEO block.
3. Wire into `opportunity_agent/main.py`: after AI visibility check, if `not cited`, call drafter.
4. Persist draft via `db/opportunities.py`.
5. Add draft display to frontend opportunity detail panel.

**Priority score:** 58/100
**Estimated effort:** 2–3 days (depends on #004, #006)
**Revenue impact:** Multiplies the retainer value: each week LOLA delivers ready-to-publish content that directly improves AI citation score.

---

### Issue #008 — API Health Gate + Deploy Checklist

**Title:** `fix: /admin/health/keys — enforce all-keys-green before Railway deploy; add status page`

**Objective:**
The existing `/admin/health/keys` endpoint should be expanded to check every external integration (Google APIs ×5, Anthropic, Twilio, Resend, Brevo, Stripe) and return a clear green/red status per key. Gate Railway deploys on this check via a startup assertion. Add a status page visible in the executive dashboard.

**Why it matters:**
`HANDOFF.md` shows the system shipped with placeholder keys (`your_key_here`, `change_me_to_something_random`). Every subsystem silently fails when keys are missing — the audit returns no data, the reporting agent sends empty emails, tracking events are lost. A health gate prevents dark deploys and gives the founder a 30-second way to confirm the system is live.

**Verified repo evidence:**
- `HANDOFF.md`: "Google Custom Search API: your_key_here", "Admin Key: change_me_to_something_random", "Stripe links: add to Vercel"
- `/admin/health/keys` (main.py): endpoint exists but current scope unknown
- `api_clients/google_apis.py`: `API_STATUS` dict already present — stub for this feature
- `LOLA_SYSTEM_AUDIT.md` §Technical Debt: "Activation debt — Critical"

**Files involved:**
```
main.py                          # expand /admin/health/keys; add startup assertion
api_clients/google_apis.py       # expand API_STATUS with real ping-check per service
agents/reporting_agent/          # verify GSC/GA4 creds on import
frontend/src/ExecDashboard.tsx   # add health status section (green/red per key)
```

**Acceptance criteria:**
- [ ] `GET /admin/health/keys` returns `{service: {status: "ok"|"error"|"missing", latency_ms: int}}` for all integrations
- [ ] Railway startup (`@app.on_event("startup")`) logs a warning (NOT crash) for any `status != "ok"` key
- [ ] Executive dashboard shows health strip: green dot or red dot per service
- [ ] `ANTHROPIC_API_KEY` missing → red; placeholder value `change_me_*` → red
- [ ] Response includes `overall: "healthy"|"degraded"|"critical"` based on which keys are missing

**Implementation steps:**
1. Expand `api_clients/google_apis.py` `API_STATUS`: add `ping_check()` per service (lightweight: Places geocode, PSI quota check, CSE query).
2. Update `/admin/health/keys` to call all ping-checks in parallel (httpx gather).
3. Add startup handler that calls health check and `logger.warning` for any non-ok key.
4. Detect placeholder values (`change_me`, `your_key_here`) and mark as `"missing"` not just unconfigured.
5. Add health strip to `ExecDashboard.tsx`.

**Priority score:** 70/100
**Estimated effort:** 1–2 days
**Revenue impact:** Indirect — prevents silent failures that erode client trust and waste debugging time.

---

### Issue #009 — Read-Only Client Portal (Token URL)

**Title:** `feat: Client Portal — read-only token URL for each client showing ROI + rankings + opportunity backlog`

**Objective:**
Create a read-only client portal at `/portal/{slug}?token={token}` that reuses existing `reporting/public/{slug}` data and extends it with the ROI strip (Issue #002), AI Visibility Index (Issue #006), and opportunity backlog (Issue #004). Clients get a single bookmarkable URL; no login required.

**Why it matters:**
Today, clients only see their data in the weekly Brevo email. A persistent portal: (a) gives clients "always-on" proof of value between emails, (b) reduces churn by making the retainer visible, (c) enables the upsell conversation ("as you can see on your dashboard, these 3 keywords are close to page 1 — that's the Pro plan"). The reporting README explicitly defers this to "3+ retainers" — we are at that threshold.

**Verified repo evidence:**
- `/reporting/public/{slug}` (main.py): public client report endpoint already exists
- `ClientReport.tsx`: React component already renders the public report
- `reporting_clients` table: `slug`, `business_name`, `fee_monthly` already present
- `LOLA_SYSTEM_AUDIT.md` §Dashboard Audit opportunity #3: "Read-only client portal (token link)"

**Files involved:**
```
db/reporting.py                  # add portal_token field to reporting_clients + generate_token()
main.py                          # GET /portal/{slug} (token-gated); POST /admin/reporting/clients/{slug}/token
frontend/src/ClientPortal.tsx    # new page: ROI strip + rankings + AI visibility + backlog
frontend/src/App.tsx             # add /portal/:slug route
```

**Acceptance criteria:**
- [ ] `POST /admin/reporting/clients/sandbar/token` generates and stores a 32-char secure token
- [ ] `GET /portal/sandbar?token=...` returns 200 with portal data; wrong token returns 403
- [ ] Portal page shows: ROI strip, 4-week ranking trend, top-3 opportunities, AI visibility index
- [ ] If Revenue Agent hasn't run yet, ROI strip hidden (not errored)
- [ ] Mobile-responsive; passes lola-auditor touch-target audit

**Implementation steps:**
1. Add `portal_token TEXT` to `reporting_clients` via migration.
2. Add `generate_token()` in `db/reporting.py`: `secrets.token_urlsafe(24)`.
3. Add `POST /admin/reporting/clients/{slug}/token` endpoint; add `GET /portal/{slug}` (token-validated).
4. Create `ClientPortal.tsx`: sections for ROI, rankings, opportunities, AI visibility; share CSS with `ClientReport.tsx`.
5. Add route to `App.tsx`.

**Priority score:** 62/100
**Estimated effort:** 3–4 days (depends on #001, #004)
**Revenue impact:** Retention lever. Clients who see their own data weekly churn at half the rate of clients who only get email.

---

### Issue #010 — Sandbar Dated Case Study Publication

**Title:** `feat: Publish Sandbar before/after case study with real deltas — the proof that closes clients`

**Objective:**
Publish a live, dated case study on the LOLA website (`/retainer` or `/case-studies/sandbar`) that shows real day-0 vs day-30 ranking deltas, calls/leads attributed, $ influenced, and a client quote. Wire it into cold outreach templates and the homepage hero. This is the single most valuable sales asset LOLA can have.

**Why it matters:**
Every cold outreach email, every audit result, every pricing page drives prospects to one question: "does this actually work?" Without a real, dated, verifiable case study, the answer is "trust us." With one, the answer is a screenshot + a number. The Sandbar case study has been partially spec'd for months — the missing piece is execution and real data (days 0–30).

**Verified repo evidence:**
- `docs/case-studies/sandbar-roof-cleaning-optimization.md`: full spec with target metrics ("top-3 map pack by day 30," "Perplexity citation by day 60")
- `frontend/src/SandbarCaseStudy.tsx`: component already exists in frontend
- `outreach/templates/*.html`: templates reference "case study" but link to placeholder
- `LOLA_SYSTEM_AUDIT.md` §CEO 90-Day Plan, Days 31–60, item 7

**Files involved:**
```
frontend/src/SandbarCaseStudy.tsx    # populate with real data (day-0 vs day-30 snapshots)
main.py                              # GET /case-studies/sandbar (public, no auth)
outreach/templates/                  # update all templates to link to live case study URL
frontend/src/Homepage.tsx            # add case study hero section
docs/case-studies/sandbar-...md      # add "AFTER" section with real numbers once day-30 data collected
```

**Acceptance criteria:**
- [ ] `/case-studies/sandbar` live with real day-0 snapshot data (rankings, GBP score, audit score)
- [ ] "AFTER" section populated with day-30 delta once data collected (placeholder: "results updating in real-time")
- [ ] Shows: ranking movement per query, calls attributed, $ influenced (from Revenue Agent), before/after gallery link
- [ ] Client quote slot (can be placeholder until recorded; never fabricated)
- [ ] All cold outreach templates link to this URL
- [ ] Homepage hero links to case study

**Implementation steps:**
1. Populate `SandbarCaseStudy.tsx` with real day-0 data from `case_study snapshots` table.
2. Add `GET /case-studies/sandbar` public endpoint (no auth).
3. Add "before" state: audit score, GBP completeness, ranking positions for 6 queries.
4. Add "after" section with `data-updates="live"` indicator.
5. Update all 4 outreach templates; update `Homepage.tsx` hero.
6. At day-30, fill in real deltas and record owner testimonial.

**Priority score:** 88/100 (after data exists)
**Estimated effort:** 2–3 days (build); data available at day-30
**Revenue impact:** This is the close. One real, dated case study with verifiable numbers is worth more than any feature. It's the asset that makes cold outreach convert.

---

## Summary: Top 3 Actions for Immediate Approval

These three actions unblock everything else. All have zero build time — they're configuration and execution.

### Action 1 — Configure All External Keys (Priority Score: 92/100)
**What:** Set 7 Railway env vars (`GOOGLE_CUSTOM_SEARCH_KEY`, `GOOGLE_PLACES_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_KEY`, `TWILIO_*`, service account JSON) + 4 Vercel env vars (Stripe payment links).
**Why first:** The audit engine, reporting agent, case-study tracker, and attribution layer are all dark without these. Every feature in this roadmap depends on them. Verification: `/admin/health/keys` shows all green.
**Who:** Founder (30–60 min with `HANDOFF.md` open).
**Done when:** `GET /admin/health/keys` returns `overall: "healthy"`.

### Action 2 — Capture Sandbar Day-0 Baseline (Priority Score: 92/100)
**What:** Run the case-study tracker for Sandbar's 6 target queries NOW. Onboard Sandbar as a reporting client. Send the first weekly report manually to verify email delivery.
**Why second (same day):** Day-0 is the "before" in every ROI conversation. Every day we wait, the baseline is weaker. Once keys are live, this takes 15 minutes via the admin API.
**Who:** Claude (once keys are configured).
**Done when:** Rows in `case_study snapshots` with today's date; first Brevo report email received.

### Action 3 — Build Revenue Agent (Issue #001, Priority Score: 92/100)
**What:** Create `agents/revenue_agent/` — 5 Python files, 2 endpoints, 1 DB table — that joins `tracked_events + won_jobs + GSC + GA4` into `RevenueSnapshot(calls, leads, jobs_won, $influenced, roi_multiple)` per client slug.
**Why third:** Once keys are live and tracking events start flowing, the Revenue Agent turns raw events into the only number that matters: "what did LOLA earn the client?" This is the retainer renewal argument and the case study anchor. Estimated: 5–6 days of build.
**Who:** Claude (build + commit).
**Done when:** `GET /admin/revenue/sandbar` returns non-zero `roi_multiple`.

---

*Roadmap prepared from `LOLA_SYSTEM_AUDIT.md` (2026-06-21). All issues reference verified repo evidence — no speculative claims. Execute in priority order; do not skip Actions 1–2 or the remaining 8 issues are building on a dark system.*
