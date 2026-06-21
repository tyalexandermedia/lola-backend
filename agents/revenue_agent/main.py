"""
Revenue Agent — entry point.

Usage:
    snapshot = await run_for_client("sandbar")
    snapshot = await run_for_client("sandbar", days=7)

Typical call: once/week from the weekly cron, right before the Reporting Agent,
so the email can open with the ROI number.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from agents.revenue_agent.collectors import (
    collect_tracked_events,
    collect_tracked_calls,
    collect_won_jobs,
    collect_gsc,
    collect_ga4,
)
from agents.revenue_agent.funnel import build_snapshot, RevenueSnapshot
from db.revenue import save_snapshot, get_latest_snapshot

logger = logging.getLogger(__name__)


async def run_for_client(slug: str, days: int = 30) -> RevenueSnapshot:
    """
    Compute a RevenueSnapshot for the given client slug, persist it,
    and return it. Never raises — logs errors and returns a zero snapshot.
    """
    from db.reporting import get_client_by_slug

    slug_l = slug.strip().lower()
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)

    client = await get_client_by_slug(slug_l) or {}
    avg_job_value = int(client.get("avg_job_value") or 400)
    close_rate = float(client.get("conversion_rate") or 0.03)
    monthly_fee = int(client.get("fee_monthly") or 0)
    if not monthly_fee:
        # Try to derive from a known pricing tier; default 697 for retainers
        monthly_fee = 697

    try:
        events, calls_detail, won_jobs, gsc, ga4 = await _gather(
            slug_l, start, end, client
        )
    except Exception as e:
        logger.error("revenue_agent collect error for %s: %s", slug_l, e)
        events, calls_detail, won_jobs, gsc, ga4 = {}, {}, {}, {}, {}

    snapshot = build_snapshot(
        slug=slug_l,
        start=start,
        end=end,
        events=events,
        calls_detail=calls_detail,
        won_jobs=won_jobs,
        gsc=gsc,
        ga4=ga4,
        avg_job_value=avg_job_value,
        close_rate=close_rate,
        monthly_fee=monthly_fee,
    )

    try:
        await save_snapshot(slug_l, snapshot.to_dict())
    except Exception as e:
        logger.error("revenue_agent save error for %s: %s", slug_l, e)

    logger.info(
        "revenue_agent %s: $%d influenced (%.1f× ROI) [%s confidence]",
        slug_l, snapshot.revenue_influenced, snapshot.roi_multiple, snapshot.confidence
    )
    return snapshot


async def _gather(slug: str, start: date, end: date, client: dict):
    import asyncio
    results = await asyncio.gather(
        collect_tracked_events(slug, start, end),
        collect_tracked_calls(slug, start, end),
        collect_won_jobs(slug, start, end),
        collect_gsc(client, start, end),
        collect_ga4(client),
        return_exceptions=True,
    )
    out = []
    defaults = [{}, {}, {}, {}, {}]
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            logger.warning("collector %d error: %s", i, r)
            out.append(defaults[i])
        else:
            out.append(r)
    return out


async def run_for_all_active(days: int = 30) -> list[dict]:
    """Run revenue agent for every active reporting client. Called by weekly cron."""
    from db.reporting import get_active_clients
    clients = await get_active_clients()
    results = []
    for c in clients:
        slug = c.get("slug", "")
        if not slug:
            continue
        try:
            snap = await run_for_client(slug, days=days)
            results.append({"slug": slug, "roi_multiple": snap.roi_multiple,
                            "revenue_influenced": snap.revenue_influenced})
        except Exception as e:
            logger.error("revenue_agent failed for %s: %s", slug, e)
            results.append({"slug": slug, "error": str(e)})
    return results
