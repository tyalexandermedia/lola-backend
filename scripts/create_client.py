#!/usr/bin/env python3
"""Create a safe LOLA OS client scaffold.

This generator creates non-secret client config and docs only. It never edits
existing client folders, database rows, routes, or production data.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLIENTS_DIR = ROOT / "CLIENTS"
DOCS_DIR = ROOT / "docs" / "clients"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    slug = re.sub(r"-+", "-", slug)
    if not slug:
        raise ValueError("slug cannot be empty")
    return slug


def domain_from_url(url: str) -> str:
    value = url.strip()
    value = re.sub(r"^https?://", "", value)
    value = value.split("/", 1)[0]
    if value.startswith("www."):
        value = value[4:]
    return value.lower()


def write_new(path: Path, content: str) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_config(args: argparse.Namespace) -> dict:
    services = [item.strip() for item in args.services.split(",") if item.strip()]
    return {
        "slug": args.slug,
        "client_name": args.name,
        "website": args.website,
        "target_domain": domain_from_url(args.website),
        "industry": args.industry,
        "market": args.market,
        "primary_service_area": args.primary_service_area,
        "services": services,
        "tracking": {
            "google_queries": [],
            "ai_mode_prompts": [],
            "verified_organic_wins": [],
            "verified_map_pack_wins": [],
        },
    }


def client_readme(args: argparse.Namespace) -> str:
    return f"""# {args.name}

## Purpose

This folder holds non-secret LOLA OS configuration and onboarding notes for
`{args.slug}`.

## What Belongs Here

- `client.json` with client identity, market, services, and tracking prompts.
- Client-specific onboarding notes and verification checklists.
- Links to landing pages, dashboards, and integration setup docs.

## What Should Not Belong Here

- API keys, access tokens, admin keys, passwords, or session credentials.
- Customer PII, call transcripts, lead records, estimates, jobs, or revenue data.
- Shared platform code that should live in `CORE/` or product modules.

## How It Supports LOLA OS

This folder lets LOLA OS clone the Sandbar operating pattern for {args.name}
while keeping client metadata separated by slug.
"""


def client_doc(args: argparse.Namespace) -> str:
    return f"""# {args.name} Client Setup

## Overview

- Client name: {args.name}
- Slug: `{args.slug}`
- Website: {args.website}
- Industry: {args.industry}
- Market: {args.market}
- Primary service area: {args.primary_service_area}

## Routes To Verify

- Public client dashboard: `/r/client/{args.slug}`
- Revenue admin UI: `/admin/revenue/{args.slug}`
- Revenue agent run endpoint: `POST /admin/revenue/{args.slug}/run`
- Case-study snapshot endpoint: `POST /admin/case-study/{args.slug}/run`

## Config Files

- `CLIENTS/{args.slug}/client.json`
- `CLIENTS/{args.slug}/README.md`

## Data Sources Needed

- Reporting client row.
- Call tracking webhook/source.
- Lead capture events.
- Google Search Console property, if available.
- GA4 property ID, if available.
- Google Business Profile integration, if available.
- Verified testimonials, proof assets, and before/after photos.

## Verification

Run:

```bash
.venv/bin/python -m py_compile client_configs.py case_studies/configs.py
.venv/bin/python scripts/verify_client_registry.py
git diff --check
```

No performance metrics should be added until they are verified from real data.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="Client display name")
    parser.add_argument("--website", required=True, help="Client website URL")
    parser.add_argument("--industry", required=True, help="Client industry")
    parser.add_argument("--market", required=True, help="Client market")
    parser.add_argument(
        "--primary-service-area", required=True, help="Primary service area"
    )
    parser.add_argument(
        "--services",
        default="",
        help="Comma-separated service list for client.json",
    )
    parser.add_argument("--slug", help="Optional slug; defaults from name")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.slug = args.slug or slugify(args.name)
    args.slug = slugify(args.slug)

    client_dir = CLIENTS_DIR / args.slug
    if client_dir.exists():
        raise FileExistsError(f"Client folder already exists: {client_dir}")

    config = build_config(args)
    write_new(client_dir / "README.md", client_readme(args))
    write_new(
        client_dir / "client.json",
        json.dumps(config, indent=2) + "\n",
    )
    write_new(DOCS_DIR / f"{args.slug}.md", client_doc(args))

    print(f"Created client scaffold for {args.name}: {args.slug}")
    print(f"- CLIENTS/{args.slug}/README.md")
    print(f"- CLIENTS/{args.slug}/client.json")
    print(f"- docs/clients/{args.slug}.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
