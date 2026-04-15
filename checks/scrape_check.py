"""
LOLA SEO — Real Site Scraper
Fetches the LIVE website and extracts EXACT data.
No proxies. No cached data. No assumptions.
Every field is either real data or explicitly None.
"""
import httpx
import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from typing import Optional

PHONE_RE   = re.compile(r'(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})')
ADDRESS_RE = re.compile(r'\b(\d{1,5}\s+\w+\s+(street|avenue|blvd|boulevard|drive|road|lane|way|court|place|st|ave|dr|rd|ln|ct|pl)\b)', re.I)
CITY_KW_RE = re.compile(r'\b(tampa|miami|orlando|jacksonville|clearwater|sarasota|fort\s+lauderdale|st\.?\s*pete|naples|pensacola|gainesville|tallahassee)\b', re.I)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def scrape_site(url: str, city: str = "", business_type: str = "") -> dict:
    """
    Fetches the live site and returns EXACT extracted values.
    Never returns default/assumed values — every field is real or None.
    """
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
            headers=HEADERS,
            verify=False,  # Don't fail on SSL errors — we check SSL separately
        ) as client:
            resp = await client.get(url)

        final_url = str(resp.url)
        html = resp.text
        status_code = resp.status_code

    except httpx.TimeoutException:
        return _unreachable(url, "Timeout — site took too long to respond")
    except Exception as e:
        return _unreachable(url, str(e))

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    city_lower = city.lower().split(",")[0].strip() if city else ""
    btype_lower = (business_type or "").lower().replace("_", " ")

    # ── Title tag (exact text) ──────────────────────────────────
    title_el = soup.find("title")
    title = title_el.get_text(strip=True) if title_el else None

    # ── Meta description (exact text) ──────────────────────────
    meta_desc_el = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_desc = None
    if meta_desc_el:
        meta_desc = (meta_desc_el.get("content") or "").strip() or None

    # ── Viewport ────────────────────────────────────────────────
    vp = soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)})
    meta_viewport = bool(vp)

    # ── Headings ────────────────────────────────────────────────
    h1s = soup.find_all("h1")
    h2s = soup.find_all("h2")
    h3s = soup.find_all("h3")
    h1_text   = h1s[0].get_text(strip=True) if h1s else None
    h1_count  = len(h1s)
    h2_count  = len(h2s)
    h3_count  = len(h3s)

    # ── Canonical ───────────────────────────────────────────────
    canonical_el = soup.find("link", rel=lambda r: r and "canonical" in r)
    canonical_url = canonical_el.get("href", "") if canonical_el else ""
    parsed_url = urlparse(url)
    canonical_self = bool(canonical_url and parsed_url.hostname and parsed_url.hostname in canonical_url)

    # ── Robots / noindex ────────────────────────────────────────
    robots_meta = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
    noindex = "noindex" in (robots_meta.get("content") or "").lower() if robots_meta else False

    # ── Open Graph ──────────────────────────────────────────────
    og_title = soup.find("meta", property="og:title")
    og_desc  = soup.find("meta", property="og:description")
    og_image = soup.find("meta", property="og:image")
    og_complete = bool(og_title and og_desc and og_image)

    # ── Schema.org ──────────────────────────────────────────────
    schema_scripts = soup.find_all("script", type="application/ld+json")
    schema_json   = bool(schema_scripts)
    schema_types  = []
    has_local_business_schema = False
    for s in schema_scripts:
        try:
            d = json.loads(s.string or "{}")
            if isinstance(d, list):
                items = d
            elif isinstance(d, dict):
                items = d.get("@graph", [d])
            else:
                items = []
            for item in items:
                t = item.get("@type", "")
                if isinstance(t, list):
                    schema_types.extend(t)
                elif t:
                    schema_types.append(t)
                if any(x in str(t) for x in ["LocalBusiness", "HomeAndConstructionBusiness", "Service", "Organization"]):
                    has_local_business_schema = True
        except Exception:
            pass

    # ── Body text ───────────────────────────────────────────────
    # Remove script/style/nav for cleaner word count
    for tag in soup(["script", "style", "nav", "footer", "noscript"]):
        tag.decompose()
    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(body_text.split())

    # ── Images ──────────────────────────────────────────────────
    imgs = soup.find_all("img")
    img_count    = len(imgs)
    alt_missing  = sum(1 for i in imgs if not (i.get("alt") or "").strip())
    alt_missing_pct = round(alt_missing / img_count * 100) if img_count > 0 else 0

    # ── Links ────────────────────────────────────────────────────
    domain = parsed_url.netloc
    all_links = soup.find_all("a", href=True)
    internal_links = sum(
        1 for a in all_links
        if a["href"].startswith("/") or (a["href"].startswith("http") and domain in a["href"])
    )
    external_links = sum(
        1 for a in all_links
        if a["href"].startswith("http") and domain not in a["href"]
    )

    # ── Local signals ────────────────────────────────────────────
    raw_html_text = html  # Use raw HTML for phone/address detection
    has_phone   = bool(PHONE_RE.search(raw_html_text))
    has_address = bool(ADDRESS_RE.search(body_text))
    has_maps    = any(x in html.lower() for x in ["google.com/maps", "maps.googleapis", "goo.gl/maps"])
    has_privacy_link = any(w in html.lower() for w in ["privacy policy", "privacy-policy"])

    # Extract actual phone if present
    phone_match = PHONE_RE.search(raw_html_text)
    found_phone = phone_match.group(0).strip() if phone_match else None

    # ── Analytics ────────────────────────────────────────────────
    has_analytics = any(x in html for x in [
        "google-analytics.com", "gtag(", "analytics.js",
        "googletagmanager.com/gtag", "fbq(", "plausible.io"
    ])
    has_gtm = "googletagmanager.com/gtm" in html

    # ── Keyword detection (ACTUAL city + service in content) ────
    def text_contains(text: str, keyword: str) -> bool:
        return keyword.lower() in text.lower() if keyword else False

    title_text   = title or ""
    h1_text_str  = h1_text or ""
    meta_str     = meta_desc or ""

    keyword_in_title  = city_lower and text_contains(title_text, city_lower)
    keyword_in_h1     = city_lower and text_contains(h1_text_str, city_lower)
    keyword_in_meta   = city_lower and text_contains(meta_str, city_lower)
    city_mentioned    = city_lower and text_contains(body_text, city_lower)
    service_in_body   = btype_lower and text_contains(body_text, btype_lower.split()[0] if btype_lower else "")

    # ── HTTPS (from final URL after redirects) ──────────────────
    has_https = final_url.startswith("https://")

    return {
        "ok": True,
        "status_code": status_code,
        "final_url": final_url,

        # ── Exact extracted values ──────────────────────────────
        "title": title,                          # None if missing
        "title_len": len(title) if title else 0,
        "meta_desc": meta_desc,                  # None if missing
        "meta_desc_len": len(meta_desc) if meta_desc else 0,
        "h1_text": h1_text,                      # None if missing
        "h1_count": h1_count,
        "h2_count": h2_count,
        "h3_count": h3_count,

        # ── Booleans ────────────────────────────────────────────
        "meta_viewport": meta_viewport,
        "has_https": has_https,
        "noindex": noindex,
        "canonical_self": canonical_self,
        "og_complete": og_complete,
        "og_title": bool(og_title),
        "og_desc": bool(og_desc),
        "og_image": bool(og_image),
        "schema_json": schema_json,
        "has_local_business_schema": has_local_business_schema,
        "schema_types": schema_types,

        # ── Content ─────────────────────────────────────────────
        "word_count": word_count,
        "img_count": img_count,
        "alt_missing": alt_missing,
        "alt_missing_pct": alt_missing_pct,
        "internal_links": internal_links,
        "external_links": external_links,

        # ── Local signals ────────────────────────────────────────
        "has_phone": has_phone,
        "found_phone": found_phone,
        "has_address": has_address,
        "has_maps": has_maps,
        "has_privacy_link": has_privacy_link,
        "has_analytics": has_analytics,
        "has_gtm": has_gtm,

        # ── Keyword presence ─────────────────────────────────────
        "keyword_in_title": bool(keyword_in_title),
        "keyword_in_h1": bool(keyword_in_h1),
        "keyword_in_meta": bool(keyword_in_meta),
        "city_mentioned": bool(city_mentioned),
        "service_in_body": bool(service_in_body),

        "error": None,
    }


def _unreachable(url: str, error: str) -> dict:
    """Return when the site cannot be fetched. Every field is explicitly False/None — not an assumption."""
    return {
        "ok": False,
        "status_code": None,
        "final_url": url,
        "title": None, "title_len": 0,
        "meta_desc": None, "meta_desc_len": 0,
        "h1_text": None, "h1_count": 0, "h2_count": 0, "h3_count": 0,
        "meta_viewport": False, "has_https": url.startswith("https://"),
        "noindex": False, "canonical_self": False,
        "og_complete": False, "og_title": False, "og_desc": False, "og_image": False,
        "schema_json": False, "has_local_business_schema": False, "schema_types": [],
        "word_count": 0, "img_count": 0, "alt_missing": 0, "alt_missing_pct": 0,
        "internal_links": 0, "external_links": 0,
        "has_phone": False, "found_phone": None,
        "has_address": False, "has_maps": False, "has_privacy_link": False,
        "has_analytics": False, "has_gtm": False,
        "keyword_in_title": False, "keyword_in_h1": False,
        "keyword_in_meta": False, "city_mentioned": False, "service_in_body": False,
        "error": error,
    }
