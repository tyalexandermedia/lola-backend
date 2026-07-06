# Tampa Bay Power Clean — SEO + CRO Strategy 2026

Status date: 2026-07-03
Objective: make tampabaypowerclean.com objectively stronger than sandbarsoftwash.com
(the benchmark) in SEO, CRO, UX, performance, trust signals, and local search
authority — while remaining its own brand.

Benchmark: https://www.sandbarsoftwash.com (source: `sandbar-site` repo)
Current live site: https://www.tampabaypowerclean.com (Wix; domain transfer pending)
New deploy-ready site: `frontend/public/lp/tampa-bay-power-clean*.{html}` on
`lola.tyalexandermedia.com`, built so it can become tampabaypowerclean.com at cutover.

---

## 1. Executive summary

Tampa Bay Power Clean's live site is a Wix build with weak conversion
architecture and shallow local relevance. Sandbar wins today on every measurable
axis: benefit-led copy, instant-quote funnel, trust density, page speed, city
pages, schema depth, and review proof.

This branch ships the foundation that flips the technical axes immediately:

- **Full homepage redesign** (customer-facing, benefit-first, quote form above
  the fold — a step *beyond* Sandbar, whose hero links out to a separate quote page).
- **Three money pages** — Roof Cleaning, House Washing, Paver Cleaning & Sealing —
  carrying ~80% of homepage authority via hero cards, nav, and footer links.
- **Fixed routing** (the published URLs previously fell through to the Lola SPA —
  the pages were unreachable at their extensionless URLs) and **sitemap entries**.
- **Same-origin lead capture** wired into the Lola dashboard funnel
  (`/lead-gen/webhook/form`, `client_slug=tampa-bay-power-clean`).
- **Complete schema graph**: LocalBusiness + OfferCatalog + WebSite + WebPage +
  BreadcrumbList + FAQPage on every page; Service schema on service pages.

What code cannot ship: review counts, star ratings, GBP strength, and real
before/after photos. Those are gated on account access (Section 10) and are the
highest-ROI remaining lever. **No fabricated proof was published.**

Expected effect once GBP + reviews are live: the site out-structures Sandbar
(Sandbar's own playbook, executed harder, on a tighter geography with fresher
copy) while the map-pack work compounds.

---

## 2. Current-state audit (live Wix site)

Evidence: prior-session catalog of the Wix build (`sandbar-site/src/pages/
tampa-bay-power-clean.astro` references its media), Wix hosting characteristics,
and repo docs. Direct fetch is blocked from this environment (Wix bot 403 +
proxy policy), so treat items marked (†) as to-verify-on-access.

| Area | Finding | Severity |
|---|---|---|
| Platform | Wix — heavy JS runtime, limited schema control, slow mobile LCP typical (50–70 Lighthouse mobile) (†) | High |
| IA | Single-page-ish brochure; no dedicated service pages ranked by value; no city pages | High |
| H1/headings | Generic ("Roof Wash", "Soft Wash" images as content); no keyword-mapped H1-H6 tree (†) | High |
| Copy | Feature-led, thin; does not answer search intent; no benefit framing | High |
| CTAs | Phone only; no quote form above fold; no response-time promise | High |
| Trust | No review integration, guarantee framing, insurance badge, process explanation | High |
| Schema | Wix default only (basic LocalBusiness at best); no FAQ/Service/Breadcrumb (†) | High |
| Local SEO | No city-level relevance; one implicit service area | High |
| Metadata/OG | Default Wix patterns; no per-intent titles (†) | Medium |
| Images | Wix CDN is fine, but no alt-text strategy, no before/after pairs | Medium |
| Internal links | Nearly none — no silo between services/areas/FAQ | High |
| Performance | Wix runtime JS; CWV pass unlikely on mobile (†) | High |

## 3. Benchmark scorecard — TBPC (new build) vs Sandbar

| Axis | Sandbar today | TBPC new build | Verdict |
|---|---|---|---|
| Above-fold conversion | Hero CTA → separate /instant-quote page | Quote form **in the hero**, phone + sticky mobile bar | **TBPC** |
| Benefit-led hero | "Don't Replace Your Roof. Restore It." + $25–50K anchor | "Don't replace it. Restore it." + $15–30K anchor + who/where/why | Parity+ |
| Service hierarchy | 7 equal service cards + paver feature | 3 hero-weighted money services (~80% authority) + 8 compact secondary | **TBPC** |
| Schema | FAQ + OfferCatalog + LocalBusiness (Base layout) | Full @graph incl. Breadcrumb, Service pages, OfferCatalog w/ URLs | **TBPC** |
| Review proof | 93+ real reviews, 4.9★, platform badges | **None publishable yet** — gated on GBP access | **Sandbar** (until §10) |
| City coverage | 12 city pages + county pages | 9 city sections; dedicated city pages = next phase | **Sandbar** (until Phase 2) |
| Content depth (money services) | Roof-type pages (tile/shingle/metal) | Roof-type sections on one page; split pages = Phase 2 | Sandbar, narrowly |
| Performance budget | Astro static, ~zero JS | Static HTML, system fonts, 1 preloaded hero image, ~40 lines JS | **TBPC** |
| Educational content | FAQs + blog + YouTube | Algae education section + FAQs; blog = Phase 2 | Sandbar |
| Instant-quote calculator | Yes (price-estimating) | Form only (24h promise); calculator = Phase 2 | Sandbar |

Bottom line: the new build beats Sandbar structurally and on conversion
mechanics; Sandbar's remaining edge is *earned proof* (reviews, photos,
YouTube) and *content volume* (city pages, blog). The roadmap below closes both.

---

## 4. What shipped on this branch (implementation log)

| Deliverable # | Item | Where |
|---|---|---|
| 1 | Full homepage redesign | `frontend/public/lp/tampa-bay-power-clean.html` |
| 3, 10, 11 | Technical SEO: canonical, OG/Twitter, geo meta, robots, full JSON-LD graph, FAQ schema | all 4 pages |
| 5 | Mobile optimization: sticky call/quote bar, 44px+ targets, single-column layouts, form font-size 16px (no iOS zoom) | all 4 pages |
| 6, 7 | New IA + service hierarchy: Roof → House → Paver as hero cards/nav/footer; 8 secondary services compacted | homepage |
| 8 | Internal linking: nav ↔ 3 service pages ↔ "pairs well with" cross-links ↔ footer silo + breadcrumbs | all pages |
| 9 | Complete copy rewrite: benefit-led, intent-answering, local-expert voice | all pages |
| 12, 13 | Page-speed: static HTML, system font stack (no font download), inline critical CSS, lazy-loaded AVIF images with width/height, preloaded LCP hero, ~40 lines of JS total | all pages |
| 14 | Accessibility: semantic landmarks, aria-labels, single H1s, labeled form fields, focus styles, contrast-checked palette | all pages |
| — | CRO: above-fold quote form, honeypot, 24h promise, dual CTA, trust bar, HOA-notice angle, cost-of-waiting anchors | all pages |
| — | Lead plumbing: `/lead-gen/(.*)` same-origin Vercel proxy → Railway webhook; direct-URL fallback in JS; events land in the TBPC dashboard funnel | `frontend/vercel.json`, page JS |
| — | Routing fix: `/tampa-bay-power-clean*` extensionless URLs previously fell through to the SPA | `frontend/vercel.json` |
| — | Sitemap entries for all 4 pages | `frontend/public/sitemap.xml` |
| — | Maintainable generator for service pages | `scripts/gen_tbpc_service_pages.py` |

Remaining deliverables (2, 4, 15–20) are covered in Sections 5–9 below.

---

## 5. ROI-prioritized roadmap

Lead-lift estimates assume the current baseline of near-zero organic leads and
are directional, not promises. Effort: S ≤ 2h · M ≤ 1 day · L ≤ 1 week.

### HIGH ROI — do first

| # | Action | Impact | Effort | Expected lead effect |
|---|---|---|---|---|
| H1 | **Claim GBP admin access**; set primary category "Pressure washing service", add all services, service areas (Dunedin→St. Pete), hours, photos, booking link with UTM | The #1 local-lead lever; map pack ≈ half of local service leads | S (external) | +5–15 calls/mo once ranking |
| H2 | **Review engine**: ask every completed job for a Google review mentioning the service + city ("roof cleaning in Dunedin"); target 2–4/mo velocity; respond to all | Review count/velocity are top map-pack factors; unlocks rating badges + AggregateRating schema on site | S ongoing | Compounds H1; +20–40% conversion once badges go live |
| H3 | **Merge this branch + verify deploys**: pages live at `/tampa-bay-power-clean{,/roof-cleaning,/house-washing,/paver-sealing}`; submit sitemap in GSC | Everything else depends on it | S | Enables all below |
| H4 | **Point tampabaypowerclean.com at the new build** (domain transfer / Vercel alias) and flip canonicals from cross-domain to self; 301 Wix URLs | Consolidates all authority on the brand domain; kills the Wix performance ceiling | M (mostly external) | Structural; unlocks organic compounding |
| H5 | **Dedicated CallRail number + form attribution** for TBPC (replace shared intake) | Clean attribution → provable ROI → informed spend | S (external) | Measurement, not volume |
| H6 | **Real before/after photos** (10–20 jobs): swap into gallery + service pages with descriptive alt text (`roof cleaning dunedin before after`) | Proof is the #1 conversion gap vs Sandbar | S per batch | +15–30% form conversion |
| H7 | **City landing pages** (Phase 2 of this codebase): `roof-cleaning-clearwater`, `roof-cleaning-palm-harbor`, `house-washing-largo`, `paver-sealing-st-petersburg`, etc. — reuse `scripts/gen_tbpc_service_pages.py` pattern, unique local copy per page, no doorway spam | Captures "service + city" queries where Sandbar's 12 city pages currently win | M–L | +30–60% organic sessions over 2–3 mo |
| H8 | **Google Search Console + GA4 properties** for the brand domain; wire `PUBLIC_GA4_ID`-style tag when domain cutover happens | Can't steer what you can't see | S (external) | Measurement |

### MEDIUM ROI — next 30–60 days

| # | Action | Impact | Effort | Expected lead effect |
|---|---|---|---|---|
| M1 | **Instant quote calculator** (match Sandbar's `/instant-quote`, improve with roof-type + paver-area presets; reuse its calibration approach) | Sandbar's single best CRO asset; TBPC form is good, calculator is better for high-intent | M | +10–25% quote starts |
| M2 | **Roof-type deep pages** (tile / shingle / metal) mirroring the roof cluster; internal-link from roof page | Wins long-tail ("tile roof cleaning palm harbor") and AI citations | M | +10–20% roof-service organic |
| M3 | **Blog: 2 posts/mo targeting high-intent local keywords** (see §8 list) | Topical authority + AI Overview source material | M ongoing | Compounds; 3–6 mo horizon |
| M4 | **Bing Places + Apple Business Connect** mirroring GBP NAP/categories/photos | Cheap incremental discovery (Siri/Apple Maps, Bing/Copilot) | S (external) | +2–5% leads |
| M5 | **Citations**: Yelp, Angi, HomeAdvisor, Nextdoor, Thumbtack, BBB, local chambers (Dunedin, Clearwater) with exact NAP | Entity consistency for map pack + AI assistants | M | Supports H1 |
| M6 | **Maintenance plan page** ("Stay-Clean"-style annual membership, own branding) + bundle pricing module | Raises LTV + average ticket (Priority #3); differentiator vs most competitors | M | +10–20% avg ticket |
| M7 | **Financing partner** (Wisetack et al.) for $2k+ paver/roof jobs, if owner approves | Unlocks bigger tickets | S (external) | +ticket size |
| M8 | **YouTube channel + embedded before/after clips** (phone footage is fine) | Proof + second discovery surface; Sandbar already does this | M ongoing | Trust compounding |
| M9 | **AggregateRating schema** once ≥ ~10 real Google reviews and rating is stable | Stars in SERP → CTR lift | S | +10–20% organic CTR |

### LOW ROI — later / opportunistic

| # | Action | Impact | Effort |
|---|---|---|---|
| L1 | Cost-of-waiting calculator (interactive algae-damage estimator) | Novel engagement; small direct lead effect | M |
| L2 | Interactive service comparison table (soft wash vs pressure wash) | Educational; partial overlap with existing sections | S |
| L3 | Neighborhood-level pages (Dunedin Isles, Countryside, etc.) | Only after city pages prove out; doorway risk if thin | L |
| L4 | Commercial line pages (storefront/HOA/property-manager funnels) | Different buyer; worth it once residential engine runs | M |
| L5 | Before/after slider widgets | Nice-to-have; static pairs convert nearly as well | S |
| L6 | Educational video series (roof algae explainers) | Long-horizon authority | L |

---

## 6. Local SEO roadmap (deliverable 15)

**Entity foundation (week 1–2)**
1. GBP claim → category, services, areas, photos, hours, attributes (H1).
2. Exact-match NAP decided once the dedicated number exists (H5) — *then* roll
   citations (M5). Do not build citations on the shared intake number.
3. GSC + Bing Webmaster properties; submit sitemaps.

**Relevance (week 2–6)**
4. City pages (H7) interlinked: each city page links its 2 sibling services in
   the same city + the service hub + home. Service hubs link all their city pages.
5. Breadcrumbs everywhere (shipped on service pages).

**Prominence (ongoing)**
6. Review velocity 2–4/mo with service+city language (H2).
7. GBP posts weekly (see §7). Photo uploads with every completed job.
8. Backlinks (§9).

**Topical authority clusters** (each = hub page + city pages + blog support):
- Roof Cleaning: `roof cleaning {dunedin,clearwater,palm harbor,largo}`,
  `soft wash roof cleaning`, `black streaks on roof`, `roof algae removal`,
  `tile roof cleaning`, `shingle roof cleaning`
- House Washing: `house washing {dunedin,pinellas county}`, `soft washing
  {dunedin,tampa bay}`, `stucco cleaning`, `exterior house cleaning`
- Paver Sealing: `paver sealing {pinellas county,dunedin,clearwater}`,
  `paver cleaning and sealing`, `travertine sealing`, `pool deck sealing`

## 7. GBP content recommendations (deliverable 17)

- **Weekly post cadence** rotating: (a) before/after photo + one-line outcome +
  city, (b) seasonal prompt ("Rainy season is algae season in Pinellas"),
  (c) offer post (roof+house bundle), (d) FAQ answer reused from site.
- **Photos**: minimum 3/week from real jobs, geotagged city in filename +
  caption ("paver-sealing-palm-harbor-after.jpg").
- **Q&A**: seed the 8 homepage FAQs as GBP Q&A (owner-answered).
- **Services**: mirror the site's 3+8 hierarchy; write 300-char descriptions
  using the same benefit language as the site (entity consistency).
- **Booking link**: `https://www.tampabaypowerclean.com/?utm_source=gbp&utm_medium=organic&utm_campaign=profile#quote`
  (use the lola.tyalexandermedia.com URL until cutover).
- **Review replies**: every review answered within 48h, naming the service and
  city naturally ("Glad the roof cleaning in Dunedin turned out…").

## 8. Blog strategy — high-intent local keywords (deliverable 18)

2/mo; every post ends with the quote CTA and internal-links a money page.
Priority order:

1. "How much does roof cleaning cost in Pinellas County? (2026 pricing guide)"
2. "Black streaks on your roof: what they are and what they're costing you"
3. "Paver sealing in Florida: how often, what it costs, what happens if you skip it"
4. "Soft washing vs pressure washing: what Dunedin homes actually need"
5. "Got an HOA violation letter about your roof? Here's the fastest fix"
6. "How long does a roof cleaning last in Tampa Bay humidity?"
7. "Selling your home in Clearwater? The $400 curb-appeal move agents recommend"
8. "Tile roof cleaning in Palm Harbor: why zero-foot-traffic matters"
9. "Pool deck pavers turning black? The mold-sand-sealer cycle explained"
10. "Do solar panels need cleaning in Florida? (What the output data says)"

Format for each: question-led H1 · direct answer in the first 60 words (AI
Overview extraction) · price ranges as market context · local specifics ·
FAQ block with schema · CTA.

## 9. Backlink opportunities (deliverable 16)

| Source | Play | Effort |
|---|---|---|
| `sandbarsoftwash.com/tampa-bay-power-clean` | Already live — strengthened this branch with deep links to the 3 new service pages | Done |
| `lola.tyalexandermedia.com` case-study/portfolio pages | Natural agency-portfolio link once results exist | S |
| Dunedin + Clearwater chambers of commerce | Member directory links | S ($) |
| Nextdoor / neighborhood FB groups | Profile + participation (no spam); strong local signal + direct leads | S ongoing |
| Local news (Tampa Bay Times HomeTeam, Patch Dunedin) | Pitch seasonal story: "rainy-season roof algae" with before/after photos | M |
| Suppliers/manufacturers (sealer + softwash chem brands) | "Find an applicator" directories | S |
| HOA / property-manager associations (Pinellas CAI chapter) | Vendor directory + newsletter | M |
| Sponsorships (Dunedin youth sports, Highland Games, local events) | Site + program links, brand searches | S ($) |
| BBB, Angi, Houzz, Porch profiles | Profile links + citations | S |

## 10. Verified-proof gate — do not publish until access/approval

Consistent with prior governance (no fabricated data):

- ❌ Star ratings, review counts, AggregateRating schema → until GBP access + ~10 reviews.
- ❌ "Years in business / jobs completed" numbers → until owner confirms.
- ❌ Certifications (e.g., paver-sealing certs) → until documented.
- ✅ Already published as owner-controllable policy claims (confirm with owner
  at merge): *fully insured*, *family-owned*, *quotes within 24 hours*,
  *satisfaction guaranteed*. If any is not true, edit the trust bar/hero lists
  in the 4 HTML pages and regenerate (`scripts/gen_tbpc_service_pages.py`).

## 11. AI Overview / AI search optimization (deliverable 19)

Shipped: question-led H2s; first-paragraph direct answers; FAQPage schema on
every page; entity-consistent NAP + service + area language; OfferCatalog with
service URLs; `knowsAbout` on the business entity; clean static HTML (fully
renderable without JS).

Next: blog posts in §8 formatted answer-first; GBP/Bing/Apple entity mirroring
(M4/M5); tracking via the existing `ai_mode_prompts` snapshot system in
`client.json` once API keys land (`OPERATIONS/tampa-bay-power-clean-2026-launch-checklist.md`).

## 12. Performance & accessibility budget (deliverables 12–14)

Shipped pages hold to: single HTML file per page · no webfonts · inline CSS
(~10 KB) · ≤ 40 lines vanilla JS · one preloaded local LCP image · AVIF service
images lazy-loaded with explicit dimensions · no third-party scripts. Expected
Lighthouse: 95+ across the board (verify post-deploy with PSI; the
`GOOGLE_PAGESPEED_API_KEY` flow in `HANDOFF.md` automates this).

Accessibility: landmarks, aria-labels on icon links, form labels, 44px touch
targets, prefers-reduced-motion-safe (no animations beyond hover transforms),
contrast ≥ 4.5:1 for body text.

## 13. Domain cutover checklist (when transfer completes)

1. Point tampabaypowerclean.com at the Vercel project (or a dedicated project
   serving `frontend/public/lp/tampa-bay-power-clean*` at root paths).
2. Rewrite URLs: `/tampa-bay-power-clean` → `/`, `/tampa-bay-power-clean/x` → `/x`
   (find/replace in the 4 HTML files + regenerate script constants).
3. Canonicals already point at `https://www.tampabaypowerclean.com/...` — they
   become self-referential automatically. Update sitemap `loc`s + robots.txt.
4. 301-map old Wix paths → new pages. Keep the Wix media CDN images until
   re-hosted locally (then swap `static.wixstatic.com` URLs).
5. Update GBP/citations website links; resubmit sitemaps in GSC/Bing.
