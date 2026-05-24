"""
Review-capture API.

Mounted under /reviews. Two surfaces:

  Admin (X-Admin-Key required, matches LOLA_SECRET_ADMIN_KEY):
    POST   /reviews/businesses          create or upsert a managed business
    GET    /reviews/businesses          list all businesses
    GET    /reviews/businesses/{id}     single business
    POST   /reviews/request             send a review-request email NOW
    GET    /reviews/requests            recent review requests (admin view)

  Public (no auth):
    GET    /reviews/r/{request_id}/config     used by the feedback page on load
    POST   /reviews/r/{request_id}/rating     customer taps 1-5 stars
    POST   /reviews/r/{request_id}/feedback   customer submits private text

Routing rule: rating >= 4 → google. rating <= 3 → private. We always include
the Google URL in the rating response so the negative-feedback page can still
offer "leave a Google review anyway" — required for Google's review-gating
policy compliance.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field, field_validator

from db.reviews import (
    create_review_request,
    get_business,
    get_review_request,
    list_businesses,
    list_review_requests,
    mark_opened,
    record_feedback,
    record_rating,
    upsert_business,
)
from reviews.emails import (
    send_customer_request_email,
    send_owner_feedback_email,
)
from reviews.sms import send_sms_review_request, twilio_enabled


router = APIRouter(prefix="/reviews", tags=["reviews"])


# ── Auth dependency ────────────────────────────────────────


def require_admin_key(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
) -> None:
    """Match the pattern used by /leads + /admin/founding-signup in main.py."""
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Helpers ────────────────────────────────────────────────


def _public_base_url() -> str:
    return os.getenv(
        "REVIEWS_PUBLIC_BASE_URL", "https://lola.tyalexandermedia.com"
    ).rstrip("/")


def _feedback_url(request_id: str) -> str:
    return f"{_public_base_url()}/lp/feedback?id={request_id}"


def _google_review_url(business: dict) -> str:
    override = (business.get("google_review_url") or "").strip()
    if override:
        return override
    pid = business.get("google_place_id", "")
    return f"https://search.google.com/local/writereview?placeid={pid}"


# ── Pydantic models ────────────────────────────────────────


# Lightweight email check — avoids pulling in pydantic[email]/email-validator
# as a new dependency. Matches the project's existing email handling style
# (audit endpoints take plain str for email too).
_EMAIL_RE = __import__("re").compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    v = v.strip()
    if not _EMAIL_RE.match(v):
        raise ValueError("invalid email address")
    return v


class BusinessIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    name: str = Field(..., min_length=1)
    industry: Optional[
        Literal["contractor", "med_spa", "dentist", "home_service", "other"]
    ] = None
    google_place_id: str = Field(..., min_length=1)
    google_review_url: Optional[str] = None
    owner_email: str
    owner_phone: Optional[str] = None
    brand_primary_color: Optional[str] = None
    logo_url: Optional[str] = None

    @field_validator("owner_email")
    @classmethod
    def _ck_owner_email(cls, v: str) -> str:
        out = _validate_email(v)
        if not out:
            raise ValueError("owner_email is required")
        return out


class ReviewRequestIn(BaseModel):
    business_id: str = Field(..., min_length=1)
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    channel: Literal["email", "sms"] = "email"

    @field_validator("customer_email")
    @classmethod
    def _ck_customer_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class RatingIn(BaseModel):
    rating: int = Field(..., ge=1, le=5)


class FeedbackIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    contact_back: bool = False


# ── Admin: businesses ──────────────────────────────────────


@router.post(
    "/businesses",
    status_code=201,
    dependencies=[Depends(require_admin_key)],
)
async def admin_create_business(body: BusinessIn):
    row = await upsert_business(
        id=body.id,
        name=body.name,
        industry=body.industry,
        google_place_id=body.google_place_id,
        google_review_url=body.google_review_url,
        owner_email=body.owner_email,
        owner_phone=body.owner_phone,
        brand_primary_color=body.brand_primary_color,
        logo_url=body.logo_url,
    )
    return row


@router.get("/businesses", dependencies=[Depends(require_admin_key)])
async def admin_list_businesses():
    return {"businesses": await list_businesses()}


@router.get(
    "/businesses/{business_id}", dependencies=[Depends(require_admin_key)]
)
async def admin_get_business(business_id: str):
    biz = await get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return biz


# ── Admin: send a review request ───────────────────────────


@router.post(
    "/request", status_code=201, dependencies=[Depends(require_admin_key)]
)
async def admin_send_review_request(body: ReviewRequestIn):
    biz = await get_business(body.business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    if body.channel == "email" and not body.customer_email:
        raise HTTPException(
            status_code=400,
            detail="customer_email is required when channel is 'email'",
        )
    if body.channel == "sms":
        if not twilio_enabled():
            raise HTTPException(status_code=400, detail="SMS not enabled")
        if not body.customer_phone:
            raise HTTPException(
                status_code=400,
                detail="customer_phone is required when channel is 'sms'",
            )

    request_id = uuid.uuid4().hex
    await create_review_request(
        request_id=request_id,
        business_id=body.business_id,
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        customer_phone=body.customer_phone,
        channel=body.channel,
    )

    feedback_url = _feedback_url(request_id)
    sent = False
    if body.channel == "email":
        sent = await send_customer_request_email(
            to_email=body.customer_email,
            business_name=biz["name"],
            owner_email=biz["owner_email"],
            customer_name=body.customer_name,
            feedback_url=feedback_url,
            brand_color=biz.get("brand_primary_color") or "#0a66c2",
            logo_url=biz.get("logo_url"),
        )
    else:
        # Stub raises NotImplementedError — visible codepath, no silent no-op.
        sent = await send_sms_review_request(
            to_phone=body.customer_phone,
            business_name=biz["name"],
            feedback_url=feedback_url,
            customer_name=body.customer_name,
        )

    return {
        "request_id": request_id,
        "feedback_url": feedback_url,
        "channel": body.channel,
        "sent": sent,
    }


@router.get("/requests", dependencies=[Depends(require_admin_key)])
async def admin_list_review_requests(
    business_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    rows = await list_review_requests(business_id=business_id, limit=limit)
    return {"requests": rows}


# ── Public: feedback page lifecycle ────────────────────────


@router.get("/r/{request_id}/config")
async def public_config(request_id: str):
    req = await get_review_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    biz = await get_business(req["business_id"])
    if not biz:
        # Orphaned request — treat as not found to avoid leaking business state.
        raise HTTPException(status_code=404, detail="Request not found")

    already_responded = req.get("rating") is not None

    # First-touch open stamp.
    await mark_opened(request_id)

    return {
        "business": {
            "name": biz["name"],
            "brand_primary_color": biz.get("brand_primary_color") or "#0a66c2",
            "logo_url": biz.get("logo_url"),
            "industry": biz.get("industry"),
        },
        "google_review_url": _google_review_url(biz),
        "already_responded": already_responded,
    }


@router.post("/r/{request_id}/rating")
async def public_rating(request_id: str, body: RatingIn):
    req = await get_review_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    biz = await get_business(req["business_id"])
    if not biz:
        raise HTTPException(status_code=404, detail="Request not found")

    routed = "google" if body.rating >= 4 else "private"
    await record_rating(request_id, body.rating, routed)

    return {
        "routed": routed,
        # Always returned — even on negative paths — for Google policy compliance
        # ("leave a Google review anyway" option).
        "google_review_url": _google_review_url(biz),
    }


@router.post("/r/{request_id}/feedback", status_code=204)
async def public_feedback(request_id: str, body: FeedbackIn):
    req = await get_review_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    biz = await get_business(req["business_id"])
    if not biz:
        raise HTTPException(status_code=404, detail="Request not found")

    await record_feedback(request_id, body.message)

    # Best-effort owner notify. Don't fail the customer's POST if Resend hiccups.
    timestamp = datetime.now(timezone.utc).isoformat()
    rating = int(req.get("rating") or 0)
    await send_owner_feedback_email(
        owner_email=biz["owner_email"],
        business_name=biz["name"],
        customer_name=req.get("customer_name"),
        customer_email=req.get("customer_email"),
        customer_phone=req.get("customer_phone"),
        rating=rating,
        message=body.message,
        contact_back=body.contact_back,
        timestamp=timestamp,
    )
    return Response(status_code=204)
