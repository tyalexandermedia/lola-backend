# LOLA — Command Center Audit (pre-v1)

**Date:** 2026-09-25 · **Mode:** audit only, nothing changed. · **Author:** Claude Code (implementation layer)

> This audit answers a different question than `docs/LOLA-AUDIT.md` (2026-09-17).
> That one audited LOLA as the SEO product's control plane. **This one audits
> against your stated definition: Lola as your *personal, multi-business
> operating system* — above Sandbar, Lola Leads, Coach Ty, Ty Alexander Media,
> Lola Dev, and Personal/Admin — pointed at ~$4k/mo predictable revenue and
> your exit.** Where the two overlap I reference the earlier doc instead of
> repeating it.
>
> Nothing was implemented. No files changed, no packages installed, no
> migrations, no live customer data touched. Every claim is backed by a
> `file:line` reference so you can verify it.

---

## 1. EXECUTIVE SUMMARY

**What Lola is today:** a working, client-facing **SEO / lead-gen product**
("Lola Leads") — a FastAPI backend on Railway + a React app on Vercel that runs
Growth Score audits, tracks rankings/leads/revenue *for the product's SEO
clients*, and has a product-ops admin dashboard (`/admin/hq`). It is genuinely
multi-**client** (Sandbar, Tampa Bay Power Clean) and it works.

**What Lola should become (per this prompt):** a **personal command center that
sits above all your businesses** and answers "given everything, what's the most
important thing I should do next?" — prioritizing revenue action over
speculative building, spanning businesses that mostly have **no code
representation today** (Coach Ty, Ty Alexander Media, Personal/Admin).

**The gap, stated plainly:** the repo has a *product-ops dashboard for one
business (Lola Leads)*, not a *personal OS across six areas of your life*. The
distinction is the whole audit:

- There is **no workspace / business-separation concept.** The only
  partitioning is `slug` = an SEO client. Coach Ty, TAM, Personal exist
  nowhere in code (verified: brand/marketing copy only, never a data entity).
- The money that a command center must surface — pipeline, opportunities,
  proposals waiting — lives in **GoHighLevel**, and **Lola only *writes* leads
  to GHL; it never *reads* pipeline/opportunities back** (`api_clients/ghl.py`
  is a one-way lead bridge). So today Lola literally cannot see where money is
  waiting.
- There is **no general task / inbox model**, no durable `/context` layer, and
  no cross-business "next step" logic.

**The good news (this is high-ROI, not a rebuild):** the substrate to build the
command center on already exists — a multi-client data spine, a deterministic
"Revenue Agent" action pattern, a React app with a design system, and safe-by-
default integration gating. **v1 is a thin aggregation + prioritization layer
over sources that already exist, plus one new read (GHL pipeline) and one
lightweight task/inbox table.** Not a new platform.

---

## 2. CURRENT ARCHITECTURE

- **Backend:** FastAPI monolith, Python 3.11, on **Railway** (`Procfile`,
  `nixpacks.toml`). `main.py` ~4,100 lines / 76 routes, `lead_gen.py` ~1,700,
  routers under `reviews/`, `swarm/`, `outreach/`, `agents/`.
- **Data:** **SQLite** via `aiosqlite` — one file (`DB_PATH`, default
  `./lola.db`), ~25 tables across 15 `db/*.py` modules, **no ORM, no foreign
  keys**; links by `slug`/`email`/`audit_id` string convention.
- **Frontend:** React 18 + Vite + Tailwind SPA on **Vercel**; custom hand-rolled
  router (`frontend/src/App.tsx:66-124`), no state library, admin key in
  `localStorage`, PostHog analytics.
- **SEO satellite:** `lola-seo` — separate static HTML site on **Netlify**
  (programmatic local-SEO landing pages). Fully separate from the app.
- **Auth:** a single shared admin key (`X-Admin-Key` → `_check_admin`). No user
  model, no accounts, no roles.
- **Integrations:** Google (PageSpeed/Places/SafeBrowsing/CustomSearch,
  GBP/GSC/GA4), Bing Webmaster, GoHighLevel (write-only lead bridge + a
  standalone contact-read CLI), Stripe, CallRail, Resend, PostHog, Brevo.
  Twilio coded but gated off. **New since last audit:** GoHighLevel MCP and
  Google Calendar MCP are now connected at the session level (not yet consumed
  by any code).

*Full route/table/integration map: see `docs/LOLA-AUDIT.md` §1–2.*

---

## 3. WHAT IS LIVE (working and useful)

- **Growth Score audit pipeline** — PageSpeed + Places + Safe Browsing + Custom
  Search + on-page checks, concurrent, budget-capped, SQLite-cached at ~$0
  (`db/api_cache.py`). The top-of-funnel engine.
- **Multi-client reporting spine** — `reporting_clients` + `/reporting/public/
  {slug}` + `ClientReport.tsx`. Live for Sandbar.
- **`/admin/hq` owner dashboard** (`main.py:1847`, `OwnerDashboard.tsx`) — one
  concurrent snapshot of the Lola-Leads funnel + automation health.
- **Revenue Agent** (`agents/revenue_agent/main.py`) — **deterministic Python,
  no AI**; syncs tracking → pipeline, opens follow-up actions for stale
  estimates. *This is the correct seed for the priority engine.*
- **Per-client action + task patterns** — `AdminRevenue.tsx:276` (action items
  with Done/Dismiss) and `ClientReport.tsx` (done/in_progress/next_up columns).
- **Safe-by-default gating** everywhere; **Stripe webhook fails closed**
  (`main.py:3921`).
- **Website factory** — Astro template (`TEMPLATES/local-service-site/`) + Randy
  Golden pilot; deploys fast, independently.

---

## 4. BUILT BUT DISCONNECTED (reusable code not wired to the experience)

- **GHL read capability** — the segment CLI (`services/build_review_segment.py`)
  *can* read GHL contacts, but nothing in the running app reads GHL
  pipeline/opportunities into a dashboard. The capability exists in a script,
  disconnected from the command center.
- **`swarm/` orchestrator + `swarm_patterns` memory** — a "learning" store
  written after each swarm run (`swarm/memory.py`), not surfaced anywhere.
- **AI-visibility across engines** — OpenAI/Perplexity/Gemini paths exist
  (`case_studies/tracker.py:214,255`) but only the Claude proxy is routinely
  wired.
- **`agents/nurture.py`** — full interface, **hard-off**
  (`is_sequencer_enabled()` returns `False`, `nurture.py:49-51`).
- **Retired frontend pages** kept but off the router (`RetainerPage.tsx`,
  `ManagedPage.tsx`, `BuildOnboarding.tsx`, `Grader.tsx`).

---

## 5. PARTIAL (incomplete)

- **Client/Site model** — real (`LolaClientConfig`, `client_configs.py:31`) but
  identity is split across **two sources of truth**: `CLIENTS/*/client.json`
  *and* the `reporting_clients` DB table, synced by hand. Omits GHL location /
  repo / GBP fields.
- **Auto-refresh pipeline** — real but **single-client** ("sandbar" hardcoded,
  `lead_gen.py:1374`).
- **Knowledge/memory** — `DECISIONS.md` is real and maintained; the rest
  (`KNOWLEDGE/`, `CORE/`, `EXPERIMENTS/`, `GOVERNANCE/`) is ~90% empty scaffold
  + standards docs, not wired to data.
- **Token/cost observability** — absent; every LLM call discards the `usage`
  block the API returns (see `docs/LOLA-AUDIT.md` §8).

---

## 6. BROKEN (needs repair)

1. **DB persistence is conditional (highest infra risk).** Durable only if
   `DB_PATH` points at a mounted Railway volume; otherwise the code **silently
   falls back to ephemeral `./lola.db`** and loses everything on redeploy.
   `.env.example` doesn't set `DB_PATH`; no volume manifest in-repo.
   (`db/database.py:10-23`) **Verify in Railway before trusting Lola with
   tasks, inbox, or memory.**
2. **`automation/wix_crm.py`** — undefined-variable bug (`olaudit` vs `audit`).
   Dead but broken if ever called.
3. **`_AI_VIS_CACHE`** (`main.py:3748`) — in-process dict, no TTL, unbounded,
   wrong under multiple workers.

---

## 7. MISSING (genuinely required for a minimum viable *command center*)

Only what the command center cannot exist without:

- **A workspace/business dimension** — a way to tag anything (task, opportunity,
  note) to Sandbar / Lola Leads / Coach Ty / TAM / Lola Dev / Personal. Today
  there is none.
- **A general task / inbox store** — one table for a captured idea/task/problem/
  opportunity, independent of SEO clients. Today tasks only exist as
  product-side `reporting_tasks` and `revenue_agent_actions`.
- **A GHL *read*** of pipeline/opportunities → so "where is money waiting?" can
  be answered at all.
- **A deterministic priority engine** — cross-source, explainable, producing
  "the most important next step" with a plain-language reason.
- **A mobile-first brief view** — the actual command center screen.
- **A durable `/context` layer** — decisions, priorities, rules, offers,
  per-business context (does not exist as files today).

Everything else the long prompt lists (skills, experiments platform, time
tracking, Claude build queue) is **explicitly NOT missing for v1** — see §8/§20.

---

## 8. UNNECESSARY / REMOVE FROM SCOPE (be aggressive)

Do **not** spend v1 time on any of these:

- **A chatbot / conversational Lola.** The value is the ranked brief, not chat.
- **Autonomous agents / agent swarm.** The `swarm/` mega-prompt already
  demonstrates the failure mode (it *invents* SEO scores instead of computing
  them, `swarm/orchestrator.py:80-88`). Don't expand it.
- **A CRM.** GHL *is* the CRM. Read from it; don't rebuild it.
- **A full project-management tool.** A small task/inbox table is enough.
- **A time-tracking platform.** Capture hours as an optional field later; no
  platform.
- **A vector DB / embeddings / advanced memory.** Markdown `/context` +
  `DECISIONS.md` is sufficient until proven otherwise.
- **Enterprise auth / permissions / multi-tenant.** You are one user. A
  workspace *tag* is not a tenant system.
- **An experiments platform, a social scheduler, a separate analytics app,
  gamification.**
- **Dead code:** `automation/sequence_sender.py`, `automation/wix_crm.py`
  (remove after confirming no imports).
- **The empty LOLA-OS knowledge scaffold** — either fill one slice for real or
  stop maintaining empty folders; don't build more of it.

---

## 9. DUPLICATION (reuse, don't stack)

| Concept | Where it already appears | Recommendation |
|---|---|---|
| **Tasks / action items** | `reporting_tasks` (`db/reporting.py`), `revenue_agent_actions` (`db/revenue.py`), `ClientReport` task columns, `AdminRevenue` actions panel | Do **not** add a 4th. Introduce **one** general `lola_items` table; treat the product-side ones as *sources* that feed it, not competitors. |
| **Priority / ranking** | lead temperature (`db/leads.py`), prospect opportunity-rank (`db/prospects.py:118`), revenue actions | Unify into one explainable engine that *reads* these; don't invent a parallel scorer. |
| **Dashboards** | `/admin/hq` (owner), `/reporting/public/{slug}` + `ClientReport` (client), `AdminRevenue`/`AdminCalls`/`AdminLeads` | The command center is a **new top-level view**, not another per-client dashboard. Reuse the Tailwind tokens + the `AdminRevenue` action-card pattern. |
| **Client identity** | `CLIENTS/*/client.json` **and** `reporting_clients` table | Pick **one** (the DB table) as source of truth. |
| **Memory / context** | SQLite (`swarm_patterns`), `DECISIONS.md`, empty `KNOWLEDGE/CORE/EXPERIMENTS` | One `/context` markdown layer + DB for operational data. Retire the empty scaffold. |
| **Notes** | none first-class (scattered in `client.json`, docs) | Fold into `/context` + `lola_items`. |

---

## 10. DATA SOURCE MAP

| Source | Data available | Current connection | Reliability | Decision value | Recommendation |
|---|---|---|---|---|---|
| **GoHighLevel** | Contacts, **opportunities, pipeline stages, estimates/proposals, custom fields**, per-business sub-accounts (locations) | **Write-only** lead bridge (`ghl.py:93`) + offline contact-read CLI. **No live pipeline read.** GHL MCP now connected but unused by code. | High (it's your CRM of record) — *pending live verification of which businesses have locations* | **Highest.** "Where is money waiting?" = GHL opportunities. This is the revenue spine of the command center. | **FIX NOW** — add a read of opportunities/pipeline. |
| **SQLite (`lola.db`)** | Growth Scores, leads + temperature, revenue pipeline (product), tracking/attribution, rankings, MCTB | Fully consumed by the app | Medium — **conditional persistence** (§6.1) | Product-side signals for the Lola Leads workspace + Sandbar | **KEEP + FIX persistence.** |
| **Stripe** | Payment links, charges, subscriptions (webhook) | Webhook wired (fail-closed) | High | "Cash collected," recurring revenue toward $4k/mo | **KEEP** (surface as a revenue signal). |
| **Google GSC / GA4 / GBP** | Rankings, traffic, GBP calls/clicks | Wired for Sandbar/clients (service accounts, OAuth) | Medium-high | Client results / SEO leak detection (product) | **KEEP** for product; **LATER** for personal OS. |
| **Google PageSpeed/Places/SafeBrowsing/CustomSearch** | Audit inputs | Fully wired, cached | High | Growth Score engine | **KEEP.** |
| **CallRail** | Call tracking, missed calls | Import path (`lead_gen.py:984`) | Medium | Lead responsiveness (product/Sandbar) | **KEEP.** |
| **Google Calendar (MCP)** | Commitments, meetings, time blocks | Connected at session, **unused by code** | High | "Today" + time-aware urgency + hours context | **LATER (v1.1)** — cheap, useful for the brief. |
| **GitHub / Vercel (MCP)** | Repos, PRs, deploy/build status | Connected at session, unused by code | High | Surfacing dev work that truly needs attention (Lola Dev workspace) | **LATER** — not revenue; add once revenue view lands. |
| **PostHog** | Product analytics/events | Wired (server + frontend) | Medium | Funnel diagnosis (product) | **KEEP** as-is. |
| **Manual entry (does not exist yet)** | Ideas, tasks, opportunities for Coach Ty / TAM / Personal | **None** | — (you're the source) | The only source for businesses with no integration | **BUILD** the inbox/task capture (§7). |
| **Brevo, Resend, Twilio(off), Wix(dead)** | Email/SMS plumbing | Various | — | Outbound (mostly via GHL now) | KEEP Resend; Twilio LATER; **REMOVE Wix**. |

*Live verification of GHL locations/pipelines was intentionally not run during
this audit (it's live customer data and this is a read-only architecture
review). It's a ~10-minute follow-up when you authorize v1.*

---

## 11. CURRENT COST / COMPLEXITY RISKS

- **Persistence fallback** (§6.1) — not a $ cost but the highest complexity/
  reliability risk.
- **No LLM token/cost tracking** — spend is invisible (`docs/LOLA-AUDIT.md` §8).
  Low $ today (admin-gated, ~$0.10/swarm run) but unmeasured.
- **Swarm invents numbers instead of computing them** — pays tokens to guess at
  data already cached (`swarm/orchestrator.py:80-88`).
- **Single-client auto-refresh on every boot** (`lead_gen.py:1374`) — fine now;
  would multiply cost/time if naively generalized to all workspaces. Make it
  event-driven / staleness-gated per workspace, not on-boot-for-all.
- **Two frontends, two hosts** (Vercel + Netlify) — acceptable; just know it.
- Base infra is cheap: Railway hobby + Vercel + SQLite ≈ ~$0–$20/mo.

---

## 12. SECURITY / RELIABILITY RISKS (material only)

- **Single shared admin key guards everything** (`_check_admin`). A personal OS
  will concentrate **cross-business revenue + personal/financial data** behind
  that one key. Before personal/financial data goes in: ensure a strong secret,
  keep the brief off any public route, and don't log it. (Not a rewrite — a
  discipline.)
- **DB persistence** (§6.1) — data-loss risk.
- **GHL bridge is fire-and-forget** (`ghl.py:113`) — a failed push is silent; a
  lead can vanish between Lola and the CRM. Add minimal delivery logging when
  you touch GHL for the read.
- **Secrets** live in env vars (Railway/Vercel) — correct; keep them there,
  never in `/context` or the repo. `DECISIONS.md` notes the past Resend/domain
  incident — that discipline is already in place.
- Stripe webhook fail-closed ✅. Keep that pattern for any new money path.

---

## 13. PROPOSED LOLA V1 (smallest command center worth building)

A single **mobile-first Daily Command Center** — one new top-level view, reusing
the existing React app + Tailwind — with these sections, each item tagged to a
**workspace**:

1. **Most Important Next Step** — one recommendation: action · workspace ·
   plain-language reason · expected impact · urgency · est. effort.
2. **Today** — 3–5 items that genuinely deserve today (not a backlog).
3. **Revenue Opportunities** — from **GHL** (opportunities/estimates/proposals
   waiting) + Stripe (unpaid/renewals) + product hot leads. This is the point.
4. **Waiting / Blocked** — items waiting on a person, approval, info, or date.
5. **Active** — what's genuinely in progress.
6. **Inbox** — one capture box (idea/task/problem/opportunity/request). No
   elaborate auto-classification in v1.
7. **Completed** — recent meaningful wins (weekly-review fuel + morale).

Plus a thin **`/context`** markdown layer for durable context and decisions.

**Explicitly deferred:** skills, experiment platform, Claude build queue, time
tracking, calendar/GitHub/Vercel surfacing (v1.1+).

---

## 14. PROPOSED DATA MODEL (only what's genuinely required; prefer reuse)

Reuse everything in §3/§9. Add the **minimum**:

- **`workspace` (lightweight)** — an enum/lookup, not a tenant system:
  `sandbar | lola-leads | coach-ty | ty-alexander-media | lola-dev | personal`.
  A string column on new tables + a small `workspaces` reference row set. No
  auth, no isolation.
- **`lola_items`** — the one general table the command center reads/writes:
  `id, workspace, type (task|idea|opportunity|waiting|active|note),
  title, detail, status (inbox|today|active|waiting|done|ignored),
  source (manual|ghl|stripe|product|github), source_ref,
  revenue_estimate, effort, confidence, due_at, waiting_on,
  created_at, updated_at, completed_at`.
  Product-side sources (revenue actions, hot leads) can be **mirrored in** as
  `source != manual` rows, so the brief has one thing to rank.
- **`ghl_opportunities_cache`** (or reuse `revenue_opportunities`) — a cached
  read of GHL pipeline so the brief isn't hitting GHL on every page load.
- *(Optional, carryover)* **`llm_usage`** — token/cost log.

**No change** to existing product tables. **No FKs added.** Keep the string-key
convention the codebase already uses.

---

## 15. PROPOSED PRIORITIZATION MODEL (how "Most Important Next Step" is decided)

**Deterministic, explainable, plain-language. No AI required.**

For each candidate item, compute a small internal score from factors that are
either known or entered:

- **Revenue proximity** — is this a dollar waiting (proposal/estimate/invoice) vs
  a nurture vs a build? (waiting money ranks highest)
- **Expected financial impact** — `revenue_estimate` (monthly weighted higher
  toward the $4k/mo goal).
- **Urgency** — is someone waiting, and for how long? (hours-waiting drives it)
- **Customer/lead impact** — is a real person on the other end?
- **Confidence** — how likely the expected result (0.3/0.6/0.9 buckets).
- **Effort/time** — smaller effort breaks ties upward.
- **Recurring time savings / leverage / reusability** — a fix reusable across
  clients scores up (but never above waiting revenue).
- **Dependencies/blockers** — unblock-many ranks up.
- **System-health override** — a *broken revenue-critical system* jumps to the
  top regardless of score.

**Two hard behavioral rules baked in:**
1. **Revenue/customer action outranks speculative build** — unless the build
   removes a measured bottleneck, fixes a broken revenue system, supports active
   customers, or is blocking revenue work (then it's treated as revenue-class).
2. **The UI shows the *reason*, not the number.**
   > *"Do this next — this prospect is waiting on a proposal, ~$1,000/mo
   > potential, waiting 18 hours."* not *"Priority: 87."*
   An internal score may exist; it never appears alone.

Start with **round numbers and buckets**, not a false-precision formula. Tune
from real use, not up front.

---

## 16. CONTEXT STRATEGY (database vs `/context` vs elsewhere)

- **`/context/` markdown (new)** — durable, human-editable truth:
  ```
  /context/ty-context.md          # who/what, current situation, the $4k/exit goal
  /context/current-priorities.md  # the handful that matter now
  /context/decision-rules.md      # e.g. "revenue action before build"
  /context/offers.md              # current offers/pricing per business
  /context/experiments.md         # lightweight: problem→change→result→learning
  /context/learnings.md           # measured learnings
  /context/businesses/{sandbar,lola-leads,coach-ty,ty-alexander-media}.md
  ```
- **Root `CLAUDE.md` (new)** — points Claude at `/context` + the decision rules
  so every build session starts aligned. (One does not exist today.)
- **`DECISIONS.md` (exists)** — keep as the append-only product/decision log;
  reference it from `/context`.
- **Database** — operational/changing data only: `lola_items`, GHL/opportunity
  cache, product tables, token usage.
- **NOT** a vector DB, embeddings, or a memory product. Markdown + SQLite is
  sufficient and stays cheap. Store distilled knowledge, never transcripts.

---

## 17. INTEGRATIONS FOR V1 (KEEP NOW / FIX NOW / LATER / REMOVE)

| Integration | Verdict | Why |
|---|---|---|
| **GoHighLevel** | **FIX NOW** | Write-only today; add a pipeline/opportunity **read** — it's the revenue spine of the whole command center. |
| **SQLite persistence** | **FIX NOW** | Confirm `DB_PATH`→Railway volume before storing tasks/memory. |
| **Stripe** | **KEEP NOW** | Cash-collected / recurring-revenue signal toward $4k/mo. |
| **Product Google stack (PageSpeed/Places/GSC/GA4/GBP), CallRail, PostHog, Resend** | **KEEP NOW** | Working; power the Lola Leads + Sandbar workspaces. Don't touch. |
| **Google Calendar (MCP)** | **LATER (v1.1)** | Feeds "Today" + time-aware urgency; cheap add once the brief exists. |
| **GitHub / Vercel (MCP)** | **LATER** | Surface Lola Dev work needing attention — after the revenue view lands. |
| **Twilio** | **LATER** | Gated off; outbound is via GHL. Leave dormant. |
| **Wix CRM** | **REMOVE** | Dead + buggy (§6.2). |
| **`automation/sequence_sender.py`** | **REMOVE** | Dead, sells retired products. |

---

## 18. UI / MOBILE RECOMMENDATION

- **Mobile-first, single scroll.** Open on your phone → in ~10 seconds see:
  (1) the one Most Important Next Step as a hero card, (2) Revenue Opportunities,
  (3) Waiting/Blocked, (4) a capture button for Inbox. Everything else below.
- **Reuse** the existing Tailwind token system (`frontend/src/index.css`,
  `tailwind.config.js`) and the `AdminRevenue` action-card idiom
  (`AdminRevenue.tsx:276`). No new design system, no component library.
- **New route** (e.g. `/hq` or `/brief`) rather than overloading `/admin/hq`
  (which stays the product-ops view). Admin-key gated like the rest.
- Each item card = title · workspace chip · the plain-language reason · a primary
  action. Tapping "done" moves it to Completed.
- **No native app.** The responsive SPA delivers this; a native app is
  unjustified for v1.

---

## 19. MINIMUM IMPLEMENTATION PLAN (ordered, with dependencies)

1. **Verify DB persistence** in Railway (`DB_PATH`→volume). *(blocks everything
   that stores state)* — XS.
2. **Add `workspace` + `lola_items`** tables/migrations (additive, no FKs).
   *(depends on 1)* — S.
3. **GHL pipeline read** → cache opportunities/estimates into a read model, tag
   by workspace where a GHL location maps to a business. *(depends on 1;
   independent of 2)* — M. *Do a 10-min live GHL check first to see which
   businesses have locations.*
4. **Priority engine** — deterministic ranking over `lola_items` + mirrored GHL/
   Stripe/product signals, producing Most Important Next Step + section buckets,
   each with a reason string. *(depends on 2, 3)* — M.
5. **Command Center view** — mobile-first `/brief` route consuming the engine.
   *(depends on 4)* — M.
6. **`/context` files + root `CLAUDE.md`** — seed durable context so builds stay
   aligned. *(independent; do alongside)* — S.
7. **Inbox capture** — the one add box writing to `lola_items`. *(depends on 2,
   part of 5)* — S.
8. *(Carryover, optional)* **Token observability** + **dead-code removal**
   (Wix, sequence_sender). — S.

**v1.1 (after v1 proves useful):** Calendar into "Today"; GitHub/Vercel for Lola
Dev; generalize per-workspace refresh (event-driven, not on-boot).

---

## 20. WHAT NOT TO BUILD (explicit scope cuts)

Repeating §8 as a commitment: **no** chatbot, **no** autonomous agents / swarm
expansion, **no** CRM (GHL is it), **no** full PM tool, **no** time-tracking
platform, **no** vector/embeddings memory, **no** enterprise auth/permissions,
**no** experiments platform, **no** social scheduler, **no** separate analytics
app, **no** gamification, **no** speculative "Lola skills" beyond the brief
itself, **no** elaborate Inbox auto-classification in v1. Remove Wix +
sequence_sender rather than maintain them.

---

## 21. RISKS / OPEN QUESTIONS (need your decision before implementation)

1. **One app or two?** Should the personal command center live *inside* this
   Lola-Leads deployment (new `/brief` route, shared DB) or as a **separate**
   thin app? Recommendation: **inside, for v1** (reuse everything), with the
   command-center data cleanly separated (`lola_items`, `workspace`) so it can be
   split out later if it earns it. Your call — it's the biggest architecture
   decision.
2. **Which businesses have a real GHL location** (Coach Ty? TAM? or only
   Sandbar/Lola-Leads)? Determines how much of "Revenue Opportunities" is
   automatic vs manual-entry in v1. *(I can verify live in ~10 min once
   authorized.)*
3. **How much personal/financial data** goes in behind the single admin key?
   That drives whether v1 needs a stronger auth story before it holds sensitive
   numbers (§12).
4. **$4k/mo scoreboard — automatic or manual?** Stripe gives recurring product
   revenue automatically; Coach Ty / TAM income may be manual entry. OK to start
   the scoreboard **manual** and automate per source later?
5. **Workspace list** — is the six-workspace set in §14 the right starting set,
   or add/remove any?

### DECISIONS LOCKED — 2026-09-25 (Ty)

1. **One app or two → REUSE.** v1 lives inside this deployment (new `/brief`
   route, shared DB), with command-center data cleanly separated
   (`workspace`, `lola_items`) so it can be split out later if it earns it.
2. **GHL locations → Sandbar + Lola Leads only.** Revenue Opportunities are
   auto-populated for these two workspaces. Coach Ty, TAM, Lola Dev, Personal
   are **manual-entry** in v1 (no GHL location to read).
3. **Personal/financial data behind the single admin key → Claude's call, ruled
   for best ROI: keep sensitive personal financial data OUT of v1.** Rationale:
   storing bank/personal-finance detail doesn't directly make money and *would*
   force an auth-hardening detour first. So v1 stores **only revenue-actionable
   data** — GHL pipeline (Sandbar + Lola Leads), Stripe cash/recurring, product
   hot leads, and manual tasks/opportunities per workspace. The **Personal/Admin
   workspace is task-capture only** (e.g. "renew LLC") — no sensitive dollar
   figures. The $4k scoreboard = Stripe (auto) + one manual revenue number per
   business/month (business revenue, not private finance). Any sensitive personal
   financial detail is deferred to v1.1 behind hardened auth.
4. **$4k/mo scoreboard → manual-start approved.** Stripe auto for product
   revenue; manual entry for Coach Ty / TAM; automate per-source later.
5. **Workspace set → the six in §14 stand:** `sandbar · lola-leads · coach-ty ·
   ty-alexander-media · lola-dev · personal`.

---

## 22. MINIMUM VIABLE LOLA

**If we only build/fix these, Lola stops being a product-ops dashboard and
becomes a personal command center that's useful immediately:**

1. **Fix DB persistence** (verify the Railway volume).
2. **Add `workspace` + one `lola_items` table** (tasks/inbox/opportunities),
   additive.
3. **Read GHL pipeline/opportunities** → so "where is money waiting?" is
   answerable across businesses.
4. **A deterministic, explainable priority engine** → the *Most Important Next
   Step*, with a plain-language reason, revenue-action-before-build baked in.
5. **A mobile-first `/brief` view** with: Most Important Next Step · Today ·
   Revenue Opportunities · Waiting/Blocked · Active · Inbox · Completed.
6. **A `/context` layer + root `CLAUDE.md`** for durable context.

That is the whole v1. Everything else waits for a real, repeated need.

**No implementation performed. Awaiting your review and a separate build
authorization.**
