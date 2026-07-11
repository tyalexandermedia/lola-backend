"""
Regression guard for TD-1: POST /stripe/webhook must FAIL CLOSED.

Exercises the real FastAPI route via TestClient:
  1. STRIPE_WEBHOOK_SECRET unset            → 503 (refuses to do any work).
  2. secret set, missing/invalid signature  → 401 (constant-time HMAC reject).
  3. secret set, valid HMAC signature        → 200 (verification passes).

Run:  python3 test_stripe_webhook_failclosed.py
"""

import hashlib
import hmac
import json

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def _sign(secret: str, body: bytes, t: int = 1700000000) -> str:
    signed = f"{t}.".encode() + body
    v1 = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={t},v1={v1}"


def run() -> None:
    body = json.dumps({"type": "ping"}).encode()

    # 1) Fail closed when the signing secret is absent.
    main.STRIPE_WEBHOOK_SECRET = ""
    r = client.post("/stripe/webhook", content=body)
    assert r.status_code == 503, f"unset secret should 503, got {r.status_code}"

    # 2) Secret set but signature missing/invalid → 401, no work done.
    main.STRIPE_WEBHOOK_SECRET = "whsec_testsecret"
    r = client.post("/stripe/webhook", content=body)  # no signature header
    assert r.status_code == 401, f"missing sig should 401, got {r.status_code}"

    r = client.post(
        "/stripe/webhook",
        content=body,
        headers={"stripe-signature": "t=1,v1=deadbeef"},
    )
    assert r.status_code == 401, f"bad sig should 401, got {r.status_code}"

    # 3) Valid signature → 200 (an 'ignored' type short-circuits after verify).
    r = client.post(
        "/stripe/webhook",
        content=body,
        headers={"stripe-signature": _sign("whsec_testsecret", body)},
    )
    assert r.status_code == 200, f"valid sig should 200, got {r.status_code}"
    assert r.json().get("ignored") == "ping", r.json()

    print("OK: /stripe/webhook fails closed (503 unset · 401 bad sig · 200 verified)")


if __name__ == "__main__":
    run()
