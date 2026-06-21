"""
AEO answer-block drafter.

When the AI Visibility Agent finds a client is NOT cited for a money query,
this drafts a citation-ready AEO block (question + concise answer + supporting
bullets + FAQ schema stub) using Claude — following the exact format proven in
docs/case-studies/sandbar-roof-cleaning-optimization.md.

Degrades gracefully: if ANTHROPIC_API_KEY is missing, returns a structured
template the operator can fill in manually (never a fabricated answer).
"""

from __future__ import annotations

import os
import json
import logging

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("SWARM_MODEL", "claude-opus-4-7")

_SYSTEM = (
    "You write AEO (Answer Engine Optimization) blocks for home-services "
    "contractors so AI search engines (ChatGPT, Perplexity, Google AI Overview) "
    "cite their website. Output STRICT JSON only. Format:\n"
    '{"question": "...", "answer_40_words": "...", '
    '"supporting_bullets": ["...","...","..."], '
    '"faq_schema": {"@type":"Question","name":"...","acceptedAnswer":{"@type":"Answer","text":"..."}}}\n'
    "Rules: answer_40_words must be a direct, factual 35–45 word answer a citation "
    "engine can quote verbatim. Never invent statistics, prices, awards, or reviews. "
    "Use the business name and service area naturally. No marketing fluff."
)


def _fallback_template(query: str, business_name: str, service_area: str) -> dict:
    """Honest placeholder when Claude isn't available — operator fills it in."""
    return {
        "question": query if query.endswith("?") else f"What is the best option for: {query}?",
        "answer_40_words": (
            f"[DRAFT — fill in] {business_name} serves {service_area}. "
            f"Write a direct 35–45 word answer to \"{query}\" here, with one "
            f"concrete differentiator and the service area. No invented stats."
        ),
        "supporting_bullets": [
            "[Add a specific service detail]",
            "[Add the service area / cities covered]",
            "[Add one proof point — years in business, certification, guarantee]",
        ],
        "faq_schema": {
            "@type": "Question",
            "name": query,
            "acceptedAnswer": {"@type": "Answer", "text": "[Fill in the 40-word answer above]"},
        },
        "_source": "fallback_template",
    }


async def draft_aeo_block(
    query: str,
    business_name: str,
    service_area: str = "Tampa Bay, Florida",
    avg_job_value: int = 400,
) -> dict:
    """
    Returns an AEO block dict. Uses Claude if configured, else a fillable template.
    """
    if not ANTHROPIC_API_KEY:
        logger.info("aeo_drafter: ANTHROPIC_API_KEY missing — returning template")
        return _fallback_template(query, business_name, service_area)

    try:
        import httpx
        user = (
            f"Business: {business_name}\n"
            f"Service area: {service_area}\n"
            f"Money query the business is NOT currently cited for: \"{query}\"\n"
            f"Average job value: ${avg_job_value}\n\n"
            f"Write the AEO block that would earn a citation for this query."
        )
        async with httpx.AsyncClient(timeout=30) as hc:
            r = await hc.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 600,
                    "system": _SYSTEM,
                    "messages": [{"role": "user", "content": user}],
                },
            )
        if r.status_code != 200:
            logger.warning("aeo_drafter Anthropic %s: %s", r.status_code, r.text[:200])
            return _fallback_template(query, business_name, service_area)

        text = r.json()["content"][0]["text"].strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
        block = json.loads(text)
        block["_source"] = "claude"
        return block
    except Exception as e:
        logger.warning("aeo_drafter error for '%s': %s", query, e)
        return _fallback_template(query, business_name, service_area)
