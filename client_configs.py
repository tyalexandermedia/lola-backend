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


def _string_list(value: Any, field_name: str, slug: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"{slug}: {field_name} must be a list of strings")
    return [item.strip() for item in value if item.strip()]


def _required_string(data: dict[str, Any], field_name: str, slug: str) -> str:
    value = data.get(field_name)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{slug}: missing required string field {field_name}")
    return value.strip()


def load_client_config(slug: str) -> LolaClientConfig | None:
    path = CLIENTS_DIR / slug / "client.json"
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    declared_slug = _required_string(data, "slug", slug)
    if declared_slug != slug:
        raise ValueError(f"{slug}: client.json slug must match folder name")

    tracking_data = data.get("tracking") or {}
    if not isinstance(tracking_data, dict):
        raise ValueError(f"{slug}: tracking must be an object")

    return LolaClientConfig(
        slug=slug,
        client_name=_required_string(data, "client_name", slug),
        website=_required_string(data, "website", slug),
        target_domain=_required_string(data, "target_domain", slug),
        industry=_required_string(data, "industry", slug),
        market=_required_string(data, "market", slug),
        primary_service_area=_required_string(data, "primary_service_area", slug),
        services=_string_list(data.get("services"), "services", slug),
        tracking=ClientTrackingConfig(
            google_queries=_string_list(
                tracking_data.get("google_queries"), "tracking.google_queries", slug
            ),
            ai_mode_prompts=_string_list(
                tracking_data.get("ai_mode_prompts"), "tracking.ai_mode_prompts", slug
            ),
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


def iter_client_configs() -> dict[str, LolaClientConfig]:
    clients: dict[str, LolaClientConfig] = {}
    if not CLIENTS_DIR.exists():
        return clients

    for child in sorted(CLIENTS_DIR.iterdir()):
        if not child.is_dir() or child.name.startswith("_"):
            continue
        config = load_client_config(child.name)
        if config:
            clients[config.slug] = config
    return clients


def get_client_config(slug: str) -> LolaClientConfig | None:
    return load_client_config(slug)
