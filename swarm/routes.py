"""Swarm router. Mount on the app at root prefix /swarm."""

import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from swarm import memory
from swarm.orchestrator import SwarmError, swarm

router = APIRouter(prefix="/swarm", tags=["swarm"])


def require_admin_key(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
) -> None:
    """
    Cost gate. Each /swarm/execute call is ~$0.10 in Opus tokens — small
    but real. Matches the X-Admin-Key pattern used by /reviews + main.py.
    Set LOLA_SECRET_ADMIN_KEY on Railway to enable.
    """
    expected = os.getenv("LOLA_SECRET_ADMIN_KEY", "")
    if not expected or x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


class WorkflowRequest(BaseModel):
    business_url: str
    business_name: Optional[str] = ""


@router.post("/execute", dependencies=[Depends(require_admin_key)])
async def execute_swarm_workflow(request: WorkflowRequest) -> Dict[str, Any]:
    """
    Execute the unified v2 swarm (single mega-prompt). Returns the full
    structured data block. ~$0.10 per call. Returns 503 if
    ANTHROPIC_API_KEY isn't configured.
    """
    try:
        result = await swarm.execute_full_workflow(
            business_url=request.business_url,
            business_name=request.business_name or "",
        )
    except SwarmError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if result.get("status") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Workflow failed"))

    return result


@router.get("/history", dependencies=[Depends(require_admin_key)])
async def get_workflow_history(limit: int = 50):
    return {"workflows": await memory.list_workflows(limit=limit)}


@router.get("/patterns", dependencies=[Depends(require_admin_key)])
async def get_learned_patterns(limit: int = 100):
    return {"patterns": await memory.get_patterns(limit=limit)}
