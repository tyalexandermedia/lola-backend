"""
Cold-outreach send loop.

Reuses the existing Resend integration. Per send:
  1. Skip if email is already in sent_log (dedupe)
  2. Skip if email is in suppression list
  3. Render variant template
  4. Append UTM-tagged audit link + unsubscribe link
  5. Send via Resend
  6. Record into cold_outreach_log
  7. Sleep random 30-90s before next
"""

import asyncio
import hashlib
import hmac
import os
import random
import urllib.parse
from typing import List, Optional, Tuple

import httpx

from db.outreach import (
    already_sent,
    count_sends_today,
    is_suppressed,
    record_send,
)
from outreach.leads import Lead
from outreach.llm_variants import render_variant
from outreach.templates import VariantKey, active_variants
from outreach.warmup import daily_cap_for_today

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
OUTREACH_FROM_EMAIL = os.getenv(
    "OUTREACH_FROM_EMAIL",
    os.getenv("AUDIT_FROM_EMAIL", "LOLA SEO <lola@tyalexandermedia.com>"),
).strip()
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://lola.tyalexandermedia.com").rstrip("/")
ADMIN_KEY = os.getenv("LOLA_SECRET_ADMIN_KEY", "").encode("utf-8")

JITTER_MIN_SEC = int(os.getenv("OUTREACH_JITTER_MIN_SEC", "30"))
JITTER_MAX_SEC = int(os.getenv("OUTREACH_JITTER_MAX_SEC", "90"))

# Tier 4: when set, sender generates a per-lead Reply-To alias so inbound
# replies can be matched back to the originating send via webhook. Without
# this domain configured, replies still come back to OUTREACH_FROM_EMAIL.
OUTREACH_REPLY_DOMAIN = os.getenv("OUTREACH_REPLY_DOMAIN", "").strip()


def make_unsub_token(email: str) -> str:
    """HMAC of email with admin key — prevents enumeration."""
    if not ADMIN_KEY:
        return ""
    return hmac.new(ADMIN_KEY, email.lower().encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def make_reply_alias(email: str) -> Optional[str]:
    """
    Tier 4 reply alias: `reply+<token>@<OUTREACH_REPLY_DOMAIN>`.
    Returns None if OUTREACH_REPLY_DOMAIN isn't configured.
    """
    if not OUTREACH_REPLY_DOMAIN or not ADMIN_KEY:
        return None
    token = hmac.new(
        ADMIN_KEY, ("reply:" + email.lower()).encode("utf-8"), hashlib.sha256
    ).hexdigest()[:14]
    return f"reply+{token}@{OUTREACH_REPLY_DOMAIN}"


def audit_link_for(variant: VariantKey, email: str) -> str:
    qs = urllib.parse.urlencode(
        {
            "utm_source": "agent4",
            "utm_medium": "email",
            "utm_campaign": "fl_contractors",
            "utm_content": f"variant_{variant}",
            "lead": email,
        }
    )
    return f"{PUBLIC_APP_URL}/?{qs}"


def unsub_link_for(email: str) -> str:
    token = make_unsub_token(email)
    qs = urllib.parse.urlencode({"email": email, "token": token})
    return f"{PUBLIC_APP_URL.replace('lola.tyalexandermedia.com', '')}/unsubscribe?{qs}" if False else f"{PUBLIC_APP_URL}/unsubscribe?{qs}"


def render_unsub_footer(email: str) -> str:
    return f"Don't want these? One-click unsubscribe: {unsub_link_for(email)}"


async def send_one(
    client: httpx.AsyncClient,
    lead: Lead,
    variant: VariantKey,
    dry_run: bool = False,
) -> Tuple[bool, Optional[str], str, str, Optional[str]]:
    """
    Send a single email. Returns (ok, resend_message_id, subject, body, reply_alias).
    `dry_run=True` short-circuits Resend; subject/body still rendered.
    """
    tokens = {
        "first_name": (lead.owner_first_name or "there").split(" ")[0],
        "business_name": lead.business_name or "your business",
        "city": lead.city or "",
        "audit_link": audit_link_for(variant, lead.email),
        "unsub_link": render_unsub_footer(lead.email),
    }
    # Tier 3 hook: LLM variants when enabled, static otherwise. Same signature.
    subject, body = await render_variant(
        variant,
        lead.business_name or "",
        lead.owner_first_name or "",
        lead.city or "",
        tokens,
    )
    reply_alias = make_reply_alias(lead.email)

    if dry_run:
        return True, None, subject, body, reply_alias
    if not RESEND_API_KEY:
        return False, None, subject, body, reply_alias

    try:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": OUTREACH_FROM_EMAIL,
                "to": [lead.email],
                "subject": subject,
                "text": body,
                "reply_to": reply_alias or OUTREACH_FROM_EMAIL,
            },
            timeout=15.0,
        )
        if 200 <= resp.status_code < 300:
            data = resp.json()
            return True, data.get("id"), subject, body, reply_alias
        print(f"Resend error {resp.status_code} for {lead.email}: {resp.text[:200]}")
        return False, None, subject, body, reply_alias
    except Exception as e:
        print(f"Resend exception for {lead.email}: {e}")
        return False, None, subject, body, reply_alias


async def run_batch(leads: List[Lead], dry_run: bool = False) -> dict:
    """
    Process a batch of leads: dedupe, suppress-check, send up to daily cap,
    log each. Returns a summary dict.
    """
    cap = daily_cap_for_today()
    sent_today = await count_sends_today()
    remaining = max(0, cap - sent_today)

    summary = {
        "cap": cap,
        "sent_today_before": sent_today,
        "leads_total": len(leads),
        "skipped_already_sent": 0,
        "skipped_suppressed": 0,
        "would_send" if dry_run else "sent": 0,
        "failed": 0,
        "remaining_after": 0,
        "dry_run": dry_run,
    }

    if remaining == 0:
        return summary

    # Filter leads before any sending — fewer Resend calls is better.
    eligible: List[Lead] = []
    for lead in leads:
        if await already_sent(lead.email):
            summary["skipped_already_sent"] += 1
            continue
        if await is_suppressed(lead.email):
            summary["skipped_suppressed"] += 1
            continue
        eligible.append(lead)
        if len(eligible) >= remaining:
            break

    if not eligible:
        return summary

    async with httpx.AsyncClient() as client:
        for i, lead in enumerate(eligible):
            rotation = active_variants()
            variant: VariantKey = rotation[i % len(rotation)]
            ok, msg_id, subject, _body, reply_alias = await send_one(
                client, lead, variant, dry_run=dry_run
            )

            if not dry_run:
                await record_send(
                    email=lead.email,
                    owner_first_name=lead.owner_first_name,
                    business_name=lead.business_name,
                    website=lead.website,
                    city=lead.city,
                    variant=variant,
                    subject=subject,
                    resend_message_id=msg_id,
                    bounced=not ok,
                    reply_alias=reply_alias,
                )

            if ok:
                summary["would_send" if dry_run else "sent"] += 1
            else:
                summary["failed"] += 1

            # Jitter between sends — only for real sends.
            if not dry_run and i < len(eligible) - 1:
                await asyncio.sleep(random.randint(JITTER_MIN_SEC, JITTER_MAX_SEC))

    summary["remaining_after"] = max(
        0, cap - (sent_today + (summary["sent"] if not dry_run else 0))
    )
    return summary
