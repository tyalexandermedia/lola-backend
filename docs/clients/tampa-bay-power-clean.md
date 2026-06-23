# Tampa Bay Power Clean Client Setup

## Overview

- Client name: Tampa Bay Power Clean
- Slug: `tampa-bay-power-clean`
- Website: https://www.tampabaypowerclean.com
- Industry: Pressure washing / exterior cleaning / power washing
- Market: Tampa Bay, Florida
- Primary service area: Tampa Bay

Services configured for tracking and landing-page copy:

- Pressure Washing
- Power Washing
- Paver Sealing
- House Washing
- Driveway Cleaning
- Roof Cleaning
- Residential Roof Cleaning
- Commercial Roof Cleaning
- Soft Washing
- Commercial Pressure Washing
- Paver Cleaning
- Concrete Cleaning

## Routes Created

- Public client dashboard: `/r/client/tampa-bay-power-clean`
- Client landing page: `/lp/tampa-bay-power-clean`
- Revenue admin UI: `/admin/revenue/tampa-bay-power-clean`
- Revenue agent run endpoint: `POST /admin/revenue/tampa-bay-power-clean/run`
- Case-study snapshot endpoint: `POST /admin/case-study/tampa-bay-power-clean/run`
- Admin calls endpoint: `/admin/calls/tampa-bay-power-clean`
- Admin tracking endpoint: `/admin/tracking/tampa-bay-power-clean`

## Config Files Added or Updated

- `CLIENTS/tampa-bay-power-clean/client.json`
  - Canonical non-secret client metadata, services, and tracking prompts.
- `CLIENTS/tampa-bay-power-clean/README.md`
  - Client-specific scaffold documentation.
- `client_configs.py`
  - File-backed client registry loader shared by backend config.
- `case_studies/configs.py`
  - `CASE_STUDIES["tampa-bay-power-clean"]` is built from the client registry.
  - `CASE_STUDIES["sandbar"]` is also built from its registry file without
    changing the Sandbar slug, target URL, query list, or dashboard behavior.
- `frontend/public/lp/tampa-bay-power-clean.html`
  - Client-specific static landing page and SEO test asset.
  - Focus: paver sealing, roof cleaning, house washing, commercial pressure
    washing, and commercial roof cleaning in Dunedin and Tampa Bay.
  - Includes LocalBusiness, FAQ, and breadcrumb schema.
  - Any unverified proof/review content is explicitly marked as placeholder.
  - Does not depend on GBP access and does not claim rankings, review counts,
    GBP metrics, or fabricated performance data.
- `frontend/vercel.json`
  - Added rewrite for `/lp/tampa-bay-power-clean`.
- `frontend/public/sitemap.xml`
  - Added sitemap entry for the client landing page.
- `scripts/create_client.py`
  - Safe new-client scaffold generator for future clients.
- `scripts/verify_client_registry.py`
  - Smoke check that Sandbar and Tampa registry configs resolve through the
    existing case-study layer.

## Backend Capabilities

The client uses the same slug-based LOLA OS backend surfaces as Sandbar:

- Revenue Agent tables and summary by slug.
- Calls from `tracked_calls`.
- Leads from `tracked_events`.
- Estimates from `revenue_estimates`.
- Opportunities from `revenue_opportunities`.
- Won jobs from `won_jobs`.
- Revenue influenced from the Revenue Agent summary.
- SEO/ranking snapshots from the case-study tracker.
- AI visibility snapshots from `ai_mode_prompts`.
- Reporting tasks and weekly reporting support once a `reporting_clients` row is created.

## SEO Test Focus

Tampa Bay Power Clean complements Sandbar instead of competing with the same
proof story. Sandbar remains focused on its established soft washing, roof
washing, house washing, and local proof. Tampa Bay Power Clean targets a
separate lead-gen angle:

- `paver sealing Dunedin`
- `paver sealing Tampa Bay`
- `commercial pressure washing Dunedin`
- `commercial pressure washing Tampa Bay`
- `commercial roof cleaning Dunedin`
- `commercial roof cleaning Tampa Bay`
- `residential roof cleaning Dunedin`
- `residential roof cleaning Tampa Bay`
- `roof cleaning Dunedin`
- `roof cleaning Tampa Bay`
- `house washing Dunedin`
- `house washing Tampa Bay`

Primary service areas:

- Dunedin
- Clearwater
- Palm Harbor
- Safety Harbor
- Tarpon Springs
- Tampa Bay

Call and quote CTAs currently route through the existing Sandbar/LOLA intake
workflow because no dedicated Tampa Bay Power Clean tracking number is
configured in repo config yet.

## Data Sources Still Needed

No fabricated performance data was added.

To make the dashboard live in production, configure or collect:

- Current production admin key for admin endpoints.
- Reporting client row via `POST /admin/reporting/onboard` or `/admin/reporting/clients`.
- Call tracking provider/webhook data for `tampa-bay-power-clean`.
- Dedicated Tampa Bay Power Clean tracking number or form endpoint, if this
  test asset should stop routing through the existing intake workflow.
- Quote form or lead capture events into `tracked_events`.
- Google Search Console property, if available.
- GA4 property ID, if available.
- Google Business Profile integration, if available. GBP is not required for
  the current landing-page test and no GBP data is fabricated.
- Verified phone number for the landing-page call CTA.
- Verified testimonials/reviews and before/after photos for the landing page.
- Brevo/weekly reporting recipient email and template, if weekly reports should send.

Suggested onboarding payload:

```json
{
  "slug": "tampa-bay-power-clean",
  "client_name": "Tampa Bay Power Clean",
  "client_email": "replace-with-client-email@example.com",
  "site_url": "https://www.tampabaypowerclean.com",
  "target_url": "https://www.tampabaypowerclean.com",
  "tier": "growth",
  "service": "pressure washing",
  "city": "Tampa Bay, FL",
  "money_keywords": [
    "paver sealing dunedin",
    "paver sealing tampa bay",
    "commercial pressure washing dunedin",
    "commercial pressure washing tampa bay",
    "commercial roof cleaning dunedin",
    "commercial roof cleaning tampa bay",
    "residential roof cleaning dunedin",
    "residential roof cleaning tampa bay",
    "roof cleaning dunedin",
    "roof cleaning tampa bay",
    "house washing dunedin",
    "house washing tampa bay",
    "paver sealing clearwater",
    "commercial pressure washing clearwater",
    "roof cleaning clearwater",
    "house washing clearwater"
  ],
  "ai_mode_prompts": [
    "Who should I call for paver sealing in Dunedin, Florida?",
    "Recommend a paver sealing company in Tampa Bay.",
    "Best commercial pressure washing company in Dunedin, FL?",
    "Who offers commercial pressure washing across Tampa Bay?",
    "Recommend a residential roof cleaning company in Dunedin.",
    "Who handles commercial roof cleaning in Tampa Bay?",
    "Best house washing company in Dunedin or Clearwater?",
    "Who should I call for roof cleaning and house washing in Tampa Bay?"
  ],
  "seed_tasks": true
}
```

## Local Verification

Run:

```bash
.venv/bin/python -m py_compile main.py db/revenue.py db/tracking.py agents/revenue_agent/main.py client_configs.py case_studies/configs.py scripts/create_client.py scripts/verify_client_registry.py
.venv/bin/python scripts/verify_client_registry.py
npm --prefix frontend run build
git diff --check
```

Optional backend route smoke check once the FastAPI app is running:

```bash
curl http://localhost:8000/reporting/public/tampa-bay-power-clean
curl http://localhost:8000/reporting/public/sandbar
```

Optional frontend route check once Vite is running:

```bash
curl http://localhost:5173/r/client/tampa-bay-power-clean
curl http://localhost:5173/lp/tampa-bay-power-clean
curl http://localhost:5173/r/client/sandbar
```

## Deploy

1. Push the branch to GitHub.
2. Open a draft PR.
3. Let Railway deploy the backend from the merged branch.
4. Let Vercel deploy the frontend from `frontend/`.
5. Verify:
   - `/r/client/tampa-bay-power-clean`
   - `/lp/tampa-bay-power-clean`
   - `/r/client/sandbar`

## Safety Notes

- Sandbar slugs, configs, dashboards, routes, docs, and data were not renamed or removed.
- Tampa Bay Power Clean is added as a separate slug and separate landing page.
- Placeholder sections are marked as placeholder/demo until verified proof is available.
