"""
GoHighLevel lead-bridge + server-side PostHog logging.

When a Growth Score is submitted on the site we POST the lead to GoHighLevel's
inbound webhook so GHL creates/updates a contact in the "New Growth Score Lead"
pipeline stage, tagged "growth-score". The attempt is then logged to PostHog.

Safe-by-default: every function no-ops cleanly when its env var is unset, and
all network errors are swallowed — the existing lead flow must never break
whether or not GHL / PostHog are configured. GHL is dormant until
``GHL_INBOUND_WEBHOOK_URL`` is set in Railway.
"""

import os
from typing import Optional

import httpx

# GoHighLevel inbound webhook (Workflows → Inbound Webhook trigger). Blank →
# the bridge is dormant and no-ops. Map the flat keys below onto GHL contact
# fields in the workflow builder.
GHL_INBOUND_WEBHOOK_URL = os.getenv("GHL_INBOUND_WEBHOOK_URL", "").strip()

# Server-side PostHog capture. Defaults to the public-safe project key the
# frontend bakes into src/analytics.ts, so backend events land in the same
# project without extra config. Override per-env if a staging project is wanted.
POSTHOG_API_KEY = os.getenv(
    "POSTHOG_API_KEY", "phc_wSpZvSfqfZ9dLxujkupapvEbZyqLLQ5T6MZaBSd2XTXn"
).strip()
POSTHOG_HOST = (
    os.getenv("POSTHOG_HOST", "https://us.i.posthog.com").strip().rstrip("/")
)

# The pipeline stage new Growth Score leads land in on the GHL side.
GHL_PIPELINE_STAGE = "New Growth Score Lead"
GHL_TAG = "growth-score"

# New-contact bridges beyond the Growth Score. Each is OPT-IN and dormant by
# default: the code ships inert and is activated in Railway once the matching
# GoHighLevel inbound-webhook workflow exists to route the new `source` value.
# The webhook URL is already live for growth-score leads, so without these flags
# the new pushes would hit an unprepared workflow — hence off until Ty flips them.
GHL_BRIDGE_APPLICATIONS = (
    os.getenv("GHL_BRIDGE_APPLICATIONS", "false").strip().lower() == "true"
)
GHL_BRIDGE_PURCHASES = (
    os.getenv("GHL_BRIDGE_PURCHASES", "false").strip().lower() == "true"
)
# Pipeline-stage strings Ty maps in the GHL workflow builder (like the stage above).
GHL_PIPELINE_STAGE_APPLICATION = os.getenv(
    "GHL_PIPELINE_STAGE_APPLICATION", "Application"
).strip()
GHL_PIPELINE_STAGE_CUSTOMER = os.getenv(
    "GHL_PIPELINE_STAGE_CUSTOMER", "Customer"
).strip()

_TIMEOUT = 10.0


def ghl_enabled() -> bool:
    """True when the GHL inbound webhook is configured."""
    return bool(GHL_INBOUND_WEBHOOK_URL)


def outbound_via_ghl() -> bool:
    """
    True when GoHighLevel owns outbound messaging to CLIENTS' customers —
    review requests, lead follow-up, missed-call text-back.

    Defaults to true. Lola still pushes contacts and tags INTO GHL
    (push_growth_score_lead, services/build_review_segment.py); GHL decides
    what goes out and sends it from the client's own domain and number.

    This is a guard against double-sending, not a preference. RESEND_API_KEY
    has to be set on the backend anyway — main.py uses it for Lola's own
    audit-confirmation emails to Lola's own leads — and the follow-up runner
    wakes as soon as it sees that key (followup/runner.py). Without this switch,
    turning on Lola's prospecting email silently starts a second sender to a
    client's customers, duplicating whatever GHL is already sending them.

    Two sends of the same review request is a spam complaint, and a complaint
    costs a domain far more than it used to: the sending domain was used in an
    authenticated phishing blast in Aug 2026, so its reputation has no slack.

    Set OUTBOUND_VIA_GHL=false only when Lola is meant to send directly — and
    then make sure the corresponding GHL workflows are switched off.
    """
    return os.getenv("OUTBOUND_VIA_GHL", "true").strip().lower() == "true"


async def posthog_capture(
    event: str, distinct_id: str, properties: Optional[dict] = None
) -> None:
    """Best-effort server-side PostHog event. No-ops if the key is unset."""
    if not POSTHOG_API_KEY:
        return
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            await client.post(
                f"{POSTHOG_HOST}/capture/",
                json={
                    "api_key": POSTHOG_API_KEY,
                    "event": event,
                    "distinct_id": distinct_id or "anonymous",
                    "properties": properties or {},
                },
            )
    except Exception as e:  # analytics must never break the caller
        print(f"⚠️ posthog capture failed ({event}): {e}")


async def push_growth_score_lead(
    *,
    name: str = "",
    email: str = "",
    phone: str = "",
    city: str = "",
    service: str = "",
    source: str = "growth-score",
    score: Optional[int] = None,
    report_url: str = "",
) -> bool:
    """
    Bridge a Growth Score lead into GoHighLevel, then log the attempt to
    PostHog. Returns True when GHL accepted the lead (2xx).

    Safe-by-default: returns False immediately (no network, no log) when the
    webhook isn't configured, and swallows every error so a bad/slow GHL never
    affects the site's lead flow. Intended to be fire-and-forget via
    ``asyncio.create_task``.
    """
    if not ghl_enabled():
        return False

    # Flat payload — Ty maps these onto GHL contact fields in the workflow.
    payload = {
        "name": name or "",
        "email": email or "",
        "phone": phone or "",
        "city": city or "",
        "service": service or "",
        "source": source or GHL_TAG,
        "tags": [GHL_TAG],
        "pipeline_stage": GHL_PIPELINE_STAGE,
    }
    if score is not None:
        payload["growth_score"] = score
    if report_url:
        payload["report_url"] = report_url

    ok = False
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(GHL_INBOUND_WEBHOOK_URL, json=payload)
            ok = r.status_code < 400
            if not ok:
                print(f"⚠️ GHL bridge non-2xx: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"⚠️ GHL bridge failed: {e}")

    # Log the attempt regardless of GHL's result so PostHog shows attempts vs.
    # wins. Keyed on the lead's contact so it stitches to their other events.
    await posthog_capture(
        "ghl_lead_bridged",
        distinct_id=email or phone or "anonymous",
        properties={
            "ok": ok,
            "source": source or GHL_TAG,
            "service": service or "",
            "city": city or "",
            "has_email": bool(email),
            "has_phone": bool(phone),
            **({"growth_score": score} if score is not None else {}),
        },
    )
    return ok


async def _bridge_contact(
    *,
    source: str,
    tags: list,
    pipeline_stage: str,
    event: str,
    distinct_id: str = "",
    name: str = "",
    email: str = "",
    phone: str = "",
    city: str = "",
    service: str = "",
    extra: Optional[dict] = None,
    event_props: Optional[dict] = None,
) -> bool:
    """
    Shared GHL inbound-webhook bridge for the application/customer pushes. Same
    safe-by-default contract as push_growth_score_lead: no-ops when the webhook
    is unconfigured, swallows every error, logs the attempt to PostHog. Intended
    fire-and-forget via asyncio.create_task.
    """
    if not ghl_enabled():
        return False

    payload = {
        "name": name or "",
        "email": email or "",
        "phone": phone or "",
        "city": city or "",
        "service": service or "",
        "source": source,
        "tags": tags,
        "pipeline_stage": pipeline_stage,
    }
    if extra:
        payload.update({k: v for k, v in extra.items() if v not in (None, "")})

    ok = False
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(GHL_INBOUND_WEBHOOK_URL, json=payload)
            ok = r.status_code < 400
            if not ok:
                print(f"⚠️ GHL bridge non-2xx ({source}): {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"⚠️ GHL bridge failed ({source}): {e}")

    await posthog_capture(
        event,
        distinct_id=distinct_id or email or phone or "anonymous",
        properties={
            "ok": ok,
            "source": source,
            "has_email": bool(email),
            "has_phone": bool(phone),
            **(event_props or {}),
        },
    )
    return ok


async def push_application_lead(
    *,
    first_name: str = "",
    last_name: str = "",
    email: str = "",
    business_name: str = "",
    website: str = "",
    trade: str = "",
    monthly_revenue: str = "",
    tier: str = "",
    frustration: str = "",
) -> bool:
    """
    Bridge a submitted application into GoHighLevel as a hot lead. OPT-IN:
    dormant unless GHL_BRIDGE_APPLICATIONS=true. No phone is collected on the
    application form, so the contact is keyed on email and GHL de-dups onto any
    existing Growth Score contact.
    """
    if not GHL_BRIDGE_APPLICATIONS:
        return False
    tags = ["application"] + ([f"plan-{tier}"] if tier else [])
    return await _bridge_contact(
        source="application",
        tags=tags,
        pipeline_stage=GHL_PIPELINE_STAGE_APPLICATION,
        event="ghl_application_bridged",
        distinct_id=email,
        name=f"{first_name} {last_name}".strip(),
        email=email,
        service=trade,
        extra={
            "business_name": business_name,
            "website": website,
            "trade": trade,
            "monthly_revenue": monthly_revenue,
            "tier": tier,
            "frustration": frustration,
        },
        event_props={"tier": tier, "monthly_revenue": monthly_revenue, "trade": trade},
    )


async def push_customer(
    *,
    email: str = "",
    phone: str = "",
    tier: str = "",
    amount: Optional[int] = None,
    session_id: str = "",
) -> bool:
    """
    Bridge a paid customer into GoHighLevel (contact moved to the customer
    stage). OPT-IN: dormant unless GHL_BRIDGE_PURCHASES=true. Called from the
    Stripe webhook ONLY after signature verification + the paid check, as a
    fire-and-forget side effect that can never affect fulfillment.
    """
    if not GHL_BRIDGE_PURCHASES:
        return False
    tags = ["customer"] + ([f"plan-{tier}"] if tier else [])
    extra = {"tier": tier, "session_id": session_id}
    if amount is not None:
        extra["amount"] = amount
    return await _bridge_contact(
        source="customer",
        tags=tags,
        pipeline_stage=GHL_PIPELINE_STAGE_CUSTOMER,
        event="ghl_customer_bridged",
        distinct_id=email or phone,
        email=email,
        phone=phone,
        extra=extra,
        event_props={"tier": tier, **({"amount": amount} if amount is not None else {})},
    )
