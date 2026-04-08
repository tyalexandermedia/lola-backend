WEIGHTS = {
    "contractor": {
        "gbp": 0.30, "pagespeed": 0.15, "site_health": 0.20,
        "local_signals": 0.20, "content": 0.10, "trust": 0.05,
    },
    "restaurant": {
        "gbp": 0.35, "pagespeed": 0.10, "site_health": 0.15,
        "local_signals": 0.25, "content": 0.10, "trust": 0.05,
    },
    "medical": {
        "gbp": 0.25, "pagespeed": 0.10, "site_health": 0.20,
        "local_signals": 0.15, "content": 0.05, "trust": 0.25,
    },
    "salon": {
        "gbp": 0.30, "pagespeed": 0.15, "site_health": 0.15,
        "local_signals": 0.20, "content": 0.15, "trust": 0.05,
    },
    "retail": {
        "gbp": 0.25, "pagespeed": 0.20, "site_health": 0.20,
        "local_signals": 0.15, "content": 0.15, "trust": 0.05,
    },
    "default": {
        "gbp": 0.25, "pagespeed": 0.15, "site_health": 0.20,
        "local_signals": 0.20, "content": 0.15, "trust": 0.05,
    },
}

INDUSTRY_LABELS = {
    "contractor": "contractors",
    "restaurant": "restaurants",
    "medical": "medical practices",
    "salon": "salons & spas",
    "retail": "retail businesses",
    "default": "local businesses",
}

def get_weights(business_type: str) -> dict:
    return WEIGHTS.get(business_type.lower(), WEIGHTS["default"])

def get_industry_label(business_type: str) -> str:
    return INDUSTRY_LABELS.get(business_type.lower(), INDUSTRY_LABELS["default"])
