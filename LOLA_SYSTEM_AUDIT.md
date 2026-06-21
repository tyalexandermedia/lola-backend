# LOLA OS — System Audit

**Auditor role:** CTO / Product / Growth / Systems Architect
**Date:** 2026-06-21
**Repos analyzed:** `lola-backend` (the product), `lola-seo` (agency marketing site)
**Method:** Direct inspection of source, endpoints, DB modules, agents, and docs. Every claim below is tagged **[verified]** (found in code/docs), **[stub]** (scaffolded only), or **[recommended]** (does not exist yet — my proposal). No assumptions are presented as fact.

> **Headline:** LOLA is *far* more built than its own `README` ("Phase 1 audit engine") admits — it already has a weekly reporting agent, call/lead/click attribution, GBP/GSC/GA4 integrations, won-jobs tracking, and a 4-tier price ladder. The gap is **not** capability; it's **activation, consolidation, and proof**. Most systems are inert because external keys aren't configured, the data is scattered across ~60 endpoints with no unified revenue view, and the one flagship case study (Sandbar) is stalled at day-0.

---

# Executive Summary

### What LOLA OS currently is — [verified]
A FastAPI (Python 3.13) + SQLite backend deployed on Railway, with a Vite/React/Tailwind frontend on Vercel, that productizes local-SEO for home-services contractors. Concretely, the repo implements:
- An **audit engine** (`POST /audit`) scoring a business on GBP, reviews, mobile speed, SEO, a11y, local trust, and safe-browsing, with a revenue-leak estimate and a "Lola voice" message.
- A **lead-scoring** layer (hot/warm/cool/cold, `db/leads.py`).
- A **cold-outreach engine** ("Agent 4", `outreach/` + `db/outreach.py`): CSV → warmup ramp (10/25/50/day) → Resend → SQLite log, with open/click/bounce/reply webhooks and opt-in Claude-generated per-lead variants.
- A **weekly reporting agent** ("Agent Two", `agents/reporting_agent/`): pulls Search Console + GA4 per client, computes deltas + revenue estimate, formats via Claude, and emails via Brevo on a cron.
- A **revenue/attribution layer** (`db/tracking.py`, `/t/*`, `/admin/calls`, `/admin/won-jobs`, `/twilio/*`): first-party tracked call/lead/click/view events + Twilio call tracking + manual won-jobs entry — described in code as *"the billing-justification layer… the proof that earns (and raises) the retainer."*
- A **case-study rank tracker** (`case_studies/`, `/admin/case-study/*`): Custom Search per query + Claude as an "AI Mode proxy", persisted to SQLite for time-series.
- A **prospect/sprint pipeline** (`db/prospects.py`, `/admin/prospects/*`), **reviews capture** (`reviews/`), **enhancement agent** (`agents/enhancement_agent/`, AI-rewrites audit findings), and a **4-tier Stripe price ladder** ($47 / $397 / $697·mo / $6,970·yr).
- A separate **agency lead-gen site** (`lola-seo`, Netlify): 17 generated `{service}-seo-{city}` landing pages + serverless lead capture.

### What problem it solves — [verified]
Local home-services contractors (soft wash, roofing, plumbing, etc.) lose revenue to weak local/AI search presence. LOLA (a) diagnoses the leak, (b) converts the diagnosis into a sale via tiered offers + cold outreach, and (c) once retained, fixes + reports weekly with attribution proof to justify the recurring fee.

### What stage it is in — [verified]
**"Built but un-activated, pre-revenue-proof."** The code spans audit → outreach → retainer → reporting → attribution, but:
- Many subsystems are gated on external config that `HANDOFF.md` shows is **not done** (Google API keys were `your_key_here`; admin key was the placeholder; GSC/GA4 service account, Resend/reply webhooks, Stripe links all "shipped, needs config").
- The **only case study (Sandbar) is stalled at day-0** — capture blocked on Custom Search + Anthropic key config (`docs/case-studies/sandbar-roof-cleaning-optimization.md`).
- No evidence in-repo of paying retainers or live attribution data.

### Strengths — [verified]
1. **Breadth of working plumbing** — the hard integration work (GBP OAuth, GSC, GA4, Twilio, Resend webhooks, Brevo, Stripe) is already in code.
2. **Honest, anti-fabrication design** — `swarm/orchestrator.py` and the case-study tracker explicitly forbid fake testimonials/stats; reporting degrades gracefully when data is missing.
3. **Attribution-first mindset** — `db/tracking.py` ties every event to a client slug specifically to defend/raise the retainer. This is the seed of a real Revenue Layer.
4. **Cost discipline** — per-audit API budget, SQLite caching (24h PSI / 7d Places / 24h CSE), single-call swarm (~$0.10).
5. **Tight ICP + real flagship** (Sandbar) with owner alignment (founder's father's business).

### Weaknesses — [verified]
1. **Activation debt** — most value is dark until keys/cron/webhooks are configured.
2. **No unified revenue view** — calls, leads, won-jobs, GSC, GA4 live in separate endpoints/tables; nothing rolls them into one "revenue influenced" number or executive dashboard.
3. **AI visibility is mostly placeholder** — UI rows say *"Tracking — ships Q3"*; the only real capability is a Claude proxy, not actual ChatGPT/Gemini/Perplexity/AI-Overview measurement.
4. **No client portal** — admin-key auth only; reporting README says "build client dashboard when 3+ retainers."
5. **Single-tenant data substrate** — SQLite file (`lola.db`); fine now, a scaling wall for multi-client.
6. **Stale/contradictory docs** — `README` says "Phase 1 / no separate packages" while the repo has 6 agent-ish modules and ~60 endpoints. **No `tests/` directory observed.**

### Opportunities — [recommended]
1. **Consolidate the existing pieces into a Revenue Agent + Executive Dashboard** — most inputs already exist; this is integration, not greenfield.
2. **Make Sandbar a real, dated before/after** — unblock the 2 API keys, capture day-0, ship the roof-cleaning optimization that's already spec'd. This is the single highest-leverage move (it powers all outreach + sales).
3. **Productize AI visibility for real** — first-mover wedge for contractors; today it's a placeholder.
4. **Turn the Opportunity Engine implicit in the audit into an explicit, ranked backlog generator.**

---

# Repository Architecture

## Folder structure — [verified]
```
lola-backend/                      # THE PRODUCT (FastAPI, Railway)
  main.py            (3,377 LOC)   # ~60 endpoints — audit, admin, tracking, webhooks
  lead_gen.py        (1,683 LOC)   # lead-gen landing/page generation logic
  lola_voice.md                    # single source of truth for "Lola voice" copy
  agents/
    enhancement_agent/             # AI rewrite of audit findings -> /audits/{id}/enhance
    reporting_agent/               # "Agent Two": GSC+GA4 -> Claude -> Brevo weekly report
    nurture.py         [stub]      # "Agent 5" Phase 2/3 interface only
  swarm/
    orchestrator.py                # single Claude mega-prompt (audit+report+leadgen+outreach+learning)
    memory.py                      # SQLite workflow/pattern persistence
  outreach/                        # "Agent 4": cold email engine (templates, warmup, sender, cli)
  reviews/                         # review capture MVP (routes, emails)
  audits/                          # page_seo_checks.py, schema_generator.py
  case_studies/                    # ranking time-series tracker (tracker.py)
  api_clients/google_apis.py       # centralized Google API client + API_STATUS
  db/                              # SQLite modules (see Data layer)
  automation/emails/*.html         # nurture email templates
  outreach/, prospects, applications, pricing ...
  frontend/                        # Vite + React + Tailwind (Vercel)
    src/*.tsx                      # Homepage, AuditFlow, Pricing, AdminCalls, AdminLeads,
                                   # ClientReport, SandbarCaseStudy, Grader, SwarmWorkflow...
    public/lp/*.html               # generated {service}-seo-{city} landing pages + admin HTML
  docs/                            # money_pages/, case-studies/ (Sandbar)
  .claude/agents/lola-auditor.md   # dev-time QA subagent (NOT a runtime product agent)

lola-seo/                          # AGENCY MARKETING SITE (static, Netlify)
  index.html, style.css            # main site
  {service}-seo-{city}/index.html  # 17 city×service landing pages (89 LOC each)
  tools/gen_pages.py               # page generator
  api/*.js, netlify/functions/     # serverless lead capture (capture-lead, ig-profile, purchase-intent)
```

## Major services — [verified]
| Service | Where | Role |
|---|---|---|
| Audit API | `main.py /audit` | Core scoring + revenue-leak + Lola message |
| Reporting Agent ("Agent Two") | `agents/reporting_agent/` | Weekly client SEO+revenue email |
| Outreach Engine ("Agent 4") | `outreach/`, `db/outreach.py` | Cold email, warmup, webhooks |
| Attribution/Tracking | `db/tracking.py`, `/t/*`, `/twilio/*`, `/admin/calls`, `/admin/won-jobs` | Calls/leads/clicks/won-jobs per client |
| Swarm orchestrator | `swarm/orchestrator.py` | One-call full workflow (cheap) |
| Enhancement Agent | `agents/enhancement_agent/` | AI rewrite of audit output |
| Case-study tracker | `case_studies/`, `/admin/case-study/*` | Rank time-series + AI-proxy check |
| Prospect/Sprint pipeline | `db/prospects.py`, `/admin/prospects/*` | Lead → prospect grading |
| Frontend | `frontend/` (Vercel) | Audit funnel, pricing, admin, reports |
| Agency site | `lola-seo` (Netlify) | Top-of-funnel SEO landing pages |

## Core modules / data layer — [verified]
SQLite via `aiosqlite` (`DB_PATH=lola.db`). Tables (from `db/*.py`):
`audits`, `lead_scores`, `cold_outreach_log` + `cold_suppression`, `reporting_clients` + `reporting_sends`, `tracked_events` (call/lead/click/view), `case_study snapshots`, `prospects`, `reviews`, `applications`, `pricing`, `enhancements`, `api_cache`.

## Dependencies — [verified]
`fastapi`, `httpx`, `aiosqlite`, `google-analytics-data`, `google-api-python-client`, `google-auth`, plus external SaaS: **Google** (PageSpeed, Places v1, Safe Browsing, Custom Search, GSC, GA4, GBP OAuth), **Twilio** (call tracking), **Brevo** (CRM/email), **Resend** (transactional + event webhooks), **Anthropic** (Claude — swarm, reporting, outreach variants, AI-proxy), **Stripe** (4 payment links), **PostHog/Plausible/GA** (frontend analytics).

## Data flows — [verified]
1. **Acquisition:** `lola-seo` LP / cold outreach → `/audit` → audit row + lead score → Brevo sync + Resend result email.
2. **Conversion:** audit → pricing/apply → `applications` → manual onboarding (`/admin/reporting/onboard`).
3. **Delivery + proof:** client gets tracked `/t/*` links on GBP/site → `tracked_events`; Twilio numbers → calls; manual won-jobs entry → revenue. Weekly: Reporting Agent pulls GSC+GA4 → Claude → Brevo email.
4. **Learning:** swarm stores patterns in `swarm/memory`.

**Verified break in the flow:** steps 1–3 each have inert links (keys/webhooks/cron not configured per `HANDOFF.md`), and nothing aggregates step-3 data into a single revenue figure.

## Deployment architecture — [verified]
- **Backend:** Railway (Procfile/uvicorn), SQLite on the instance.
- **Frontend:** Vercel (`frontend/`).
- **Agency site:** Netlify (`lola-seo`, `netlify.toml` + functions).
- **Cron:** cron-job.org (free) or Railway cron → POST `/admin/reporting/run-weekly`.

```
[lola-seo LP / cold email] → [/audit] → SQLite(audits, leads) → Brevo/Resend
                                   │
                        [apply] → applications → onboarding
                                   │
   client GBP/site ←tracked links→ /t/* + Twilio → tracked_events / calls / won-jobs
                                   │
        cron → /admin/reporting/run-weekly → GSC+GA4 → Claude → Brevo weekly email
```

---

# Dashboard Audit

## Existing dashboards — [verified]
- React admin: `AdminLeads.tsx`, `AdminCalls.tsx`, `ClientReport.tsx`, `SandbarCaseStudy.tsx`, `Grader.tsx`, `SwarmWorkflow.tsx`, `LockChecker.tsx`.
- Static admin HTML: `clients-admin.html`, `outreach-admin.html`, `reviews-admin.html`.
- Public client report: `/reporting/public/{slug}`.
- Data endpoints: `/admin/tracking/{slug}`, `/admin/calls/{slug}`, `/admin/won-jobs/{slug}`, `/admin/reporting/sends`, `/outreach/stats`.

## Evaluation
| Dimension | State | Evidence |
|---|---|---|
| Metrics present | Calls, leads, clicks, views, outreach stats, GSC/GA deltas, rankings | `db/tracking.py`, `/outreach/stats`, reporting agent |
| **Missing metrics** | **Unified funnel** (audit→lead→call→estimate→won→$ influenced), MRR/churn, CAC/LTV, AI-visibility share | no endpoint aggregates these |
| Reporting quality | Good for weekly *email*; thin for *live UI* | reporting agent strong; UI fragmented |
| Revenue visibility | **Weak** — won-jobs captured but not rolled into ROI/retainer-justification view | `/admin/won-jobs` exists; no aggregate |
| UX | Fragmented (React admin + static HTML + email) | 3 separate surfaces |
| Executive visibility | **None** — no single "is the business healthy?" view | no exec dashboard |
| Client-facing portal | **None** (admin-key only) | reporting README defers it |

## Opportunities — [recommended]
1. **One Executive Dashboard** (`/admin/exec`): MRR, active retainers, pipeline $, per-client "revenue influenced," AI-visibility index, alerts.
2. **Per-client ROI strip** that turns `tracked_events` + `won_jobs` + `avg_job_value` into "$X influenced this month vs $697 fee" — directly defends the retainer.
3. **Read-only client portal** (token link, reusing `/reporting/public/{slug}` data) — upsell + retention lever.
4. **Consolidate 3 admin surfaces into one React app** (kill the static `*-admin.html`).

---

# Agent Audit

> The brief lists six agents (Technical, Content, Authority, Local, AI Visibility, Strategy). **None exist by those names.** Below is what is actually in the repo, mapped to the brief's intent.

| Brief concept | Actual agent (repo) | Status | Purpose | Inputs | Outputs | Deps | Revenue role |
|---|---|---|---|---|---|---|---|
| Technical/SEO | **Audit engine** (`/audit`) | [verified] | Score + leak | PageSpeed, Places, SafeBrowsing, CSE | score, grade, leak, signals | Google APIs | Top-of-funnel hook |
| Content | **Enhancement Agent** (`agents/enhancement_agent/`) | [verified] | AI-rewrite findings into client-ready copy | audit JSON | enhanced recs | Anthropic | Improves close rate |
| (Reporting) | **Reporting Agent "Agent Two"** (`agents/reporting_agent/`) | [verified] | Weekly SEO+revenue email | GSC, GA4, impl tracker[stub], revenue math | 150-word email + log | GSC/GA4/Claude/Brevo | Retention/justification |
| (Acquisition) | **Outreach "Agent 4"** (`outreach/`) | [verified] | Cold email engine | CSV leads | sends + events | Resend/Anthropic | Pipeline |
| Local | **Case-study/Rank tracker** (`case_studies/`) | [verified] | Rank time-series + AI-proxy | Custom Search, Claude | snapshots | CSE/Anthropic | Proof |
| AI Visibility | **AI "Mode" proxy** inside tracker + UI placeholders | [stub] | "Is client recommended?" via Claude | query, Claude | yes/no proxy | Anthropic | Future wedge |
| Strategy | **Swarm orchestrator** (`swarm/`) | [verified] | One-call full workflow | URL/name | 5-section JSON | Anthropic | Demo/ops |
| Nurture | `agents/nurture.py` | [stub] | Phase 2/3 sequencing | — | — | — | Future |
| (Dev QA) | `.claude/agents/lola-auditor.md` | [verified] | Pre-merge UI/QA subagent | diff | punch list | — | Quality, not runtime |

### Missing / recommended agents — [recommended]
1. **Revenue Agent** (see next section) — consolidates calls/leads/won-jobs/GSC/GA into one funnel + ROI number. *Highest priority.*
2. **Opportunity Agent** — turns audit gaps into a ranked build backlog (new pages, GBP fixes, AEO blocks).
3. **AI Visibility Agent** (real) — multi-engine measurement, not a Claude proxy.
4. **Authority/Link Agent** — citation + backlink monitoring (today only manual, e.g., the Lola footer link).
5. **Review Agent (active)** — `reviews/` captures; add request automation + GBP reply drafting.
6. **Nurture Agent** — finish the `nurture.py` stub.

---

# Revenue Agent Design — [recommended, builds on verified plumbing]

**Goal:** one agent that produces the number that sells and renews retainers: *"$ influenced this month."* ~60% of inputs already exist.

### Inputs (and what already exists)
| Input | Repo status | Source |
|---|---|---|
| Search Console | **[verified]** `fetch_gsc()` | service account |
| Google Analytics (GA4) | **[verified]** `fetch_ga()` | service account |
| GBP | **[verified]** OAuth (`/admin/gbp/*`) + Places | Google |
| Calls | **[verified]** Twilio (`/twilio/*`) + `/t/c` | Twilio / first-party |
| Leads | **[verified]** `tracked_events` (lead), `/t/lead` | first-party forms |
| CRM | **[verified, partial]** Brevo sync | Brevo |
| Estimates / Jobs Won / Revenue | **[verified, manual]** `/admin/won-jobs/{slug}` | manual entry (no CRM deal sync yet) |
| CallRail | **[absent]** — referenced in copy only | use Twilio (already wired) |

### Outputs
`calls`, `leads`, `estimates`, `jobs_won`, `revenue_influenced` — per client, per period, with WoW/MoM deltas and a `roi_multiple = revenue_influenced / fee`.

### Architecture — [recommended]
```
agents/revenue_agent/
  collectors.py   # reuse fetch_gsc/fetch_ga + tracked_events + won_jobs + GBP insights
  funnel.py       # joins events by slug+window -> {calls,leads,estimates,jobs_won,$influenced}
  attribution.py  # rules: organic-click->lead->call->job; first/last touch; conf score
  main.py         # run_for_client(slug, window) -> RevenueSnapshot
db/revenue.py     # revenue_snapshots(slug, period, json, roi_multiple, created_at)
# endpoints
POST /admin/revenue/run/{slug}      # compute + persist snapshot
GET  /admin/revenue/{slug}          # latest + trend
GET  /reporting/public/{slug}/roi   # client-facing ROI strip
```
**Implementation notes:** lives beside `reporting_agent` and reuses its collectors; estimates/jobs_won come from `won_jobs` (and, later, a CRM deal webhook); `revenue_influenced = jobs_won × avg_job_value` (already a `reporting_clients` field) with an attribution confidence flag. Wire the weekly cron to call it right before the report so the email leads with ROI.

---

# Opportunity Engine Design — [recommended]

A system that mines existing audit + rank + GBP + competitor data into a **ranked backlog**. Much of the raw data already exists (`/audit` signals, `case_studies` ranks, Custom Search competitors, GBP).

### Detects
- **New service pages** — money keywords with impressions but no dedicated page (GSC) and present in competitor sets (CSE).
- **New city pages** — `areaServed` cities (see Sandbar's 20+) lacking a city page; cross-ref GSC impressions by query+geo.
- **GBP opportunities** — missing categories/services/photos/posts/Q&A; review-velocity gaps (Places/GBP).
- **AI visibility** — money queries where AI engines don't cite the client (AI Visibility Agent feed).
- **Competitor weaknesses** — competitors ranking with thin/no schema, no FAQ, slow mobile (reuse `audits/page_seo_checks.py` against competitor URLs).
- **Revenue opportunities** — pages with traffic but low conversion (GA4) or high-intent keywords near page-2 (GSC position 8–20 = "striking distance").

### Prioritization — [recommended]
`impact_score = (search_volume × intent × conversion_value) × (1 / effort) × winnability`
where `winnability` uses current position + competitor weakness. Output a sorted backlog with $-estimates → feeds the dashboard and the client report ("here's what we're doing next and why").

```
agents/opportunity_agent/  → db/opportunities.py → /admin/opportunities/{slug}
```

---

# AI Visibility Audit

### Current capabilities — [verified]
- **Claude "AI Mode proxy"** in `case_studies/tracker.py`: asks Claude whether the business gets recommended for a query → boolean + persisted snapshot. *This is a proxy, not measurement of any real engine.*
- **AEO content playbook** authored (`docs/case-studies/sandbar-...md`): citation-ready answer blocks + FAQ/Service schema — the right *inputs* to get cited.
- **Frontend UI** has an "AI Search Visibility" section with **3 placeholder rows** (ChatGPT / Perplexity / Google AI Overviews) labeled *"Tracking — ships Q3."*

### Per-engine reality
| Engine | Capability today | Evidence |
|---|---|---|
| ChatGPT | none (placeholder) | UI placeholder |
| Gemini / Google AI Overview | none | UI placeholder |
| Perplexity | none (term appears in copy in 14 files) | marketing copy only |
| "AI Mode" (proxy) | Claude yes/no proxy | `case_studies/tracker.py` |

### Recommendations — [recommended]
1. **Replace the proxy with real measurement:** scheduled prompts to ChatGPT/Perplexity APIs + Google AI-Overview scraping for a fixed money-query set per client; store citation presence + position + cited URL.
2. **Ship an AI Visibility Index** (0–100, share-of-citation across engines) — productize as a Retainer/Pro line item (the brief's premium wedge).
3. **Close the loop with the Opportunity Engine:** un-cited money query → auto-generate the AEO block + schema (the Sandbar doc already shows the exact pattern) → re-measure.
4. **Be honest in the UI** until real: keep "beta," never fabricate scores (consistent with the repo's anti-fabrication stance).

---

# Sandbar Soft Wash Growth Plan

**Context [verified]:** Sandbar (Palm Harbor, FL; Wix site; (727) 712-6281; 20+ cities) is LOLA's only case study and it's **stalled at day-0** on two API keys. The roof-cleaning optimization is already fully spec'd in `docs/case-studies/sandbar-roof-cleaning-optimization.md`. Everything below uses LOLA's own tooling on Sandbar.

### 30-Day Plan — *unblock, baseline, ship the spec*
1. **Unblock the 2 keys** (Custom Search JSON API + `ANTHROPIC_API_KEY` on Railway) → capture **day-0 baseline** for the 6 tracked queries. *(blocker, ~10 min)*
2. **Onboard Sandbar as a reporting client** (`/admin/reporting/clients`) with money keywords, `avg_job_value=425`, GSC/GA4 properties → weekly email live.
3. **Ship the roof-cleaning page spec** (title/meta, H-hierarchy, 5 AEO blocks, Service + FAQ schema, before/after gallery — note: the 25-pair gallery is already produced, GBP alignment).
4. **Stand up attribution:** Twilio number + `/t/*` tracked links on GBP/site → start logging calls/leads/clicks.
5. **GBP sprint:** categories, services, weekly posts, photos, review replies.
- **Targets:** day-0 captured; weekly report sending; roof page live; first tracked calls.

### 60-Day Plan — *expand + prove*
1. Roll the playbook to the **next 3 money pages** (house washing, paver sand & seal, pool cage) via the Opportunity Engine ranking.
2. **City pages** for top-impression geos (Clearwater, Tampa, Tarpon Springs).
3. **Review engine:** automate requests after won jobs (`reviews/`), target +1 review/week.
4. **AI visibility beta:** real ChatGPT/Perplexity checks on "best roof cleaner Palm Harbor" + "Florida roof cleaning cost."
5. **First ROI snapshot:** Revenue Agent → "calls × avg job value influenced."
- **Targets:** top-3 map pack for "roof cleaning Palm Harbor FL"; first AI citation; documented $ influenced.

### 90-Day Plan — *flagship case study → sales asset*
1. **Publish the dated before/after** (the AFTER section of the Sandbar doc) with real deltas + screenshots.
2. **Wire it everywhere:** cold outreach links to it, `/retainer` case-study slot, homepage hero.
3. **Record the testimonial** from the owner.
4. **Lock the repeatable SOP** (the case-study doc *is* the deliverable) → ready to resell to the next 5 contractors.
- **Targets:** verifiable case study; ≥1 AI-Overview/Perplexity citation; ROI multiple ≥ a retainer fee — the proof that unlocks paying clients.

---

# Productization Opportunities

| Feature (repo) | Productize as | Revenue Impact | Dev Effort | Strategic Value |
|---|---|---|---|---|
| Audit engine [verified] | **Free lead magnet** (already) + paid "Sprint" deep audit | High | Low | High (top of funnel) |
| Reporting Agent [verified] | **Retainer core deliverable** (weekly ROI email) | High | Low (exists) | High |
| Attribution/`tracked_events` [verified] | **"Proof Dashboard"** module (retainer justification) | High | Med | Very High |
| Revenue Agent [recommended] | **ROI module** / upsell to Pro | Very High | Med | Very High |
| AI Visibility [stub] | **Premium add-on** (AI Visibility Index) | High | High | Very High (wedge) |
| Opportunity Engine [recommended] | **Self-serve backlog** (DIY $47 → Sprint upsell) | Med | Med | High |
| Case-study tracker [verified] | **Rank-tracking module** in portal | Med | Low | Med |
| Swarm one-call workflow [verified] | **Instant demo** ("audit any site in 30s") for sales | Med | Low | Med |
| `lola-seo` page generator [verified] | **"City page factory"** productized service | Med | Low | Med |

**Rank (Revenue × Strategic ÷ Effort):** (1) Proof/Revenue dashboard, (2) Reporting-as-retainer, (3) AI Visibility premium, (4) Opportunity Engine self-serve, (5) Audit lead magnet.

---

# Technical Debt

| Item | Severity | Evidence | Fix |
|---|---|---|---|
| **Activation debt** — features dark w/o keys/cron/webhooks | **Critical** | `HANDOFF.md` (Google keys placeholder, admin key placeholder, webhooks unconfigured) | One-time config checklist; `/admin/health/keys` already exists — gate deploy on it |
| **SQLite single-file store** for multi-tenant | High | `DB_PATH=lola.db` across `db/*` | Plan Postgres migration before >5 retainers |
| **No unified revenue model** — data siloed across endpoints/tables | High | ~60 endpoints, no aggregate | Revenue Agent + `revenue_snapshots` |
| **Stale/contradictory docs** | Med | `README` "Phase 1" vs actual breadth | Rewrite README to current state |
| **No `tests/` suite** | Med | none observed; only `test_apis.py` | Add pytest for scoring, attribution, funnel |
| **3 fragmented admin UIs** (React + static HTML) | Med | `*-admin.html` + `Admin*.tsx` | Consolidate into one React admin |
| **Stub leakage** (`nurture.py`, `fetch_implementation_tracker`) presented near "shipped" | Med | code + READMEs | Finish or clearly fence as beta |
| **AI visibility placeholders shown to users** | Med | UI "ships Q3" rows | Mark beta or build real |
| **Secrets handling** (service-account JSON via env/`/tmp`) | Med | reporting README | Use Railway secret files; document rotation |
| **Single Uvicorn worker assumption** (in-proc swarm singleton) | Low | `swarm/orchestrator.py` comment | Move durable state fully to DB before scaling workers |

**Priority order:** Activation → Revenue consolidation → Postgres plan → tests → UI consolidation → docs.

---

# LOLA OS 2.0 Roadmap — [recommended]

A layered platform where today's modules become services behind one spine.

```
                         ┌──────────────────────────────┐
                         │      EXECUTIVE DASHBOARD       │  MRR, pipeline $, per-client ROI,
                         │      + CLIENT PORTAL           │  AI-visibility index, alerts
                         └───────────────┬───────────────┘
        ┌──────────────┬────────────────┼───────────────┬──────────────┐
        ▼              ▼                 ▼               ▼              ▼
  REVENUE LAYER   OPPORTUNITY      AI VISIBILITY    AUTOMATION     AGENT FRAMEWORK
  (Revenue Agent) ENGINE           LAYER            LAYER          (shared runner:
  calls→leads→    ranked backlog   multi-engine     cron, queues,   schedule, retry,
  jobs→$infl.     ($-scored)       citation index   webhooks,       memory, logging,
        │              │            (real, not        nurture        cost guard)
        └──────────────┴───────┬────┴ proxy)─────────────┬──────────┘
                               ▼                          ▼
                    UNIFIED DATA LAYER (Postgres):  clients, events, snapshots,
                    rankings, opportunities, revenue, reviews, outreach
                               ▲
              COLLECTORS: GSC · GA4 · GBP · Twilio · CSE · Brevo · CRM · AI engines
```
**How they work together:** Collectors feed the unified data layer. The **Agent Framework** (generalize today's reporting/outreach runners into one scheduler with retry/memory/cost-guard — patterns already present) runs the **Revenue**, **Opportunity**, and **AI Visibility** agents on cron. Their outputs land in the data layer and surface in the **Executive Dashboard** (internal) and **Client Portal** (external, read-only). The **Automation Layer** (finish `nurture.py`, review requests, GBP posts) acts on Opportunity/Revenue signals.

---

# Top 25 Highest-ROI Improvements

Priority Score = round( (Business + Revenue + Strategic)/3 × 10 − Difficulty×5 ), inputs 1–10; higher = do first.

| # | Improvement | Business | Revenue | Difficulty | Strategic | Priority | Est. time |
|---|---|---|---|---|---|---|---|
| 1 | Unblock Sandbar's 2 API keys → capture day-0 baseline | 10 | 9 | 1 | 10 | **92** | 0.5 day |
| 2 | Configure all external keys/webhooks (audit goes live) | 10 | 9 | 2 | 9 | **83** | 1 day |
| 3 | Build **Revenue Agent** + `revenue_snapshots` | 9 | 10 | 4 | 10 | **77** | 1 wk |
| 4 | Ship Sandbar roof-cleaning spec (page+schema+gallery) | 9 | 8 | 3 | 10 | **75** | 2 days |
| 5 | Executive Dashboard (MRR, pipeline, per-client ROI) | 9 | 8 | 4 | 9 | **67** | 1 wk |
| 6 | Per-client ROI strip ("$ influenced vs fee") | 9 | 9 | 3 | 8 | **72** | 3 days |
| 7 | Stand up Sandbar attribution (Twilio + `/t/*`) | 8 | 8 | 2 | 8 | **70** | 1 day |
| 8 | Onboard Sandbar to weekly Reporting Agent | 8 | 7 | 1 | 8 | **72** | 2 hrs |
| 9 | Publish dated Sandbar before/after case study | 9 | 8 | 3 | 9 | **72** | day-30 |
| 10 | Real AI Visibility (ChatGPT/Perplexity/AI-Overview) | 8 | 8 | 7 | 10 | **52** | 2 wks |
| 11 | Opportunity Engine (ranked $-scored backlog) | 8 | 8 | 5 | 9 | **58** | 1.5 wk |
| 12 | Client Portal (read-only token view) | 8 | 7 | 4 | 8 | **57** | 1 wk |
| 13 | Review request automation (post won-job) | 7 | 7 | 3 | 7 | **55** | 3 days |
| 14 | Postgres migration plan + adapter | 7 | 5 | 5 | 8 | **42** | 1 wk |
| 15 | Consolidate 3 admin UIs into one React app | 6 | 4 | 4 | 6 | **33** | 1 wk |
| 16 | Finish Nurture Agent (`nurture.py`) | 7 | 7 | 4 | 7 | **50** | 1 wk |
| 17 | CRM deal sync → real estimates/jobs-won | 8 | 8 | 5 | 7 | **52** | 1 wk |
| 18 | City-page factory productized (`gen_pages.py`) | 7 | 6 | 3 | 7 | **52** | 3 days |
| 19 | pytest suite (scoring, attribution, funnel) | 6 | 3 | 4 | 7 | **33** | 1 wk |
| 20 | `/admin/health/keys` deploy gate + status page | 6 | 4 | 2 | 6 | **43** | 1 day |
| 21 | Rewrite README to current architecture | 5 | 2 | 1 | 6 | **38** | 0.5 day |
| 22 | Authority/citation monitor agent | 6 | 6 | 5 | 6 | **35** | 1 wk |
| 23 | PDF white-label report (deferred in HANDOFF) | 6 | 5 | 4 | 6 | **37** | 3 days |
| 24 | Swarm "instant demo" sales widget | 6 | 6 | 2 | 6 | **50** | 2 days |
| 25 | Cost/observability dashboard (API spend per client) | 5 | 4 | 3 | 6 | **35** | 3 days |

*(Items 6/8/9 score high on strategic+revenue despite low numbering — the table is the ranking; execute by Priority within each 30/60/90 window.)*

---

# Final Question — CEO, 90 days to first $5,000/month via Sandbar

**Thesis:** Don't build new features to make money — **activate what exists and manufacture one undeniable proof (Sandbar), then sell that proof.** $5k/mo ≈ 7× $697 Retainer **or** 2 Pro + a few Sprints. The constraint is *proof and pipeline*, not code.

**Exact order:**

**Days 1–10 — Activate & baseline (unblock everything).**
1. Configure all external keys (Google ×5, Anthropic, Resend webhook, Stripe links, admin key) — verify with `/admin/health/keys`. *Nothing earns until this is done (`HANDOFF.md`).*
2. Capture Sandbar **day-0** baseline (the 2-key blocker) and onboard Sandbar to the Reporting Agent.
3. Stand up Sandbar attribution (Twilio number + `/t/*` links on GBP/site).

**Days 11–30 — Ship the Sandbar win.**
4. Execute the roof-cleaning spec (title/meta, AEO blocks, Service+FAQ schema, the already-produced before/after gallery, GBP sprint).
5. Build the **Revenue Agent + ROI strip** so the weekly email leads with "$ influenced."
6. Start logging real calls/leads/jobs-won for Sandbar.

**Days 31–60 — Convert proof into pipeline.**
7. Publish the **dated before/after** case study; record the owner testimonial.
8. Turn on **Cold Outreach (Agent 4)** to Florida soft-wash/roofing contractors, every email linking the Sandbar case study (warmup 10→25→50/day already built).
9. Offer a **$397 Sprint** as the entry product (low-friction yes) with a Retainer upsell baked in.

**Days 61–90 — Close to $5k MRR.**
10. Convert Sprint buyers → **$697 Retainer** using their own Revenue-Agent ROI numbers as the close.
11. Book strategy calls from audit + case-study traffic; target **7 retainers (or 2 Pro + 3 Sprints + 2 retainers)** = ~$5k MRR.
12. Lock the SOP (the Sandbar case-study doc is the repeatable deliverable) so each new client is a copy-paste of a proven playbook.

**Why this works (evidence-based):** the audit→outreach→retainer→reporting→attribution loop is *already coded*; the only missing links are (a) configuration, (b) one real proof, (c) a Revenue number that makes the retainer obvious. All three are days-to-weeks, not months.

---

*Prepared from direct repository inspection. Items marked [stub]/[recommended] are explicitly not yet built; [verified] items cite the file/endpoint where found.*
