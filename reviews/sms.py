"""
Outbound SMS via Twilio Programmable Messaging.

Everything here is gated on TWILIO_ENABLED + credentials. When SMS is not
configured we log and return False — we never raise and never block the caller
(the Growth Score / review flows must succeed even if texting is off).

Env:
  TWILIO_ENABLED=true|false
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_FROM_NUMBER=+1727...

Every outbound template includes the required opt-out line "Reply STOP to opt out."
"""

import os
from typing import Optional

import httpx

OPT_OUT = "Reply STOP to opt out."
_TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def twilio_enabled() -> bool:
    return os.getenv("TWILIO_ENABLED", "false").strip().lower() == "true"


def _creds() -> Optional[tuple[str, str, str]]:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    if not (sid and token and from_number):
        return None
    return sid, token, from_number


def _with_opt_out(body: str) -> str:
    """Guarantee the compliance opt-out line is present exactly once."""
    return body if OPT_OUT in body else f"{body.rstrip()}\n\n{OPT_OUT}"


async def send_sms(
    to_phone: str,
    body: str,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> bool:
    """
    Send one SMS. Returns True on a 2xx from Twilio, else False.

    No-ops (returns False) when SMS is disabled, credentials are missing, or the
    destination number is empty — callers treat texting as best-effort.
    """
    to_phone = (to_phone or "").strip()
    if not to_phone:
        return False
    if not twilio_enabled():
        print("📵 SMS skipped — TWILIO_ENABLED is not true.")
        return False
    creds = _creds()
    if not creds:
        print("📵 SMS skipped — Twilio credentials not fully configured.")
        return False
    sid, token, from_number = creds

    payload = {"From": from_number, "To": to_phone, "Body": _with_opt_out(body)}
    url = _TWILIO_API.format(sid=sid)

    own_client = client is None
    client = client or httpx.AsyncClient(timeout=15)
    try:
        resp = await client.post(url, data=payload, auth=(sid, token))
        if resp.status_code // 100 == 2:
            print(f"📨 SMS sent to {to_phone}")
            return True
        print(f"❌ SMS failed ({resp.status_code}): {resp.text[:300]}")
        return False
    except Exception as e:  # network/transport — stay best-effort
        print(f"❌ SMS error: {e}")
        return False
    finally:
        if own_client:
            await client.aclose()


async def send_growth_score_sms(
    to_phone: str,
    business_name: str,
    report_url: str,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> bool:
    """Deliver a lead their Growth Score by text (best-effort, opt-out appended)."""
    name = (business_name or "there").strip()
    body = (
        f"Hey {name}, it's Lola 🐾 Your free Growth Score is ready — "
        f"here's exactly where you show up on Google and in AI answers, "
        f"plus the #1 fix to climb: {report_url}"
    )
    return await send_sms(to_phone, body, client=client)


async def send_sms_review_request(
    *,
    to_phone: str,
    business_name: str,
    feedback_url: str,
    customer_name: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> bool:
    """Text a customer a review/feedback request (best-effort, opt-out appended)."""
    who = (customer_name or "there").strip()
    body = (
        f"Hi {who}, thanks for choosing {business_name}! "
        f"How did we do? {feedback_url}"
    )
    return await send_sms(to_phone, body, client=client)
