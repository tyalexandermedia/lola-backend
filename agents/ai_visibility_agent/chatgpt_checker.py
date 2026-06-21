"""
ChatGPT citation checker.

Asks the OpenAI API whether a business is mentioned/recommended when a user
asks a money query. Parses the response for the business name and any URL.
"""

from __future__ import annotations

import os
import re
import logging
from datetime import date

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def check_chatgpt(
    query: str,
    business_name: str,
    service_area: str = "",
) -> dict:
    """
    Returns:
        {engine, query, cited, cited_url, position_in_response, response_excerpt, snapshot_date}
    Degrades gracefully if OPENAI_API_KEY is not set.
    """
    today = date.today().isoformat()
    base = {
        "engine": "chatgpt",
        "query": query,
        "cited": False,
        "cited_url": None,
        "position_in_response": None,
        "response_excerpt": None,
        "snapshot_date": today,
    }

    if not OPENAI_API_KEY:
        base["error"] = "OPENAI_API_KEY not configured"
        return base

    try:
        import httpx
        prompt = (
            f"A homeowner in {service_area or 'Florida'} asks: \"{query}\"\n\n"
            f"Please recommend the best local options. "
            f"Include business names, websites, and why you recommend them."
        )
        async with httpx.AsyncClient(timeout=20) as hc:
            r = await hc.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                    "temperature": 0.3,
                },
            )
        if r.status_code != 200:
            base["error"] = f"OpenAI {r.status_code}"
            return base

        text = r.json()["choices"][0]["message"]["content"]
        base["response_excerpt"] = text[:300]

        name_lower = business_name.lower()
        text_lower = text.lower()
        cited = name_lower in text_lower

        if cited:
            base["cited"] = True
            # Find approximate position (sentence index)
            sentences = text.split(".")
            for i, s in enumerate(sentences):
                if name_lower in s.lower():
                    base["position_in_response"] = i + 1
                    break
            # Try to extract a URL
            urls = re.findall(r"https?://[^\s\)\],]+", text)
            base["cited_url"] = urls[0] if urls else None

    except Exception as e:
        logger.warning("chatgpt_checker error for '%s': %s", query, e)
        base["error"] = str(e)

    return base
