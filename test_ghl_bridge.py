"""
Regression guard for the GoHighLevel lead-bridge (api_clients/ghl.py).

Proves the safe-by-default contract and the field mapping:
  1. Dormant when GHL_INBOUND_WEBHOOK_URL is unset — no-op, no network.
  2. When configured, POSTs the mapped payload (name/email/phone/city/service/
     source) with the "growth-score" tag + "New Growth Score Lead" stage.
  3. A failing/raising GHL never propagates (returns False, no exception).

Run:  python3 test_ghl_bridge.py
"""

import asyncio
import importlib
import os


class _FakeResponse:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


class _FakeClient:
    """Records POSTs; behavior controlled by class-level knobs."""

    posts = []
    raise_on_post = False
    status_code = 200

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, json=None, **k):
        type(self).posts.append({"url": url, "json": json})
        if type(self).raise_on_post:
            raise RuntimeError("boom")
        return _FakeResponse(type(self).status_code)


async def main() -> None:
    # 1) Dormant by default — unset webhook → no-op, no network attempt.
    os.environ.pop("GHL_INBOUND_WEBHOOK_URL", None)
    import api_clients.ghl as ghl
    ghl = importlib.reload(ghl)

    assert ghl.ghl_enabled() is False
    result = await ghl.push_growth_score_lead(name="Sandbar Soft Wash")
    assert result is False, "dormant bridge must return False"

    # 2) Configured — patch httpx so no real network is used.
    os.environ["GHL_INBOUND_WEBHOOK_URL"] = "https://ghl.example/webhook/abc"
    os.environ.pop("POSTHOG_API_KEY", None)  # skip posthog leg in the test
    ghl = importlib.reload(ghl)
    ghl.POSTHOG_API_KEY = ""  # ensure the posthog capture no-ops
    ghl.httpx.AsyncClient = _FakeClient
    _FakeClient.posts = []

    assert ghl.ghl_enabled() is True
    ok = await ghl.push_growth_score_lead(
        name="Sandbar Soft Wash",
        email="pat@example.com",
        phone="+17275550123",
        city="Tampa",
        service="soft wash",
        source="growth-score",
        score=42,
        report_url="https://lola/r/xyz",
    )
    assert ok is True, "2xx GHL response should return True"
    assert len(_FakeClient.posts) == 1, _FakeClient.posts
    sent = _FakeClient.posts[0]
    assert sent["url"] == "https://ghl.example/webhook/abc"
    body = sent["json"]
    for key, val in [
        ("name", "Sandbar Soft Wash"),
        ("email", "pat@example.com"),
        ("phone", "+17275550123"),
        ("city", "Tampa"),
        ("service", "soft wash"),
        ("source", "growth-score"),
    ]:
        assert body.get(key) == val, f"{key} mismatch: {body.get(key)!r}"
    assert body.get("tags") == ["growth-score"], body.get("tags")
    assert body.get("pipeline_stage") == "New Growth Score Lead"
    assert body.get("growth_score") == 42

    # 3) A raising GHL must be swallowed (returns False, no exception).
    _FakeClient.posts = []
    _FakeClient.raise_on_post = True
    ok = await ghl.push_growth_score_lead(name="Boom Co", email="b@b.com")
    assert ok is False, "raising GHL should return False, not throw"
    _FakeClient.raise_on_post = False

    # 4) Non-2xx GHL → False, still no exception.
    _FakeClient.status_code = 500
    ok = await ghl.push_growth_score_lead(name="Bad Co", email="c@c.com")
    assert ok is False, "non-2xx GHL should return False"

    # 5) The new application/customer pushes are OPT-IN: dormant even with the
    #    webhook set, until their own flag is on — so they can't hit an
    #    unprepared GHL workflow.
    _FakeClient.raise_on_post = False
    _FakeClient.status_code = 200
    _FakeClient.posts = []
    assert await ghl.push_application_lead(email="a@a.com") is False
    assert await ghl.push_customer(email="a@a.com") is False
    assert _FakeClient.posts == [], "opt-in pushes must not POST while dormant"

    # 6) Flags on → each bridges with the right source / tags / stage.
    os.environ["GHL_BRIDGE_APPLICATIONS"] = "true"
    os.environ["GHL_BRIDGE_PURCHASES"] = "true"
    ghl = importlib.reload(ghl)
    ghl.POSTHOG_API_KEY = ""  # keep posthog leg a no-op so posts[] holds only GHL
    ghl.httpx.AsyncClient = _FakeClient
    _FakeClient.posts = []

    ok = await ghl.push_application_lead(
        first_name="Pat", last_name="Roof", email="pat@roof.com",
        business_name="Roof Co", website="roofco.com", trade="roofing",
        monthly_revenue="50k_100k", tier="growth", frustration="slow leads",
    )
    assert ok is True
    appl = _FakeClient.posts[-1]["json"]
    assert appl["source"] == "application", appl
    assert "application" in appl["tags"] and "plan-growth" in appl["tags"], appl["tags"]
    assert appl["pipeline_stage"] == ghl.GHL_PIPELINE_STAGE_APPLICATION
    assert appl["email"] == "pat@roof.com" and appl["trade"] == "roofing", appl

    ok = await ghl.push_customer(
        email="pat@roof.com", phone="+17275550123", tier="growth",
        amount=79700, session_id="cs_test_1",
    )
    assert ok is True
    cust = _FakeClient.posts[-1]["json"]
    assert cust["source"] == "customer" and "customer" in cust["tags"], cust
    assert cust["pipeline_stage"] == ghl.GHL_PIPELINE_STAGE_CUSTOMER
    assert cust["amount"] == 79700, cust

    print("OK: GHL lead-bridge is safe-by-default and maps fields correctly")


if __name__ == "__main__":
    asyncio.run(main())
