import httpx
from typing import Optional, List
from urllib.parse import urlparse

CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"


async def check_competitors(
    business_name: str,
    city: str,
    business_type: str,
    website: str = "",
    api_key: Optional[str] = None,
    cx: Optional[str] = None,
) -> dict:
    fallback = {"ok": False, "competitors": [], "business_in_results": False, "error": None}
    if not api_key or not cx:
        return {**fallback, "ok": True, "error": "No Custom Search API key/CX"}
    try:
        query = f"{business_type.replace('_', ' ')} in {city}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                CUSTOM_SEARCH_URL,
                params={"q": query, "key": api_key, "cx": cx, "num": 5},
            )
        if not r.is_success:
            return {**fallback, "ok": True, "error": f"HTTP {r.status_code}"}

        items = r.json().get("items", [])
        domain = urlparse(website).netloc.replace("www.", "") if website else ""

        competitors = []
        business_in_results = False
        for item in items[:3]:
            item_domain = urlparse(item.get("link", "")).netloc.replace("www.", "")
            if domain and domain == item_domain:
                business_in_results = True
                continue
            competitors.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "domain": item_domain,
            })

        return {
            "ok": True,
            "competitors": competitors[:3],
            "business_in_results": business_in_results,
            "query": query,
            "error": None,
        }
    except Exception as e:
        return {**fallback, "ok": True, "error": str(e)}
