"""
GoHighLevel READ client — pulls open opportunities (the money pipeline) so the
Daily Brief can answer "where is money waiting?".

Until now Lola only *wrote* leads into GHL (api_clients/ghl.py). This is the
missing read half. SAFE BY DEFAULT: every function returns [] cleanly when the
token/location isn't configured, and swallows network errors — the brief must
render whether or not GHL is wired.

Scope (per owner decision 2026-09-25): only the Sandbar and Lola Leads
locations. Configure via env — no IDs are hard-coded:

    GHL_API_TOKEN            # Private Integration token (same one the segment CLI uses)
    GHL_LOCATION_SANDBAR     # LeadConnector location id for Sandbar
    GHL_LOCATION_LOLA_LEADS  # LeadConnector location id for Lola Leads

Read-only: this never creates, updates, or messages anything in GHL.
"""

import os
from typing import Optional

import httpx

API_BASE = "https://services.leadconnectorhq.com"
API_VERSION = "2021-07-28"
_TIMEOUT = 15.0

# Statuses that mean "still live / money not yet won or lost".
OPEN_STATUSES = {"open"}

# Map each configured location id -> the Lola workspace it belongs to.
def location_workspace_map() -> dict[str, str]:
    m: dict[str, str] = {}
    sandbar = os.getenv("GHL_LOCATION_SANDBAR", "").strip()
    lola = os.getenv("GHL_LOCATION_LOLA_LEADS", "").strip()
    if sandbar:
        m[sandbar] = "sandbar"
    if lola:
        m[lola] = "lola-leads"
    return m


def ghl_read_enabled() -> bool:
    return bool(os.getenv("GHL_API_TOKEN", "").strip()) and bool(location_workspace_map())


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Version": API_VERSION,
        "Accept": "application/json",
    }


async def fetch_open_opportunities(location_id: str, limit: int = 100) -> list[dict]:
    """
    Return normalized open opportunities for one location, or [] on any problem.
    Normalized shape: {id, name, contact_name, value, status, stage, updated_at}.
    """
    token = os.getenv("GHL_API_TOKEN", "").strip()
    if not token or not location_id:
        return []
    params = {"location_id": location_id, "limit": str(limit), "status": "open"}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{API_BASE}/opportunities/search",
                headers=_headers(token),
                params=params,
            )
            if r.status_code >= 400:
                print(f"⚠️ GHL opportunities read non-2xx: {r.status_code} {r.text[:160]}")
                return []
            data = r.json()
    except Exception as e:
        print(f"⚠️ GHL opportunities read failed: {e}")
        return []

    out = []
    for o in data.get("opportunities", []) or []:
        contact = o.get("contact") or {}
        out.append(
            {
                "id": o.get("id") or "",
                "name": o.get("name") or contact.get("name") or "Opportunity",
                "contact_name": contact.get("name") or "",
                "value": float(o.get("monetaryValue") or 0),
                "status": o.get("status") or "open",
                "stage": o.get("pipelineStageId") or "",
                "updated_at": o.get("updatedAt") or o.get("dateUpdated") or "",
            }
        )
    return out


async def fetch_all_open_opportunities() -> list[dict]:
    """
    All open opportunities across configured locations, each tagged with its
    workspace. [] when GHL read is not configured.
    """
    mapping = location_workspace_map()
    if not mapping or not os.getenv("GHL_API_TOKEN", "").strip():
        return []
    results: list[dict] = []
    for loc, workspace in mapping.items():
        for opp in await fetch_open_opportunities(loc):
            opp["workspace"] = workspace
            results.append(opp)
    return results
