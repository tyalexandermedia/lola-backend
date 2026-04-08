import httpx
from typing import Optional

PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


async def check_pagespeed(url: str, api_key: Optional[str] = None) -> dict:
    fallback = {
        "ok": False, "performance": 50, "accessibility": 50, "seo": 50,
        "best_practices": 50, "lcp": "N/A", "fcp": "N/A", "cls": 0.0,
        "speed_index": "N/A", "tbt": "N/A", "is_mobile_ok": True,
        "opportunities": [], "error": None,
    }
    if not api_key:
        return {**fallback, "error": "No API key — using neutral fallback"}
    try:
        params = {"url": url, "strategy": "mobile", "key": api_key}
        # Add category params
        for cat in ["performance", "accessibility", "best-practices", "seo"]:
            params[f"category"] = cat  # API accepts repeated params; use list below

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                PAGESPEED_URL,
                params={
                    "url": url,
                    "strategy": "mobile",
                    "key": api_key,
                    "category": ["performance", "accessibility", "best-practices", "seo"],
                },
            )

        if resp.status_code == 429:
            return {**fallback, "error": "Rate limited — using neutral fallback"}
        if not resp.is_success:
            return {**fallback, "error": f"HTTP {resp.status_code}"}

        data = resp.json()
        cats  = data.get("lighthouseResult", {}).get("categories", {})
        audits = data.get("lighthouseResult", {}).get("audits", {})

        def score(key: str) -> int:
            v = cats.get(key, {}).get("score")
            return round((v or 0) * 100)

        def metric(key: str) -> str:
            a = audits.get(key, {})
            return a.get("displayValue", "N/A")

        def metric_num(key: str) -> float:
            a = audits.get(key, {})
            return a.get("numericValue", 0.0)

        # Top opportunities
        ops = []
        for k, a in audits.items():
            if a.get("details", {}).get("type") == "opportunity":
                savings = a.get("details", {}).get("overallSavingsMs", 0)
                if savings > 200:
                    ops.append({"title": a.get("title", k), "savings_ms": int(savings)})
        ops.sort(key=lambda x: x["savings_ms"], reverse=True)

        return {
            "ok": True,
            "performance": score("performance"),
            "accessibility": score("accessibility"),
            "seo": score("seo"),
            "best_practices": score("best-practices"),
            "lcp": metric("largest-contentful-paint"),
            "fcp": metric("first-contentful-paint"),
            "cls": round(metric_num("cumulative-layout-shift"), 3),
            "speed_index": metric("speed-index"),
            "tbt": metric("total-blocking-time"),
            "is_mobile_ok": score("performance") >= 50,
            "opportunities": ops[:5],
            "error": None,
        }
    except Exception as e:
        return {**fallback, "error": str(e)}
