#!/usr/bin/env python3
"""Print a read-only LOLA OS blueprint scorecard from existing config.

The scorecard does not fabricate revenue, experiment, ranking, or proof values.
Unknown values are reported as null or "unknown" until evidence exists.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BLUEPRINTS_DIR = ROOT / "BLUEPRINTS"
CLIENTS_DIR = ROOT / "CLIENTS"


CLAIM_BASE_SCORES = {
    "assumption": 10,
    "hypothesis": 25,
    "tested": 55,
    "proven": 85,
    "deprecated": 0,
}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def client_configs() -> list[dict[str, Any]]:
    clients: list[dict[str, Any]] = []
    for path in sorted(CLIENTS_DIR.glob("*/client.json")):
        clients.append(load_json(path))
    return clients


def evidence_score(blueprint: dict[str, Any], clients_using: int) -> int:
    score = CLAIM_BASE_SCORES.get(str(blueprint.get("claim_status")), 0)
    score += min(clients_using * 8, 24)
    if blueprint.get("primary_services"):
        score += 5
    if blueprint.get("conversion_structure"):
        score += 5
    if blueprint.get("required_tracking"):
        score += 5
    return min(score, 100)


def scorecard(blueprint_id: str) -> dict[str, Any]:
    blueprint = load_json(BLUEPRINTS_DIR / blueprint_id / "blueprint.json")
    clients = [client for client in client_configs() if client.get("blueprint_id") == blueprint_id]
    proof_clients = blueprint.get("proof_clients") or []
    open_assumptions = blueprint.get("open_assumptions") or []
    score = evidence_score(blueprint, len(clients))

    return {
        "blueprint_id": blueprint_id,
        "name": blueprint.get("name"),
        "version": blueprint.get("version"),
        "claim_status": blueprint.get("claim_status"),
        "confidence_level": (
            "high"
            if score >= 80
            else "medium"
            if score >= 55
            else "low"
        ),
        "evidence_score": score,
        "clients_using": len(clients),
        "client_slugs": [client.get("slug") for client in clients],
        "proof_clients_declared": len(proof_clients),
        "revenue_influenced": None,
        "experiments_run": None,
        "proven_systems": None,
        "open_assumptions": len(open_assumptions),
        "open_assumption_labels": open_assumptions,
        "next_evidence_needed": [
            "Connect revenue-influenced rollups to blueprint evidence.",
            "Count promoted experiments by blueprint.",
            "Track proven systems as evidence-backed blueprint components.",
            "Validate pressure washing blueprint across at least one more business."
        ],
    }


def main(argv: list[str]) -> int:
    blueprint_id = argv[1] if len(argv) > 1 else "pressure-washing"
    path = BLUEPRINTS_DIR / blueprint_id / "blueprint.json"
    if not path.exists():
        print(f"Unknown blueprint: {blueprint_id}", file=sys.stderr)
        return 1
    print(json.dumps(scorecard(blueprint_id), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
