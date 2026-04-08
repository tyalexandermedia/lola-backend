import httpx
from typing import Optional

PLACES_TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS    = "https://maps.googleapis.com/maps/api/place/details/json"


async def check_gbp(business_name: str, city: str, website: str = "", api_key: Optional[str] = None) -> dict:
    fallback = {
        "ok": False, "claimed": False, "place_id": None, "name": None,
        "rating": None, "review_count": None, "photos_count": None,
        "hours_set": None, "website_matches": None, "address": None,
        "error": None,
    }
    if not api_key:
        return {**fallback, "error": "No Places API key"}

    try:
        query = f"{business_name} {city}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: Text Search
            r = await client.get(
                PLACES_TEXT_SEARCH,
                params={"query": query, "key": api_key, "fields": "place_id,name,formatted_address"},
            )
        if not r.is_success or not r.json().get("results"):
            return {**fallback, "ok": True, "claimed": False, "error": "Not found in Places API"}

        place = r.json()["results"][0]
        place_id = place.get("place_id")

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 2: Place Details
            r2 = await client.get(
                PLACES_DETAILS,
                params={
                    "place_id": place_id,
                    "key": api_key,
                    "fields": "name,rating,user_ratings_total,photos,opening_hours,website,formatted_address",
                },
            )
        result = r2.json().get("result", {})
        if not result:
            return {**fallback, "ok": True, "claimed": False}

        photos_count = len(result.get("photos", []))
        hours_set    = bool(result.get("opening_hours"))
        gbp_website  = result.get("website", "")
        from urllib.parse import urlparse
        website_matches = (
            urlparse(gbp_website).netloc.replace("www.", "") ==
            urlparse(website).netloc.replace("www.", "")
        ) if gbp_website and website else None

        return {
            "ok": True,
            "claimed": True,
            "place_id": place_id,
            "name": result.get("name"),
            "rating": result.get("rating"),
            "review_count": result.get("user_ratings_total", 0),
            "photos_count": photos_count,
            "hours_set": hours_set,
            "website_matches": website_matches,
            "address": result.get("formatted_address"),
            "error": None,
        }
    except Exception as e:
        return {**fallback, "error": str(e)}
