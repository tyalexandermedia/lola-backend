# CLAUDE.md — start here

This repo is **Lola**. Two things live here:

1. **The Lola Leads product** — a client-facing SEO / lead-gen SaaS (FastAPI on
   Railway + React on Vercel). This is most of the codebase.
2. **The Lola personal command center** — Ty's cross-business "what do I do
   next?" layer, added 2026-09. Its code is deliberately separated: `db/lola_items.py`,
   `services/priority.py`, `services/brief_ingest.py`, `api_clients/ghl_read.py`,
   the `/brief` routes in `main.py`, and `frontend/src/Brief.tsx`.

## Before you build, read these

- `docs/LOLA-COMMAND-CENTER-AUDIT.md` — the architecture + v1 scope + locked decisions.
- `DECISIONS.md` — durable product/engineering decisions (append-only).
- `/context/` — durable context: who Ty is, current priorities, decision rules,
  offers, per-business notes, experiments, learnings. **Read `/context/decision-rules.md` first.**

## How work flows (keep it repeatable)

Strategy/decision → approved build brief → Claude implements → test → deploy →
measure → record the learning in `/context/learnings.md`. Claude is the
implementation layer, not the strategy room.

## Non-negotiables (from DECISIONS.md)

- **No fabricated proof or metrics.** Ever. Mark unknowns "unavailable."
- **Revenue action before speculative build** (the priority engine enforces this).
- **Safe-by-default:** every integration no-ops cleanly when its env var is blank.
- **Money paths fail closed** (see the Stripe webhook).
- `/lp/*` landing pages are sacred (generated, not hand-edited).

## The command center, in one line

`GET /brief` runs a deterministic priority engine over one `lola_items` table
(product signals + GHL opportunities + manual capture), tagged by `workspace`,
and returns the single most important next step with a plain-language reason.
