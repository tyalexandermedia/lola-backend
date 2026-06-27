"""File-backed LOLA OS client registry.

Client config belongs in CLIENTS/<slug>/client.json. This module provides a
small typed loader so existing backend surfaces can share the same canonical
client metadata without hard-coding every client in route code.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


CLIENTS_DIR = Path(__file__).resolve().parent / "CLIENTS"


class ClientConfigError(ValueError):
    """Raised when one client config is malformed or incomplete."""


@dataclass(frozen=True)
class ClientTrackingConfig:
    google_queries: list[str] = field(default_factory=list)
    ai_mode_prompts: list[str] = field(default_factory=list)
    verified_organic_wins: list[str] = field(default_factory=list)
    verified_map_pack_wins: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LolaClientConfig:
    slug: str
    client_name: str
    website: str
    target_domain: str
    industry: str
    market: str
    primary_service_area: str
    services: list[str] = field(default_factory=list)
    tracking: ClientTrackingConfig = field(default_factory=ClientTrackingConfig)


@dataclass(frozen=True)
class ClientConfigLoadResult:
    slug: str
    path: Path
    config: LolaClientConfig | None = None
    error: str | None = None


def _format_error(slug: str, field_name: str, message: str) -> ClientConfigError:
    return ClientConfigError(f"{slug}: {field_name}: {message}")


def _string_list(value: Any, field_name: str, slug: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise _format_error(slug, field_name, "must be a list of strings")
    return [item.strip() for item in value if item.strip()]


def _required_string_list(value: Any, field_name: str, slug: str) -> list[str]:
    items = _string_list(value, field_name, slug)
    if not items:
        raise _format_error(slug, field_name, "must contain at least one value")
    return items


def _required_string(data: dict[str, Any], field_name: str, slug: str) -> str:
    value = data.get(field_name)
    if not isinstance(value, str) or not value.strip():
        raise _format_error(slug, field_name, "missing required non-empty string")
    return value.strip()


def load_client_config(slug: str) -> LolaClientConfig | None:
    path = CLIENTS_DIR / slug / "client.json"
    if not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise ClientConfigError(
            f"{slug}: client.json: invalid JSON at line {exc.lineno}: {exc.msg}"
        ) from exc
    if not isinstance(data, dict):
        raise ClientConfigError(f"{slug}: client.json: must contain a JSON object")

    declared_slug = _required_string(data, "slug", slug)
    if declared_slug != slug:
        raise _format_error(slug, "slug", "must match the client folder name")

    tracking_data = data.get("tracking") or {}
    if not isinstance(tracking_data, dict):
        raise _format_error(slug, "tracking", "must be an object")

    google_queries = _string_list(
        tracking_data.get("google_queries"), "tracking.google_queries", slug
    )
    ai_mode_prompts = _string_list(
        tracking_data.get("ai_mode_prompts"), "tracking.ai_mode_prompts", slug
    )
    if not google_queries and not ai_mode_prompts:
        raise _format_error(
            slug,
            "tracking",
            "must include at least one google query or AI mode prompt",
        )

    return LolaClientConfig(
        slug=slug,
        client_name=_required_string(data, "client_name", slug),
        website=_required_string(data, "website", slug),
        target_domain=_required_string(data, "target_domain", slug),
        industry=_required_string(data, "industry", slug),
        market=_required_string(data, "market", slug),
        primary_service_area=_required_string(data, "primary_service_area", slug),
        services=_required_string_list(data.get("services"), "services", slug),
        tracking=ClientTrackingConfig(
            google_queries=google_queries,
            ai_mode_prompts=ai_mode_prompts,
            verified_organic_wins=_string_list(
                tracking_data.get("verified_organic_wins"),
                "tracking.verified_organic_wins",
                slug,
            ),
            verified_map_pack_wins=_string_list(
                tracking_data.get("verified_map_pack_wins"),
                "tracking.verified_map_pack_wins",
                slug,
            ),
        ),
    )


def load_client_config_result(
    slug: str, *, require_file: bool = False
) -> ClientConfigLoadResult:
    path = CLIENTS_DIR / slug / "client.json"
    if require_file and not path.exists():
        return ClientConfigLoadResult(
            slug=slug,
            path=path,
            error=f"{slug}: missing CLIENTS/{slug}/client.json",
        )
    try:
        return ClientConfigLoadResult(
            slug=slug, path=path, config=load_client_config(slug)
        )
    except ClientConfigError as exc:
        return ClientConfigLoadResult(slug=slug, path=path, error=str(exc))


def iter_client_configs(*, strict: bool = False) -> dict[str, LolaClientConfig]:
    clients: dict[str, LolaClientConfig] = {}
    if not CLIENTS_DIR.exists():
        return clients

    errors: list[str] = []
    for child in sorted(CLIENTS_DIR.iterdir()):
        if not child.is_dir() or child.name.startswith("_"):
            continue
        result = load_client_config_result(child.name, require_file=True)
        if result.config:
            clients[result.config.slug] = result.config
        elif result.error:
            errors.append(result.error)
    if strict and errors:
        raise ClientConfigError("; ".join(errors))
    return clients


def validate_client_configs(required_slugs: tuple[str, ...] = ()) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    if not CLIENTS_DIR.exists():
        return [f"registry: missing CLIENTS directory at {CLIENTS_DIR}"]

    for child in sorted(CLIENTS_DIR.iterdir()):
        if not child.is_dir() or child.name.startswith("_"):
            continue
        seen.add(child.name)
        result = load_client_config_result(child.name, require_file=True)
        if result.error:
            errors.append(result.error)

    for slug in required_slugs:
        if slug not in seen:
            errors.append(f"{slug}: missing CLIENTS/{slug}/ folder")
        elif not (CLIENTS_DIR / slug / "client.json").exists():
            errors.append(f"{slug}: missing CLIENTS/{slug}/client.json")
    return errors


def get_client_config(slug: str) -> LolaClientConfig | None:
    return load_client_config(slug)
