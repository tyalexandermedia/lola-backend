# Lola Agent Two — Weekly Reporting Agent

Pulls live SEO data per client, formats via Claude Opus 4.7, delivers a 150-word contractor-friendly weekly email via Brevo every Monday 7am ET.

## How it works

```
┌─────────────────────────────────────────────────────────────────┐
│ Cron-job.org (or Railway cron)                                  │
│   POST /admin/reporting/run-weekly  with X-Admin-Key header     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
                  run_weekly_for_all_active()
                             │
            for each active client in reporting_clients table:
                             ▼
                     run_for_client(slug)
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   fetch_gsc()           fetch_ga()    fetch_implementation_tracker()
   (rankings)         (organic sessions)    (stub for Phase 2)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
              build_user_payload(...) → JSON
                             ▼
              Claude Opus 4.7 (3-retry exp backoff)
                             ▼
                  Brevo send (1 retry @ 5min)
                             ▼
                  log_send(...) → SQLite audit
                             │
                  failure? → send_alert_to_ty(...)
```

## Setup checklist

Before the agent runs successfully, configure these on Railway:

| Env var | Required for | Where to get |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude email generation | https://console.anthropic.com |
| `BREVO_API_KEY` | Email delivery | Already set on Railway (verified via /health) |
| `BREVO_REPORT_TEMPLATE_ID` | Branded email template | Create transactional template in Brevo, get ID from URL |
| `GSC_CREDENTIALS_PATH` | Search Console data | Service-account JSON path (see below) |
| `GA_CREDENTIALS_PATH` | Analytics data | Service-account JSON path |
| `LOLA_SECRET_ADMIN_KEY` | Admin endpoints | Already set |

### Service-account JSON setup (one-time, ~15 min)

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Pick the GCP project that owns the GSC + GA properties (likely `lola-seo-production-497113`)
3. Create a service account: name `lola-reporting-agent`
4. Grant roles: **Search Console Data Access** + **Analytics Data Viewer**
5. Add a JSON key, download the file
6. In **Google Search Console**: Settings → Users and permissions → add the service account email as Restricted user
7. In **Google Analytics**: Admin → Property → Property Access Management → add as Viewer
8. Upload the JSON to Railway:
   - Railway → Variables → add `GSC_CREDENTIALS_JSON` (paste the full JSON content)
   - Add a small bootstrap script to write it to `/tmp/gsc.json` at boot, OR use Railway's "Secret Files" feature
   - Set `GSC_CREDENTIALS_PATH=/tmp/gsc.json` (or wherever you mounted it)

### Brevo template setup (~5 min)

1. Brevo → Templates → Create new transactional template
2. Subject: `{{params.subject}}`
3. Body: HTML wrapper with `{{params.report_body}}` (plain-text in `<pre style="white-space:pre-wrap">`)
4. Save → note the template ID from the URL
5. Set `BREVO_REPORT_TEMPLATE_ID=<id>` on Railway

If you skip the template step, the agent falls back to inline HTML — emails still send, just not branded.

## Adding a client

```bash
curl -X POST \
  -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "sandbar",
    "client_name": "Sandbar Soft Wash",
    "client_email": "team@sandbarsoftwash.com",
    "site_url": "https://www.sandbarsoftwash.com",
    "money_keywords": [
      "roof cleaning palm harbor",
      "soft wash palm harbor",
      "house washing pinellas",
      "paver sealing clearwater",
      "pressure washing tampa bay"
    ],
    "conversion_rate": 0.03,
    "avg_job_value": 425,
    "gsc_property": "sc-domain:sandbarsoftwash.com",
    "ga_property_id": "properties/123456789",
    "active": true
  }' \
  https://lola-backend-production.up.railway.app/admin/reporting/clients
```

## Test before cron goes live

Run for one client immediately:
```bash
curl -X POST \
  -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  https://lola-backend-production.up.railway.app/admin/reporting/run/sandbar
```

First send goes to the configured `client_email`. To test against your own inbox first, temporarily set `client_email` to `ty@tyalexandermedia.com`, run, verify, then switch back.

## Wire the weekly cron

**Free option — cron-job.org:**
1. Sign up at https://cron-job.org/signup
2. New job:
   - URL: `https://lola-backend-production.up.railway.app/admin/reporting/run-weekly`
   - Method: POST
   - Header: `X-Admin-Key: <your-key>`
   - Schedule: every Monday, 07:00 America/New_York
   - Notifications: email on failure

**Paid option — Railway cron:**
Add to `railway.toml`:
```toml
[[cron]]
schedule = "0 12 * * 1"
command  = "python -m agents.reporting_agent.scheduler"
```
(12:00 UTC = 07:00 ET in winter, 08:00 ET in summer — no DST handling.)

## Monitor

```bash
# Last 50 send attempts (across all clients):
curl -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  https://lola-backend-production.up.railway.app/admin/reporting/sends

# Filter to one client:
curl -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  "https://lola-backend-production.up.railway.app/admin/reporting/sends?slug=sandbar"
```

Status values:
- `sent` — delivered via Brevo
- `fetch_failed` — GSC or GA pull failed (Ty got alerted, client skipped)
- `claude_failed` — Claude failed after 3 retries (Ty alerted)
- `brevo_failed` — Brevo failed twice (Ty alerted)

## What's deferred to Phase 2

- `fetch_implementation_tracker` is currently a stub. Phase 2: wire to an Airtable base or new `reporting_tasks` SQLite table (slug, task, status, week_of).
- Lola client dashboard frontend (Vercel) — read-only view of the same data. Build when 3+ paying retainers.

## Files

- `config.py` — env var loading + `is_configured()` health check
- `data_fetcher.py` — GSC + GA + implementation pulls + revenue math
- `prompt_builder.py` — Claude system prompt (spec-locked) + user payload formatter
- `claude_client.py` — Anthropic API with 3-retry exp backoff
- `brevo_sender.py` — Brevo transactional send with 1 retry at 5-min delay + Ty alert helper
- `main.py` — orchestrator (`run_for_client`, `run_weekly_for_all_active`)
- `scheduler.py` — CLI entry point for Railway cron alternative
