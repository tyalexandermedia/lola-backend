"""
Cold outreach CLI.

Usage:
    python -m outreach.cli send --csv leads.csv [--dry-run]
    python -m outreach.cli status [--days 7]
    python -m outreach.cli suppress --email foo@bar.com [--reason replied]
    python -m outreach.cli preview --variant A --csv leads.csv

The `send` command honors the daily cap (10/25/50 based on warmup phase) and
the suppression list. Run it once per day via cron or `loop`.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing modules that read env at import time
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from db.outreach import (  # noqa: E402
    init_outreach_tables,
    stats,
    suppress,
    recent_sends,
)
from outreach.leads import read_leads_csv  # noqa: E402
from outreach.sender import run_batch, send_one  # noqa: E402
from outreach.templates import VARIANTS  # noqa: E402
from outreach.warmup import daily_cap_for_today, warmup_phase  # noqa: E402


async def cmd_send(args: argparse.Namespace) -> int:
    await init_outreach_tables()
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}")
        return 2
    leads = read_leads_csv(csv_path)
    if not leads:
        print(f"❌ No valid leads parsed from {csv_path}")
        return 2

    print(f"📬 Loaded {len(leads)} valid leads from {csv_path.name}")
    print(f"   Warmup phase: {warmup_phase()} (cap = {daily_cap_for_today()}/day)")
    if args.dry_run:
        print("   DRY RUN — no Resend calls, no DB writes\n")

    result = await run_batch(leads, dry_run=args.dry_run)
    print(json.dumps(result, indent=2))
    return 0


async def cmd_status(args: argparse.Namespace) -> int:
    await init_outreach_tables()
    s = await stats(days=args.days)
    print(json.dumps(s, indent=2))
    if args.verbose:
        print("\nRecent sends:")
        for row in await recent_sends(limit=10):
            print(f"  {row['sent_at']}  [{row['variant']}]  {row['email']:<40s} {row['status']}")
    return 0


async def cmd_suppress(args: argparse.Namespace) -> int:
    await init_outreach_tables()
    await suppress(args.email, reason=args.reason)
    print(f"✅ Suppressed {args.email} ({args.reason})")
    return 0


async def cmd_preview(args: argparse.Namespace) -> int:
    """Dry-render a single variant for a CSV's first lead, no send."""
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}")
        return 2
    leads = read_leads_csv(csv_path)
    if not leads:
        print("❌ No valid leads.")
        return 2

    import httpx

    async with httpx.AsyncClient() as client:
        ok, _, subject, body, _alias = await send_one(client, leads[0], args.variant, dry_run=True)
    print(f"--- variant {args.variant} preview for {leads[0].email} ---")
    print(f"Subject: {subject}\n")
    print(body)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="outreach")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_send = sub.add_parser("send", help="Send a batch from CSV (respects daily cap).")
    p_send.add_argument("--csv", required=True)
    p_send.add_argument("--dry-run", action="store_true")
    p_send.set_defaults(func=cmd_send)

    p_status = sub.add_parser("status", help="Aggregate stats by variant.")
    p_status.add_argument("--days", type=int, default=7)
    p_status.add_argument("--verbose", action="store_true")
    p_status.set_defaults(func=cmd_status)

    p_supp = sub.add_parser("suppress", help="Add an email to the suppression list.")
    p_supp.add_argument("--email", required=True)
    p_supp.add_argument("--reason", default="manual")
    p_supp.set_defaults(func=cmd_suppress)

    p_preview = sub.add_parser("preview", help="Render one variant for the first CSV lead.")
    p_preview.add_argument("--csv", required=True)
    p_preview.add_argument("--variant", choices=list(VARIANTS.keys()), default="A")
    p_preview.set_defaults(func=cmd_preview)

    args = parser.parse_args()
    return asyncio.run(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
