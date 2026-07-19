"""Offline unit tests for the review-segment classifier and client safety gates.

No network, no credentials — exercises pure logic so the build is verified
before any live GHL call. Run: .venv/bin/python3 -m pytest test_review_segment.py
(or plain: .venv/bin/python3 test_review_segment.py)
"""
import os

from services.build_review_segment import (
    FieldMap, classify, valid_email, email_dnd_on, ELIGIBLE_TAG,
)
from services.ghl_client import GHLClient, GHLConfigError, GHLWriteDisabled

# Field definitions as GHL would return them.
DEFS = [
    {"id": "f_txn", "name": "Transaction Count"},
    {"id": "f_spend", "name": "Lifetime Spend"},
    {"id": "f_last", "name": "Last Service Date"},
    {"id": "f_other", "name": "Favorite Color"},
]
FM = FieldMap.from_definitions(DEFS)


def _contact(**kw):
    base = {"id": "c1", "email": "a@b.com", "tags": [], "customFields": []}
    base.update(kw)
    return base


def test_fieldmap_resolves_signals():
    assert FM.txn_count_ids == {"f_txn"}
    assert FM.spend_ids == {"f_spend"}
    assert FM.last_service_ids == {"f_last"}
    assert FM.missing_signals() == []


def test_real_by_transaction_count():
    c = classify(_contact(customFields=[{"id": "f_txn", "value": "3"}]), FM)
    assert c.is_real and not c.excluded
    assert "transaction_count=3" in c.reasons


def test_real_by_spend_only():
    c = classify(_contact(customFields=[{"id": "f_spend", "value": "$250.00"}]), FM)
    assert c.is_real and any("lifetime_spend" in r for r in c.reasons)


def test_real_by_last_service_date():
    c = classify(_contact(customFields=[{"id": "f_last", "value": "2025-08-01"}]), FM)
    assert c.is_real


def test_directory_has_no_signal():
    c = classify(_contact(customFields=[{"id": "f_other", "value": "blue"}]), FM)
    assert not c.is_real  # directory — must never be tagged


def test_zero_transaction_is_directory():
    c = classify(_contact(customFields=[{"id": "f_txn", "value": "0"}]), FM)
    assert not c.is_real


def test_exclusions_email_dnd():
    c = classify(_contact(
        customFields=[{"id": "f_txn", "value": "5"}],
        dndSettings={"Email": {"status": "active"}},
    ), FM)
    assert c.is_real and c.excluded and "email_dnd" in c.exclude_reasons


def test_exclusions_global_dnd():
    assert email_dnd_on(_contact(dnd=True))


def test_exclusions_optout_tags():
    for tag in ("sandbar-optout", "exclusion:no-marketing"):
        c = classify(_contact(
            customFields=[{"id": "f_txn", "value": "5"}], tags=[tag]
        ), FM)
        assert c.excluded and tag in c.exclude_reasons


def test_exclusions_bad_email():
    c = classify(_contact(
        email="not-an-email", customFields=[{"id": "f_txn", "value": "5"}]
    ), FM)
    assert c.excluded and "missing_or_invalid_email" in c.exclude_reasons


def test_email_validation():
    assert valid_email("x@y.com")
    assert not valid_email("")
    assert not valid_email("x@y")
    assert not valid_email("x y@z.com")


def test_client_refuses_missing_token():
    old = os.environ.pop("GHL_API_TOKEN", None)
    try:
        raised = False
        try:
            GHLClient(token="", location_id="loc")
        except GHLConfigError:
            raised = True
        assert raised
    finally:
        if old is not None:
            os.environ["GHL_API_TOKEN"] = old


def test_client_refuses_burned_token():
    raised = False
    try:
        GHLClient(token="pit-fe93dc05-abc", location_id="loc")
    except GHLConfigError as e:
        raised = "burned" in str(e).lower()
    assert raised


def test_write_guard_blocks_readonly_client():
    c = GHLClient(token="pit-newtoken-123", location_id="loc", allow_writes=False)
    blocked = False
    try:
        c.add_tag("c1", ELIGIBLE_TAG)
    except GHLWriteDisabled:
        blocked = True
    finally:
        c.close()
    assert blocked


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
        passed += 1
    print(f"\n{passed}/{len(fns)} tests passed")
