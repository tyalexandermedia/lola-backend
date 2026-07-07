"""
Review-capture API.

Mounted under /reviews. Three surfaces:

  Admin (X-Admin-Key required, matches LOLA_SECRET_ADMIN_KEY):
    POST   /reviews/businesses          create or upsert a managed business
    GET    /reviews/businesses          list all businesses (with share payload)
    GET    /reviews/businesses/{id}     single business (with share payload)
    POST   /reviews/request             send a review-request email NOW
    GET    /reviews/requests            recent review requests (admin view)

  Per-customer public (no auth — tied to a specific outbound request):
    GET    /reviews/r/{request_id}/config     used by the feedback page on load
    POST   /reviews/r/{request_id}/rating     customer taps 1-5 stars
    POST   /reviews/r/{request_id}/feedback   customer submits private text

  Per-business public (no auth — for QR / in-store / shareable links):
    GET    /reviews/businesses/{id}/qr.svg    QR pointing at the public review URL
    GET    /reviews/b/{business_id}/config    feedback page boot (no tracking)
    POST   /reviews/b/{business_id}/rating    creates the request row on engagement,
                                              returns request_id for follow-up feedback

Routing rule: rating >= 4 → google. rating <= 3 → private. We always include
the Google URL in the rating response so the negative-feedback page can still
offer "leave a Google review anyway" — required for Google's review-gating
policy compliance.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from urllib.parse import urlparse

import httpx
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
from reviews.qr import make_qr_svg
from reviews.sms import send_sms_review_request, twilio_enabled
from api_clients.google_apis import ApiBudget, get_business_info


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


def _public_review_url(business_id: str) -> str:
    """Untracked per-business URL — what the QR code encodes."""
    return f"{_public_base_url()}/lp/feedback?b={business_id}"


def _qr_url(business_id: str) -> str:
    return f"{_public_base_url()}/reviews/businesses/{business_id}/qr.svg"


def _sms_template(business_name: str, link: str) -> str:
    """Short, copy-pasteable SMS body for owners to text from their own phone
    (Google Voice, iMessage, WhatsApp). Coach Ty plain voice."""
    return (
        f"Hey it's {business_name} — would you take 30 seconds to share how "
        f"we did? {link}\n\nReply STOP to opt out."
    )


def _share_payload(business: dict) -> dict:
    """The 'give-it-away' surface: everything an owner needs to start
    collecting reviews without any platform integration."""
    bid = business["id"]
    link = _public_review_url(bid)
    return {
        "public_review_url": link,
        "qr_svg_url": _qr_url(bid),
        "sms_template": _sms_template(business["name"], link),
    }


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


def _with_share(business: dict) -> dict:
    return {**business, "share": _share_payload(business)}


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
    return _with_share(row)


@router.get("/businesses", dependencies=[Depends(require_admin_key)])
async def admin_list_businesses():
    rows = await list_businesses()
    return {"businesses": [_with_share(b) for b in rows]}


@router.get(
    "/businesses/{business_id}", dependencies=[Depends(require_admin_key)]
)
async def admin_get_business(business_id: str):
    biz = await get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return _with_share(biz)


# ── Public: per-business QR (no auth — QR encodes a public URL) ────


@router.get("/businesses/{business_id}/qr.svg")
async def public_business_qr(business_id: str):
    biz = await get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    svg = make_qr_svg(_public_review_url(business_id))
    return Response(
        content=svg,
        media_type="image/svg+xml",
        # Cache an hour — business name/branding doesn't change often, and
        # the encoded URL is stable per business_id.
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ── Public: per-business feedback flow (QR / shareable link) ───────


@router.get("/b/{business_id}/config")
async def public_business_config(business_id: str):
    """Boots the feedback page in untracked mode. No DB write — we only create
    a review_requests row when the user actually engages (taps a star)."""
    biz = await get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return {
        "business": {
            "name": biz["name"],
            "brand_primary_color": biz.get("brand_primary_color") or "#0a66c2",
            "logo_url": biz.get("logo_url"),
            "industry": biz.get("industry"),
        },
        "google_review_url": _google_review_url(biz),
        "already_responded": False,
    }


@router.post("/b/{business_id}/rating")
async def public_business_rating(business_id: str, body: RatingIn):
    """Creates the review_requests row at engagement time and records the
    rating. Returns the new request_id so the frontend can POST private
    feedback to the existing /reviews/r/{id}/feedback endpoint."""
    biz = await get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    request_id = uuid.uuid4().hex
    await create_review_request(
        request_id=request_id,
        business_id=business_id,
        customer_name=None,
        customer_email=None,
        customer_phone=None,
        channel="qr",
    )
    routed = "google" if body.rating >= 4 else "private"
    await record_rating(request_id, body.rating, routed)

    return {
        "request_id": request_id,
        "routed": routed,
        "google_review_url": _google_review_url(biz),
    }


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


# ── Admin: lookup business by website (Places autofill) ────


def _domain_query(website: str) -> str:
    """Extract a Places-friendly text query from any URL/domain the user pastes.

    sandbarsoftwash.com           → 'sandbarsoftwash'
    https://www.sandbarsoftwash.com/services → 'sandbarsoftwash'
    """
    if not website or not website.strip():
        return ""
    raw = website.strip()
    if "://" not in raw:
        raw = "https://" + raw
    host = (urlparse(raw).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    parts = host.split(".")
    if len(parts) >= 2:
        return parts[-2]
    return host


@router.post("/lookup-business", dependencies=[Depends(require_admin_key)])
async def admin_lookup_business(website: str = Query(..., min_length=3)):
    """Resolve a website to a Google Places match so the admin UI can autofill
    name + place_id + phone + address. One Places API call per lookup."""
    query = _domain_query(website)
    if not query:
        raise HTTPException(status_code=400, detail="Invalid website URL")

    print(f"[reviews.lookup] website={website!r} query={query!r}")

    async with httpx.AsyncClient() as client:
        budget = ApiBudget(2)
        info = await get_business_info(client, query, "", budget)

    if not info.get("ok") or not info.get("place_id"):
        raise HTTPException(
            status_code=404, detail="No Google Places match for that website"
        )

    return {
        "name": info["name"],
        "place_id": info["place_id"],
        "phone": info.get("phone", ""),
        "address": info.get("address", ""),
        "website": info.get("website", "") or website,
        "place_url": info.get("place_url"),
        "primary_category": info.get("primary_category"),
        "rating": info.get("rating", 0),
        "review_count": info.get("review_count", 0),
        "verification_confidence": info.get("verification_confidence", "low"),
    }


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
