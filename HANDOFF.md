# HANDOFF — Review-send eligibility segment (Sandbar)

Branch: `claude/sandbar-ghl-import-handoff-0mdh0o` · PR-only, no direct merge.
(The stale May-era env-setup handoff this file previously held lives in git
history at `71b608c4^..71b608c4` if you ever need it.)

## What changed

- **New: `services/build_review_segment.py`** — builds the review-send
  eligibility segment from GHL contacts tagged `customer:past`:
  - Classifies REAL CUSTOMER (transaction count > 0 OR lifetime spend > 0 OR
    last-service-date populated, via location custom fields) vs DIRECTORY
    (none of those signals).
  - Excludes: Email DND, tag `exclusion:no-marketing`, tag `sandbar-optout`,
    invalid/missing email.
  - **Dry-run by default** (reads API, tags nothing). `--apply` adds tag
    `review-send-eligible` to REAL customers only — never directory contacts.
  - Idempotent: already-tagged contacts are counted and skipped on re-run.
  - Writes `reports/review_eligible.csv` (name/email/bucket/reason) and
    prints real / directory / excluded counts in both modes.
  - Rate-limited (`--sleep`, default 0.15s) with 5-attempt exponential
    backoff on 429/5xx (honors `Retry-After`); tokens redacted from all
    output; halts if `GHL_API_TOKEN` is still the revoked `pit-fe93dc05…`
    token; records-only — sends no email/SMS, enrolls nothing.
- **This file** — replaced the stale May-era handoff with this one.
- Also riding on this branch (pre-existing, unmerged): the two Sandbar
  gallery commits — before/after slider scaffolding + real GBP review link
  (`e86c1f17`, `68a6b490`). They'll merge with this PR.

## How to run

```bash
export GHL_API_TOKEN=pit-...    # the NEW rotated token
export GHL_LOCATION_ID=...

python3 services/build_review_segment.py            # dry-run: counts + CSV only
python3 services/build_review_segment.py --apply    # tag REAL customers
```

Custom-field mapping is by name heuristic (transaction / lifetime spend /
last service). If the dry-run warns a signal didn't resolve, pass the field
ID explicitly: `--tx-field <id> --spend-field <id> --service-field <id>`.

## Counts

**Not run — no GHL credentials in this container** (env has no
`GHL_API_TOKEN`/`GHL_LOCATION_ID`, and this environment's network policy
blocks non-allowlisted egress anyway). The expected segment is ~92 real
customers per the launch analysis. **Owner: run the dry-run from a machine
with the rotated token, eyeball `reports/review_eligible.csv`, then
`--apply`.**

## Exact next manual step (after --apply)

1. GHL → Automation → **Review Request workflow** → set the trigger to
   **Contact Tag Added = `review-send-eligible`**.
2. Confirm the workflow's channel is **email only** (SMS stays off until A2P
   is approved).
3. **Publish** the workflow. Tagged contacts enter from the trigger; the
   send itself only happens via the published workflow, never from code.

## Blockers needing owner input

- **Rotated GHL token + location ID** — needed to produce real counts
  (see above). Script refuses the revoked Aug-2 token by prefix.
- **Custom-field names** — if Square-import fields aren't named like
  "transaction / lifetime spend / last service", grab the three field IDs
  from GHL → Settings → Custom Fields and pass them as flags.
- **Domain/A2P unchanged** — email sends still ride the shared fallback
  domain until ticket #GHL-6047925 activates `mail.sandbarsoftwash.com`;
  SMS stays off pending A2P approval.
