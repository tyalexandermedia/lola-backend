"""
Lola SEO Swarm orchestrator (Ruflo v2 — unified mega-prompt).

Single Claude Opus call returns the full 5-section workflow (audit, report,
lead-gen, outreach, learning) as one JSON blob. ~$0.10 per execute vs v1's
5-call $0.50-$2 — same end value, 5-20x cheaper.

Sync anthropic SDK is replaced with async httpx so the call doesn't block
the event loop. Honesty-locked: the prompt asks Claude to emit testimonial
PLACEHOLDERS (not fabricated quotes) because the project bans fake reviews.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List

import httpx

from swarm import memory

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
SWARM_MODEL = os.getenv("SWARM_MODEL", "claude-opus-4-7").strip()


class SwarmError(Exception):
    """Raised when the swarm can't complete (missing key, parse failure)."""


def _build_prompt(business_url: str, business_name: str, workflow_id: str) -> str:
    name_line = f"Business name: {business_name}\n" if business_name else ""
    return f"""You are Lola SEO Agent. Execute the complete workflow for {business_url}.

{name_line}TASK: Analyze this business and output JSON with ALL of the following sections.

1. SEO AUDIT
   - 3 critical gaps
   - Revenue leak estimate (monthly $, integer)
   - 2 quick wins
   - Scores (out of 100): page_seo, tech_seo, content, local_seo, authority

2. REPORT SUMMARY
   - Executive summary (2 sentences)
   - Top 3 action items
   - 30-day plan (one paragraph)

3. LEAD GENERATION SYSTEM
   - Landing page headline
   - 3 benefit bullets
   - 2 testimonial PLACEHOLDERS — DO NOT fabricate quotes. Output literal
     strings like "[ADD REAL CUSTOMER QUOTE - 2 sentences, name, city]"
     so the user fills in real reviews. Inventing fake testimonials is
     forbidden.
   - 3-email subject lines (just the subjects, not bodies)
   - 2 Facebook ad hooks (one-liners)

4. COLD OUTREACH
   - 1 subject line
   - Email body under 100 words

5. LEARNING PATTERNS
   - 2 key patterns from this industry
   - 1 recommendation for the next run

CONSTRAINTS:
- No fake customer testimonials (placeholders only — see section 3).
- No fabricated competitor names or made-up stats; if data is missing,
  say so honestly.
- Contractor-fluent tone, plain English, no jargon.

OUTPUT ONLY VALID JSON matching this exact schema:
{{
  "workflow_id": "{workflow_id}",
  "audit": {{
    "gaps": ["gap1", "gap2", "gap3"],
    "revenue_leak": 5000,
    "quick_wins": ["win1", "win2"],
    "scores": {{
      "page_seo": 65,
      "tech_seo": 70,
      "content": 60,
      "local_seo": 75,
      "authority": 50
    }}
  }},
  "report": {{
    "summary": "...",
    "actions": ["action1", "action2", "action3"],
    "plan_30day": "..."
  }},
  "lead_gen": {{
    "landing_headline": "...",
    "benefits": ["benefit1", "benefit2", "benefit3"],
    "testimonials": ["[ADD REAL CUSTOMER QUOTE - ...]", "[ADD REAL CUSTOMER QUOTE - ...]"],
    "email_subjects": ["subj1", "subj2", "subj3"],
    "ad_hooks": ["hook1", "hook2"]
  }},
  "outreach": {{
    "subject": "...",
    "body": "..."
  }},
  "learning": {{
    "patterns": ["pattern1", "pattern2"],
    "next_recommendation": "..."
  }}
}}

No prose outside JSON. No markdown fences."""


async def _claude(prompt: str, max_tokens: int = 2500) -> str:
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
    s = text.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s[3:]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
    start = s.find("{")
    end = s.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(s[start:end])
        except json.JSONDecodeError as e:
            raise SwarmError(f"JSON parse: {e}; first 200ch: {text[:200]}")
    raise SwarmError(f"No JSON object found in response. first 200ch: {text[:200]}")


class LolaSEOSwarm:
    def __init__(self) -> None:
        self.workflow_history: List[Dict[str, Any]] = []

    async def execute_full_workflow(
        self,
        business_url: str,
        business_name: str = "",
    ) -> Dict[str, Any]:
        workflow_id = f"lola-{uuid.uuid4().hex[:8]}"
        start_time = datetime.utcnow()
        print(f"[swarm/v2] starting {workflow_id} for {business_url}")

        try:
            prompt = _build_prompt(business_url, business_name, workflow_id)
            text = await _claude(prompt)
            data = _parse_json(text)
            execution_time = (datetime.utcnow() - start_time).total_seconds()

            final = {
                "workflow_id": workflow_id,
                "status": "completed",
                "business_url": business_url,
                "execution_time_seconds": execution_time,
                "cost_estimate": "$0.08-$0.12",
                "data": data,
            }
            self.workflow_history.append(final)
            self.workflow_history = self.workflow_history[-50:]

            try:
                await memory.save_workflow(
                    workflow_id, business_url, "completed", final, execution_time
                )
                for p in (data.get("learning", {}) or {}).get("patterns", []) or []:
                    await memory.store_pattern("learned", {"pattern": p})
            except Exception as persist_err:
                print(f"[swarm/v2] persist failed: {persist_err}")

            print(f"[swarm/v2] {workflow_id} done in {execution_time:.1f}s for ~$0.10")
            return final

        except SwarmError as e:
            return self._failure(workflow_id, str(e), start_time, business_url)
        except Exception as e:
            return self._failure(workflow_id, f"Unexpected: {e}", start_time, business_url)

    def _failure(
        self,
        workflow_id: str,
        error: str,
        start_time: datetime,
        business_url: str,
    ) -> Dict[str, Any]:
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        payload = {
            "workflow_id": workflow_id,
            "status": "failed",
            "error": error,
            "business_url": business_url,
            "execution_time_seconds": execution_time,
        }
        try:
            import asyncio
            asyncio.create_task(
                memory.save_workflow(
                    workflow_id, business_url, "failed", payload, execution_time
                )
            )
        except Exception:
            pass
        return payload

    def get_workflow_history(self) -> List[Dict[str, Any]]:
        return self.workflow_history


# Module-level singleton. With one Uvicorn worker (Railway default), this
# is the per-process instance the router talks to. Durable state lives in
# SQLite via swarm.memory.
swarm = LolaSEOSwarm()
