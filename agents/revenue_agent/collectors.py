"""
Thin wrappers that pull raw numbers from every attribution source for a slug.
Reuses reporting_agent.data_fetcher (GSC/GA4) and db.tracking (events/calls/jobs).
All collectors degrade gracefully — missing keys / empty data returns zeros, never errors.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")


def _window(days: int = 30) -> tuple[date, date]:
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    return start, end


async def collect_tracked_events(slug: str, start: date, end: date) -> dict:
    """Pull event counts from tracked_events for a date window."""
    slug_l = slug.strip().lower()
    counts = {"call": 0, "lead": 0, "click": 0, "view": 0}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT event_type, COUNT(*) as n
               FROM tracked_events
               WHERE slug = ? AND date(created_at) BETWEEN ? AND ?
               GROUP BY event_type""",
            (slug_l, start.isoformat(), end.isoformat()),
        ) as cur:
            async for row in cur:
                et, n = row
                if et in counts:
                    counts[et] = int(n)
    return counts


async def collect_tracked_calls(slug: str, start: date, end: date) -> dict:
    """Pull answered call count and total duration from tracked_calls."""
    slug_l = slug.strip().lower()
    result = {"count": 0, "answered": 0, "total_duration_sec": 0}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT COUNT(*), SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),
                      SUM(COALESCE(duration_sec,0))
               FROM tracked_calls
               WHERE slug = ? AND date(created_at) BETWEEN ? AND ?""",
            (slug_l, start.isoformat(), end.isoformat()),
        ) as cur:
            row = await cur.fetchone()
    if row and row[0]:
        result["count"] = int(row[0] or 0)
        result["answered"] = int(row[1] or 0)
        result["total_duration_sec"] = int(row[2] or 0)
    return result


async def collect_won_jobs(slug: str, start: date, end: date) -> dict:
    """Pull actual won-job revenue from the won_jobs table."""
    slug_l = slug.strip().lower()
    result = {"count": 0, "revenue": 0, "jobs": []}
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT job_value, service_type, source, created_at
               FROM won_jobs
               WHERE slug = ? AND date(created_at) BETWEEN ? AND ?
               ORDER BY created_at DESC""",
            (slug_l, start.isoformat(), end.isoformat()),
        ) as cur:
            rows = await cur.fetchall()
    for r in rows:
        result["count"] += 1
        result["revenue"] += int(r["job_value"] or 0)
        result["jobs"].append({
            "job_value": int(r["job_value"] or 0),
            "service_type": r["service_type"],
            "source": r["source"],
            "created_at": r["created_at"],
        })
    return result


async def collect_gsc(client: dict, start: date, end: date) -> dict:
    """Pull GSC organic click counts for the window. Reuses reporting_agent fetcher."""
    site_url = client.get("site_url", "")
    gsc_property = client.get("gsc_property")
    money_keywords = client.get("money_keywords_json", [])
    if isinstance(money_keywords, str):
        import json
        try:
            money_keywords = json.loads(money_keywords)
        except Exception:
            money_keywords = []

    if not site_url:
        return {"organic_clicks": 0, "error": "no site_url"}

    try:
        from agents.reporting_agent.data_fetcher import fetch_gsc
        # fetch_gsc uses its own window (last 14 days); we capture total for the period
        result = await fetch_gsc(site_url, money_keywords[:5], gsc_property)
        return {
            "organic_clicks": result.get("organic_clicks_this_week", 0),
            "error": result.get("error"),
        }
    except Exception as e:
        return {"organic_clicks": 0, "error": str(e)}


async def collect_ga4(client: dict) -> dict:
    """Pull GA4 sessions/conversions. Reuses reporting_agent fetcher."""
    ga_property_id = client.get("ga_property_id", "")
    if not ga_property_id:
        return {"sessions": 0, "conversions": 0, "error": "no ga_property_id"}
    try:
        from agents.reporting_agent.data_fetcher import fetch_ga
        result = await fetch_ga(ga_property_id)
        return {
            "sessions": result.get("sessions_this_week", 0),
            "conversions": result.get("conversions_this_week", 0),
            "error": result.get("error"),
        }
    except Exception as e:
        return {"sessions": 0, "conversions": 0, "error": str(e)}
