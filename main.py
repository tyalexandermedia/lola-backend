# ============================================================
# LOLA SEO BACKEND — PRODUCTION READY
# Copy entire file → Paste into GitHub → Deploy
# ============================================================

import os
import uuid
import asyncio
import traceback
import requests
from dotenv import load_dotenv
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()

app = FastAPI(title="Lola SEO", version="3.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://lola-seo.vercel.app").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

GOOGLE_PAGESPEED_KEY = os.getenv("GOOGLE_PAGESPEED_API_KEY")
GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
GOOGLE_CUSTOM_SEARCH_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY")
GOOGLE_CUSTOM_SEARCH_CX = os.getenv("GOOGLE_CUSTOM_SEARCH_CX")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_LIST_ID = os.getenv("BREVO_LIST_ID", "2")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
AUDIT_FROM_EMAIL = os.getenv("AUDIT_FROM_EMAIL", "LOLA SEO <lola@tyalexandermedia.com>")

class AuditRequest(BaseModel):
    business_name: str
    website: str
    city: str
    business_type: str = "contractor"
    email: str

# ── REVENUE CALCULATOR ──────────────────────────────────────

JOB_VALUES = {
    "soft wash": 500,
    "pressure wash": 450,
    "hvac": 650,
    "roofing": 8000,
    "plumbing": 400,
    "electrical": 500,
    "landscaping": 350,
    "contractor": 500,
    "restaurant": 75,
    "salon": 150,
    "medical": 300,
    "default": 500
}

def calculate_revenue_leak(business_type: str, score: int) -> dict:
    job_value = JOB_VALUES.get(business_type.lower(), 500)
    
    if score >= 90:
        missed_calls = 3
    elif score >= 80:
        missed_calls = 8
    elif score >= 70:
        missed_calls = 15
    elif score >= 60:
        missed_calls = 25
    elif score >= 50:
        missed_calls = 40
    else:
        missed_calls = 60
    
    monthly_leak = missed_calls * job_value
    annual_leak = monthly_leak * 12
    
    improved_score = min(score + 25, 100)
    if improved_score >= 90:
        improved_calls = 3
    elif improved_score >= 80:
        improved_calls = 8
    elif improved_score >= 70:
        improved_calls = 15
    elif improved_score >= 60:
        improved_calls = 25
    elif improved_score >= 50:
        improved_calls = 40
    else:
        improved_calls = 60
    
    improved_leak = improved_calls * job_value
    recovery_potential = monthly_leak - improved_leak
    
    return {
        "monthly_leak": int(monthly_leak),
        "annual_leak": int(annual_leak),
        "missed_calls_per_month": missed_calls,
        "avg_job_value": int(job_value),
        "recovery_potential": int(recovery_potential),
        "recovery_calls": int(recovery_potential / job_value) if job_value > 0 else 0,
        "payback_months": max(1, int(7200 / (recovery_potential / 12))) if recovery_potential > 0 else 0
    }

def get_grade(score: int) -> tuple:
    if score >= 90:
        return "A", "🏆 Best in Show"
    elif score >= 80:
        return "B", "✅ Solid Foundation"
    elif score >= 70:
        return "C", "🐾 Needs Work"
    elif score >= 60:
        return "D", "⚠️ Needs Training"
    else:
        return "F", "🚨 Off the Leash"

# ── GOOGLE APIs ──────────────────────────────────────────────

async def get_page_speed(website: str) -> dict:
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
        
        return {"ok": True, "performance": performance, "accessibility": accessibility, "seo": seo}
    except Exception as e:
        print(f"PageSpeed error: {e}")
        return {"ok": False, "performance": 50, "accessibility": 50, "seo": 50}

async def get_safe_browsing(website: str) -> dict:
    if not GOOGLE_SAFE_BROWSING_KEY:
        return {"ok": False, "is_safe": True}
    
    try:
        url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
        payload = {
            "client": {"clientId": "lola-seo", "clientVersion": "3.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": website}]
            }
        }
        response = requests.post(url, json=payload, params={"key": GOOGLE_SAFE_BROWSING_KEY}, timeout=10)
        data = response.json()
        is_safe = len(data.get("matches", [])) == 0
        return {"ok": True, "is_safe": is_safe}
    except Exception as e:
        print(f"Safe Browsing error: {e}")
        return {"ok": False, "is_safe": True}

async def get_business_info(business_name: str, city: str) -> dict:
    if not GOOGLE_PLACES_KEY:
        return {
            "ok": False,
            "name": business_name,
            "address": "",
            "phone": "",
            "website": "",
            "rating": 0,
            "review_count": 0,
            "business_status": None,
            "place_id": None,
            "place_url": None,
            "verified": None,
            "verification_confidence": "low",
        }

    try:
        find_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        find_params = {
            "input": f"{business_name} {city}",
            "inputtype": "textquery",
            "key": GOOGLE_PLACES_KEY,
            "fields": "place_id,formatted_address,formatted_phone_number,name,rating,user_ratings_total,business_status",
        }
        response = requests.get(find_url, params=find_params, timeout=10)
        data = response.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return {
                "ok": False,
                "name": business_name,
                "address": "",
                "phone": "",
                "website": "",
                "rating": 0,
                "review_count": 0,
                "business_status": None,
                "place_id": None,
                "place_url": None,
                "verified": None,
                "verification_confidence": "low",
            }

        place = candidates[0]
        place_id = place.get("place_id")

        details_url = "https://maps.googleapis.com/maps/api/place/details/json"
        details_params = {
            "place_id": place_id,
            "key": GOOGLE_PLACES_KEY,
            "fields": ",".join([
                "name",
                "formatted_address",
                "formatted_phone_number",
                "website",
                "rating",
                "user_ratings_total",
                "business_status",
                "opening_hours",
                "photos",
                "reviews",
                "url",
                "permanently_closed",
                "types",
            ]),
        }
        details_response = requests.get(details_url, params=details_params, timeout=10)
        details = details_response.json().get("result", {})

        if not details:
            return {
                "ok": False,
                "name": business_name,
                "address": "",
                "phone": "",
                "website": "",
                "rating": 0,
                "review_count": 0,
                "business_status": None,
                "place_id": place_id,
                "place_url": None,
                "verified": None,
                "verification_confidence": "low",
            }

        has_website = bool(details.get("website"))
        has_hours = bool(details.get("opening_hours"))
        photo_count = len(details.get("photos", []))
        has_photos = photo_count > 0
        review_count = details.get("user_ratings_total", 0)
        has_reviews = review_count > 0
        has_address = bool(details.get("formatted_address"))
        has_phone = bool(details.get("formatted_phone_number"))

        completeness_signals = sum([
            has_website,
            has_hours,
            has_photos,
            has_reviews,
            has_address,
            has_phone,
        ])

        if completeness_signals >= 5:
            verification_confidence = "high"
        elif completeness_signals >= 3:
            verification_confidence = "medium"
        else:
            verification_confidence = "low"

        return {
            "ok": True,
            "name": details.get("name", business_name),
            "address": details.get("formatted_address", ""),
            "phone": details.get("formatted_phone_number", ""),
            "website": details.get("website", ""),
            "rating": details.get("rating", 0),
            "review_count": review_count,
            "business_status": details.get("business_status"),
            "place_id": place_id,
            "place_url": details.get("url"),
            "verified": None,
            "verification_confidence": verification_confidence,
        }
    except Exception as e:
        print(f"Places error: {e}")
        return {
            "ok": False,
            "name": business_name,
            "address": "",
            "phone": "",
            "website": "",
            "rating": 0,
            "review_count": 0,
            "business_status": None,
            "place_id": None,
            "place_url": None,
            "verified": None,
            "verification_confidence": "low",
        }

async def get_competitors(business_type: str, city: str) -> List[dict]:
    if not GOOGLE_CUSTOM_SEARCH_KEY or not GOOGLE_CUSTOM_SEARCH_CX:
        return []
    
    try:
        keywords = {
            "soft wash": f"soft wash {city}",
            "pressure wash": f"pressure washing {city}",
            "hvac": f"HVAC {city}",
            "roofing": f"roofing {city}",
            "plumbing": f"plumber {city}",
            "electrical": f"electrician {city}",
            "landscaping": f"landscaping {city}",
            "contractor": f"contractor {city}",
        }
        keyword = keywords.get(business_type.lower(), f"{business_type} {city}")
        
        url = "https://www.googleapis.com/customsearch/v1"
        params = {"q": keyword, "key": GOOGLE_CUSTOM_SEARCH_KEY, "cx": GOOGLE_CUSTOM_SEARCH_CX, "num": 5}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        competitors = []
        for i, item in enumerate(data.get("items", [])[:5], 1):
            competitors.append({"rank": i, "title": item.get("title", ""), "url": item.get("link", ""), "snippet": item.get("snippet", "")})
        return competitors
    except Exception as e:
        print(f"Competitors error: {e}")
        return []

# ── SCORING ──────────────────────────────────────────────────

def calculate_total_score(page_speed: int, accessibility: int, seo_score: int, is_safe: bool, business_info: dict) -> int:
    score = 0
    score += (page_speed / 100) * 25
    score += (accessibility / 100) * 15
    score += (seo_score / 100) * 20
    score += 10 if is_safe else 0
    
    local_score = 0
    if business_info.get("address"):
        local_score += 10
    if business_info.get("phone"):
        local_score += 10

    verification_confidence = business_info.get("verification_confidence")
    if verification_confidence == "high":
        local_score += 5
    elif verification_confidence == "medium":
        local_score += 3
    elif verification_confidence == "low":
        local_score += 1

    if business_info.get("rating", 0) > 0:
        local_score += 5
    score += local_score
    
    return min(int(score), 100)

# ── BREVO ────────────────────────────────────────────────────

def send_to_brevo(email: str, business_name: str, city: str, business_type: str, total_score: int, revenue_leak: dict, grade: str, grade_label: str) -> bool:
    if not BREVO_API_KEY:
        return False
    
    try:
        url = "https://api.brevo.com/v3/contacts"
        headers = {"api-key": BREVO_API_KEY, "Content-Type": "application/json"}
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
                "PAYBACK_MONTHS": revenue_leak.get("payback_months", 0),
                "AUDIT_SOURCE": "lola_seo",
                "AUDIT_DATE": datetime.now().isoformat()
            },
            "listIds": [int(BREVO_LIST_ID)],
            "updateEnabled": True
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"Brevo error: {e}")
        return False


def send_audit_email(to_email: str, total_score: int, grade: str, monthly_leak: int) -> bool:
    if not RESEND_API_KEY:
        print("Resend skipped: RESEND_API_KEY is not configured.")
        return False

    subject = "Your Lola SEO Audit Results"
    body = (
        f"Hello,\n\n"
        f"Your Lola SEO audit is complete.\n"
        f"Score: {total_score}\n"
        f"Grade: {grade}\n"
        f"Estimated monthly revenue leak: ${monthly_leak}\n\n"
        f"Thank you,\n"
        f"LOLA SEO"
    )

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            json={
                "from":    AUDIT_FROM_EMAIL,
                "to":      [to_email],
                "subject": subject,
                "text":    body,
            },
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
            timeout=10,
        )
        print(f"Resend send status: {response.status_code} → {to_email}")
        if 200 <= response.status_code < 300:
            return True
        print(f"Resend error body: {response.text}")
        return False
    except Exception:
        print("Resend exception:")
        traceback.print_exc()
        return False

# ── MAIN ENDPOINT ────────────────────────────────────────────

@app.post("/audit")
async def audit(request: AuditRequest):
    website = request.website
    if not website.startswith("http"):
        website = "https://" + website
    
    print(f"🐾 AUDIT: {request.business_name} ({request.city})")
    
    try:
        page_speed_task = get_page_speed(website)
        safe_browsing_task = get_safe_browsing(website)
        business_info_task = get_business_info(request.business_name, request.city)
        competitors_task = get_competitors(request.business_type, request.city)
        
        page_speed_result, safe_browsing_result, business_info_result, competitors = await asyncio.gather(
            page_speed_task, safe_browsing_task, business_info_task, competitors_task
        )
        
        total_score = calculate_total_score(
            page_speed_result.get("performance", 50),
            page_speed_result.get("accessibility", 50),
            page_speed_result.get("seo", 50),
            safe_browsing_result.get("is_safe", True),
            business_info_result
        )
        
        revenue_leak = calculate_revenue_leak(request.business_type, total_score)
        grade, grade_label = get_grade(total_score)
        audit_id = str(uuid.uuid4())
        
        business_info_result["verification_confidence_description"] = (
            "This score reflects how complete the Google listing profile appears "
            "based on visible signals like website, hours, photos, reviews, "
            "address, and phone. It is a profile completeness signal, not direct "
            "confirmation of owner verification by Google."
        )
        
        send_to_brevo(request.email, request.business_name, request.city, request.business_type, total_score, revenue_leak, grade, grade_label)

        audit_response = {
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
            "safety": {"is_safe": safe_browsing_result.get("is_safe", True)},
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

        email_sent = send_audit_email(
            request.email,
            total_score,
            grade,
            revenue_leak.get("monthly_leak", 0),
        )
        if email_sent:
            print(f"Resend audit email sent to {request.email}")
        else:
            print(f"Resend audit email not sent for {request.email}")

        return audit_response
    except Exception as e:
        print(f"❌ ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "has_keys": bool(GOOGLE_PAGESPEED_KEY and BREVO_API_KEY)}

@app.get("/")
async def root():
    return {"name": "Lola SEO", "version": "3.0", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
