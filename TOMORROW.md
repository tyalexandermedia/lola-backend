# Tomorrow — Morning Checklist (Lola SEO)

Last session: 2026-05-25 (11 commits shipped, all on `main`, all deployed).
Start here in the morning. Top items unblock the most value.

---

## 🔑 Step 1 — Set 2 env vars on Railway (2 minutes, unblocks 4 features)

Open Railway dashboard → your service → **Variables** tab → add these two:

| Variable | Value | What it unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | your `sk-ant-…` key (Friday, after credits land) | Lead-gen, Enhancement Layer, Swarm v2, AI Mode visibility |
| `LOLA_SECRET_ADMIN_KEY` | any long random string you'll remember (e.g. `lola-secret-2026-xyz123`) | Admin endpoints + `/swarm` page |

Railway auto-redeploys in ~60s. Save both, wait, move on.

---

## 🔑 Step 2 — Fix Google Custom Search key (5 minutes)

Two accounts at play:
- `tyselectmedia@gmail.com` — owns the GCP project `lola-seo-production` where Custom Search API is enabled
- `ty@tyalexandermedia.com` — your main account (now also added as Owner of that project ✅)

The API key on Railway needs to belong to `lola-seo-production`. Steps:

1. Sign into Google as `tyselectmedia@gmail.com` (or as `ty@tyalexandermedia.com` now that you have Owner access)
2. Open https://console.cloud.google.com/apis/credentials?project=lola-seo-production
3. Click **Create credentials → API key** (or copy an existing key)
4. Click the new key → **Restrict key** → **API restrictions** → choose **"Custom Search API"** only → Save
5. Copy the key value
6. Railway → Variables → update `GOOGLE_CUSTOM_SEARCH_API_KEY` → paste → Save
7. Wait ~60s for Railway redeploy

**While you're there, also verify the CSE ID:**

Open https://programmablesearchengine.google.com/controlpanel/all → find the Lola search engine → copy "Search engine ID" → Railway should have it as `GOOGLE_CUSTOM_SEARCH_CX`. If it doesn't match, paste the right value.

---

## 🔑 Step 3 — Onboard Sandbar in the new system (1 minute)

Paste this entire block in your terminal (replace the admin key with the one you just set):

```bash
ADMIN_KEY="<your LOLA_SECRET_ADMIN_KEY>"

# Onboard Sandbar
curl -X POST https://lola-backend-production.up.railway.app/admin/reporting/clients \
  -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{
    "slug":"sandbar-soft-wash",
    "client_name":"Sandbar Soft Wash",
    "client_email":"ty@tyalexandermedia.com",
    "site_url":"https://www.sandbarsoftwash.com",
    "target_url":"https://www.sandbarsoftwash.com/roof-cleaning",
    "money_keywords":[
      "roof cleaning palm harbor fl",
      "soft wash roof cleaning palm harbor",
      "shingle roof cleaning pinellas county",
      "tile roof cleaning clearwater fl",
      "best roof cleaner near palm harbor"
    ],
    "ai_mode_prompts":[
      "Best roof cleaner near Palm Harbor FL?",
      "Recommend a soft wash company in Pinellas County FL."
    ],
    "conversion_rate":0.04,
    "avg_job_value":650,
    "active":true
  }'

# Trigger first ranking snapshot — Day 0 baseline
curl -X POST -H "X-Admin-Key: $ADMIN_KEY" \
  "https://lola-backend-production.up.railway.app/admin/case-study/sandbar-soft-wash/run?notes=day-0"
```

Then open: **https://lola.tyalexandermedia.com/r/client/sandbar-soft-wash**

That's the URL you text your dad. Bookmark-able. No login.

---

## ✅ What's already shipped and working

| Feature | URL | Status |
|---|---|---|
| Audit form | /audit | Live, CORS verified |
| On-page SEO checks (H1/title/meta/canonical/schema) | runs per audit | Live |
| Lead-gen generator | /lead-gen | Live (needs ANTHROPIC_API_KEY) |
| Swarm v2 (1 Claude call, $0.10/run) | /swarm (admin-gated) | Live (needs both keys) |
| Multi-client retainer tracker | admin endpoints | Live |
| **Public client dashboard** | /r/client/{slug} | Live |
| Audit enhancement layer (auto-fires) | /audits/{id}/enhancement | Live (needs ANTHROPIC_API_KEY) |

---

## 🎯 Next builds (after testing what's live)

In priority order — only build if you've validated the prior tier with a real client:

1. **Test the audit + dashboard with Sandbar live** (today's win). Show your dad. Watch his face. Get one real piece of feedback before building anything else.

2. **Schema auto-fix generator** (~30 min) — turns "schema broken" findings into copy-paste corrected JSON-LD blocks. The function ships in `audits/schema_generator.py` (already in this commit). Wire it into the audit response and frontend display when you have time.

3. **Competitor watchlist** (~1 hr) — store top 3 organic results per query, show "who you're up against" in the dashboard. Reuses existing Custom Search calls. $0 ongoing.

4. **PDF weekly report** (~3 hrs) — "show my wife / business partner" leverage. Only build when a client asks.

5. **Multi-LLM brand monitoring** (ChatGPT + Perplexity, not just Claude AI Mode) — ~4 hrs, ~$0.50/wk per client. Real differentiator but save for after first paying retainer.

**Skip:** citation builders ($50-100/mo per client = thin margins at $697), lead inbox unification (operational scope creep), any "AI agency" skill from GitHub that doesn't fetch real data.

---

## 📋 Open external items (you, not me)

- [ ] Set `ANTHROPIC_API_KEY` on Railway (Friday, after payment)
- [ ] Set `LOLA_SECRET_ADMIN_KEY` on Railway (any random string)
- [ ] Generate fresh `GOOGLE_CUSTOM_SEARCH_API_KEY` from `lola-seo-production` project, update Railway
- [ ] Verify `GOOGLE_CUSTOM_SEARCH_CX` matches the CSE in the Programmable Search Engine console
- [ ] Run the Sandbar onboarding + snapshot curls (above)
- [ ] Open https://lola.tyalexandermedia.com/r/client/sandbar-soft-wash and text the URL to your dad

---

## 💰 Cost state

- **Lola backend running:** $0 (Railway hobby tier covers it)
- **Audit pipeline (PageSpeed + Places + Safe Browsing + Custom Search + on-page checks):** $0 — all free tier
- **Lead-gen / Enhancement / Swarm:** $0 today, ~$0.05-$0.50/run starting Friday (admin-gated, no public exposure)
- **Client dashboard:** $0 — reads from existing SQLite, no API calls per view

You have a working product. Tomorrow's gates are operational (2 env vars, 1 GCP key, 2 curls) — not code.
