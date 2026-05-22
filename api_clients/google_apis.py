"""
Lola SEO — Google APIs client.

Centralizes the four outbound Google integrations behind one module with
consistent error handling, SQLite-backed caching, and live status tracking.

    pagespeed       → PageSpeed Insights v5
    places          → Places API (NEW v1 — places.googleapis.com/v1/places:searchText)
    safe_browsing   → Safe Browsing v4
    custom_search   → Custom Search v1

Every helper returns a dict with at least:
    { "ok": bool, ...other fields }

On success: ok=True plus the parsed data.
On failure: ok=False, plus a fallback shape so callers don't crash.

Per-API status (last_ok_at / last_error / last_error_at) is exposed via
`api_clients.google_apis.API_STATUS` for the /health endpoint to surface.
"""

import os
import traceback
from datetime import datetime
from typing import List, Optional

import httpx

from db.api_cache import cache_get, cache_set

# ── Keys ────────────────────────────────────────────────────

GOOGLE_PAGESPEED_KEY = os.getenv("GOOGLE_PAGESPEED_API_KEY", "").strip() or None
GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "").strip() or None
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "").strip() or None
GOOGLE_CUSTOM_SEARCH_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY", "").strip() or None
GOOGLE_CUSTOM_SEARCH_CX = os.getenv("GOOGLE_CUSTOM_SEARCH_CX", "").strip() or None

API_TIMEOUT = float(os.getenv("API_TIMEOUT", "8.0"))
# PSI legitimately takes 15-30s on real sites. Override separately so we
# don't have to bump the global timeout for Places/SafeBrowsing/CSE too.
PAGESPEED_TIMEOUT = float(os.getenv("PAGESPEED_TIMEOUT", "45.0"))


# ── Live status tracking ────────────────────────────────────

API_STATUS = {
    "pagespeed":     {"last_ok_at": None, "last_error": None, "last_error_at": None},
    "places":        {"last_ok_at": None, "last_error": None, "last_error_at": None},
    "safe_browsing": {"last_ok_at": None, "last_error": None, "last_error_at": None},
    "custom_search": {"last_ok_at": None, "last_error": None, "last_error_at": None},
}


def _record_api(service: str, ok: bool, error: Optional[str] = None):
    now = datetime.now().isoformat()
    s = API_STATUS.setdefault(
        service, {"last_ok_at": None, "last_error": None, "last_error_at": None}
    )
    if ok:
        s["last_ok_at"] = now
        s["last_error"] = None
        s["last_error_at"] = None
    else:
        s["last_error"] = (error or "unknown")[:200]
        s["last_error_at"] = now


# ── Per-audit API budget ────────────────────────────────────


class ApiBudget:
    """Per-audit cap on outbound calls. Set high enough for one audit run."""

    def __init__(self, cap: int):
        self.cap = cap
        self.used = 0

    def can_spend(self, n: int = 1) -> bool:
        return self.used + n <= self.cap

    def spend(self, n: int = 1):
        self.used += n


# ── PageSpeed ───────────────────────────────────────────────


async def get_page_speed(
    client: httpx.AsyncClient, website: str, budget: ApiBudget
) -> dict:
    fallback = {"ok": False, "performance": 50, "accessibility": 50, "seo": 50}
    if not GOOGLE_PAGESPEED_KEY or not budget.can_spend(1):
        return fallback

    cache_params = {"website": website, "strategy": "mobile"}
    cached = await cache_get("pagespeed", cache_params)
    if cached:
        return cached

    try:
        params = [
            ("url", website),
            ("key", GOOGLE_PAGESPEED_KEY),
            ("strategy", "mobile"),
            ("category", "performance"),
            ("category", "accessibility"),
            ("category", "seo"),
        ]
        budget.spend(1)
        resp = await client.get(
            "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
            params=params,
            timeout=PAGESPEED_TIMEOUT,
        )
        if resp.status_code != 200:
            msg = f"HTTP {resp.status_code}: {resp.text[:160]}"
            _record_api("pagespeed", False, msg)
            return fallback
        body = resp.json()
        if "error" in body or "lighthouseResult" not in body:
            err = body.get("error", {}).get("message") or "no lighthouseResult"
            _record_api("pagespeed", False, err)
            return fallback
        cats = body["lighthouseResult"].get("categories", {})
        result = {
            "ok": True,
            "performance": int((cats.get("performance", {}).get("score") or 0.5) * 100),
            "accessibility": int((cats.get("accessibility", {}).get("score") or 0.5) * 100),
            "seo": int((cats.get("seo", {}).get("score") or 0.5) * 100),
        }
        _record_api("pagespeed", True)
        await cache_set("pagespeed", cache_params, result)
        return result
    except Exception as e:
        print(f"PageSpeed error: {e}")
        _record_api("pagespeed", False, str(e))
        return fallback


# ── Safe Browsing ───────────────────────────────────────────


async def get_safe_browsing(
    client: httpx.AsyncClient, website: str, budget: ApiBudget
) -> dict:
    fallback = {"ok": False, "is_safe": True}
    if not GOOGLE_SAFE_BROWSING_KEY or not budget.can_spend(1):
        return fallback

    cache_params = {"website": website}
    cached = await cache_get("safebrowsing", cache_params)
    if cached:
        return cached

    try:
        payload = {
            "client": {"clientId": "lola-seo", "clientVersion": "4.0"},
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION",
                ],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": website}],
            },
        }
        budget.spend(1)
        resp = await client.post(
            "https://safebrowsing.googleapis.com/v4/threatMatches:find",
            json=payload,
            params={"key": GOOGLE_SAFE_BROWSING_KEY},
            timeout=API_TIMEOUT,
        )
        if resp.status_code != 200:
            msg = f"HTTP {resp.status_code}: {resp.text[:160]}"
            _record_api("safe_browsing", False, msg)
            return fallback
        body = resp.json()
        if "error" in body:
            err = body.get("error", {}).get("message", "")
            _record_api("safe_browsing", False, err)
            return fallback
        result = {"ok": True, "is_safe": len(body.get("matches", [])) == 0}
        _record_api("safe_browsing", True)
        await cache_set("safebrowsing", cache_params, result)
        return result
    except Exception as e:
        print(f"Safe Browsing error: {e}")
        _record_api("safe_browsing", False, str(e))
        return fallback


# ── Places (NEW API v1) ─────────────────────────────────────


PLACES_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.regularOpeningHours",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.googleMapsUri",
        "places.types",
        "places.primaryType",
        "places.photos",
        "places.reviews",
    ]
)


def _blank_business_info(business_name: str, place_id: Optional[str] = None) -> dict:
    return {
        "ok": False,
        "name": business_name,
        "address": "",
        "phone": "",
        "website": "",
        "rating": 0,
        "review_count": 0,
        "business_status": None,
        "place_id": place_id,
        "place_url": None,
        "verified": None,
        "verification_confidence": "low",
    }


async def get_business_info(
    client: httpx.AsyncClient,
    business_name: str,
    city: str,
    budget: ApiBudget,
) -> dict:
    """
    Single-call lookup against the NEW Places API. Replaces the deprecated
    legacy findplacefromtext + details two-call sequence.
    """
    if not GOOGLE_PLACES_KEY or not budget.can_spend(1):
        return _blank_business_info(business_name)

    cache_params = {"name": business_name, "city": city}
    cached = await cache_get("places", cache_params)
    if cached:
        return cached

    try:
        budget.spend(1)
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json={"textQuery": f"{business_name} {city}"},
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
                "X-Goog-FieldMask": PLACES_FIELD_MASK,
            },
            timeout=API_TIMEOUT,
        )
        if resp.status_code != 200:
            err = f"HTTP {resp.status_code}: {resp.text[:160]}"
            _record_api("places", False, err)
            return _blank_business_info(business_name)

        body = resp.json()
        if "error" in body:
            err = body.get("error", {}).get("message", "")
            _record_api("places", False, err)
            return _blank_business_info(business_name)

        places = body.get("places") or []
        if not places:
            _record_api("places", True)
            return _blank_business_info(business_name)

        p = places[0]
        review_count = p.get("userRatingCount", 0)
        signals = sum(
            [
                bool(p.get("websiteUri")),
                bool(p.get("regularOpeningHours")),
                len(p.get("photos") or []) > 0,
                review_count > 0,
                bool(p.get("formattedAddress")),
                bool(p.get("nationalPhoneNumber")),
            ]
        )
        confidence = "high" if signals >= 5 else "medium" if signals >= 3 else "low"

        result = {
            "ok": True,
            "name": (p.get("displayName") or {}).get("text") or business_name,
            "address": p.get("formattedAddress", ""),
            "phone": p.get("nationalPhoneNumber", ""),
            "website": p.get("websiteUri", ""),
            "rating": p.get("rating", 0),
            "review_count": review_count,
            "business_status": p.get("businessStatus"),
            "place_id": p.get("id"),
            "place_url": p.get("googleMapsUri"),
            "verified": None,
            "verification_confidence": confidence,
            "primary_category": p.get("primaryType"),
            "all_categories": p.get("types", []),
            "has_hours": bool(p.get("regularOpeningHours")),
            "photo_count": len(p.get("photos") or []),
            "recent_reviews": [
                {
                    "rating": r.get("rating"),
                    "text": ((r.get("text") or {}).get("text") or "")[:300],
                    "author": (r.get("authorAttribution") or {}).get("displayName"),
                    "time": r.get("publishTime"),
                }
                for r in (p.get("reviews") or [])[:5]
            ],
        }
        _record_api("places", True)
        await cache_set("places", cache_params, result)
        return result
    except Exception as e:
        print(f"Places error: {e}")
        traceback.print_exc()
        _record_api("places", False, str(e))
        return _blank_business_info(business_name)


# ── Custom Search ───────────────────────────────────────────


async def get_competitors(
    client: httpx.AsyncClient,
    business_type: str,
    city: str,
    budget: ApiBudget,
) -> List[dict]:
    if not GOOGLE_CUSTOM_SEARCH_KEY or not GOOGLE_CUSTOM_SEARCH_CX:
        return []
    if not budget.can_spend(1):
        return []

    keywords = {
        "soft wash": f"soft wash {city}",
        "roofing": f"roofing {city}",
        "hvac": f"HVAC {city}",
        "plumbing": f"plumber {city}",
        "pest": f"pest control {city}",
        "landscaping": f"landscaping {city}",
    }
    keyword = keywords.get(business_type.lower(), f"{business_type} {city}")

    cache_params = {"q": keyword}
    cached = await cache_get("custom_search", cache_params)
    if cached:
        return cached  # type: ignore[return-value]

    try:
        budget.spend(1)
        resp = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "q": keyword,
                "key": GOOGLE_CUSTOM_SEARCH_KEY,
                "cx": GOOGLE_CUSTOM_SEARCH_CX,
                "num": 5,
            },
            timeout=API_TIMEOUT,
        )
        if resp.status_code != 200:
            msg = f"HTTP {resp.status_code}: {resp.text[:160]}"
            _record_api("custom_search", False, msg)
            return []
        body = resp.json()
        if "error" in body:
            err = body.get("error", {}).get("message", "")
            _record_api("custom_search", False, err)
            return []
        _record_api("custom_search", True)
        result = [
            {
                "rank": i,
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
            }
            for i, item in enumerate(body.get("items", [])[:5], 1)
        ]
        await cache_set("custom_search", cache_params, result)
        return result
    except Exception as e:
        print(f"Competitors error: {e}")
        _record_api("custom_search", False, str(e))
        return []
