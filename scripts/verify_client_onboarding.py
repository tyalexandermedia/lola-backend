#!/usr/bin/env python3
"""Read-only verification for LOLA OS client onboarding config.

This script protects the Sandbar reference client and checks that client
scaffolds are complete enough to participate in LOLA OS onboarding without
moving code, touching routes, writing database rows, or using secrets.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CLIENTS_DIR = ROOT / "CLIENTS"
REQUIRED_CLIENTS = ("sandbar", "tampa-bay-power-clean")
REQUIRED_FIELDS = (
    "slug",
    "client_name",
    "website",
    "target_domain",
    "industry",
    "market",
    "primary_service_area",
    "services",
    "tracking",
)
TRACKING_FIELDS = ("google_queries", "ai_mode_prompts")
SECRET_KEY_PATTERNS = (
    "api_key",
    "apikey",
    "secret",
    "token",
    "password",
    "passwd",
    "admin_key",
    "private_key",
    "access_key",
    "auth_header",
    "bearer",
)
SECRET_VALUE_PATTERNS = (
    re.compile(r"sk-[A-Za-z0-9_-]{12,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{12,}"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{12,}"),
    re.compile(r"(?i)api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{12,}"),
    re.compile(r"(?i)secret\s*[:=]\s*[A-Za-z0-9._-]{12,}"),
)

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from case_studies.configs import CASE_STUDIES  # noqa: E402
from client_configs import (  # noqa: E402
    get_client_config,
    iter_client_configs,
    validate_client_configs,
)


def add_error(errors: list[str], slug: str, message: str) -> None:
    errors.append(f"{slug}: {message}")


def load_json(path: Path, slug: str, errors: list[str]) -> dict[str, Any] | None:
    if not path.exists():
        add_error(errors, slug, f"missing {path.relative_to(ROOT)}")
        return None
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        add_error(errors, slug, f"client.json is invalid JSON at line {exc.lineno}: {exc.msg}")
        return None
    if not isinstance(data, dict):
        add_error(errors, slug, "client.json must contain a JSON object")
        return None
    return data


def is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_non_empty_string_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(item, str) and item.strip() for item in value)
    )


def find_secret_like_content(value: Any, path: str = "") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            key_path = f"{path}.{key}" if path else str(key)
            normalized = str(key).lower().replace("-", "_")
            if any(pattern in normalized for pattern in SECRET_KEY_PATTERNS):
                findings.append(f"forbidden secret-like key `{key_path}`")
            findings.extend(find_secret_like_content(child, key_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            findings.extend(find_secret_like_content(child, f"{path}[{index}]"))
    elif isinstance(value, str):
        for pattern in SECRET_VALUE_PATTERNS:
            if pattern.search(value):
                findings.append(f"forbidden secret-like value at `{path}`")
                break
    return findings


def add_warning(warnings: list[str], slug: str, message: str) -> None:
    warnings.append(f"{slug}: {message}")


def validate_client_json(
    slug: str,
    data: dict[str, Any],
    errors: list[str],
    warnings: list[str],
) -> None:
    for field in REQUIRED_FIELDS:
        if field not in data:
            add_error(errors, slug, f"missing required field `{field}`")

    for field in ("slug", "client_name", "website", "target_domain", "industry"):
        if field in data and not is_non_empty_string(data[field]):
            add_error(errors, slug, f"field `{field}` must be a non-empty string")

    if data.get("slug") != slug:
        add_error(errors, slug, "field `slug` must match the client folder name")

    if not is_non_empty_string(data.get("market")) and not is_non_empty_string(
        data.get("primary_service_area")
    ):
        add_error(
            errors,
            slug,
            "at least one service-area field must be set: `market` or `primary_service_area`",
        )

    if "services" in data and not is_non_empty_string_list(data["services"]):
        add_error(errors, slug, "field `services` must be a non-empty list of strings")

    tracking = data.get("tracking")
    if not isinstance(tracking, dict):
        add_error(errors, slug, "field `tracking` must be an object")
    else:
        has_tracking_target = False
        for field in TRACKING_FIELDS:
            value = tracking.get(field)
            if is_non_empty_string_list(value):
                has_tracking_target = True
            elif value is not None:
                add_error(
                    errors,
                    slug,
                    f"field `tracking.{field}` must be a non-empty list of strings when present",
                )
        if not has_tracking_target:
            add_error(
                errors,
                slug,
                "at least one SEO/AI tracking target is required: `tracking.google_queries` or `tracking.ai_mode_prompts`",
            )

    lifecycle = data.get("lifecycle") or data.get("status")
    if not is_non_empty_string(lifecycle):
        add_warning(
            warnings,
            slug,
            "lifecycle/status marker is not set; add non-secret `lifecycle` or `status` before promoting this client",
        )

    for finding in find_secret_like_content(data):
        add_error(errors, slug, finding)


def validate_loader_isolation(slug: str, errors: list[str]) -> None:
    try:
        loaded = get_client_config(slug)
    except Exception as exc:
        add_error(errors, slug, f"failed to load through client_configs.py: {type(exc).__name__}: {exc}")
        return
    if loaded is None:
        add_error(errors, slug, "client_configs.py returned None for this client")


def validate_registry_paths(errors: list[str]) -> None:
    for error in validate_client_configs(required_slugs=REQUIRED_CLIENTS):
        add_error(errors, "registry", error)

    try:
        registry = iter_client_configs()
    except Exception as exc:
        errors.append(f"registry: iter_client_configs failed: {type(exc).__name__}: {exc}")
        return

    for slug in REQUIRED_CLIENTS:
        if slug not in registry:
            add_error(errors, slug, "missing from file-backed client registry")

    sandbar = CASE_STUDIES.get("sandbar")
    if sandbar is None:
        add_error(errors, "sandbar", "missing from case-study/public dashboard config path")
    else:
        if sandbar.slug != "sandbar":
            add_error(errors, "sandbar", "case-study config slug changed unexpectedly")
        if not sandbar.google_queries:
            add_error(errors, "sandbar", "case-study config has no Google tracking queries")
        if not sandbar.ai_mode_prompts:
            add_error(errors, "sandbar", "case-study config has no AI prompts")

    if "tampa-bay-power-clean" not in registry:
        add_error(
            errors,
            "tampa-bay-power-clean",
            "missing from client registry/config path",
        )


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    seen_slugs: list[str] = []

    for client_dir in sorted(CLIENTS_DIR.iterdir() if CLIENTS_DIR.exists() else []):
        if not client_dir.is_dir() or client_dir.name.startswith("_"):
            continue
        slug = client_dir.name
        seen_slugs.append(slug)
        data = load_json(client_dir / "client.json", slug, errors)
        if data is not None:
            validate_client_json(slug, data, errors, warnings)
        validate_loader_isolation(slug, errors)

    for slug in REQUIRED_CLIENTS:
        if slug not in seen_slugs:
            add_error(errors, slug, f"missing CLIENTS/{slug}/ folder")

    validate_registry_paths(errors)

    if errors:
        print("Client onboarding verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Client onboarding verification passed.")
    print(f"Verified clients: {', '.join(seen_slugs)}")
    print("Sandbar remains present in the case-study/public dashboard config path.")
    print("Tampa Bay Power Clean remains present in the client registry/config path.")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
