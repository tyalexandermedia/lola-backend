import httpx
import re
from urllib.parse import urlparse


async def check_crawlability(url: str) -> dict:
    fallback = {
        "ok": False, "robots_ok": None, "googlebot_blocked": False,
        "sitemap_found": False, "sitemap_url": None, "sitemap_url_count": 0, "error": None,
    }
    try:
        origin = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        robots_ok, googlebot_blocked, sitemap_url_from_robots = await _check_robots(origin)
        sitemap_found, sitemap_url_count, sitemap_url = await _check_sitemap(
            origin, sitemap_url_from_robots
        )
        return {
            "ok": True,
            "robots_ok": robots_ok,
            "googlebot_blocked": googlebot_blocked,
            "sitemap_found": sitemap_found,
            "sitemap_url": sitemap_url,
            "sitemap_url_count": sitemap_url_count,
            "error": None,
        }
    except Exception as e:
        return {**fallback, "error": str(e)}


async def _check_robots(origin: str):
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            r = await client.get(f"{origin}/robots.txt")
        if not r.is_success:
            return True, False, None  # no robots.txt = ok

        text = r.text.lower()
        # Check if Googlebot or * is blocked with Disallow: /
        blocked = bool(re.search(r'(user-agent:\s*\*|user-agent:\s*googlebot).*?disallow:\s*/', text, re.DOTALL))
        # Extract sitemap URL
        sitemap_match = re.search(r'sitemap:\s*(https?://\S+)', r.text, re.I)
        sitemap_url = sitemap_match.group(1).strip() if sitemap_match else None

        return not blocked, blocked, sitemap_url
    except Exception:
        return True, False, None


async def _check_sitemap(origin: str, sitemap_url_hint: str = None):
    candidates = [sitemap_url_hint, f"{origin}/sitemap.xml", f"{origin}/sitemap_index.xml"]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                r = await client.get(candidate)
            if r.is_success and "urlset" in r.text:
                url_count = r.text.count("<url>")
                return True, url_count, candidate
            elif r.is_success and "sitemapindex" in r.text:
                # Sitemap index
                loc_count = r.text.count("<loc>")
                return True, loc_count, candidate
        except Exception:
            continue
    return False, 0, None
