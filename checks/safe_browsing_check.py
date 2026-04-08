import httpx
from typing import Optional

SAFE_BROWSING_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
THREAT_TYPES = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"]


async def check_safe_browsing(url: str, api_key: Optional[str] = None) -> dict:
    fallback = {"ok": False, "is_safe": True, "threats": [], "error": None}
    if not api_key:
        return {**fallback, "ok": True, "error": "No API key — assuming safe"}
    try:
        payload = {
            "client": {"clientId": "lola-seo", "clientVersion": "1.0.0"},
            "threatInfo": {
                "threatTypes": THREAT_TYPES,
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(f"{SAFE_BROWSING_URL}?key={api_key}", json=payload)

        data = r.json()
        matches = data.get("matches", [])
        threats = [m.get("threatType") for m in matches]
        return {
            "ok": True,
            "is_safe": len(matches) == 0,
            "threats": threats,
            "error": None,
        }
    except Exception as e:
        return {**fallback, "ok": True, "error": str(e)}
