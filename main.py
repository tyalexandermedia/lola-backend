import asyncio, uuid, logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Request
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
from checks.social_check import check_instagram
from scoring.engine import calculate_full_score
from automation.make_webhook import trigger_make_webhook

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lola")

app = FastAPI(title="LOLA SEO API", version="2.1.0")

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
    logger.info("LOLA SEO v2.1 started")

class AuditRequest(BaseModel):
    business_name: str
    website: str
    city: str
    business_type: str = "default"
    email: EmailStr
    instagram_handle: Optional[str] = None

    @field_validator("website")
    @classmethod
    def fix_scheme(cls, v):
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v

async def _safe(coro, timeout=8.0, fallback=None):
    fb = fallback or {"ok": False, "error": "timeout"}
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except Exception as e:
        logger.warning(f"Check failed: {e}")
        return {**fb, "error": str(e)}

@app.post("/audit")
async def create_audit(body: AuditRequest):
    audit_id = str(uuid.uuid4())
    url = body.website

    results = await asyncio.gather(
        _safe(check_ssl(url), 8, {"ok":False,"has_https":url.startswith("https"),"cert_valid":False}),
        _safe(scrape_site(url, body.city, body.business_type), 12, {"ok":False}),
        _safe(check_pagespeed(url, settings.GOOGLE_PAGESPEED_API_KEY), 15, {"ok":False,"performance":50}),
        _safe(check_gbp(body.business_name, body.city, url, settings.GOOGLE_PLACES_API_KEY), 10, {"ok":False,"claimed":False}),
        _safe(check_safe_browsing(url, settings.GOOGLE_SAFE_BROWSING_API_KEY), 8, {"ok":True,"is_safe":True}),
        _safe(check_crawlability(url), 10, {"ok":False,"robots_ok":True,"sitemap_found":False}),
        _safe(check_backlinks(url), 12, {"ok":False,"has_backlinks":False,"estimated_backlinks":0}),
        _safe(check_competitors(body.business_name, body.city, body.business_type, url, settings.GOOGLE_CUSTOM_SEARCH_API_KEY, settings.GOOGLE_CUSTOM_SEARCH_CX), 10, {"ok":False,"competitors":[]}),
        _safe(check_instagram(body.instagram_handle), 10, {"ok":False}),
    )

    check_data = dict(zip(
        ["ssl","scrape","pagespeed","gbp","safe_browsing","sitemap","backlinks","competitors","instagram"],
        results
    ))

    scored = await calculate_full_score(check_data, body.business_type, body.city, get_percentile)

    result = {
        "audit_id": audit_id,
        "business_name": body.business_name,
        "website": url,
        "city": body.city,
        "business_type": body.business_type,
        "email": body.email,
        **scored,
        "quick_wins": [i for i in scored["issues"] if i.get("cta_type") == "quickfix"][:4],
        "competitors": check_data["competitors"].get("competitors", []),
        "gbp": {k: check_data["gbp"].get(k) for k in ["claimed","rating","review_count","photos_count","hours_set","address"]},
        "pagespeed": {k: check_data["pagespeed"].get(k, "N/A") for k in ["performance","lcp","fcp","cls","opportunities"]},
        "instagram": check_data["instagram"] if check_data["instagram"].get("ok") else None,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    asyncio.create_task(save_audit(audit_id, result))
    if settings.MAKE_WEBHOOK_URL:
        asyncio.create_task(trigger_make_webhook(settings.MAKE_WEBHOOK_URL, result, body.email))

    result.pop("email", None)
    logger.info(f"[{audit_id}] {scored['total_score']}/100 {scored['grade']}")
    return result

@app.get("/leads")
async def get_leads(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != settings.LOLA_SECRET_ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    leads = await get_recent_leads(100)
    for l in leads:
        e = l.get("email", "")
        l["email"] = e[:2] + "***@" + e.split("@")[-1] if "@" in e else "***"
    return {"total": len(leads), "leads": leads}

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.1.0", "service": "LOLA SEO"}

@app.get("/")
async def root():
    return {"service": "LOLA SEO API", "by": "Ty Alexander Media", "health": "/health", "audit": "POST /audit"}

if __name__ == "__main__":
    import uvicorn, os
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
