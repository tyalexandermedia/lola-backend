import httpx
import math
import time
from typing import Optional

IG_API = "https://i.instagram.com/api/v1/users/web_profile_info/"
IG_HEADERS = {
    "User-Agent": "Instagram 123.0.0.21.114",
    "Accept": "*/*",
}


async def check_instagram(handle: Optional[str]) -> dict:
    fallback = {
        "ok": False, "followers": None, "following": None, "post_count": None,
        "bio": "", "website": "", "is_business": False, "engagement_rate": None,
        "post_freq_per_week": None, "last_post_days_ago": None,
        "has_link": False, "bio_has_cta": False, "error": None,
    }
    if not handle:
        return {**fallback, "error": "No handle provided"}
    clean = handle.strip().lstrip("@")
    if not clean:
        return {**fallback, "error": "Empty handle"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(IG_API, params={"username": clean}, headers=IG_HEADERS)

        if r.status_code == 404:
            return {**fallback, "ok": True, "error": "Profile not found"}
        if not r.is_success:
            return {**fallback, "error": f"Instagram returned {r.status_code}"}

        data = r.json()
        user = data.get("data", {}).get("user")
        if not user:
            return {**fallback, "error": "No user data"}

        followers   = user.get("edge_followed_by", {}).get("count", 0)
        following   = user.get("edge_follow", {}).get("count", 0)
        post_count  = user.get("edge_owner_to_timeline_media", {}).get("count", 0)
        bio         = user.get("biography", "")
        website     = user.get("external_url") or ""
        is_business = user.get("is_business_account", False) or user.get("is_professional_account", False)

        # Post recency + frequency from last 12 posts
        edges = user.get("edge_owner_to_timeline_media", {}).get("edges", [])
        now = time.time()
        post_ages = []
        total_likes, total_comments = 0, 0
        for e in edges:
            n = e.get("node", {})
            ts = n.get("taken_at_timestamp", 0)
            if ts:
                post_ages.append(int((now - ts) / 86400))
            total_likes    += n.get("edge_liked_by", {}).get("count", 0) or n.get("edge_media_preview_like", {}).get("count", 0)
            total_comments += n.get("edge_media_to_comment", {}).get("count", 0) or n.get("edge_media_preview_comment", {}).get("count", 0)

        last_post_days_ago = post_ages[0] if post_ages else None
        recent_90 = [a for a in post_ages if a <= 90]
        post_freq_per_week = round(len(recent_90) / 13, 1) if recent_90 else 0.0

        avg_engagement = ((total_likes + total_comments) / len(edges)) if edges else 0
        engagement_rate = round(avg_engagement / followers * 100, 2) if followers > 0 else 0.0

        CTA_WORDS = ["link", "bio", "book", "call", "dm", "click", "free", "audit", "follow", "visit", "shop", "order", "schedule", "apply"]
        bio_has_cta = any(w in bio.lower() for w in CTA_WORDS)

        return {
            "ok": True,
            "handle": clean,
            "full_name": user.get("full_name", ""),
            "followers": followers,
            "following": following,
            "post_count": post_count,
            "bio": bio,
            "website": website,
            "is_business": is_business,
            "engagement_rate": engagement_rate,
            "post_freq_per_week": post_freq_per_week,
            "last_post_days_ago": last_post_days_ago,
            "has_link": bool(website),
            "bio_has_cta": bio_has_cta,
            "error": None,
        }
    except Exception as e:
        return {**fallback, "error": str(e)}
