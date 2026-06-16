"""
Data pullers for Agent Two.

Pulls a 14-day window per client (current week + previous week) so we can
compute deltas. GSC + GA via Google's API client libs — requires
service-account credentials JSON mounted via env var GSC_CREDENTIALS_PATH
and GA_CREDENTIALS_PATH (can be the same file with both scopes).

Both fetchers degrade gracefully — if creds aren't configured, returns
an empty payload + flag so the orchestrator can decide whether to skip
the client or send a degraded report.

Optional fallback (if google-api-python-client not installed): the
fetchers raise an honest ImportError with the pip command to add it.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Optional

from agents.reporting_agent.config import (
    GSC_CREDENTIALS_PATH,
    GA_CREDENTIALS_PATH,
)


def _last_week_window(today: Optional[date] = None) -> tuple[date, date, date, date]:
    """Returns (this_week_start, this_week_end, prev_week_start, prev_week_end).

    Week = Mon..Sun (ISO). 'This week' is the 7 days ending yesterday.
    """
    today = today or date.today()
    this_end = today - timedelta(days=1)
    this_start = this_end - timedelta(days=6)
    prev_end = this_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=6)
    return this_start, this_end, prev_start, prev_end


async def fetch_gsc(
    site_url: str,
    money_keywords: list[str],
    gsc_property: Optional[str] = None,
) -> dict:
    """
    Returns dict with:
      - organic_clicks_this_week: int
      - organic_clicks_prev_week: int
      - top_keywords: list[{keyword, clicks, impressions, ctr, position}]
      - money_keyword_ranks: list[{keyword, position_this, position_prev, delta}]
      - error: str | None
    """
    if not GSC_CREDENTIALS_PATH:
        return {"error": "GSC_CREDENTIALS_PATH not configured", "organic_clicks_this_week": 0,
                "organic_clicks_prev_week": 0, "top_keywords": [], "money_keyword_ranks": []}

    try:
        from google.oauth2 import service_account  # type: ignore
        from googleapiclient.discovery import build  # type: ignore
    except ImportError:
        return {
            "error": "Install: pip install google-api-python-client google-auth",
            "organic_clicks_this_week": 0,
            "organic_clicks_prev_week": 0,
            "top_keywords": [],
            "money_keyword_ranks": [],
        }

    this_start, this_end, prev_start, prev_end = _last_week_window()
    property_id = gsc_property or f"sc-domain:{site_url.replace('https://', '').replace('http://', '').replace('www.', '').rstrip('/')}"

    try:
        creds = service_account.Credentials.from_service_account_file(
            GSC_CREDENTIALS_PATH,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
        )
        service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

        def _query(start: date, end: date, dimensions: list[str], row_limit: int = 25):
            return service.searchanalytics().query(
                siteUrl=property_id,
                body={
                    "startDate": start.isoformat(),
                    "endDate": end.isoformat(),
                    "dimensions": dimensions,
                    "rowLimit": row_limit,
                },
            ).execute()

        # Aggregate clicks per week
        this_total = _query(this_start, this_end, [], row_limit=1)
        prev_total = _query(prev_start, prev_end, [], row_limit=1)
        clicks_this = (this_total.get("rows") or [{}])[0].get("clicks", 0) if this_total.get("rows") else 0
        clicks_prev = (prev_total.get("rows") or [{}])[0].get("clicks", 0) if prev_total.get("rows") else 0

        # Top keywords this week
        top_kw = _query(this_start, this_end, ["query"], row_limit=10)
        top_keywords = [
            {
                "keyword": r["keys"][0],
                "clicks": int(r.get("clicks", 0)),
                "impressions": int(r.get("impressions", 0)),
                "ctr": round(float(r.get("ctr", 0.0)) * 100, 2),
                "position": round(float(r.get("position", 0.0)), 1),
            }
            for r in (top_kw.get("rows") or [])
        ]

        # Money keyword rank deltas
        money_keyword_ranks = []
        for kw in money_keywords:
            this_kw = _query(this_start, this_end, ["query"], row_limit=100)
            prev_kw = _query(prev_start, prev_end, ["query"], row_limit=100)
            kw_l = kw.lower()
            t_pos = next((float(r.get("position", 0.0)) for r in (this_kw.get("rows") or [])
                          if r["keys"][0].lower() == kw_l), None)
            p_pos = next((float(r.get("position", 0.0)) for r in (prev_kw.get("rows") or [])
                          if r["keys"][0].lower() == kw_l), None)
            delta = (round(p_pos - t_pos, 1) if t_pos is not None and p_pos is not None else None)
            money_keyword_ranks.append({
                "keyword": kw,
                "position_this": round(t_pos, 1) if t_pos else None,
                "position_prev": round(p_pos, 1) if p_pos else None,
                "delta": delta,
            })

        return {
            "error": None,
            "organic_clicks_this_week": int(clicks_this),
            "organic_clicks_prev_week": int(clicks_prev),
            "top_keywords": top_keywords,
            "money_keyword_ranks": money_keyword_ranks,
        }
    except Exception as e:
        return {
            "error": f"GSC fetch error: {type(e).__name__}: {str(e)[:200]}",
            "organic_clicks_this_week": 0,
            "organic_clicks_prev_week": 0,
            "top_keywords": [],
            "money_keyword_ranks": [],
        }


async def fetch_ga(ga_property_id: Optional[str]) -> dict:
    """
    Returns dict with:
      - organic_sessions_this_week: int
      - organic_sessions_prev_week: int
      - error: str | None
    """
    if not GA_CREDENTIALS_PATH or not ga_property_id:
        return {"error": "GA_CREDENTIALS_PATH or ga_property_id missing",
                "organic_sessions_this_week": 0, "organic_sessions_prev_week": 0}

    try:
        from google.oauth2 import service_account  # type: ignore
        from google.analytics.data_v1beta import BetaAnalyticsDataClient  # type: ignore
        from google.analytics.data_v1beta.types import (  # type: ignore
            DateRange, Dimension, Metric, RunReportRequest, Filter, FilterExpression,
        )
    except ImportError:
        return {
            "error": "Install: pip install google-analytics-data google-auth",
            "organic_sessions_this_week": 0,
            "organic_sessions_prev_week": 0,
        }

    this_start, this_end, prev_start, prev_end = _last_week_window()

    try:
        creds = service_account.Credentials.from_service_account_file(
            GA_CREDENTIALS_PATH,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        client = BetaAnalyticsDataClient(credentials=creds)

        def _organic_sessions(start: date, end: date) -> int:
            req = RunReportRequest(
                property=ga_property_id,
                date_ranges=[DateRange(start_date=start.isoformat(), end_date=end.isoformat())],
                dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                metrics=[Metric(name="sessions")],
            )
            resp = client.run_report(req)
            for row in resp.rows:
                if row.dimension_values[0].value == "Organic Search":
                    return int(row.metric_values[0].value)
            return 0

        return {
            "error": None,
            "organic_sessions_this_week": _organic_sessions(this_start, this_end),
            "organic_sessions_prev_week": _organic_sessions(prev_start, prev_end),
        }
    except Exception as e:
        return {
            "error": f"GA fetch error: {type(e).__name__}: {str(e)[:200]}",
            "organic_sessions_this_week": 0,
            "organic_sessions_prev_week": 0,
        }


async def fetch_implementation_tracker(client_slug: str) -> dict:
    """
    Implementation tracker per client — reads the `reporting_tasks` table that
    backs the public dashboard, so the weekly email and the client's live
    dashboard tell the same story.

    Schema:
      - done_this_week: list[str]   (completed; week_of == this Monday, or
                                     logged in the last 7 days when week_of is unset)
      - in_progress: list[str]
      - next_up: list[str]
    """
    from db.reporting import get_tasks_grouped  # local import avoids a cycle at module load

    grouped = await get_tasks_grouped(client_slug)
    monday = _this_monday_iso()
    cutoff = (date.fromisoformat(monday) - timedelta(days=7)).isoformat()

    def _recent(item: dict) -> bool:
        wk = item.get("week_of")
        if wk:
            return wk >= monday
        created = (item.get("created_at") or "")[:10]
        return created >= cutoff

    done_week = [t["title"] for t in grouped["done"] if _recent(t)]
    return {
        "done_this_week": done_week,
        "in_progress": [t["title"] for t in grouped["in_progress"]],
        "next_up": [t["title"] for t in grouped["next_up"]],
        "counts": grouped["counts"],
        "source": "reporting_tasks",
    }


def _this_monday_iso(today: Optional[date] = None) -> str:
    d = today or date.today()
    return (d - timedelta(days=d.weekday())).isoformat()


def estimate_weekly_revenue(
    organic_sessions: int,
    conversion_rate: float,
    avg_job_value: int,
) -> int:
    """Spec formula: organic_sessions × conversion_rate × avg_job_value."""
    return int(round(organic_sessions * max(0.0, conversion_rate) * max(0, avg_job_value)))


def pct_delta(this_week: int, prev_week: int) -> float:
    if prev_week == 0:
        return 100.0 if this_week > 0 else 0.0
    return round((this_week - prev_week) / prev_week * 100, 1)


async def fetch_search_metrics(
    site_url: str,
    gsc_property: Optional[str] = None,
    ga_property_id: Optional[str] = None,
    money_keywords: Optional[list[str]] = None,
) -> dict:
    """
    Dashboard-grade 28-day Search Console + Analytics summary. Cached by the
    /admin/gsc/{slug}/run endpoint so the public dashboard reads instantly.

    Returns:
      gsc: { clicks, impressions, ctr, position, clicks_prev, impressions_prev,
             top_queries:[{query,clicks,impressions,ctr,position}],
             top_pages:[{page,clicks,impressions}], error }
      ga:  { organic_sessions, organic_sessions_prev, error }
    """
    out: dict = {"gsc": None, "ga": None}

    # ── GSC: 28d vs prior 28d ──────────────────────────────────
    if GSC_CREDENTIALS_PATH:
        try:
            from google.oauth2 import service_account  # type: ignore
            from googleapiclient.discovery import build  # type: ignore

            today = date.today()
            this_end = today - timedelta(days=1)
            this_start = this_end - timedelta(days=27)
            prev_end = this_start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=27)
            prop = gsc_property or f"sc-domain:{site_url.replace('https://','').replace('http://','').replace('www.','').rstrip('/')}"

            creds = service_account.Credentials.from_service_account_file(
                GSC_CREDENTIALS_PATH, scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
            )
            svc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

            def _q(start, end, dims, n=25):
                return svc.searchanalytics().query(siteUrl=prop, body={
                    "startDate": start.isoformat(), "endDate": end.isoformat(),
                    "dimensions": dims, "rowLimit": n,
                }).execute()

            def _totals(start, end):
                rows = (_q(start, end, [], 1).get("rows") or [{}])
                r = rows[0] if rows else {}
                return (int(r.get("clicks", 0)), int(r.get("impressions", 0)),
                        round(float(r.get("ctr", 0)) * 100, 2), round(float(r.get("position", 0)), 1))

            c, i, ctr, pos = _totals(this_start, this_end)
            pc, pi, _pctr, _ppos = _totals(prev_start, prev_end)
            top_q = [{"query": r["keys"][0], "clicks": int(r.get("clicks", 0)),
                      "impressions": int(r.get("impressions", 0)),
                      "ctr": round(float(r.get("ctr", 0)) * 100, 1),
                      "position": round(float(r.get("position", 0)), 1)}
                     for r in (_q(this_start, this_end, ["query"], 8).get("rows") or [])]
            top_p = [{"page": r["keys"][0], "clicks": int(r.get("clicks", 0)),
                      "impressions": int(r.get("impressions", 0))}
                     for r in (_q(this_start, this_end, ["page"], 5).get("rows") or [])]
            out["gsc"] = {
                "error": None, "clicks": c, "impressions": i, "ctr": ctr, "position": pos,
                "clicks_prev": pc, "impressions_prev": pi,
                "top_queries": top_q, "top_pages": top_p,
            }
        except Exception as e:
            out["gsc"] = {"error": f"{type(e).__name__}: {str(e)[:160]}"}

    # ── GA: reuse the weekly organic-sessions fetcher (28d-ish) ──
    if GA_CREDENTIALS_PATH and ga_property_id:
        ga = await fetch_ga(ga_property_id)
        out["ga"] = {
            "error": ga.get("error"),
            "organic_sessions": ga.get("organic_sessions_this_week", 0),
            "organic_sessions_prev": ga.get("organic_sessions_prev_week", 0),
        }
    return out
