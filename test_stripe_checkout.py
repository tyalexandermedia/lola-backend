"""
Regression guard for the Stripe Checkout Session money path
(api_clients/stripe_checkout.py) and the webhook idempotency claim
(db/billing.py).

Proves, WITHOUT any real Stripe call (httpx is stubbed):
  1. create_checkout_session no-ops when the flag/secret is unset.
  2. A plan with no configured price id returns an error (stays manual).
  3. When enabled + priced, it POSTs a subscription Checkout Session with the
     recurring price, the one-time setup fee on the first invoice, and
     metadata.plan — and returns the Stripe-hosted url.
  4. claim_checkout_session is idempotent: first claim True, replay False.

Run:  python3 test_stripe_checkout.py
"""

import asyncio
import importlib
import os
import tempfile


class _FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


class _FakeClient:
    posts: list = []
    response = None

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, data=None, headers=None, **k):
        type(self).posts.append({"url": url, "data": data, "headers": headers})
        return type(self).response or _FakeResponse(
            200, {"url": "https://checkout.stripe.test/c/pay/cs_test_123", "id": "cs_test_123"}
        )


async def checkout_tests() -> None:
    # 1) Dormant when the flag is off (even with a key set) → no network.
    os.environ.pop("STRIPE_CHECKOUT_SESSIONS", None)
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_x"
    import api_clients.stripe_checkout as sc
    sc = importlib.reload(sc)
    sc.httpx.AsyncClient = _FakeClient
    _FakeClient.posts = []
    r = await sc.create_checkout_session(plan="growth", email="a@a.com")
    assert r.get("error") == "checkout_sessions_disabled", r
    assert _FakeClient.posts == [], "disabled path must not POST"

    # 2+3) Enabled + priced + stubbed httpx.
    os.environ["STRIPE_CHECKOUT_SESSIONS"] = "true"
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_x"
    os.environ["STRIPE_PRICE_GROWTH_MONTHLY"] = "price_growth_mo"
    os.environ["STRIPE_PRICE_GROWTH_LAUNCH"] = "price_growth_launch"
    os.environ.pop("STRIPE_PRICE_VISIBILITY_MONTHLY", None)
    sc = importlib.reload(sc)
    sc.httpx.AsyncClient = _FakeClient
    _FakeClient.posts = []

    assert sc.checkout_sessions_enabled() is True
    assert sc.plan_is_chargeable("growth") is True
    assert sc.plan_is_chargeable("visibility") is False  # no price set
    assert sc.plan_is_chargeable("expansion") is False

    ok = await sc.create_checkout_session(plan="growth", email="pat@roof.com", application_id=7)
    assert ok.get("url", "").startswith("https://checkout.stripe.test/"), ok
    sent = _FakeClient.posts[-1]
    assert sent["url"] == "https://api.stripe.com/v1/checkout/sessions"
    assert sent["headers"]["Authorization"] == "Bearer sk_test_x"
    d = sent["data"]
    assert d["mode"] == "subscription", d
    assert d["line_items[0][price]"] == "price_growth_mo", d
    assert d["subscription_data[add_invoice_items][0][price]"] == "price_growth_launch", d
    assert d["metadata[plan]"] == "growth", d
    assert d["metadata[application_id]"] == "7", d
    assert d["customer_email"] == "pat@roof.com", d
    assert "{CHECKOUT_SESSION_ID}" in d["success_url"], d

    # Plan with no configured price → stays manual (error, no POST).
    _FakeClient.posts = []
    r = await sc.create_checkout_session(plan="expansion", email="x@y.com")
    assert r.get("error", "").startswith("no_self_serve_price_for_plan"), r
    assert _FakeClient.posts == [], "no-price plan must not POST"

    print("OK: Stripe Checkout Session creation is safe-by-default and well-formed")


async def idempotency_tests() -> None:
    tmp = tempfile.mkdtemp()
    os.environ["DB_PATH"] = os.path.join(tmp, "billing.db")
    import db.billing as billing
    billing = importlib.reload(billing)
    first = await billing.claim_checkout_session("cs_test_abc")
    second = await billing.claim_checkout_session("cs_test_abc")
    other = await billing.claim_checkout_session("cs_test_def")
    assert first is True, "first claim should succeed"
    assert second is False, "replay of the same session must be rejected"
    assert other is True, "a different session should succeed"
    assert await billing.claim_checkout_session("") is True, "blank id never blocks"
    print("OK: claim_checkout_session is idempotent (first True, replay False)")


if __name__ == "__main__":
    asyncio.run(checkout_tests())
    asyncio.run(idempotency_tests())
