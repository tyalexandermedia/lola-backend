"""
Ranking tracker for case studies.

For each tracked query:
  - Google Custom Search → find target domain in top 10, store position
  - Claude API (AI Mode proxy) → ask the prompt, check if domain/name is mentioned

All results persisted to `case_study_rankings` table for time-series deltas.
"""

import json
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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip() or None
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "").strip() or None
PERPLEXITY_MODEL = os.getenv("PERPLEXITY_MODEL", "sonar-pro").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip() or None
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()


async def _google_rank(
    client: httpx.AsyncClient,
    query: str,
    target_domain: str,
) -> tuple[Optional[int], str, str, list[str]]:
    """
    Returns (position, found_url, snippet, competitors). Position is None if
    the client is not in the top 10. Competitors are the first 3 non-client
    organic results for the query.
    """
    if not GOOGLE_CUSTOM_SEARCH_KEY or not GOOGLE_CUSTOM_SEARCH_CX:
        return None, "", "Custom Search not configured", []
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
            return None, "", f"HTTP {resp.status_code}: {resp.text[:120]}", []
        body = resp.json()
        items = body.get("items", []) or []
        competitors: list[str] = []
        position: Optional[int] = None
        found_url = ""
        snippet = "not in top 10"
        for i, item in enumerate(items, 1):
            link = (item.get("link") or "").lower()
            if target_domain.lower() in link:
                position = i
                found_url = item.get("link", "")
                snippet = (item.get("snippet") or "")[:300]
                continue
            if len(competitors) < 3:
                name = (item.get("title") or item.get("displayLink") or item.get("link") or "").strip()
                if name and name not in competitors:
                    competitors.append(name[:90])
        return position, found_url, snippet, competitors
    except Exception as e:
        return None, "", f"exception: {e}", []


def _extract_recommended(text: str) -> list[str]:
    """
    Pull the RECOMMENDED_JSON array out of Claude's answer. Tolerant of
    markdown fences / stray prose around it. Returns [] if not found.
    """
    marker = "RECOMMENDED_JSON:"
    idx = text.rfind(marker)
    segment = text[idx + len(marker):] if idx >= 0 else text
    start = segment.find("[")
    end = segment.find("]", start)
    if start < 0 or end < 0:
        return []
    try:
        arr = json.loads(segment[start:end + 1])
    except json.JSONDecodeError:
        return []
    return [str(x).strip() for x in arr if isinstance(x, (str, int, float)) and str(x).strip()][:10]


def _name_matches(client_name: str, target_domain: str, candidate: str) -> bool:
    """Loose match — handles 'Sandbar' vs 'Sandbar Soft Wash' vs domain."""
    c = candidate.lower()
    if client_name.lower() in c or c in client_name.lower():
        return True
    # Match on the distinctive first word of the brand (e.g. "sandbar")
    first = client_name.lower().split()[0] if client_name.split() else ""
    if len(first) >= 4 and first in c:
        return True
    dom = target_domain.lower().split(".")[0]
    if len(dom) >= 4 and dom in c.replace(" ", ""):
        return True
    return False


def _structured_recommendation_prompt(prompt: str) -> str:
    return (
        f"{prompt}\n\n"
        "After your answer, on a new final line, output ONLY a JSON array of the "
        "specific business/company names you recommended (most relevant first), e.g.\n"
        'RECOMMENDED_JSON: ["Acme Co", "Best Pros LLC", "Smith Services"]\n'
        "If you can't name specific local businesses, output RECOMMENDED_JSON: []"
    )


def _score_recommendation_text(
    text: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, list[str]]:
    recommended = _extract_recommended(text)
    mentioned_in_list = any(
        _name_matches(client_name, target_domain, r) for r in recommended
    )
    mentioned_in_text = (
        client_name.lower() in text.lower()
        or target_domain.lower() in text.lower()
    )
    mentioned = mentioned_in_list or mentioned_in_text
    competitors = [
        r for r in recommended
        if not _name_matches(client_name, target_domain, r)
    ]
    return mentioned, competitors


async def _claude_ai_mode(
    client: httpx.AsyncClient,
    prompt: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, str, list[str]]:
    """
    Ask Claude as an AI Mode proxy. Returns (mentioned, raw_excerpt, competitors).

    Same single API call as before — we just append a structured-output
    instruction so Claude lists the businesses it recommended. We then:
      - mentioned   = is the client in that list?
      - competitors = everyone else it recommended (the businesses winning
                      this query INSTEAD of the client)

    $0 extra cost vs the old version — one call, smarter prompt + parse.
    """
    if not ANTHROPIC_API_KEY:
        return False, "Anthropic key not configured", []
    structured_prompt = _structured_recommendation_prompt(prompt)
    try:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 640,
                "messages": [{"role": "user", "content": structured_prompt}],
            },
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}", []
        data = resp.json()
        text = ""
        for block in data.get("content", []) or []:
            if block.get("type") == "text":
                text += block.get("text", "")

        mentioned, competitors = _score_recommendation_text(
            text, client_name, target_domain
        )
        return mentioned, text[:500], competitors
    except Exception as e:
        return False, f"exception: {e}", []


async def _chatgpt_ai_mode(
    client: httpx.AsyncClient,
    prompt: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, str, list[str]]:
    """
    Ask ChatGPT (OpenAI) the same recommendation prompt. Returns
    (mentioned, raw_excerpt, competitors) using the same RECOMMENDED_JSON
    contract as the Claude path. Skipped silently if OPENAI_API_KEY isn't set.
    """
    if not OPENAI_API_KEY:
        return False, "OpenAI key not configured", []
    structured_prompt = _structured_recommendation_prompt(prompt)
    try:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json={
                "model": OPENAI_MODEL,
                "max_tokens": 640,
                "messages": [{"role": "user", "content": structured_prompt}],
            },
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}", []
        data = resp.json()
        text = (
            data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        )

        mentioned, competitors = _score_recommendation_text(
            text, client_name, target_domain
        )
        return mentioned, text[:500], competitors
    except Exception as e:
        return False, f"exception: {e}", []


async def _perplexity_ai_mode(
    client: httpx.AsyncClient,
    prompt: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, str, list[str]]:
    """
    Ask Perplexity Sonar the same recommendation prompt. Optional: only runs
    when PERPLEXITY_API_KEY is configured.
    """
    if not PERPLEXITY_API_KEY:
        return False, "Perplexity key not configured", []
    structured_prompt = _structured_recommendation_prompt(prompt)
    try:
        resp = await client.post(
            "https://api.perplexity.ai/v1/sonar",
            json={
                "model": PERPLEXITY_MODEL,
                "max_tokens": 640,
                "messages": [{"role": "user", "content": structured_prompt}],
            },
            headers={
                "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}", []
        data = resp.json()
        text = (
            data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        )
        mentioned, competitors = _score_recommendation_text(
            text, client_name, target_domain
        )
        return mentioned, text[:500], competitors
    except Exception as e:
        return False, f"exception: {e}", []


async def _gemini_ai_mode(
    client: httpx.AsyncClient,
    prompt: str,
    client_name: str,
    target_domain: str,
) -> tuple[bool, str, list[str]]:
    """
    Ask Gemini the same recommendation prompt. Optional: only runs when
    GEMINI_API_KEY is configured.
    """
    if not GEMINI_API_KEY:
        return False, "Gemini key not configured", []
    structured_prompt = _structured_recommendation_prompt(prompt)
    try:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": structured_prompt}],
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": 640,
                    "temperature": 0.2,
                },
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}", []
        data = resp.json()
        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
            or []
        )
        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
        mentioned, competitors = _score_recommendation_text(
            text, client_name, target_domain
        )
        return mentioned, text[:500], competitors
    except Exception as e:
        return False, f"exception: {e}", []


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
    Resolve a case-study config by slug — MERGE the DB row (if any) with the
    in-memory CASE_STUDIES config (if any). Either source alone is enough to
    yield a working case study; merging means a partial DB row or a missing
    DB row never causes a 404 on the dashboard.

    Merge rules (DB beats config when both have a value; config fills gaps):
      - client_name / target_url / target_domain → DB → config → slug fallback
      - google_queries / ai_mode_prompts → DB if non-empty, else config
      - verified_organic_wins / verified_map_pack_wins → config only (DB has
        no column for them yet)
    """
    fallback = CASE_STUDIES.get(slug)
    row = None
    try:
        row = await get_client_by_slug(slug)
    except Exception as e:
        print(f"[_load_case_study] DB lookup failed for {slug}: {type(e).__name__}: {e}")

    # Neither source has anything → genuinely unknown slug.
    if not row and not fallback:
        return None

    if row:
        target_url = (
            (row.get("target_url") or row.get("site_url") or "").strip()
            or (fallback.target_url if fallback else "")
        )
        google_queries = list(row.get("money_keywords") or []) \
            or (list(fallback.google_queries) if fallback else [])
        ai_mode_prompts = list(row.get("ai_mode_prompts") or []) \
            or (list(fallback.ai_mode_prompts) if fallback else [])
        return CaseStudy(
            slug=row["slug"],
            client_name=row.get("client_name") or (fallback.client_name if fallback else row["slug"]),
            target_url=target_url,
            target_domain=_domain_from_url(target_url) if target_url else (fallback.target_domain if fallback else ""),
            google_queries=google_queries,
            ai_mode_prompts=ai_mode_prompts,
            verified_organic_wins=list(fallback.verified_organic_wins) if fallback else [],
            verified_map_pack_wins=list(fallback.verified_map_pack_wins) if fallback else [],
        )

    # No DB row but config exists → return the config directly. Hardens
    # against a wiped/missing reporting_clients table.
    return fallback


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
            pos, url, snippet, competitors = await _google_rank(http, q, cs.target_domain)
            await save_ranking(
                slug=slug,
                query=q,
                source="google_organic",
                position=pos,
                mentioned=pos is not None,
                found_url=url,
                raw_excerpt=snippet,
                notes=notes,
                competitors=competitors,
            )
            summary["google"].append({
                "query": q,
                "position": pos,
                "url": url,
                "snippet": snippet[:120],
                "competitors": competitors,
            })

        # AI Mode — ask every configured provider the same prompt. Each becomes
        # its own snapshot row so the dashboard can show per-provider mentions
        # AND aggregate share of voice across all AI search assistants.
        for p in cs.ai_mode_prompts:
            providers = [
                ("claude", "claude_ai_mode", _claude_ai_mode, bool(ANTHROPIC_API_KEY)),
                ("chatgpt", "chatgpt_ai_mode", _chatgpt_ai_mode, bool(OPENAI_API_KEY)),
                ("perplexity", "perplexity_ai_mode", _perplexity_ai_mode, bool(PERPLEXITY_API_KEY)),
                ("gemini", "gemini_ai_mode", _gemini_ai_mode, bool(GEMINI_API_KEY)),
            ]
            for provider, source, fn, enabled in providers:
                if not enabled:
                    continue
                mentioned, excerpt, competitors = await fn(
                    http, p, cs.client_name, cs.target_domain
                )
                await save_ranking(
                    slug=slug,
                    query=p,
                    source=source,
                    position=None,
                    mentioned=mentioned,
                    found_url="",
                    raw_excerpt=excerpt,
                    notes=notes,
                    competitors=competitors,
                )
                summary["ai_mode"].append({
                    "prompt": p[:80],
                    "provider": provider,
                    "mentioned": mentioned,
                    "competitors": competitors,
                    "excerpt": excerpt[:200],
                })

    return summary
