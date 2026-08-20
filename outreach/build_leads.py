#!/usr/bin/env python3
"""
Build a cold-outreach lead CSV from Google Places + each business's own website.

    python3 -m outreach.build_leads --trade "roofing contractor" --city "Tampa FL"
    python3 -m outreach.build_leads --config outreach/targets.example.json
    python3 -m outreach.build_leads --trade plumber --city "Clearwater FL" --dry-run

Why this exists: `outreach/leads.py` VALIDATES a leads.csv and `outreach/cli.py`
SENDS from one, but nothing produced one — so the whole outreach machine was
blocked on a file that had to be assembled by hand. This writes that file.

── What it does ──────────────────────────────────────────────────────────
  1. Places textSearch for "<trade> <city>" (the same API the Grader already
     uses, same GOOGLE_PLACES_API_KEY).
  2. Keeps only OPERATIONAL businesses that publish a website.
  3. Fetches each website's home page and a couple of likely contact pages,
     and extracts the first non-role email it finds.
  4. Writes the exact schema outreach/leads.py expects, reusing that module's
     own role-account filter so this can't disagree with the validator.

── What it deliberately does NOT do ──────────────────────────────────────
  • No guessing. If a site publishes no email, the business is skipped rather
    than written as info@theirdomain.com — a fabricated address bounces, and
    bounces are what get a sending domain blocked.
  • No role accounts (info@, sales@, office@…). Low reply rate, high complaint
    rate, and they're usually a shared inbox nobody owns.
  • No contact scraped from anywhere but the business's own public website.
  • No sending. This writes a file. `outreach.cli send` is a separate command
    with its own daily cap and dry-run.

── Politeness ────────────────────────────────────────────────────────────
Sequential, one request at a time, with a delay between sites and a short
timeout. This is someone's small-business web host, not a CDN. It also
identifies itself honestly in the User-Agent rather than pretending to be a
browser, so anyone reading their logs can see who called and why.

Rerunning is safe: --out is only overwritten on success, and --append merges
into an existing file, skipping emails already present.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable, Optional

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from outreach.leads import EMAIL_RE, ROLE_LOCAL_PARTS  # noqa: E402

PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    [
        "places.displayName",
        "places.formattedAddress",
        "places.websiteUri",
        "places.businessStatus",
        "places.nationalPhoneNumber",
    ]
)

UA = "LolaLeadsBot/1.0 (+https://lola.tyalexandermedia.com; ty@tyalexandermedia.com)"

# Pages worth trying after the home page. Ordered by how often a small
# contractor site puts an address on them.
CONTACT_PATHS = ("/contact", "/contact-us", "/about")

EMAIL_IN_PAGE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# Addresses that are never a business owner: image/asset filenames that happen
# to match, and the wrappers used by form builders and CMS templates.
JUNK_EMAIL = re.compile(
    r"(\.(png|jpe?g|gif|svg|webp|css|js)$)|(^[0-9a-f]{16,}@)|(@(sentry|example|test|localhost|wix|squarespace|godaddy)\.)",
    re.I,
)


def is_usable(email: str) -> bool:
    """A real, personal, non-junk address."""
    email = email.strip().lower()
    if not EMAIL_RE.match(email) or JUNK_EMAIL.search(email):
        return False
    # Reuse the validator's own role list so the two can't drift apart.
    return email.split("@", 1)[0] not in ROLE_LOCAL_PARTS


def first_name_from(email: str, business: str) -> str:
    """Best-effort first name, blank when it would be a guess.

    The templates fall back to "there" on a blank, which reads fine. Inventing
    "Hi Roofing," from the business name reads like a mail merge, which is the
    one thing a cold email cannot afford in its first two words.
    """
    local = email.split("@", 1)[0]
    for sep in (".", "_", "-"):
        if sep in local:
            head = local.split(sep, 1)[0]
            if head.isalpha() and 2 <= len(head) <= 15:
                return head.capitalize()
    if local.isalpha() and 2 <= len(local) <= 15 and local not in ROLE_LOCAL_PARTS:
        return local.capitalize()
    return ""


async def places_search(client: httpx.AsyncClient, trade: str, city: str, limit: int) -> list[dict]:
    if not PLACES_KEY:
        raise SystemExit(
            "✗ GOOGLE_PLACES_API_KEY is unset. It's the same key the Grader uses —\n"
            "  export it, or add it to .env, then re-run."
        )
    resp = await client.post(
        PLACES_URL,
        json={"textQuery": f"{trade} in {city}", "maxResultCount": min(limit, 20)},
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": PLACES_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        timeout=20,
    )
    if resp.status_code != 200:
        print(f"  ✗ Places HTTP {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return []
    body = resp.json()
    if "error" in body:
        print(f"  ✗ Places error: {body['error'].get('message', '')}", file=sys.stderr)
        return []
    return body.get("places") or []


async def find_email(client: httpx.AsyncClient, site: str) -> Optional[str]:
    """First usable address on the home page or a likely contact page."""
    base = site.rstrip("/")
    for path in ("",) + CONTACT_PATHS:
        try:
            r = await client.get(base + path, timeout=12, follow_redirects=True)
            if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
                continue
            # mailto: links first — an address a human deliberately published.
            for m in re.findall(r'mailto:([^"\'?>\s]+)', r.text):
                if is_usable(m):
                    return m.strip().lower()
            for m in EMAIL_IN_PAGE.findall(r.text):
                if is_usable(m):
                    return m.strip().lower()
        except Exception:
            continue
    return None


def city_label(addr: str, fallback: str) -> str:
    """'123 Main St, Tampa, FL 33602, USA' -> 'Tampa FL'."""
    parts = [p.strip() for p in (addr or "").split(",")]
    if len(parts) >= 3:
        state = parts[-2].split()[0] if parts[-2].split() else ""
        return f"{parts[-3]} {state}".strip()
    return fallback


async def build(targets: list[tuple[str, str]], limit: int, delay: float, dry_run: bool) -> list[dict]:
    rows: list[dict] = []
    seen_email: set[str] = set()
    seen_site: set[str] = set()

    async with httpx.AsyncClient(headers={"User-Agent": UA}) as client:
        for trade, city in targets:
            print(f"\n▸ {trade} — {city}")
            places = await places_search(client, trade, city, limit)
            print(f"  {len(places)} places returned")
            for p in places:
                if p.get("businessStatus") not in (None, "OPERATIONAL"):
                    continue
                site = (p.get("websiteUri") or "").strip()
                name = (p.get("displayName") or {}).get("text", "").strip()
                if not site or not name:
                    continue
                host = re.sub(r"^https?://(www\.)?", "", site).split("/")[0].lower()
                if host in seen_site:
                    continue
                seen_site.add(host)

                if dry_run:
                    print(f"    · {name:<38} {host}")
                    continue

                email = await find_email(client, site)
                await asyncio.sleep(delay)
                if not email:
                    print(f"    – {name:<38} no published email — skipped")
                    continue
                if email in seen_email:
                    continue
                seen_email.add(email)
                rows.append(
                    {
                        "business_name": name,
                        "owner_first_name": first_name_from(email, name),
                        "website": site,
                        "city": city_label(p.get("formattedAddress", ""), city),
                        "email": email,
                    }
                )
                print(f"    ✓ {name:<38} {email}")
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(prog="build_leads", description=__doc__.split("\n")[1])
    ap.add_argument("--trade", help='e.g. "roofing contractor"')
    ap.add_argument("--city", help='e.g. "Tampa FL"')
    ap.add_argument("--config", help="JSON file: [{'trade': ..., 'city': ...}, …]")
    ap.add_argument("--out", default="leads.csv")
    ap.add_argument("--limit", type=int, default=20, help="places per trade+city (max 20)")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between websites")
    ap.add_argument("--append", action="store_true", help="merge into --out, skipping known emails")
    ap.add_argument("--dry-run", action="store_true", help="list what Places returns; fetch nothing")
    args = ap.parse_args()

    if args.config:
        cfg = json.loads(Path(args.config).read_text())
        targets = [(c["trade"], c["city"]) for c in cfg]
    elif args.trade and args.city:
        targets = [(args.trade, args.city)]
    else:
        ap.error("give --trade and --city, or --config")

    out = Path(args.out)
    existing: list[dict] = []
    known: set[str] = set()
    if args.append and out.exists():
        with out.open() as f:
            existing = list(csv.DictReader(f))
        known = {r["email"].strip().lower() for r in existing if r.get("email")}
        print(f"appending to {out} ({len(existing)} existing)")

    rows = asyncio.run(build(targets, args.limit, args.delay, args.dry_run))
    rows = [r for r in rows if r["email"] not in known]

    if args.dry_run:
        print("\ndry run — nothing fetched, nothing written")
        return 0
    if not rows and not existing:
        print("\nNo leads with a published email. Nothing written.")
        return 1

    fields = ["business_name", "owner_first_name", "website", "city", "email"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in existing + rows:
            w.writerow({k: r.get(k, "") for k in fields})

    print(f"\n✓ {len(rows)} new lead(s) → {out}  ({len(existing) + len(rows)} total)")
    print("\nNext:")
    print(f"  python3 -m outreach.cli preview --variant D --csv {out}")
    print(f"  python3 -m outreach.cli send --csv {out} --dry-run")
    print(f"  python3 -m outreach.cli send --csv {out}      # respects the daily cap")
    return 0


if __name__ == "__main__":
    sys.exit(main())
