# Decision rules

The rules Lola uses to decide what matters — and how Claude should weigh work.
Plain language, revenue-first. These drive the priority engine (`services/priority.py`).

## Ordering

1. **A broken revenue-critical system beats everything.** If money can't flow
   (lead form down, checkout broken, CRM not capturing), fix it first.
2. **Revenue/customer action before speculative build.** An unanswered qualified
   prospect, an estimate needing follow-up, a client deliverable — all rank above
   an optional new feature.
3. Build work becomes high priority only when it: removes a measured bottleneck,
   fixes a broken revenue system, saves meaningful recurring time, supports
   active customers, or is blocking revenue work.

## What raises priority

- Revenue proximity (a dollar actually waiting > a maybe).
- Recurring dollars, weighted toward the $4k/mo predictable-revenue target.
- Someone is waiting (a person, a lead, a client) — and how long.
- Low effort / quick win (tie-breaker).
- Reusable leverage across clients/businesses (never above waiting revenue).
- Unblocks other work.

## Guardrails

- Never invent a number. Missing data is "unavailable," not a guess.
- The UI shows the *reason*, never a bare score.
- Sensitive personal finance stays out of v1 (single admin key). Business
  revenue numbers only.
