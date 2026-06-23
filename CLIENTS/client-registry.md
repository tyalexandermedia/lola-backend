# LOLA OS Client Registry

## Purpose

This registry defines the canonical file-backed shape for LOLA OS clients.
Each client should have its own folder under `CLIENTS/<slug>/` with a
`client.json` file that contains non-secret metadata used by dashboards,
tracking, reporting, and onboarding.

## Current Clients

| Slug | Client | Website | Status |
| --- | --- | --- | --- |
| `sandbar` | Sandbar Soft Wash | https://www.sandbarsoftwash.com | Production client |
| `tampa-bay-power-clean` | Tampa Bay Power Clean | https://www.tampabaypowerclean.com | Separate client scaffold and dashboard |

## Required Fields

- `slug`
- `client_name`
- `website`
- `target_domain`
- `industry`
- `market`
- `primary_service_area`
- `services`
- `tracking.google_queries`
- `tracking.ai_mode_prompts`

## Rules

- Do not store secrets, API keys, access tokens, private customer data, call
  recordings, lead details, or revenue numbers in client config.
- Do not rename existing client slugs after production traffic or data exists.
- Additive changes are preferred. Preserve Sandbar while adding future clients.
- Dashboard and reporting code should read client identity from this registry
  or from the database, not from one-off route conditionals.

## New Client Generator

Use `scripts/create_client.py` as the default onboarding path for future
clients:

```bash
python3 scripts/create_client.py \
  --name "Example Client" \
  --website "https://www.example.com" \
  --industry "Local services" \
  --market "Tampa Bay, Florida" \
  --primary-service-area "Tampa" \
  --service-areas "Tampa,Clearwater,St. Petersburg" \
  --services "Primary Service,Secondary Service" \
  --google-queries "primary service tampa,secondary service clearwater"
```

The generator creates:

- `CLIENTS/<slug>/client.json`
- `CLIENTS/<slug>/README.md`
- `frontend/public/lp/<slug>.html`
- `docs/clients/<slug>.md`
- Vercel rewrites for `/<slug>` and `/lp/<slug>`, when `frontend/vercel.json`
  is present

It also documents the slug-based dashboard, reporting, and agent activation
steps. It does not create database rows, call external admin endpoints, add
secrets, or fabricate performance data.

## How It Supports LOLA OS

The registry makes client cloning repeatable. A new client can start with the
same backend surfaces as Sandbar while keeping brand metadata, service areas,
tracking prompts, landing pages, and documentation separated by slug.
