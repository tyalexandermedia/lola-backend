"""
External search/maps provider fetchers — Google Business Profile Performance
(calls/clicks/directions/impressions) + Bing Webmaster Tools (clicks/
impressions/position). Both are CACHED via db.tracking.save_provider_snapshot
and surfaced read-only on the client dashboard.

Design rules:
- Every fetcher returns a dict with an `error` key and NEVER raises — a
  missing credential or a bad token degrades to {error: "..."} so the
  dashboard just hides that card. No hard dependency.
- No new pip deps: GBP uses a raw httpx OAuth token exchange (no google
  client lib needed); Bing is a plain API-key GET.

Setup (operator, one-time per provider):
- GBP: create a Google Cloud OAuth client (Web), enable the Business
  Profile Performance API, run the consent flow once as the business
  owner, store the refresh token via POST /admin/gbp/{slug}/token.
  Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET.
- Bing: get a Bing Webmaster Tools API key (free), set BING_WEBMASTER_API_KEY.
"""

from __future__ import annotations
import os
from datetime import date, timedelta
from typing import Optional

import httpx

GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
BING_WEBMASTER_API_KEY = os.getenv("BING_WEBMASTER_API_KEY", "")

_TIMEOUT = 12.0


# ── Google Business Profile Performance ───────────────────────────
# The most credible call-proof: Google's OWN count of calls/website-clicks/
# direction-requests/impressions straight from the business's Maps listing.


async def _google_access_token(refresh_token: str) -> Optional[str]:
    if not (GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET and refresh_token):
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.post("https://oauth2.googleapis.com/token", data={
                "client_id": GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            })
            if r.status_code != 200:
                return None
            return r.json().get("access_token")
    except Exception:
        return None


async def fetch_gbp_performance(location_id: str, refresh_token: str) -> dict:
    """Last 30 vs prior 30 days of GBP performance metrics. location_id is the
    numeric Business Profile location id (e.g. 'locations/1234567890')."""
    if not location_id or not refresh_token:
        return {"error": "GBP not connected — store a refresh token first", "connected": False}
    if not (GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET):
        return {"error": "GOOGLE_OAUTH_CLIENT_ID/SECRET not set", "connected": False}

    token = await _google_access_token(refresh_token)
    if not token:
        return {"error": "Could not refresh GBP access token", "connected": False}

    loc = location_id.split("/")[-1]
    today = date.today()
    start = today - timedelta(days=30)
    metrics = [
        "CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS",
        "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
        "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    ]
    base = f"https://businessprofileperformance.googleapis.com/v1/locations/{loc}:fetchMultiDailyMetricsTimeSeries"
    params = [("dailyMetrics", m) for m in metrics] + [
        ("dailyRange.start_date.year", start.year), ("dailyRange.start_date.month", start.month), ("dailyRange.start_date.day", start.day),
        ("dailyRange.end_date.year", today.year), ("dailyRange.end_date.month", today.month), ("dailyRange.end_date.day", today.day),
    ]
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.get(base, params=params, headers={"Authorization": f"Bearer {token}"})
            if r.status_code != 200:
                return {"error": f"GBP API {r.status_code}: {r.text[:140]}", "connected": True}
            data = r.json()
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:140]}", "connected": True}

    totals: dict = {}
    for series in data.get("multiDailyMetricTimeSeries", []):
        for ts in series.get("dailyMetricTimeSeries", []):
            m = ts.get("dailyMetric", "")
            pts = ts.get("timeSeries", {}).get("datedValues", [])
            totals[m] = totals.get(m, 0) + sum(int(p.get("value", 0) or 0) for p in pts)

    impressions = sum(v for k, v in totals.items() if k.startswith("BUSINESS_IMPRESSIONS"))
    return {
        "error": None, "connected": True,
        "calls": totals.get("CALL_CLICKS", 0),
        "website_clicks": totals.get("WEBSITE_CLICKS", 0),
        "direction_requests": totals.get("BUSINESS_DIRECTION_REQUESTS", 0),
        "impressions": impressions,
        "window_days": 30,
    }


# ── Bing Webmaster Tools (free, API-key) ──────────────────────────
# Matters because ChatGPT Search + Copilot run on Bing's index.


async def fetch_bing_webmaster(site_url: str) -> dict:
    if not BING_WEBMASTER_API_KEY:
        return {"error": "BING_WEBMASTER_API_KEY not set", "connected": False}
    if not site_url:
        return {"error": "no site_url", "connected": False}
    url = "https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.get(url, params={"apikey": BING_WEBMASTER_API_KEY, "siteUrl": site_url})
            if r.status_code != 200:
                return {"error": f"Bing API {r.status_code}", "connected": True}
            rows = (r.json() or {}).get("d", []) or []
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:140]}", "connected": True}

    clicks = sum(int(row.get("Clicks", 0) or 0) for row in rows)
    impressions = sum(int(row.get("Impressions", 0) or 0) for row in rows)
    return {
        "error": None, "connected": True,
        "clicks": clicks, "impressions": impressions,
        "ctr": round(100 * clicks / impressions, 2) if impressions else 0.0,
        "data_points": len(rows),
    }
