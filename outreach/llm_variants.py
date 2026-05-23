"""
Tier 3 — Anthropic-generated per-lead variants.

Gated behind:
  OUTREACH_LLM_VARIANTS=true
  ANTHROPIC_API_KEY=sk-ant-...

Results are cached for 30 days keyed on business_name + city, so repeating
the same lead is free quota-wise. Falls back to the static templates in
outreach/templates.py whenever:
  - the flag is off
  - the API key is missing
  - Anthropic returns a non-200 or malformed JSON
  - the cache layer is unavailable

Cost reality check at 50 sends/day with Sonnet 4.6:
  ~600 input + 400 output tokens per lead × 50 = ~30k in / 20k out per day.
  At current Sonnet pricing that's about $0.15-0.20/day with no cache hits,
  effectively $0 with cache hits.
"""

import json
import os
from datetime import timedelta
from typing import Dict, Optional

import httpx

from db.api_cache import cache_get, cache_set
from outreach.templates import VARIANTS, VariantKey

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
LLM_VARIANTS_ENABLED = os.getenv("OUTREACH_LLM_VARIANTS", "").strip().lower() in (
    "true", "1", "yes",
)

VARIANTS_TTL = timedelta(days=30)


SYSTEM_PROMPT = """You write cold outreach emails for Lola SEO, a Florida service that audits home-services contractors (soft wash, roofing, HVAC, plumbing, pest control, landscaping). Your job: write 3 distinct email variants for a single contractor.

Hard rules per variant:
- Subject ≤50 characters, no spam triggers (no "free", "guaranteed", "act now", no all-caps words, no exclamation in subject)
- Body ≤120 words, plain text only
- Lead with a real reason to read, not a pitch
- Use the audit-link placeholder exactly: {{audit_link}}
- Use the unsubscribe-link placeholder exactly: {{unsub_link}} (on its own line at the end)
- Sign as "— Ty\\nTampa Bay"
- One of the three variants (not all three) references the Sandbar Soft Wash result: "5 keywords ranked in 3 weeks"

Style per variant:
- A: curiosity-led question, conversational opener
- B: specific case-study result + benefit translation
- C: brief, ≤50 words including signature

Output JSON only, no preamble, no markdown fence. Schema:
{"variants":[{"key":"A","subject":"...","body":"..."},{"key":"B","subject":"...","body":"..."},{"key":"C","subject":"...","body":"..."}]}"""


def _user_prompt(business_name: str, owner_first_name: str, city: str) -> str:
    first = (owner_first_name or "there").split()[0]
    return (
        f"Contractor: {business_name}\n"
        f"Owner first name: {first}\n"
        f"City: {city}\n"
        "Write the 3 variants for this contractor."
    )


async def _call_anthropic(business_name: str, owner_first_name: str, city: str) -> Optional[Dict]:
    if not ANTHROPIC_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 1024,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": _user_prompt(business_name, owner_first_name, city)}
                    ],
                },
            )
        if resp.status_code != 200:
            print(f"Anthropic LLM variants HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        body = resp.json()
        content = body.get("content") or []
        text = ""
        for block in content:
            if block.get("type") == "text":
                text += block.get("text", "")
        text = text.strip()
        # Anthropic sometimes wraps JSON in fences despite instructions
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()
        parsed = json.loads(text)
        if not isinstance(parsed, dict) or "variants" not in parsed:
            return None
        # Sanity-check the shape
        for v in parsed["variants"]:
            if not all(k in v for k in ("key", "subject", "body")):
                return None
            if v["key"] not in ("A", "B", "C"):
                return None
        return parsed
    except Exception as e:
        print(f"Anthropic LLM variants error: {e}")
        return None


async def render_variant(
    variant_key: VariantKey,
    business_name: str,
    owner_first_name: str,
    city: str,
    tokens: Dict[str, str],
) -> tuple[str, str]:
    """
    Return (subject, body) for `variant_key`. Uses LLM variants if enabled +
    cache layer is up; otherwise the static templates.
    """
    if not LLM_VARIANTS_ENABLED:
        # Static path — same as outreach.templates.render()
        v = VARIANTS[variant_key]
        subject, body = v.subject_tmpl, v.body_tmpl
        for k, val in tokens.items():
            subject = subject.replace("{{" + k + "}}", val or "")
            body = body.replace("{{" + k + "}}", val or "")
        return subject[:78], body

    cache_params = {"biz": business_name, "city": city}
    cached = await cache_get("llm_outreach_variants", cache_params)

    if not cached:
        generated = await _call_anthropic(business_name, owner_first_name, city)
        if generated:
            await cache_set("llm_outreach_variants", cache_params, generated, ttl=VARIANTS_TTL)
            cached = generated

    # Resolve from LLM payload OR fall back to static
    if cached:
        chosen = next(
            (v for v in cached.get("variants", []) if v.get("key") == variant_key),
            None,
        )
        if chosen:
            subject = chosen["subject"]
            body = chosen["body"]
            for k, val in tokens.items():
                subject = subject.replace("{{" + k + "}}", val or "")
                body = body.replace("{{" + k + "}}", val or "")
            return subject[:78], body

    # Fallback path
    v = VARIANTS[variant_key]
    subject, body = v.subject_tmpl, v.body_tmpl
    for k, val in tokens.items():
        subject = subject.replace("{{" + k + "}}", val or "")
        body = body.replace("{{" + k + "}}", val or "")
    return subject[:78], body
