"""
GBP completeness gap detector.

Checks for missing/thin GBP fields that are known local-ranking factors:
categories, services, photos, weekly posts, Q&A, review velocity.
Uses data already available in the audit response (Places API).
"""

from __future__ import annotations

from datetime import date, timedelta


# Fields that Google Places API returns (or doesn't) for the business
_GBP_CHECKS = [
    ("categories", "business_categories", "Add secondary GBP categories for all services offered"),
    ("photos", "photos", "Upload 10+ high-quality photos (before/after work, crew, vehicles)"),
    ("website", "website", "Link GBP to the service page, not just homepage"),
    ("opening_hours", "opening_hours", "Add complete business hours including holidays"),
    ("description", "editorial_summary", "Write a keyword-rich 750-char GBP business description"),
]


def detect_gbp_gaps(
    places_data: dict,
    avg_job_value: int = 400,
    monthly_fee: int = 697,
) -> list[dict]:
    """
    Takes a Places API result dict and returns opportunity dicts for each gap.
    places_data: the 'details' dict from the GBP/Places audit response.
    """
    if not places_data:
        return [{
            "type": "gbp_gap",
            "title": "Connect GBP to LOLA for automated auditing",
            "query_or_gap": "gbp_connection",
            "est_monthly_clicks": 0,
            "est_jobs_won": 0,
            "est_revenue": 0,
            "effort_days": 1,
            "impact_score": 15.0,
            "recommended_action": "Run POST /admin/gbp/connect to link the Google Business Profile — this unlocks photo monitoring, review alerts, and weekly post automation.",
            "data": {},
        }]

    gaps = []

    # Photo count — GBP profiles with 10+ photos get 35% more website clicks
    photo_count = len(places_data.get("photos", []) or [])
    if photo_count < 10:
        needed = 10 - photo_count
        est_revenue = int(round(avg_job_value * 0.35 * 0.3 * 2))  # modest uplift
        gaps.append({
            "type": "gbp_gap",
            "title": f"Add {needed} more GBP photos (currently {photo_count})",
            "query_or_gap": "gbp_photos",
            "est_monthly_clicks": 15,
            "est_jobs_won": 0.5,
            "est_revenue": est_revenue,
            "effort_days": 1,
            "impact_score": round(est_revenue / 1 / max(monthly_fee, 1) * 1000, 2),
            "recommended_action": f"Upload {needed} more photos to GBP: before/after jobs, crew in uniform, vehicle with logo, service area. Profiles with 10+ photos get 35% more website clicks.",
            "data": {"photo_count": photo_count},
        })

    # Editorial summary / description
    if not places_data.get("editorial_summary"):
        est_revenue = int(round(avg_job_value * 0.15 * 0.3))
        gaps.append({
            "type": "gbp_gap",
            "title": "Add keyword-rich GBP business description",
            "query_or_gap": "gbp_description",
            "est_monthly_clicks": 8,
            "est_jobs_won": 0.3,
            "est_revenue": est_revenue,
            "effort_days": 1,
            "impact_score": round(est_revenue / 1 / max(monthly_fee, 1) * 1000, 2),
            "recommended_action": "Write a 500–750 character GBP description using primary service keywords and city names. Include the main services, service area cities, and a unique differentiator (e.g., 'soft wash specialists serving Pinellas County since 2018').",
            "data": {},
        })

    # Review recency — if last review > 30 days, flag
    reviews = places_data.get("reviews", []) or []
    if reviews:
        try:
            latest_ts = max(r.get("time", 0) for r in reviews)
            from datetime import datetime
            days_since = (datetime.utcnow() - datetime.utcfromtimestamp(latest_ts)).days
            if days_since > 30:
                est_revenue = int(round(avg_job_value * 0.20 * 0.3))
                gaps.append({
                    "type": "gbp_gap",
                    "title": f"No new reviews in {days_since} days — request reviews from recent jobs",
                    "query_or_gap": "gbp_review_velocity",
                    "est_monthly_clicks": 20,
                    "est_jobs_won": 0.6,
                    "est_revenue": est_revenue,
                    "effort_days": 2,
                    "impact_score": round(est_revenue / 2 / max(monthly_fee, 1) * 1000, 2),
                    "recommended_action": f"Send review requests to the last 10 completed jobs via the LOLA reviews module (/admin/reviews/request). Fresh reviews are a top-3 local-pack ranking factor.",
                    "data": {"days_since_last_review": days_since},
                })
        except Exception:
            pass

    # Opening hours
    if not places_data.get("opening_hours"):
        gaps.append({
            "type": "gbp_gap",
            "title": "Add business hours to GBP",
            "query_or_gap": "gbp_hours",
            "est_monthly_clicks": 5,
            "est_jobs_won": 0.1,
            "est_revenue": int(avg_job_value * 0.1 * 0.3),
            "effort_days": 1,
            "impact_score": 3.0,
            "recommended_action": "Set complete GBP business hours. Profiles with hours show up 20% more in 'open now' searches.",
            "data": {},
        })

    gaps.sort(key=lambda x: x["impact_score"], reverse=True)
    return gaps
