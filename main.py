import asyncio
import uuid
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from db.database import init_db, save_audit, get_percentile, get_recent_leads
from checks.ssl_check import check_ssl
from checks.scrape_check import scrape_site
from checks.pagespeed_check import check_pagespeed
from checks.gbp_check import check_gbp
from checks.safe_browsing_check import check_safe_browsing
from checks.sitemap_check import check_crawlability
from checks.backlink_check import check_backlinks
from checks.competitor_check import check_competitors
from checks.social_check import check_instagram
from scoring.engine import calculate_full_score
from automation.make_webhook import trigger_make_webhook

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("lola")

# ── Rate limiter ────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="LOLA SEO Audit API",
    version="2.0.0",
    description="Local business revenue diagnostic — powered by Ty Alexander Media",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()
    logger.info(f"LOLA SEO API v2.0.0 started. CORS: {origins}")


# ── Request / Response models ───────────────────────────────────

class AuditRequest(BaseModel):
    business_name: str
    website: str
    city: str
    business_type: str = "default"
    email: EmailStr
    instagram_handle: Optional[str] = None

    @field_validator("business_name", "website", "city")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("website")
    @classmethod
    def ensure_scheme(cls, v):
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


class AuditResponse(BaseModel):
    audit_id: str
    business_name: str
    website: str
    city: str
    business_type: str
    total_score: int
    grade: str
    grade_label: str
    confidence_score: int
    percentile_rank: int
    percentile_string: str
    revenue_leak_monthly: int
    revenue_context: str
    segment: str
    categories: list
    issues: list
    biggest_bottleneck: Optional[dict]
    quick_wins: list
    competitors: list
    roadmap: dict
    gbp: dict
    pagespeed: dict
    instagram: Optional[dict]
    generated_at: str


# ── Helpers ──────────────────────────────────────────────────────

async def _run_with_timeout(coro, timeout: float = 8.0, fallback: dict = None):
    """Run a check coroutine with a timeout. Returns fallback on timeout/error."""
    fb = fallback or {"ok": False, "error": "timeout"}
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning(f"Check timed out after {timeout}s")
        return {**fb, "error": "timeout"}
    except Exception as e:
        logger.warning(f"Check failed: {e}")
        return {**fb, "error": str(e)}


def _build_quick_wins(issues: list) -> list:
    """Extract quickfix issues as actionable one-liners."""
    return [
        {
            "title": i["title"],
            "plain_english": i["plain_english"],
            "revenue_impact_monthly": i["revenue_impact_monthly"],
        }
        for i in issues
        if i.get("cta_type") == "quickfix"
    ][:4]


# ── Main audit endpoint ──────────────────────────────────────────

@app.post("/audit", response_model=AuditResponse)
@limiter.limit("10/hour")
async def create_audit(request: Request, body: AuditRequest):
    audit_id = str(uuid.uuid4())
    url = body.website
    logger.info(f"[{audit_id}] Audit started: {url} ({body.business_type}, {body.city})")

    # ── Run all checks concurrently with individual timeouts ────
    (
        ssl_result,
        scrape_result,
        ps_result,
        gbp_result,
        safe_result,
        sitemap_result,
        backlink_result,
        competitor_result,
        ig_result,
    ) = await asyncio.gather(
        _run_with_timeout(check_ssl(url),                             8.0,  {"ok": False, "has_https": url.startswith("https"), "cert_valid": False, "cert_days_remaining": None}),
        _run_with_timeout(scrape_site(url, body.city, body.business_type), 12.0, {"ok": False}),
        _run_with_timeout(check_pagespeed(url, settings.GOOGLE_PAGESPEED_API_KEY), 15.0, {"ok": False, "performance": 50}),
        _run_with_timeout(check_gbp(body.business_name, body.city, url, settings.GOOGLE_PLACES_API_KEY), 10.0, {"ok": False, "claimed": False}),
        _run_with_timeout(check_safe_browsing(url, settings.GOOGLE_SAFE_BROWSING_API_KEY), 8.0,  {"ok": True, "is_safe": True}),
        _run_with_timeout(check_crawlability(url),                    10.0, {"ok": False, "robots_ok": True, "sitemap_found": False}),
        _run_with_timeout(check_backlinks(url),                       12.0, {"ok": False, "has_backlinks": False, "estimated_backlinks": 0}),
        _run_with_timeout(check_competitors(body.business_name, body.city, body.business_type, url, settings.GOOGLE_CUSTOM_SEARCH_API_KEY, settings.GOOGLE_CUSTOM_SEARCH_CX), 10.0, {"ok": False, "competitors": []}),
        _run_with_timeout(check_instagram(body.instagram_handle),     10.0, {"ok": False}),
    )

    check_data = {
        "ssl": ssl_result,
        "scrape": scrape_result,
        "pagespeed": ps_result,
        "gbp": gbp_result,
        "safe_browsing": safe_result,
        "sitemap": sitemap_result,
        "backlinks": backlink_result,
        "competitors": competitor_result,
        "instagram": ig_result,
    }

    # ── Score ────────────────────────────────────────────────────
    scored = await calculate_full_score(
        check_data,
        business_type=body.business_type,
        city=body.city,
        percentile_fn=get_percentile,
    )

    quick_wins = _build_quick_wins(scored["issues"])

    # ── Build full response ──────────────────────────────────────
    result = {
        "audit_id": audit_id,
        "business_name": body.business_name,
        "website": url,
        "city": body.city,
        "business_type": body.business_type,
        "email": body.email,
        **scored,
        "quick_wins": quick_wins,
        "competitors": competitor_result.get("competitors", []),
        "gbp": {
            "claimed": gbp_result.get("claimed", False),
            "rating": gbp_result.get("rating"),
            "review_count": gbp_result.get("review_count"),
            "photos_count": gbp_result.get("photos_count"),
            "hours_set": gbp_result.get("hours_set"),
            "address": gbp_result.get("address"),
        },
        "pagespeed": {
            "performance": ps_result.get("performance", 50),
            "lcp": ps_result.get("lcp", "N/A"),
            "fcp": ps_result.get("fcp", "N/A"),
            "cls": ps_result.get("cls", 0),
            "mobile_score": ps_result.get("performance", 50),
            "opportunities": ps_result.get("opportunities", []),
        },
        "instagram": ig_result if ig_result.get("ok") else None,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    # ── Persist ──────────────────────────────────────────────────
    asyncio.create_task(save_audit(audit_id, result))

    # ── Fire Make.com webhook (non-blocking) ────────────────────
    if settings.MAKE_WEBHOOK_URL:
        asyncio.create_task(
            trigger_make_webhook(settings.MAKE_WEBHOOK_URL, result, body.email)
        )

    logger.info(f"[{audit_id}] Complete — score {scored['total_score']}/100 grade {scored['grade']}")

    # Remove internal email field before returning
    result.pop("email", None)
    return result


# ── Admin leads endpoint ─────────────────────────────────────────

@app.get("/leads")
async def get_leads(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != settings.LOLA_SECRET_ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")
    leads = await get_recent_leads(limit=100)
    # Mask emails
    def mask(email: str) -> str:
        try:
            u, d = email.split("@")
            masked = u[0] + "*" * max(1, len(u) - 2) + u[-1] if len(u) > 2 else u[0] + "*"
            return f"{masked}@{d}"
        except Exception:
            return "***@***"
    for lead in leads:
        lead["email"] = mask(lead.get("email", ""))
    return {"total": len(leads), "leads": leads}


# ── Health ───────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "LOLA SEO Audit API",
        "version": "2.0.0",
        "checks_available": {
            "pagespeed": bool(settings.GOOGLE_PAGESPEED_API_KEY),
            "gbp": bool(settings.GOOGLE_PLACES_API_KEY),
            "safe_browsing": bool(settings.GOOGLE_SAFE_BROWSING_API_KEY),
            "competitors": bool(settings.GOOGLE_CUSTOM_SEARCH_API_KEY),
            "make_webhook": bool(settings.MAKE_WEBHOOK_URL),
        },
    }


@app.get("/")
async def root():
    return {
        "service": "LOLA SEO Audit API v2",
        "by": "Ty Alexander Media — tyalexandermedia.com",
        "endpoints": {"health": "GET /health", "audit": "POST /audit", "leads": "GET /leads"},
    }


if __name__ == "__main__":
    import uvicorn, os
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
