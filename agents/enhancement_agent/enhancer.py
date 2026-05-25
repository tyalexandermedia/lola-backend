"""
Enhancement runner. Takes a stored audit_response dict, calls Claude,
returns the structured enhancement JSON. Handles retries + parse errors.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

import httpx

from agents.enhancement_agent.system_prompt import ENHANCEMENT_SYSTEM_PROMPT

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
ANTHROPIC_MODEL = os.getenv("ENHANCEMENT_MODEL", "claude-opus-4-7").strip()
MAX_RETRIES = 3


class EnhancementError(Exception):
    """Wraps any failure so the caller can decide whether to surface or swallow."""


def _shrink_audit_for_prompt(audit: dict) -> dict:
    """
    Strip giant arrays + bulky raw data the model doesn't need. Saves tokens
    and keeps the prompt under Claude's input window even for long audits.
    """
    keep = {
        "business_name": audit.get("business_name"),
        "service_type": audit.get("business_type"),
        "city": audit.get("city"),
        "website": audit.get("website"),
        "email": audit.get("email"),
        "total_score": audit.get("total_score"),
        "grade": audit.get("grade"),
        "grade_label": audit.get("grade_label"),
        "percentile": audit.get("percentile"),
        "segment": audit.get("segment"),
        "lola_message": audit.get("lola_message"),
        "revenue_leak": audit.get("revenue_leak"),
        "page_speed": audit.get("page_speed"),
        "safety": audit.get("safety"),
    }
    bi = audit.get("business_info") or {}
    if isinstance(bi, dict):
        keep["business_info"] = {
            k: bi.get(k) for k in
            ("name", "address", "phone", "rating", "review_count",
             "verification_confidence", "categories")
            if bi.get(k) is not None
        }
    competitors = audit.get("competitors") or []
    if isinstance(competitors, list):
        keep["competitors"] = [
            {k: c.get(k) for k in ("rank", "title", "url", "snippet") if c.get(k) is not None}
            for c in competitors[:5]
            if isinstance(c, dict)
        ]
    categories = audit.get("categories") or {}
    if isinstance(categories, dict):
        keep["categories"] = {k: v for k, v in categories.items()}
    recs = audit.get("recommendations") or []
    if isinstance(recs, list):
        keep["recommendations"] = [
            {k: r.get(k) for k in ("title", "detail", "impact", "effort", "category")}
            for r in recs[:8]
            if isinstance(r, dict)
        ]
    return keep


def _parse_json_response(text: str) -> dict:
    """Strip optional markdown fences + parse."""
    s = text.strip()
    if s.startswith("```"):
        # Remove opening fence + optional language tag
        s = s.split("\n", 1)[1] if "\n" in s else s[3:]
        # Remove trailing fence
        if s.endswith("```"):
            s = s[: -3]
        s = s.strip()
    return json.loads(s)


async def generate_enhancement(audit: dict) -> dict:
    """
    Returns the structured enhancement dict. Raises EnhancementError on
    parse failures or if Anthropic isn't configured. Retries 3x with
    exponential backoff on transient HTTP errors.
    """
    if not ANTHROPIC_API_KEY:
        raise EnhancementError("ANTHROPIC_API_KEY not configured")

    payload_input = _shrink_audit_for_prompt(audit)
    user_message = (
        "Enhance this audit into a contractor opportunity report. "
        "Return STRICT JSON matching the schema in your system prompt — "
        "no prose, no markdown fences.\n\n"
        f"```json\n{json.dumps(payload_input, indent=2)}\n```"
    )

    last_err: str = ""
    async with httpx.AsyncClient() as client:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": ANTHROPIC_MODEL,
                        "max_tokens": 4096,
                        "system": ENHANCEMENT_SYSTEM_PROMPT,
                        "messages": [{"role": "user", "content": user_message}],
                    },
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    timeout=60.0,
                )
                if resp.status_code != 200:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    # 4xx (non-429) won't fix on retry
                    if 400 <= resp.status_code < 500 and resp.status_code != 429:
                        raise EnhancementError(last_err)
                else:
                    data = resp.json()
                    text = ""
                    for block in data.get("content", []) or []:
                        if block.get("type") == "text":
                            text += block.get("text", "")
                    if not text.strip():
                        last_err = "empty response from Claude"
                    else:
                        try:
                            return _parse_json_response(text)
                        except json.JSONDecodeError as je:
                            last_err = f"JSON parse: {je}; first 200ch: {text[:200]}"
            except httpx.HTTPError as e:
                last_err = f"httpx: {e}"
            if attempt + 1 < MAX_RETRIES:
                await asyncio.sleep(2 ** (attempt + 1))

    raise EnhancementError(f"Claude failed after {MAX_RETRIES} attempts: {last_err}")
