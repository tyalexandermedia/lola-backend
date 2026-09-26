# Lola Command Center — go live this weekend

v1 is built, tested, and on `claude/loving-franklin-bprnha`. This is the shortest
path to it running with your real data, plus copy-paste prompts for what's next.

---

## Part A — Get it live (your moves; ~15 min)

### 1. Merge the branch
Merge `claude/loving-franklin-bprnha` into `main` (Railway + Vercel auto-deploy).

### 2. Set Railway env vars (backend)
In Railway → your service → Variables:

```
# --- persistence (do this or the brief resets on every redeploy) ---
DB_PATH=/data/lola.db          # and attach a Railway Volume mounted at /data

# --- admin (if not already set) ---
LOLA_SECRET_ADMIN_KEY=<a long random string you'll remember>

# --- turn on the GHL money read (read-only) ---
GHL_API_TOKEN=<your rotated Private Integration token>
GHL_LOCATION_MAP={"rL4X2gKNPEgIwsuJeYIL":"sandbar","ZGaVN1X7cuOVlz0kyr3i":"ty-alexander-media","ajRyx9aH0Sy8RbY4Fl3M":"lola-leads"}
```

Notes:
- The three location IDs above are your real GHL sub-accounts (Sandbar, Ty
  Alexander Media, Randy Golden PC). **Randy Golden is mapped to `lola-leads`**
  as a client of the service business — change or drop that entry if you'd
  rather not see it.
- `GHL_API_TOKEN` is the **secret** — it lives only in Railway, never in the repo.
  Use a fresh Private Integration token with the `opportunities.readonly` scope.
- Leave `GHL_API_TOKEN` unset and the brief still works (GHL section just stays
  empty) — safe by default.

### 3. Verify
- Open **`https://lola.tyalexandermedia.com/brief`** on your phone, enter the admin key.
- Tap **Refresh** → your real Sandbar/TAM/Randy open opportunities appear under
  "Revenue — money waiting" (demo "(Example)" deals are filtered out).
- Set this month's predictable revenue per business in the scoreboard to see the
  gap to $4k.

### 4. (Optional) confirm the token works
From your machine, not the repo:
```
curl -s "https://services.leadconnectorhq.com/opportunities/search?locationId=rL4X2gKNPEgIwsuJeYIL&status=open&limit=3" \
  -H "Authorization: Bearer $GHL_API_TOKEN" -H "Version: 2021-07-28" | head
```
2xx with an `opportunities` array = you're good.

---

## Part B — What's live right now

Confirmed working (unit + full-boot smoke test):
- `/brief` deterministic priority engine — most important next step with a
  plain-language reason; revenue action ranks above speculative build; a broken
  revenue-critical system overrides everything.
- Mirrors product hot leads, stale estimates, revenue actions **and** GHL open
  opportunities into one `lola_items` table (idempotent; never clobbers items
  you've marked done).
- Inbox capture, per-item Done/Today/Waiting/Dismiss, monthly scoreboard w/
  gap-to-$4k, mobile-first UI.

---

## Part C — Next-step build prompts (copy-paste, in ROI order)

Fire these at Claude Code one at a time. Each is scoped to stay small and
revenue-first. Do them only when the prior one is proven.

### Prompt 1 — Auto-fill the scoreboard from Stripe (kills manual entry for product revenue)
```
In lola-backend, wire the Lola scoreboard to pull predictable monthly revenue
from Stripe automatically for the lola-leads workspace, keeping manual entry for
the others. Read active subscriptions via the Stripe API (STRIPE_SECRET_KEY,
already in Railway), sum monthly recurring, and feed it into scoreboard_summary
as a 'stripe' source alongside manual entries — don't overwrite manual numbers,
show both. Safe-by-default: no key → no change. Add a unit test. Audit first if
the shape isn't obvious, then implement on a feature branch and stop.
```

### Prompt 2 — Calendar into "Today" (time-aware urgency)
```
In lola-backend, add today's Google Calendar commitments to the /brief "Today"
section so the command center accounts for time already committed. Use the
Google Calendar integration; read-only; show event title + time, no attendee
PII. If calendar isn't configured, no-op. Keep it a thin read — do not build a
scheduling system. Feature branch, test, stop.
```

### Prompt 3 — Token/cost observability (protect margin)
```
In lola-backend, capture the `usage` block every Anthropic call already returns
(input_tokens/output_tokens) and log per-call cost to one new llm_usage table;
surface a spend tile on /admin/hq. Deterministic, no new deps. Reference
docs/LOLA-AUDIT.md §8 for the call sites. Feature branch, test, stop.
```

### Prompt 4 — Surface Lola Dev work that's actually blocking (GitHub/Vercel)
```
In lola-backend, add a lola-dev workspace feed to /brief: open PRs needing review
and failed Vercel deploys, via the GitHub + Vercel integrations. Only surface
items that are blocking (failed deploy, review-requested) — not every commit.
Read-only, no-op when unconfigured. Keep it to the brief's existing item shape.
Feature branch, test, stop.
```

### Prompt 5 — Dead-code cleanup (reduce maintenance surface)
```
In lola-backend, remove automation/sequence_sender.py and automation/wix_crm.py
(dead + buggy per docs/LOLA-COMMAND-CENTER-AUDIT.md §5/§6), after confirming
nothing imports them. Replace the in-process _AI_VIS_CACHE with the durable
api_cache. Don't touch anything in the live path. Feature branch, test, stop.
```

### Prompt 6 — Weekly CEO review (the legacy/decision loop)
```
In lola-backend, add a read-only GET /brief/weekly that summarizes the week:
items completed by workspace, revenue opportunities won/lost, scoreboard
movement toward $4k, and 3 suggested focuses for next week (deterministic, from
the data — no invented numbers). Render a simple weekly view. Feature branch,
test, stop.
```

---

## Part D — Rules any build must keep (from CLAUDE.md)

- No fabricated proof or metrics — unknowns are "unavailable."
- Revenue action before speculative build.
- Safe-by-default: no env var → clean no-op.
- Money paths fail closed.
- Audit before big changes; implement on a branch; test; stop for review.
