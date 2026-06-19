"""
Lead-gen generator router.

Takes a contractor's URL + service type, returns a complete starter system:
landing page copy, 3-email follow-up sequence, 3 Facebook ad variants,
tracking/ROI setup, and an implementation checklist.

All five components are generated in parallel via Claude Opus 4.7 over
async httpx so the event loop isn't blocked.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/lead-gen", tags=["lead-gen"])

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
LEADGEN_MODEL = os.getenv("LEADGEN_MODEL", "claude-opus-4-7").strip()


@router.get("/health")
async def lead_gen_health():
    """
    Lightweight liveness probe for the lead-gen router.
    Returns which env vars are set so you can confirm Railway has the right config
    without exposing secret values.  Call:
        curl https://lola-backend.up.railway.app/lead-gen/health
    """
    return {
        "ok": True,
        "env": {
            "ANTHROPIC_API_KEY": bool(ANTHROPIC_API_KEY),
            "GA4_MEASUREMENT_ID": bool(GA4_MEASUREMENT_ID),
            "GA4_API_SECRET": bool(GA4_API_SECRET),
        },
    }

# GA4 Measurement Protocol — sends server-side conversion events (leads +
# calls) into GA4 so they show up alongside web analytics. No-op until both
# env vars are set on Railway, so the webhooks keep working regardless.
GA4_MEASUREMENT_ID = (os.getenv("GA4_MEASUREMENT_ID") or "").strip() or None
GA4_API_SECRET = (os.getenv("GA4_API_SECRET") or "").strip() or None


async def _ga4_event(
    name: str, params: dict, client_id: Optional[str] = None
) -> None:
    """Fire a single GA4 event via the Measurement Protocol. Best-effort:
    swallows all errors so a tracking hiccup never affects the lead flow."""
    if not GA4_MEASUREMENT_ID or not GA4_API_SECRET:
        return
    payload = {
        "client_id": client_id or uuid.uuid4().hex,
        "events": [{"name": name, "params": params}],
    }
    url = (
        "https://www.google-analytics.com/mp/collect"
        f"?measurement_id={GA4_MEASUREMENT_ID}&api_secret={GA4_API_SECRET}"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(url, json=payload)
    except Exception:
        pass


class LeadGenRequest(BaseModel):
    business_url: str
    service_type: str = "roof cleaning, house washing, soft wash"
    business_name: str = ""


class LeadGenResponse(BaseModel):
    landing_page: str
    emails: str
    ads: str
    tracking: str
    checklist: str
    status: str


async def _claude(prompt: str, max_tokens: int) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json={
                "model": LEADGEN_MODEL,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Claude returned HTTP {resp.status_code}: {resp.text[:200]}",
        )
    data = resp.json()
    text = ""
    for block in data.get("content", []) or []:
        if block.get("type") == "text":
            text += block.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="Empty response from Claude")
    return text


@router.post("/generate", response_model=LeadGenResponse)
async def generate_lead_gen_system(request: LeadGenRequest) -> LeadGenResponse:
    """
    Generate complete lead-gen starter pack for a contractor.
    Returns landing page + 3-email sequence + ads + tracking + checklist.
    """
    try:
        landing_page, emails, ads, tracking, checklist = await asyncio.gather(
            _generate_landing_page(request.business_url, request.service_type),
            _generate_email_sequence(request.business_url, request.service_type),
            _generate_ad_copy(request.business_url, request.service_type),
            _generate_tracking_setup(request.business_url),
            _generate_checklist(request.business_url),
        )
        return LeadGenResponse(
            landing_page=landing_page,
            emails=emails,
            ads=ads,
            tracking=tracking,
            checklist=checklist,
            status="generated",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_landing_page(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a conversion copywriter for a contractor business.

Business: {business_url}
Services: {service_type}
Offer: FREE INSPECTION

Generate landing page copy for a free inspection offer landing page.

Output sections (use these exact headers):

## HERO SECTION
[Headline + Subheadline - problem/solution focused]

## VALUE PROPOSITION
[2-3 paragraphs explaining what the inspection includes and why it matters]

## 3 BENEFIT BULLETS
[3 specific benefits with outcomes - use checkmarks]

## SOCIAL PROOF
[2 short customer testimonials (2-3 sentences each)]

## FORM FIELDS
[List the form fields: First Name | Phone | Email | Best Time to Call | Specific Question]

## CTA COPY
[Copy for the submit button and post-form confirmation message]

Keep copy:
- Conversion-focused
- Direct, no fluff
- Problem -> Solution -> CTA
- Copy-paste ready for Wix
- Under 500 total words""",
        max_tokens=1500,
    )


async def _generate_email_sequence(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a direct-response email copywriter for a contractor.

Business: {business_url}
Services: {service_type}

Write a 3-email follow-up sequence for leads who submit the free inspection form.

Requirements for all emails:
- Under 150 words each
- Direct, no BS, no corporate speak
- Include 1 CTA per email
- Written in first person as business owner (authentic, contractor voice)
- Conversational tone

EMAIL 1 (Same day): Confirmation + Value
- Subject line
- Confirm inspection booking
- Preview what they'll learn
- Build anticipation

EMAIL 2 (Day 3 if no response): Social Proof
- Subject line
- Share case study/success story (real number: $X cleaning vs $Y replacement)
- Show they're not alone
- Light urgency

EMAIL 3 (Day 7 if still no response): Final Pitch
- Subject line
- Mention retention program / retainer option
- Emphasize protection/prevention
- Final CTA

Format as:

## EMAIL 1: [Subject Line]
[Body]

## EMAIL 2: [Subject Line]
[Body]

## EMAIL 3: [Subject Line]
[Body]""",
        max_tokens=1500,
    )


async def _generate_ad_copy(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a Facebook ad copywriter for a contractor.

Business: {business_url}
Services: {service_type}
Offer: FREE INSPECTION
Target: Homeowners 35-65, local area
Ad Budget: $50 test spend

Generate 3 Facebook ad copy variants (not carousel, single image ads).

Each ad must be:
- 2-3 short sentences max
- Action-oriented, conversational
- Direct, no fluff
- Include primary benefit/pain point
- Start with hook

Format:

## AD VARIANT 1: [Headline Theme - e.g., "Urgency", "Problem", "Social Proof"]
[Ad body - 2-3 sentences]

## AD VARIANT 2: [Headline Theme]
[Ad body]

## AD VARIANT 3: [Headline Theme]
[Ad body]

Then add:

## AD TARGETING
- Age: 35-65
- Location: [Local area - Pinellas, Pasco, Hillsborough, Manatee counties for Tampa Bay]
- Interests: Home improvement, real estate, contractors, property maintenance
- Exclusions: Competitors (if applicable)
- Budget: $50 test spend

## EXPECTED METRICS
- Cost per lead: $10-15
- Leads from $50 budget: 3-5
- Conversion rate (lead -> inspection): 20-30%

## SCALING RULES
- If CPC > $15: Pause and test new creative
- If CPC < $10: Scale budget by 25% weekly
- Pause any ad with CTR < 1%""",
        max_tokens=800,
    )


async def _generate_tracking_setup(business_url: str) -> str:
    return await _claude(
        prompt=f"""You are a conversion optimization consultant.

Business: {business_url}

Create a COMPLETE tracking and measurement system for their lead generation campaign (free inspection offer).

Provide:

## METRICS TO TRACK
List 10 key metrics:
1. [Metric name]
2. [Metric name]
... (explain how to track each)

## GOOGLE SHEETS TEMPLATE
Provide CSV-format table headers for daily tracking:
Date | Page Views | Form Submissions | Phone Calls | Inspections Booked | Customers Closed | Revenue | Ad Spend | Cost Per Lead | ROI

## ROI CALCULATION FORMULA
Show the formula:
ROI = (Customers x Average Service Price - Total Ad Spend) / Total Ad Spend x 100

Include example calculation.

## 30-DAY MEASUREMENT PLAN

Week 1: [What to track]
Week 2: [What to optimize]
Week 3: [What to test]
Week 4: [Scale or pivot decision]

## SCALING DECISION FRAMEWORK

IF cost per lead > $15 -> [Action]
IF cost per lead < $10 -> [Action]
IF conversion rate < 20% -> [Action]
IF conversion rate > 40% -> [Action]

## SUCCESS TARGETS (30 days)
- Page views: 100+
- Form submissions: 5-10
- Inspections booked: 3-5
- Customers: 1-3
- Revenue: $600-1,800
- ROI: 1,000%+ (on $50 ad spend)""",
        max_tokens=1200,
    )


async def _generate_checklist(business_url: str) -> str:
    return await _claude(
        prompt=f"""Create a step-by-step implementation checklist for {business_url}'s lead generation campaign.

Format as actionable checkbox list:

## WEEK 1 SETUP (Total: 1 hour)

### Day 1: Build Landing Page (30 mins)
[ ] Task | Time | Difficulty (Easy/Medium/Hard) | Critical (Yes/No)

### Day 1-2: Set Up Lead Capture (20 mins)
[ ] Task

### Day 2: Email Automation (10 mins)
[ ] Task

## WEEK 1 LAUNCH (Immediate)

### Google Business Profile (10 mins)
[ ] Task

### Facebook Ad Setup (20 mins)
[ ] Task
[ ] Task

### Email List (15 mins)
[ ] Task

## WEEK 2-4 OPTIMIZATION

### Daily Tracking (5 mins/day)
[ ] Task

### Weekly Analysis (30 mins/week)
[ ] Task

## EXPECTED RESULTS (30 DAYS)

- Landing page views: 50-150
- Form submissions: 5-10
- Phone calls: 3-5
- Inspections booked: 2-4
- Customers: 1-3
- Revenue: $600-1,800
- ROI: 1,000%+ on $50 spend

## SUCCESS METRICS

- Conversion rate (submissions -> inspections): 40%+
- Conversion rate (inspections -> customers): 40%+
- Cost per lead: <$15
- Cost per customer: <$300

## WHEN TO SCALE

- IF CPL < $10: Increase budget by 25%
- IF conversion > 30%: Double down on winning ad
- IF revenue > $1,000: Allocate to next month""",
        max_tokens=800,
    )


# ============================================================
# Lead-tracking webhooks + Sandbar onboarding seed
# ------------------------------------------------------------
# These ride on the lead-gen router (already imported + included
# by main.py), so they need no change to main.py. Because the
# router carries the prefix "/lead-gen", the live paths are:
#     POST /lead-gen/webhook/form
#     POST /lead-gen/webhook/call?slug=sandbar
# Both write to db.tracking, which feeds the public dashboard
# funnel + cost-per-lead. slug defaults to "sandbar" but is
# overridable (body or ?slug=) so the same endpoints serve any
# future client.
# ============================================================

from db.tracking import log_event, log_call, update_call_status  # noqa: E402
from db.reporting import get_client_by_slug, upsert_client  # noqa: E402


class FormWebhookPayload(BaseModel):
    client_slug: str = "sandbar"
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    service: Optional[str] = None
    quoted_range: Optional[str] = None
    source_url: Optional[str] = None
    source_medium: Optional[str] = None


@router.post("/webhook/form")
async def webhook_form(body: FormWebhookPayload, request: Request):
    """
    Form-submission webhook from any client site (Astro, Next, etc).
    Logs a 'lead' event so the dashboard funnel + CPL update in real time.
    Fire-and-forget from the site, so it always returns 200 quickly.
    """
    slug = (body.client_slug or "sandbar").strip().lower()
    meta = {
        k: v
        for k, v in {
            "name": body.name,
            "phone": body.phone,
            "email": body.email,
            "address": body.address,
            "service": body.service,
            "quoted_range": body.quoted_range,
            "source_url": body.source_url,
        }.items()
        if v
    }
    ip = request.client.host if request.client else None
    try:
        eid = await log_event(
            slug, "lead", source=body.source_medium or "website", meta=meta, ip=ip
        )
    except Exception as e:  # never break the caller's submit flow
        print(f"[webhook/form] ERROR log_event({slug}): {type(e).__name__}: {e}")
        return {"ok": False, "error": str(e)[:200]}
    # Mirror to GA4 as a conversion (no-op unless GA4 env vars are set).
    await _ga4_event(
        "generate_lead",
        {
            "service": body.service or "",
            "source": body.source_medium or "website",
            "engagement_time_msec": 1,
        },
    )
    return {"ok": True, "event_id": eid}


@router.post("/webhook/call")
async def webhook_callrail(request: Request):
    """
    CallRail 'Call Completed' webhook receiver.
    In CallRail: Settings -> Integrations -> Webhooks -> Call Completed
    URL: https://lola-backend.up.railway.app/lead-gen/webhook/call?slug=sandbar

    Accepts JSON or form-encoded. Maps CallRail's payload to a tracked_calls
    row (caller number, city, duration, recording) and a 'call' event.
    """
    ct = request.headers.get("content-type", "")
    if "json" in ct:
        body: dict = await request.json()
    else:
        form = await request.form()
        body = dict(form)

    slug = str(
        body.get("slug") or request.query_params.get("slug") or "sandbar"
    ).strip().lower()
    call_sid = str(body.get("id") or body.get("call_id") or "")
    if not call_sid:
        return {"ok": False, "reason": "missing_call_id"}

    caller_number = str(
        body.get("customer_phone_number") or body.get("caller_id") or ""
    ) or None
    tracking_number = str(
        body.get("tracking_phone_number") or body.get("tracking_number") or ""
    ) or None
    forwarded_to = str(
        body.get("business_phone_number") or body.get("forwarded_to") or ""
    ) or None
    caller_city = str(body.get("caller_city") or "") or None
    caller_state = str(body.get("caller_state") or "") or None
    try:
        duration_sec = int(
            body.get("duration") or body.get("duration_in_seconds") or 0
        )
    except (TypeError, ValueError):
        duration_sec = 0
    recording_url = str(
        body.get("recording") or body.get("recording_url") or ""
    ) or None
    source = str(
        body.get("utm_source") or body.get("first_call_actions") or "callrail"
    )
    direction = str(body.get("direction") or "inbound")

    try:
        await log_call(
            slug, call_sid, caller_number, tracking_number, forwarded_to,
            source, caller_city, caller_state,
        )
        await update_call_status(call_sid, direction, duration_sec, recording_url)
        await log_event(
            slug, "call", source=source,
            meta={"caller_city": caller_city, "duration_sec": duration_sec},
        )
    except Exception as e:
        print(f"[webhook/call] ERROR db({slug}, {call_sid}): {type(e).__name__}: {e}")
        return {"ok": False, "error": str(e)[:200]}
    # Mirror to GA4 as a phone-call conversion (no-op unless GA4 env vars set).
    await _ga4_event(
        "phone_call",
        {
            "duration_sec": duration_sec,
            "caller_city": caller_city or "",
            "source": source,
            "engagement_time_msec": 1,
        },
        client_id=call_sid,
    )
    return {"ok": True, "slug": slug, "call_sid": call_sid}


# ── Sandbar onboarding seed ─────────────────────────────────
# Onboards / wires up the Sandbar client record on boot. Idempotent:
# re-applies until BOTH analytics properties (GSC + GA4 Data API) are
# present, then leaves the row alone so manual dashboard edits stick.
# Any existing tuned values (conversion rate, avg job value, keywords)
# are preserved on re-seed — only the missing analytics wiring is added.
# FastAPI's include_router propagates this router's on_startup handlers
# to the app, so it runs on every deploy.
#
# Note: the GSC property is derivable from the domain, so it's hardcoded.
# The GA4 *Data API* property id is numeric ("properties/123456789"), is
# NOT the G-XXXXXXXX Measurement ID, and is read from the
# SANDBAR_GA_PROPERTY_ID env var so it can be set without a code change.
# (forward_number is configured in CallRail, not stored here — it is not
# a column on reporting_clients, so it must NOT be passed to upsert_client.)

_SANDBAR_SEED = {
    "slug": "sandbar",
    "client_name": "Sandbar Soft Wash",
    "client_email": "ty@tyalexandermedia.com",
    "site_url": "https://www.sandbarsoftwash.com",
    "money_keywords": [
        "roof cleaning Tampa Bay",
        "house soft wash Holiday FL",
        "pool cage cleaning Pinellas County",
        "pressure washing Palm Harbor FL",
        "soft wash Holiday FL",
    ],
    "conversion_rate": 0.35,
    "avg_job_value": 650,
    "gsc_property": "sc-domain:sandbarsoftwash.com",
}


@router.on_event("startup")
async def _seed_sandbar_client() -> None:
    try:
        ga_property_id = (os.getenv("SANDBAR_GA_PROPERTY_ID") or "").strip() or None
        existing = await get_client_by_slug(_SANDBAR_SEED["slug"])
        # Stop once the row exists AND both analytics props are wired up.
        if existing and existing.get("gsc_property") and existing.get("ga_property_id"):
            return
        # Preserve any already-tuned values; fall back to seed defaults.
        src = existing or {}
        await upsert_client(
            slug=_SANDBAR_SEED["slug"],
            client_name=src.get("client_name") or _SANDBAR_SEED["client_name"],
            client_email=src.get("client_email") or _SANDBAR_SEED["client_email"],
            site_url=src.get("site_url") or _SANDBAR_SEED["site_url"],
            money_keywords=src.get("money_keywords") or _SANDBAR_SEED["money_keywords"],
            conversion_rate=src.get("conversion_rate") or _SANDBAR_SEED["conversion_rate"],
            avg_job_value=src.get("avg_job_value") or _SANDBAR_SEED["avg_job_value"],
            active=True,
            target_url=src.get("target_url") or _SANDBAR_SEED["site_url"],
            gsc_property=src.get("gsc_property") or _SANDBAR_SEED["gsc_property"],
            ga_property_id=ga_property_id or src.get("ga_property_id"),
        )
        print(
            "[seed] Onboarded/updated Sandbar reporting client "
            f"(gsc={_SANDBAR_SEED['gsc_property']}, ga={ga_property_id or 'unset'})"
        )
    except Exception as e:  # never block app startup on a seed failure
        import traceback
        print(f"[seed] ERROR: Sandbar seed failed — {type(e).__name__}: {e}")
        traceback.print_exc()
