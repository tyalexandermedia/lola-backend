# CLIENTS

## Purpose

`CLIENTS/` is the future home for client-specific LOLA OS configuration, notes, onboarding docs, and client-owned operating context.

## What Belongs Here

- One folder per client slug.
- Client overview docs.
- Client-specific setup notes and integration checklists.
- Market, service, and positioning notes for that client.
- Client-specific non-secret configuration references.

## What Should Not Belong Here

- Shared platform code.
- Generic templates used by many clients.
- Secrets, private API keys, tokens, or passwords.
- Production database exports containing PII.
- Code that should remain in live backend modules until a planned migration.

## How It Supports LOLA OS

`CLIENTS/` keeps each client isolated as a first-class entity while still letting LOLA OS reuse shared platform capabilities from the rest of the repo.
