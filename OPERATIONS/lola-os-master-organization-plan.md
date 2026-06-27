# LOLA OS Master Organization Plan

## Objective

Organize LOLA OS so new local-service clients can be cloned from a known
pattern without risking Sandbar production behavior.

## Architecture Principles

- Sandbar remains the production reference client.
- Each client gets a stable slug and a separate folder under `CLIENTS/`.
- Client config stores non-secret identity, market, services, and tracking
  prompts only.
- Live customer data remains in the database and provider systems.
- Shared product code stays in existing backend/frontend modules until a
  migration has tests proving behavior did not change.
- Future moves into `CORE/`, `PRODUCTS/`, `TEMPLATES/`, `KNOWLEDGE/`,
  `OPERATIONS/`, and `CEO/` should be additive and phased.

## Folder Roles

- `CORE/`: shared platform primitives, cross-client contracts, and durable
  backend abstractions.
- `CLIENTS/`: one folder per client with non-secret config, onboarding notes,
  and client-specific documentation.
- `KNOWLEDGE/`: reusable operating knowledge, playbooks, research, prompts,
  and local-service intelligence.
- `PRODUCTS/`: packaged LOLA OS product surfaces such as reporting, revenue,
  reviews, audits, and tracking.
- `TEMPLATES/`: reusable client onboarding, landing-page, reporting, and
  campaign templates.
- `OPERATIONS/`: deployment, QA, release, incident, and onboarding procedures.
- `CEO/`: executive strategy, goals, positioning, and decision records.

## Migration Phases

1. Scaffold folders and document ownership.
2. Add file-backed client config under `CLIENTS/<slug>/client.json`.
3. Make existing case-study tracking read from the client config layer while
   preserving the old slug behavior.
4. Add future clients through the generator instead of hand-copying.
5. Migrate shared systems into `CORE/` and `PRODUCTS/` only after regression
   checks cover Sandbar dashboards, reporting, and revenue flows.

## Guardrails

- Do not store secrets or PII in repo config.
- Do not rename `sandbar`.
- Do not move live modules until tests and route checks are in place.
- Do not fabricate performance metrics for new clients.
- New clients should start with placeholder proof only when it is labeled as
  placeholder/demo content.

## First Operational Workflow

For a new client:

1. Run `scripts/create_client.py`.
2. Review `CLIENTS/<slug>/client.json`.
3. Add real tracking queries and AI prompts.
4. Create or verify the landing page.
5. Add any Vercel rewrites and sitemap entries.
6. Create the production reporting client row.
7. Verify `/r/client/<slug>`, `/admin/revenue/<slug>`, and public reporting
   payloads before promoting.
