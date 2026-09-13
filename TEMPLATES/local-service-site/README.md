# Lola Local Service Site — master template

One reusable Astro template that produces an independent, Vercel-deployed
local-service website per client from a handful of config files. Sandbar-style
credibility, mobile-first conversion, local SEO foundations, GoHighLevel lead
capture with source attribution, and no invented copy.

**Phase 1 scope (this version):** homepage, service pages, estimate page,
thank-you page, lead API to GHL, attribution, sitemap, robots, JSON-LD,
validator, setup script. Not yet: about / reviews / areas / commercial / legal
pages, leak-check script, QA runner, Turnstile. See "What comes next".

## How it works

```
master template  →  "Use this template"  →  client-<slug> repo
                                                 │
                              npm run setup-site │ writes config/*.json
                                                 ▼
                    config/ + src/content/services/*.md + public/client/
                                                 │
                                   npm run build │ validate → astro build
                                                 ▼
                          Vercel project (preview per branch, prod on main)
```

Every client is one repository and one Vercel project. Nothing is shared at
runtime, so one client's change can never break another client's site.

## Requirements

- Node 22.12 or newer
- A Vercel account (the adapter is `@astrojs/vercel`)
- A GoHighLevel sub-account for the client with an **Inbound Webhook** workflow

## New client, step by step

1. On GitHub, open the master repo and click **Use this template**. Name it
   `client-<slug>`, private.
2. Clone it and install:
   ```bash
   npm install
   npm run setup-site
   ```
   The script asks only for facts that change between clients and writes
   `config/site.json`, `brand.json`, `proof.json`, `integrations.json`, plus
   one `src/content/services/<slug>.md` per service.
3. Put the logo and approved photos in `public/client/`. Write each service
   page and fill `config/proof.json` with verified reviews, certifications,
   guarantees and before/after pairs. Every `TODO` blocks the build.
4. Check it:
   ```bash
   npm run validate     # required facts present, no placeholders, no secrets
   npm run dev          # http://localhost:4321
   ```
5. In GHL: Automation → Workflows → new workflow → trigger **Inbound Webhook**.
   Copy the URL. Map the incoming fields (`name`, `phone`, `email`, `city`,
   `service`, `notes`, `source`, `tags`, `utm_*`, `gclid`, `referrer`,
   `landing_page`, `page_url`) to contact fields. Publish the workflow.
6. In Vercel: import the repo. Add environment variables:
   `GHL_WEBHOOK_URL` (required), `RESEND_API_KEY` (only if notification
   emails are configured). Every branch push becomes a preview URL.
7. Submit a real test lead on the preview. Confirm the contact lands in GHL
   with the attribution fields populated.
8. Send the preview to the owner. Collect one revision list. Merge to `main`.
9. Point DNS at Vercel, verify production, submit `/sitemap-index.xml` in
   Search Console.

## Configuration reference

Three markers apply to every field:

| Marker | Meaning | Build |
|---|---|---|
| required | must be present and valid | fails with the field name |
| optional | can be omitted | warns until you set a value or `"unavailable"` |
| `"unavailable"` | the client confirmed they do not have it | silent; the section hides |

### `config/site.json`

| Field | Status | Notes |
|---|---|---|
| `legalName`, `publicName` | required | legal name goes in the footer and schema |
| `domain` | required | `https://www.example.com`, no trailing slash; becomes canonical + sitemap origin |
| `phone` | required | E.164 (`+17275550123`); display format is derived |
| `allowSms` | optional | `false` hides the Text buttons |
| `email` | optional | omit or `"unavailable"` for call-first businesses |
| `primaryCustomer` | required | one line, used in the hero and meta description |
| `serviceArea.summary`, `.region`, `.cities` | required | cities in priority order; first city leads titles |
| `hours` | required | `[{ "days": ["Monday", …], "opens": "08:00", "closes": "18:00" }]` |
| `cta.label`, `cta.responsePromise` | required | the one CTA and the promise the owner will keep |
| `cta.path`, `cta.shortLabel` | optional | URL segment of the CTA page (`estimate` default, or `consultation`, `contact`) and a short label for the sticky bar |
| `legalNotice` | optional | footer disclaimer, e.g. attorney advertising or license text |
| `tagline`, `foundingYear`, `licenseNumber`, `about` | optional | |
| `address` | optional | omit for service-area businesses |
| `process` | optional | `[{ "title", "text" }]`, renders the "How it works" band |
| `faqs` | optional | `[{ "q", "a" }]`, rendered visibly and as FAQPage schema |
| `social.*` | optional | https URLs, emitted as `sameAs` |
| `schemaType` | optional | default `LocalBusiness`; e.g. `HomeAndConstructionBusiness`, `Plumber`, `RoofingContractor` |

### `config/brand.json`

| Field | Status | Notes |
|---|---|---|
| `colors.primary`, `.accent`, `.ink`, `.background` | required | hex; every other shade derives in CSS |
| `logo` | required | path under `/public`, must exist |
| `logoAlt`, `favicon`, `heroImage` + `heroImageAlt`, `ogImage`, `fontStack` | optional | |

### `config/proof.json`

Only verified items. Empty arrays are valid; the matching sections hide.

| Field | Notes |
|---|---|
| `reviews[]` | `quote`, `author`, `source`, `sourceUrl` (required, where the review lives), `date` |
| `certifications[]`, `guarantees[]` | short strings, shown in the trust bar |
| `beforeAfter[]` | `before`, `after` image paths under `/public`, `label`, `alt` |
| `googleRating` | `{ rating, count, url }` copied from the live profile, or `"unavailable"` |
| `yearsInBusiness`, `reviewPlatformUrl` | optional |

### `config/integrations.json`

Names of environment variables only. Never a URL or key.

| Field | Notes |
|---|---|
| `ghl.webhookEnvVar` | default `GHL_WEBHOOK_URL` |
| `ghl.source`, `ghl.tags` | sent with every lead |
| `notifications.emails[]`, `.from`, `.resendEnvVar` | optional Resend notification; `from` must be on a Resend-verified domain |
| `ga4MeasurementId` | `G-…` or `"unavailable"` |

### `src/content/services/<slug>.md`

File name is the URL. Frontmatter: `name`, `priority`, `summary` (20–220
chars), optional `heroSub`, `metaTitle`, `metaDescription`, `image`,
`imageAlt`, `beforeAfter[]`, `enabled`, and at least one `faqs` entry. The
body is the page copy in markdown. Astro validates this and fails the build
with the file and field.

## Pages produced

| Route | Source |
|---|---|
| `/` | site + services + proof |
| `/services/<slug>` | one per enabled service, ordered by `priority` |
| `/estimate` (or `cta.path`) | full form, phone, hours |
| `/thank-you` | noindex, fires the GA4 `generate_lead` event |
| `/api/lead` | the only server function |
| `/sitemap-index.xml`, `/robots.txt`, `/404` | generated |

## Lead flow

1. First visit: a small script stores `utm_*`, `gclid`/`fbclid`/`msclkid`,
   referrer and landing page in `localStorage` (first touch; a later visit
   with campaign params upgrades a touch that had none).
2. Every form carries those as hidden fields plus a honeypot and a timestamp.
3. `POST /api/lead` validates, drops honeypot or sub-2.5-second submissions
   silently, forwards to the GHL webhook, optionally emails via Resend, then
   redirects to `/thank-you`. With no destination configured it returns
   `unconfigured` so a lost lead is never silent.
4. GA4 events when configured: `phone_click`, `sms_click`, `form_submit`,
   `generate_lead`.

## Verification

```bash
npm run validate                                 # fails on missing required facts
ALLOW_EXAMPLE_CONFIG=1 npm run build             # master template only
npm run build                                    # client repo: refuses placeholders
```

The master ships with a fictional "Example Exterior Cleaning" config so the
template itself builds. Its values carry `EXAMPLE` markers, the domain
`example-exterior.com` and a 555 phone number, all of which the validator
refuses unless `ALLOW_EXAMPLE_CONFIG=1`. A client build must never set that.

## Master protection

- Client secrets, GHL IDs, tracking IDs and contact records never enter this
  repo. Config holds env var names; values live in Vercel.
- Sandbar Soft Wash content is never a default. Nothing here is copied from
  a client site; the example client is fictional.
- Client repos do not feed back automatically. When a client build reveals a
  reusable improvement: record it, confirm it applies beyond one client,
  implement it here, tag a version, use it for the next build.
- Enable the repo's secret guard once per clone if this folder lives inside
  `lola-backend`: `git config core.hooksPath .githooks`.

## Splitting into its own repository

This folder is self-contained. To make it the standalone master:

```bash
cd lola-backend
git subtree split --prefix=TEMPLATES/local-service-site -b site-template
# push that branch to a new empty repo, then enable "Template repository" in its settings
```

## What comes next (Phase 2, not started)

About, reviews, service-area, commercial and legal pages; `leak-check` script
that greps the build output for Lola and Sandbar strings; `qa` runner; SEO
contract checker ported from `frontend/scripts/check-seo.mjs`; Turnstile;
optional mirror of leads to the Lola backend for the client dashboard.
