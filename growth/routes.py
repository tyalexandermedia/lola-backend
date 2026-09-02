"""
Growth Timeline API surface.

Mounted under /api/clients. Admin-only (X-Admin-Key must match
LOLA_SECRET_ADMIN_KEY), the same pattern as /api/clients/{id}/gsc/*.

  GET /api/clients/{id}/growth-timeline?weeks=12          the fused timeline
  GET /api/clients/{id}/growth-timeline?weeks=12&refresh=1  force a GSC re-pull

Search visibility is served from the gsc_snapshots cache; the Google API is hit
only on a cache miss or ?refresh=1. Leads and work-done read live from their own
stores (cheap local queries). Every response echoes the actual date range used.

The GSC failure modes are translated to distinct HTTP responses, identical to the
gsc routes, so a broken connection is never disguised as "no data":
  API disabled  -> 503 (operator must enable searchconsole.googleapis.com)
  no access     -> 424 (operator must add the service account to the property)
  zero rows     -> 200 with has_gsc=false + gsc_state="no_data_yet"
  not connected -> 200 with has_gsc=false + gsc_state="not_connected"
"""

import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from api_clients import gsc
from db.reporting import get_client_by_id
from growth.service import build_growth_timeline

router = APIRouter(prefix="/api/clients", tags=["growth"])


def require_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """Match the pattern used by /reviews and the /gsc admin endpoints."""
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/{client_id}/growth-timeline", dependencies=[Depends(require_admin_key)])
async def growth_timeline(
    client_id: int,
    weeks: int = Query(12, ge=1, le=52),
    refresh: int = Query(0, ge=0, le=1),
) -> Dict[str, Any]:
    client = await get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    try:
        return await build_growth_timeline(
            client, client_id, weeks=weeks, force=bool(refresh)
        )
    except gsc.GSCApiDisabled as e:
        raise HTTPException(status_code=503, detail=str(e))
    except gsc.GSCNoAccess as e:
        raise HTTPException(status_code=424, detail=str(e))
    except gsc.GSCConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
