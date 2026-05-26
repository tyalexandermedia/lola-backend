"""
Lola SEO Swarm orchestrator (Ruflo adapter).

5-agent workflow: Audit -> (Report + Lead Gen in parallel) -> Outreach -> Learning.

Each stage is a single Claude Opus call over async httpx so the event loop
isn't blocked. Cost-conscious: ~5 Opus calls per execute, roughly $0.50-$2/run.
Gate the public endpoint accordingly.
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import httpx

from swarm import memory
from swarm.anti_drift import AntiDriftGuards

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
SWARM_MODEL = os.getenv("SWARM_MODEL", "claude-opus-4-7").strip()


class AgentRole(str, Enum):
    SEO_AUDITOR = "seo_auditor"
    REPORT_WRITER = "report_writer"
    LEAD_GEN_SPECIALIST = "lead_gen_specialist"
    COLD_OUTREACH = "cold_outreach_specialist"
    LEARNING_AGENT = "learning_agent"


class SwarmError(Exception):
    """Raised when the swarm can't complete (missing key, all retries failed)."""


async def _claude(prompt: str, max_tokens: int) -> str:
    if not ANTHROPIC_API_KEY:
        raise SwarmError("ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json={
                "model": SWARM_MODEL,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
    if resp.status_code != 200:
        raise SwarmError(f"Claude HTTP {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    text = ""
    for block in data.get("content", []) or []:
        if block.get("type") == "text":
            text += block.get("text", "")
    if not text.strip():
        raise SwarmError("Empty Claude response")
    return text


def _parse_json(text: str) -> Dict[str, Any]:
    """Lenient JSON: pull the first {...} block out of the response."""
    s = text.strip()
    start = s.find("{")
    end = s.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(s[start:end])
        except json.JSONDecodeError:
            pass
    return {"raw_response": text}


class LolaSEOSwarm:
    def __init__(self) -> None:
        self.successful_patterns: List[str] = []
        self.workflow_history: List[Dict[str, Any]] = []
        self.guards = AntiDriftGuards(
            allowed_roles=[r.value for r in AgentRole],
            max_history=500,
        )

    async def execute_full_workflow(
        self,
        business_url: str,
        business_name: str = "",
        generate_lead_system: bool = True,
    ) -> Dict[str, Any]:
        workflow_id = f"lola-{uuid.uuid4().hex[:8]}"
        start_time = datetime.utcnow()
        print(f"[swarm] starting {workflow_id} for {business_url}")

        try:
            audit_result = await self._audit_agent(business_url, business_name, workflow_id)
            if audit_result["status"] != "success":
                return self._failure(workflow_id, "Audit agent failed", start_time)

            report_result, lead_gen_result = await asyncio.gather(
                self._report_agent(audit_result, business_url, workflow_id),
                (
                    self._lead_gen_agent(audit_result, business_url, workflow_id)
                    if generate_lead_system
                    else self._skipped("lead_gen_2b", workflow_id)
                ),
            )

            outreach_result = await self._outreach_agent(report_result, business_url, workflow_id)
            learning_result = await self._learning_agent(
                [audit_result, report_result, lead_gen_result, outreach_result],
                workflow_id,
            )

            execution_time = (datetime.utcnow() - start_time).total_seconds()
            final = {
                "workflow_id": workflow_id,
                "status": "completed",
                "business_url": business_url,
                "execution_time_seconds": execution_time,
                "agents_executed": [
                    audit_result,
                    report_result,
                    lead_gen_result,
                    outreach_result,
                    learning_result,
                ],
                "learned_patterns": learning_result.get("patterns", []),
                "next_recommendations": self._recommendations(
                    [audit_result, report_result, outreach_result]
                ),
            }
            self.workflow_history.append(final)
            await memory.save_workflow(
                workflow_id, business_url, "completed", final, execution_time
            )
            await self._persist_patterns(learning_result.get("patterns", []))
            print(f"[swarm] {workflow_id} completed in {execution_time:.1f}s")
            return final

        except SwarmError as e:
            return self._failure(workflow_id, str(e), start_time, persist_url=business_url)
        except Exception as e:
            return self._failure(
                workflow_id, f"Unexpected: {e}", start_time, persist_url=business_url
            )

    def _failure(
        self,
        workflow_id: str,
        error: str,
        start_time: datetime,
        persist_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        payload = {
            "workflow_id": workflow_id,
            "status": "failed",
            "error": error,
            "execution_time_seconds": execution_time,
        }
        if persist_url:
            asyncio.create_task(
                memory.save_workflow(workflow_id, persist_url, "failed", payload, execution_time)
            )
        return payload

    async def _persist_patterns(self, patterns: List[str]) -> None:
        for p in patterns:
            try:
                await memory.store_pattern("learned", {"pattern": p})
            except Exception as e:
                print(f"[swarm] pattern persist failed: {e}")
        self.successful_patterns.extend(patterns)
        self.successful_patterns = self.successful_patterns[-100:]

    async def _audit_agent(
        self, business_url: str, business_name: str, workflow_id: str
    ) -> Dict[str, Any]:
        self.guards.validate_task("audit_1", AgentRole.SEO_AUDITOR.value, "comprehensive_audit")
        text = await _claude(
            prompt=f"""Run comprehensive SEO audit for {business_url}.

Business name: {business_name or 'not provided'}

Analyze:
1. On-page SEO (titles, meta, h1, headers)
2. Technical SEO (speed, mobile, indexability)
3. Content SEO (keywords, structure)
4. Local SEO (schema, citations, reviews)
5. Authority (backlinks, domain age)

Output JSON only:
{{
  "gaps": ["gap1", "gap2", "gap3"],
  "revenue_leak": 5000,
  "quick_wins": ["win1", "win2", "win3"],
  "scores": {{"page": 65, "tech": 70, "content": 60, "local": 75, "authority": 50}}
}}""",
            max_tokens=2000,
        )
        return {
            "agent_id": "audit_1",
            "role": AgentRole.SEO_AUDITOR.value,
            "status": "success",
            "workflow_id": workflow_id,
            "output": _parse_json(text),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    async def _report_agent(
        self, audit_result: Dict[str, Any], business_url: str, workflow_id: str
    ) -> Dict[str, Any]:
        self.guards.validate_task("report_2a", AgentRole.REPORT_WRITER.value, "build_report")
        text = await _claude(
            prompt=f"""Create an SEO audit report for {business_url}.

Audit data: {json.dumps(audit_result.get('output', {}))}

Generate:
1. Executive Summary (top 3 fixes + revenue leak)
2. Technical Results
3. Content Results
4. Local SEO Results
5. 30/60/90 Day Action Plan
6. ROI Projections

Conversion-focused, plain text, contractor voice.""",
            max_tokens=2000,
        )
        return {
            "agent_id": "report_2a",
            "role": AgentRole.REPORT_WRITER.value,
            "status": "success",
            "workflow_id": workflow_id,
            "output": {"report": text},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    async def _lead_gen_agent(
        self, audit_result: Dict[str, Any], business_url: str, workflow_id: str
    ) -> Dict[str, Any]:
        self.guards.validate_task(
            "lead_gen_2b", AgentRole.LEAD_GEN_SPECIALIST.value, "generate_lead_system"
        )
        gaps = audit_result.get("output", {}).get("gaps", [])[:3]
        text = await _claude(
            prompt=f"""Generate a lead-gen starter system for {business_url}.

Audit gaps: {json.dumps(gaps)}

Create:
1. Landing page copy (hero + benefits + CTA)
2. 3-email follow-up sequence (day 1, 3, 7)
3. 3 Facebook ad variants
4. 30-day tracking plan

Copy-paste ready format, contractor voice.""",
            max_tokens=1500,
        )
        return {
            "agent_id": "lead_gen_2b",
            "role": AgentRole.LEAD_GEN_SPECIALIST.value,
            "status": "success",
            "workflow_id": workflow_id,
            "output": {"lead_system": text},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    async def _outreach_agent(
        self, report_result: Dict[str, Any], business_url: str, workflow_id: str
    ) -> Dict[str, Any]:
        self.guards.validate_task(
            "outreach_3", AgentRole.COLD_OUTREACH.value, "generate_outreach_emails"
        )
        text = await _claude(
            prompt=f"""Generate cold outreach emails for {business_url}.

Create 3 A/B variants:

Email 1: Problem-focused (lead with pain point, include one audit stat, CTA: schedule audit)
Email 2: Social proof (success story, real numbers if known, CTA: view results)
Email 3: Urgency (time-sensitive, competitor comparison, CTA: book consultation)

Requirements: <120 words each, contractor voice, 1 CTA each.

Format:
## EMAIL 1: [Subject]
[Body]

## EMAIL 2: [Subject]
[Body]

## EMAIL 3: [Subject]
[Body]""",
            max_tokens=1500,
        )
        return {
            "agent_id": "outreach_3",
            "role": AgentRole.COLD_OUTREACH.value,
            "status": "success",
            "workflow_id": workflow_id,
            "output": {"emails": text},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    async def _learning_agent(
        self, workflow_results: List[Dict[str, Any]], workflow_id: str
    ) -> Dict[str, Any]:
        self.guards.validate_task(
            "learning_4", AgentRole.LEARNING_AGENT.value, "extract_patterns"
        )
        agent_ids = [r.get("agent_id") for r in workflow_results]
        text = await _claude(
            prompt=f"""Analyze this Lola workflow for learning patterns.

Workflow ID: {workflow_id}
Agents: {agent_ids}

Extract:
1. Most impactful audit findings
2. Successful email hooks
3. Lead gen patterns
4. Timing patterns
5. Recommendations for future runs

JSON only:
{{
  "patterns": ["pattern1", "pattern2"],
  "recommendations": ["rec1", "rec2"],
  "optimizations": ["opt1", "opt2"]
}}""",
            max_tokens=800,
        )
        data = _parse_json(text)
        return {
            "agent_id": "learning_4",
            "role": AgentRole.LEARNING_AGENT.value,
            "status": "success",
            "workflow_id": workflow_id,
            "output": data,
            "patterns": data.get("patterns", []),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    def _skipped(self, agent_id: str, workflow_id: str) -> Dict[str, Any]:
        return {
            "agent_id": agent_id,
            "status": "skipped",
            "workflow_id": workflow_id,
            "output": {},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    def _recommendations(self, results: List[Dict[str, Any]]) -> List[str]:
        out: List[str] = []
        audit_out = results[0].get("output", {})
        gaps = audit_out.get("gaps", []) or []
        if gaps:
            out.append(f"Fix {len(gaps)} SEO gaps surfaced by audit")
        revenue_leak = audit_out.get("revenue_leak", 0) or 0
        if revenue_leak:
            out.append(f"${revenue_leak:,.0f}/month revenue opportunity")
        if results[2].get("status") == "success":
            out.append("Send 3 cold outreach email variants (A/B test)")
        if self.successful_patterns:
            out.append(f"Apply {len(self.successful_patterns)} learned patterns to next run")
        return out[:5]

    def get_workflow_history(self) -> List[Dict[str, Any]]:
        return self.workflow_history

    def get_learned_patterns(self) -> List[str]:
        return self.successful_patterns


# Module-level singleton — one Uvicorn worker shares one swarm.
# If you scale to multiple workers, in-memory state diverges per worker;
# durable state lives in SQLite via the memory module.
swarm = LolaSEOSwarm()
