"""
Anthropic API call with 3-retry exponential backoff. Returns email body
text on success, raises after final retry.
"""

from __future__ import annotations
import asyncio
from typing import Any

import httpx

from agents.reporting_agent.config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    ANTHROPIC_RETRIES,
)
from agents.reporting_agent.prompt_builder import SYSTEM_PROMPT


class ClaudeError(Exception):
    """All Claude failures bubble up as this for the orchestrator to catch."""


async def generate_email_body(messages: list[dict[str, Any]]) -> str:
    """Returns plain-text body. Retries 3x with exponential backoff (2s, 4s, 8s)."""
    if not ANTHROPIC_API_KEY:
        raise ClaudeError("ANTHROPIC_API_KEY not configured")

    last_err: str = ""
    async with httpx.AsyncClient() as client:
        for attempt in range(ANTHROPIC_RETRIES):
            try:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": ANTHROPIC_MODEL,
                        "max_tokens": 800,
                        "system": SYSTEM_PROMPT,
                        "messages": messages,
                    },
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    timeout=45.0,
                )
                if resp.status_code != 200:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    # 4xx errors won't recover from retry — surface immediately
                    if 400 <= resp.status_code < 500 and resp.status_code != 429:
                        raise ClaudeError(last_err)
                else:
                    data = resp.json()
                    out = ""
                    for block in data.get("content", []) or []:
                        if block.get("type") == "text":
                            out += block.get("text", "")
                    if out.strip():
                        return out.strip()
                    last_err = "empty response from Claude"
            except httpx.HTTPError as e:
                last_err = f"httpx: {e}"

            # Backoff before next retry
            if attempt + 1 < ANTHROPIC_RETRIES:
                await asyncio.sleep(2 ** (attempt + 1))

    raise ClaudeError(f"Claude failed after {ANTHROPIC_RETRIES} attempts: {last_err}")
