"""
Tests for the Google Search Console client (api_clients/gsc.py).

Mocks the googleapiclient service — no real credentials, no network. Covers the
states that get confused in practice:

  1. API-disabled 403      -> GSCApiDisabled
  2. no-access 403         -> GSCNoAccess
  3. zero-row success      -> empty rows + no_data=True, NOT an exception
  4. pagination past 25k   -> startRow looping stitches pages together
  5. 3-day lag             -> default ranges end 3 days ago
  6. startup validation    -> malformed key fails loud, unset is dormant

Run:  python3 test_gsc.py
"""

import json
import os
from datetime import date, timedelta

from googleapiclient.errors import HttpError  # dependency-light, no crypto

import api_clients.gsc as gsc


# ── Fake googleapiclient service ────────────────────────────

class _Resp:
    """Minimal httplib2-style response for building HttpError."""

    def __init__(self, status):
        self.status = status
        self.reason = "Forbidden"


def make_http_error(status, message):
    content = json.dumps(
        {"error": {"code": status, "message": message, "errors": [{"reason": message}]}}
    ).encode("utf-8")
    return HttpError(_Resp(status), content)


class _Req:
    def __init__(self, fn, body):
        self._fn = fn
        self._body = body

    def execute(self):
        return self._fn(self._body)


class _SearchAnalytics:
    def __init__(self, fn):
        self._fn = fn
        self.bodies = []

    def query(self, siteUrl=None, body=None):
        self.bodies.append(dict(body) if body else {})
        return _Req(self._fn, body)


class _Sites:
    def __init__(self, fn):
        self._fn = fn

    def list(self):
        return _Req(self._fn, None)


class _Sitemaps:
    def __init__(self, fn):
        self._fn = fn

    def list(self, siteUrl=None):
        return _Req(self._fn, {"siteUrl": siteUrl})


class FakeService:
    def __init__(self, sa_fn=None, sites_fn=None, sitemaps_fn=None):
        self._sa = _SearchAnalytics(sa_fn or (lambda b: {}))
        self._sites = _Sites(sites_fn or (lambda b: {}))
        self._sitemaps = _Sitemaps(sitemaps_fn or (lambda b: {}))

    def searchanalytics(self):
        return self._sa

    def sites(self):
        return self._sites

    def sitemaps(self):
        return self._sitemaps


def _install(service):
    """Inject a fake service so get_service() never builds a real one."""
    gsc._SERVICE = service


# ── Test runner ─────────────────────────────────────────────

_failures = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"{status}  {name}" + (f"  ({detail})" if detail else ""))
    if not cond:
        _failures.append(name)


# ── 1. API disabled → GSCApiDisabled ────────────────────────

def test_api_disabled():
    def raise_disabled(body):
        raise make_http_error(403, "accessNotConfigured: it has not been used in project")

    _install(FakeService(sa_fn=raise_disabled))
    try:
        gsc.query("sc-domain:example.com", ["query"], "2026-01-01", "2026-01-28")
        check("api-disabled raises GSCApiDisabled", False, "no exception raised")
    except gsc.GSCApiDisabled:
        check("api-disabled raises GSCApiDisabled", True)
    except Exception as e:  # noqa: BLE001
        check("api-disabled raises GSCApiDisabled", False, f"got {type(e).__name__}")


# ── 2. No access → GSCNoAccess (distinct from disabled) ─────

def test_no_access():
    def raise_forbidden(body):
        raise make_http_error(403, "User does not have sufficient permission for site")

    _install(FakeService(sa_fn=raise_forbidden))
    try:
        gsc.query("sc-domain:example.com", ["query"], "2026-01-01", "2026-01-28")
        check("no-access raises GSCNoAccess", False, "no exception raised")
    except gsc.GSCNoAccess:
        check("no-access raises GSCNoAccess", True)
    except gsc.GSCApiDisabled:
        check("no-access raises GSCNoAccess", False, "misclassified as GSCApiDisabled")
    except Exception as e:  # noqa: BLE001
        check("no-access raises GSCNoAccess", False, f"got {type(e).__name__}")


# ── 3. Zero rows → empty + no_data flag, NOT an error ───────

def test_zero_rows():
    _install(FakeService(sa_fn=lambda b: {}))  # success, no "rows" key
    try:
        result = gsc.query("sc-domain:example.com", ["query"], "2026-01-01", "2026-01-28")
        ok = result["rows"] == [] and result["no_data"] is True
        check("zero-row is a flag, not an exception", ok, f"result={result}")
    except Exception as e:  # noqa: BLE001
        check("zero-row is a flag, not an exception", False, f"raised {type(e).__name__}")


# ── 4. Pagination across the 25,000-row boundary ────────────

def test_pagination():
    def paginate(body):
        start_row = body["startRow"]
        if start_row == 0:
            return {"rows": [{"keys": [f"q{i}"], "clicks": 1, "impressions": 2} for i in range(25000)]}
        if start_row == 25000:
            return {"rows": [{"keys": [f"q{i}"], "clicks": 1, "impressions": 2} for i in range(25000, 25005)]}
        return {"rows": []}

    svc = FakeService(sa_fn=paginate)
    _install(svc)
    result = gsc.query("sc-domain:example.com", ["query"], "2026-01-01", "2026-01-28", row_limit=30000)
    got = len(result["rows"])
    calls = len(svc._sa.bodies)
    check("pagination stitches across 25k boundary", got == 25005, f"rows={got}")
    check("pagination made a second startRow request", calls == 2, f"api calls={calls}")
    check(
        "pagination advanced startRow to 25000",
        len(svc._sa.bodies) == 2 and svc._sa.bodies[1]["startRow"] == 25000,
        f"second body startRow={svc._sa.bodies[1]['startRow'] if calls > 1 else 'n/a'}",
    )


# ── 5. 3-day lag baked into default ranges ──────────────────

def test_three_day_lag():
    expected_end = (date.today() - timedelta(days=3)).isoformat()
    check("default_end() is 3 days ago", gsc.default_end().isoformat() == expected_end, gsc.default_end().isoformat())

    start, end = gsc.default_range(28)
    check("default_range end is 3 days ago", end == expected_end, end)
    expected_start = (date.today() - timedelta(days=3 + 28)).isoformat()
    check("default_range start is window before end", start == expected_start, start)

    # top_queries carries the same lagged range through, and never hits today.
    _install(FakeService(sa_fn=lambda b: {}))
    tq = gsc.top_queries("sc-domain:example.com", days=28)
    check("top_queries reports the lagged range", tq["date_range"]["end"] == expected_end, tq["date_range"]["end"])
    check("top_queries never ends today", tq["date_range"]["end"] != date.today().isoformat())


# ── 6. Startup credential validation ────────────────────────

def test_startup_validation():
    saved = os.environ.get(gsc.ENV_VAR)
    try:
        # Unset → dormant, no raise.
        os.environ.pop(gsc.ENV_VAR, None)
        try:
            gsc.validate_credentials_at_startup()
            check("unset credentials are dormant (no raise)", True)
        except Exception as e:  # noqa: BLE001
            check("unset credentials are dormant (no raise)", False, f"raised {type(e).__name__}")

        # Set but not JSON → fail loud.
        os.environ[gsc.ENV_VAR] = "this is not json"
        try:
            gsc.validate_credentials_at_startup()
            check("malformed credentials fail loud", False, "no exception raised")
        except gsc.GSCConfigError:
            check("malformed credentials fail loud", True)

        # Valid JSON but not a service-account key → fail loud.
        os.environ[gsc.ENV_VAR] = json.dumps({"type": "authorized_user"})
        try:
            gsc.validate_credentials_at_startup()
            check("non-service-account key fails loud", False, "no exception raised")
        except gsc.GSCConfigError:
            check("non-service-account key fails loud", True)
    finally:
        if saved is None:
            os.environ.pop(gsc.ENV_VAR, None)
        else:
            os.environ[gsc.ENV_VAR] = saved


def main():
    for t in (
        test_api_disabled,
        test_no_access,
        test_zero_rows,
        test_pagination,
        test_three_day_lag,
        test_startup_validation,
    ):
        gsc.reset_service_cache()
        t()
    print()
    if _failures:
        print(f"❌ {len(_failures)} failure(s): {', '.join(_failures)}")
        raise SystemExit(1)
    print("✅ all GSC client tests passed")


if __name__ == "__main__":
    main()
