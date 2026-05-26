"""Swarm router. Mount on the app at root prefix /swarm."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from swarm import memory
from swarm.orchestrator import SwarmError, swarm

router = APIRouter(prefix="/swarm", tags=["swarm"])


class WorkflowRequest(BaseModel):
    business_url: str
    business_name: Optional[str] = ""
    generate_lead_system: bool = True


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    execution_time_seconds: float
    agents_executed: int
    learned_patterns: List[str]
    next_recommendations: List[str]


@router.post("/execute", response_model=WorkflowResponse)
async def execute_swarm_workflow(request: WorkflowRequest):
    """
    Execute the full 5-agent Lola swarm. Costs ~$0.50-$2 per call (5 Opus
    completions). Returns 503 if ANTHROPIC_API_KEY isn't configured.
    """
    try:
        result = await swarm.execute_full_workflow(
            business_url=request.business_url,
            business_name=request.business_name or "",
            generate_lead_system=request.generate_lead_system,
        )
    except SwarmError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if result.get("status") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Workflow failed"))

    return WorkflowResponse(
        workflow_id=result["workflow_id"],
        status=result["status"],
        execution_time_seconds=result["execution_time_seconds"],
        agents_executed=len(result.get("agents_executed", [])),
        learned_patterns=result.get("learned_patterns", []),
        next_recommendations=result.get("next_recommendations", []),
    )


@router.get("/history")
async def get_workflow_history(limit: int = 50):
    return {"workflows": await memory.list_workflows(limit=limit)}


@router.get("/patterns")
async def get_learned_patterns(limit: int = 100):
    return {"patterns": await memory.get_patterns(limit=limit)}
