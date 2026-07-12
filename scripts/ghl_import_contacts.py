#!/usr/bin/env python3
"""
Bulk-import contacts into GoHighLevel via the v2 API (contacts/upsert).

Reads a cleaned import CSV (see the Sandbar Square export → GHL-ready file) and
upserts each row into a GHL location. Upsert dedupes on email/phone on GHL's
side, so re-running is safe. A local ".done" log makes runs resumable — an
interrupted or repeated run skips rows already confirmed.

SAFE BY DEFAULT: dry-run unless you pass --live. Dry-run makes no network calls;
it prints exactly what would be sent. Contacts are imported as records only —
this script never enrolls them in a workflow, campaign, or pipeline.

Credentials (never hard-coded): a GHL Private Integration token with
`contacts.write` scope, plus the Location ID.
  export GHL_API_TOKEN=pit-...          # or --token
  export GHL_LOCATION_ID=...            # or --location

Usage:
  # validate everything, no network:
  python3 scripts/ghl_import_contacts.py --csv sandbar_ghl_import.csv --dry-run
  # small live test (first 5 rows):
  python3 scripts/ghl_import_contacts.py --csv sandbar_ghl_import.csv --live --limit 5
  # full live run:
  python3 scripts/ghl_import_contacts.py --csv sandbar_ghl_import.csv --live
"""

import argparse
import csv
import json
import os
import sys
import time

import httpx

API_BASE = "https://services.leadconnectorhq.com"
API_VERSION = "2021-07-28"


def build_payload(row: dict, location_id: str) -> dict:
    """Map a cleaned-CSV row to a GHL contacts/upsert body."""
    tags = [t.strip() for t in (row.get("Tags") or "").split(",") if t.strip()]
    payload = {
        "locationId": location_id,
        "firstName": (row.get("First Name") or "").strip(),
        "lastName": (row.get("Last Name") or "").strip(),
        "name": " ".join(
            p for p in [
                (row.get("First Name") or "").strip(),
                (row.get("Last Name") or "").strip(),
            ] if p
        ),
        "email": (row.get("Email") or "").strip(),
        "phone": (row.get("Phone") or "").strip(),
        "address1": (row.get("Address") or "").strip(),
        "city": (row.get("City") or "").strip(),
        "state": (row.get("State") or "").strip(),
        "postalCode": (row.get("Postal Code") or "").strip(),
        "companyName": (row.get("Company Name") or "").strip(),
        "source": (row.get("Source") or "Square import").strip(),
        "tags": tags,
    }
    # Respect the Square unsubscribe: set email DND so a future blast can't hit
    # them even before you filter by the email-optout tag.
    if (row.get("Email Opt-Out") or "").strip().lower() == "true":
        payload["dndSettings"] = {
            "Email": {"status": "active", "message": "Unsubscribed in Square"}
        }
    # Drop empty keys so we don't overwrite existing GHL fields with blanks.
    return {k: v for k, v in payload.items() if v not in ("", [], None)}


def row_key(row: dict) -> str:
    return (row.get("Email") or "").strip().lower() or (row.get("Phone") or "").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--token", default=os.getenv("GHL_API_TOKEN", "").strip())
    ap.add_argument("--location", default=os.getenv("GHL_LOCATION_ID", "").strip())
    ap.add_argument("--live", action="store_true", help="actually POST to GHL")
    ap.add_argument("--dry-run", action="store_true", help="print only, no network")
    ap.add_argument("--limit", type=int, default=0, help="process at most N rows")
    ap.add_argument("--sleep", type=float, default=0.15, help="pause between calls (rate limit)")
    ap.add_argument("--done-log", default="", help="resume file (default: <csv>.done)")
    args = ap.parse_args()

    live = args.live and not args.dry_run
    done_path = args.done_log or (args.csv + ".done")

    with open(args.csv, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if args.limit:
        rows = rows[: args.limit]

    done = set()
    if os.path.exists(done_path):
        with open(done_path, encoding="utf-8") as fh:
            done = {ln.strip() for ln in fh if ln.strip()}

    if live:
        if not args.token or not args.location:
            print("ERROR: --live needs GHL_API_TOKEN and GHL_LOCATION_ID "
                  "(env or --token/--location).", file=sys.stderr)
            return 2
        headers = {
            "Authorization": f"Bearer {args.token}",
            "Version": API_VERSION,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        client = httpx.Client(timeout=30, headers=headers)
        done_fh = open(done_path, "a", encoding="utf-8")

    mode = "LIVE" if live else "DRY-RUN"
    print(f"[{mode}] {len(rows)} rows from {args.csv} "
          f"(already done: {len(done)}) → location {args.location or '<unset>'}")

    ok = skipped = failed = 0
    for i, row in enumerate(rows, 1):
        key = row_key(row)
        if not key:
            skipped += 1
            continue
        if key in done:
            skipped += 1
            continue
        payload = build_payload(row, args.location or "<LOCATION_ID>")

        if not live:
            if i <= 3:  # sample a few so output stays readable
                print(json.dumps(payload, ensure_ascii=False))
            ok += 1
            continue

        try:
            r = client.post(f"{API_BASE}/contacts/upsert", json=payload)
            if r.status_code < 300:
                ok += 1
                done_fh.write(key + "\n")
                done_fh.flush()
            else:
                failed += 1
                print(f"  ✗ {key}: {r.status_code} {r.text[:200]}", file=sys.stderr)
                if r.status_code in (401, 403):
                    print("  auth rejected — stopping.", file=sys.stderr)
                    break
                if r.status_code == 429:  # rate limited: back off
                    time.sleep(5)
        except Exception as e:
            failed += 1
            print(f"  ✗ {key}: {type(e).__name__}: {e}", file=sys.stderr)
        time.sleep(args.sleep)

    print(f"[{mode}] done — upserted/would-upsert: {ok}, skipped: {skipped}, failed: {failed}")
    if not live:
        print("Dry-run only. Re-run with --live (and token + location) to import.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
