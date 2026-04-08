# LOLA SEO Backend — v2.0

FastAPI backend for the LOLA SEO local business revenue diagnostic tool.  
**Stack:** FastAPI · Python 3.11 · aiosqlite · httpx · BeautifulSoup4 · Railway

---

## What it does

Runs 9 concurrent checks on any local business website and returns:
- **Score 0–100** with grade (A–F), percentile rank, confidence level
- **Revenue leak estimate** — how much money is being lost per month
- **Up to 10 prioritized issues** ranked by revenue impact
- **30/60/90 day roadmap** personalized to business type and city
- **Competitor comparison** via Google Custom Search
- **GBP audit** via Google Places API
- **Automatic Make.com webhook** — triggers Airtable logging + Brevo email sequence

---

## Setup

```bash
git clone https://github.com/tyalexandermedia/lola-backend
cd lola-backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
uvicorn main:app --reload
```

API runs at `http://localhost:8000`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_PAGESPEED_API_KEY` | Recommended | PageSpeed Insights — free, unlimited |
| `GOOGLE_PLACES_API_KEY` | Recommended | Google Business Profile data — $200/mo free credit |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional | Security check — free |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Optional | Competitor pull — 100 queries/day free |
| `GOOGLE_CUSTOM_SEARCH_CX` | Optional | Custom Search Engine ID |
| `MAKE_WEBHOOK_URL` | Recommended | Make.com webhook for Airtable + Brevo automation |
| `LOLA_SECRET_ADMIN_KEY` | Required | Header key for GET /leads admin endpoint |
| `ALLOWED_ORIGINS` | Required | Comma-separated CORS origins |
| `RESEND_API_KEY` | Optional | Direct email notifications |
| `OWNER_EMAIL` | Optional | Owner notification email |

---

## API Endpoints

### `POST /audit`
Main endpoint. Runs all checks and returns full report.

```json
{
  "business_name": "Tampa Bay Pressure Wash",
  "website": "https://example.com",
  "city": "Tampa, FL",
  "business_type": "contractor",
  "email": "owner@example.com",
  "instagram_handle": "tampabayprwash"
}
```

**Business types:** `contractor` · `restaurant` · `salon` · `medical` · `retail` · `default`

### `GET /health`
Returns API status and which checks have API keys configured.

### `GET /leads`
Admin endpoint. Requires `X-Admin-Key` header matching `LOLA_SECRET_ADMIN_KEY`.

---

## Railway Deployment

1. Push this repo to GitHub
2. Create a new Railway project → Deploy from GitHub repo
3. Add all environment variables in Railway dashboard
4. Railway auto-detects `Procfile` and deploys

Your API URL will be: `https://your-app.railway.app`

---

## Connecting to the Vercel Frontend

In your Vercel project settings, add:
```
RAILWAY_API_URL=https://your-app.railway.app
```

In `app.js` on the frontend, replace the direct scraping calls with:
```js
const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ business_name, website, city, business_type, email })
});
```

---

## Make.com Setup

1. Create a new scenario in Make.com
2. Add a **Webhooks → Custom webhook** trigger
3. Copy the webhook URL → set as `MAKE_WEBHOOK_URL` in Railway
4. Add these modules after the webhook:
   - **Airtable → Create Record** (map all fields from webhook payload)
   - **Brevo → Add/Update Contact** (map email + segment attribute)
   - **Brevo → Send Transactional Email** (Email 1 template, by segment)

### Airtable Schema
Create a base called `LOLA SEO Leads` with table `lola_leads`:

| Field | Type |
|---|---|
| audit_id | Single line text (primary) |
| business_name | Single line text |
| email | Email |
| website | URL |
| city | Single line text |
| business_type | Single select |
| total_score | Number |
| grade | Single select |
| revenue_leak | Currency |
| biggest_bottleneck | Single line text |
| segment | Single select (urgent/education/optimization) |
| competitor_1 | Single line text |
| report_url | URL |
| audit_date | Date |
| email_sequence_sent | Number |
| converted | Checkbox |

---

## Score Weights by Business Type

| Category | Contractor | Restaurant | Medical | Salon | Default |
|---|---|---|---|---|---|
| GBP | 30% | 35% | 25% | 30% | 25% |
| Page Speed | 15% | 10% | 10% | 15% | 15% |
| Site Health | 20% | 15% | 20% | 15% | 20% |
| Local Signals | 20% | 25% | 15% | 20% | 20% |
| Content | 10% | 10% | 5% | 15% | 15% |
| Trust | 5% | 5% | 25% | 5% | 5% |

---

Built by Ty Alexander · [tyalexandermedia.com](https://tyalexandermedia.com) · 727-300-6573
