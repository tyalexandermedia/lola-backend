"""
Builds the structured JSON Claude receives + the system prompt.

System prompt is spec-locked. User message is the per-client data snapshot.
"""

from __future__ import annotations
import json
from typing import Any

SYSTEM_PROMPT = (
    "You are a no-BS SEO strategist reporting to a contractor on weekly progress. "
    "Output plain-text email under 150 words. Structure: "
    "(1) one-line headline with biggest win or honest update, "
    "(2) organic traffic trend with % change, "
    "(3) top 5 money keywords with rank movement, "
    "(4) estimated revenue impact this week, "
    "(5) what got done and what's next. "
    "Frame everything in phone calls and jobs, not vanity metrics. "
    "Brutal honesty over hype. Sign off as Ty."
)


def build_user_payload(
    client: dict,
    gsc: dict,
    ga: dict,
    implementation: dict,
    estimated_revenue: int,
    traffic_delta_pct: float,
) -> dict:
    """Compact, model-friendly JSON. Claude prefers shorter > exhaustive."""
    return {
        "client": {
            "name": client.get("client_name"),
            "site": client.get("site_url"),
            "industry_conversion_rate_pct": round(
                float(client.get("conversion_rate", 0.03)) * 100, 1
            ),
            "avg_job_value_usd": int(client.get("avg_job_value", 400)),
        },
        "traffic": {
            "organic_clicks_this_week": gsc.get("organic_clicks_this_week", 0),
            "organic_clicks_prev_week": gsc.get("organic_clicks_prev_week", 0),
            "organic_sessions_this_week": ga.get("organic_sessions_this_week", 0),
            "organic_sessions_prev_week": ga.get("organic_sessions_prev_week", 0),
            "wow_delta_pct": traffic_delta_pct,
        },
        "money_keywords": gsc.get("money_keyword_ranks", []),
        "top_search_queries": gsc.get("top_keywords", [])[:5],
        "estimated_revenue_this_week_usd": estimated_revenue,
        "implementation": implementation,
    }


def build_messages(user_payload: dict) -> list[dict[str, Any]]:
    return [
        {
            "role": "user",
            "content": (
                "Write the weekly SEO email for this client based on this data. "
                "Plain text, under 150 words, sign off as Ty.\n\n"
                f"```json\n{json.dumps(user_payload, indent=2)}\n```"
            ),
        }
    ]
