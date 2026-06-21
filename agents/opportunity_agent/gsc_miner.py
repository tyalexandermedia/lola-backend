"""
Mine GSC data for striking-distance keywords (position 8–20, impressions > 10).
These are the highest-ROI content opportunities: already getting impressions,
one ranking push away from page 1.
"""

from __future__ import annotations

import math


def mine_striking_distance(
    gsc_data: dict,
    avg_job_value: int = 400,
    monthly_fee: int = 697,
) -> list[dict]:
    """
    Takes fetch_gsc() output and returns a list of opportunity dicts
    for queries in positions 8–20 with impressions > 10.
    """
    rows = gsc_data.get("top_keywords", []) + gsc_data.get("money_keyword_ranks", [])
    seen = set()
    opportunities = []

    for row in rows:
        kw = row.get("keyword") or row.get("key", "")
        pos = float(row.get("position") or row.get("position_this") or 0)
        impressions = int(row.get("impressions", 0))
        clicks = int(row.get("clicks", 0))

        if not kw or kw in seen:
            continue
        if not (8 <= pos <= 20):
            continue
        if impressions < 10:
            continue

        seen.add(kw)

        # Estimated clicks if we reach position 3 (CTR ~10% vs current ~2%)
        est_ctr_gain = 0.10 - (clicks / impressions if impressions else 0.02)
        est_monthly_clicks = max(0, int(round(impressions * est_ctr_gain * 4)))  # 4 weeks

        # Conservative: 1-3% of organic clicks become leads, 30% close rate
        est_leads = est_monthly_clicks * 0.02
        est_jobs = est_leads * 0.30
        est_revenue = int(round(est_jobs * avg_job_value))

        # effort estimate: higher position = harder to move
        effort_days = 3 if pos <= 12 else 5

        # impact_score formula: revenue / effort (normalized by fee for relativity)
        impact_score = round((est_revenue / effort_days) * (1 / max(monthly_fee, 1)) * 1000, 2)

        opportunities.append({
            "type": "gsc_striking",
            "title": f'Rank higher for "{kw}" (currently position {int(pos)})',
            "query_or_gap": kw,
            "est_monthly_clicks": est_monthly_clicks,
            "est_jobs_won": round(est_jobs, 2),
            "est_revenue": est_revenue,
            "effort_days": effort_days,
            "impact_score": impact_score,
            "recommended_action": (
                f'Add a dedicated page or AEO block targeting "{kw}". '
                f"Current position {int(pos)} with {impressions} monthly impressions — "
                f"reaching top 3 is estimated to add ~{est_monthly_clicks} clicks/mo "
                f"(~${est_revenue} revenue)."
            ),
            "data": {
                "current_position": pos,
                "impressions": impressions,
                "clicks": clicks,
                "est_ctr_gain": round(est_ctr_gain, 3),
            },
        })

    # Sort by impact score descending
    opportunities.sort(key=lambda x: x["impact_score"], reverse=True)
    return opportunities
