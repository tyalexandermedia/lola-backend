"""
Opportunity Agent — entry point.

Runs all detectors for a client slug, scores results, persists to
db.opportunities, and returns the ranked list.

Usage:
    opps = await run_for_client("sandbar")
    # Returns list of opportunity dicts, sorted by impact_score DESC
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta

from agents.opportunity_agent.gsc_miner import mine_striking_distance
from agents.opportunity_agent.gbp_gaps import detect_gbp_gaps
from agents.opportunity_agent.city_pages import detect_city_page_gaps
from db.opportunities import init_opportunity_tables, upsert_opportunity, get_opportunities

logger = logging.getLogger(__name__)


async def run_for_client(slug: str) -> list[dict]:
    """
    Run all opportunity detectors for a client. Persists results and returns
    the full ranked backlog.
    """
    await init_opportunity_tables()

    from db.reporting import get_client_by_slug
    client = await get_client_by_slug(slug.strip().lower()) or {}
    avg_job_value = int(client.get("avg_job_value") or 400)
    monthly_fee = int(client.get("fee_monthly") or 697)
    site_url = client.get("site_url", "")

    # Gather all detectors concurrently
    gsc_data, gbp_data = await asyncio.gather(
        _safe_gsc(client),
        _safe_gbp(client),
        return_exceptions=True,
    )
    if isinstance(gsc_data, Exception):
        logger.warning("opportunity_agent GSC error for %s: %s", slug, gsc_data)
        gsc_data = {}
    if isinstance(gbp_data, Exception):
        logger.warning("opportunity_agent GBP error for %s: %s", slug, gbp_data)
        gbp_data = {}

    all_opps = []

    # 1. Striking-distance GSC keywords
    if gsc_data:
        all_opps.extend(mine_striking_distance(gsc_data, avg_job_value, monthly_fee))

    # 2. GBP gaps
    all_opps.extend(detect_gbp_gaps(gbp_data, avg_job_value, monthly_fee))

    # 3. City page gaps (requires GSC data)
    if gsc_data:
        all_opps.extend(detect_city_page_gaps(gsc_data, avg_job_value=avg_job_value, monthly_fee=monthly_fee))

    # 4. Static opportunity: ensure basic attribution is set up
    if not client.get("tracking_number"):
        all_opps.append({
            "type": "setup",
            "title": "Set up call tracking number (Twilio) for attribution",
            "query_or_gap": "call_tracking",
            "est_monthly_clicks": 0,
            "est_jobs_won": 0,
            "est_revenue": 0,
            "effort_days": 1,
            "impact_score": 50.0,
            "recommended_action": "Provision a Twilio tracking number and add it to GBP/site. Without it, calls cannot be attributed to LOLA — ROI stays at $0.",
            "data": {},
        })

    # Sort by impact score
    all_opps.sort(key=lambda x: x["impact_score"], reverse=True)

    # Persist
    slug_l = slug.strip().lower()
    for opp in all_opps:
        try:
            await upsert_opportunity(slug_l, opp)
        except Exception as e:
            logger.warning("opportunity_agent upsert error: %s", e)

    logger.info("opportunity_agent %s: %d opportunities found", slug_l, len(all_opps))
    return all_opps


async def _safe_gsc(client: dict) -> dict:
    try:
        import json as _json
        from agents.reporting_agent.data_fetcher import fetch_gsc
        money_keywords = client.get("money_keywords_json", [])
        if isinstance(money_keywords, str):
            try:
                money_keywords = _json.loads(money_keywords)
            except Exception:
                money_keywords = []
        result = await fetch_gsc(
            client.get("site_url", ""),
            money_keywords[:5],
            client.get("gsc_property"),
        )
        return result
    except Exception as e:
        logger.debug("GSC fetch skipped: %s", e)
        return {}


async def _safe_gbp(client: dict) -> dict:
    """Fetch GBP/Places data if available."""
    try:
        import os, httpx
        places_key = os.getenv("GOOGLE_PLACES_KEY", "")
        if not places_key:
            return {}
        gbp_location_id = client.get("gbp_location_id", "")
        if not gbp_location_id:
            return {}
        url = f"https://places.googleapis.com/v1/{gbp_location_id}"
        headers = {
            "X-Goog-Api-Key": places_key,
            "X-Goog-FieldMask": "displayName,photos,editorialSummary,currentOpeningHours,userRatingCount,reviews",
        }
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get(url, headers=headers)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.debug("GBP fetch skipped: %s", e)
    return {}
