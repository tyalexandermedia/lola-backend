#!/usr/bin/env python3
"""Create a safe LOLA OS client onboarding scaffold.

The generator creates non-secret client assets only:

New Client -> slug -> client.json -> landing page -> dashboard route notes ->
SEO targets -> reporting setup notes -> agent activation checklist.

It never edits existing client folders, database rows, production data, or
secrets. Existing files are never overwritten.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Iterable


DEFAULT_ROOT = Path(__file__).resolve().parents[1]


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


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def unique(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        cleaned = item.strip()
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def write_new(path: Path, content: str) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_google_queries(
    services: list[str], areas: list[str], extras: list[str]
) -> list[str]:
    primary_areas = areas[:3] if areas else []
    generated = [
        f"{service.lower()} {area.lower()}"
        for service in services[:5]
        for area in primary_areas
    ]
    return unique([*extras, *generated])


def build_ai_prompts(
    name: str, services: list[str], areas: list[str], extras: list[str]
) -> list[str]:
    primary_area = areas[0] if areas else "my area"
    generated = [
        f"Who should I call for {service.lower()} in {primary_area}?"
        for service in services[:5]
    ]
    if services and len(areas) > 1:
        generated.append(
            f"Recommend a company for {services[0].lower()} in {', '.join(areas[:3])}."
        )
    generated.append(f"What does {name} offer?")
    return unique([*extras, *generated])


def build_config(args: argparse.Namespace) -> dict:
    services = split_csv(args.services)
    areas = split_csv(args.service_areas)
    google_queries = build_google_queries(
        services, areas, split_csv(args.google_queries)
    )
    ai_prompts = build_ai_prompts(
        args.name, services, areas, split_csv(args.ai_prompts)
    )

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
            "google_queries": google_queries,
            "ai_mode_prompts": ai_prompts,
            "verified_organic_wins": [],
            "verified_map_pack_wins": [],
        },
    }


def build_reporting_payload(args: argparse.Namespace) -> dict:
    services = split_csv(args.services)
    areas = split_csv(args.service_areas)
    google_queries = build_google_queries(
        services, areas, split_csv(args.google_queries)
    )
    ai_prompts = build_ai_prompts(
        args.name, services, areas, split_csv(args.ai_prompts)
    )
    return {
        "slug": args.slug,
        "client_name": args.name,
        "client_email": "replace-with-client-email@example.com",
        "site_url": args.website,
        "target_url": args.website,
        "money_keywords": google_queries,
        "conversion_rate": 0.03,
        "avg_job_value": 400,
        "active": True,
        "ai_mode_prompts": ai_prompts,
    }


def client_readme(args: argparse.Namespace) -> str:
    return f"""# {args.name}

## Purpose

This folder holds non-secret LOLA OS configuration and onboarding notes for
`{args.slug}`.

## What Belongs Here

- `client.json` with client identity, market, services, and tracking prompts.
- Client-specific onboarding notes and verification checklists.
- Links to landing pages, dashboards, reporting setup, and integration docs.

## What Should Not Belong Here

- API keys, access tokens, admin keys, passwords, or session credentials.
- Customer PII, call transcripts, lead records, estimates, jobs, or revenue data.
- Shared platform code that should live in `CORE/` or product modules.

## How It Supports LOLA OS

This folder lets LOLA OS clone the Sandbar operating pattern for {args.name}
while keeping client metadata separated by slug.
"""


def html_list(items: list[str]) -> str:
    return "\n".join(f"      <li>{html.escape(item)}</li>" for item in items)


def card_list(items: list[str]) -> str:
    cards = []
    for item in items:
        escaped = html.escape(item)
        cards.append(f"""      <article class="card">
        <h3>{escaped}</h3>
        <p>Request a scoped quote for {escaped.lower()} with service details reviewed before scheduling.</p>
      </article>""")
    return "\n".join(cards)


def landing_page(args: argparse.Namespace) -> str:
    name = html.escape(args.name)
    slug = html.escape(args.slug)
    market = html.escape(args.market)
    primary_area = html.escape(args.primary_service_area)
    services = split_csv(args.services)
    areas = split_csv(args.service_areas) or [args.primary_service_area]
    service_phrase = ", ".join(services[:4]) if services else "local services"
    service_phrase_html = html.escape(service_phrase)
    quote_href = html.escape(args.quote_url or args.website)
    canonical = html.escape(
        args.canonical_url or f"{args.website.rstrip('/')}/{args.slug}"
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} | {service_phrase_html} in {primary_area}</title>
<meta name="description" content="Request {service_phrase_html} from {name} in {market}.">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{name} | {primary_area}">
<meta property="og:description" content="{service_phrase_html} for {market}.">
<meta property="og:url" content="{canonical}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0D1B22">
<style>
*,*::before,*::after{{box-sizing:border-box}}
body{{margin:0;background:#0d1b22;color:#f8f4e8;font-family:Inter,Arial,sans-serif;line-height:1.55}}
a{{color:inherit;text-decoration:none}}
.shell{{width:min(1120px,calc(100% - 40px));margin:0 auto}}
.nav{{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:78px;border-bottom:1px solid rgba(255,255,255,.12)}}
.brand{{font-size:24px;font-weight:800;color:#f2c84b}}
.hero{{min-height:calc(100vh - 78px);display:grid;align-items:center;padding:64px 0;border-bottom:1px solid rgba(242,200,75,.26)}}
.eyebrow{{margin:0 0 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:#f2c84b}}
h1,h2{{margin:0;line-height:1;font-size:clamp(42px,8vw,86px);letter-spacing:0}}
h2{{font-size:clamp(34px,5vw,58px)}}
p{{color:#cbd6d8}}
.intro{{max-width:760px;font-size:20px}}
.actions{{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}}
.button{{display:inline-flex;min-height:52px;align-items:center;justify-content:center;border-radius:6px;padding:0 20px;background:#f2c84b;color:#0d1b22;font-size:13px;font-weight:800;text-transform:uppercase}}
.button.secondary{{border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff}}
section{{padding:72px 0}}
.grid{{display:grid;grid-template-columns:1fr;gap:14px;margin-top:26px}}
.card{{border:1px solid rgba(255,255,255,.13);border-radius:6px;padding:22px;background:rgba(255,255,255,.035)}}
.areas{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:22px;padding:0;list-style:none}}
.areas li{{border-bottom:1px solid rgba(255,255,255,.12);padding:10px 0;font-weight:700}}
.note{{font-size:12px;color:#91a3a7}}
details{{margin-top:12px;border:1px solid rgba(255,255,255,.13);border-radius:6px;padding:16px;background:rgba(255,255,255,.035)}}
summary{{cursor:pointer;font-weight:800}}
footer{{border-top:1px solid rgba(255,255,255,.1);padding:24px 0 38px;color:#84969a;font-size:12px}}
@media(min-width:760px){{.grid-3{{grid-template-columns:repeat(3,1fr)}}.areas{{grid-template-columns:repeat(3,1fr)}}}}
@media(max-width:560px){{.shell{{width:min(100% - 28px,1120px)}}.button{{width:100%}}}}
</style>
</head>
<body>
<header class="shell nav">
  <a class="brand" href="/{slug}">{name}</a>
  <a href="#quote">Request quote</a>
</header>
<main>
  <section class="hero shell">
    <div>
      <p class="eyebrow">{primary_area}</p>
      <h1>{service_phrase_html} in {market}.</h1>
      <p class="intro">{name} is a client-specific LOLA OS landing page for high-intent service inquiries in {market}.</p>
      <div class="actions">
        <a class="button" href="{quote_href}">Request a quote</a>
        <a class="button secondary" href="#services">View services</a>
      </div>
      <p class="note">Placeholder proof is clearly marked until verified client assets, reviews, and tracking are connected.</p>
    </div>
  </section>
  <section class="shell" id="services">
    <p class="eyebrow">Services</p>
    <h2>Quote-ready service focus</h2>
    <div class="grid grid-3">
{card_list(services[:6])}
    </div>
  </section>
  <section class="shell">
    <p class="eyebrow">Service areas</p>
    <h2>Local market coverage</h2>
    <ul class="areas">
{html_list(areas)}
    </ul>
  </section>
  <section class="shell">
    <p class="eyebrow">Proof</p>
    <h2>Verified work belongs here</h2>
    <div class="card"><p>Placeholder only. Add approved before/after images, testimonials, rankings, and performance metrics only after they are verified from real sources.</p></div>
  </section>
  <section class="shell">
    <p class="eyebrow">FAQ</p>
    <h2>Common questions</h2>
    <details><summary>How do I request service?</summary><p>Use the quote request button. Dedicated tracking should be configured before production launch.</p></details>
    <details><summary>What services are available?</summary><p>This page is configured around {service_phrase_html}. Update the client config when services change.</p></details>
    <details><summary>Which areas are covered?</summary><p>The initial service area configuration includes {html.escape(', '.join(areas))}.</p></details>
  </section>
  <section class="shell" id="quote">
    <p class="eyebrow">Get started</p>
    <h2>Request a scoped quote.</h2>
    <div class="actions"><a class="button" href="{quote_href}">Request a quote</a></div>
  </section>
</main>
<footer><div class="shell">{name} landing page powered by LOLA OS. Dashboard route: /r/client/{slug}.</div></footer>
</body>
</html>
"""


def client_doc(args: argparse.Namespace) -> str:
    services = split_csv(args.services)
    areas = split_csv(args.service_areas)
    google_queries = build_google_queries(
        services, areas, split_csv(args.google_queries)
    )
    ai_prompts = build_ai_prompts(args.name, services, areas, split_csv(args.ai_prompts))

    return f"""# {args.name} Client Setup

## Overview

- Client name: {args.name}
- Slug: `{args.slug}`
- Website: {args.website}
- Industry: {args.industry}
- Market: {args.market}
- Primary service area: {args.primary_service_area}
- Lifecycle/status: not activated until tracking, reporting, and agent checks are complete

## Generated Assets

- Client config: `CLIENTS/{args.slug}/client.json`
- Reporting payload: `CLIENTS/{args.slug}/reporting-client.payload.json`
- Client README: `CLIENTS/{args.slug}/README.md`
- Landing page: `frontend/public/lp/{args.slug}.html`
- Landing route: `/{args.slug}`
- Preserved LP route: `/lp/{args.slug}`
- Client doc: `docs/clients/{args.slug}.md`

## Dashboard and Backend Routes

These routes are slug-based and should resolve once the config is valid:

- Public client dashboard: `/r/client/{args.slug}`
- Revenue admin UI: `/admin/revenue/{args.slug}`
- Revenue agent run endpoint: `POST /admin/revenue/{args.slug}/run`
- Case-study snapshot endpoint: `POST /admin/case-study/{args.slug}/run`
- Admin calls endpoint: `/admin/calls/{args.slug}`
- Admin tracking endpoint: `/admin/tracking/{args.slug}`

## SEO Targets

Google queries:

{chr(10).join(f"- `{query}`" for query in google_queries)}

AI visibility prompts:

{chr(10).join(f"- {prompt}" for prompt in ai_prompts)}

## Reporting Setup

Create or verify a reporting client row before sending weekly reports. Start
from `CLIENTS/{args.slug}/reporting-client.payload.json` and replace the
placeholder email before production:

```json
{{
  "slug": "{args.slug}",
  "client_name": "{args.name}",
  "client_email": "replace-with-client-email@example.com",
  "site_url": "{args.website}",
  "target_url": "{args.website}",
  "money_keywords": {json.dumps(google_queries, indent=2)},
  "conversion_rate": 0.03,
  "avg_job_value": 400,
  "active": true,
  "ai_mode_prompts": {json.dumps(ai_prompts, indent=2)}
}}
```

Do not add fake leads, calls, rankings, estimates, jobs, or revenue. Metrics
must come from verified integrations or tracked LOLA OS data.

## Agent Activation Checklist

- Validate client config with `python3 scripts/verify_client_onboarding.py`.
- Verify registry path with `python3 scripts/verify_client_registry.py`.
- Connect call tracking or form events for `{args.slug}`.
- Configure Search Console, GA4, and GBP only if access exists.
- Add reporting recipient and confirm weekly report schedule.
- Run the case-study snapshot endpoint after admin credentials are available.
- Run the revenue agent only after real tracking data exists.

## Data Sources Needed

- Reporting client row.
- Call tracking webhook/source.
- Lead capture events.
- Google Search Console property, if available.
- GA4 property ID, if available.
- Google Business Profile integration, if available.
- Verified testimonials, proof assets, and before/after photos.

## Local Verification

Run:

```bash
python3 scripts/verify_client_onboarding.py
python3 scripts/verify_client_registry.py
.venv/bin/python -m py_compile client_configs.py case_studies/configs.py scripts/create_client.py
npm --prefix frontend run build
git diff --check
```
"""


def update_vercel_rewrites(root: Path, slug: str) -> bool:
    vercel_path = root / "frontend" / "vercel.json"
    if not vercel_path.exists():
        return False

    data = json.loads(vercel_path.read_text(encoding="utf-8"))
    rewrites = data.setdefault("rewrites", [])
    if not isinstance(rewrites, list):
        raise ValueError("frontend/vercel.json rewrites must be a list")

    desired = [
        {"source": f"/lp/{slug}", "destination": f"/lp/{slug}.html"},
        {"source": f"/{slug}", "destination": f"/lp/{slug}.html"},
    ]
    existing_sources = {
        item.get("source")
        for item in rewrites
        if isinstance(item, dict) and isinstance(item.get("source"), str)
    }
    changed = False
    for rewrite in desired:
        if rewrite["source"] not in existing_sources:
            rewrites.append(rewrite)
            changed = True

    if changed:
        vercel_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return changed


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
        "--service-areas",
        default="",
        help="Comma-separated service areas for landing page and SEO targets",
    )
    parser.add_argument(
        "--services",
        required=True,
        help="Comma-separated service list for client.json and landing page",
    )
    parser.add_argument(
        "--google-queries",
        default="",
        help="Comma-separated priority Google search queries",
    )
    parser.add_argument(
        "--ai-prompts",
        default="",
        help="Comma-separated priority AI visibility prompts",
    )
    parser.add_argument("--slug", help="Optional slug; defaults from name")
    parser.add_argument("--quote-url", default="", help="Temporary or final quote URL")
    parser.add_argument("--canonical-url", default="", help="Canonical landing URL")
    parser.add_argument(
        "--skip-vercel",
        action="store_true",
        help="Create files without updating frontend/vercel.json rewrites",
    )
    parser.add_argument(
        "--root",
        default=str(DEFAULT_ROOT),
        help="Repository root. Useful for smoke tests in /tmp.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.slug = slugify(args.slug or args.name)
    root = Path(args.root).resolve()
    clients_dir = root / "CLIENTS"
    docs_dir = root / "docs" / "clients"
    lp_dir = root / "frontend" / "public" / "lp"

    services = split_csv(args.services)
    if not services:
        raise ValueError("--services must include at least one service")

    if not split_csv(args.service_areas):
        args.service_areas = args.primary_service_area

    client_dir = clients_dir / args.slug
    if client_dir.exists():
        raise FileExistsError(f"Client folder already exists: {client_dir}")

    config = build_config(args)
    reporting_payload = build_reporting_payload(args)
    write_new(client_dir / "README.md", client_readme(args))
    write_new(client_dir / "client.json", json.dumps(config, indent=2) + "\n")
    write_new(
        client_dir / "reporting-client.payload.json",
        json.dumps(reporting_payload, indent=2) + "\n",
    )
    write_new(lp_dir / f"{args.slug}.html", landing_page(args))
    write_new(docs_dir / f"{args.slug}.md", client_doc(args))
    rewrites_changed = (
        False if args.skip_vercel else update_vercel_rewrites(root, args.slug)
    )

    print(f"Created client onboarding scaffold for {args.name}: {args.slug}")
    print(f"- CLIENTS/{args.slug}/README.md")
    print(f"- CLIENTS/{args.slug}/client.json")
    print(f"- CLIENTS/{args.slug}/reporting-client.payload.json")
    print(f"- frontend/public/lp/{args.slug}.html")
    print(f"- docs/clients/{args.slug}.md")
    if args.skip_vercel:
        print("- frontend/vercel.json not updated (--skip-vercel)")
    elif rewrites_changed:
        print(f"- frontend/vercel.json rewrites added for /{args.slug} and /lp/{args.slug}")
    else:
        print("- frontend/vercel.json not found or already contained the route rewrites")
    print(f"- Dashboard route: /r/client/{args.slug}")
    print(f"- Revenue admin route: /admin/revenue/{args.slug}")
    print("Next: connect tracking, reporting, and agent activation with real credentials/data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
