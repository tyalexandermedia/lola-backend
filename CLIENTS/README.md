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

## Verification

Run the read-only onboarding verifier before moving shared code or promoting a
new client:

```bash
python scripts/verify_client_onboarding.py
```

If your shell does not provide a `python` alias, use the project virtualenv:

```bash
.venv/bin/python scripts/verify_client_onboarding.py
```

The script checks required client config fields, secret-like keys and values,
tracking targets, service lists, Sandbar's case-study/dashboard config path,
and Tampa Bay Power Clean's client registry path.
