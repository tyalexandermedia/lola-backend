"""
Regression guard for the test-call injector ↔ log_event() signature mismatch
that returned HTTP 500 in production:

    TypeError: log_event() got an unexpected keyword argument 'medium'

This script exercises log_event with the exact kwargs every call site uses
so any future drift (renaming a param, dropping a kwarg) trips immediately
instead of waiting for a Railway 500.

Usage:
    .venv/bin/python test_log_event_signature.py
"""

import asyncio
import inspect
import os
import sys
import tempfile

# Isolate from the real DB so this test never touches production data.
_TMP = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
_TMP.close()
os.environ["DB_PATH"] = _TMP.name


async def main() -> int:
    # Force every external creds to unset so setup_status takes the
    # "missing env var" branch for every integration (no live API calls).
    for k in (
        "GA4_MEASUREMENT_ID", "GA4_API_SECRET",
        "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
        "BING_WEBMASTER_API_KEY",
        "CALLRAIL_API_KEY", "CALLRAIL_ACCOUNT_ID",
    ):
        os.environ.pop(k, None)

    from db.tracking import log_event, init_tracking_tables

    await init_tracking_tables()

    # The set of kwargs every call site in lead_gen.py passes today.
    # If log_event() drops or renames any of these, this test fails loudly.
    accepted_kwargs = {"slug", "event_type", "source", "meta", "ip"}
    sig = set(inspect.signature(log_event).parameters.keys())
    missing = accepted_kwargs - sig
    if missing:
        print(f"FAIL: log_event() is missing kwargs: {missing}")
        return 1

    # Exercise the exact shape the /lead-gen/test-call/{slug} endpoint uses.
    # This is what blew up in prod with the old `medium=` / `properties=` kwargs.
    eid = await log_event(
        slug="sandbar",
        event_type="call",
        source="test_inject",
        meta={
            "call_sid": "TEST-SIG-CHECK",
            "duration_sec": 90,
            "caller_number": "+10000000000",
            "note": "signature regression guard",
        },
    )
    if not isinstance(eid, int):
        print(f"FAIL: expected int row id, got {type(eid).__name__}")
        return 1

    # Exercise the form-webhook shape too — second real-world call site.
    await log_event(
        slug="sandbar",
        event_type="lead",
        source="website",
        meta={"name": "Test", "service": "soft wash"},
        ip="127.0.0.1",
    )

    # Setup-status: every integration must be enumerated and missing-env-vars
    # must be reported. This guards against silently dropping an integration
    # (e.g. removing the Bing block) when refactoring lead_gen.py.
    from lead_gen import setup_status
    status = await setup_status("sandbar")
    required_checks = {
        "dashboard_client", "ga4_measurement_protocol", "ga4_data_api",
        "search_console", "gbp_performance", "bing_webmaster", "callrail",
    }
    missing = required_checks - set(status.get("checks", {}).keys())
    if missing:
        print(f"FAIL: setup-status dropped checks: {missing}")
        return 1
    expected_missing = {
        "BING_WEBMASTER_API_KEY",
        "CALLRAIL_API_KEY", "CALLRAIL_ACCOUNT_ID",
        "GA4_MEASUREMENT_ID", "GA4_API_SECRET",
        "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
    }
    reported_missing = set(status.get("summary", {}).get("missing_env_vars", []))
    if not expected_missing <= reported_missing:
        print(f"FAIL: setup-status missed env vars: {expected_missing - reported_missing}")
        return 1

    print("OK: log_event() signature + setup-status shape match every call site")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
