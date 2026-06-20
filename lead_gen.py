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
from fastapi import APIRouter, Header, HTTPException, Request
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
        curl https://lola-backend-production.up.railway.app/lead-gen/health
    """
    return {
        "ok": True,
        "env": {
            "ANTHROPIC_API_KEY": bool(ANTHROPIC_API_KEY),
            "GA4_MEASUREMENT_ID": bool(GA4_MEASUREMENT_ID),
            "GA4_API_SECRET": bool(GA4_API_SECRET),
        },
    }


@router.get("/whoami")
async def whoami():
    """
    Returns the Railway service identity of whichever instance answered this
    request. Useful when more than one Railway service runs the same code
    (e.g. a stale duplicate deploy) and you need to confirm which database
    a write/read actually hit.

    The canonical production service for the Sandbar dashboard is
    'lola-backend-production' — its public domain is what every Vercel
    rewrite, the CallRail webhook, and the GBP OAuth callback point at.
    If `public_domain` here returns anything else, the env vars + CallRail
    webhook are pointed at the wrong service.
    """
    return {
        "service": os.getenv("RAILWAY_SERVICE_NAME") or "unknown",
        "project": os.getenv("RAILWAY_PROJECT_NAME") or "unknown",
        "environment": os.getenv("RAILWAY_ENVIRONMENT_NAME") or "unknown",
        "public_domain": os.getenv("RAILWAY_PUBLIC_DOMAIN") or "unknown",
        "git_commit": (os.getenv("RAILWAY_GIT_COMMIT_SHA") or "")[:12] or "unknown",
        "is_canonical_lola_backend": (
            (os.getenv("RAILWAY_PUBLIC_DOMAIN") or "").lower()
            == "lola-backend-production.up.railway.app"
        ),
        "callrail_configured": bool(
            (os.getenv("CALLRAIL_API_KEY") or "").strip()
            and (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip()
        ),
    }


@router.get("/ga4-test")
async def ga4_connection_test():
    """
    One-shot verification of the GA4 Data API + Search Console service-account
    wiring. Hit this AFTER setting GA4_SERVICE_ACCOUNT_JSON / GA4_PROPERTY_ID /
    GSC_SERVICE_ACCOUNT_JSON in Railway:
        curl https://lola-backend-production.up.railway.app/lead-gen/ga4-test

    Reads which env vars are present (booleans only — no secret values), then
    runs a live test query against each API and returns the result or the exact
    error string, so misconfig (wrong property id, SA not added as Viewer,
    API not enabled) is obvious without digging through Railway logs.
    """
    import os as _os
    from agents.reporting_agent.data_fetcher import fetch_ga, fetch_gsc

    env_present = {
        "GA4_SERVICE_ACCOUNT_JSON": bool((_os.getenv("GA4_SERVICE_ACCOUNT_JSON") or "").strip()),
        "GA4_PROPERTY_ID": (_os.getenv("GA4_PROPERTY_ID") or _os.getenv("GA_DEFAULT_PROPERTY_ID") or "").strip() or None,
        "GSC_SERVICE_ACCOUNT_JSON": bool((_os.getenv("GSC_SERVICE_ACCOUNT_JSON") or "").strip()),
        "SANDBAR_GA_PROPERTY_ID": (_os.getenv("SANDBAR_GA_PROPERTY_ID") or "").strip() or None,
    }

    ga = await fetch_ga()
    gsc = await fetch_gsc(
        "https://www.sandbarsoftwash.com",
        ["roof cleaning palm harbor fl"],
        "sc-domain:sandbarsoftwash.com",
    )
    return {
        "env_present": env_present,
        "ga4_data_api": {
            "ok": ga.get("error") is None,
            "error": ga.get("error"),
            "organic_sessions_this_week": ga.get("organic_sessions_this_week"),
        },
        "search_console": {
            "ok": gsc.get("error") is None,
            "error": gsc.get("error"),
            "organic_clicks_this_week": gsc.get("organic_clicks_this_week"),
        },
    }


@router.get("/setup-status")
async def setup_status(slug: str = "sandbar"):
    """
    Whole-integration readiness check in ONE call — open this after setting env
    vars to see exactly what's live and what's still missing:
        https://lola-backend-production.up.railway.app/lead-gen/setup-status

    Each section returns ok=true/false plus a human 'detail' and (where
    helpful) a 'needs' list of the env vars still missing. No secret values
    are ever returned — only booleans + the upstream API's own error strings.
    """
    import os as _os
    from agents.reporting_agent.data_fetcher import fetch_ga, fetch_gsc
    from api_clients.search_providers import (
        fetch_gbp_performance, fetch_bing_webmaster,
    )

    checks: dict = {}

    # 1. Dashboard client seed — is the client row present and wired?
    try:
        client = await get_client_by_slug(slug)
        if client:
            checks["dashboard_client"] = {
                "ok": True,
                "detail": f"{slug} client seeded",
                "gsc_property": client.get("gsc_property"),
                "ga_property_id": client.get("ga_property_id"),
                "gbp_location_id": client.get("gbp_location_id"),
                "gbp_token_stored": bool(client.get("gbp_refresh_token")),
            }
        else:
            checks["dashboard_client"] = {
                "ok": False,
                "detail": f"{slug} client NOT found — seed did not run (check Railway startup logs)",
            }
            client = {}
    except Exception as e:
        checks["dashboard_client"] = {"ok": False, "detail": f"{type(e).__name__}: {e}"}
        client = {}

    # 2. GA4 Measurement Protocol — validate the secret against GA4's debug
    #    endpoint (server-side lead/call conversions ride on this).
    mp_check = await _ga4_mp_validate()
    if not mp_check.get("ok"):
        mp_check["needs"] = [
            v for v in ("GA4_MEASUREMENT_ID", "GA4_API_SECRET")
            if not (_os.getenv(v) or "").strip()
        ] or None
    checks["ga4_measurement_protocol"] = mp_check

    # 3. GA4 Data API — live organic-sessions query.
    ga = await fetch_ga()
    checks["ga4_data_api"] = {
        "ok": ga.get("error") is None,
        "detail": ga.get("error") or f"ok ({ga.get('organic_sessions_this_week')} organic sessions this week)",
    }

    # 4. Search Console — live organic-clicks query.
    site = (client.get("site_url") if isinstance(client, dict) else None) or "https://www.sandbarsoftwash.com"
    gsc_prop = (client.get("gsc_property") if isinstance(client, dict) else None) or "sc-domain:sandbarsoftwash.com"
    gsc = await fetch_gsc(site, ["roof cleaning palm harbor fl"], gsc_prop)
    checks["search_console"] = {
        "ok": gsc.get("error") is None,
        "detail": gsc.get("error") or f"ok ({gsc.get('organic_clicks_this_week')} organic clicks this week)",
    }

    # 5. Google Business Profile Performance — needs OAuth client creds + a
    #    stored refresh token per client.
    gbp_needs = [
        v for v in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET")
        if not (_os.getenv(v) or "").strip()
    ]
    loc_id = (client.get("gbp_location_id") if isinstance(client, dict) else None) or ""
    refresh = (client.get("gbp_refresh_token") if isinstance(client, dict) else None) or ""
    if not refresh:
        gbp_needs.append(f"refresh_token (POST /admin/gbp/{slug}/token after OAuth)")
    if gbp_needs:
        checks["gbp_performance"] = {
            "ok": False,
            "detail": "GBP not connected — missing " + ", ".join(gbp_needs),
            "needs": gbp_needs,
        }
    else:
        gbp = await fetch_gbp_performance(loc_id, refresh)
        checks["gbp_performance"] = {
            "ok": gbp.get("error") is None,
            "detail": gbp.get("error") or (
                f"ok ({gbp.get('calls')} calls, {gbp.get('website_clicks')} site clicks, "
                f"{gbp.get('impressions')} impressions over last 30 days)"
            ),
        }

    # 6. Bing Webmaster — free API key, drives the ChatGPT/Copilot proxy card.
    if not (_os.getenv("BING_WEBMASTER_API_KEY") or "").strip():
        checks["bing_webmaster"] = {
            "ok": False,
            "detail": "BING_WEBMASTER_API_KEY not set",
            "needs": ["BING_WEBMASTER_API_KEY"],
        }
    else:
        bing = await fetch_bing_webmaster(site)
        checks["bing_webmaster"] = {
            "ok": bing.get("error") is None,
            "detail": bing.get("error") or (
                f"ok ({bing.get('clicks')} clicks, {bing.get('impressions')} impressions)"
            ),
        }

    # 7. CallRail — webhook + history backfill depend on these.
    cr_needs = [
        v for v in ("CALLRAIL_API_KEY", "CALLRAIL_ACCOUNT_ID")
        if not (_os.getenv(v) or "").strip()
    ]
    checks["callrail"] = {
        "ok": not cr_needs,
        "detail": (
            "CallRail keys missing — " + ", ".join(cr_needs)
            if cr_needs else "CALLRAIL_API_KEY + CALLRAIL_ACCOUNT_ID set"
        ),
        "needs": cr_needs or None,
    }

    all_ok = all(c.get("ok") for c in checks.values())
    summary = {
        "ready": all_ok,
        "missing_env_vars": sorted({
            v for c in checks.values()
            for v in (c.get("needs") or [])
            if isinstance(v, str) and v.replace("_", "").isalnum()  # env-var-shaped only
        }),
    }
    return {"all_ok": all_ok, "summary": summary, "checks": checks}

# GA4 Measurement Protocol — sends server-side conversion events (leads +
# calls) into GA4 so they show up alongside web analytics. No-op until both
# env vars are set on Railway, so the webhooks keep working regardless.
GA4_MEASUREMENT_ID = (os.getenv("GA4_MEASUREMENT_ID") or "").strip() or None
GA4_API_SECRET = (os.getenv("GA4_API_SECRET") or "").strip() or None


async def _ga4_event(
    name: str, params: dict, client_id: Optional[str] = None,
    debug_mode: bool = False,
) -> dict:
    """Fire a single GA4 event via the Measurement Protocol. Best-effort:
    catches all errors so a tracking hiccup never affects the lead flow.

    Returns a small status dict (also logged) so the caller can see what
    happened — used by /lead-gen/ga4-fire-test to surface live failures
    instead of swallowing them silently.

    Env vars are re-read on every call so a post-startup Railway env-var
    change takes effect on the next event without requiring a redeploy.
    """
    mid = (os.getenv("GA4_MEASUREMENT_ID") or "").strip()
    secret = (os.getenv("GA4_API_SECRET") or "").strip()
    if not mid or not secret:
        return {"ok": False, "reason": "env_vars_not_set",
                "have_mid": bool(mid), "have_secret": bool(secret)}
    # debug_mode=1 makes the event show up in GA4 DebugView. Pass through
    # for ad-hoc tests; leave off for production events so they don't
    # pollute DebugView for the actual analyst.
    event_params = dict(params or {})
    if debug_mode:
        event_params["debug_mode"] = 1
    payload = {
        "client_id": client_id or uuid.uuid4().hex,
        "events": [{"name": name, "params": event_params}],
    }
    url = (
        "https://www.google-analytics.com/mp/collect"
        f"?measurement_id={mid}&api_secret={secret}"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
        # MP /collect returns 204 on success with no body. Anything else
        # means GA4 rejected the request — log it so a real failure isn't
        # silent.
        if resp.status_code not in (200, 204):
            print(f"[ga4] event={name} rejected: HTTP {resp.status_code} body={resp.text[:200]}")
            return {"ok": False, "reason": "http_error",
                    "status": resp.status_code, "body": resp.text[:200]}
        return {"ok": True, "status": resp.status_code, "event": name}
    except Exception as e:
        print(f"[ga4] event={name} exception: {type(e).__name__}: {e}")
        return {"ok": False, "reason": "exception",
                "error": f"{type(e).__name__}: {e}"}


async def _ga4_mp_validate() -> dict:
    """Validate the Measurement Protocol creds via GA4's /debug/mp/collect.
    Returns {ok, detail} without exposing the secret. Empty validationMessages
    from GA4 means the event/credentials are accepted. Env vars re-read on
    every call so a post-deploy change takes effect immediately."""
    mid = (os.getenv("GA4_MEASUREMENT_ID") or "").strip()
    secret = (os.getenv("GA4_API_SECRET") or "").strip()
    if not mid or not secret:
        return {"ok": False, "detail": "GA4_MEASUREMENT_ID / GA4_API_SECRET not set"}
    url = (
        "https://www.google-analytics.com/debug/mp/collect"
        f"?measurement_id={mid}&api_secret={secret}"
    )
    payload = {
        "client_id": "setup.status.check",
        "events": [{"name": "phone_call", "params": {"engagement_time_msec": 1}}],
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
        data = resp.json()
        msgs = data.get("validationMessages", []) or []
        if msgs:
            return {"ok": False, "detail": "; ".join(m.get("description", str(m)) for m in msgs)}
        return {"ok": True, "detail": "credentials valid — events accepted by GA4"}
    except Exception as e:
        return {"ok": False, "detail": f"{type(e).__name__}: {str(e)[:200]}"}


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
    URL: https://lola-backend-production.up.railway.app/lead-gen/webhook/call?slug=sandbar

    Accepts JSON or form-encoded (CallRail's "post_call" webhook is form-
    encoded). Field names below match CallRail's real payload — note it sends
    customer_city / customer_state / customer_name (NOT caller_*). Maps it to a
    tracked_calls row + a 'call' event so the dashboard funnel + billing-proof
    (number, city, duration, recording) update in real time.
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
    # CallRail sends customer_city / customer_state; keep caller_* as fallback.
    caller_city = str(
        body.get("customer_city") or body.get("caller_city") or ""
    ) or None
    caller_state = str(
        body.get("customer_state") or body.get("caller_state") or ""
    ) or None
    customer_name = str(body.get("customer_name") or "") or None
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
        body.get("utm_source") or body.get("tracking_source") or "callrail"
    )
    direction = str(body.get("direction") or "inbound")
    # answered + first_call drive billable-lead quality on the dashboard.
    answered = str(body.get("answered") or "").lower() in ("true", "1", "yes")
    first_call = str(body.get("first_call") or "").lower() in ("true", "1", "yes")

    try:
        await log_call(
            slug, call_sid, caller_number, tracking_number, forwarded_to,
            source, caller_city, caller_state,
        )
        await update_call_status(call_sid, direction, duration_sec, recording_url)
        await log_event(
            slug, "call", source=source,
            meta={
                "caller_number": caller_number,
                "customer_name": customer_name,
                "caller_city": caller_city,
                "caller_state": caller_state,
                "duration_sec": duration_sec,
                "answered": answered,
                "first_call": first_call,
                "recording_url": recording_url,
            },
        )
        print(
            f"[webhook/call] logged {slug} call {call_sid} "
            f"from {caller_number or '?'} ({caller_city or '?'}, {caller_state or '?'}) "
            f"{duration_sec}s answered={answered} first={first_call}"
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

_SANDBAR_SEED_DEFAULTS = {
    "slug": "sandbar",
    "client_name": "Sandbar Soft Wash",
    "client_email": "ty@tyalexandermedia.com",
    "site_url": "https://www.sandbarsoftwash.com",
    "conversion_rate": 0.35,
    "avg_job_value": 650,
    "gsc_property": "sc-domain:sandbarsoftwash.com",
}


async def _seed_sandbar_client() -> None:
    """
    Reseeds the Sandbar reporting_clients row on every deploy.

    Keywords + AI Mode prompts are the single source of truth in
    case_studies/configs.py — they get force-synced here on every boot so
    a code change to the keyword list takes effect on the next deploy
    without a manual /admin/reporting/onboard call. Operator-customized
    values (conversion_rate, avg_job_value, gsc_property, ga_property_id,
    forward_number) are preserved when present.
    """
    print("[seed] _seed_sandbar_client starting…")
    try:
        # Pull the canonical 19 keywords + 6 AI prompts from the config so
        # we never drift between the tracker config and the dashboard seed.
        from case_studies.configs import CASE_STUDIES as _CONFIG
        sandbar_cfg = _CONFIG.get("sandbar")
        if not sandbar_cfg:
            print("[seed] WARNING: CASE_STUDIES['sandbar'] missing — aborting seed (would have wiped keywords)")
            return
        canonical_keywords = list(sandbar_cfg.google_queries)
        canonical_prompts = list(sandbar_cfg.ai_mode_prompts)

        ga_property_id = (
            os.getenv("SANDBAR_GA_PROPERTY_ID") or os.getenv("GA4_PROPERTY_ID") or ""
        ).strip() or None
        existing = await get_client_by_slug(_SANDBAR_SEED_DEFAULTS["slug"])
        src = existing or {}

        await upsert_client(
            slug=_SANDBAR_SEED_DEFAULTS["slug"],
            client_name=src.get("client_name") or _SANDBAR_SEED_DEFAULTS["client_name"],
            client_email=src.get("client_email") or _SANDBAR_SEED_DEFAULTS["client_email"],
            site_url=src.get("site_url") or _SANDBAR_SEED_DEFAULTS["site_url"],
            # FORCE-SYNC: always use the config — DB list is overwritten.
            money_keywords=canonical_keywords,
            conversion_rate=src.get("conversion_rate") or _SANDBAR_SEED_DEFAULTS["conversion_rate"],
            avg_job_value=src.get("avg_job_value") or _SANDBAR_SEED_DEFAULTS["avg_job_value"],
            active=True,
            target_url=src.get("target_url") or _SANDBAR_SEED_DEFAULTS["site_url"],
            gsc_property=src.get("gsc_property") or _SANDBAR_SEED_DEFAULTS["gsc_property"],
            ga_property_id=ga_property_id or src.get("ga_property_id"),
            # FORCE-SYNC AI prompts too.
            ai_mode_prompts=canonical_prompts,
        )
        print(
            f"[seed] Sandbar reporting client synced — "
            f"{len(canonical_keywords)} keywords, {len(canonical_prompts)} AI prompts "
            f"(gsc={_SANDBAR_SEED_DEFAULTS['gsc_property']}, ga={ga_property_id or 'unset'})"
        )
    except Exception as e:  # never block app startup on a seed failure
        import traceback
        print(f"[seed] ERROR: Sandbar seed failed — {type(e).__name__}: {e}")
        traceback.print_exc()


@router.on_event("startup")
async def _kick_seed_in_background() -> None:
    """Fire the Sandbar seed as a background task so a slow or hung DB
    call can never block FastAPI from accepting requests. Combined with
    the defensive /reporting/public/{slug} fallback to CASE_STUDIES, this
    means the dashboard renders even if the seed never finishes."""
    asyncio.create_task(_seed_sandbar_client())


@router.post("/reseed/sandbar")
async def manual_reseed_sandbar(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """
    Manually re-runs the Sandbar seed without waiting for a Railway redeploy.
    Useful after editing keywords/prompts in case_studies/configs.py and
    needing the dashboard to reflect the change immediately. Returns the
    resolved CaseStudy + the freshly-saved row so the operator can confirm.
    """
    _check_admin_key(x_admin_key)
    await _seed_sandbar_client()
    from case_studies.tracker import _load_case_study
    cs = await _load_case_study("sandbar")
    row = await get_client_by_slug("sandbar")
    return {
        "ok": True,
        "case_study_loaded": cs is not None,
        "google_queries_count": len(cs.google_queries) if cs else 0,
        "ai_mode_prompts_count": len(cs.ai_mode_prompts) if cs else 0,
        "first_3_queries": cs.google_queries[:3] if cs else [],
        "db_row_present": row is not None,
        "db_money_keywords_count": len(row.get("money_keywords", [])) if row else 0,
        "db_ai_prompts_count": len(row.get("ai_mode_prompts", [])) if row else 0,
    }


# ============================================================
# Historical backfill endpoints — pull the last N days of real
# data into the dashboard so a brand-new client doesn't see an
# empty dashboard on day one.
#
# All endpoints require X-Admin-Key. They write to the same
# tracked_events / tracked_calls tables that the live webhooks
# use, so the dashboard surfaces backfilled data the same way
# it surfaces real-time data.
# ============================================================

from fastapi import Header  # noqa: E402
from datetime import datetime, timedelta  # noqa: E402
import aiosqlite  # noqa: E402


def _check_admin_key(key: str) -> None:
    expected = (os.getenv("LOLA_SECRET_ADMIN_KEY") or "").strip()
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/import/callrail/{slug}")
async def import_callrail_history(
    slug: str,
    days: int = 30,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    Backfill the last `days` of calls from CallRail's REST API.

    Requires two env vars on Railway:
      CALLRAIL_API_KEY   = the API token from CallRail → Settings → API access
      CALLRAIL_ACCOUNT_ID = the numeric account id (visible in the dashboard URL)

    Idempotent: tracked_calls.call_sid is UNIQUE so re-running this
    endpoint won't duplicate calls. Newer calls flow in via the
    webhook; this just fills in the gap before the webhook was wired.
    """
    _check_admin_key(x_admin_key)
    api_key = (os.getenv("CALLRAIL_API_KEY") or "").strip()
    # Strip dashes: CallRail displays the account ID as "512-138-905" in the UI
    # but the REST API path requires the plain digits "512138905".
    account_id = (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip().replace("-", "")
    if not api_key or not account_id:
        raise HTTPException(
            status_code=503,
            detail=(
                "CALLRAIL_API_KEY and CALLRAIL_ACCOUNT_ID must be set on Railway. "
                "Get the API key from CallRail → Settings → API access. The "
                "account id is the number in your CallRail dashboard URL."
            ),
        )

    start_date = (datetime.utcnow() - timedelta(days=max(1, min(days, 365)))).strftime("%Y-%m-%d")
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    url = f"https://api.callrail.com/v3/a/{account_id}/calls.json"

    imported = 0
    skipped = 0
    page = 1
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            resp = await client.get(
                url,
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "per_page": 100,
                    "page": page,
                    "fields": "duration,direction,recording,first_call,utm_source,utm_medium",
                },
                headers={"Authorization": f"Token token={api_key}"},
            )
            if resp.status_code == 401:
                raise HTTPException(status_code=502, detail="CallRail rejected the API key (401).")
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"CallRail returned HTTP {resp.status_code}: {resp.text[:200]}",
                )
            data = resp.json()
            calls = data.get("calls", []) or []
            if not calls:
                break

            for c in calls:
                call_sid = str(c.get("id") or "")
                if not call_sid:
                    skipped += 1
                    continue
                caller_number = c.get("customer_phone_number") or c.get("caller_id")
                tracking_number = c.get("tracking_phone_number") or c.get("tracking_number")
                forwarded_to = c.get("business_phone_number") or c.get("forwarded_to")
                caller_city = c.get("customer_city") or c.get("caller_city")
                caller_state = c.get("customer_state") or c.get("caller_state")
                try:
                    duration_sec = int(c.get("duration") or c.get("duration_in_seconds") or 0)
                except (TypeError, ValueError):
                    duration_sec = 0
                recording_url = c.get("recording") or c.get("recording_url")
                source = c.get("utm_source") or c.get("first_call_actions") or "callrail"
                direction = c.get("direction") or "inbound"
                created_at = c.get("start_time") or c.get("created_at")

                try:
                    await log_call(
                        slug, call_sid, caller_number, tracking_number, forwarded_to,
                        source, caller_city, caller_state,
                    )
                    await update_call_status(call_sid, direction, duration_sec, recording_url)
                    # Override created_at on both rows so historical calls land
                    # in the correct month (otherwise they'd all bunch up today).
                    if created_at:
                        async with aiosqlite.connect(os.getenv("DB_PATH", "lola.db")) as db:
                            await db.execute(
                                "UPDATE tracked_calls SET created_at = ? WHERE call_sid = ?",
                                (created_at, call_sid),
                            )
                            await db.commit()
                    eid = await log_event(
                        slug, "call", source=source,
                        meta={"caller_city": caller_city, "duration_sec": duration_sec, "imported": True},
                    )
                    if eid and created_at:
                        async with aiosqlite.connect(os.getenv("DB_PATH", "lola.db")) as db:
                            await db.execute(
                                "UPDATE tracked_events SET created_at = ? WHERE id = ?",
                                (created_at, eid),
                            )
                            await db.commit()
                    # Mirror to GA4 so backfilled calls show up alongside
                    # live webhook events. No-op when GA4 env vars unset.
                    await _ga4_event(
                        "phone_call",
                        {
                            "duration_sec": duration_sec,
                            "caller_city": caller_city or "",
                            "source": source,
                            "imported": 1,
                            "engagement_time_msec": 1,
                        },
                        client_id=call_sid,
                    )
                    imported += 1
                except Exception as e:
                    print(f"[import/callrail] ERROR call {call_sid}: {type(e).__name__}: {e}")
                    skipped += 1

            # CallRail paginates — keep going until we get less than per_page.
            if len(calls) < 100:
                break
            page += 1
            if page > 50:  # safety cap: 5000 calls per backfill run
                break

    return {
        "ok": True, "slug": slug,
        "window": {"start": start_date, "end": end_date, "days": days},
        "imported": imported, "skipped": skipped,
    }


class HistoricalLead(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    service: Optional[str] = None
    quoted_range: Optional[str] = None
    source: Optional[str] = "website"
    created_at: Optional[str] = None  # ISO 8601; defaults to now


class HistoricalLeadsBatch(BaseModel):
    leads: list[HistoricalLead]


@router.post("/import/leads/{slug}")
async def import_leads_batch(
    slug: str,
    body: HistoricalLeadsBatch,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    Bulk-import historical quote-form leads. Accepts a JSON array of
    leads; writes one 'lead' tracked_event per row. Use this for the
    leads sitting in the client's CRM / email inbox / spreadsheet
    before the live webhook was wired up.

    Idempotent only by your own care — there's no natural dedupe key
    on form leads. If you re-run, you'll double-count.
    """
    _check_admin_key(x_admin_key)
    imported = 0
    for ld in body.leads:
        meta = {
            k: v for k, v in {
                "name": ld.name, "email": ld.email, "phone": ld.phone,
                "address": ld.address, "service": ld.service,
                "quoted_range": ld.quoted_range, "imported": True,
            }.items() if v
        }
        try:
            eid = await log_event(
                slug, "lead", source=ld.source or "website", meta=meta,
            )
            if eid and ld.created_at:
                async with aiosqlite.connect(os.getenv("DB_PATH", "lola.db")) as db:
                    await db.execute(
                        "UPDATE tracked_events SET created_at = ? WHERE id = ?",
                        (ld.created_at, eid),
                    )
                    await db.commit()
            imported += 1
        except Exception as e:
            print(f"[import/leads] ERROR: {type(e).__name__}: {e}")
    return {"ok": True, "slug": slug, "imported": imported, "submitted": len(body.leads)}


@router.post("/import/all/{slug}")
async def import_all_in_one(
    slug: str,
    days: int = 30,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    One-shot 'finalize the dashboard' endpoint. Runs in order:
      1. CallRail history import (last `days` of calls — skipped if creds unset)
      2. External metrics refresh (GSC, GA4, GBP, Bing, Core Web Vitals)
      3. Fresh ranking + AI Share-of-Voice snapshot

    Designed for the one-curl handoff at client kickoff. Every step is
    independent try/except'd — one failure never blocks the others, and
    the response includes a status per step so the caller knows what
    succeeded.
    """
    _check_admin_key(x_admin_key)
    results: dict = {}

    # 1. CallRail history
    callrail_key = (os.getenv("CALLRAIL_API_KEY") or "").strip()
    callrail_acct = (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip()
    if callrail_key and callrail_acct:
        try:
            cr = await import_callrail_history(slug=slug, days=days, x_admin_key=x_admin_key)
            results["callrail"] = {"ok": True, "imported": cr.get("imported", 0)}
        except HTTPException as he:
            results["callrail"] = {"ok": False, "detail": str(he.detail)[:200]}
        except Exception as e:
            results["callrail"] = {"ok": False, "detail": f"{type(e).__name__}: {e}"[:200]}
    else:
        results["callrail"] = {"ok": False, "detail": "skipped — set CALLRAIL_API_KEY + CALLRAIL_ACCOUNT_ID on Railway"}

    # 2 + 3. Metrics + rankings refresh — delegate to the canonical handler
    #        in main.py so we don't duplicate the source-by-source pulls.
    try:
        import importlib
        main_mod = importlib.import_module("main")
        rc = await get_client_by_slug(slug)
        if not rc:
            results["metrics"] = {"ok": False, "detail": "client not seeded"}
        else:
            results["metrics"] = await main_mod._refresh_client_metrics(slug, rc)
        try:
            await main_mod.run_case_study_snapshot(slug, notes="kickoff backfill")
            results["rankings"] = "ok"
        except Exception as e:
            results["rankings"] = f"error: {str(e)[:80]}"
    except Exception as e:
        results["metrics"] = {"ok": False, "detail": f"{type(e).__name__}: {e}"[:200]}

    return {"ok": True, "slug": slug, "days": days, "results": results}


# ── Auto-refresh on startup ─────────────────────────────────
# Every deploy triggers a fresh pull of external metrics (GSC / GA4 /
# GBP / Bing / CWV) for Sandbar IF the last refresh is stale (> 12h).
# Keeps the public dashboard live without needing the weekly cron to
# have fired yet. Idempotent + non-blocking — a failure here can never
# stop app boot.

_AUTO_REFRESH_STALE_HOURS = 12


async def _has_recent_ranking_snapshot(slug: str, hours: int) -> bool:
    """Per-subsystem freshness probe — checks the most recent
    case_study_rankings row for the slug. Independent of GSC's freshness
    so a recent GSC snapshot can't accidentally suppress the ranking
    refresh."""
    try:
        import aiosqlite
        async with aiosqlite.connect(os.getenv("DB_PATH", "lola.db")) as db:
            async with db.execute(
                "SELECT MAX(run_at) FROM case_study_rankings WHERE slug = ?",
                (slug,),
            ) as cur:
                row = await cur.fetchone()
                if not row or not row[0]:
                    return False
                latest = row[0]
        dt = datetime.fromisoformat(latest.replace("Z", "").replace(" ", "T")[:19])
        return (datetime.utcnow() - dt).total_seconds() / 3600.0 < hours
    except Exception:
        return False


async def _do_sandbar_refresh(force: bool = False) -> None:
    """Background refresh entry point.

    Each subsystem has its OWN freshness check now so a recent GSC pull
    can't suppress the ranking snapshot or the CallRail import. force=True
    overrides every freshness check and runs everything.
    """
    try:
        rc = await get_client_by_slug("sandbar")
        if not rc:
            print("[auto-refresh] no sandbar client row — seeding now before refresh…")
            await _seed_sandbar_client()
            rc = await get_client_by_slug("sandbar")
            if not rc:
                print("[auto-refresh] seed completed but still no row — aborting")
                return
            print("[auto-refresh] seed complete — continuing refresh")

        # ── Metrics: GSC / GA4 / GBP / Bing / CWV ──
        # Freshness probe via GSC snapshot. Skipped only when fresh AND not
        # forced. Other subsystems below are NOT gated by this check.
        skip_metrics = False
        if not force:
            try:
                from db.tracking import get_gsc_snapshot
                snap = await get_gsc_snapshot("sandbar")
                fetched_at = (snap or {}).get("fetched_at")
                if fetched_at:
                    hrs = (datetime.utcnow() - datetime.fromisoformat(fetched_at.replace("Z", "").replace(" ", "T")[:19])).total_seconds() / 3600.0
                    if hrs < _AUTO_REFRESH_STALE_HOURS:
                        skip_metrics = True
                        print(f"[auto-refresh] metrics fresh ({hrs:.1f}h old) — skipping GSC/GA4/GBP/Bing/CWV")
            except Exception:
                pass

        import importlib
        main_mod = importlib.import_module("main")
        if not skip_metrics:
            try:
                await main_mod._refresh_client_metrics("sandbar", rc)
                print("[auto-refresh] metrics refresh OK")
            except Exception as e:
                print(f"[auto-refresh] metrics refresh failed: {type(e).__name__}: {e}")

        # ── Rankings snapshot ── independent freshness probe.
        # The 19 keywords + Claude + ChatGPT calls take 30-60s; skip if a
        # recent snapshot already exists (or always run on force).
        if force or not await _has_recent_ranking_snapshot("sandbar", _AUTO_REFRESH_STALE_HOURS):
            try:
                summary = await main_mod.run_case_study_snapshot("sandbar", notes="auto-refresh on deploy")
                g_count = len(summary.get("google", []) or [])
                ai_count = len(summary.get("ai_mode", []) or [])
                print(f"[auto-refresh] rankings snapshot OK — {g_count} google, {ai_count} AI mode rows")
            except Exception as e:
                print(f"[auto-refresh] rankings snapshot failed: {type(e).__name__}: {e}")
        else:
            print("[auto-refresh] rankings fresh — skipping snapshot")

        # ── CallRail webhook + backfill ── ALWAYS run if env vars are
        # present. Webhook setup is idempotent; backfill is idempotent
        # via the UNIQUE call_sid constraint. No freshness gate here —
        # this is what brings the 3 historical calls into the dashboard
        # right after env vars get set on Railway.
        if (os.getenv("CALLRAIL_API_KEY") or "").strip() and (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip():
            admin_key = (os.getenv("LOLA_SECRET_ADMIN_KEY") or "").strip()
            if admin_key:
                try:
                    res = await callrail_setup_webhook(slug="sandbar", x_admin_key=admin_key)
                    print(f"[auto-refresh] CallRail webhook setup: {res}")
                except Exception as e:
                    print(f"[auto-refresh] CallRail webhook setup failed: {type(e).__name__}: {e}")
                try:
                    res = await import_callrail_history(slug="sandbar", days=30, x_admin_key=admin_key)
                    print(f"[auto-refresh] CallRail backfill: imported={res.get('imported', '?')} skipped={res.get('skipped', '?')}")
                except Exception as e:
                    print(f"[auto-refresh] CallRail backfill failed: {type(e).__name__}: {e}")
            else:
                print("[auto-refresh] CallRail keys set but LOLA_SECRET_ADMIN_KEY missing — skipping backfill")
        else:
            print("[auto-refresh] CallRail env vars not set — skipping webhook + backfill")

        print("[auto-refresh] Sandbar refresh complete.")
    except Exception as e:
        # Never block app boot on a refresh failure.
        import traceback
        print(f"[auto-refresh] ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()


@router.post("/refresh/sandbar")
async def force_refresh_sandbar(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Force-run the full Sandbar refresh pipeline (metrics + rankings +
    CallRail backfill). Bypasses every freshness probe so it runs even
    if a recent snapshot exists. Use this when env vars just changed on
    Railway and you want the dashboard populated immediately."""
    _check_admin_key(x_admin_key)
    # Fire-and-forget so the HTTP response returns instantly; tail Railway
    # logs to see progress (`[auto-refresh] …`).
    asyncio.create_task(_do_sandbar_refresh(force=True))
    return {
        "ok": True,
        "message": "Refresh kicked off in background — check dashboard in ~60s.",
        "next_step": "Tail Railway logs and grep '[auto-refresh]' for per-subsystem status.",
    }


@router.on_event("startup")
async def _auto_refresh_sandbar_metrics() -> None:
    # Run in background so a slow external API never blocks healthchecks.
    asyncio.create_task(_do_sandbar_refresh())


# ── CallRail self-setup automation ──────────────────────────────────────────
# One-shot endpoints that use the CallRail REST API to wire the webhook
# automatically. Saves the user from clicking through CallRail's UI.

_PUBLIC_APP_URL = (os.getenv("PUBLIC_APP_URL") or "https://lola-backend-production.up.railway.app").rstrip("/")


@router.post("/callrail/setup-webhook/{slug}")
async def callrail_setup_webhook(
    slug: str,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    Auto-wires the post-call webhook on CallRail so every completed call
    flows into the Lola dashboard in real time.

    Idempotent: if a webhook with the same target URL already exists, it's
    left as-is. If multiple Sandbar companies exist, the webhook is created
    on each.

    Requires:
      - CALLRAIL_API_KEY env var on Railway
      - CALLRAIL_ACCOUNT_ID env var on Railway
    """
    _check_admin_key(x_admin_key)
    api_key = (os.getenv("CALLRAIL_API_KEY") or "").strip()
    # Strip dashes — CallRail UI shows "512-138-905" but the API needs "512138905".
    account_id = (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip().replace("-", "")
    if not api_key or not account_id:
        raise HTTPException(
            status_code=503,
            detail="CALLRAIL_API_KEY and CALLRAIL_ACCOUNT_ID must be set on Railway",
        )

    webhook_url = f"{_PUBLIC_APP_URL}/lead-gen/webhook/call?slug={slug}"
    headers = {"Authorization": f"Token token={api_key}"}
    base = f"https://api.callrail.com/v3/a/{account_id}"
    results: dict = {"webhook_url": webhook_url, "companies": []}

    async with httpx.AsyncClient(timeout=30.0) as http:
        # 1. List companies on the account
        try:
            r = await http.get(f"{base}/companies.json", headers=headers)
            if r.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"CallRail companies fetch failed: HTTP {r.status_code} — {r.text[:200]}",
                )
            companies = (r.json() or {}).get("companies", []) or []
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"CallRail API error: {type(e).__name__}: {e}")

        if not companies:
            return {"ok": False, "detail": "No companies found on this CallRail account"}

        # 2. For each company, list existing integrations + create webhook if missing
        for company in companies:
            company_id = company.get("id")
            company_name = company.get("name") or str(company_id)
            entry: dict = {"company_id": company_id, "company_name": company_name}
            try:
                # List existing integrations to avoid duplicates
                ir = await http.get(
                    f"{base}/companies/{company_id}/integrations.json",
                    headers=headers,
                )
                existing = (ir.json() or {}).get("integrations", []) or []
                already_wired = any(
                    (i.get("config") or {}).get("post_call_webhook") == webhook_url
                    for i in existing
                )
                if already_wired:
                    entry["status"] = "already_wired"
                else:
                    cr = await http.post(
                        f"{base}/companies/{company_id}/integrations.json",
                        headers={**headers, "Content-Type": "application/json"},
                        json={
                            "type": "Webhooks",
                            "config": {"post_call_webhook": webhook_url},
                        },
                    )
                    if cr.status_code in (200, 201):
                        entry["status"] = "created"
                    else:
                        entry["status"] = f"error_http_{cr.status_code}"
                        entry["error_detail"] = cr.text[:200]
            except Exception as e:
                entry["status"] = f"exception: {type(e).__name__}"
                entry["error_detail"] = str(e)[:200]
            results["companies"].append(entry)

    return {"ok": True, **results}


@router.post("/finalize/{slug}")
async def finalize_dashboard(
    slug: str,
    days: int = 30,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    One-call 'do everything' endpoint:
      1. Auto-wire the CallRail webhook (if API key configured)
      2. Backfill last `days` of CallRail calls
      3. Refresh GSC/GA4/GBP/Bing/CWV metrics
      4. Run a fresh ranking + AI Share of Voice snapshot

    Each step is independent. The response tells you exactly what
    succeeded and what's still blocked on env vars or external auth.
    """
    _check_admin_key(x_admin_key)
    out: dict = {"slug": slug, "steps": {}}

    # 1. CallRail webhook auto-setup
    try:
        webhook_res = await callrail_setup_webhook(slug=slug, x_admin_key=x_admin_key)
        out["steps"]["callrail_webhook"] = webhook_res
    except HTTPException as he:
        out["steps"]["callrail_webhook"] = {"ok": False, "detail": str(he.detail)[:200]}
    except Exception as e:
        out["steps"]["callrail_webhook"] = {"ok": False, "detail": f"{type(e).__name__}: {e}"[:200]}

    # 2–4. Backfill + metrics + ranking snapshot
    try:
        import_res = await import_all_in_one(slug=slug, days=days, x_admin_key=x_admin_key)
        out["steps"]["import_all"] = import_res
    except HTTPException as he:
        out["steps"]["import_all"] = {"ok": False, "detail": str(he.detail)[:200]}
    except Exception as e:
        out["steps"]["import_all"] = {"ok": False, "detail": f"{type(e).__name__}: {e}"[:200]}

    out["dashboard"] = f"https://lola.tyalexandermedia.com/r/client/{slug}"
    return out


# ── Diagnostic + test-call endpoints ────────────────────────────────────────
# Used once to verify the full pipeline (env vars → DB → dashboard) without
# needing a real inbound call. Safe to leave in — both require the admin key.


@router.get("/diagnostic/{slug}")
async def diagnostic(
    slug: str,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    Full health check for a client slug. Reports:
      - Which env vars are configured (values redacted)
      - Call + lead counts currently in the DB
      - Most recent call record (if any)
      - Whether the client seed row exists in reporting_clients
    Use from /docs → Try it out to confirm setup before going live.
    """
    _check_admin_key(x_admin_key)
    from db.tracking import counts_for_slug, recent_events
    from db.reporting import get_client_by_slug as _get_client

    counts = await counts_for_slug(slug)
    events = await recent_events(slug, limit=5)
    rc = await _get_client(slug)

    callrail_key = (os.getenv("CALLRAIL_API_KEY") or "").strip()
    callrail_acct = (os.getenv("CALLRAIL_ACCOUNT_ID") or "").strip()

    return {
        "slug": slug,
        "env": {
            "CALLRAIL_API_KEY": f"set ({callrail_key[:6]}...)" if callrail_key else "NOT SET",
            "CALLRAIL_ACCOUNT_ID": callrail_acct if callrail_acct else "NOT SET",
            "GA4_MEASUREMENT_ID": bool((os.getenv("GA4_MEASUREMENT_ID") or "").strip()),
            "GA4_API_SECRET": bool((os.getenv("GA4_API_SECRET") or "").strip()),
            "LOLA_SECRET_ADMIN_KEY": "set" if (os.getenv("LOLA_SECRET_ADMIN_KEY") or "").strip() else "NOT SET",
        },
        "client_seeded": rc is not None,
        "avg_job_value": int((rc or {}).get("avg_job_value") or 400),
        "counts": counts,
        "recent_events": events,
    }


@router.post("/test-call/{slug}")
async def inject_test_call(
    slug: str,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    Injects a synthetic 'completed' call into tracked_calls + tracked_events
    so you can verify the full DB → dashboard pipeline without placing a real
    call. The fake call is clearly labelled (caller_number = +10000000000,
    source = 'test_inject') so it's easy to identify and exclude later if
    needed.

    Steps to test the full pipeline:
      1. POST /lead-gen/test-call/sandbar  (X-Admin-Key header)
      2. Open https://lola.tyalexandermedia.com/r/client/sandbar
      3. You should see call count increment in the Tracking row
    """
    _check_admin_key(x_admin_key)
    from db.tracking import log_call, update_call_status, log_event

    test_sid = f"TEST-{uuid.uuid4().hex[:12].upper()}"
    await log_call(
        slug=slug,
        call_sid=test_sid,
        caller_number="+10000000000",
        tracking_number="TEST",
        forwarded_to=None,
        source="test_inject",
        caller_city="Palm Harbor",
        caller_state="FL",
    )
    await update_call_status(test_sid, status="completed", duration_sec=90)
    eid = await log_event(
        slug=slug,
        event_type="call",
        source="test_inject",
        meta={
            "call_sid": test_sid,
            "duration_sec": 90,
            "caller_number": "+10000000000",
            "caller_city": "Palm Harbor",
            "caller_state": "FL",
            "note": "synthetic test call",
        },
    )
    # Fire GA4 too — labelled with test=1 + debug_mode so it lands in
    # DebugView and won't be confused with real traffic in production reports.
    ga4_res = await _ga4_event(
        "phone_call",
        {
            "duration_sec": 90,
            "caller_city": "Palm Harbor",
            "source": "test_inject",
            "test": 1,
            "engagement_time_msec": 1,
        },
        client_id=test_sid,
        debug_mode=True,
    )
    return {
        "ok": True,
        "note": "Synthetic test call injected — refresh the dashboard to see it.",
        "call_sid": test_sid,
        "event_id": eid,
        "ga4": ga4_res,
        "dashboard": f"https://lola.tyalexandermedia.com/r/client/sandbar",
    }


@router.post("/ga4-fire-test")
async def ga4_fire_test(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    event_name: str = "phone_call",
):
    """
    Fires a REAL GA4 Measurement Protocol event (not the /debug/mp/collect
    validator) with debug_mode=1 so it shows up in GA4 DebugView within ~30
    seconds. Use this to confirm end-to-end that:
      1. The server can read GA4_MEASUREMENT_ID + GA4_API_SECRET
      2. GA4 accepts the credentials (HTTP 204)
      3. The event lands in DebugView

    Open GA4 → Reports → Realtime / Configure → DebugView BEFORE firing,
    then refresh after ~10-30s and look for `phone_call` from client_id
    `ga4-fire-test`.

    Returns:
      ok=true  → GA4 accepted the request (204 No Content)
      ok=false → either env vars missing or GA4 rejected (full body returned)

    Note: GA4 returns 204 even for invalid measurement IDs that *look*
    well-formed, so a 204 doesn't fully prove your stream is wired —
    pair this with the /lead-gen/setup-status validate check (which uses
    /debug/mp/collect and DOES return validation errors).
    """
    _check_admin_key(x_admin_key)
    live_result = await _ga4_event(
        event_name,
        {
            "test": 1,
            "source": "ga4_fire_test",
            "engagement_time_msec": 1,
        },
        client_id="ga4-fire-test",
        debug_mode=True,
    )
    # Also hit /debug/mp/collect so we get GA4's validation feedback — this
    # is the only path that returns actionable error messages (the real
    # /mp/collect just returns 204 silently for almost everything).
    validate_result = await _ga4_mp_validate()
    return {
        "live_fire": live_result,
        "validate": validate_result,
        "instructions": (
            "Open GA4 → Admin → Data Streams → your stream → DebugView. "
            "Refresh after 10-30 seconds. Look for client_id=ga4-fire-test "
            "and event=" + event_name + " with test=1, debug_mode=1."
        ),
    }


