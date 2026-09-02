"""
Lola — Google Search Console (GSC) client.

A THIN wrapper over the Search Console API (searchconsole v1). No business
logic, no persistence, no HTTP shaping — callers (db.gsc for caching,
gsc.routes for the API surface) own all of that.

Credentials come ONLY from the GSC_SERVICE_ACCOUNT_JSON env var, which holds the
raw JSON of a service-account key. We never read the key from a file path in the
repo and never commit it. Scope is read-only (webmasters.readonly).

The heavy Google imports (googleapiclient.discovery.build,
google.oauth2.service_account) are done LAZILY inside get_service() /
_load_credentials(). That keeps this module importable even where those libs (or
their native crypto deps) are unavailable, which is exactly what lets the test
suite inject a fake service with no real credentials and no network.

Error taxonomy — these three states get confused constantly, so they are kept
distinct end to end:

    GSCApiDisabled  The Search Console API is not enabled in the Google Cloud
                    project (403 accessNotConfigured / SERVICE_DISABLED).
                    Operator fix: enable searchconsole.googleapis.com in the GCP
                    project that owns the service account.

    GSCNoAccess     The API is on, but the service account is not a user on THIS
                    property (403 scoped to one site). Operator fix: add the
                    service-account email as a user on the property inside
                    Search Console.

    no-data         The query succeeded but returned zero rows. This is NOT an
                    error. query() returns an empty list plus no_data=True so the
                    UI can say "no impressions yet" instead of "connection
                    failed".
"""

from __future__ import annotations

import json
import os
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

# HttpError is dependency-light (no crypto), so it is safe to import at module
# load. build() and service_account are imported lazily where they are used.
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
ENV_VAR = "GSC_SERVICE_ACCOUNT_JSON"

# GSC data lags 2-3 days. A naive end=today silently returns near-empty results
# and reads as a broken integration, so every default range ends here.
GSC_LAG_DAYS = 3
# Hard per-request row cap imposed by the Search Analytics API.
GSC_MAX_ROWS_PER_PAGE = 25000


# ── Typed exceptions ────────────────────────────────────────

class GSCError(Exception):
    """Base for every GSC failure."""


class GSCConfigError(GSCError):
    """GSC_SERVICE_ACCOUNT_JSON is missing or malformed."""


class GSCApiDisabled(GSCError):
    """The Search Console API is not enabled in the GCP project."""


class GSCNoAccess(GSCError):
    """The service account is not authorized on this specific property."""


class GSCNoData(GSCError):
    """Defined for completeness. Zero-row is surfaced as a return flag from
    query() (no_data=True), NOT raised — it is not an error state."""


# ── Credentials ─────────────────────────────────────────────

def is_configured() -> bool:
    """True if the credentials env var is present (does not validate it)."""
    return bool(os.getenv(ENV_VAR, "").strip())


def _raw_credentials_json() -> str:
    raw = os.getenv(ENV_VAR, "").strip()
    if not raw:
        raise GSCConfigError(f"{ENV_VAR} is not set")
    return raw


def _parse_service_account_info(raw: str) -> Dict[str, Any]:
    try:
        info = json.loads(raw)
    except (TypeError, ValueError) as e:
        raise GSCConfigError(f"{ENV_VAR} is not valid JSON: {e}") from e
    if not isinstance(info, dict) or info.get("type") != "service_account":
        raise GSCConfigError(
            f"{ENV_VAR} is not a service-account key (expected type=service_account)"
        )
    for field in ("client_email", "private_key", "token_uri"):
        if not info.get(field):
            raise GSCConfigError(f"{ENV_VAR} is missing required field '{field}'")
    return info


def validate_credentials_at_startup() -> None:
    """Fail loud if the var is SET but malformed. Unset is dormant, not an error.

    Call this once at process startup so a bad key crashes the app immediately
    with a clear message, instead of surfacing as a confusing 500 on the first
    request hours later.
    """
    if not is_configured():
        return
    _parse_service_account_info(_raw_credentials_json())


def service_account_email() -> Optional[str]:
    """The service-account email operators must grant on each property. None if
    unconfigured/malformed (never raises — used in status responses)."""
    if not is_configured():
        return None
    try:
        return _parse_service_account_info(_raw_credentials_json()).get("client_email")
    except GSCConfigError:
        return None


_SERVICE = None


def _load_credentials():
    from google.oauth2 import service_account  # lazy: pulls native crypto deps

    info = _parse_service_account_info(_raw_credentials_json())
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def get_service():
    """Cached googleapiclient service for Search Console. cache_discovery=False
    to avoid the noisy oauth2client file-cache warnings and disk writes."""
    global _SERVICE
    if _SERVICE is None:
        from googleapiclient.discovery import build  # lazy

        _SERVICE = build(
            "searchconsole",
            "v1",
            credentials=_load_credentials(),
            cache_discovery=False,
        )
    return _SERVICE


def reset_service_cache() -> None:
    """Drop the cached service (used by tests and after a credential rotation)."""
    global _SERVICE
    _SERVICE = None


# ── Date ranges (all default to ending GSC_LAG_DAYS ago) ─────

def default_end() -> date:
    return date.today() - timedelta(days=GSC_LAG_DAYS)


def default_range(days: int) -> "tuple[str, str]":
    """(start, end) ISO dates for a `days`-day window ending GSC_LAG_DAYS ago."""
    end = default_end()
    start = end - timedelta(days=max(1, days))
    return start.isoformat(), end.isoformat()


# ── Error classification ────────────────────────────────────

def _classify_http_error(e: HttpError) -> Optional[GSCError]:
    """Map an HttpError to a typed GSC exception, or None to re-raise as-is.

    Duck-typed on status + content so it works against both real HttpError
    objects and the lightweight fakes the tests raise.
    """
    status = getattr(e, "status_code", None)
    if status is None:
        status = getattr(getattr(e, "resp", None), "status", None)
    try:
        status = int(status)
    except (TypeError, ValueError):
        status = None

    raw = getattr(e, "content", b"")
    if isinstance(raw, (bytes, bytearray)):
        content = raw.decode("utf-8", "replace")
    else:
        content = str(raw or "")
    blob = (content + " " + str(e)).lower()

    api_disabled = (
        "accessnotconfigured" in blob
        or "service_disabled" in blob
        or "has not been used" in blob
        or "it is disabled" in blob
    )
    if status == 403 and api_disabled:
        return GSCApiDisabled(
            "The Search Console API is not enabled for this Google Cloud project. "
            "Enable searchconsole.googleapis.com in the GCP project that owns the "
            "service account, then retry."
        )
    if status in (401, 403):
        return GSCNoAccess(
            "The service account reached the API but is not authorized on this "
            "property. In Search Console, add the service-account email as a user "
            "on the property, then retry."
        )
    return None


def _execute(request):
    """Run a googleapiclient request, translating auth/enablement errors."""
    try:
        return request.execute()
    except HttpError as e:
        classified = _classify_http_error(e)
        if classified is not None:
            raise classified from e
        raise


# ── Row shaping ─────────────────────────────────────────────

def _shape_row(row: Dict[str, Any], dimensions: List[str]) -> Dict[str, Any]:
    keys = row.get("keys", []) or []
    item: Dict[str, Any] = {
        dim: keys[i] for i, dim in enumerate(dimensions) if i < len(keys)
    }
    item["clicks"] = row.get("clicks", 0)
    item["impressions"] = row.get("impressions", 0)
    item["ctr"] = row.get("ctr", 0.0)
    item["position"] = row.get("position", 0.0)
    return item


# ── Public API ──────────────────────────────────────────────

def list_properties() -> List[Dict[str, Any]]:
    """Every property the service account can see: [{site_url, permission_level}]."""
    resp = _execute(get_service().sites().list())
    return [
        {"site_url": s.get("siteUrl"), "permission_level": s.get("permissionLevel")}
        for s in (resp.get("siteEntry", []) or [])
    ]


def query(
    site_url: str,
    dimensions: List[str],
    start: str,
    end: str,
    row_limit: int = GSC_MAX_ROWS_PER_PAGE,
    filters: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Search-analytics query with automatic pagination past the 25k-row cap.

    Returns {"rows": [...], "no_data": bool}. no_data=True on a successful query
    that yielded zero rows — a valid state, not a failure.
    """
    service = get_service()
    rows: List[Dict[str, Any]] = []
    start_row = 0
    remaining = row_limit if row_limit and row_limit > 0 else GSC_MAX_ROWS_PER_PAGE

    while remaining > 0:
        page_size = min(GSC_MAX_ROWS_PER_PAGE, remaining)
        body: Dict[str, Any] = {
            "startDate": start,
            "endDate": end,
            "dimensions": list(dimensions),
            "rowLimit": page_size,
            "startRow": start_row,
        }
        if filters:
            body["dimensionFilterGroups"] = [{"filters": filters}]

        resp = _execute(service.searchanalytics().query(siteUrl=site_url, body=body))
        page = resp.get("rows", []) or []
        rows.extend(_shape_row(r, dimensions) for r in page)

        got = len(page)
        start_row += got
        remaining -= got
        # A short page means we've reached the end — stop paginating.
        if got < page_size:
            break

    return {"rows": rows, "no_data": len(rows) == 0}


def top_queries(site_url: str, days: int = 28, row_limit: int = GSC_MAX_ROWS_PER_PAGE) -> Dict[str, Any]:
    start, end = default_range(days)
    result = query(site_url, ["query"], start, end, row_limit=row_limit)
    return {
        "rows": result["rows"],
        "no_data": result["no_data"],
        "date_range": {"start": start, "end": end, "days": days},
    }


def top_pages(site_url: str, days: int = 28, row_limit: int = GSC_MAX_ROWS_PER_PAGE) -> Dict[str, Any]:
    start, end = default_range(days)
    result = query(site_url, ["page"], start, end, row_limit=row_limit)
    return {
        "rows": result["rows"],
        "no_data": result["no_data"],
        "date_range": {"start": start, "end": end, "days": days},
    }


def daily_metrics(
    site_url: str, days: int = 84, row_limit: int = GSC_MAX_ROWS_PER_PAGE
) -> Dict[str, Any]:
    """Per-day time series for the Growth Timeline: one row per date carrying
    clicks / impressions / ctr / position, over a `days`-day window ending
    GSC_LAG_DAYS ago — the same lag and no_data semantics as top_queries /
    top_pages.

    Rows come back in ascending date order so a caller can bucket them into
    weeks without re-sorting. Zero rows is a valid "no impressions yet" state,
    surfaced as no_data=True, never an exception.
    """
    start, end = default_range(days)
    result = query(site_url, ["date"], start, end, row_limit=row_limit)
    rows = sorted(result["rows"], key=lambda r: r.get("date", ""))
    return {
        "rows": rows,
        "no_data": result["no_data"],
        "date_range": {"start": start, "end": end, "days": days},
    }


def sitemaps(site_url: str) -> List[Dict[str, Any]]:
    """Submitted sitemaps: [{path, last_submitted, submitted, indexed, errors, warnings, is_pending}]."""
    resp = _execute(get_service().sitemaps().list(siteUrl=site_url))
    out: List[Dict[str, Any]] = []
    for sm in resp.get("sitemap", []) or []:
        submitted = indexed = 0
        for c in sm.get("contents", []) or []:
            submitted += int(c.get("submitted", 0) or 0)
            indexed += int(c.get("indexed", 0) or 0)
        out.append(
            {
                "path": sm.get("path"),
                "last_submitted": sm.get("lastSubmitted"),
                "submitted": submitted,
                "indexed": indexed,
                "errors": int(sm.get("errors", 0) or 0),
                "warnings": int(sm.get("warnings", 0) or 0),
                "is_pending": bool(sm.get("isPending", False)),
            }
        )
    return out
