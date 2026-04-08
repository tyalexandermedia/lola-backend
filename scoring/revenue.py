INDUSTRY_BASELINES = {
    "contractor":  {"monthly_searches": 450,  "avg_deal": 2800, "conversion": 0.08, "page1_calls": 22},
    "restaurant":  {"monthly_searches": 1200, "avg_deal": 45,   "conversion": 0.15, "page1_calls": 85},
    "salon":       {"monthly_searches": 380,  "avg_deal": 120,  "conversion": 0.12, "page1_calls": 28},
    "medical":     {"monthly_searches": 280,  "avg_deal": 350,  "conversion": 0.10, "page1_calls": 18},
    "retail":      {"monthly_searches": 500,  "avg_deal": 85,   "conversion": 0.10, "page1_calls": 32},
    "default":     {"monthly_searches": 300,  "avg_deal": 500,  "conversion": 0.08, "page1_calls": 18},
}

MISSED_PCT = {
    (0,  40):  0.85,
    (40, 55):  0.65,
    (55, 70):  0.40,
    (70, 85):  0.20,
    (85, 101): 0.05,
}


def calculate_revenue_leak(score: int, business_type: str) -> int:
    b = INDUSTRY_BASELINES.get(business_type.lower(), INDUSTRY_BASELINES["default"])
    missed_pct = 0.50  # default
    for (lo, hi), pct in MISSED_PCT.items():
        if lo <= score < hi:
            missed_pct = pct
            break
    monthly_missed_calls = b["page1_calls"] * missed_pct
    monthly_leak = monthly_missed_calls * b["avg_deal"] * b["conversion"]
    return max(100, round(monthly_leak / 100) * 100)


def revenue_context(score: int, business_type: str, city: str) -> str:
    leak = calculate_revenue_leak(score, business_type)
    b = INDUSTRY_BASELINES.get(business_type.lower(), INDUSTRY_BASELINES["default"])
    if score < 40:
        return (
            f"At Grade F, you're missing an estimated {_pct_str(score)} of local searches in {city}. "
            f"That's approximately ${leak:,}/month in leads going to your competitors."
        )
    elif score < 70:
        return (
            f"There are gaps costing you an estimated ${leak:,}/month in missed leads in {city}."
        )
    else:
        return (
            f"You're capturing most local searches, but ${leak:,}/month is still slipping through the cracks."
        )


def _pct_str(score: int) -> str:
    for (lo, hi), pct in MISSED_PCT.items():
        if lo <= score < hi:
            return f"{int(pct * 100)}%"
    return "some"
