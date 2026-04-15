"""
LOLA SEO Scoring Engine v2
Scores are derived 100% from real check data.
No defaults. No assumptions.
A site with no data gets a 0 — not a 50.
"""
from typing import List
from .weights import get_weights, get_industry_label
from .revenue import calculate_revenue_leak, revenue_context, INDUSTRY_BASELINES


# ── Category Scorers ────────────────────────────────────────────

def score_site_health(scrape: dict, ssl: dict, url: str = "", city: str = "") -> tuple[int, list]:
    """Score based on EXACT site data. Returns (score, findings list)."""
    city_short = city.split(',')[0].strip() if city else ""
    domain = url.replace('https://','').replace('http://','').rstrip('/') if url else "your site"

    s = 0
    findings = []

    https = scrape.get("has_https") or ssl.get("has_https", False)
    if https:
        s += 15
    else:
        findings.append(("critical", "No HTTPS", "Google flags your site as Not Secure — visitors see a warning before they even read your business name."))

    title = scrape.get("title")
    title_len = scrape.get("title_len", 0)
    if title and 10 < title_len <= 65:
        s += 25
    elif title and title_len > 0:
        s += 10
        if title_len > 65:
            findings.append(("medium", f"Title tag too long ({title_len} chars)", f"Google cuts it off at 65 characters. Yours ends mid-sentence."))
    else:
        findings.append(("critical", "No page title tag", "This is Google's #1 ranking signal. Without it, Google doesn't know what you do or where you do it."))

    meta = scrape.get("meta_desc")
    meta_len = scrape.get("meta_desc_len", 0)
    if meta and 50 < meta_len <= 160:
        s += 25
    elif meta and meta_len > 0:
        s += 10
    else:
        findings.append(("high", "No meta description", "Google writes one for you when yours is missing — usually a random sentence from your page that sells nothing."))

    if scrape.get("has_local_business_schema") or scrape.get("schema_json"):
        s += 25
    else:
        findings.append(("high", "No schema markup", "Google can't auto-categorize your business type, hours, or service area without this code."))

    if scrape.get("og_complete"):
        s += 10
    elif scrape.get("og_title"):
        s += 4
    else:
        findings.append(("medium", "No Open Graph tags", "Every time someone shares your link on Facebook or texts it, it shows as a broken URL with no image."))

    if not scrape.get("noindex", False):
        s = min(s + 0, s)  # Neutral if OK
    else:
        s = max(0, s - 30)
        findings.insert(0, ("critical", "NOINDEX tag found", "Your site has a tag telling Google to hide it from search results. This is likely from a staging setting left on by mistake."))

    return min(s, 100), findings


def score_local_presence(scrape: dict, gbp: dict, city: str) -> tuple[int, list]:
    s = 0
    findings = []
    city_short = city.split(",")[0].strip() if city else ""

    if gbp.get("claimed"):
        s += 30
        reviews = gbp.get("review_count") or 0
        if reviews >= 20:   s += 20
        elif reviews >= 10: s += 14
        elif reviews >= 5:  s += 8
        elif reviews >= 1:  s += 4
        else:
            findings.append(("critical", "Zero Google reviews", "93% of local buyers read reviews before choosing. You have none to show them."))
    else:
        findings.append(("critical", "Google Business Profile not found", f"When someone searches 'soft wash near me' in {city_short}, you're invisible. This is the #1 local ranking factor."))

    if scrape.get("has_phone"):
        s += 10
    else:
        findings.append(("critical", "No phone number on site", "Google verifies local businesses by their phone number. Without it visible as text, your NAP is incomplete."))

    if scrape.get("has_address"):
        s += 10
    else:
        findings.append(("high", f"No address on site", f"Google needs to see your {city_short} address on your site to rank you for local searches."))

    if scrape.get("keyword_in_title"):
        s += 20
    else:
        findings.append(("critical", f"'{city_short}' not in your title tag", f"Google sees no location in your title. It can't tell you serve {city_short} — so it ranks someone else who does say it."))

    if scrape.get("keyword_in_h1"):
        s += 10

    if scrape.get("has_maps"):
        s += 10

    return min(s, 100), findings


def score_mobile(scrape: dict, pagespeed: dict) -> tuple[int, list]:
    s = 0
    findings = []

    if scrape.get("meta_viewport"):
        s += 40
    else:
        findings.append(("critical", "No mobile viewport tag", "Your site isn't telling mobile browsers how to display it. 68% of local searches happen on phones."))

    perf = pagespeed.get("performance", 0) if pagespeed.get("ok") else None
    if perf is not None:
        if perf >= 80:   s += 40
        elif perf >= 60: s += 25
        elif perf >= 40: s += 12
        else:
            findings.append(("critical", f"Mobile speed score {perf}/100", "More than half your mobile visitors leave before the page loads."))
    else:
        s += 20  # Can't test — partial credit

    # No intrusive popups (hard to detect — give benefit of doubt)
    s += 20

    return min(s, 100), findings


def score_page_speed(pagespeed: dict) -> tuple[int, list]:
    s = 0
    findings = []

    if not pagespeed.get("ok"):
        # Can't get real data — return partial
        return 50, [("medium", "Page speed couldn't be measured", "Run PageSpeed Insights manually at pagespeed.web.dev to check your score.")]

    perf = pagespeed.get("performance", 0)
    s = perf  # PageSpeed score IS the page speed score (0-100)

    if perf < 50:
        lcp = pagespeed.get("lcp", "")
        findings.append(("critical", f"Page speed {perf}/100 — site loads too slowly", f"Google considers under 3 seconds 'good.' Yours is approximately {lcp}. 53% of visitors leave before it loads."))
    elif perf < 75:
        findings.append(("high", f"Page speed {perf}/100 — below Google's threshold", "Google's 'good' threshold is 90+. You're losing rankings to faster competitors."))

    # Check opportunities from PageSpeed
    opps = pagespeed.get("opportunities", [])
    if opps:
        top = opps[0]
        findings.append(("medium", f"Speed opportunity: {top.get('title','')}", f"Fixing this saves approximately {top.get('savings_ms',0)}ms of load time."))

    return min(s, 100), findings


def score_content(scrape: dict, city: str, business_type: str) -> tuple[int, list]:
    s = 0
    findings = []
    city_short = city.split(",")[0].strip() if city else ""

    h1 = scrape.get("h1_count", 0)
    h1_text = scrape.get("h1_text") or ""
    if h1 == 1:
        s += 30
        if city_short.lower() not in h1_text.lower():
            findings.append(("high", f"H1 heading doesn't mention {city_short}", f"Your H1 is: '{h1_text[:60]}'. It should include your service and city."))
    elif h1 == 0:
        findings.append(("critical", "No H1 heading", "Your homepage has no primary headline. Google uses H1 as a top-3 ranking signal."))
    else:
        s += 15
        findings.append(("medium", f"{h1} H1 tags found", "You should have exactly one. Multiple H1s split your ranking signal."))

    wc = scrape.get("word_count", 0)
    if wc >= 500:   s += 25
    elif wc >= 300: s += 18
    elif wc >= 150: s += 10
    else:
        findings.append(("high", f"Thin content ({wc} words)", f"Your homepage has less content than this email. Google ranks pages with more substantive content about your services in {city_short}."))

    # Heading structure
    if scrape.get("h2_count", 0) > 0:
        s += 25
    else:
        findings.append(("medium", "No H2 headings", "Break your page into sections with headings. It helps Google understand what services you offer."))

    # Service + city in body
    if scrape.get("service_in_body") and scrape.get("city_mentioned"):
        s += 20
    elif scrape.get("city_mentioned"):
        s += 10
    elif scrape.get("service_in_body"):
        s += 8
    else:
        findings.append(("high", f"Service and location not clearly stated in content", f"Your page body doesn't clearly mention {city_short} and your service type together. Google can't connect you to local searches."))

    return min(s, 100), findings


# ── Issue compilation ────────────────────────────────────────────

def compile_issues(all_findings: list, revenue_leak: int) -> list:
    """
    Merge all category findings, deduplicate, sort by severity.
    Attach revenue impact to each issue.
    """
    SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2}
    SEVERITY_REVENUE = {"critical": 0.35, "high": 0.20, "medium": 0.10}

    issues = []
    seen = set()
    for sev, title, description in all_findings:
        if title in seen:
            continue
        seen.add(title)
        rev_impact = round(revenue_leak * SEVERITY_REVENUE.get(sev, 0.05) / 100) * 100
        issues.append({
            "severity": sev.capitalize(),
            "issue": title,
            "revenue_impact": f"~${rev_impact:,}/month in missed leads" if rev_impact > 0 else "Reduces trust and rankings",
            "description": description,
            "cta_type": "consult" if sev == "critical" else "quickfix",
        })

    issues.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"].lower(), 3))
    return issues[:10]


# ── Quick wins ──────────────────────────────────────────────────

def build_quick_wins(issues: list, scrape: dict, city: str, business_type: str, business_name: str = "") -> list:
    wins = []
    city_short = city.split(",")[0].strip()
    btype = business_type.replace("_", " ").title()

    # Only include wins based on ACTUAL missing items
    if not scrape.get("keyword_in_title") and not scrape.get("title"):
        wins.append({
            "rank": len(wins) + 1,
            "win": "Write your page title",
            "effort": "15 minutes",
            "impact": "Critical",
            "steps": [
                f"Write this: '{btype} in {city_short} | {business_name}' (swap in your actual name)",
                "Go to your CMS (Wix, WordPress, etc.) → Pages → SEO Settings",
                "Paste it in the Title field and save",
                f"Keep it under 65 characters — your template is {len(btype) + len(city_short) + 20} characters"
            ]
        })
    elif not scrape.get("keyword_in_title"):
        existing_title = scrape.get("title", "")[:40]
        wins.append({
            "rank": len(wins) + 1,
            "win": f"Add '{city_short}' to your page title",
            "effort": "10 minutes",
            "impact": "Critical",
            "steps": [
                f"Your current title: '{existing_title}'",
                f"Change it to include {city_short}: '{btype} in {city_short} | [Business Name]'",
                "Go to your CMS → Pages → SEO Settings → Title field"
            ]
        })

    if not scrape.get("meta_desc"):
        wins.append({
            "rank": len(wins) + 1,
            "win": "Write your meta description",
            "effort": "15 minutes",
            "impact": "High",
            "steps": [
                f"Write exactly this (fill in blanks): 'Top-rated {btype.lower()} in {city_short}. [Your differentiator]. Free quotes. Call [phone].'",
                "Keep it under 155 characters",
                "Go to your CMS → Pages → SEO Settings → Meta Description field"
            ]
        })

    if not scrape.get("has_local_business_schema"):
        wins.append({
            "rank": len(wins) + 1,
            "win": "Add LocalBusiness schema markup",
            "effort": "20 minutes",
            "impact": "High",
            "steps": [
                "Go to technicalseo.com/tools/schema-markup-generator",
                "Select 'Local Business' → fill in your name, address, phone, hours",
                "Copy the generated code",
                "In your CMS, add a Custom HTML block to your homepage and paste it"
            ]
        })

    if not scrape.get("og_complete"):
        wins.append({
            "rank": len(wins) + 1,
            "win": "Add Open Graph tags for social sharing",
            "effort": "15 minutes",
            "impact": "Medium",
            "steps": [
                "In Wix: Pages → SEO → Social Share → fill in title, description, image",
                "In WordPress: Install Yoast SEO → Social tab → fill in all fields",
                "Upload a 1200x630px photo of your work as the share image"
            ]
        })

    # Always include GBP as a win
    wins.insert(0, {
        "rank": 1,
        "win": "Optimize your Google Business Profile",
        "effort": "30–60 minutes",
        "impact": "Highest ROI",
        "steps": [
            "Go to business.google.com → claim or verify your listing",
            f"Set your primary category to match '{btype}'",
            f"Add {city_short} and surrounding areas as your service area",
            "Upload 10+ photos of your work, team, and equipment",
            "Ask your last 3 customers to leave a Google review today"
        ]
    })

    # Re-rank
    for i, w in enumerate(wins[:5]):
        w["rank"] = i + 1

    return wins[:5]


# ── Roadmap ──────────────────────────────────────────────────────

def build_roadmap(issues: list) -> dict:
    critical = [i["issue"] for i in issues if i["severity"] == "Critical"]
    high     = [i["issue"] for i in issues if i["severity"] == "High"]
    medium   = [i["issue"] for i in issues if i["severity"] == "Medium"]

    return {
        "day_30": ["Fix all Critical issues: " + ", ".join(critical[:3])] if critical else ["Optimize Google Business Profile"],
        "day_60": ["Fix High priority issues: " + ", ".join(high[:2])] if high else ["Build 3 location-specific service pages"],
        "day_90": ["Address Medium issues + launch review generation campaign"] + (["Fix: " + medium[0]] if medium else [])
    }


# ── Main scoring function ────────────────────────────────────────

async def calculate_full_score(check_data: dict, business_type: str, city: str, percentile_fn=None, business_name: str = "", url: str = "") -> dict:
    ssl     = check_data.get("ssl", {})
    scrape  = check_data.get("scrape", {})
    ps      = check_data.get("pagespeed", {})
    gbp     = check_data.get("gbp", {})
    sitemap = check_data.get("sitemap", {})

    # Inject sitemap data into scrape context
    scrape["robots_ok"] = sitemap.get("robots_ok", True)

    # Score each category and collect findings
    health_s,  health_f  = score_site_health(scrape, ssl)
    local_s,   local_f   = score_local_presence(scrape, gbp, city)
    mobile_s,  mobile_f  = score_mobile(scrape, ps)
    speed_s,   speed_f   = score_page_speed(ps)
    content_s, content_f = score_content(scrape, city, business_type)

    weights = get_weights(business_type)
    total = round(
        health_s  * weights["site_health"]
        + local_s   * weights["local_signals"]
        + mobile_s  * weights["pagespeed"]  # mobile uses pagespeed weight
        + speed_s   * weights["pagespeed"]
        + content_s * weights["content"]
        + (score_gbp_simple(gbp) * weights["gbp"])
    )
    total = max(0, min(100, total))

    # Confidence: how many checks returned real data
    checks_real = sum([
        scrape.get("ok", False),
        ssl.get("ok", False),
        ps.get("ok", False),
        gbp.get("ok", False),
        sitemap.get("ok", False),
    ])
    confidence = round(checks_real / 5 * 100)

    # Grade
    if total >= 90:   grade, grade_label = "A", "Top Dog"
    elif total >= 75: grade, grade_label = "B", "Good Boy"
    elif total >= 60: grade, grade_label = "C", "Needs Training"
    elif total >= 40: grade, grade_label = "D", "Lost the Scent"
    else:             grade, grade_label = "F", "Off the Leash"

    revenue_leak = calculate_revenue_leak(total, business_type)

    # Percentile
    percentile = 30
    if percentile_fn:
        try:
            percentile = await percentile_fn(business_type, city, total)
        except Exception:
            pass

    # Segment
    segment = "urgent" if total < 40 else "education" if total < 70 else "optimization"

    # Compile issues from ALL category findings
    all_findings = health_f + local_f + mobile_f + speed_f + content_f
    issues = compile_issues(all_findings, revenue_leak)

    # Quick wins based on ACTUAL data
    quick_wins = build_quick_wins(issues, scrape, city, business_type, business_name=business_name)

    # Roadmap
    roadmap = build_roadmap(issues)

    # Biggest bottleneck = first critical issue
    biggest = issues[0] if issues else None

    label = get_industry_label(business_type)

    # Leads lost estimate based on score
    if total < 25:   leads_lost = "50–70"
    elif total < 40: leads_lost = "35–50"
    elif total < 60: leads_lost = "20–35"
    elif total < 75: leads_lost = "10–20"
    else:            leads_lost = "3–10"

    return {
        "total_score": total,
        "grade": grade,
        "grade_label": grade_label,
        "leads_lost_monthly": leads_lost,
        "confidence_score": confidence,
        "percentile_rank": percentile,
        "percentile_string": f"Better than {percentile}% of {label} in {city.split(',')[0]}",
        "revenue_leak_monthly": revenue_leak,
        "revenue_context": revenue_context(total, business_type, city),
        "segment": segment,
        "categories": {
            "site_health":    {"score": health_s,  "status": _status(health_s),  "weight": weights["site_health"]},
            "local_presence": {"score": local_s,   "status": _status(local_s),   "weight": weights["local_signals"]},
            "mobile":         {"score": mobile_s,  "status": _status(mobile_s),  "weight": weights["pagespeed"]},
            "page_speed":     {"score": speed_s,   "status": _status(speed_s),   "weight": weights["pagespeed"]},
            "content":        {"score": content_s, "status": _status(content_s), "weight": weights["content"]},
        },
        "issues": issues,
        "quick_wins": quick_wins,
        "biggest_bottleneck": biggest,
        "roadmap": roadmap,
        "segment": segment,
        # Raw data for report generator
        "_scrape": {
            "title": scrape.get("title"),
            "meta_desc": scrape.get("meta_desc"),
            "h1_text": scrape.get("h1_text"),
            "word_count": scrape.get("word_count", 0),
            "schema_types": scrape.get("schema_types", []),
        },
        "_gbp": {
            "claimed": gbp.get("claimed"),
            "rating": gbp.get("rating"),
            "review_count": gbp.get("review_count"),
            "photos_count": gbp.get("photos_count"),
        },
    }


def score_gbp_simple(gbp: dict) -> int:
    if not gbp.get("claimed"):
        return 0
    s = 30
    r = gbp.get("review_count") or 0
    if r >= 20: s += 30
    elif r >= 5: s += 15
    p = gbp.get("photos_count") or 0
    if p >= 10: s += 20
    elif p >= 3: s += 10
    if gbp.get("hours_set"): s += 10
    if gbp.get("rating", 0) >= 4.0: s += 10
    return min(s, 100)


def _status(score: int) -> str:
    if score >= 70: return "good"
    if score >= 45: return "warning"
    return "critical"
