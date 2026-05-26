"""
Ranking tracker for case studies.

For each tracked query:
  - Google Custom Search → find target domain in top 10, store position
  - Claude API (AI Mode proxy) → ask the prompt, check if domain/name is mentioned

All results persisted to `case_study_rankings` table for time-series deltas.
"""

import os
import re
from typing import Optional

import httpx

from case_studies.configs import CASE_STUDIES, CaseStudy
from db.case_studies import save_ranking
from db.reporting import get_client_by_slug

GOOGLE_CUSTOM_SEARCH_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY", "").strip() or None
GOOGLE_CUSTOM_SEARCH_CX = os.getenv("GOOGLE_CUSTOM_SEARCH_CX", "").strip() or None
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip() or None
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001").strip()


async def _google_rank(
    client: httpx.AsyncClient,
    query: str,
    target_domain: str,
) -> tuple[Optional[int], str, str]:
    """
    Returns (position, found_url, snippet). Position is None if not in top 10.
    """
    if not GOOGLE_CUSTOM_SEARCH_KEY or not GOOGLE_CUSTOM_SEARCH_CX:
        return None, "", "Custom Search not configured"
    try:
        resp = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "q": query,
                "key": GOOGLE_CUSTOM_SEARCH_KEY,
                "cx": GOOGLE_CUSTOM_SEARCH_CX,
                "num": 10,
                "gl": "us",
            },
            timeout=15.0,
        )
        if resp.status_code != 200:
            return None, "", f"HTTP {resp.status_code}: {resp.text[:120]}"
        body = resp.json()
        items = body.get("items", []) or []
        for i, item in enumerate(items, 1):
            link = (item.get("link") or "").lower()
            if target_domain.lower() in link:
                return i, item.get("link", ""), (item.get("snippet") or "")[:300]
        return None, "", "not in top 10"
    except Exception as e:
        return None, "", f"exception: {e}"


async def _claude_ai_mode(
    client: httpx.AsyncClient,
    prompt: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, str]:
    """
    Ask Claude as an AI Mode proxy. Returns (mentioned, raw_excerpt).
    `mentioned` is True if either the client name OR the domain appears
    in the response.
    """
    if not ANTHROPIC_API_KEY:
        return False, "Anthropic key not configured"
    try:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            },
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}"
        data = resp.json()
        text = ""
        for block in data.get("content", []) or []:
            if block.get("type") == "text":
                text += block.get("text", "")
        mentioned = (
            client_name.lower() in text.lower()
            or target_domain.lower() in text.lower()
        )
        return mentioned, text[:500]
    except Exception as e:
        return False, f"exception: {e}"


def _domain_from_url(url: str) -> str:
    """Pull `host.tld` out of an http(s) URL; tolerates plain domains."""
    s = (url or "").strip()
    if s.startswith(("http://", "https://")):
        s = s.split("://", 1)[1]
    s = s.split("/", 1)[0]
    if s.startswith("www."):
        s = s[4:]
    return s.lower()


async def _load_case_study(slug: str) -> CaseStudy | None:
    """
    Resolve a case-study config by slug. Priority:
      1. reporting_clients DB row (new retainer clients live here — no redeploy
         needed to start tracking a new one).
      2. CASE_STUDIES in-memory dict (legacy Sandbar entry stays as a safety
         net so the existing tracker keeps working even if nothing is in DB).
    """
    row = await get_client_by_slug(slug)
    if row:
        target_url = (row.get("target_url") or row.get("site_url") or "").strip()
        return CaseStudy(
            slug=row["slug"],
            client_name=row.get("client_name") or row["slug"],
            target_url=target_url,
            target_domain=_domain_from_url(target_url or row.get("site_url", "")),
            google_queries=list(row.get("money_keywords") or []),
            ai_mode_prompts=list(row.get("ai_mode_prompts") or []),
        )
    return CASE_STUDIES.get(slug)


async def case_study_exists(slug: str) -> bool:
    """Used by admin endpoints to validate slug before hitting the tracker."""
    return (await _load_case_study(slug)) is not None


async def run_case_study_snapshot(slug: str, notes: str = "") -> dict:
    """
    Captures a full snapshot for a case study. Persists every row to SQLite.
    Returns a summary dict for the response payload.
    """
    cs: CaseStudy | None = await _load_case_study(slug)
    if not cs:
        return {"error": f"Unknown case study: {slug}"}

    summary = {
        "slug": slug,
        "client_name": cs.client_name,
        "target_url": cs.target_url,
        "google": [],
        "ai_mode": [],
    }

    async with httpx.AsyncClient() as http:
        # Google organic rank per query
        for q in cs.google_queries:
            pos, url, snippet = await _google_rank(http, q, cs.target_domain)
            await save_ranking(
                slug=slug,
                query=q,
                source="google_organic",
                position=pos,
                mentioned=pos is not None,
                found_url=url,
                raw_excerpt=snippet,
                notes=notes,
            )
            summary["google"].append({
                "query": q,
                "position": pos,
                "url": url,
                "snippet": snippet[:120],
            })

        # AI Mode (Claude) — does it mention us?
        for p in cs.ai_mode_prompts:
            mentioned, excerpt = await _claude_ai_mode(
                http, p, cs.client_name, cs.target_domain
            )
            await save_ranking(
                slug=slug,
                query=p,
                source="claude_ai_mode",
                position=None,
                mentioned=mentioned,
                found_url="",
                raw_excerpt=excerpt,
                notes=notes,
            )
            summary["ai_mode"].append({
                "prompt": p[:80],
                "mentioned": mentioned,
                "excerpt": excerpt[:200],
            })

    return summary
