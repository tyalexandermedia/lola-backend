"""Dependency-free helpers for the AI Visibility Agent (no DB / no network)."""

from __future__ import annotations

import re


def extract_domain(url: str) -> str:
    """Return the bare domain (no scheme, no www, no path) for citation matching."""
    if not url:
        return ""
    m = re.search(r"(?:https?://)?(?:www\.)?([^/]+)", url)
    return m.group(1) if m else ""
