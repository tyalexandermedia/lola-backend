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

_TIMEOUT = 10.0


def ghl_enabled() -> bool:
    """True when the GHL inbound webhook is configured."""
    return bool(GHL_INBOUND_WEBHOOK_URL)


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
