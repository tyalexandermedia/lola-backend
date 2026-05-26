"""
Page-level SEO checks: H1, title, meta description, canonical, JSON-LD schema.

Fills the gap in Lola's existing audit pipeline (PageSpeed + Places + Safe
Browsing don't cover on-page SEO basics). Each check returns a structured
finding with status (pass | warn | fail) + detail; `to_recommendations()`
maps fail/warn into Lola's existing Recommendation shape so they flow into
the same UI block as the other recs.

----------------------------------------------------------------------
Adapted from JeffLi1993/seo-audit-skill (MIT License, Copyright (c) 2026 Jeff).
Source: https://github.com/JeffLi1993/seo-audit-skill (commit @ may 2026)

Changes from upstream:
- Sync `requests.get` -> async `httpx.AsyncClient` (Lola runs async; sync
  HTTP inside async would block the event loop).
- CLI argparse + `sys.exit` removed; functions made importable.
- `_`-prefixed checks renamed to public + grouped under `run_page_seo_checks`
  so the audit handler gets one async call.
- Added `to_recommendations()` that maps findings to Lola's
  {title, detail, impact, effort, category} Recommendation shape.
- SSRF protection preserved verbatim.
----------------------------------------------------------------------
"""

from __future__ import annotations

import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from typing import Optional
from urllib.parse import urlparse

import httpx

DEFAULT_TIMEOUT = 10.0
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 LolaSEO/1.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
}

STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "not", "no",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
    "is", "are", "was", "were", "be",
    "it", "its", "this", "that",
})

REQUIRED_FIELDS: dict[str, list[str]] = {
    "WebSite": ["name", "url"],
    "Organization": ["name", "url", "logo"],
    "Article": ["headline", "datePublished", "author", "image"],
    "BlogPosting": ["headline", "datePublished", "author", "image"],
    "NewsArticle": ["headline", "datePublished", "author", "image"],
    "Product": ["name", "image", "offers"],
    "FAQPage": ["mainEntity"],
    "HowTo": ["name", "step"],
    "LocalBusiness": ["name", "address", "telephone"],
}

PAGE_TYPE_EXPECTED: dict[str, list[str]] = {
    "homepage": ["WebSite", "Organization", "LocalBusiness"],
    "article": ["Article", "BlogPosting", "NewsArticle"],
    "product": ["Product"],
    "faq": ["FAQPage"],
    "howto": ["HowTo"],
    "local_business": ["LocalBusiness"],
}


# ── HTTP fetch (async) ─────────────────────────────────────────────────────────


async def fetch_html(url: str, timeout: float = DEFAULT_TIMEOUT) -> tuple[Optional[int], Optional[str], str, Optional[str]]:
    """
    Async page fetch with SSRF protection. Returns
    (status_code, html, final_url, error). Mirrors the upstream
    sync `_fetch` semantics but uses httpx so the event loop isn't blocked.
    """
    parsed = urlparse(url)
    try:
        hostname = parsed.hostname or ""
        resolved_ip = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(resolved_ip)
        if ip.is_private or ip.is_loopback or ip.is_reserved:
            return None, None, url, f"Blocked: resolves to private IP ({resolved_ip})"
    except (socket.gaierror, ValueError):
        pass

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            max_redirects=5,
            headers=DEFAULT_HEADERS,
        ) as client:
            resp = await client.get(url)
            return resp.status_code, resp.text, str(resp.url), None
    except httpx.TimeoutException:
        return None, None, url, f"Timed out after {timeout}s"
    except httpx.TooManyRedirects:
        return None, None, url, "Too many redirects (max 5)"
    except httpx.HTTPError as e:
        return None, None, url, f"httpx error: {e}"


# ── HTML parsers (stdlib) ──────────────────────────────────────────────────────


class SEOParser(HTMLParser):
    """Single-pass extractor for title, h1, meta description, canonical."""

    def __init__(self) -> None:
        super().__init__()
        self.title: Optional[str] = None
        self._in_title = False
        self._title_buf = ""
        self.h1_values: list[str] = []
        self._in_h1 = False
        self._h1_depth = 0
        self._h1_buf = ""
        self.meta_description: Optional[str] = None
        self.canonical: Optional[str] = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        if tag == "title" and self.title is None:
            self._in_title = True
            self._title_buf = ""
        elif tag == "h1":
            self._in_h1 = True
            self._h1_depth += 1
            self._h1_buf = ""
        elif tag == "meta":
            name = attrs_dict.get("name", "").lower()
            if name == "description" and self.meta_description is None:
                self.meta_description = attrs_dict.get("content", "")
        elif tag == "link":
            rel = attrs_dict.get("rel", "").lower()
            if "canonical" in rel and self.canonical is None:
                self.canonical = attrs_dict.get("href", "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._in_title:
            self._in_title = False
            self.title = self._title_buf.strip() or None
        elif tag == "h1" and self._in_h1:
            self._h1_depth -= 1
            if self._h1_depth <= 0:
                self._in_h1 = False
                self._h1_depth = 0
                text = self._h1_buf.strip()
                if text:
                    self.h1_values.append(text)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_buf += data
        if self._in_h1:
            self._h1_buf += data


class JsonLdExtractor(HTMLParser):
    """Single-pass extractor for <script type='application/ld+json'> blocks."""

    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[str] = []
        self._in_jsonld = False
        self._buf = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag == "script":
            attrs_dict = {k.lower(): (v or "") for k, v in attrs}
            if attrs_dict.get("type", "").lower() == "application/ld+json":
                self._in_jsonld = True
                self._buf = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_jsonld:
            self._in_jsonld = False
            content = self._buf.strip()
            if content:
                self.blocks.append(content)

    def handle_data(self, data: str) -> None:
        if self._in_jsonld:
            self._buf += data


# ── Individual checks ──────────────────────────────────────────────────────────


def check_h1(h1_values: list[str]) -> dict:
    count = len(h1_values)
    if count == 0:
        return {
            "status": "fail",
            "count": 0,
            "values": [],
            "detail": "No H1 tag found. Every page should have exactly one H1.",
        }
    if count > 1:
        return {
            "status": "fail",
            "count": count,
            "values": h1_values,
            "detail": f"{count} H1 tags found. Multiple H1s dilute heading hierarchy. Keep exactly one.",
        }
    h1_text = h1_values[0]
    if not h1_text.strip():
        return {
            "status": "fail",
            "count": 1,
            "values": h1_values,
            "detail": "H1 tag present but content is empty.",
        }
    length = len(h1_text)
    if length < 5:
        return {
            "status": "warn",
            "count": 1,
            "values": h1_values,
            "detail": f'H1 is very short ({length} chars): "{h1_text}". Likely brand-name only.',
        }
    if length > 70:
        return {
            "status": "warn",
            "count": 1,
            "values": h1_values,
            "detail": f"H1 is {length} characters — consider trimming to under 70.",
        }
    return {
        "status": "pass",
        "count": 1,
        "values": h1_values,
        "detail": f'Single H1 found: "{h1_text}".',
    }


def check_title(title: Optional[str]) -> dict:
    if not title:
        return {
            "status": "fail",
            "value": None,
            "length": 0,
            "detail": "No <title> tag found. Title is a critical on-page SEO element.",
        }
    length = len(title)
    if length < 10:
        return {
            "status": "fail",
            "value": title,
            "length": length,
            "detail": f"Title is only {length} characters — likely a placeholder.",
        }
    if length > 60:
        return {
            "status": "warn",
            "value": title,
            "length": length,
            "detail": f"Title is {length} chars — may be truncated in search results (recommended 50-60).",
        }
    if length < 50:
        return {
            "status": "warn",
            "value": title,
            "length": length,
            "detail": f"Title is {length} chars — slightly short (recommended 50-60).",
        }
    return {
        "status": "pass",
        "value": title,
        "length": length,
        "detail": f"Title length {length} chars — within recommended range.",
    }


def check_meta_description(meta_desc: Optional[str]) -> dict:
    if meta_desc is None:
        return {
            "status": "fail",
            "value": None,
            "length": 0,
            "detail": "No meta description tag found. Missing meta descriptions reduce search snippet quality.",
        }
    if not meta_desc.strip():
        return {
            "status": "warn",
            "value": "",
            "length": 0,
            "detail": "Meta description tag present but content is empty.",
        }
    length = len(meta_desc)
    if length < 70:
        return {
            "status": "warn",
            "value": meta_desc,
            "length": length,
            "detail": f"Meta description is {length} chars — too short (recommended 120-160).",
        }
    if length > 160:
        return {
            "status": "warn",
            "value": meta_desc,
            "length": length,
            "detail": f"Meta description is {length} chars — may be truncated in search results.",
        }
    return {
        "status": "pass",
        "value": meta_desc,
        "length": length,
        "detail": f"Meta description {length} chars — within recommended range.",
    }


def check_canonical(canonical: Optional[str], final_url: str) -> dict:
    if not canonical:
        return {
            "status": "warn",
            "value": None,
            "matches_final_url": False,
            "detail": "No canonical tag found. Without one, duplicate-content issues can arise.",
        }
    if canonical.rstrip("/") == final_url.rstrip("/"):
        return {
            "status": "pass",
            "value": canonical,
            "matches_final_url": True,
            "detail": "Self-referencing canonical present.",
        }
    return {
        "status": "warn",
        "value": canonical,
        "matches_final_url": False,
        "detail": f"Canonical points to a different URL ({canonical}) than the final page URL ({final_url}). Verify it's intentional.",
    }


def _flatten_schemas(raw_blocks: list[str]) -> list[dict]:
    schemas: list[dict] = []
    for text in raw_blocks:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            schemas.extend(item for item in parsed if isinstance(item, dict))
        elif isinstance(parsed, dict):
            graph = parsed.get("@graph")
            if isinstance(graph, list):
                schemas.extend(item for item in graph if isinstance(item, dict))
            else:
                schemas.append(parsed)
    return schemas


def _get_types(schema: dict) -> list[str]:
    raw = schema.get("@type")
    if isinstance(raw, str):
        return [raw]
    if isinstance(raw, list):
        return [t for t in raw if isinstance(t, str)]
    return []


def _field_present(schema: dict, field: str) -> bool:
    value = schema.get(field)
    if value is None:
        return False
    if isinstance(value, str) and not value.strip():
        return False
    if isinstance(value, list) and len(value) == 0:
        return False
    return True


def _infer_page_type(url: str) -> str:
    path = urlparse(url).path.lower().rstrip("/")
    if path in ("", "/"):
        return "homepage"
    if any(s in path for s in ("/blog", "/article", "/post", "/news", "/story")):
        return "article"
    if any(s in path for s in ("/product", "/item", "/shop/", "/store/")):
        return "product"
    if "/faq" in path or "/questions" in path:
        return "faq"
    if any(s in path for s in ("/how-to", "/howto", "/guide")):
        return "howto"
    return "unknown"


def check_schema(html: str, url: str = "") -> dict:
    extractor = JsonLdExtractor()
    try:
        extractor.feed(html)
    except Exception:
        return {
            "status": "error",
            "schemas": [],
            "found_types": [],
            "detail": "Failed to parse HTML for JSON-LD extraction.",
        }
    all_schemas = _flatten_schemas(extractor.blocks)
    inferred = _infer_page_type(url)
    expected = PAGE_TYPE_EXPECTED.get(inferred, [])

    if not all_schemas:
        if not expected:
            return {
                "status": "info",
                "schemas": [],
                "found_types": [],
                "inferred_page_type": inferred,
                "expected_types": [],
                "detail": "No JSON-LD found. Page type unclear — structured data may not be required.",
            }
        return {
            "status": "fail",
            "schemas": [],
            "found_types": [],
            "inferred_page_type": inferred,
            "expected_types": expected,
            "detail": f"No JSON-LD found. Inferred page type: {inferred} — expected schema types: {', '.join(expected)}.",
        }

    validated: list[dict] = []
    for s in all_schemas:
        types = _get_types(s)
        if not types:
            validated.append({"types": [], "status": "warn", "missing": [], "detail": "JSON-LD block found but missing @type."})
            continue
        primary = types[0]
        required = REQUIRED_FIELDS.get(primary, [])
        missing = [f for f in required if not _field_present(s, f)]
        if missing:
            validated.append({"types": types, "status": "fail", "missing": missing, "detail": f"{primary}: missing required fields: {', '.join(missing)}."})
        elif primary in REQUIRED_FIELDS:
            validated.append({"types": types, "status": "pass", "missing": [], "detail": f"{primary}: all required fields present."})
        else:
            validated.append({"types": types, "status": "info", "missing": [], "detail": f"{primary}: no required-field ruleset defined."})

    statuses = [v["status"] for v in validated]
    overall = "fail" if "fail" in statuses else ("warn" if "warn" in statuses else "pass")
    found_types = list({t for v in validated for t in v["types"][:1] if t})
    has_expected = bool(expected) and any(t in found_types for t in expected)

    detail_parts = [f"Found {len(all_schemas)} JSON-LD block(s): {', '.join(found_types) or '(no types)'}."]
    if expected and not has_expected:
        detail_parts.append(f"Expected one of: {', '.join(expected)}.")
    for v in validated:
        if v["status"] in ("fail", "warn"):
            detail_parts.append(v["detail"])

    return {
        "status": overall,
        "schemas": validated,
        "found_types": found_types,
        "inferred_page_type": inferred,
        "expected_types": expected,
        "has_expected_type": has_expected,
        "detail": " ".join(detail_parts),
    }


# ── Public entry point ─────────────────────────────────────────────────────────


async def run_page_seo_checks(url: str, timeout: float = DEFAULT_TIMEOUT) -> dict:
    """
    Single async call: fetch URL, run H1/title/meta/canonical/schema checks.
    Returns a structured dict the audit handler can serialize directly and
    feed to `to_recommendations()`.
    """
    if not url:
        return {"ok": False, "error": "no url provided"}
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    status_code, html, final_url, error = await fetch_html(url, timeout=timeout)
    result: dict = {
        "ok": False,
        "url": url,
        "final_url": final_url,
        "http_status": status_code,
    }
    if error:
        result["error"] = error
        return result
    if status_code != 200 or not html:
        result["error"] = f"Page returned HTTP {status_code}" if status_code else "Empty response"
        return result

    parser = SEOParser()
    try:
        parser.feed(html)
    except Exception as e:
        result["error"] = f"HTML parse failed: {e}"
        return result

    result.update({
        "ok": True,
        "h1": check_h1(parser.h1_values),
        "title": check_title(parser.title),
        "meta_description": check_meta_description(parser.meta_description),
        "canonical": check_canonical(parser.canonical, final_url),
        "schema": check_schema(html, url=final_url),
    })
    return result


# ── Recommendation mapping (Lola shape) ────────────────────────────────────────


_IMPACT_BY_STATUS = {"fail": "high", "warn": "medium"}


def to_recommendations(result: dict) -> list[dict]:
    """
    Map fail/warn findings to Lola's Recommendation shape:
        {title, detail, impact, effort, category}
    Skips: passes, info, and the fetch-failure result.
    """
    if not result.get("ok"):
        return []
    recs: list[dict] = []

    checks: list[tuple[str, str, str, str]] = [
        # (key, category, low-effort marker, friendly noun)
        ("h1", "on_page", "low", "H1"),
        ("title", "on_page", "low", "Title tag"),
        ("meta_description", "on_page", "low", "Meta description"),
        ("canonical", "on_page", "low", "Canonical tag"),
        ("schema", "on_page", "medium", "JSON-LD structured data"),
    ]

    for key, category, effort, noun in checks:
        finding = result.get(key) or {}
        status = finding.get("status")
        if status not in ("fail", "warn"):
            continue
        impact = _IMPACT_BY_STATUS[status]
        detail = finding.get("detail") or f"{noun} check {status}."
        recs.append({
            "title": f"Fix: {noun}" if status == "fail" else f"Tighten: {noun}",
            "detail": detail,
            "impact": impact,
            "effort": effort,
            "category": category,
        })
    return recs


__all__ = [
    "run_page_seo_checks",
    "to_recommendations",
    "fetch_html",
    "check_h1",
    "check_title",
    "check_meta_description",
    "check_canonical",
    "check_schema",
]
