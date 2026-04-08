from typing import Dict, Any, List
from .weights import get_weights, get_industry_label
from .revenue import calculate_revenue_leak, revenue_context, INDUSTRY_BASELINES


# ── Category scorers ────────────────────────────────────────────

def score_gbp(gbp: dict) -> int:
    s = 0
    if not gbp.get("ok"):
        return 0
    if gbp.get("claimed"):
        s += 30
        rating = gbp.get("rating") or 0
        if rating >= 4.5:  s += 20
        elif rating >= 4.0: s += 15
        elif rating >= 3.0: s += 8
        reviews = gbp.get("review_count") or 0
        if reviews >= 50:  s += 20
        elif reviews >= 20: s += 15
        elif reviews >= 10: s += 10
        elif reviews >= 5:  s += 5
        photos = gbp.get("photos_count") or 0
        if photos >= 20:   s += 15
        elif photos >= 10: s += 10
        elif photos >= 3:  s += 5
        if gbp.get("hours_set"):    s += 10
        if gbp.get("website_matches"): s += 5
    return min(s, 100)


def score_pagespeed(ps: dict) -> int:
    if not ps.get("ok"):
        return 50  # Neutral fallback — don't punish for API unavailability
    return ps.get("performance", 50)


def score_site_health(scrape: dict, ssl: dict) -> int:
    s = 0
    if ssl.get("has_https"):    s += 20
    title_len = scrape.get("title_len", 0)
    if 10 < title_len <= 65:    s += 15
    elif title_len > 0:         s += 7
    desc_len = scrape.get("meta_desc_len", 0)
    if 50 < desc_len <= 160:    s += 15
    elif desc_len > 0:          s += 6
    if not scrape.get("noindex"):   s += 10
    if scrape.get("canonical_self"): s += 5
    if scrape.get("og_complete"):   s += 15
    elif scrape.get("og_title"):    s += 6
    if scrape.get("schema_json"):   s += 15
    if scrape.get("robots_ok", True): s += 5  # from sitemap check
    return min(s, 100)


def score_local_signals(scrape: dict, gbp: dict) -> int:
    s = 0
    if scrape.get("has_phone"):       s += 20
    if scrape.get("has_address"):     s += 20
    if scrape.get("has_maps_embed"):  s += 10
    if scrape.get("keyword_in_title"): s += 20
    if scrape.get("keyword_in_h1"):   s += 15
    if scrape.get("keyword_in_meta"): s += 10
    if scrape.get("city_mentioned"):  s += 5
    return min(s, 100)


def score_content(scrape: dict) -> int:
    s = 0
    h1 = scrape.get("h1_count", 0)
    if h1 == 1:                 s += 20
    elif h1 > 1:                s += 8
    wc = scrape.get("word_count", 0)
    if wc >= 600:               s += 25
    elif wc >= 300:             s += 15
    elif wc >= 100:             s += 5
    alt_pct = scrape.get("alt_missing_pct", 100)
    if alt_pct <= 10:           s += 20
    elif alt_pct <= 40:         s += 10
    il = scrape.get("internal_links", 0)
    if il >= 10:                s += 15
    elif il >= 5:               s += 8
    if scrape.get("has_analytics"): s += 20
    return min(s, 100)


def score_trust(ssl: dict, safe: dict, scrape: dict) -> int:
    s = 0
    if ssl.get("cert_valid"):       s += 35
    elif ssl.get("has_https"):      s += 20
    days = ssl.get("cert_days_remaining") or 0
    if days > 60:                   s += 15
    if safe.get("is_safe", True):   s += 35
    if scrape.get("has_privacy_link"): s += 15
    return min(s, 100)


# ── Issue detection ─────────────────────────────────────────────

ISSUE_DEFS = [
    {
        "id": "gbp_unclaimed",
        "title": "Google Business Profile Not Found",
        "plain_english": "Your business doesn't appear in Google Maps. When someone searches for your service nearby, you're invisible.",
        "impact": "critical", "revenue_pct": 0.40, "cta_type": "consult",
        "check": lambda d: not d["gbp"].get("claimed"),
    },
    {
        "id": "gbp_incomplete",
        "title": "Google Business Profile Is Incomplete",
        "plain_english": "Your GBP is claimed but missing photos, hours, or reviews. Incomplete profiles get 7x fewer clicks than complete ones.",
        "impact": "high", "revenue_pct": 0.25, "cta_type": "quickfix",
        "check": lambda d: d["gbp"].get("claimed") and (
            (d["gbp"].get("photos_count") or 0) < 5
            or not d["gbp"].get("hours_set")
            or (d["gbp"].get("review_count") or 0) < 5
        ),
    },
    {
        "id": "no_city_keyword",
        "title": "City Not in Title Tag",
        "plain_english": "Your page title doesn't mention your city. Google literally doesn't know where you operate.",
        "impact": "critical", "revenue_pct": 0.15, "cta_type": "quickfix",
        "check": lambda d: not d["scrape"].get("keyword_in_title"),
    },
    {
        "id": "slow_page_speed",
        "title": "Page Speed Critical — Visitors Are Leaving",
        "plain_english": "Your site takes too long to load on mobile. 53% of visitors leave before they see your business.",
        "impact": "critical", "revenue_pct": 0.20, "cta_type": "consult",
        "check": lambda d: d["pagespeed"].get("ok") and d["pagespeed"].get("performance", 100) < 50,
    },
    {
        "id": "medium_page_speed",
        "title": "Page Speed Below Google Threshold",
        "plain_english": "Google's threshold for 'good' is 90+. Slower sites rank below competitors who have optimized.",
        "impact": "high", "revenue_pct": 0.12, "cta_type": "consult",
        "check": lambda d: d["pagespeed"].get("ok") and 50 <= d["pagespeed"].get("performance", 100) < 75,
    },
    {
        "id": "no_schema",
        "title": "No Structured Data (Schema Markup)",
        "plain_english": "Google can't automatically identify your business type, hours, or service area from your site code.",
        "impact": "high", "revenue_pct": 0.10, "cta_type": "quickfix",
        "check": lambda d: not d["scrape"].get("schema_json"),
    },
    {
        "id": "no_ssl",
        "title": "Site Not Secure — No HTTPS",
        "plain_english": "Visitors see a 'Not Secure' warning in their browser. Google actively demotes HTTP sites.",
        "impact": "critical", "revenue_pct": 0.15, "cta_type": "consult",
        "check": lambda d: not d["ssl"].get("has_https"),
    },
    {
        "id": "no_sitemap",
        "title": "No XML Sitemap",
        "plain_english": "Google has no roadmap of your pages. New content may take weeks to get indexed — or never.",
        "impact": "high", "revenue_pct": 0.08, "cta_type": "quickfix",
        "check": lambda d: not d["sitemap"].get("sitemap_found"),
    },
    {
        "id": "no_h1",
        "title": "No H1 Heading",
        "plain_english": "Your homepage has no primary headline. Google doesn't know what your page is about.",
        "impact": "high", "revenue_pct": 0.08, "cta_type": "quickfix",
        "check": lambda d: d["scrape"].get("h1_count", 0) == 0,
    },
    {
        "id": "no_og_tags",
        "title": "No Social Sharing Tags",
        "plain_english": "When someone shares your link, it shows as a broken URL with no image or description.",
        "impact": "medium", "revenue_pct": 0.05, "cta_type": "quickfix",
        "check": lambda d: not d["scrape"].get("og_complete"),
    },
    {
        "id": "no_backlinks",
        "title": "Zero Backlinks Detected",
        "plain_english": "No other websites link to yours. Google uses links as trust signals — zero means low authority.",
        "impact": "high", "revenue_pct": 0.12, "cta_type": "consult",
        "check": lambda d: not d["backlinks"].get("has_backlinks"),
    },
    {
        "id": "no_reviews",
        "title": "No Google Reviews",
        "plain_english": "93% of buyers read reviews before choosing a local business. You have none to show them.",
        "impact": "critical", "revenue_pct": 0.20, "cta_type": "consult",
        "check": lambda d: d["gbp"].get("claimed") and (d["gbp"].get("review_count") or 0) == 0,
    },
    {
        "id": "no_nap",
        "title": "Phone or Address Missing",
        "plain_english": "Google verifies local businesses using Name, Address, and Phone. Missing any one of them suppresses your ranking.",
        "impact": "critical", "revenue_pct": 0.18, "cta_type": "consult",
        "check": lambda d: not d["scrape"].get("has_phone") or not d["scrape"].get("has_address"),
    },
    {
        "id": "no_analytics",
        "title": "No Analytics Installed",
        "plain_english": "Without tracking, you have no idea who's visiting, where they come from, or whether any fix is working.",
        "impact": "high", "revenue_pct": 0.06, "cta_type": "quickfix",
        "check": lambda d: not d["scrape"].get("has_analytics"),
    },
    {
        "id": "thin_content",
        "title": "Thin Content — Not Enough for Google to Trust You",
        "plain_english": "Your homepage doesn't have enough written content. Thin pages rank below competitors with substantive information.",
        "impact": "medium", "revenue_pct": 0.08, "cta_type": "consult",
        "check": lambda d: d["scrape"].get("ok") and d["scrape"].get("word_count", 300) < 200,
    },
]

IMPACT_ORDER = {"critical": 0, "high": 1, "medium": 2}


def detect_issues(check_data: dict, revenue_leak: int) -> List[dict]:
    issues = []
    for defn in ISSUE_DEFS:
        try:
            triggered = defn["check"](check_data)
        except Exception:
            triggered = False
        if triggered:
            revenue_impact = round(revenue_leak * defn["revenue_pct"] / 100) * 100
            issues.append({
                "id": defn["id"],
                "title": defn["title"],
                "plain_english": defn["plain_english"],
                "impact": defn["impact"],
                "revenue_impact_monthly": revenue_impact,
                "cta_type": defn["cta_type"],
            })
    issues.sort(key=lambda x: (IMPACT_ORDER.get(x["impact"], 3), -x["revenue_impact_monthly"]))
    return issues[:10]


# ── Roadmap generator ───────────────────────────────────────────

def generate_roadmap(issues: List[dict], business_type: str, city: str) -> dict:
    quickfix = [i for i in issues if i["cta_type"] == "quickfix"]
    consult  = [i for i in issues if i["cta_type"] == "consult"]
    b = INDUSTRY_BASELINES.get(business_type.lower(), INDUSTRY_BASELINES["default"])

    day30 = (
        [f"Fix: {i['title']}" for i in quickfix[:3]]
        or [f"Audit and prioritize your top 3 issues in {city}"]
    )
    day30.insert(0, "Start here: claim/optimize your Google Business Profile")

    day60 = [
        f"Address: {i['title']}" for i in consult[:2]
    ] + ["Build or optimize one city-specific service page for " + city]

    day90 = [
        "Launch a local review generation campaign (target: 10+ reviews)",
        f"Build 3-5 backlinks from {city} directories and local sites",
        "Set up monthly performance tracking — rankings, calls, website traffic",
    ]

    return {"day_30": day30, "day_60": day60, "day_90": day90}


# ── Main scoring function ───────────────────────────────────────

async def calculate_full_score(
    check_data: dict,
    business_type: str,
    city: str,
    percentile_fn=None,
) -> dict:
    ssl     = check_data.get("ssl", {})
    scrape  = check_data.get("scrape", {})
    ps      = check_data.get("pagespeed", {})
    gbp     = check_data.get("gbp", {})
    safe    = check_data.get("safe_browsing", {})
    sitemap = check_data.get("sitemap", {})

    # Inject sitemap data into scrape for site_health scoring
    scrape["robots_ok"] = sitemap.get("robots_ok", True)

    gbp_s    = score_gbp(gbp)
    speed_s  = score_pagespeed(ps)
    health_s = score_site_health(scrape, ssl)
    local_s  = score_local_signals(scrape, gbp)
    content_s = score_content(scrape)
    trust_s  = score_trust(ssl, safe, scrape)

    weights = get_weights(business_type)
    total = (
        gbp_s     * weights["gbp"]
        + speed_s  * weights["pagespeed"]
        + health_s * weights["site_health"]
        + local_s  * weights["local_signals"]
        + content_s * weights["content"]
        + trust_s  * weights["trust"]
    )
    total = max(0, min(100, round(total)))

    # Confidence score — how many checks returned real data
    checks_ok = sum([
        ssl.get("ok", False),
        scrape.get("ok", False),
        ps.get("ok", False),
        gbp.get("ok", False),
        safe.get("ok", False),
        sitemap.get("ok", False),
    ])
    confidence = round(checks_ok / 6 * 100)

    # Grade
    if total >= 85:   grade = "A"
    elif total >= 70: grade = "B"
    elif total >= 55: grade = "C"
    elif total >= 40: grade = "D"
    else:             grade = "F"

    grade_labels = {"A": "Best in Show", "B": "Solid Foundation", "C": "Needs Work", "D": "Needs Training", "F": "Off the Leash"}

    # Revenue leak
    revenue_leak = calculate_revenue_leak(total, business_type)

    # Percentile
    percentile = 30  # default
    if percentile_fn:
        try:
            percentile = await percentile_fn(business_type, city, total)
        except Exception:
            pass

    # Issues
    issues = detect_issues(check_data, revenue_leak)
    biggest_bottleneck = issues[0] if issues else None

    # Segment
    if total < 40:   segment = "urgent"
    elif total < 70: segment = "education"
    else:            segment = "optimization"

    # Industry label for percentile string
    label = get_industry_label(business_type)

    # Roadmap
    roadmap = generate_roadmap(issues, business_type, city)

    # Category breakdown
    categories = [
        {"name": "Google Business Profile", "score": gbp_s,     "weight": weights["gbp"],           "status": _status(gbp_s),     "note": "Reviews, photos, hours, and claim status"},
        {"name": "Page Speed",              "score": speed_s,   "weight": weights["pagespeed"],      "status": _status(speed_s),   "note": "Core Web Vitals, mobile performance"},
        {"name": "Site Health",             "score": health_s,  "weight": weights["site_health"],    "status": _status(health_s),  "note": "HTTPS, titles, meta, schema, canonical"},
        {"name": "Local Signals",           "score": local_s,   "weight": weights["local_signals"],  "status": _status(local_s),   "note": "Phone, address, city keyword presence"},
        {"name": "Content Quality",         "score": content_s, "weight": weights["content"],        "status": _status(content_s), "note": "H1, word count, images, analytics"},
        {"name": "Trust & Security",        "score": trust_s,   "weight": weights["trust"],          "status": _status(trust_s),   "note": "SSL, Safe Browsing, privacy policy"},
    ]

    return {
        "total_score": total,
        "grade": grade,
        "grade_label": grade_labels[grade],
        "confidence_score": confidence,
        "percentile_rank": percentile,
        "percentile_string": f"Better than {percentile}% of {label} in {city}",
        "revenue_leak_monthly": revenue_leak,
        "revenue_context": revenue_context(total, business_type, city),
        "segment": segment,
        "categories": categories,
        "issues": issues,
        "biggest_bottleneck": biggest_bottleneck,
        "roadmap": roadmap,
    }


def _status(score: int) -> str:
    if score >= 70: return "good"
    if score >= 45: return "warning"
    return "critical"
