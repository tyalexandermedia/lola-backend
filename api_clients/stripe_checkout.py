"""
Server-created Stripe Checkout Sessions for the real paid plans.

The single static Payment Link can only charge one fixed recurring amount — it
can't represent a chosen plan, bundle the plan's one-time setup fee, or carry
per-application metadata. This mints a Checkout Session per APPROVED buyer: the
recurring price PLUS the one-time setup fee on the first invoice (via
subscription_data[add_invoice_items]), tagged with metadata the Stripe webhook
fulfills by — never by fragile amount-matching.

  Local Growth System   $797/mo + $997 launch
  Local Visibility      $397/mo + $397 activation
  Expansion / "both"    no self-serve price — stays manual (returns an error)

Safe-by-default + OPT-IN: dormant unless STRIPE_CHECKOUT_SESSIONS=true AND the
secret key + the plan's price IDs are set. Territory exclusivity means this is
only ever triggered after Ty approves an application (admin-gated) — there is no
public self-serve route to it. Stripe is called via the raw form-encoded API,
the same style as main.py's _stripe_get_session; no SDK dependency. Every error
is returned, never raised, so a caller can degrade to the manual flow.
"""

import os
from typing import Optional

import httpx

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_CHECKOUT_SESSIONS = (
    os.getenv("STRIPE_CHECKOUT_SESSIONS", "false").strip().lower() == "true"
)
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://www.coachtyleads.com").rstrip("/")

# plan → (recurring price id, one-time setup price id). Set these in Stripe
# (TEST mode first) and wire the ids in Railway. A blank recurring id means the
# plan has no self-serve checkout yet.
PLAN_PRICES = {
    "growth": (
        os.getenv("STRIPE_PRICE_GROWTH_MONTHLY", "").strip(),
        os.getenv("STRIPE_PRICE_GROWTH_LAUNCH", "").strip(),
    ),
    "visibility": (
        os.getenv("STRIPE_PRICE_VISIBILITY_MONTHLY", "").strip(),
        os.getenv("STRIPE_PRICE_VISIBILITY_ACTIVATION", "").strip(),
    ),
}

_TIMEOUT = 20.0


def checkout_sessions_enabled() -> bool:
    """True only when the feature flag is on AND a secret key is configured."""
    return bool(STRIPE_CHECKOUT_SESSIONS and STRIPE_SECRET_KEY)


def plan_is_chargeable(plan: str) -> bool:
    """True when the plan has a self-serve recurring price configured."""
    rec, _setup = PLAN_PRICES.get((plan or "").strip().lower(), ("", ""))
    return bool(rec)


async def create_checkout_session(
    *, plan: str, email: str = "", application_id: Optional[int] = None
) -> dict:
    """
    Create a Stripe Checkout Session for an APPROVED buyer. Returns
    ``{"url": ..., "id": ...}`` on success, else ``{"error": ...}``. Never raises.

    Dormant unless enabled and the plan's recurring price id is set; expansion /
    "both" have no self-serve price and return an error so they stay manual.
    """
    plan = (plan or "").strip().lower()
    if not checkout_sessions_enabled():
        return {"error": "checkout_sessions_disabled"}
    rec_price, setup_price = PLAN_PRICES.get(plan, ("", ""))
    if not rec_price:
        return {"error": f"no_self_serve_price_for_plan:{plan}"}

    # Stripe's API is form-encoded with bracket notation. Recurring line item in
    # subscription mode; the one-time setup fee rides the first invoice via
    # subscription_data[add_invoice_items]. {CHECKOUT_SESSION_ID} is substituted
    # by Stripe into the success redirect (/start reads session_id).
    form: dict = {
        "mode": "subscription",
        "line_items[0][price]": rec_price,
        "line_items[0][quantity]": "1",
        "success_url": f"{PUBLIC_APP_URL}/start?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{PUBLIC_APP_URL}/pricing",
        "metadata[plan]": plan,
        "subscription_data[metadata][plan]": plan,
        "allow_promotion_codes": "true",
    }
    if setup_price:
        form["subscription_data[add_invoice_items][0][price]"] = setup_price
    if email:
        form["customer_email"] = email
    if application_id is not None:
        form["metadata[application_id]"] = str(application_id)
        form["subscription_data[metadata][application_id]"] = str(application_id)

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                data=form,
                headers={"Authorization": f"Bearer {STRIPE_SECRET_KEY}"},
            )
        if r.status_code < 300:
            body = r.json()
            return {"url": body.get("url"), "id": body.get("id")}
        return {"error": f"stripe_{r.status_code}: {r.text[:200]}"}
    except Exception as e:  # never let a checkout error take down the caller
        return {"error": f"stripe_exception: {type(e).__name__}: {str(e)[:200]}"}
