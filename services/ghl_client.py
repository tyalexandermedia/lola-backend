"""
Thin GoHighLevel (LeadConnector) v2 API client — the campaign engine's connector.

Design goals, in priority order:
  1. Safe: READ-ONLY by default. Writes (add_tag/remove_tag) raise unless the
     client is constructed with ``allow_writes=True`` — which the segment
     builder only does when the operator passes ``--apply``.
  2. Secret-hygienic: the Bearer token is read from the environment, never
     hard-coded, and never printed. Every debug line routes through ``_redact``.
  3. Resilient: timeout on every call + exponential backoff with jitter-free,
     deterministic delays on 429 / 5xx (respects Retry-After on 429).

Auth mirrors the existing scripts/ghl_import_contacts.py pattern:
    Authorization: Bearer <GHL_API_TOKEN>
    Version: 2021-07-28

Credentials come from the environment only:
    GHL_API_TOKEN       a GHL Private Integration token (pit-...)
    GHL_LOCATION_ID     the Sandbar sub-account location id
"""

from __future__ import annotations

import os
import time
from typing import Any, Iterator, Optional

import httpx

API_BASE = "https://services.leadconnectorhq.com"
API_VERSION = "2021-07-28"

# The known-burned token. If the environment still carries it we refuse to run
# rather than authenticate with a revoked/compromised credential.
_BURNED_TOKEN_PREFIX = "pit-fe93dc05"

_DEFAULT_TIMEOUT = 30.0
_MAX_RETRIES = 5
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _redact(token: str) -> str:
    """Render a token safe for logs: keep the 4-char prefix, mask the rest."""
    if not token:
        return "<unset>"
    return f"{token[:4]}…({len(token)} chars)"


class GHLConfigError(RuntimeError):
    """Raised when required credentials are missing or the token is burned."""


class GHLWriteDisabled(RuntimeError):
    """Raised when a write is attempted on a read-only client."""


class GHLClient:
    def __init__(
        self,
        token: Optional[str] = None,
        location_id: Optional[str] = None,
        *,
        allow_writes: bool = False,
        timeout: float = _DEFAULT_TIMEOUT,
        debug: bool = False,
    ) -> None:
        self.token = (token or os.getenv("GHL_API_TOKEN", "")).strip()
        self.location_id = (location_id or os.getenv("GHL_LOCATION_ID", "")).strip()
        self.allow_writes = allow_writes
        self.debug = debug

        if not self.token:
            raise GHLConfigError(
                "GHL_API_TOKEN is not set. Provide it via the environment "
                "(a gitignored .env or Railway) — never on the command line."
            )
        if self.token.startswith(_BURNED_TOKEN_PREFIX):
            raise GHLConfigError(
                "GHL_API_TOKEN is the OLD burned token "
                f"({_BURNED_TOKEN_PREFIX}…). Rotate it in GHL and update the "
                "secret before running."
            )
        if not self.location_id:
            raise GHLConfigError("GHL_LOCATION_ID is not set.")

        self._client = httpx.Client(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Version": API_VERSION,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )

    # -- lifecycle ---------------------------------------------------------
    def __enter__(self) -> "GHLClient":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _log(self, msg: str) -> None:
        if self.debug:
            # Never interpolate the token; show only its redacted fingerprint.
            print(f"[ghl {_redact(self.token)}] {msg}")

    # -- core request with retry/backoff -----------------------------------
    def _request(self, method: str, path: str, **kw: Any) -> httpx.Response:
        url = f"{API_BASE}{path}"
        delay = 1.0
        last: Optional[httpx.Response] = None
        for attempt in range(1, _MAX_RETRIES + 1):
            resp = self._client.request(method, url, **kw)
            self._log(f"{method} {path} -> {resp.status_code} (try {attempt})")
            if resp.status_code not in _RETRYABLE_STATUS:
                return resp
            last = resp
            if attempt == _MAX_RETRIES:
                break
            # 429: honour Retry-After when present, else exponential backoff.
            wait = delay
            if resp.status_code == 429:
                ra = resp.headers.get("Retry-After")
                if ra and ra.isdigit():
                    wait = float(ra)
            self._log(f"retryable {resp.status_code}; sleeping {wait:.1f}s")
            time.sleep(wait)
            delay = min(delay * 2, 30.0)
        return last  # exhausted retries; caller inspects status

    @staticmethod
    def _ok(resp: httpx.Response) -> Any:
        if resp.status_code >= 400:
            # Body may echo request context but never our Authorization header.
            raise httpx.HTTPStatusError(
                f"GHL {resp.status_code}: {resp.text[:300]}",
                request=resp.request,
                response=resp,
            )
        return resp.json() if resp.content else {}

    # -- READ methods ------------------------------------------------------
    def list_custom_fields(self) -> list[dict]:
        """All custom-field definitions for the location (id, name, fieldKey)."""
        resp = self._request(
            "GET", f"/locations/{self.location_id}/customFields"
        )
        data = self._ok(resp)
        return data.get("customFields", data.get("customField", [])) or []

    def get_contact(self, contact_id: str) -> dict:
        resp = self._request("GET", f"/contacts/{contact_id}")
        return self._ok(resp).get("contact", {})

    def search_contacts(self, tag: str, page_limit: int = 100) -> Iterator[dict]:
        """
        Yield every contact carrying ``tag``, transparently paginating.

        Uses POST /contacts/search with a tag filter and the ``searchAfter``
        cursor. Defensive against cursor loops: stops on an empty page, a
        missing cursor, or when no new contact ids appear.
        """
        search_after: Optional[list] = None
        seen: set[str] = set()
        while True:
            body: dict[str, Any] = {
                "locationId": self.location_id,
                "pageLimit": page_limit,
                "filters": [
                    {"field": "tags", "operator": "contains", "value": tag}
                ],
            }
            if search_after is not None:
                body["searchAfter"] = search_after
            resp = self._request("POST", "/contacts/search", json=body)
            data = self._ok(resp)
            contacts = data.get("contacts", []) or []
            if not contacts:
                return
            new_in_page = 0
            for c in contacts:
                cid = c.get("id")
                if cid and cid in seen:
                    continue
                if cid:
                    seen.add(cid)
                new_in_page += 1
                yield c
            if new_in_page == 0:
                return  # cursor stalled — avoid infinite loop
            search_after = contacts[-1].get("searchAfter")
            if not search_after or len(contacts) < page_limit:
                return

    # -- WRITE methods (gated) ---------------------------------------------
    def _guard_write(self) -> None:
        if not self.allow_writes:
            raise GHLWriteDisabled(
                "This client is read-only. Construct with allow_writes=True "
                "(the segment builder does this only under --apply)."
            )

    def add_tag(self, contact_id: str, tag: str) -> dict:
        self._guard_write()
        resp = self._request(
            "POST", f"/contacts/{contact_id}/tags", json={"tags": [tag]}
        )
        return self._ok(resp)

    def remove_tag(self, contact_id: str, tag: str) -> dict:
        self._guard_write()
        resp = self._request(
            "DELETE", f"/contacts/{contact_id}/tags", json={"tags": [tag]}
        )
        return self._ok(resp)
