"""
SMS review-request stub.

We don't ship Twilio in this MVP — but the codepath is visible so the routes
layer can call it. When TWILIO_ENABLED != "true", the route returns 400 before
this is ever called. If something does call it, raise NotImplementedError loud
and clear so we don't silently swallow a missed send.
"""

import os
from typing import Optional


def twilio_enabled() -> bool:
    return os.getenv("TWILIO_ENABLED", "false").strip().lower() == "true"


async def send_sms_review_request(
    *,
    to_phone: str,
    business_name: str,
    feedback_url: str,
    customer_name: Optional[str] = None,
) -> bool:
    """
    Stub. Will eventually POST to Twilio Programmable Messaging.
    For now: raise so we never silently no-op an outbound ask.
    """
    raise NotImplementedError(
        "SMS review requests are not yet implemented. Set TWILIO_ENABLED=true "
        "and wire this function to Twilio before enabling the sms channel."
    )
