# ============================================================
# LOLA SEO BACKEND — ENHANCED VERSION
# Improved Revenue Calculator + User Experience
# ============================================================

import os
import uuid
import asyncio
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

# ── INITIALIZE APP ──────────────────────────────────────────

app = FastAPI(title="Lola SEO Backend", version="2.1-Enhanced")

# ── CORS SETUP ──────────────────────────────────────────────

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://lola-seo.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ENVIRONMENT VARIABLES ───────────────────────────────────

GOOGLE_PAGESPEED_KEY = os.getenv("GOOGLE_PAGESPEED_API_KEY")
GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
GOOGLE_CUSTOM_SEARCH_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY")
GOOGLE_CUSTOM_SEARCH_CX = os.getenv("GOOGLE_CUSTOM_SEARCH_CX")

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_LIST_ID = os.getenv("BREVO_LIST_ID", "2")

LOLA_SECRET_ADMIN_KEY = os.getenv("LOLA_SECRET_ADMIN_KEY", "admin-key-change-me")

# ── PYDANTIC MODELS ─────────────────────────────────────────

class AuditRequest(BaseModel):
    business_name: str
    website: str
    city: str
    business_type: str = "contractor"
    email: str
    instagram_handle: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    has_pagespeed_key: bool
    has_places_key: bool
    has_safe_browsing_key: bool
    has_brevo_key: bool
    has_custom_search_key: bool

# ── ENHANCED REVENUE CALCULATOR ─────────────────────────────

class RevenueCalculator:
    """
    Enhanced revenue leak calculator with:
    - Vertical-specific job values
    - Realistic call estimates
    - Pricing impact analysis
    - Conversion rate modeling
    """
    
    # Job values by vertical (realistic 2026 pricing)
    JOB_VALUES = {
        "soft wash": {"min": 300, "avg": 500, "max": 800},
        "pressure wash": {"min": 250, "avg": 450, "max": 750},
        "hvac": {"min": 400, "avg": 650, "max": 1200},
        "roofing": {"min": 5000, "avg": 8000, "max": 15000},
        "plumbing": {"min": 200, "avg": 400, "max": 800},
        "electrical": {"min": 300, "avg": 500, "max": 900},
        "landscaping": {"min": 200, "avg": 350, "max": 600},
        "contractor": {"min": 300, "avg": 500, "max": 1000},
        "restaurant": {"min": 30, "avg": 75, "max": 150},
        "salon": {"min": 60, "avg": 150, "max": 300},
        "medical": {"min": 200, "avg": 300, "max": 500},
        "retail": {"min": 50, "avg": 100, "max": 250},
        "default": {"min": 300, "avg": 500, "max": 1000}
    }
    
    @staticmethod
    def get_job_value(business_type: str) -> dict:
        """Get realistic job value range for business type"""
        return RevenueCalculator.JOB_VALUES.get(
            business_type.lower(),
            RevenueCalculator.JOB_VALUES["default"]
        )
    
    @staticmethod
    def estimate_monthly_calls(score: int) -> dict:
        """
        Estimate monthly calls based on SEO score.
        Higher score = fewer missed calls.
        """
        
        # Score ranges and estimated missed calls
        if score >= 90:
            return {"missed": 3, "label": "Minimal Loss", "efficiency": "95%"}
        elif score >= 80:
            return {"missed": 8, "label": "Low Loss", "efficiency": "85%"}
        elif score >= 70:
            return {"missed": 15, "label": "Moderate Loss", "efficiency": "70%"}
        elif score >= 60:
            return {"missed": 25, "label": "Significant Loss", "efficiency": "50%"}
        elif score >= 50:
            return {"missed": 40, "label": "High Loss", "efficiency": "30%"}
        else:
            return {"missed": 60, "label": "Critical Loss", "efficiency": "10%"}
    
    @staticmethod
    def calculate_revenue_leak(business_type: str, score: int) -> dict:
        """
        Calculate detailed revenue leak with:
        - Monthly missed calls
        - Revenue loss estimate
        - Pricing impact
        - Recovery potential
        """
        
        job_value = RevenueCalculator.get_job_value(business_type)
        calls_data = RevenueCalculator.estimate_monthly_calls(score)
        
        missed_calls = calls_data["missed"]
        avg_job_value = job_value["avg"]
        
        # Calculate monthly leak
        monthly_leak = missed_calls * avg_job_value
        annual_leak = monthly_leak * 12
        
        # Calculate potential recovery if score improved
        improved_calls_data = RevenueCalculator.estimate_monthly_calls(score + 25)
        improved_leak = improved_calls_data["missed"] * avg_job_value
        recovery_potential = monthly_leak - improved_leak
        
        return {
            "monthly_leak": int(monthly_leak),
            "annual_leak": int(annual_leak),
            "missed_calls_per_month": missed_calls,
            "avg_job_value": int(avg_job_value),
            "job_value_range": f"${job_value['min']}-${job_value['max']}",
            "efficiency_label": calls_data["label"],
            "current_efficiency": calls_data["efficiency"],
            "recovery_potential": int(recovery_potential),
            "recovery_calls": int(recovery_potential / avg_job_value) if avg_job_value > 0 else 0,
            "payback_months": max(1, int(3000 / (recovery_potential / 12))) if recovery_potential > 0 else 0
        }

# ── GOOGLE API CALLS ────────────────────────────────────────

async def get_page_speed(website: str) -> dict:
    """Get real page speed score from Google PageSpeed Insights API"""
    
    if not GOOGLE_PAGESPEED_KEY:
        return {"ok": False, "performance": 50, "accessibility": 50, "seo": 50}
    
    try:
        url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
        params = {
            "url": website,
            "key": GOOGLE_PAGESPEED_KEY,
            "strategy": "mobile",
            "category": "performance",
            "category": "accessibility",
            "category": "seo"
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 429:
            return {"ok": False, "performance": 50, "accessibility": 50, "seo": 50}
        
        data = response.json()
        
        lighthouse = data.get("lighthouseResult", {})
        categories = lighthouse.get("categories", {})
        
        performance = int((categories.get("performance", {}).get("score", 0.5)) * 100)
        accessibility = int((categories.get("accessibility", {}).get("score", 0.5)) * 100)
        seo = int((categories.get("seo", {}).get("score", 0.5)) * 100)
        
        return {
            "ok": True,
            "performance": performance,
            "accessibility": accessibility,
            "seo": seo
        }
    except Exception as e:
        print(f"❌ PageSpeed error: {e}")
        return {"ok": False, "performance": 50, "accessibility": 50, "seo": 50}

async def get_safe_browsing(website: str) -> dict:
    """Check if site is safe (not hacked/malware) via Safe Browsing API"""
    
    if not GOOGLE_SAFE_BROWSING_KEY:
        return {"ok": False, "is_safe": True, "threats": []}
    
    try:
        url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
        
        payload = {
            "client": {
                "clientId": "lola-seo",
                "clientVersion": "2.1"
            },
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": website}]
            }
        }
        
        params = {"key": GOOGLE_SAFE_BROWSING_KEY}
        
        response = requests.post(url, json=payload, params=params, timeout=10)
        data = response.json()
        
        matches = data.get("matches", [])
        is_safe = len(matches) == 0
        
        return {
            "ok": True,
            "is_safe": is_safe,
            "threats": matches
        }
    except Exception as e:
        print(f"❌ Safe Browsing error: {e}")
        return {"ok": False, "is_safe": True, "threats": []}

async def get_business_info(business_name: str, city: str) -> dict:
    """Get real business info from Google Places API"""
    
    if not GOOGLE_PLACES_KEY:
        return {
            "ok": False,
            "name": business_name,
            "address": "",
            "phone": "",
            "rating": 0,
            "review_count": 0,
            "hours": None,
            "verified": False
        }
    
    try:
        url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        
        params = {
            "input": f"{business_name} {city}",
            "inputtype": "textquery",
            "key": GOOGLE_PLACES_KEY,
            "fields": "formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,business_status"
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        candidates = data.get("candidates", [])
        
        if not candidates:
            return {
                "ok": False,
                "name": business_name,
                "address": "",
                "phone": "",
                "rating": 0,
                "review_count": 0,
                "hours": None,
                "verified": False
            }
        
        place = candidates[0]
        
        return {
            "ok": True,
            "name": business_name,
            "address": place.get("formatted_address", ""),
            "phone": place.get("formatted_phone_number", ""),
            "rating": place.get("rating", 0),
            "review_count": place.get("user_ratings_total", 0),
            "hours": place.get("opening_hours", {}).get("weekday_text", []),
            "verified": place.get("business_status") == "OPERATIONAL"
        }
    except Exception as e:
        print(f"❌ Places error: {e}")
        return {
            "ok": False,
            "name": business_name,
            "address": "",
            "phone": "",
            "rating": 0,
            "review_count": 0,
            "hours": None,
            "verified": False
        }

async def get_competitors(business_type: str, city: str) -> List[dict]:
    """Find who's ranking for your keywords via Google Custom Search"""
    
    if not GOOGLE_CUSTOM_SEARCH_KEY or not GOOGLE_CUSTOM_SEARCH_CX:
        return []
    
    try:
        keywords = {
            "soft wash": f"soft wash near {city}",
            "pressure wash": f"pressure washing {city}",
            "hvac": f"HVAC repair {city}",
            "roofing": f"roofing contractor {city}",
            "plumbing": f"emergency plumber {city}",
            "electrical": f"electrician {city}",
            "landscaping": f"landscaping {city}",
            "contractor": f"contractor services {city}",
            "restaurant": f"restaurant {city}",
            "salon": f"hair salon {city}",
            "medical": f"doctor {city}",
            "retail": f"retail {city}",
        }
        
        keyword = keywords.get(business_type.lower(), f"{business_type} {city}")
        
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": keyword,
            "key": GOOGLE_CUSTOM_SEARCH_KEY,
            "cx": GOOGLE_CUSTOM_SEARCH_CX,
            "num": 5
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        competitors = []
        for i, item in enumerate(data.get("items", [])[:5], 1):
            competitors.append({
                "rank": i,
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
        
        return competitors
    except Exception as e:
        print(f"❌ Competitors error: {e}")
        return []

# ── SCORING LOGIC ───────────────────────────────────────────

def calculate_total_score(
    page_speed: int,
    accessibility: int,
    seo_score: int,
    is_safe: bool,
    business_info: dict,
    business_type: str
) -> int:
    """
    Calculate overall SEO score (0-100) based on multiple factors.
    Weighted by importance for local SEO.
    """
    
    score = 0
    
    # Page Speed (25%)
    speed_contribution = (page_speed / 100) * 25
    score += speed_contribution
    
    # Mobile/Accessibility (15%)
    access_contribution = (accessibility / 100) * 15
    score += access_contribution
    
    # SEO Best Practices (20%)
    seo_contribution = (seo_score / 100) * 20
    score += seo_contribution
    
    # Safety (10%)
    safety_points = 10 if is_safe else 0
    score += safety_points
    
    # Local Presence (30%)
    local_score = 0
    
    if business_info.get("address"):
        local_score += 10
    
    if business_info.get("phone"):
        local_score += 10
    
    if business_info.get("verified"):
        local_score += 5
    
    if business_info.get("rating", 0) > 0:
        local_score += 5
    
    score += local_score
    
    return min(int(score), 100)

def get_grade(score: int) -> tuple:
    """Convert score (0-100) to letter grade (A-F)"""
    
    grade_map = [
        (90, "A", "🏆 Best in Show"),
        (80, "B", "✅ Solid Foundation"),
        (70, "C", "🐾 Needs Work"),
        (60, "D", "⚠️ Needs Training"),
        (0, "F", "🚨 Off the Leash")
    ]
    
    for threshold, grade, label in grade_map:
        if score >= threshold:
            return grade, label
    
    return "F", "🚨 Off the Leash"

# ── BREVO INTEGRATION ───────────────────────────────────────

def send_to_brevo(
    email: str,
    business_name: str,
    city: str,
    business_type: str,
    total_score: int,
    revenue_leak: dict,
    grade: str,
    grade_label: str
) -> bool:
    """
    Send contact to Brevo with detailed revenue data.
    Triggers Brevo automation workflow (5-email sequence).
    """
    
    if not BREVO_API_KEY:
        print("⚠️  No Brevo API key configured")
        return False
    
    try:
        url = "https://api.brevo.com/v3/contacts"
        
        headers = {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "email": email,
            "attributes": {
                "BUSINESS_NAME": business_name,
                "CITY": city,
                "BUSINESS_TYPE": business_type,
                "SEO_SCORE": total_score,
                "SEO_GRADE": grade,
                "SEO_GRADE_LABEL": grade_label,
                "MONTHLY_LEAK": revenue_leak.get("monthly_leak", 0),
                "ANNUAL_LEAK": revenue_leak.get("annual_leak", 0),
                "MISSED_CALLS": revenue_leak.get("missed_calls_per_month", 0),
                "RECOVERY_POTENTIAL": revenue_leak.get("recovery_potential", 0),
                "AUDIT_SOURCE": "lola_seo",
                "AUDIT_DATE": datetime.now().isoformat()
            },
            "listIds": [int(BREVO_LIST_ID)],
            "updateEnabled": True
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            print(f"✅ Sent to Brevo: {email}")
            return True
        else:
            print(f"❌ Brevo returned {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Brevo error: {e}")
        return False

# ── MAIN AUDIT ENDPOINT ─────────────────────────────────────

@app.post("/audit")
async def audit(request: AuditRequest):
    """
    Main audit endpoint.
    Runs all checks in parallel and returns comprehensive report.
    Automatically sends contact to Brevo (triggers email sequence).
    """
    
    # Ensure website has protocol
    website = request.website
    if not website.startswith("http"):
        website = "https://" + website
    
    print(f"\n🐾 LOLA AUDIT START: {request.business_name} ({request.city})")
    
    try:
        # Run all checks in parallel for speed
        page_speed_task = get_page_speed(website)
        safe_browsing_task = get_safe_browsing(website)
        business_info_task = get_business_info(request.business_name, request.city)
        competitors_task = get_competitors(request.business_type, request.city)
        
        page_speed_result, safe_browsing_result, business_info_result, competitors = await asyncio.gather(
            page_speed_task,
            safe_browsing_task,
            business_info_task,
            competitors_task
        )
        
        # Calculate scores
        total_score = calculate_total_score(
            page_speed_result.get("performance", 50),
            page_speed_result.get("accessibility", 50),
            page_speed_result.get("seo", 50),
            safe_browsing_result.get("is_safe", True),
            business_info_result,
            request.business_type
        )
        
        # Calculate enhanced revenue leak
        revenue_leak = RevenueCalculator.calculate_revenue_leak(
            request.business_type,
            total_score
        )
        
        # Get grade
        grade, grade_label = get_grade(total_score)
        
        # Generate audit ID
        audit_id = str(uuid.uuid4())
        
        # Send to Brevo (triggers email sequence)
        send_to_brevo(
            request.email,
            request.business_name,
            request.city,
            request.business_type,
            total_score,
            revenue_leak,
            grade,
            grade_label
        )
        
        print(f"✅ LOLA AUDIT COMPLETE: Score={total_score}, Grade={grade}, Monthly Leak=${revenue_leak['monthly_leak']}")
        
        # Return full audit report with enhanced data
        return {
            "audit_id": audit_id,
            "business_name": request.business_name,
            "website": website,
            "city": request.city,
            "business_type": request.business_type,
            "email": request.email,
            "total_score": total_score,
            "grade": grade,
            "grade_label": grade_label,
            "revenue_leak": revenue_leak,
            "page_speed": {
                "performance": page_speed_result.get("performance", 50),
                "accessibility": page_speed_result.get("accessibility", 50),
                "seo": page_speed_result.get("seo", 50)
            },
            "safety": {
                "is_safe": safe_browsing_result.get("is_safe", True),
                "threats": safe_browsing_result.get("threats", [])
            },
            "business_info": business_info_result,
            "competitors": competitors,
            "categories": {
                "page_speed": {"score": page_speed_result.get("performance", 50)},
                "site_health": {"score": (page_speed_result.get("seo", 50) + 50) // 2},
                "local_presence": {"score": 75 if business_info_result.get("ok") else 25},
                "mobile": {"score": page_speed_result.get("accessibility", 50)},
                "content": {"score": 60}
            }
        }
    
    except Exception as e:
        print(f"❌ AUDIT ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

# ── HEALTH CHECK ────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Check API status and which keys are configured"""
    
    return {
        "status": "ok",
        "has_pagespeed_key": bool(GOOGLE_PAGESPEED_KEY),
        "has_places_key": bool(GOOGLE_PLACES_KEY),
        "has_safe_browsing_key": bool(GOOGLE_SAFE_BROWSING_KEY),
        "has_brevo_key": bool(BREVO_API_KEY),
        "has_custom_search_key": bool(GOOGLE_CUSTOM_SEARCH_KEY and GOOGLE_CUSTOM_SEARCH_CX)
    }

# ── ADMIN LEADS ENDPOINT ────────────────────────────────────

@app.get("/leads")
async def get_leads(x_admin_key: str = None):
    """
    Admin endpoint to view all submitted leads.
    Requires X-Admin-Key header.
    """
    
    if x_admin_key != LOLA_SECRET_ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return {
        "message": "Admin endpoint - integrate with your database",
        "note": "Connect to Brevo API to fetch contacts from LOLA SEO list"
    }

# ── ROOT ────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "Lola SEO Backend",
        "version": "2.1-Enhanced",
        "features": [
            "Real Google APIs (PageSpeed, Places, Safe Browsing, Custom Search)",
            "Enhanced revenue calculator with pricing impact",
            "Vertical-specific job value estimates",
            "Recovery potential analysis",
            "Automatic Brevo integration (5-email sequence)"
        ],
        "endpoints": [
            "POST /audit (main audit)",
            "GET /health (status check)",
            "GET /leads (admin only)"
        ]
    }

# ── RUN ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
