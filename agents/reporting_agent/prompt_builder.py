"""
Builds the structured JSON Claude receives + the system prompt.

System prompt is spec-locked. User message is the per-client data snapshot.
"""

from __future__ import annotations
import json
from typing import Any

SYSTEM_PROMPT = (
    "You are a no-BS SEO strategist reporting to a contractor on weekly progress. "
    "Output plain-text email under 175 words. Structure: "
    "(1) If 'roi' data is present, open with it: 'This period: X calls, Y leads, Z jobs → ~$N influenced (Nx your $M fee).' "
    "(2) One-line headline with biggest win or honest update. "
    "(3) Organic traffic trend with % change. "
    "(4) Top 5 money keywords with rank movement. "
    "(5) What got done and what's next. "
    "Frame everything in phone calls and jobs, not vanity metrics. "
    "Brutal honesty over hype. Never invent stats. Sign off as Ty."
)


def build_user_payload(
    client: dict,
    gsc: dict,
    ga: dict,
    implementation: dict,
    estimated_revenue: int,
    traffic_delta_pct: float,
    revenue_snapshot: dict | None = None,
) -> dict:
    """Compact, model-friendly JSON. Claude prefers shorter > exhaustive."""
    payload: dict = {
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
    # Inject ROI data if Revenue Agent has a snapshot — leads the email
    if revenue_snapshot and revenue_snapshot.get("revenue_influenced", 0) > 0:
        payload["roi"] = {
            "calls_this_period": revenue_snapshot.get("calls", 0),
            "leads_this_period": revenue_snapshot.get("leads", 0),
            "jobs_won": revenue_snapshot.get("jobs_won", 0),
            "revenue_influenced_usd": revenue_snapshot.get("revenue_influenced", 0),
            "monthly_fee_usd": revenue_snapshot.get("monthly_fee", 0),
            "roi_multiple": revenue_snapshot.get("roi_multiple", 0),
            "confidence": revenue_snapshot.get("confidence", "low"),
        }
    return payload


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
