# Tampa Bay Power Clean 2026 Launch Checklist

Status date: 2026-06-25

## Goal

Build Tampa Bay Power Clean as a separate LOLA OS client, not a Sandbar copy,
with the foundation to rank and be recommended across Google organic, Google
Maps/GBP, AI assistants, Bing, Apple Maps, and future local discovery surfaces.

## Master Plan Status

| Step | Status | Notes |
|---|---|---|
| 1. Scaffold client folder | Done | `CLIENTS/tampa-bay-power-clean/` exists with separate README and config. |
| 2. Add file-backed client config | Done | `client.json` is separate from Sandbar and now has 2026 tracking targets. |
| 3. Case-study tracking reads config | Done | `CASE_STUDIES["tampa-bay-power-clean"]` resolves from the client registry. |
| 4. Add future clients through generator | Ready | `scripts/create_client.py` exists; use it instead of copying Sandbar. |
| 5. Keep shared systems stable | In progress | Shared dashboard/reporting now avoids Sandbar-specific copy in generic cards. |
| 6. Create/verify landing page | Done | `/lp/tampa-bay-power-clean` has local SEO, schema, FAQ, service, and discovery-stack copy. |
| 7. Add rewrite + sitemap | Done | Existing Vercel rewrite/sitemap path should publish the landing page. |
| 8. Create production reporting row | Pending external | Needs admin key and final client email. |
| 9. Add GBP/Bing/Apple data | Pending external | Requires account access, verified NAP, photos, categories, service areas. |
| 10. Run first ranking snapshot | Pending keys | Needs Google Custom Search key; AI providers optional. |

## Built Today

- Tampa Bay Power Clean 2026 tracking list expanded for pressure washing,
  paver sealing, roof cleaning, soft washing, driveway cleaning, concrete
  cleaning, commercial pressure washing, and commercial roof cleaning.
- AI prompts expanded for ChatGPT, Claude, Perplexity, Gemini, Siri/Apple-style
  local discovery, and Bing-style recommendation language.
- Landing page copy updated for Google, LLMs, Bing, and Apple Maps readiness.
- Client dashboard genericized so it does not leak Sandbar language into Tampa.
- Competitor watchlist and multi-provider AI visibility are ready once snapshots
  can run.
- Print/PDF dashboard handoff is ready via `Save PDF`.

## What Can Go Live Without API Keys

- Static landing page: `/lp/tampa-bay-power-clean`
- Client dashboard shell: `/r/client/tampa-bay-power-clean`
- Revenue admin route: `/admin/revenue/tampa-bay-power-clean`
- Calls admin route: `/admin/calls/tampa-bay-power-clean`
- Client registry validation
- Frontend build/deploy

## What Needs Account Access

- Google Business Profile:
  - Claim/verify access.
  - Set primary category: pressure washing service or closest verified category.
  - Add services: pressure washing, paver sealing, roof cleaning, house washing,
    soft washing, driveway cleaning, concrete cleaning, commercial pressure washing.
  - Add service areas: Dunedin, Clearwater, Palm Harbor, Safety Harbor,
    Tarpon Springs, Pinellas County, Tampa Bay.
  - Add appointment/website URL with UTM tracking.
  - Add photos before publishing proof claims.
- Bing Places:
  - Mirror NAP, categories, services, service areas, photos, website URL.
- Apple Business Connect:
  - Mirror NAP, categories, logo/photos, website, call/quote action.
- Google Search Console:
  - Add `sc-domain:tampabaypowerclean.com` or URL prefix property.
- Analytics/call tracking:
  - Dedicated Tampa Bay Power Clean tracking number.
  - Dedicated form endpoint or event source.

## Google Business Profile Setup Values

Use these values when GBP access is available. Keep the website, GBP, Bing
Places, Apple Business Connect, citations, and future service pages consistent.

### Core Profile

- Business name: `Tampa Bay Power Clean`
- Website: `https://www.tampabaypowerclean.com/`
- Temporary phone: `727-712-6281`
- Final phone: replace with the dedicated Tampa Bay Power Clean tracking number
  once it exists.
- Public landing page while domain access is pending:
  `https://lola.tyalexandermedia.com/lp/tampa-bay-power-clean`
- Appointment/quote URL:
  `https://www.tampabaypowerclean.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp`

### Category Plan

- Primary category: pressure washing service or closest verified GBP category.
- Secondary categories, only if available and accurate:
  - Cleaning service
  - Commercial cleaning service
  - Gutter cleaning service
  - Window cleaning service, only if actually offered

Do not add categories for services the business will not perform.

### Service List

Add each service with short, non-spammy descriptions:

- Pressure Washing
- Power Washing
- Roof Cleaning
- Roof Washing
- House Washing
- Soft Washing
- Paver Sealing
- Paver Cleaning
- Driveway Cleaning
- Concrete Cleaning
- Pool Cage Cleaning
- Lanai Cleaning
- Commercial Pressure Washing
- Commercial Roof Cleaning

### Service Areas

Start with:

- Dunedin
- Clearwater
- Palm Harbor
- Safety Harbor
- Oldsmar
- Tarpon Springs
- Ozona
- Crystal Beach
- Countryside
- Belleair
- Pinellas County
- Tampa Bay

Keep service areas tight. Do not add every Florida city unless there is real
service coverage and a reason to compete there.

### First Photo Upload Batch

Upload real, approved photos only:

- Logo
- Cover image
- Team or equipment photo
- Before/after: roof cleaning
- Before/after: pressure washing
- Before/after: paver sealing
- Before/after: driveway or concrete cleaning
- Before/after: pool cage or lanai cleaning
- Commercial exterior cleaning photo, if available

Name files descriptively before uploading, for example:

- `tampa-bay-power-clean-roof-cleaning-dunedin.jpg`
- `tampa-bay-power-clean-paver-sealing-clearwater.jpg`
- `tampa-bay-power-clean-pool-cage-cleaning-palm-harbor.jpg`

### First GBP Post

Suggested first post:

```text
Tampa Bay Power Clean is now accepting pressure washing, roof cleaning,
soft washing, paver sealing, driveway cleaning, pool cage cleaning, and
commercial exterior cleaning requests in Dunedin and nearby Pinellas County
communities. Call 727-712-6281 to request a quote.
```

Use a real service photo, not a stock image or AI image, for the first post.

### Review Request Language

Send only after a real job is completed:

```text
Thanks again for choosing Tampa Bay Power Clean. If the work looked great,
would you leave us a quick Google review? It helps local Dunedin and Pinellas
County homeowners find us for pressure washing, roof cleaning, paver sealing,
and soft washing.
```

Do not script customers to mention a specific city or service. Ask naturally;
real review language is safer and more durable.

## API Keys To Add Later

- `GOOGLE_CUSTOM_SEARCH_API_KEY` and `GOOGLE_CUSTOM_SEARCH_CX`
  - Unlocks organic ranking snapshots and competitor watchlist.
- `ANTHROPIC_API_KEY`
  - Unlocks Claude AI visibility rows and enhancement features.
- `OPENAI_API_KEY`
  - Unlocks ChatGPT AI visibility rows.
- `PERPLEXITY_API_KEY`
  - Unlocks Perplexity/Sonar AI visibility rows.
- `GEMINI_API_KEY`
  - Unlocks Gemini AI visibility rows.
- `BING_WEBMASTER_API_KEY`
  - Unlocks Bing performance dashboard card.

## First Production Commands

Create/update the reporting client row after the admin key exists:

```bash
curl -X POST https://lola-backend-production.up.railway.app/admin/reporting/clients \
  -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d @CLIENTS/tampa-bay-power-clean/reporting-client.payload.json
```

Run the first ranking snapshot after Google Custom Search is configured:

```bash
curl -X POST -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  "https://lola-backend-production.up.railway.app/admin/case-study/tampa-bay-power-clean/run?notes=day-0-2026-foundation"
```

## Today's Definition Of Done

- Code builds locally.
- Client registry verifies both Sandbar and Tampa Bay Power Clean.
- Tampa has its own client config, tracking list, prompts, landing page, and dashboard route.
- No fake ranking/review/performance data is published.
- The remaining work is external setup, credentials, first snapshot, and GBP/Bing/Apple profile completion.
