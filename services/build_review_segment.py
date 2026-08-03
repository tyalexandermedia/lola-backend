#!/usr/bin/env python3
"""
Build Sandbar's review-send eligibility segment from GHL contacts.

Pulls every contact tagged `customer:past`, classifies each as a REAL
CUSTOMER (transaction count > 0 OR lifetime spend > 0 OR last-service-date
populated — via location custom fields) or DIRECTORY (none of those), and
excludes anyone with Email DND, tag `exclusion:no-marketing`, tag
`sandbar-optout`, or an invalid/missing email.

SAFE BY DEFAULT: dry-run unless you pass --apply. Dry-run reads the API but
tags nothing. With --apply, adds tag `review-send-eligible` to REAL customers
only — never to directory contacts. Idempotent: contacts already carrying the
tag are skipped, so re-running is free. Records-only — this script never
sends email or SMS and never enrolls anyone in a workflow.

Always writes reports/review_eligible.csv (name/email/reason) and prints the
real / directory / excluded counts.

Credentials (env only, never hard-coded):
  export GHL_API_TOKEN=pit-...   # rotated Private Integration token
  export GHL_LOCATION_ID=...

Usage:
  python3 services/build_review_segment.py            # dry-run
  python3 services/build_review_segment.py --apply    # tag REAL customers
"""

import argparse
import csv
import os
import re
import sys
import time

import httpx

API_BASE = "https://services.leadconnectorhq.com"
API_VERSION = "2021-07-28"

SOURCE_TAG = "customer:past"
ELIGIBLE_TAG = "review-send-eligible"
EXCLUDE_TAGS = {"exclusion:no-marketing", "sandbar-optout"}

# The Aug-2 leaked token was rotated; refuse to run with the old one.
REVOKED_TOKEN_PREFIX = "pit-fe93dc05"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Custom-field name heuristics (lowercased substring match) for the three
# real-customer signals. Override with --tx-field / --spend-field /
# --service-field if the location uses different names.
TX_FIELD_HINTS = ("transaction",)
SPEND_FIELD_HINTS = ("lifetime spend", "lifetime_spend", "total spend", "total_spent", "lifetime value")
SERVICE_FIELD_HINTS = ("last service", "last_service", "last-service")


def redact(text: str, token: str) -> str:
    if token:
        text = text.replace(token, "pit-<redacted>")
    return re.sub(r"pit-[A-Za-z0-9-]+", "pit-<redacted>", text)


def request(client: httpx.Client, method: str, url: str, token: str, **kw) -> httpx.Response:
    """GET/POST with retry + backoff on 429/5xx. Raises after 5 attempts."""
    delay = 1.0
    for attempt in range(5):
        try:
            r = client.request(method, url, **kw)
        except httpx.HTTPError as e:
            if attempt == 4:
                raise
            print(f"  retry {attempt + 1}: {redact(str(e), token)}", file=sys.stderr)
            time.sleep(delay)
            delay *= 2
            continue
        if r.status_code == 429 or r.status_code >= 500:
            if attempt == 4:
                return r
            wait = float(r.headers.get("Retry-After") or delay)
            time.sleep(wait)
            delay *= 2
            continue
        return r
    return r


def field_value(contact: dict, field_id: str) -> str:
    for cf in contact.get("customFields") or []:
        if cf.get("id") == field_id:
            v = cf.get("value")
            return "" if v is None else str(v).strip()
    return ""


def is_positive_number(raw: str) -> bool:
    try:
        return float(re.sub(r"[$,\s]", "", raw)) > 0
    except ValueError:
        return False


def resolve_fields(client: httpx.Client, token: str, location_id: str, args) -> dict:
    """Map the three signals to custom-field IDs by name, unless overridden."""
    r = request(client, "GET", f"{API_BASE}/locations/{location_id}/customFields", token)
    r.raise_for_status()
    fields = r.json().get("customFields") or []
    resolved = {"tx": args.tx_field, "spend": args.spend_field, "service": args.service_field}
    for f in fields:
        name = (f.get("name") or "").lower()
        fid = f.get("id")
        if not resolved["tx"] and any(h in name for h in TX_FIELD_HINTS):
            resolved["tx"] = fid
        if not resolved["spend"] and any(h in name for h in SPEND_FIELD_HINTS):
            resolved["spend"] = fid
        if not resolved["service"] and any(h in name for h in SERVICE_FIELD_HINTS):
            resolved["service"] = fid
    return resolved


def fetch_tagged_contacts(client: httpx.Client, token: str, location_id: str, sleep: float) -> list:
    """Page through the location's contacts; keep those tagged customer:past."""
    out, start_after, start_after_id = [], None, None
    while True:
        params = {"locationId": location_id, "limit": 100}
        if start_after_id:
            params["startAfterId"] = start_after_id
            params["startAfter"] = start_after
        r = request(client, "GET", f"{API_BASE}/contacts/", token, params=params)
        r.raise_for_status()
        body = r.json()
        batch = body.get("contacts") or []
        if not batch:
            break
        for c in batch:
            tags = {t.lower() for t in (c.get("tags") or [])}
            if SOURCE_TAG in tags:
                out.append(c)
        meta = body.get("meta") or {}
        start_after_id = meta.get("startAfterId")
        start_after = meta.get("startAfter")
        if not start_after_id:
            break
        time.sleep(sleep)
    return out


def classify(contact: dict, fields: dict):
    """Return (bucket, reason): eligible | already-tagged | directory | excluded."""
    tags = {t.lower() for t in (contact.get("tags") or [])}
    email = (contact.get("email") or "").strip()

    if not EMAIL_RE.match(email):
        return "excluded", "invalid-or-missing-email"
    hit = tags & EXCLUDE_TAGS
    if hit:
        return "excluded", f"tag:{sorted(hit)[0]}"
    dnd = ((contact.get("dndSettings") or {}).get("Email") or {}).get("status")
    if contact.get("dnd") is True or (dnd or "").lower() == "active":
        return "excluded", "email-dnd"

    reasons = []
    if fields["tx"] and is_positive_number(field_value(contact, fields["tx"])):
        reasons.append("transactions>0")
    if fields["spend"] and is_positive_number(field_value(contact, fields["spend"])):
        reasons.append("spend>0")
    if fields["service"] and field_value(contact, fields["service"]):
        reasons.append("last-service-date")
    if not reasons:
        return "directory", "no-transaction-no-spend-no-service-date"

    if ELIGIBLE_TAG in tags:
        return "already-tagged", "+".join(reasons)
    return "eligible", "+".join(reasons)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help=f"add tag {ELIGIBLE_TAG} (default: dry-run)")
    ap.add_argument("--report", default="reports/review_eligible.csv")
    ap.add_argument("--sleep", type=float, default=0.15, help="pause between API calls")
    ap.add_argument("--tx-field", default="", help="custom-field ID for transaction count")
    ap.add_argument("--spend-field", default="", help="custom-field ID for lifetime spend")
    ap.add_argument("--service-field", default="", help="custom-field ID for last service date")
    args = ap.parse_args()

    token = os.getenv("GHL_API_TOKEN", "").strip()
    location_id = os.getenv("GHL_LOCATION_ID", "").strip()
    if not token or not location_id:
        print("ERROR: GHL_API_TOKEN and GHL_LOCATION_ID must be set in the env.", file=sys.stderr)
        return 2
    if token.startswith(REVOKED_TOKEN_PREFIX):
        print("HALT: GHL_API_TOKEN is still the revoked Aug-2 token. "
              "Set the rotated token and re-run.", file=sys.stderr)
        return 2

    mode = "APPLY" if args.apply else "DRY-RUN"
    client = httpx.Client(timeout=30, headers={
        "Authorization": f"Bearer {token}",
        "Version": API_VERSION,
        "Accept": "application/json",
        "Content-Type": "application/json",
    })

    fields = resolve_fields(client, token, location_id, args)
    missing = [k for k, v in fields.items() if not v]
    if missing:
        print(f"WARNING: no custom field matched for: {', '.join(missing)} — "
              f"that signal can't mark anyone REAL. Pass the field ID explicitly.",
              file=sys.stderr)
    if not any(fields.values()):
        print("ERROR: none of the three real-customer signals resolved to a "
              "custom field; refusing to classify everyone as directory.", file=sys.stderr)
        return 2

    contacts = fetch_tagged_contacts(client, token, location_id, args.sleep)
    print(f"[{mode}] {len(contacts)} contacts tagged {SOURCE_TAG}")

    rows, counts = [], {"eligible": 0, "already-tagged": 0, "directory": 0, "excluded": 0}
    tagged = failed = 0
    for c in contacts:
        bucket, reason = classify(c, fields)
        counts[bucket] += 1
        name = c.get("contactName") or " ".join(
            p for p in [c.get("firstName") or "", c.get("lastName") or ""] if p) or "(no name)"
        rows.append({"name": name, "email": c.get("email") or "", "bucket": bucket, "reason": reason})

        if args.apply and bucket == "eligible":
            r = request(client, "POST", f"{API_BASE}/contacts/{c['id']}/tags", token,
                        json={"tags": [ELIGIBLE_TAG]})
            if r.status_code < 300:
                tagged += 1
            else:
                failed += 1
                print(f"  ✗ {c.get('email')}: {r.status_code} {redact(r.text[:200], token)}",
                      file=sys.stderr)
                if r.status_code in (401, 403):
                    print("  auth rejected — stopping.", file=sys.stderr)
                    break
            time.sleep(args.sleep)

    os.makedirs(os.path.dirname(args.report) or ".", exist_ok=True)
    with open(args.report, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["name", "email", "bucket", "reason"])
        w.writeheader()
        w.writerows(rows)

    real = counts["eligible"] + counts["already-tagged"]
    print(f"[{mode}] real: {real} (new: {counts['eligible']}, "
          f"already tagged: {counts['already-tagged']}) | "
          f"directory: {counts['directory']} | excluded: {counts['excluded']}")
    print(f"report: {args.report}")
    if args.apply:
        print(f"[{mode}] tagged {tagged}, failed {failed}")
    else:
        print(f"Dry-run only — nothing tagged. Re-run with --apply to add {ELIGIBLE_TAG}.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
