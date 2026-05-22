# LOLA SEO Backend — Phase 1

A FastAPI audit engine focused on **home services contractors only** —
soft wash, roofing, HVAC, plumbing, pest control, landscaping.

**Stack:** FastAPI · Python 3.13 · aiosqlite · httpx · Google APIs · Brevo · Resend · Railway

---

## What it does

- `POST /audit` — runs PageSpeed, Places (GBP), Safe Browsing, and Custom
  Search concurrently against a single home-services business; returns a
  score, revenue-leak estimate, percentile, business profile, competitors,
  and a Lola voice line keyed to the result tier.
- `GET /leads` — admin-only lead retrieval, with `?temperature=hot|warm`
  filtering powered by the Phase 1 lead-scoring module.
- `GET /health` — readiness + which API keys are configured.

Phase 2/3 (nurture sequencer, multi-channel follow-up) is **scaffolded only**
in [agents/nurture.py](agents/nurture.py).

---

## Layout

```
main.py                 # FastAPI app — /audit, /leads, /health
lola_voice.md           # Single source of truth for all Lola-voice copy
db/
  database.py           # audits table + percentile baselines
  leads.py              # lead_scores table + warm/cold classifier
agents/
  nurture.py            # Agent 5 stub (Phase 2/3 interface only)
automation/
  sequence_sender.py    # Reference impl for Phase 2 nurture sender
  emails/*.html         # Email templates (Phase 2)
frontend/               # Vite + React + Tailwind audit UI
```

The audit endpoint is now the single source of truth for scoring logic.
There is no separate `scoring/` or `checks/` package.

---

## Phase 1 scoring weights (home services)

| Signal              | Weight |
| ------------------- | ------ |
| GBP completeness    | 25%    |
| Reviews + rating    | 20%    |
| Mobile page speed   | 20%    |
| SEO basics          | 10%    |
| Accessibility       | 10%    |
| Local trust         | 10%    |
| Safe browsing       | 5%     |

Missing signals are excluded from the denominator (graceful degradation),
so a missing PageSpeed result doesn't drop a healthy GBP-only score to 50.

---

## Lead scoring (warm vs cold)

Defined in [db/leads.py](db/leads.py).

| Tier  | Score | Nurture posture (Phase 2)              |
| ----- | ----- | -------------------------------------- |
| hot   | ≥75   | Aggressive sequencing (D+0/2/5)        |
| warm  | 50-74 | Normal sequence                        |
| cool  | 25-49 | Weekly educational drip                |
| cold  | <25   | Quarterly check-in                     |

Inputs: inverse SEO score (40 pts), monthly leak (40 pts), GBP confidence
(15 pts, medium is the sweet spot), has-website (5 pts).

---

## Quick start

```bash
git clone https://github.com/tyalexandermedia/lola-backend
cd lola-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in keys
.venv/bin/python -m uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

By default the frontend talks to `http://127.0.0.1:8000`.

---

## Environment variables

| Variable                       | Required    | Purpose                              |
| ------------------------------ | ----------- | ------------------------------------ |
| `GOOGLE_PAGESPEED_API_KEY`     | Recommended | PageSpeed Insights                   |
| `GOOGLE_PLACES_API_KEY`        | Recommended | Google Business Profile lookup       |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional    | Safe Browsing                        |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Optional    | Competitor search                    |
| `GOOGLE_CUSTOM_SEARCH_CX`      | Optional    | Custom search engine ID              |
| `BREVO_API_KEY`                | Optional    | Brevo CRM sync                       |
| `BREVO_LIST_ID`                | Optional    | Brevo list to add contacts to        |
| `RESEND_API_KEY`               | Optional    | Audit-result email                   |
| `AUDIT_FROM_EMAIL`             | Optional    | "From" address for the result email  |
| `LOLA_SECRET_ADMIN_KEY`        | Required    | Admin auth for `/leads`              |
| `ALLOWED_ORIGINS`              | Required    | CORS allowlist                       |
| `AUDIT_API_BUDGET`             | Optional    | Hard cap on outbound calls per audit |
| `API_TIMEOUT`                  | Optional    | Per-call timeout (seconds)           |

---

## Endpoints

### `POST /audit`

```json
{
  "business_name": "Sunrise Soft Wash",
  "website": "https://example.com",
  "city": "Tampa, FL",
  "business_type": "soft wash",
  "email": "owner@example.com"
}
```

`business_type` must be one of: `soft wash`, `roofing`, `hvac`, `plumbing`,
`pest`, `landscaping`. Anything else is normalized to `default`.

Response shape (abbreviated):

```jsonc
{
  "audit_id": "…",
  "total_score": 72,
  "grade": "C",
  "grade_label": "Needs Work",
  "percentile": 58,
  "segment": "education",
  "lola_message": "Sunrise Soft Wash has solid bones. …",
  "revenue_leak": { "monthly_leak": 7500, "annual_leak": 90000, "…": "…" },
  "page_speed": { "performance": 64, "accessibility": 82, "seo": 78, "ok": true },
  "safety": { "is_safe": true, "ok": true },
  "business_info": { "name": "…", "rating": 4.7, "review_count": 38, "…": "…" },
  "competitors": [ /* up to 5 */ ],
  "categories": { "gbp_completeness": { "score": 90 }, "…": "…" },
  "signals":    { "gbp_completeness": { "weight": 25, "value": 90, "available": true }, "…": "…" }
}
```

### `GET /leads`

```bash
curl -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  "http://127.0.0.1:8000/leads?limit=25"

# warm-and-hotter only
curl -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  "http://127.0.0.1:8000/leads?temperature=warm&limit=25"
```

### `GET /health`

Returns which API keys are configured and the per-audit budget.

---

## Cost guardrails

Each audit makes at most `AUDIT_API_BUDGET` (default 6) outbound calls:
1 PageSpeed + 2 Places + 1 Safe Browsing + 1 Custom Search + 1 slot of
headroom. Per-call timeout is `API_TIMEOUT` (default 8s; PageSpeed gets 2×).

Brevo + Resend are fired *after* the response, so the user never waits on
them.

---

## Cold outreach (Agent 4)

Phase 1 cold-email module. Static A/B/C variants, daily cap with warmup ramp,
SQLite-backed sent log + suppression, one-click unsubscribe.

### Layout

```
outreach/
  leads.py         # CSV reader, role-account filter
  templates.py     # 3 static variants (≤120 words each)
  warmup.py        # 10/25/50 ramp by days since OUTREACH_LAUNCH_DATE
  sender.py        # Resend send + jitter (30-90s)
  cli.py           # CLI entrypoint
db/
  outreach.py      # cold_outreach_log + cold_suppression tables
```

### CSV input

```
business_name,owner_first_name,website,city,email
Sandbar Soft Wash,Mike,https://sandbarsoftwash.com,Palm Harbor FL,mike@sandbarsoftwash.com
```

Example: [outreach/leads.example.csv](outreach/leads.example.csv). Headers
required. Role accounts (`info@`, `sales@`, etc.) and malformed emails are
dropped automatically.

### CLI

```bash
# Preview one variant against a CSV's first lead (no send, no DB writes)
.venv/bin/python -m outreach.cli preview --csv outreach/leads.example.csv --variant A

# Dry-run a batch — shows what would send, no Resend calls, no DB writes
.venv/bin/python -m outreach.cli send --csv leads.csv --dry-run

# Real send (respects daily cap from warmup ramp)
.venv/bin/python -m outreach.cli send --csv leads.csv

# Aggregate stats by variant for the last N days
.venv/bin/python -m outreach.cli status --days 14 --verbose

# Manually mark a reply (Phase 1 reply detection)
.venv/bin/python -m outreach.cli suppress --email contact@example.com --reason replied
```

### Daily-cap ramp

| Days since `OUTREACH_LAUNCH_DATE` | Cap |
|---|---|
| 0-6   | 10  |
| 7-13  | 25  |
| 14+   | 50  |

Override with `OUTREACH_DAILY_CAP_OVERRIDE=N` for testing. Run the send CLI
once per day via Railway cron or local `loop`.

### Endpoints

- `GET /unsubscribe?email=...&token=...` — one-click CAN-SPAM unsubscribe.
  Token is HMAC-SHA256 of email with `LOLA_SECRET_ADMIN_KEY`.
- `GET /outreach/stats?days=7&verbose=true` — admin-keyed aggregate by
  variant (sent / bounced / replied / converted / conversion rate).

### Conversion tracking

When a lead submits an audit at `/audit`, `mark_audit_submitted(email)` runs
in the same transaction. It flags the matching `cold_outreach_log` row as
`status='converted'` and adds the email to suppression — no re-targeting a
customer who already audited.

### Environment

```
RESEND_API_KEY=...                    # required for real sends
OUTREACH_FROM_EMAIL=LOLA SEO <lola@tyalexandermedia.com>
OUTREACH_LAUNCH_DATE=2026-05-22       # ISO date; defines warmup ramp
OUTREACH_DAILY_CAP_OVERRIDE=          # optional, overrides ramp for testing
OUTREACH_JITTER_MIN_SEC=30
OUTREACH_JITTER_MAX_SEC=90
```

### Tier 2 — Resend event webhook (shipped, needs Resend dashboard config)

`POST /webhooks/resend` ingests Resend's event stream. Updates
`cold_outreach_log` rows by `resend_message_id` for:

- `email.delivered` → `delivered_at`
- `email.opened` → `opened_at`
- `email.clicked` → `clicked_at`
- `email.bounced` → `bounced=1` + auto-suppress
- `email.complained` → `complained_at`

Idempotent — Resend retries on 5xx and this won't double-stamp timestamps.
Signature verification uses Svix (Resend's signing scheme); set
`RESEND_WEBHOOK_SECRET` in `.env` (starts with `whsec_`).

**Setup in the Resend dashboard:**
1. Resend → Webhooks → Add endpoint
2. URL: `https://<your-backend>/webhooks/resend`
3. Events: select delivered, opened, clicked, bounced, complained
4. Copy the signing secret → paste as `RESEND_WEBHOOK_SECRET` in `.env`
5. Redeploy

### Tier 3 — LLM-generated per-lead variants (shipped, opt-in)

Off by default (`OUTREACH_LLM_VARIANTS=false`). When enabled and
`ANTHROPIC_API_KEY` is set, the sender calls Claude (Sonnet by default) to
write 3 tailored variants per `(business_name, city)` and caches them 30
days in `api_cache`. Falls back to the static templates automatically on:
flag off, missing key, API failure, malformed JSON.

Cost reality at 50 sends/day with full cache misses:
~$0.15-0.20/day. Cache hits cost $0.

### Tier 4 — Reply auto-suppress (shipped, needs inbound-mail config)

`POST /webhooks/reply` accepts inbound replies, marks the lead as replied,
and adds it to the suppression list. Two match strategies:

- **By alias** (preferred): sender writes `Reply-To: reply+<token>@<OUTREACH_REPLY_DOMAIN>` per lead. Webhook receives the `to` field and looks up the matching `cold_outreach_log.reply_alias`.
- **By sender email** (fallback): match the `from` field against the lead's email.

**Setup options for inbound parsing:**
- **Cloudflare Email Routing** + Worker that POSTs to `/webhooks/reply`
- **Mailgun Routes** → forward to webhook
- Any inbound-mail provider that can POST `{to, from, ...}` JSON

Auth: shared secret in `X-Reply-Webhook-Secret` header.

Without this configured, the manual path still works:
`python -m outreach.cli suppress --email foo@bar.com --reason replied`

### What's still NOT in Phase 1

- **Daily Slack digest** — call `GET /outreach/stats` from a cron and pipe
  to a Slack webhook when you want it. Trivial to add.

---

Built by Ty Alexander · [tyalexandermedia.com](https://tyalexandermedia.com)
