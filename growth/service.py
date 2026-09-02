"""
Growth Timeline — assembly.

Lola already collects three things separately. This module fuses them into ONE
weekly, chronological view per client, so a client reads their month as a story:

    WHAT WE DID  →  SEARCH VISIBILITY MOVED  →  LEADS CAME IN

That third-to-first link — the SEARCH layer — is Lola's differentiator. A plain
CRM has the leads; nobody else puts the Google Search Console signal beside them.

The three sources, each reused (not reinvented):
  1. Search visibility  — api_clients/gsc.daily_metrics(), cached in db.gsc under
                          dimension='date'. Cache read first; the API is hit only
                          on a miss or an explicit refresh.
  2. Client website leads — db.tracking.leads_by_date(slug, …), the event_type=
                          'lead' rows the lead_gen form webhook already writes.
  3. Work done          — db.reporting.list_tasks_for_slug(slug), the reporting_
                          tasks a human logs as done-for-you work lands.

── The honesty rule (Lola's whole ethos) ──────────────────────────────────────
This is a TIMELINE, not a causation claim. We put the three series side by side
and let the pattern speak; we never assert "our work caused these leads." No
fabricated correlation, no invented numbers. When a series is empty (no GSC data
yet, no leads yet) it comes back empty with a flag, so the UI can say "no data
yet" — never a zero dressed up as a result.

── One window, honestly stated ────────────────────────────────────────────────
Everything is anchored to GSC's lag-adjusted end (today − GSC_LAG_DAYS). That
keeps all three series on one shared, gap-free grid; the trade is that leads from
the last ~3 days aren't shown yet. The response always echoes the exact date
range used, so nothing is implied about data we don't have.
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from api_clients import gsc as gsc_client
from db import reporting, tracking
from db.gsc import get_snapshot, list_snapshots, save_snapshot

# A query has to improve by at least this many average-position places to count
# as a "mover". Below this is noise, and calling noise a win is the exact thing
# this product is built against.
MOVER_MIN_DELTA = 3.0
# How many of the latest snapshot's top queries (by clicks) we scan for movers.
MOVER_TOP_N = 25


# ── Pure bucketing math (no I/O — unit-tested directly) ─────────────────────

def week_buckets(start_date: date, weeks: int) -> List["tuple[date, date]"]:
    """`weeks` consecutive 7-day [period_start, period_end] pairs from start_date.
    Contiguous and non-overlapping; period_end is inclusive (start + 6 days)."""
    out: List["tuple[date, date]"] = []
    for k in range(max(0, weeks)):
        ps = start_date + timedelta(days=7 * k)
        out.append((ps, ps + timedelta(days=6)))
    return out


def week_index(d_iso: str, start_date: date, weeks: int) -> Optional[int]:
    """Which weekly bucket an ISO date/datetime string falls in, or None if it
    lands outside the [start_date, start_date + weeks*7) window. Tolerates a
    'YYYY-MM-DD HH:MM:SS' created_at by reading only the leading date."""
    if not d_iso:
        return None
    try:
        d = date.fromisoformat(str(d_iso)[:10])
    except (TypeError, ValueError):
        return None
    delta = (d - start_date).days
    if delta < 0:
        return None
    idx = delta // 7
    return idx if idx < weeks else None


def assemble_weekly(
    start_date: date,
    weeks: int,
    daily_rows: List[Dict[str, Any]],
    lead_rows: List[Dict[str, Any]],
    task_rows: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Fold the three series into one weekly array. Each element:
    {period_start, period_end, impressions, clicks, leads_count, work_items[]}.

    Rows whose date falls outside the window are dropped, not clamped — a stray
    date must never inflate an edge week. A week with data in one series and none
    in another is correct and expected (that gap IS the story); it is left as a
    real zero, distinguishable from "no data" by the has_gsc/has_leads flags the
    caller sets from the raw series.
    """
    buckets = week_buckets(start_date, weeks)
    weekly: List[Dict[str, Any]] = [
        {
            "period_start": ps.isoformat(),
            "period_end": pe.isoformat(),
            "impressions": 0,
            "clicks": 0,
            "leads_count": 0,
            "work_items": [],
        }
        for (ps, pe) in buckets
    ]

    for r in daily_rows or []:
        i = week_index(r.get("date", ""), start_date, weeks)
        if i is None:
            continue
        weekly[i]["impressions"] += int(r.get("impressions", 0) or 0)
        weekly[i]["clicks"] += int(r.get("clicks", 0) or 0)

    for r in lead_rows or []:
        i = week_index(r.get("date", ""), start_date, weeks)
        if i is None:
            continue
        weekly[i]["leads_count"] += int(r.get("count", 0) or 0)

    for t in task_rows or []:
        # A task lands in the week it was scheduled for (week_of), falling back to
        # when it was logged (created_at) if no week was set.
        anchor = t.get("week_of") or t.get("created_at") or ""
        i = week_index(anchor, start_date, weeks)
        if i is None:
            continue
        weekly[i]["work_items"].append(
            {
                "title": t.get("title"),
                "category": t.get("category"),
                "status": t.get("status"),
                "detail": t.get("detail"),
                "url": t.get("url"),
                "week_of": t.get("week_of"),
                "created_at": t.get("created_at"),
            }
        )

    return weekly


def compute_query_movers(
    earliest_rows: List[Dict[str, Any]],
    latest_rows: List[Dict[str, Any]],
    top_n: int = MOVER_TOP_N,
    min_delta: float = MOVER_MIN_DELTA,
) -> List[Dict[str, Any]]:
    """Queries that entered the top set or climbed materially between the
    earliest and latest cached top-queries snapshots.

    GSC 'position' is an average rank where LOWER is better, so an improvement is
    a positive (from − to). We report only two honest states:
      status='new'  the query is in the latest top set but wasn't ranking before
      status='up'   it was ranking, and improved by >= min_delta places
    A query that barely moved, or slipped, is left out — this lists wins that are
    real, not every wobble dressed up as progress.
    """
    def pos_map(rows: List[Dict[str, Any]]) -> Dict[str, float]:
        m: Dict[str, float] = {}
        for r in rows or []:
            q = r.get("query")
            if q is not None and q not in m:
                m[q] = float(r.get("position", 0.0) or 0.0)
        return m

    earliest_pos = pos_map(earliest_rows)
    latest_sorted = sorted(
        latest_rows or [],
        key=lambda r: (int(r.get("clicks", 0) or 0), int(r.get("impressions", 0) or 0)),
        reverse=True,
    )

    movers: List[Dict[str, Any]] = []
    for r in latest_sorted[:top_n]:
        q = r.get("query")
        if q is None:
            continue
        to_pos = float(r.get("position", 0.0) or 0.0)
        from_pos = earliest_pos.get(q)
        if from_pos is None:
            movers.append(
                {"query": q, "from_position": None, "to_position": round(to_pos, 1),
                 "delta": None, "status": "new"}
            )
        else:
            delta = from_pos - to_pos  # positive == climbed (lower rank number)
            if delta >= min_delta:
                movers.append(
                    {"query": q, "from_position": round(from_pos, 1),
                     "to_position": round(to_pos, 1), "delta": round(delta, 1),
                     "status": "up"}
                )

    # New entrants first (best current rank first), then climbers by biggest gain.
    movers.sort(key=lambda m: (m["status"] != "new", -(m["delta"] or 0.0), m["to_position"]))
    return movers


# ── Async orchestration (reads cache + the three stores) ────────────────────

async def _get_daily_series(
    client: Dict[str, Any], client_id: int, days: int, force: bool
) -> "tuple[List[Dict[str, Any]], bool]":
    """The GSC daily series, cache-first (dimension='date'), mirroring the
    read/pull/save contract in gsc/routes.py. Returns (rows, no_data).

    "Not connected" (no property mapped, or no server credentials) is NOT an
    error here — it returns an empty series so the timeline still shows leads and
    work. A real auth/enablement failure is raised as a typed GSC error for the
    router to translate, so a broken connection is never disguised as "no data".
    """
    prop = client.get("gsc_property")
    if not prop or not gsc_client.is_configured():
        return [], True

    start, end = gsc_client.default_range(days)
    if not force:
        snap = await get_snapshot(client_id, "date", end)
        if snap and snap.get("payload") and snap.get("date_range_start") == start:
            payload = snap["payload"]
            rows = payload.get("rows", []) or []
            return rows, bool(payload.get("no_data", not rows))

    # googleapiclient is blocking — keep it off the event loop. Typed GSC errors
    # (GSCApiDisabled / GSCNoAccess / GSCConfigError) propagate to the router.
    result = await asyncio.to_thread(gsc_client.daily_metrics, prop, days)
    rows = result["rows"]
    await save_snapshot(client_id, "date", start, end, {"rows": rows, "no_data": result["no_data"]})
    return rows, bool(result["no_data"])


async def _query_movers(client_id: int) -> List[Dict[str, Any]]:
    """Movers from the cached 'query' snapshots ONLY — never a fresh pull. Needs
    at least two snapshots to have an 'earliest vs latest' to compare; with fewer
    it returns [] (honest: no trend to show yet)."""
    snaps = await list_snapshots(client_id, "query")
    if len(snaps) < 2:
        return []
    earliest = (snaps[0].get("payload") or {}).get("rows", []) or []
    latest = (snaps[-1].get("payload") or {}).get("rows", []) or []
    if not earliest or not latest:
        return []
    return compute_query_movers(earliest, latest)


def _gsc_state(client: Dict[str, Any], has_gsc: bool) -> str:
    """Distinguish "never connected" from "connected but no rows yet" without
    dressing either up as the other."""
    if not client.get("gsc_property") or not gsc_client.is_configured():
        return "not_connected"
    return "ok" if has_gsc else "no_data_yet"


async def build_growth_timeline(
    client: Dict[str, Any], client_id: int, weeks: int = 12, force: bool = False
) -> Dict[str, Any]:
    """Assemble the per-client Growth Timeline over `weeks` weekly buckets.

    `client` is a reporting_clients row (already loaded by the router); we read
    its slug + gsc_property. May raise a typed GSC error (GSCApiDisabled /
    GSCNoAccess / GSCConfigError) which the router translates to 503/424.
    """
    weeks = max(1, min(int(weeks), 52))
    days = weeks * 7
    end = gsc_client.default_end()               # date, lag-adjusted
    start_date = end - timedelta(days=days - 1)  # inclusive window of exactly `days`
    start_iso, end_iso = start_date.isoformat(), end.isoformat()
    slug = (client.get("slug") or "").strip().lower()

    # 1. Search visibility (cache-first; may raise typed GSC errors).
    daily_rows, _ = await _get_daily_series(client, client_id, days, force)
    # 2. Client website leads.
    lead_rows = await tracking.leads_by_date(slug, start_iso, end_iso) if slug else []
    # 3. Work done.
    task_rows = await reporting.list_tasks_for_slug(slug, limit=500) if slug else []

    weekly = assemble_weekly(start_date, weeks, daily_rows, lead_rows, task_rows)
    query_movers = await _query_movers(client_id)

    has_gsc = bool(daily_rows)
    has_leads = any(int(r.get("count", 0) or 0) > 0 for r in lead_rows)

    return {
        "client_id": client_id,
        "date_range": {"start": start_iso, "end": end_iso, "weeks": weeks, "days": days},
        "weekly": weekly,
        "query_movers": query_movers,
        "has_gsc": has_gsc,
        "has_leads": has_leads,
        # "not_connected" | "no_data_yet" | "ok" — lets the UI say the right
        # thing instead of implying a zero is a measured result.
        "gsc_state": _gsc_state(client, has_gsc),
    }
