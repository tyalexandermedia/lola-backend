#!/usr/bin/env python3
"""Read-only verification for LOLA OS patterns, blueprints, and client links."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PATTERNS_DIR = ROOT / "PATTERNS"
BLUEPRINTS_DIR = ROOT / "BLUEPRINTS"
CLIENTS_DIR = ROOT / "CLIENTS"

REQUIRED_PATTERNS = ("local-service",)
REQUIRED_BLUEPRINTS = ("pressure-washing",)
VALID_CLAIM_STATUSES = {"assumption", "hypothesis", "tested", "proven", "deprecated"}


def load_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    if not path.exists():
        errors.append(f"{label}: missing {path.relative_to(ROOT)}")
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{label}: invalid JSON at line {exc.lineno}: {exc.msg}")
        return None
    if not isinstance(data, dict):
        errors.append(f"{label}: JSON root must be an object")
        return None
    return data


def is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_non_empty_string_list(value: Any) -> bool:
    return isinstance(value, list) and bool(value) and all(is_non_empty_string(item) for item in value)


def validate_common(
    label: str,
    data: dict[str, Any],
    required_fields: tuple[str, ...],
    errors: list[str],
) -> None:
    for field in required_fields:
        if field not in data:
            errors.append(f"{label}: missing required field `{field}`")
    for field in ("id", "name", "version", "status", "claim_status", "summary"):
        if field in data and not is_non_empty_string(data[field]):
            errors.append(f"{label}: field `{field}` must be a non-empty string")
    claim_status = data.get("claim_status")
    if claim_status is not None and claim_status not in VALID_CLAIM_STATUSES:
        errors.append(
            f"{label}: field `claim_status` must be one of {', '.join(sorted(VALID_CLAIM_STATUSES))}"
        )


def main() -> int:
    errors: list[str] = []

    patterns: dict[str, dict[str, Any]] = {}
    for pattern_id in REQUIRED_PATTERNS:
        data = load_json(PATTERNS_DIR / pattern_id / "pattern.json", f"pattern:{pattern_id}", errors)
        if data is None:
            continue
        validate_common(
            f"pattern:{pattern_id}",
            data,
            ("id", "name", "version", "status", "claim_status", "summary", "business_model"),
            errors,
        )
        if data.get("id") != pattern_id:
            errors.append(f"pattern:{pattern_id}: `id` must match folder name")
        if not is_non_empty_string_list(data.get("key_metrics")):
            errors.append(f"pattern:{pattern_id}: `key_metrics` must be a non-empty list")
        patterns[pattern_id] = data

    blueprints: dict[str, dict[str, Any]] = {}
    for blueprint_id in REQUIRED_BLUEPRINTS:
        data = load_json(
            BLUEPRINTS_DIR / blueprint_id / "blueprint.json",
            f"blueprint:{blueprint_id}",
            errors,
        )
        if data is None:
            continue
        validate_common(
            f"blueprint:{blueprint_id}",
            data,
            (
                "id",
                "name",
                "version",
                "status",
                "claim_status",
                "summary",
                "inherits_from_pattern",
                "proof_clients",
                "primary_services",
                "required_tracking",
            ),
            errors,
        )
        if data.get("id") != blueprint_id:
            errors.append(f"blueprint:{blueprint_id}: `id` must match folder name")
        parent = data.get("inherits_from_pattern")
        if parent not in patterns:
            errors.append(f"blueprint:{blueprint_id}: unknown inherited pattern `{parent}`")
        if not is_non_empty_string_list(data.get("proof_clients")):
            errors.append(f"blueprint:{blueprint_id}: `proof_clients` must be a non-empty list")
        if not is_non_empty_string_list(data.get("primary_services")):
            errors.append(f"blueprint:{blueprint_id}: `primary_services` must be a non-empty list")
        if data.get("claim_status") == "proven" and len(data.get("proof_clients", [])) < 5:
            errors.append(
                f"blueprint:{blueprint_id}: cannot be `proven` with fewer than five proof clients"
            )
        blueprints[blueprint_id] = data

    for client_dir in sorted(CLIENTS_DIR.iterdir() if CLIENTS_DIR.exists() else []):
        if not client_dir.is_dir() or client_dir.name.startswith("_"):
            continue
        client = load_json(client_dir / "client.json", f"client:{client_dir.name}", errors)
        if client is None:
            continue
        pattern_id = client.get("pattern_id")
        blueprint_id = client.get("blueprint_id")
        if pattern_id is not None and pattern_id not in patterns:
            errors.append(f"client:{client_dir.name}: unknown `pattern_id` `{pattern_id}`")
        if blueprint_id is not None and blueprint_id not in blueprints:
            errors.append(f"client:{client_dir.name}: unknown `blueprint_id` `{blueprint_id}`")
        if blueprint_id is not None:
            blueprint = blueprints.get(blueprint_id, {})
            expected_pattern = blueprint.get("inherits_from_pattern")
            if pattern_id != expected_pattern:
                errors.append(
                    f"client:{client_dir.name}: `pattern_id` must match blueprint parent `{expected_pattern}`"
                )

    if errors:
        print("Blueprint verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Blueprint verification passed.")
    print(f"Verified patterns: {', '.join(sorted(patterns))}")
    print(f"Verified blueprints: {', '.join(sorted(blueprints))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
