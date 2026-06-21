"""
City page opportunity detector.

Finds cities appearing in GSC query data with significant impressions but
no dedicated city landing page on the client's site. These are high-intent,
geographically specific gaps.
"""

from __future__ import annotations

import re

# Common Florida soft-wash / home-services cities (expand per client config)
_DEFAULT_FL_CITIES = [
    "clearwater", "tampa", "palm harbor", "tarpon springs", "safety harbor",
    "dunedin", "largo", "new port richey", "holiday", "oldsmar",
    "st pete", "saint petersburg", "wesley chapel", "lutz", "land o lakes",
    "hudson", "spring hill", "brooksville", "valrico", "brandon",
    "riverview", "sun city center", "apollo beach", "gibsonton",
]


def detect_city_page_gaps(
    gsc_data: dict,
    existing_pages: list[str] | None = None,
    avg_job_value: int = 400,
    monthly_fee: int = 697,
) -> list[dict]:
    """
    Finds cities with > 20 impressions in GSC but no corresponding city page.
    gsc_data: fetch_gsc() output with top_keywords list.
    existing_pages: list of URL paths the client currently has.
    """
    existing = [p.lower() for p in (existing_pages or [])]
    city_impressions: dict[str, int] = {}

    all_kws = gsc_data.get("top_keywords", []) + gsc_data.get("money_keyword_ranks", [])
    for row in all_kws:
        kw = (row.get("keyword") or row.get("key", "")).lower()
        impressions = int(row.get("impressions", 0))
        for city in _DEFAULT_FL_CITIES:
            if city in kw:
                city_impressions[city] = city_impressions.get(city, 0) + impressions

    opportunities = []
    for city, impressions in city_impressions.items():
        if impressions < 20:
            continue
        city_slug = city.replace(" ", "-").replace(".", "")
        # Check if a city page exists
        has_page = any(city_slug in p or city.replace(" ", "") in p for p in existing)
        if has_page:
            continue

        est_monthly_clicks = int(round(impressions * 0.05 * 4))  # 5% CTR baseline
        est_jobs = est_monthly_clicks * 0.02 * 0.30
        est_revenue = int(round(est_jobs * avg_job_value))
        effort_days = 2
        impact_score = round(est_revenue / effort_days / max(monthly_fee, 1) * 1000, 2)

        opportunities.append({
            "type": "city_page",
            "title": f"Create {city.title()} city landing page ({impressions} monthly impressions, no page)",
            "query_or_gap": city,
            "est_monthly_clicks": est_monthly_clicks,
            "est_jobs_won": round(est_jobs, 2),
            "est_revenue": est_revenue,
            "effort_days": effort_days,
            "impact_score": impact_score,
            "recommended_action": (
                f"Create a dedicated service page for {city.title()}: "
                f"target 'soft wash {city.title()}', 'roof cleaning {city.title()}'. "
                f"Include local landmarks, service-area map embed, and 3 customer testimonials from the area. "
                f"GSC shows {impressions} monthly impressions for {city.title()} queries — "
                f"a city page could convert those to ~{est_monthly_clicks} clicks/mo."
            ),
            "data": {"city": city, "gsc_impressions": impressions},
        })

    opportunities.sort(key=lambda x: x["impact_score"], reverse=True)
    return opportunities
