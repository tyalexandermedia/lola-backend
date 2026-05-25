"""
Brevo transactional sender for Agent Two.

Uses Brevo's template system — the template must contain {{params.report_body}}
+ {{params.client_name}} + {{params.subject}} placeholders. Falls back to
raw HTML if no template ID is set.

One retry after 5-min delay per spec. Returns (ok, error_or_message_id).
"""

from __future__ import annotations
import asyncio
from typing import Optional

import httpx

from agents.reporting_agent.config import (
    BREVO_API_KEY,
    BREVO_REPORT_TEMPLATE_ID,
    BREVO_RETRY_DELAY_SEC,
    ALERT_EMAIL,
)

FROM_NAME = "Coach Ty (Lola)"
FROM_EMAIL = "ty@tyalexandermedia.com"


async def _send_once(
    http: httpx.AsyncClient,
    to_email: str,
    to_name: str,
    subject: str,
    report_body: str,
    template_id: Optional[int],
) -> tuple[bool, str]:
    if not BREVO_API_KEY:
        return False, "BREVO_API_KEY not configured"

    payload: dict = {
        "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "replyTo": {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": subject,
        "params": {
            "client_name": to_name,
            "subject": subject,
            "report_body": report_body,
        },
    }
    if template_id:
        payload["templateId"] = int(template_id)
    else:
        # Fallback: just send the report body as text/html if no template configured
        payload["htmlContent"] = (
            f"<pre style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            f"font-size:15px;line-height:1.55;color:#0A0A0A;white-space:pre-wrap;\">{report_body}</pre>"
        )
        payload["textContent"] = report_body

    try:
        resp = await http.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={
                "api-key": BREVO_API_KEY,
                "content-type": "application/json",
                "accept": "application/json",
            },
            timeout=20.0,
        )
        if 200 <= resp.status_code < 300:
            data = resp.json() if resp.content else {}
            return True, data.get("messageId", "sent")
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return False, f"exception: {e}"


async def send_report_email(
    to_email: str,
    to_name: str,
    subject: str,
    report_body: str,
    template_id: Optional[int] = None,
) -> tuple[bool, str]:
    """Send + 1 retry after BREVO_RETRY_DELAY_SEC. Returns (ok, message_id_or_error)."""
    effective_template = template_id or (BREVO_REPORT_TEMPLATE_ID or None)
    async with httpx.AsyncClient() as http:
        ok, msg = await _send_once(http, to_email, to_name, subject, report_body, effective_template)
        if ok:
            return True, msg
        # Retry after delay
        await asyncio.sleep(BREVO_RETRY_DELAY_SEC)
        return await _send_once(http, to_email, to_name, subject, report_body, effective_template)


async def send_alert_to_ty(subject_suffix: str, body: str) -> tuple[bool, str]:
    """Alert email to Ty when a client's pipeline fails. No retry — just one shot."""
    if not BREVO_API_KEY:
        return False, "BREVO_API_KEY not configured"
    async with httpx.AsyncClient() as http:
        return await _send_once(
            http,
            to_email=ALERT_EMAIL,
            to_name="Coach Ty",
            subject=f"[Lola Agent 2 ALERT] {subject_suffix}",
            report_body=body,
            template_id=None,  # plain HTML
        )
