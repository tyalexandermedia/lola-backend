"""
AI Visibility Agent — entry point.

Checks each money query for a client against ChatGPT and Perplexity,
computes an AI Visibility Index (0–100), and persists results.

Usage:
    result = await run_for_client("sandbar")
    # Returns {"index_score": 42, "checks": [...], "engines_checked": 2, ...}
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date

from agents.ai_visibility_agent.chatgpt_checker import check_chatgpt
from agents.ai_visibility_agent.perplexity_checker import check_perplexity
from agents.ai_visibility_agent.util import extract_domain
from db.ai_visibility import (
    init_ai_visibility_tables,
    save_check,
    save_index,
    get_latest_index,
    get_latest_checks,
)

logger = logging.getLogger(__name__)

# Query weights: higher = more important for the index score
_QUERY_WEIGHTS = {
    "money": 2.0,   # explicit buying intent queries
    "general": 1.0,
}


async def run_for_client(slug: str) -> dict:
    """
    Runs AI visibility checks for all money keywords, computes the index,
    persists, and returns summary dict.
    """
    await init_ai_visibility_tables()

    import json as _json
    from db.reporting import get_client_by_slug
    client = await get_client_by_slug(slug.strip().lower()) or {}

    business_name = client.get("client_name", slug)
    site_url = client.get("site_url", "")
    domain = extract_domain(site_url)
    service_area = "Tampa Bay, Florida"  # TODO: pull from client config

    money_keywords = client.get("money_keywords_json", [])
    if isinstance(money_keywords, str):
        try:
            money_keywords = _json.loads(money_keywords)
        except Exception:
            money_keywords = []

    if not money_keywords:
        money_keywords = ["best soft wash company near me", "roof cleaning services"]

    # Run checks concurrently across engines
    tasks = []
    for query in money_keywords[:5]:  # cap at 5 to control API cost
        tasks.append(check_chatgpt(query, business_name, service_area))
        tasks.append(check_perplexity(query, business_name, domain, service_area))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    checks = []
    for r in results:
        if isinstance(r, Exception):
            logger.warning("ai_visibility check exception: %s", r)
            continue
        checks.append(r)
        try:
            await save_check(slug.strip().lower(), r)
        except Exception as e:
            logger.warning("ai_visibility save_check error: %s", e)

    # Compute index
    engines_seen = set()
    queries_checked = set()
    citations_found = 0
    weighted_sum = 0.0
    weight_total = 0.0

    for check in checks:
        eng = check.get("engine", "")
        qry = check.get("query", "")
        engines_seen.add(eng)
        queries_checked.add(qry)
        w = _QUERY_WEIGHTS.get("money", 1.0)
        weight_total += w
        if check.get("cited"):
            citations_found += 1
            weighted_sum += w

    index_score = round((weighted_sum / weight_total * 100) if weight_total > 0 else 0, 1)

    index_data = {
        "index_score": index_score,
        "engines_checked": len(engines_seen),
        "queries_checked": len(queries_checked),
        "citations_found": citations_found,
    }

    try:
        await save_index(slug.strip().lower(), index_data)
    except Exception as e:
        logger.warning("ai_visibility save_index error: %s", e)

    logger.info(
        "ai_visibility %s: index=%.0f %d citations / %d checks",
        slug, index_score, citations_found, len(checks)
    )

    return {
        **index_data,
        "checks": checks,
        "slug": slug.strip().lower(),
        "snapshot_date": date.today().isoformat(),
        "engines": list(engines_seen),
        "business_name": business_name,
    }
