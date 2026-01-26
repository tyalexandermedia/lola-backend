from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, HttpUrl, validator
from typing import Optional, List
from datetime import datetime
import os
import json
from sqlmodel import Session, select

from models import Lead, create_db_and_tables, get_session
from audit_engine import run_seo_audit
from email_service import send_audit_email, send_owner_notification
from config import settings

app = FastAPI(title="Lola SEO Audit API", version="1.0.0")

# CORS Configuration
origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup: Create database
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    print("✅ Database initialized")
    print(f"✅ CORS enabled for: {origins}")


# Request/Response Models
class AuditRequest(BaseModel):
    name: str
    email: EmailStr
    website: HttpUrl
    business_type: str
    location: str
    notes: Optional[str] = None

    @validator('name', 'business_type', 'location')
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()


class AuditResponse(BaseModel):
    lead_id: str
    summary: str
    scores: dict
    findings: List[dict]
    quick_wins: List[str]
    thirty_day_plan: List[str]
    disclaimer: str


# Admin authentication
def verify_admin_key(x_admin_key: str = Header(None)):
    if not settings.ADMIN_KEY:
        raise HTTPException(status_code=500, detail="Admin key not configured")
    if x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "service": "Lola SEO Audit API", "timestamp": datetime.utcnow().isoformat()}


@app.post("/audit", response_model=AuditResponse)
async def create_audit(request: AuditRequest, session: Session = Depends(get_session)):
    """
    Main audit endpoint - analyzes website and returns SEO findings
    """
    try:
        # Run SEO audit
        print(f"🔍 Starting audit for {request.website}")
        audit_results = run_seo_audit(
            website=str(request.website),
            business_type=request.business_type,
            location=request.location
        )
        
        # Create lead record
        lead = Lead(
            name=request.name,
            email=request.email,
            website=str(request.website),
            business_type=request.business_type,
            location=request.location,
            notes=request.notes,
            audit_json=json.dumps(audit_results)
        )
        
        session.add(lead)
        session.commit()
        session.refresh(lead)
        
        print(f"✅ Lead saved with ID: {lead.id}")
        
        # Send emails (non-blocking, failures won't crash the API)
        try:
            if settings.SENDGRID_API_KEY:
                send_audit_email(
                    to_email=request.email,
                    name=request.name,
                    audit_results=audit_results
                )
                print(f"📧 Audit email sent to {request.email}")
                
                if settings.OWNER_EMAIL:
                    send_owner_notification(
                        owner_email=settings.OWNER_EMAIL,
                        lead_data={
                            "name": request.name,
                            "email": request.email,
                            "website": str(request.website),
                            "business_type": request.business_type,
                            "location": request.location
                        }
                    )
                    print(f"📧 Owner notification sent to {settings.OWNER_EMAIL}")
        except Exception as email_error:
            print(f"⚠️ Email sending failed (non-critical): {email_error}")
        
        # Return structured response
        return AuditResponse(
            lead_id=str(lead.id),
            summary=audit_results["summary"],
            scores=audit_results["scores"],
            findings=audit_results["findings"],
            quick_wins=audit_results["quick_wins"],
            thirty_day_plan=audit_results["30_day_plan"],
            disclaimer=audit_results["disclaimer"]
        )
        
    except Exception as e:
        print(f"❌ Audit failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")


@app.get("/leads")
async def get_leads(
    session: Session = Depends(get_session),
    admin_verified: bool = Depends(verify_admin_key)
):
    """
    Admin endpoint - returns last 50 leads with masked emails
    """
    statement = select(Lead).order_by(Lead.created_at.desc()).limit(50)
    leads = session.exec(statement).all()
    
    # Mask emails for privacy
    def mask_email(email: str) -> str:
        parts = email.split("@")
        if len(parts) != 2:
            return email
        username, domain = parts
        if len(username) <= 2:
            masked_user = username[0] + "*"
        else:
            masked_user = username[0] + "*" * (len(username) - 2) + username[-1]
        return f"{masked_user}@{domain}"
    
    return {
        "total": len(leads),
        "leads": [
            {
                "id": lead.id,
                "name": lead.name,
                "email": mask_email(lead.email),
                "website": lead.website,
                "business_type": lead.business_type,
                "location": lead.location,
                "created_at": lead.created_at.isoformat(),
                "has_audit": bool(lead.audit_json)
            }
            for lead in leads
        ]
    }


@app.get("/")
async def root():
    """API information"""
    return {
        "service": "Lola SEO Audit API",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health",
            "audit": "POST /audit",
            "leads": "GET /leads (requires X-ADMIN-KEY header)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
