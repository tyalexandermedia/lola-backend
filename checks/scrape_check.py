import httpx
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from typing import Optional


PHONE_RE = re.compile(r'(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})')
ADDRESS_RE = re.compile(r'\b(street|avenue|blvd|boulevard|drive|road|lane|suite|ste|ave|dr|rd|st)\b', re.I)
CITY_KEYWORD_RE = re.compile(r'(tampa|miami|orlando|clearwater|st\.?\s?pete|sarasota|jacksonville|\b[A-Z][a-z]+,\s?[A-Z]{2}\b)', re.I)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LolaSEOBot/1.0; +https://lola-seo.vercel.app)",
    "Accept": "text/html,application/xhtml+xml",
}


async def scrape_site(url: str, city: str = "", business_type: str = "") -> dict:
    fallback = _fallback(url)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0, headers=HEADERS) as client:
            resp = await client.get(url)
        html = resp.text
        soup = BeautifulSoup(html, "lxml")
    except Exception as e:
        return {**fallback, "error": str(e)}

    try:
        # ── Core meta ──────────────────────────────────────────────
        title_el = soup.find("title")
        title = title_el.get_text(strip=True) if title_el else ""

        meta_desc_el = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
        meta_desc = (meta_desc_el.get("content") or "").strip() if meta_desc_el else ""

        viewport_el = soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)})
        meta_viewport = bool(viewport_el)

        # ── Headings ────────────────────────────────────────────────
        h1s = soup.find_all("h1")
        h2s = soup.find_all("h2")
        h1_text = h1s[0].get_text(strip=True) if h1s else ""

        # ── Canonical + robots ──────────────────────────────────────
        canonical_el = soup.find("link", rel=lambda r: r and "canonical" in r)
        canonical_url = canonical_el.get("href", "") if canonical_el else ""
        canonical_self = bool(canonical_url and urlparse(url).hostname in canonical_url)

        robots_meta = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
        noindex = "noindex" in (robots_meta.get("content") or "").lower() if robots_meta else False

        # ── Open Graph ──────────────────────────────────────────────
        og_title   = bool(soup.find("meta", property="og:title"))
        og_desc    = bool(soup.find("meta", property="og:description"))
        og_image   = bool(soup.find("meta", property="og:image"))
        og_complete = og_title and og_desc and og_image

        # ── Schema.org ──────────────────────────────────────────────
        schema_scripts = soup.find_all("script", type="application/ld+json")
        schema_json = bool(schema_scripts)
        schema_types = []
        for s in schema_scripts:
            try:
                import json
                d = json.loads(s.string or "{}")
                t = d.get("@type", "")
                if isinstance(t, list):
                    schema_types.extend(t)
                elif t:
                    schema_types.append(t)
            except Exception:
                pass

        # ── Content ─────────────────────────────────────────────────
        body_text = soup.get_text(separator=" ", strip=True)
        word_count = len(body_text.split())

        # ── Images ──────────────────────────────────────────────────
        imgs = soup.find_all("img")
        img_count = len(imgs)
        alt_missing = sum(1 for i in imgs if not (i.get("alt") or "").strip())
        alt_missing_pct = round(alt_missing / img_count * 100) if img_count > 0 else 0

        # ── Links ────────────────────────────────────────────────────
        domain = urlparse(url).netloc
        all_links = soup.find_all("a", href=True)
        internal_links, external_links = 0, 0
        for a in all_links:
            href = a["href"]
            if href.startswith("http") and domain not in href:
                external_links += 1
            elif href.startswith("/") or domain in href:
                internal_links += 1

        # ── Local signals ────────────────────────────────────────────
        has_phone   = bool(PHONE_RE.search(html))
        has_address = bool(ADDRESS_RE.search(html))
        has_maps_embed = any(x in html.lower() for x in ["google.com/maps", "maps.googleapis", "goo.gl/maps"])
        has_privacy_link = any(w in html.lower() for w in ["privacy policy", "privacy-policy", "/privacy"])

        # ── Analytics / tracking ─────────────────────────────────────
        has_analytics = any(x in html for x in [
            "google-analytics.com", "gtag(", "analytics.js", "googletagmanager.com/gtag",
            "plausible.io", "mixpanel", "segment.com",
        ])
        has_gtm = "googletagmanager.com/gtm" in html

        # ── Keyword presence ─────────────────────────────────────────
        city_lower = city.lower()
        btype_lower = (business_type or "").lower().replace("_", " ")

        def has_keyword(text: str) -> bool:
            t = text.lower()
            return city_lower in t or btype_lower in t

        keyword_in_title  = has_keyword(title)
        keyword_in_h1     = has_keyword(h1_text)
        keyword_in_meta   = has_keyword(meta_desc)
        city_mentioned    = city_lower in body_text.lower()

        return {
            "ok": True,
            "title": title,
            "title_len": len(title),
            "meta_desc": meta_desc,
            "meta_desc_len": len(meta_desc),
            "meta_viewport": meta_viewport,
            "h1_count": len(h1s),
            "h1_text": h1_text,
            "h2_count": len(h2s),
            "canonical_url": canonical_url,
            "canonical_self": canonical_self,
            "noindex": noindex,
            "og_title": og_title,
            "og_desc": og_desc,
            "og_image": og_image,
            "og_complete": og_complete,
            "schema_json": schema_json,
            "schema_types": schema_types,
            "word_count": word_count,
            "img_count": img_count,
            "alt_missing": alt_missing,
            "alt_missing_pct": alt_missing_pct,
            "internal_links": internal_links,
            "external_links": external_links,
            "has_phone": has_phone,
            "has_address": has_address,
            "has_maps_embed": has_maps_embed,
            "has_privacy_link": has_privacy_link,
            "has_analytics": has_analytics,
            "has_gtm": has_gtm,
            "keyword_in_title": keyword_in_title,
            "keyword_in_h1": keyword_in_h1,
            "keyword_in_meta": keyword_in_meta,
            "city_mentioned": city_mentioned,
            "error": None,
        }
    except Exception as e:
        return {**fallback, "error": f"parse error: {str(e)}"}


def _fallback(url: str) -> dict:
    return {
        "ok": False, "title": "", "title_len": 0, "meta_desc": "", "meta_desc_len": 0,
        "meta_viewport": False, "h1_count": 0, "h1_text": "", "h2_count": 0,
        "canonical_url": "", "canonical_self": False, "noindex": False,
        "og_title": False, "og_desc": False, "og_image": False, "og_complete": False,
        "schema_json": False, "schema_types": [], "word_count": 0, "img_count": 0,
        "alt_missing": 0, "alt_missing_pct": 0, "internal_links": 0, "external_links": 0,
        "has_phone": False, "has_address": False, "has_maps_embed": False,
        "has_privacy_link": False, "has_analytics": False, "has_gtm": False,
        "keyword_in_title": False, "keyword_in_h1": False, "keyword_in_meta": False,
        "city_mentioned": False, "error": None,
    }
