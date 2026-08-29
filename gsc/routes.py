"""
Google Search Console API surface.

Mounted under /api/clients. Admin-only (X-Admin-Key must match
LOLA_SECRET_ADMIN_KEY), matching the pattern used by /reviews.

  GET  /api/clients/{id}/gsc/status          connected? property? last sync?
  GET  /api/clients/{id}/gsc/queries?days=28 top search queries (cached)
  GET  /api/clients/{id}/gsc/pages?days=28   top pages (cached)
  POST /api/clients/{id}/gsc/refresh         force a re-pull, bust the cache

Reads are served from gsc_snapshots; the Google API is only hit on a cache miss
or an explicit refresh. Every response echoes the ACTUAL date range used, so the
frontend can show "Aug 1 - Aug 26" instead of implying live data.

The three failure modes are translated to distinct HTTP responses so they never
get confused:
  API disabled    -> 503 (operator must enable searchconsole.googleapis.com)
  no access       -> 424 (operator must add the service account to the property)
  zero rows       -> 200 with no_data=true (valid "no impressions yet" state)
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from api_clients import gsc
from db.gsc import (
    delete_snapshots,
    get_snapshot,
    latest_snapshot,
    save_snapshot,
)
from db.reporting import get_client_by_id

router = APIRouter(prefix="/api/clients", tags=["gsc"])


def require_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """Match the pattern used by /reviews and the /leads admin endpoints."""
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _load_client_or_404(client_id: int) -> Dict[str, Any]:
    client = await get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/{client_id}/gsc/status", dependencies=[Depends(require_admin_key)])
async def gsc_status(client_id: int) -> Dict[str, Any]:
    client = await _load_client_or_404(client_id)
    prop = client.get("gsc_property")
    last = await latest_snapshot(client_id)
    return {
        "client_id": client_id,
        # "connected" means both halves are in place: server has credentials AND
        # this client has a property mapped. Either missing => not connected.
        "connected": gsc.is_configured() and bool(prop),
        "credentials_configured": gsc.is_configured(),
        "property": prop,
        "service_account_email": gsc.service_account_email(),
        "last_sync": last["captured_at"] if last else None,
    }


async def _serve_dimension(
    client: Dict[str, Any], client_id: int, dimension: str, days: int, force: bool
) -> Dict[str, Any]:
    prop = client.get("gsc_property")
    if not prop:
        raise HTTPException(
            status_code=400,
            detail="This client has no gsc_property set. Map it to "
            "'sc-domain:example.com' or 'https://example.com/' first.",
        )
    if not gsc.is_configured():
        raise HTTPException(
            status_code=503,
            detail="GSC credentials are not configured on the server "
            "(GSC_SERVICE_ACCOUNT_JSON is unset).",
        )

    start, end = gsc.default_range(days)
    date_range = {"start": start, "end": end, "days": days}

    # Cache read — only reuse a snapshot whose window matches this request.
    if not force:
        snap = await get_snapshot(client_id, dimension, end)
        if snap and snap.get("payload") and snap.get("date_range_start") == start:
            payload = snap["payload"]
            return {
                "client_id": client_id,
                "dimension": dimension,
                "cached": True,
                "captured_at": snap["captured_at"],
                "date_range": date_range,
                "rows": payload.get("rows", []),
                "no_data": payload.get("no_data", not payload.get("rows")),
            }

    # Live pull. The googleapiclient service is blocking, so keep it off the
    # event loop. Translate the typed GSC errors into distinct HTTP responses.
    fetch = gsc.top_queries if dimension == "query" else gsc.top_pages
    try:
        result = await run_in_threadpool(fetch, prop, days)
    except gsc.GSCApiDisabled as e:
        raise HTTPException(status_code=503, detail=str(e))
    except gsc.GSCNoAccess as e:
        raise HTTPException(status_code=424, detail=str(e))
    except gsc.GSCConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))

    payload = {"rows": result["rows"], "no_data": result["no_data"]}
    await save_snapshot(client_id, dimension, start, end, payload)
    return {
        "client_id": client_id,
        "dimension": dimension,
        "cached": False,
        "captured_at": _now_iso(),
        "date_range": result.get("date_range", date_range),
        "rows": result["rows"],
        "no_data": result["no_data"],
    }


@router.get("/{client_id}/gsc/queries", dependencies=[Depends(require_admin_key)])
async def gsc_queries(client_id: int, days: int = Query(28, ge=1, le=480)) -> Dict[str, Any]:
    client = await _load_client_or_404(client_id)
    return await _serve_dimension(client, client_id, "query", days, force=False)


@router.get("/{client_id}/gsc/pages", dependencies=[Depends(require_admin_key)])
async def gsc_pages(client_id: int, days: int = Query(28, ge=1, le=480)) -> Dict[str, Any]:
    client = await _load_client_or_404(client_id)
    return await _serve_dimension(client, client_id, "page", days, force=False)


@router.post("/{client_id}/gsc/refresh", dependencies=[Depends(require_admin_key)])
async def gsc_refresh(client_id: int, days: int = Query(28, ge=1, le=480)) -> Dict[str, Any]:
    client = await _load_client_or_404(client_id)
    await delete_snapshots(client_id)  # bust the cache first
    queries = await _serve_dimension(client, client_id, "query", days, force=True)
    pages = await _serve_dimension(client, client_id, "page", days, force=True)
    return {
        "client_id": client_id,
        "refreshed": True,
        "date_range": queries["date_range"],
        "queries": {"rows": queries["rows"], "no_data": queries["no_data"]},
        "pages": {"rows": pages["rows"], "no_data": pages["no_data"]},
    }
