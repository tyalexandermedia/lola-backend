# Lola SEO — Handoff: every external step still pending

Everything in code is built, tested, and ready. The items below require
*your* account access (Google Cloud, Resend, Railway, Anthropic, Cloudflare)
and can't be done remotely. Each step shows the exact command, URL, or
paste-target so you can blast through them.

Order matters. Do them top-to-bottom.

---

## 1. Set the admin key (BLOCKER — Agent 4 unsubscribe is broken without it)

The `LOLA_SECRET_ADMIN_KEY` in your `.env` is still the
`change_me_to_something_random` placeholder. With that value, `/unsubscribe`
returns 403 to every click — which would be a CAN-SPAM violation the moment
you send a real email.

Generated for you (use this exact value or generate your own):

```
LOLA_SECRET_ADMIN_KEY=db979e34b998719fd3e458b897b679db4fcdfe3288e08e905d1f06fb95399a36
```

**Local:** paste into `.env`, then restart uvicorn.

**Railway:** Railway dashboard → Variables → `LOLA_SECRET_ADMIN_KEY` →
paste this value → Redeploy.

**Why I can't do this for you:** I shouldn't write secrets into your
local `.env` (it's gitignored for a reason, and you should pick your own
random or use a password manager). Picking the value is fine; persisting it
is yours.

**Verify:**
```bash
.venv/bin/python -c "
import hmac, hashlib, os
from dotenv import load_dotenv; load_dotenv()
k = os.getenv('LOLA_SECRET_ADMIN_KEY', '').encode()
assert k and len(k) >= 16, 'admin key still missing or short'
print('OK:', hmac.new(k, b'test@x.com', hashlib.sha256).hexdigest()[:16])
"
```

---

## 2. Real Google Cloud API keys (unlocks the entire audit)

Current state: every Google call returns `REQUEST_DENIED — API key not valid`
because `.env` still has `your_key_here` placeholders. Verified just now —
`test_apis.py` shows all 4 APIs `ok=False`.

### One-time GCP setup (~10 min)

1. https://console.cloud.google.com/ → create or pick a project (e.g.
   `lola-seo-production`).
2. **Billing → Link a billing account.** Required even at free-tier
   volumes — Places literally rejects auth without billing attached.
3. **APIs & Services → Library** → enable these four (search + click
   Enable on each):
   - **Places API (New)** — `places.googleapis.com`
   - **PageSpeed Insights API**
   - **Safe Browsing API**
   - **Custom Search API**
4. **Credentials → Create credentials → API key.** One key works for all
   four. Copy it (starts with `AIza...`).
5. Custom Search Engine ID:
   - https://programmablesearchengine.google.com/
   - Add → set to "Search the entire web" → copy the Search Engine ID
     (looks like `017576...:abcdef`)
6. Paste five values into `.env` and Railway:

```
GOOGLE_PAGESPEED_API_KEY=AIza...
GOOGLE_PLACES_API_KEY=AIza...
GOOGLE_SAFE_BROWSING_API_KEY=AIza...
GOOGLE_CUSTOM_SEARCH_API_KEY=AIza...
GOOGLE_CUSTOM_SEARCH_CX=017576...:abcdef
```

7. Optional but recommended: in GCP set up a **billing alert at $50/mo**
   (Billing → Budgets & alerts → Create budget).

### Verify

```bash
.venv/bin/python test_apis.py
```

You want to see `ok=True` on all four. If any are still `False`, the error
message tells you exactly which API isn't enabled or which key is wrong.

---

## 3. Resend webhook (Tier 2 — open/click/bounce tracking)

Code endpoint is live at `POST /webhooks/resend`. Resend just needs to know
where to send events.

1. https://resend.com/webhooks → **Add endpoint**.
2. URL: `https://<your-railway-domain>/webhooks/resend`
3. Events to subscribe: `email.delivered`, `email.opened`, `email.clicked`,
   `email.bounced`, `email.complained`.
4. Copy the **signing secret** (starts with `whsec_`).
5. Paste into `.env` and Railway:

```
RESEND_WEBHOOK_SECRET=whsec_...
```

6. Redeploy.

### Verify

After your first send, hit:
```bash
curl -H "X-Admin-Key: $LOLA_SECRET_ADMIN_KEY" \
  "https://<your-railway-domain>/outreach/stats?days=1&verbose=true"
```

Look for non-zero `delivered`, `opened`, `clicked`.

---

## 4. Optional: Anthropic-generated per-lead variants (Tier 3)

Off by default. Enable when you want emails tailored to each lead's
business name + city instead of the three static templates.

1. https://console.anthropic.com/ → create API key.
2. Paste:

```
OUTREACH_LLM_VARIANTS=true
ANTHROPIC_API_KEY=sk-ant-...
```

Cache is on — first send per `(business_name, city)` calls Anthropic
(~$0.005), 30 days of repeats are free. Falls back to static templates
on any failure.

### Verify

```bash
OUTREACH_LLM_VARIANTS=true .venv/bin/python -m outreach.cli \
  preview --csv outreach/leads.example.csv --variant A
```

The output should look different from the static template version.

---

## 5. Optional: Reply auto-suppress webhook (Tier 4)

Code endpoint is live at `POST /webhooks/reply`. You need inbound email
parsing — pick one path:

### Path A — Cloudflare Email Routing (cheapest, free)

1. Cloudflare dashboard → your domain → **Email** → enable Email Routing.
2. Update your MX records as instructed.
3. Add a catch-all rule for `reply+*@<reply-subdomain>.yourdomain.com` →
   "Send to a worker."
4. Workers → Create a worker that POSTs the parsed email to
   `https://<your-railway-domain>/webhooks/reply` with the header
   `X-Reply-Webhook-Secret: <shared-secret>` and JSON body:

```json
{"to": "reply+abc123@reply.yourdomain.com", "from": "owner@theirbusiness.com"}
```

### Path B — Mailgun Routes (~$15/mo)

Mailgun → Routes → catch `reply+.*@yourdomain.com` → Forward to
`https://<your-railway-domain>/webhooks/reply` with same headers.

### Either path — set these in `.env`

```
OUTREACH_REPLY_DOMAIN=reply.yourdomain.com
REPLY_WEBHOOK_SECRET=<long random — different from LOLA_SECRET_ADMIN_KEY>
```

Until you do this, manual reply detection still works:
```bash
.venv/bin/python -m outreach.cli suppress --email replier@example.com --reason replied
```

---

## 6. Outreach launch-date env var

The 10 → 25 → 50 ramp counts days from this date. Default is "today" which
is the safest (cap=10).

```
OUTREACH_LAUNCH_DATE=2026-05-22
```

Override during testing only:
```
# OUTREACH_DAILY_CAP_OVERRIDE=5
```

---

## 7. PUBLIC_APP_URL must match your real frontend

Used in:
- Audit-result email "View report" link
- Outreach email audit-link UTM
- Unsubscribe link

```
PUBLIC_APP_URL=https://lola.tyalexandermedia.com
```

(Change if you've put it on a custom domain.)

---

## 8. Commit + deploy

I have NOT created any commits in this session — `git status` shows ~50
files changed/added. When you're ready:

```bash
# From repo root
git add -A
git status                                  # eyeball before committing

git commit -m "$(cat <<'EOF'
Phase 1 final: roadmap pricing + Agent 4 cold outreach

- Pricing: roadmap model (Foundation Sprint $297 one-time / Growth
  Roadmap $497/mo / Scale System $697/mo, $997+ competitive) with
  founding-member counter, responsive sizing (clamp + minmax(0,1fr)),
  CTA hierarchy, mobile sticky CTA, BulletItem tooltips.
  Canonical source: docs/PRICING.md
- Agent 4: db/outreach.py, outreach/* module, CLI
  (send/status/suppress/preview), Tier 2 Resend webhook,
  Tier 3 LLM variants (opt-in), Tier 4 reply webhook
- Backend hygiene: stripped 2300+ lines of orphaned code
  (scoring/, checks/, api/, config.py), centralized
  api_clients/google_apis.py, SQLite api_cache layer,
  migrated Places to v1 API
- New endpoints: /audits/{id}, /pricing, /admin/founding-signup,
  /unsubscribe, /outreach/stats, /webhooks/resend, /webhooks/reply

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push                                    # to GitHub
```

**Railway** auto-deploys from your main branch via the Procfile. Wait
~60s for the deploy log to show "Listening on $PORT".

**Vercel** auto-deploys the frontend from `frontend/` on push.

### Why I didn't commit for you

The repo guidance says only commit when explicitly asked, and the change
set is large enough that you should eyeball it before pushing.

---

## 9. Verification after deploy

```bash
BASE=https://<your-railway-domain>
ADMIN=$LOLA_SECRET_ADMIN_KEY

# Health — should show all has_keys=true after step 2
curl -s $BASE/health | jq

# Pricing — should show founding_active: true initially
curl -s $BASE/pricing | jq

# Outreach stats — empty until you send
curl -s -H "X-Admin-Key: $ADMIN" "$BASE/outreach/stats?days=7" | jq

# Run a real audit (creates real Brevo + Resend traffic)
curl -s -X POST $BASE/audit -H 'Content-Type: application/json' -d '{
  "business_name":"Sandbar Soft Wash",
  "website":"https://sandbarsoftwash.com",
  "city":"Palm Harbor, FL",
  "business_type":"soft wash",
  "email":"you@yourdomain.com"
}' | jq
```

---

## 10. The sibling repo you have open

You opened `/home/tyalexandermedia/lola-content-engine/generators/__init__.py`.
That's a different project (`lola-content-engine`) — its directories are
mostly empty scaffolding (`config/`, `db/`, `generators/`, `inputs/`,
`jobs/`, `static/`, `templates/`, `trends/`). I didn't touch it. If you
want me to look at it as the next session, tell me which feature to
implement and I'll go.

---

## Quick command reference

```bash
# Local dev
cd /home/tyalexandermedia/lola-backend
.venv/bin/python -m uvicorn main:app --reload --port 8000

# Frontend dev
cd frontend && npm run dev

# Cold outreach
.venv/bin/python -m outreach.cli send --csv leads.csv --dry-run
.venv/bin/python -m outreach.cli send --csv leads.csv
.venv/bin/python -m outreach.cli status --days 7 --verbose
.venv/bin/python -m outreach.cli suppress --email x@y.com --reason replied
.venv/bin/python -m outreach.cli preview --csv leads.csv --variant A

# API diagnostic
.venv/bin/python test_apis.py
```

---

## What's already done and tested in this session

- ✅ Phase 1 home-services audit scoring (GBP 25%, reviews 20%, mobile 20%,
  SEO 10%, a11y 10%, local trust 10%, safety 5%)
- ✅ Insufficient-data guard (incomplete audit segment when <30% of signal
  mass is available)
- ✅ One-question-at-a-time frontend with shake validation + gold focus
- ✅ Polished questionnaire (sticky blurred header, continuous gold
  progress bar, 44px headline, 64px gold-focus input)
- ✅ Pricing surface (DB-backed via `db/pricing.py`) with founding-member
  counter, anchors, and CTA badges — now follows the roadmap model
  (Foundation Sprint $297 one-time · Growth Roadmap $497/mo · Scale System
  $697/mo, $997+ competitive). Canonical: [`docs/PRICING.md`](docs/PRICING.md)
- ✅ Mobile sticky CTA (appears past pricing, dismissible)
- ✅ Lola playbook recommendations engine (signal-driven, ≤5 ranked)
- ✅ Per-audit recommendations + upsell CTA
- ✅ Shareable `/r/{audit_id}` reports
- ✅ Admin `/admin/leads` page (tabbed by hot/warm/all)
- ✅ Lead scoring (hot/warm/cool/cold via `db/leads.py`)
- ✅ Centralized `api_clients/google_apis.py` with API_STATUS observability
- ✅ SQLite `api_cache` layer (24h PSI, 7d Places, 24h CSE)
- ✅ Places API migrated to new v1 endpoint
- ✅ Resend audit-result email with "View report" link
- ✅ Brevo CRM sync
- ✅ Agent 4 cold outreach (CSV → 50/day warmup ramp → Resend → SQLite log)
- ✅ Three static A/B/C variants (≤120 words, ≤50-char subjects)
- ✅ Tier 2 Resend webhook with Svix signature verification
- ✅ Tier 3 LLM variants (opt-in, Anthropic with 30-day cache + fallback)
- ✅ Tier 4 reply webhook + per-lead Reply-To aliases
- ✅ One-click CAN-SPAM unsubscribe (HMAC-tokened)
- ✅ Per-audit API budget + per-day audit cap
- ✅ ~2,300 lines of orphaned code deleted (scoring/, checks/, api/,
  config.py, wix_crm.py, make_webhook.py, report_generator.py)

---

## December Ship List v2 — what was just shipped (2026-05-23)

- ✅ **Step 5 layout** — banner moved out of top, paddings tightened. Step 5
  CTA verified above the fold at 375×667 (input top 232, "Run the audit"
  bottom 446 of 667).
- ✅ **Mobile/iPad touch targets** — Header nav links now `min-h-[44px]` with
  `py-3`. Pricing Monthly/Annual toggle now `h-11`. "Copy share link" button
  now `h-11`. All meet WCAG 2.5.5.
- ✅ **AI search positioning** — line added to Homepage hero (between subhead
  and CTA) and to Email 2 (gold left-bar callout above competitor line). New
  "AI Search Visibility" section in the audit report below Agent Readiness
  with three placeholder rows (ChatGPT / Perplexity / Google AI Overviews,
  "Tracking — ships Q3").
- ✅ **Email 3 reframe** — moved off the "SEO retainer" framing toward the
  growth-roadmap positioning ("we don't just tell you what's broken, we fix
  it weekly"). Pricing now follows the roadmap model in
  [`docs/PRICING.md`](docs/PRICING.md). Subject updated from "SEO" to "AI visibility."
- ✅ **PostHog wired** — `posthog-js` installed, `src/analytics.ts` wrapper,
  `initAnalytics()` called from `main.tsx`. `trackClick` fans out to PostHog +
  Plausible + GA. Falls back to `console.log` when `VITE_POSTHOG_KEY` is
  unset. Session recording + heatmaps + autocapture enabled by default.
- ✅ **lola-auditor agent** — committed at `.claude/agents/lola-auditor.md`.
  Auto-discovered by Claude Code's Agent picker. Use it pre-merge with
  `subagent_type=lola-auditor` (or pick it from `+ Manage Agents`).

### Still external (you must do)

- **`git push -u origin marquee-preview`** — sandbox has no GitHub auth.
  Run from your terminal: `gh auth login` if needed, then push. The branch
  is at commit `d70528f`, +`<this turn's commits>`.
- **Set `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` in Vercel** — Project →
  Settings → Environment Variables. Grab Project API key from
  PostHog → Project Settings.
- **Set 4 Stripe Payment Link env vars in Vercel** — `VITE_STRIPE_SPRINT_URL`,
  `VITE_STRIPE_RETAINER_MONTHLY_URL`, `VITE_STRIPE_RETAINER_ANNUAL_URL`,
  `VITE_STRIPE_PRO_URL`.
- **Set `VITE_CAL_COM_URL` in Vercel** to your real Cal.com strategy link.

### Awaiting decision (flagged, not built)

- **PDF white-label report (v2-P8)** — 2-3 hrs backend work. Needs ReportLab
  or weasyprint, branded template, SendGrid pipeline (or Resend attachment).
  Say "build the PDF report" when you want it.

---

## Pricing & positioning — roadmap model (current)

> **Canonical source of truth:** [`docs/PRICING.md`](docs/PRICING.md). Update that
> file first, then sync the mirrors (`frontend/src/lib/pricing.ts`, `db/pricing.py`,
> `frontend/scripts/gen_lp.py`). The matrix below is a convenience snapshot — if it
> disagrees with `docs/PRICING.md`, `docs/PRICING.md` wins.

LOLA OS is positioned as a **phased growth roadmap / business growth operating
system**, not an SEO package. The dashboard is the **Growth Score**. Core narrative:
*"Most businesses don't have a marketing problem first — they have a foundation
problem."* Month 1 builds the base, days 31–90 build signals, and after 90 days the
data compounds. (The earlier "Local Lock" 3-tier model — Starter $297/mo · Growth
$697/mo · Pro $997/mo — is retired and replaced by the roadmap below.)

### Core roadmap (offer ladder)

| Stage | Price | Type | Role |
|---|---|---|---|
| Foundation Sprint | **$297** | one-time | Low-risk front door — create/clean/rebuild the online foundation |
| Growth Roadmap | **$497/mo** | monthly | Default recurring — build momentum and start surfacing signals |
| Scale System | **$697/mo** (**$997+** competitive markets) | monthly | Repeatable lead-gen system across services/areas/channels |

### Add-ons (bolt onto any stage)

| Add-on | Price |
|---|---|
| Social Posting System | $200–$500/mo |
| Video / Shorts System | from $200/mo |
| Email / SMS Follow-Up | $99–$300/mo |
| SEO Sprint | $197–$497 one-time |
| AI Visibility Add-On | premium (paid-tier only) |

See [`docs/PRICING.md`](docs/PRICING.md) for full inclusions, guarantees, Growth
Score dimensions, and onboarding entry points.

### Stripe / Vercel env vars

Set the recurring + one-time Payment Link URLs per the current roadmap stages.
Apply to **Production + Preview + Development**, then redeploy.

### Earlier rewrite (historical — superseded by the roadmap model above)

This section previously documented a retired front-end pricing layout (DIY / Sprint
/ Retainer / Pro). The files below were touched in that pass; their pricing now
follows the roadmap model and `docs/PRICING.md`:

- `frontend/src/PricingPage.tsx`
- `frontend/src/AuditFlow.tsx`
- `frontend/src/Homepage.tsx`
- `frontend/src/Marquee.tsx`
- `automation/emails/email3_day5.html`
- `outreach/templates.py`
- `.env.example`
