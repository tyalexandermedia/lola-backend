"""
LOLA SEO — Competitor Check (SerpApi)
Pulls real Google local pack + organic results for the business's city + service type.
Returns top competitors by name with ratings, review counts, and URLs.
Falls back to Custom Search if SerpApi unavailable.
"""
import httpx, logging, os

logger = logging.getLogger("lola.competitors")

SERP_URL   = "https://serpapi.com/search.json"
CUSTOM_URL = "https://www.googleapis.com/customsearch/v1"


async def check_competitors(
    business_name: str,
    city: str,
    business_type: str,
    serp_api_key: str = "",
    custom_search_key: str = "",
    custom_search_cx:  str = "",
) -> dict:
    fallback = {"ok": True, "competitors": [], "local_pack": [], "score": 50}
    city_short = city.split(",")[0].strip()
    btype = business_type.replace("_", " ")
    query = f"{btype} {city_short}"

    # ── Strategy 1: SerpApi (best — real Google results) ─────────────────────
    if serp_api_key:
        try:
            # SerpApi: use gl+hl for US locale, no location param (causes errors with short city formats)
            params = {
                "q":       query,
                "api_key": serp_api_key,
                "engine":  "google",
                "num":     10,
                "gl":      "us",
                "hl":      "en",
                "google_domain": "google.com",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(SERP_URL, params=params)

            if r.is_success:
                data = r.json()

                # Local pack (3-pack at top of Google) — highest value
                local_places = (
                    data.get("local_results", {}).get("places", [])
                    or data.get("local_pack", [])
                    or []
                )
                competitors = []
                for place in local_places[:5]:
                    name = place.get("title", "")
                    if business_name.lower() in name.lower():
                        continue  # skip self
                    competitors.append({
                        "name":         name,
                        "title":        name,
                        "url":          place.get("website", "") or place.get("link", ""),
                        "rating":       place.get("rating"),
                        "review_count": place.get("reviews"),
                        "position":     place.get("position", 0),
                        "source":       "local_pack",
                    })

                # Organic results as supplement
                organic = data.get("organic_results", [])
                for result in organic[:6]:
                    name  = result.get("title", "")
                    url   = result.get("link", "")
                    # Skip directories and aggregators
                    skip_domains = ["yelp.com","angi.com","homeadvisor.com",
                                    "thumbtack.com","bbb.org","yellowpages.com",
                                    "google.com","facebook.com","nextdoor.com"]
                    if any(d in url for d in skip_domains):
                        continue
                    if business_name.lower() in name.lower():
                        continue
                    # Avoid duplicates
                    if any(c["url"] == url for c in competitors):
                        continue
                    competitors.append({
                        "name":         name,
                        "title":        name,
                        "url":          url,
                        "link":         url,
                        "rating":       None,
                        "review_count": None,
                        "position":     result.get("position", 0),
                        "source":       "organic",
                    })

                # Also find self in local pack for GBP context
                self_in_pack = next(
                    (p for p in local_places if business_name.lower() in p.get("title","").lower()),
                    None
                )

                score = 50
                if competitors:
                    score = 30  # being outranked is bad
                if self_in_pack:
                    score = 70  # at least we're in the pack

                logger.info(f"SerpApi: {len(competitors)} competitors, self_in_pack={bool(self_in_pack)}")
                return {
                    **fallback,
                    "competitors":   competitors[:5],
                    "local_pack":    [c for c in competitors if c.get("source") == "local_pack"],
                    "self_in_pack":  self_in_pack,
                    "score":         score,
                    "query":         query,
                }
        except Exception as e:
            logger.warning(f"SerpApi failed: {e}")

    # ── Strategy 2: Google Custom Search (fallback) ────────────────────────────
    if custom_search_key and custom_search_cx:
        try:
            params = {
                "key": custom_search_key,
                "cx":  custom_search_cx,
                "q":   query,
                "num": 5,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(CUSTOM_URL, params=params)
            if r.is_success:
                items = r.json().get("items", [])
                competitors = [
                    {"name": i.get("title",""), "title": i.get("title",""),
                     "url": i.get("link",""), "link": i.get("link",""),
                     "source": "custom_search"}
                    for i in items
                    if business_name.lower() not in i.get("title","").lower()
                ]
                logger.info(f"Custom Search fallback: {len(competitors)} results")
                return {**fallback, "competitors": competitors[:5], "score": 40}
        except Exception as e:
            logger.warning(f"Custom Search failed: {e}")

    logger.info("No competitor data available — both APIs unavailable")
    return fallback
