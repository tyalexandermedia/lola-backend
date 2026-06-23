# CORE

## Purpose

`CORE/` is the future home for shared LOLA OS platform code: the common primitives, contracts, orchestration rules, and internal services that every client or product can depend on.

## What Belongs Here

- Shared domain models and interfaces.
- Cross-client orchestration primitives.
- Common authentication, permissions, and tenant-safe helpers.
- Shared observability, logging, and health-check patterns.
- Core service contracts that are not specific to one client.

## What Should Not Belong Here

- Client-specific configuration or data.
- One-off scripts for a single account.
- Landing-page copy or marketing templates.
- Product-specific workflows that do not need to be shared.
- Secrets, API keys, or environment-specific values.

## How It Supports LOLA OS

`CORE/` gives LOLA OS a stable foundation so Sandbar, Tampa Bay Power Clean, and future clients can use the same backend patterns without duplicating critical logic.
