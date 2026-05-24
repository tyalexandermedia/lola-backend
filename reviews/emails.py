"""
Resend send helpers + HTML templates for the review-capture module.

We don't share the audit-email templates (those are upsell-heavy). These are
short, plainspoken, Coach-Ty-voice asks built for high reply rate. Two emails:

  1) send_customer_request_email  — to the customer, asks for a 5-star rating
  2) send_owner_feedback_email    — to the business owner, when rating <= 3

Both POST to Resend via the same /emails endpoint that the audit-confirmation
flow in main.py uses. We reuse RESEND_API_KEY + AUDIT_FROM_EMAIL so deliverability
inherits the existing domain warmup.
"""

import os
import traceback
from typing import Optional

import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip() or None
# Match the existing audit-confirmation From so we don't fragment domain reputation.
REVIEWS_FROM_EMAIL = os.getenv(
    "AUDIT_FROM_EMAIL", "Coach Ty (Lola) <ty@tyalexandermedia.com>"
).strip()
RESEND_URL = "https://api.resend.com/emails"
SEND_TIMEOUT = float(os.getenv("API_TIMEOUT", "8.0"))


async def _resend_post(payload: dict) -> bool:
    if not RESEND_API_KEY:
        print("Reviews email skipped: RESEND_API_KEY not configured.")
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_URL,
                json=payload,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                timeout=SEND_TIMEOUT,
            )
        if not (200 <= resp.status_code < 300):
            print(
                f"Resend error {resp.status_code} on reviews send: {resp.text[:200]}"
            )
            return False
        return True
    except Exception:
        traceback.print_exc()
        return False


# ── Customer request email ─────────────────────────────────


def _customer_html(
    *, business_name: str, customer_name: Optional[str],
    feedback_url: str, brand_color: str, logo_url: Optional[str],
) -> str:
    greeting_name = customer_name.strip() if customer_name else "there"
    logo_block = (
        f'<tr><td align="center" style="padding:28px 28px 8px;">'
        f'<img src="{logo_url}" alt="{business_name}" '
        f'style="max-height:48px;width:auto;display:block;"></td></tr>'
        if logo_url else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quick favor</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
{logo_block}
<tr><td style="padding:32px 28px 8px;">
<p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:#111827;">Hey {greeting_name},</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#374151;">Thanks for choosing <strong>{business_name}</strong>. Would you take 10 seconds to share how it went? It really helps small businesses like ours.</p>
</td></tr>
<tr><td align="center" style="padding:12px 28px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:{brand_color};">
<a href="{feedback_url}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;min-height:48px;line-height:1.2;">Share your experience →</a>
</td></tr></table>
<p style="margin:14px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">{feedback_url}</p>
</td></tr>
<tr><td style="padding:0 28px 28px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">Thanks,<br>The team at {business_name}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>"""


def _customer_text(
    *, business_name: str, customer_name: Optional[str], feedback_url: str,
) -> str:
    greeting_name = customer_name.strip() if customer_name else "there"
    return (
        f"Hey {greeting_name},\n\n"
        f"Thanks for choosing {business_name}. Would you take 10 seconds to "
        f"share how it went? It really helps small businesses like ours.\n\n"
        f"{feedback_url}\n\n"
        f"Thanks,\nThe team at {business_name}\n"
    )


async def send_customer_request_email(
    *,
    to_email: str,
    business_name: str,
    owner_email: str,
    customer_name: Optional[str],
    feedback_url: str,
    brand_color: str = "#0a66c2",
    logo_url: Optional[str] = None,
) -> bool:
    subject = (
        f"Quick favor — would you share your experience with {business_name}?"
    )
    payload = {
        "from": REVIEWS_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": _customer_html(
            business_name=business_name,
            customer_name=customer_name,
            feedback_url=feedback_url,
            brand_color=brand_color or "#0a66c2",
            logo_url=logo_url,
        ),
        "text": _customer_text(
            business_name=business_name,
            customer_name=customer_name,
            feedback_url=feedback_url,
        ),
        # Replies route to the owner, not Ty. That's the whole point.
        "reply_to": owner_email,
    }
    return await _resend_post(payload)


# ── Owner notification email (negative feedback) ───────────


def _owner_html(
    *,
    business_name: str,
    customer_name: Optional[str],
    customer_email: Optional[str],
    customer_phone: Optional[str],
    rating: int,
    message: str,
    contact_back: bool,
    timestamp: str,
) -> str:
    name_disp = customer_name or "(no name provided)"
    email_disp = customer_email or "(no email provided)"
    phone_disp = customer_phone or "(no phone provided)"
    cb_disp = "Yes" if contact_back else "No"
    # Escape the message minimally so HTML chars don't break layout.
    safe_msg = (
        message.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
    )
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private feedback</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="padding:24px 28px 8px;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;color:#dc2626;text-transform:uppercase;font-weight:700;">Heads up — private feedback</p>
<p style="margin:0 0 4px;font-size:20px;color:#111827;font-weight:700;">{name_disp} left {rating}★ for {business_name}</p>
<p style="margin:0;font-size:13px;color:#6b7280;">{timestamp}</p>
</td></tr>
<tr><td style="padding:8px 28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:8px;">
<tr><td style="padding:18px 20px;">
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Customer</p>
<p style="margin:0 0 4px;font-size:15px;color:#111827;"><strong>{name_disp}</strong></p>
<p style="margin:0 0 4px;font-size:14px;color:#374151;">Email: {email_disp}</p>
<p style="margin:0 0 4px;font-size:14px;color:#374151;">Phone: {phone_disp}</p>
<p style="margin:0;font-size:14px;color:#374151;">Wants a call back: <strong>{cb_disp}</strong></p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px;">
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Message</p>
<div style="padding:16px 18px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;font-size:15px;line-height:1.6;color:#1f2937;">{safe_msg}</div>
</td></tr>
<tr><td style="padding:0 28px 28px;">
<p style="margin:0;font-size:13px;color:#6b7280;">Reply directly to this email to reach {name_disp} (if they provided an address).</p>
</td></tr>
</table>
</td></tr></table>
</body></html>"""


def _owner_text(
    *,
    business_name: str,
    customer_name: Optional[str],
    customer_email: Optional[str],
    customer_phone: Optional[str],
    rating: int,
    message: str,
    contact_back: bool,
    timestamp: str,
) -> str:
    return (
        f"Private feedback for {business_name}\n"
        f"Time: {timestamp}\n"
        f"Rating: {rating}/5\n\n"
        f"Customer: {customer_name or '(no name)'}\n"
        f"Email: {customer_email or '(no email)'}\n"
        f"Phone: {customer_phone or '(no phone)'}\n"
        f"Wants call back: {'Yes' if contact_back else 'No'}\n\n"
        f"Message:\n{message}\n"
    )


async def send_owner_feedback_email(
    *,
    owner_email: str,
    business_name: str,
    customer_name: Optional[str],
    customer_email: Optional[str],
    customer_phone: Optional[str],
    rating: int,
    message: str,
    contact_back: bool,
    timestamp: str,
) -> bool:
    name_subj = customer_name or "a customer"
    subject = (
        f"Heads up — {name_subj} left private feedback ({rating}★) on "
        f"{business_name}"
    )
    payload = {
        "from": REVIEWS_FROM_EMAIL,
        "to": [owner_email],
        "subject": subject,
        "html": _owner_html(
            business_name=business_name,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            rating=rating,
            message=message,
            contact_back=contact_back,
            timestamp=timestamp,
        ),
        "text": _owner_text(
            business_name=business_name,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            rating=rating,
            message=message,
            contact_back=contact_back,
            timestamp=timestamp,
        ),
    }
    # Reply-To customer if we have an address so owner can reply directly.
    if customer_email:
        payload["reply_to"] = customer_email
    return await _resend_post(payload)
