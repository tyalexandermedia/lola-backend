#!/usr/bin/env python3
"""Smoke-check the file-backed LOLA OS client registry."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from case_studies.configs import CASE_STUDIES
from client_configs import iter_client_configs


REQUIRED_SLUGS = ("sandbar", "tampa-bay-power-clean")


def main() -> int:
    clients = iter_client_configs()
    for slug in REQUIRED_SLUGS:
        if slug not in clients:
            raise SystemExit(f"Missing CLIENTS config for {slug}")
        if slug not in CASE_STUDIES:
            raise SystemExit(f"Missing CASE_STUDIES config for {slug}")

        client = clients[slug]
        case_study = CASE_STUDIES[slug]
        if case_study.client_name != client.client_name:
            raise SystemExit(f"{slug}: client_name mismatch")
        if case_study.target_url != client.website:
            raise SystemExit(f"{slug}: target_url mismatch")
        if case_study.target_domain != client.target_domain:
            raise SystemExit(f"{slug}: target_domain mismatch")
        if not case_study.google_queries:
            raise SystemExit(f"{slug}: no google queries configured")
        if not case_study.ai_mode_prompts:
            raise SystemExit(f"{slug}: no AI prompts configured")

    print("Client registry verified: sandbar and tampa-bay-power-clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
