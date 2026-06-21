"""
Perplexity citation checker.

Uses the Perplexity API (pplx-api, sonar model) to check whether a business
is cited when a money query is asked. Perplexity returns source URLs which
we can check directly for the client's domain.
"""

from __future__ import annotations

import os
import re
import logging
from datetime import date

logger = logging.getLogger(__name__)

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "")


async def check_perplexity(
    query: str,
    business_name: str,
    business_domain: str = "",
    service_area: str = "",
) -> dict:
    """
    Returns:
        {engine, query, cited, cited_url, position_in_response, response_excerpt, snapshot_date}
    """
    today = date.today().isoformat()
    base = {
        "engine": "perplexity",
        "query": query,
        "cited": False,
        "cited_url": None,
        "position_in_response": None,
        "response_excerpt": None,
        "snapshot_date": today,
    }

    if not PERPLEXITY_API_KEY:
        base["error"] = "PERPLEXITY_API_KEY not configured"
        return base

    try:
        import httpx
        prompt = f"{query} in {service_area or 'Tampa Bay, Florida'}"

        async with httpx.AsyncClient(timeout=25) as hc:
            r = await hc.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500,
                    "temperature": 0.2,
                    "return_citations": True,
                },
            )

        if r.status_code != 200:
            base["error"] = f"Perplexity {r.status_code}: {r.text[:200]}"
            return base

        data = r.json()
        text = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])
        base["response_excerpt"] = text[:300]

        name_lower = business_name.lower()
        domain_lower = (business_domain or "").lower().replace("www.", "")

        # Check if business name appears in response
        name_cited = name_lower in text.lower()

        # Check if business domain appears in citations
        domain_cited = False
        cited_url = None
        if domain_lower:
            for url in citations:
                if domain_lower in url.lower():
                    domain_cited = True
                    cited_url = url
                    break

        if name_cited or domain_cited:
            base["cited"] = True
            base["cited_url"] = cited_url

            if name_cited:
                sentences = text.split(".")
                for i, s in enumerate(sentences):
                    if name_lower in s.lower():
                        base["position_in_response"] = i + 1
                        break

    except Exception as e:
        logger.warning("perplexity_checker error for '%s': %s", query, e)
        base["error"] = str(e)

    return base
