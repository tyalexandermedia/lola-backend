"""
LOLA SEO Backend v3.0
4-Agent local business revenue diagnostic
Ty Alexander Media — Tampa Bay, FL
"""
import asyncio, uuid, logging
from datetime import datetime
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator

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
# Instagram removed
from scoring.engine import calculate_full_score
from automation.make_webhook import trigger_make_webhook
from automation.report_generator import generate_html_report

async def _noop(): return {'ok': False, 'error': 'instagram_removed'}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("lola")

app = FastAPI(title="LOLA SEO API", version="3.0.0", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("LOLA SEO v3.0 — 4-Agent System started")


# ── Request model ────────────────────────────────────────────────

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
        if not v.strip():
            raise ValueError("cannot be empty")
        return v.strip()

    @field_validator("website")
    @classmethod
    def fix_scheme(cls, v):
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


# ── Safe runner ──────────────────────────────────────────────────

async def _safe(coro, timeout=10.0, fallback=None):
    fb = fallback or {"ok": False, "error": "timeout"}
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return {**fb, "error": "timeout"}
    except Exception as e:
        logger.warning(f"Check error: {e}")
        return {**fb, "error": str(e)}


# ── Email delivery (Resend) ──────────────────────────────────────

async def send_report_email(to_email: str, biz_name: str, html_report: str, audit_id: str):
    """Send HTML report via Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning("No Resend API key — skipping email")
        return
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": "LOLA SEO <lola@tyalexandermedia.com>",
                    "to": [to_email],
                    "bcc": [settings.OWNER_EMAIL],
                    "subject": f"🐾 {biz_name} — Your Free LOLA SEO Audit Report",
                    "html": html_report,
                },
            )
        if resp.is_success:
            logger.info(f"Report email sent to {to_email} (audit {audit_id})")
        else:
            logger.error(f"Resend failed: {resp.status_code} — {resp.text[:200]}")
    except Exception as e:
        logger.error(f"Email send error: {e}")


# ── Main audit endpoint ──────────────────────────────────────────

@app.post("/audit")
async def create_audit(body: AuditRequest, background_tasks: BackgroundTasks):
    audit_id = str(uuid.uuid4())
    url = body.website
    logger.info(f"[{audit_id}] Audit: {body.business_name} | {url} | {body.city} | {body.business_type}")

    # Run all checks concurrently — each with individual timeouts
    (ssl_r, scrape_r, ps_r, gbp_r, safe_r, sitemap_r, backlink_r, comp_r, ig_r) = \
    await asyncio.gather(
        _safe(check_ssl(url), 8,  {"ok":False,"has_https":url.startswith("https"),"cert_valid":False}),
        _safe(scrape_site(url, body.city, body.business_type), 15, {"ok":False,"error":"fetch failed"}),
        _safe(check_pagespeed(url, settings.GOOGLE_PAGESPEED_API_KEY), 18, {"ok":False,"performance":50}),
        _safe(check_gbp(body.business_name, body.city, url, settings.GOOGLE_PLACES_API_KEY), 12, {"ok":False,"claimed":False}),
        _safe(check_safe_browsing(url, settings.GOOGLE_SAFE_BROWSING_API_KEY), 8, {"ok":True,"is_safe":True}),
        _safe(check_crawlability(url), 10, {"ok":False,"robots_ok":True,"sitemap_found":False}),
        _safe(check_backlinks(url), 12, {"ok":False,"has_backlinks":False}),
        _safe(check_competitors(body.business_name, body.city, body.business_type, url,
              settings.GOOGLE_CUSTOM_SEARCH_API_KEY, settings.GOOGLE_CUSTOM_SEARCH_CX), 12, {"ok":False,"competitors":[]}),
        _safe(check_instagram(body.instagram_handle), 10, {"ok":False}),
    )

    check_data = {
        "ssl": ssl_r, "scrape": scrape_r, "pagespeed": ps_r, "gbp": gbp_r,
        "safe_browsing": safe_r, "sitemap": sitemap_r, "backlinks": backlink_r,
        "competitors": comp_r, "instagram": ig_r,
    }

    # Score (returns unique scores based on actual site data)
    scored = await calculate_full_score(check_data, body.business_type, body.city, get_percentile)

    # Build full result
    result = {
        "audit_id": audit_id,
        "business_name": body.business_name,
        "website": url,
        "city": body.city,
        "business_type": body.business_type,
        "email": body.email,
        **scored,
        "competitors": comp_r.get("competitors", []),
        "gbp": {k: gbp_r.get(k) for k in ["claimed","rating","review_count","photos_count","hours_set","address"]},
        "pagespeed": {k: ps_r.get(k,"N/A") for k in ["performance","lcp","fcp","cls","opportunities"]},
        "instagram": None,  # Instagram removed
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    # Generate personalized HTML report
    html_report = generate_html_report(result)

    # Background: save to DB + fire Make webhook + send email
    background_tasks.add_task(save_audit, audit_id, result)
    if settings.MAKE_WEBHOOK_URL:
        background_tasks.add_task(trigger_make_webhook, settings.MAKE_WEBHOOK_URL, result, body.email)
    background_tasks.add_task(send_report_email, body.email, body.business_name, html_report, audit_id)

    # Strip internal fields before response
    result.pop("email", None)
    result.pop("_scrape", None)
    result.pop("_gbp", None)

    logger.info(f"[{audit_id}] Complete — {scored['total_score']}/100 Grade {scored['grade']} | confidence {scored['confidence_score']}%")
    return result


# ── Report endpoint (for pre-generated report delivery) ──────────

@app.get("/report/{audit_id}")
async def get_report(audit_id: str, x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != settings.LOLA_SECRET_ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    # In production, look up from DB and return HTML report
    return {"audit_id": audit_id, "message": "Report available in email delivery"}


# ── Admin ────────────────────────────────────────────────────────

@app.get("/leads")
async def get_leads(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != settings.LOLA_SECRET_ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    leads = await get_recent_leads(100)
    for l in leads:
        e = l.get("email", "")
        l["email"] = e[:2] + "***@" + e.split("@")[-1] if "@" in e else "***"
    return {"total": len(leads), "leads": leads}


# ── Health ───────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "3.0.0",
        "service": "LOLA SEO — 4-Agent Revenue Diagnostic",
        "by": "Ty Alexander Media · Tampa Bay FL",
        "checks": {
            "pagespeed_api": bool(settings.GOOGLE_PAGESPEED_API_KEY),
            "places_api": bool(settings.GOOGLE_PLACES_API_KEY),
            "search_api": bool(settings.GOOGLE_CUSTOM_SEARCH_API_KEY),
            "email": bool(settings.RESEND_API_KEY),
            "make_webhook": bool(settings.MAKE_WEBHOOK_URL),
        }
    }

@app.get("/")
async def root():
    return {"service": "LOLA SEO API v3", "health": "/health", "audit": "POST /audit"}

if __name__ == "__main__":
    import uvicorn, os
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
