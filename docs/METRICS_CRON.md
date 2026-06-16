# Weekly metrics cron — one URL refreshes every client

The whole dashboard (rankings, AI Share of Voice, GSC, GA, GBP, Bing, CWV)
stays live off a single weekly cron hit. No per-client jobs.

## The endpoint
```
POST https://lola-backend-production.up.railway.app/admin/metrics/run-all
Header: X-Admin-Key: <LOLA_SECRET_ADMIN_KEY>
```
Loops every ACTIVE reporting client and refreshes:
- GSC + GA snapshot
- GBP Performance (if OAuth token stored)
- Bing Webmaster (if BING_WEBMASTER_API_KEY set)
- Core Web Vitals (PageSpeed)
- Rankings + AI Share of Voice snapshot

Each source degrades gracefully — a missing credential skips one card,
never blocks the rest.

## Wire it on cron-job.org (free)
1. New cron job → URL above.
2. Method: POST. Add header `X-Admin-Key: <your key>`.
3. Schedule: weekly, Monday 06:00 ET (`0 11 * * 1` UTC).
4. Save. Done — every client's dashboard refreshes weekly.

## Railway cron alternative
```toml
# railway.toml
[[crons]]
schedule = "0 11 * * 1"   # Mon 06:00 ET
command  = "python -m scripts.refresh_metrics"
```
(Or just use cron-job.org — simpler, no deploy.)

## Manual one-client refresh (testing)
```
curl -X POST -H "X-Admin-Key: KEY" \
  https://lola-backend-production.up.railway.app/admin/metrics/sandbar/run
```

## Freshness on the dashboard
The client dashboard shows a green "Updated Xd ago" pill (amber if > 8 days).
If it goes amber, the cron isn't firing — check the cron-job.org log.
