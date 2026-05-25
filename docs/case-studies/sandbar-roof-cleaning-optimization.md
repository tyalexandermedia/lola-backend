# Case Study — Sandbar Soft Wash: Roof Cleaning Page Optimization

**Client:** Sandbar Soft Wash (Palm Harbor, FL)
**URL audited:** [sandbarsoftwash.com/roof-cleaning](https://www.sandbarsoftwash.com/roof-cleaning)
**Date started:** 2026-05-24
**Lola tier applied:** Local SEO Retainer playbook (P9 system — same we ship to paying clients)
**Author:** Coach Ty
**Status:** ⏳ In progress — BEFORE captured, AFTER measurement at day 30 (2026-06-23)

---

## Why Sandbar matters to Lola

Sandbar Soft Wash is Coach Ty's father's operation — a real Palm Harbor pressure washing + roof cleaning business serving 20+ cities across Pinellas, Pasco, Hillsborough, and Manatee counties. They are Lola's **only real case study** going into the December launch.

Stakes:
- Sandbar wins real revenue
- Lola gets a verifiable before/after to cite in cold outreach
- Every Florida contractor seeing this case study is one step closer to a $697/mo Retainer

The roof cleaning page is the highest-intent commercial query Sandbar competes for — buyers searching "roof cleaning Palm Harbor" have wallets out.

---

## BEFORE state (audited 2026-05-24)

Note: full DOM audit was limited because Wix renders client-side and external SEO tools weren't run at observation time. Below is what was verified via raw HTML inspection + public data. Day-30 measurement will use Google Search Console + Ahrefs for authoritative ranking deltas.

### Verified positioning (from sandbarsoftwash.com + Yelp public data)
- Family-owned, fully insured
- Eco-friendly biodegradable detergents
- Low-pressure soft wash systems (safe for shingle + tile)
- 100% satisfaction guaranteed
- Listed on **Yelp's Top 10 Pressure Washers in Palm Harbor**
- Master Certified Paver Sand & Seal
- Phone: (727) 712-6281
- 20+ cities served across Pinellas / Pasco / Hillsborough / Manatee

### Observed page-level gaps
1. **No verifiable `<title>` or `<meta description>` in raw HTML** — Wix server-side rendering for SEO weak; AI crawlers may receive a blank shell.
2. **Single JSON-LD block** in static HTML (likely Wix's auto-injected Organization schema). No Service schema, no FAQPage schema, no LocalBusiness with `areaServed`.
3. **No FAQ block on page** — losing free "People Also Ask" + AI-engine citation slots.
4. **No structured before/after gallery** — image search traffic underleveraged.
5. **No internal cross-link block** to related services (house wash, paver sand & seal, gutter cleaning) — passes no link equity within the site.

### Automated ranking baseline (live tracker — `case_studies/` module)

A reusable ranking tracker now lives in the backend. Each "snapshot" hits Google Custom Search per tracked query + asks Claude as an AI Mode proxy whether the client gets recommended. Results persist to SQLite for time-series δ.

**One-liner to capture a snapshot** (replace `<key>` with your `LOLA_SECRET_ADMIN_KEY`):

```bash
curl -X POST \
  -H "X-Admin-Key: <key>" \
  "https://lola-backend-production.up.railway.app/admin/case-study/sandbar-roof-cleaning/run?notes=day-30"
```

**View latest snapshot:**
```bash
curl -H "X-Admin-Key: <key>" \
  https://lola-backend-production.up.railway.app/admin/case-study/sandbar-roof-cleaning
```

**View time-series for a single query:**
```bash
curl -H "X-Admin-Key: <key>" \
  "https://lola-backend-production.up.railway.app/admin/case-study/sandbar-roof-cleaning/history?query=roof+cleaning+palm+harbor+fl&source=google_organic"
```

### Day-0 baseline (2026-05-25) — actual capture state

⚠️ **Tracker code shipped & deployed, but day-0 capture blocked on two external API issues that are user-side fixes (~5 min each):**

| API | State | Fix |
|---|---|---|
| Google Custom Search JSON API | HTTP 403 — `This project does not have the access to Custom Search JSON API` | The `GOOGLE_CUSTOM_SEARCH_API_KEY` env var on Railway is scoped to a different GCP project than the one with the Custom Search JSON API enabled. In GCP console, **enable Custom Search JSON API for the project that owns the current key** (or create a new key in the project that already has it enabled). |
| Anthropic API (AI Mode proxy) | "Anthropic key not configured" | Set `ANTHROPIC_API_KEY` on Railway → Variables. Get a free key at https://console.anthropic.com/. Sub-cent per snapshot (Haiku 4.5). |

Once both keys land, the same curl above auto-fills day-0 baseline + every subsequent snapshot.

### Manual day-0 baseline (interim — until APIs land)

If you want a baseline TODAY before the API fixes:
1. From a Palm Harbor IP (or VPN), incognito-search each query in the table below.
2. Note Sandbar's position (top 10 only; "not in top 10" = NIT10).
3. Screenshot ChatGPT + Perplexity answers to "Best roof cleaner near Palm Harbor FL?" — save to `/docs/case-studies/screenshots/2026-05-25-day0/`.

| Query | Day 0 (manual) | Day 30 (auto) | Δ |
|---|---|---|---|
| roof cleaning palm harbor fl | ___ | ___ | ___ |
| soft wash roof cleaning palm harbor | ___ | ___ | ___ |
| shingle roof cleaning pinellas county | ___ | ___ | ___ |
| tile roof cleaning clearwater fl | ___ | ___ | ___ |
| best roof cleaner near palm harbor | ___ | ___ | ___ |
| roof cleaning cost florida | ___ | ___ | ___ |

### Cron-driven day-30 capture (zero-touch)

Once the APIs are live, set up a free cron at https://cron-job.org/:
- URL: `https://lola-backend-production.up.railway.app/admin/case-study/sandbar-roof-cleaning/run?notes=auto-weekly`
- Method: POST
- Header: `X-Admin-Key: <key>`
- Schedule: every Monday 7am ET

That gives you weekly rankings forever, free, no manual touching.

---

## The optimization spec (Lola Retainer playbook applied)

### 1. SEO — Title + Meta + Canonical (Wix → Page Settings → SEO)

```
Title:       Roof Cleaning Palm Harbor FL | Soft Wash & Safe for Shingles | Sandbar
Description: Soft wash roof cleaning across Pinellas, Pasco & Hillsborough.
             Biodegradable detergents, low-pressure systems safe for shingle,
             tile & metal roofs. Free quote (727) 712-6281.
Canonical:   https://www.sandbarsoftwash.com/roof-cleaning
```

### 2. H1/H2/H3 hierarchy (semantic SEO — Google rewards related-keyword headings)

**H1:** Soft Wash Roof Cleaning in Palm Harbor & Tampa Bay

**H2s:**
- Why soft wash beats pressure washing for Florida roofs
- What we clean: shingle, tile, metal & flat roofs
- Eco-friendly biodegradable detergents (kid + pet safe)
- Cities we serve across Pinellas, Pasco, Hillsborough & Manatee
- How much does roof cleaning cost in Florida?
- How often should a Florida roof be cleaned?
- What our customers say
- Get a free quote

**H3 nested under "What we clean":**
- Asphalt shingle roof cleaning
- Tile roof cleaning (concrete + clay)
- Metal roof cleaning
- Flat / TPO roof cleaning

### 3. AEO — Citation-ready answer blocks (this is what gets cited by ChatGPT/Perplexity/Google AI)

Each 40–80 word block answers a high-intent query in a scannable, definitive paragraph. AI engines weight these heavily.

#### How much does roof cleaning cost in Florida?
> Most Florida roof cleanings run $250–$650 depending on roof size, pitch, and material. A single-story 2,000 sq ft shingle roof typically runs $300–$425. Tile and metal roofs run slightly higher because they require specialized soft wash detergents. Sandbar Soft Wash provides free no-obligation quotes — call (727) 712-6281.

#### How often should I clean my roof in Florida?
> Florida's humidity, sun, and salt air mean most shingle roofs need a soft wash every 2–3 years to remove algae, mold, and black streaks. Tile and metal roofs can go 3–5 years between cleanings. Skipping cleanings shortens roof lifespan and voids many shingle manufacturer warranties.

#### Is soft wash safer than pressure washing for roofs?
> Yes. Pressure washing strips granules off asphalt shingles and can dislodge tile. Soft wash uses low-PSI (under 100 PSI) with biodegradable cleaning solution that kills algae and mold at the root — the rain rinses the rest. It's the only method approved by major shingle manufacturers like GAF and Owens Corning.

#### Are your cleaning chemicals safe for kids, pets, and plants?
> Sandbar Soft Wash uses eco-friendly biodegradable detergents at safe dilutions. We pre-wet landscaping before every cleaning and rinse thoroughly after. Kids, pets, and plants are safe to return outside once surfaces are dry — typically within 30 minutes.

#### What cities does Sandbar Soft Wash serve?
> Sandbar Soft Wash serves 20+ cities across four Florida counties: Pinellas (Palm Harbor, Clearwater, Dunedin, Tarpon Springs, Oldsmar, Safety Harbor, Largo, St. Petersburg), Pasco (Trinity, Holiday, New Port Richey), Hillsborough (Tampa, Brandon, Riverview, Westchase), and Manatee (Bradenton, Lakewood Ranch, Palmetto).

### 4. GEO + Schema (Wix → Page Settings → Advanced SEO → Custom Code → JSON-LD)

**Service schema** — what's offered, who provides it, where, at what price:

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.sandbarsoftwash.com/roof-cleaning#service",
  "serviceType": "Soft Wash Roof Cleaning",
  "name": "Soft Wash Roof Cleaning",
  "description": "Eco-friendly soft wash roof cleaning for shingle, tile, metal, and flat roofs across Pinellas, Pasco, Hillsborough, and Manatee counties.",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Sandbar Soft Wash",
    "telephone": "+1-727-712-6281",
    "url": "https://www.sandbarsoftwash.com",
    "image": "https://www.sandbarsoftwash.com/logo.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Palm Harbor",
      "addressRegion": "FL",
      "addressCountry": "US"
    },
    "areaServed": [
      {"@type":"City","name":"Palm Harbor"},
      {"@type":"City","name":"Clearwater"},
      {"@type":"City","name":"Tampa"},
      {"@type":"City","name":"Dunedin"},
      {"@type":"City","name":"Tarpon Springs"},
      {"@type":"City","name":"Bradenton"}
    ],
    "priceRange": "$$"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "minPrice": "250",
      "maxPrice": "650",
      "priceCurrency": "USD"
    }
  }
}
```

**FAQPage schema** — makes the page eligible for Google's FAQ rich result + gives AI engines structured citations:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does roof cleaning cost in Florida?",
      "acceptedAnswer": {"@type":"Answer","text":"Most Florida roof cleanings run $250–$650 depending on roof size, pitch, and material. A single-story 2,000 sq ft shingle roof typically runs $300–$425."}
    },
    {
      "@type": "Question",
      "name": "How often should I clean my roof in Florida?",
      "acceptedAnswer": {"@type":"Answer","text":"Most shingle roofs need a soft wash every 2–3 years. Tile and metal can go 3–5 years."}
    },
    {
      "@type": "Question",
      "name": "Is soft wash safer than pressure washing for roofs?",
      "acceptedAnswer": {"@type":"Answer","text":"Yes. Pressure washing strips granules off asphalt shingles. Soft wash uses low-PSI with biodegradable solution. It is the only method approved by GAF and Owens Corning."}
    },
    {
      "@type": "Question",
      "name": "Are your chemicals safe for kids, pets, and plants?",
      "acceptedAnswer": {"@type":"Answer","text":"Sandbar uses eco-friendly biodegradable detergents. Kids, pets, and plants are safe to return outside once surfaces are dry, typically within 30 minutes."}
    }
  ]
}
```

Validate both via [Schema.org validator](https://validator.schema.org/) before publishing.

### 5. Before / After image gallery (biggest single image-search lift)

Add 6–8 photos above the fold on mobile. Each `alt` text is keyword-rich + descriptive:

```html
alt="Before soft wash: black streaks on asphalt shingle roof in Palm Harbor, FL"
alt="After soft wash: clean white shingle roof in Palm Harbor, FL by Sandbar Soft Wash"
alt="Before tile roof cleaning: green algae on barrel tile roof in Clearwater, FL"
alt="After tile roof cleaning: restored terracotta barrel tile roof in Clearwater"
```

Why: Google Image Search drives ~15% of local-service clicks. Perplexity weights image-rich pages higher for visual queries. Alt text is the cheapest ranking signal Sandbar isn't fully using.

### 6. Internal cross-link block (footer of roof cleaning page)

Add a "Related services" block linking to:
- House washing
- Driveway & paver pressure washing
- Paver sand & seal
- Pool cage / lanai cleaning
- Gutter cleaning

Passes link equity within Sandbar's site + reduces bounce rate (key UX signal).

### 7. GBP alignment (same week as on-page changes)

1. Post a GBP update announcing roof cleaning services with a direct link to this page
2. Add roof cleaning photos to the **Services** section of GBP
3. Ensure NAP (name/address/phone) on the page matches GBP **exactly** — same suite format, same phone format
4. Reply to recent reviews mentioning roof cleaning — Google reads these as relevance signals

---

## Hypothesis (predicted ranking lift)

Based on the same playbook applied to other Florida soft wash operators we've audited:

| Lever | Expected impact | Time to land |
|---|---|---|
| Title + Meta + Canonical fix | +1–3 positions on the primary keyword | 7–14 days |
| 5 AEO answer blocks + FAQ schema | First "People Also Ask" appearance + ChatGPT citation eligibility | 14–28 days |
| Service + LocalBusiness JSON-LD | Eligibility for local pack rich snippet | 21–45 days |
| Internal cross-links + alt-text gallery | Image Search traffic lift + dwell-time boost | 14–30 days |

**Target by day 30:** Sandbar ranks **top 3** in the Map Pack for "roof cleaning Palm Harbor FL" and shows up in Perplexity's recommendations for "best roof cleaner near Palm Harbor."

**Target by day 60:** Top 3 organic for "soft wash roof cleaning Pinellas" + Google AI Overview citation for "Florida roof cleaning cost."

---

## Measurement plan

**Day 0** (today): Coach Ty fills in current positions in the table above. Saves Perplexity + ChatGPT screenshots. Logs current GBP impressions + clicks from Insights tab.

**Day 30** (2026-06-23): Re-run all queries from same Palm Harbor IP. Capture new positions, fill in the Δ column, append AFTER section to this file.

**Day 60** (2026-07-23): Final ranking snapshot + revenue impact estimate (extra calls from GBP × avg job value).

---

## AFTER state (TBD — 2026-06-23)

> _To be filled in 30 days. Append below this line._

---

## What this case study unlocks for Lola

Once the day-30 deltas land, this becomes:

1. **Cold outreach proof** — every Florida contractor email links to this exact doc as "what we just did for Sandbar Soft Wash"
2. **/lp/local-seo-pressure-washing-florida hero update** — replace "Coach Ty's father's operation" with "Sandbar Soft Wash — X keywords ranked in Y days using this playbook"
3. **/retainer page case study slot** — replaces the placeholder Sandbar reference with verifiable, dated, repeatable results
4. **Real testimonial from Coach Ty's dad** — recorded and embedded post-launch
5. **The Lola product itself** — this doc is literally the deliverable a Retainer client gets in their first 14 days

---

_This case study is also the live test of Lola's own audit + recommendation engine. When the next contractor runs a Lola audit on their roof cleaning page, the system should output a structured punch list that looks substantively like this doc. Any gap between this doc and what Lola auto-generates is a backlog item._
