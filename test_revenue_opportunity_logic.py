"""
Unit guards for the pure-logic cores of the Revenue Agent, Opportunity Engine,
and AI Visibility Agent. These functions take plain dicts and return plain
dicts — no DB, no network, no external keys — so they can be exercised in any
environment.

Usage:
    python3 test_revenue_opportunity_logic.py
"""

import sys
from datetime import date


def test_revenue_funnel() -> list[str]:
    from agents.revenue_agent.funnel import build_snapshot
    fails = []

    # Case 1: actual won-job revenue beats estimate, ROI computed off fee
    snap = build_snapshot(
        slug="sandbar",
        start=date(2026, 6, 1),
        end=date(2026, 6, 30),
        events={"call": 8, "lead": 5, "click": 40, "view": 200},
        calls_detail={"answered": 0},
        won_jobs={"count": 3, "revenue": 2400, "jobs": []},
        gsc={"organic_clicks": 120},
        ga4={"sessions": 300},
        avg_job_value=425,
        close_rate=0.30,
        monthly_fee=697,
    )
    if snap.revenue_actual != 2400:
        fails.append(f"revenue_actual expected 2400, got {snap.revenue_actual}")
    # contacts = max(8 calls, 5 leads) = 8; estimated = 8 * 0.30 * 425 = 1020
    if snap.revenue_estimated != 1020:
        fails.append(f"revenue_estimated expected 1020, got {snap.revenue_estimated}")
    # influenced = max(2400, 1020) = 2400
    if snap.revenue_influenced != 2400:
        fails.append(f"revenue_influenced expected 2400, got {snap.revenue_influenced}")
    # roi = 2400 / 697 = 3.44
    if abs(snap.roi_multiple - 3.44) > 0.01:
        fails.append(f"roi_multiple expected ~3.44, got {snap.roi_multiple}")
    # confidence: calls(2)+leads(2)+jobs(3)+gsc(1) = 8 >= 5 -> high
    if snap.confidence != "high":
        fails.append(f"confidence expected high, got {snap.confidence}")

    # Case 2: no data at all -> $0 influenced, low confidence, roi 0
    empty = build_snapshot(
        slug="empty", start=date(2026, 6, 1), end=date(2026, 6, 30),
        events={}, calls_detail={}, won_jobs={}, gsc={}, ga4={},
        avg_job_value=400, close_rate=0.30, monthly_fee=697,
    )
    if empty.revenue_influenced != 0:
        fails.append(f"empty influenced expected 0, got {empty.revenue_influenced}")
    if empty.roi_multiple != 0.0:
        fails.append(f"empty roi expected 0, got {empty.roi_multiple}")
    if empty.confidence != "low":
        fails.append(f"empty confidence expected low, got {empty.confidence}")

    # Case 3: estimate beats actual when no jobs logged but contacts exist
    est = build_snapshot(
        slug="est", start=date(2026, 6, 1), end=date(2026, 6, 30),
        events={"call": 10, "lead": 2}, calls_detail={}, won_jobs={},
        gsc={}, ga4={}, avg_job_value=500, close_rate=0.30, monthly_fee=697,
    )
    # contacts = 10; estimated = 10 * 0.30 * 500 = 1500; influenced = 1500
    if est.revenue_influenced != 1500:
        fails.append(f"est influenced expected 1500, got {est.revenue_influenced}")
    # confidence: calls(2) only = 2 -> medium
    if est.confidence != "medium":
        fails.append(f"est confidence expected medium, got {est.confidence}")

    # to_dict round-trips
    d = snap.to_dict()
    if d["slug"] != "sandbar" or "roi_multiple" not in d:
        fails.append("to_dict missing expected keys")

    return fails


def test_gsc_miner() -> list[str]:
    from agents.opportunity_agent.gsc_miner import mine_striking_distance
    fails = []

    gsc = {
        "top_keywords": [
            {"keyword": "roof cleaning palm harbor", "position": 11, "impressions": 400, "clicks": 8},
            {"keyword": "soft wash clearwater", "position": 9, "impressions": 220, "clicks": 4},
            {"keyword": "already winning", "position": 2, "impressions": 1000, "clicks": 300},  # too high
            {"keyword": "no impressions", "position": 15, "impressions": 3, "clicks": 0},  # too few impr
            {"keyword": "way down", "position": 45, "impressions": 500, "clicks": 0},  # out of band
        ],
        "money_keyword_ranks": [],
    }
    opps = mine_striking_distance(gsc, avg_job_value=425, monthly_fee=697)
    kws = {o["query_or_gap"] for o in opps}
    if "roof cleaning palm harbor" not in kws:
        fails.append("striking-distance miss: roof cleaning palm harbor (pos 11) should qualify")
    if "soft wash clearwater" not in kws:
        fails.append("striking-distance miss: soft wash clearwater (pos 9) should qualify")
    if "already winning" in kws:
        fails.append("striking-distance false positive: pos 2 should NOT qualify")
    if "no impressions" in kws:
        fails.append("striking-distance false positive: <10 impressions should NOT qualify")
    if "way down" in kws:
        fails.append("striking-distance false positive: pos 45 should NOT qualify")
    # all qualifying opps must have positive revenue + impact + type tag
    for o in opps:
        if o["type"] != "gsc_striking":
            fails.append(f"wrong type: {o['type']}")
        if o["est_revenue"] < 0:
            fails.append(f"negative revenue for {o['query_or_gap']}")
    # sorted descending by impact
    scores = [o["impact_score"] for o in opps]
    if scores != sorted(scores, reverse=True):
        fails.append("opportunities not sorted by impact_score desc")

    return fails


def test_gbp_gaps() -> list[str]:
    from agents.opportunity_agent.gbp_gaps import detect_gbp_gaps
    fails = []

    # No data -> a single "connect GBP" opportunity
    none_opps = detect_gbp_gaps({}, avg_job_value=425, monthly_fee=697)
    if len(none_opps) != 1 or none_opps[0]["query_or_gap"] != "gbp_connection":
        fails.append("empty GBP should yield exactly one gbp_connection opp")

    # Thin profile: few photos, no description, no hours
    thin = detect_gbp_gaps(
        {"photos": [1, 2, 3], "reviews": []},
        avg_job_value=425, monthly_fee=697,
    )
    gaps = {o["query_or_gap"] for o in thin}
    if "gbp_photos" not in gaps:
        fails.append("3 photos should trigger gbp_photos gap")
    if "gbp_description" not in gaps:
        fails.append("missing editorial_summary should trigger gbp_description gap")
    if "gbp_hours" not in gaps:
        fails.append("missing opening_hours should trigger gbp_hours gap")
    # all have a recommended action
    for o in thin:
        if not o.get("recommended_action"):
            fails.append(f"gap {o['query_or_gap']} missing recommended_action")

    # Complete profile: 12 photos, has description + hours, recent review
    import time
    complete = detect_gbp_gaps(
        {
            "photos": list(range(12)),
            "editorial_summary": "We soft wash.",
            "opening_hours": {"x": 1},
            "reviews": [{"time": int(time.time())}],
        },
        avg_job_value=425, monthly_fee=697,
    )
    cg = {o["query_or_gap"] for o in complete}
    if "gbp_photos" in cg:
        fails.append("12 photos should NOT trigger photo gap")
    if "gbp_description" in cg:
        fails.append("present description should NOT trigger description gap")

    return fails


def test_city_pages() -> list[str]:
    from agents.opportunity_agent.city_pages import detect_city_page_gaps
    fails = []

    gsc = {
        "top_keywords": [
            {"keyword": "soft wash clearwater", "impressions": 120},
            {"keyword": "roof cleaning clearwater fl", "impressions": 80},
            {"keyword": "pressure washing dunedin", "impressions": 15},  # below threshold
            {"keyword": "house washing tampa", "impressions": 200},
        ],
        "money_keyword_ranks": [],
    }
    # Existing page for tampa -> should be skipped; clearwater has no page
    opps = detect_city_page_gaps(
        gsc, existing_pages=["/soft-wash-tampa"], avg_job_value=425, monthly_fee=697
    )
    cities = {o["query_or_gap"] for o in opps}
    if "clearwater" not in cities:
        fails.append("clearwater (200 impr, no page) should be a city opportunity")
    if "tampa" in cities:
        fails.append("tampa has an existing page and should be skipped")
    if "dunedin" in cities:
        fails.append("dunedin (<20 impr) should be below threshold")
    for o in opps:
        if o["type"] != "city_page":
            fails.append(f"wrong type: {o['type']}")

    return fails


def test_extract_domain() -> list[str]:
    from agents.ai_visibility_agent.util import extract_domain
    fails = []
    cases = {
        "https://www.sandbarsoftwash.com": "sandbarsoftwash.com",
        "http://example.com/path": "example.com",
        "sandbarsoftwash.com": "sandbarsoftwash.com",
        "": "",
    }
    for inp, expected in cases.items():
        got = extract_domain(inp)
        if got != expected:
            fails.append(f"extract_domain({inp!r}) expected {expected!r}, got {got!r}")
    return fails


def test_aeo_fallback() -> list[str]:
    """The AEO drafter must return a usable template (never crash) with no key."""
    import os
    os.environ.pop("ANTHROPIC_API_KEY", None)
    import importlib
    import agents.opportunity_agent.aeo_drafter as mod
    importlib.reload(mod)
    import asyncio
    fails = []
    block = asyncio.run(mod.draft_aeo_block("best roof cleaner palm harbor", "Sandbar Soft Wash"))
    for field in ("question", "answer_40_words", "supporting_bullets", "faq_schema"):
        if field not in block:
            fails.append(f"AEO fallback missing field: {field}")
    if block.get("_source") != "fallback_template":
        fails.append(f"expected fallback_template source, got {block.get('_source')}")
    return fails


def main() -> int:
    suites = [
        ("revenue_funnel", test_revenue_funnel),
        ("gsc_miner", test_gsc_miner),
        ("gbp_gaps", test_gbp_gaps),
        ("city_pages", test_city_pages),
        ("extract_domain", test_extract_domain),
        ("aeo_fallback", test_aeo_fallback),
    ]
    total_fails = []
    for name, fn in suites:
        try:
            fails = fn()
        except Exception as e:
            fails = [f"EXCEPTION: {e!r}"]
        if fails:
            print(f"FAIL  {name}")
            for f in fails:
                print(f"        - {f}")
            total_fails.extend(fails)
        else:
            print(f"OK    {name}")

    if total_fails:
        print(f"\n{len(total_fails)} assertion(s) failed.")
        return 1
    print("\nAll revenue/opportunity/AI-visibility logic tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
