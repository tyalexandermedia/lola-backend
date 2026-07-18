#!/usr/bin/env python3
"""
Build Sandbar's ONE-TIME review-request segment in GoHighLevel.

Data-side only. This script NEVER sends an email or SMS and NEVER publishes a
workflow. It reads contacts, classifies them, writes a report, and — only under
``--apply`` — adds the tag ``review-send-eligible`` to genuine past customers.
The actual send is a manual step you take by publishing the GHL workflow.

Pipeline
  1. Pull every contact tagged ``customer:past``.
  2. Classify REAL CUSTOMER vs DIRECTORY:
       real  = Transaction Count > 0  OR  lifetime spend > 0
               OR  a populated "Last service date" custom field.
       directory = none of those signals.
  3. Exclude from eligibility (never tagged, never mailed):
       - Email DND on (contact.dnd or dndSettings.Email.status == active)
       - tag ``exclusion:no-marketing``
       - tag ``sandbar-optout``
       - missing / syntactically-invalid email
  4. Report counts + write the eligible list to reports/review_eligible.csv.
  5. DRY-RUN by default (tags nothing). With --apply, tag ONLY real+eligible
     contacts, idempotently (skip if already tagged), logging each write.

Safe by construction: the write client is only created under --apply, and even
then add_tag is gated inside the GHL client. Directory contacts are never
tagged. Secrets come from the environment only.

Usage
  python3 -m services.build_review_segment                 # dry-run report
  python3 -m services.build_review_segment --apply         # tag real+eligible
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Optional

from services.ghl_client import GHLClient, GHLConfigError

PAST_CUSTOMER_TAG = "customer:past"
ELIGIBLE_TAG = "review-send-eligible"
EXCLUSION_TAGS = {"exclusion:no-marketing", "sandbar-optout"}
DEFAULT_OUT = "reports/review_eligible.csv"

# Custom-field name signals (matched case-insensitively, substring). Square
# exports commonly name these "Transaction Count", "Total Spend"/"Lifetime
# Spend", and "Last Service Date".
TXN_COUNT_HINTS = ("transaction count", "transactions", "txn count")
SPEND_HINTS = ("lifetime spend", "total spend", "lifetime value", "ltv")
LAST_SERVICE_HINTS = ("last service date", "last service", "last job date")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_email(email: str) -> bool:
    return bool(email and _EMAIL_RE.match(email.strip()))


def _to_float(v: object) -> float:
    if v is None:
        return 0.0
    try:
        return float(str(v).replace("$", "").replace(",", "").strip() or 0)
    except (TypeError, ValueError):
        return 0.0


@dataclass
class FieldMap:
    """Resolved custom-field ids for the signals we classify on."""
    txn_count_ids: set = field(default_factory=set)
    spend_ids: set = field(default_factory=set)
    last_service_ids: set = field(default_factory=set)

    @classmethod
    def from_definitions(cls, defs: list[dict]) -> "FieldMap":
        fm = cls()
        for d in defs:
            name = (d.get("name") or d.get("fieldKey") or "").lower()
            fid = d.get("id")
            if not fid:
                continue
            if any(h in name for h in TXN_COUNT_HINTS):
                fm.txn_count_ids.add(fid)
            if any(h in name for h in SPEND_HINTS):
                fm.spend_ids.add(fid)
            if any(h in name for h in LAST_SERVICE_HINTS):
                fm.last_service_ids.add(fid)
        return fm

    def missing_signals(self) -> list[str]:
        miss = []
        if not self.txn_count_ids:
            miss.append("Transaction Count")
        if not self.spend_ids:
            miss.append("Lifetime/Total Spend")
        if not self.last_service_ids:
            miss.append("Last service date")
        return miss


def _cf_values(contact: dict) -> dict[str, str]:
    """Flatten a contact's customFields list into {id: value}."""
    out: dict[str, str] = {}
    for cf in contact.get("customFields", []) or []:
        fid = cf.get("id")
        val = cf.get("value", cf.get("fieldValue"))
        if fid is not None:
            out[fid] = "" if val is None else str(val)
    return out


def _tags(contact: dict) -> set[str]:
    return {str(t).strip().lower() for t in (contact.get("tags") or [])}


def email_dnd_on(contact: dict) -> bool:
    if contact.get("dnd") is True:  # global DND blocks all channels
        return True
    email_dnd = (contact.get("dndSettings") or {}).get("Email") or {}
    return str(email_dnd.get("status", "")).lower() == "active"


@dataclass
class Classified:
    contact: dict
    is_real: bool
    reasons: list[str]
    excluded: bool
    exclude_reasons: list[str]

    @property
    def name(self) -> str:
        c = self.contact
        n = c.get("name") or " ".join(
            p for p in [c.get("firstName", ""), c.get("lastName", "")] if p
        )
        return n.strip()

    @property
    def email(self) -> str:
        return (self.contact.get("email") or "").strip()


def classify(contact: dict, fm: FieldMap) -> Classified:
    cf = _cf_values(contact)
    reasons: list[str] = []

    txn = max((_to_float(cf.get(i)) for i in fm.txn_count_ids), default=0.0)
    spend = max((_to_float(cf.get(i)) for i in fm.spend_ids), default=0.0)
    last_service = next(
        (cf[i] for i in fm.last_service_ids if cf.get(i, "").strip()), ""
    )
    if txn > 0:
        reasons.append(f"transaction_count={int(txn)}")
    if spend > 0:
        reasons.append(f"lifetime_spend={spend:g}")
    if last_service:
        reasons.append(f"last_service_date={last_service}")
    is_real = bool(reasons)

    # Eligibility exclusions.
    excl: list[str] = []
    if email_dnd_on(contact):
        excl.append("email_dnd")
    bad_tags = _tags(contact) & EXCLUSION_TAGS
    excl.extend(sorted(bad_tags))
    if not valid_email(contact.get("email") or ""):
        excl.append("missing_or_invalid_email")

    return Classified(
        contact=contact,
        is_real=is_real,
        reasons=reasons,
        excluded=bool(excl),
        exclude_reasons=excl,
    )


def run(args: argparse.Namespace) -> int:
    apply = args.apply
    try:
        client = GHLClient(allow_writes=apply, debug=args.debug)
    except GHLConfigError as e:
        print(f"HALT (precondition unmet): {e}", file=sys.stderr)
        return 2

    with client:
        defs = client.list_custom_fields()
        fm = FieldMap.from_definitions(defs)
        missing = fm.missing_signals()
        if missing:
            print(
                "⚠️  No custom field matched these signals: "
                + ", ".join(missing)
                + ". Contacts relying only on a missing signal will be "
                  "treated as DIRECTORY. Review field names before --apply.",
                file=sys.stderr,
            )

        classified: list[Classified] = []
        for i, contact in enumerate(client.search_contacts(PAST_CUSTOMER_TAG)):
            if args.limit and i >= args.limit:
                break
            classified.append(classify(contact, fm))

    total = len(classified)
    real = [c for c in classified if c.is_real]
    directory = [c for c in classified if not c.is_real]
    # Eligible = real customer, not excluded.
    eligible = [c for c in real if not c.excluded]
    real_excluded = [c for c in real if c.excluded]

    # --- report + CSV -----------------------------------------------------
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["name", "email", "reason"])
        for c in eligible:
            w.writerow([c.name, c.email, "; ".join(c.reasons)])

    mode = "APPLY" if apply else "DRY-RUN"
    print("=" * 64)
    print(f"[{mode}] Sandbar review-request segment")
    print("=" * 64)
    print(f"  contacts tagged '{PAST_CUSTOMER_TAG}' : {total}")
    print(f"  real customers                       : {len(real)}")
    print(f"  directory (no txn signal)            : {len(directory)}")
    print(f"  real but EXCLUDED (dnd/optout/email)  : {len(real_excluded)}")
    print(f"  → eligible (real & mailable)         : {len(eligible)}")
    print(f"  CSV of eligible list                 : {args.out}")
    print("-" * 64)

    # --- tagging ----------------------------------------------------------
    tagged = skipped_already = 0
    if not eligible:
        print("Nothing eligible to tag.")
    elif not apply:
        print(f"DRY-RUN — would tag {len(eligible)} contacts '{ELIGIBLE_TAG}':")
        for c in eligible[:20]:
            print(f"    WOULD TAG  {c.email:<38} [{'; '.join(c.reasons)}]")
        if len(eligible) > 20:
            print(f"    … and {len(eligible) - 20} more (see {args.out}).")
    else:
        for c in eligible:
            if ELIGIBLE_TAG in _tags(c.contact):
                skipped_already += 1
                continue
            client_w = GHLClient(allow_writes=True, debug=args.debug)
            try:
                client_w.add_tag(c.contact["id"], ELIGIBLE_TAG)
                tagged += 1
                print(f"    TAGGED  {c.email:<38} [{'; '.join(c.reasons)}]")
            finally:
                client_w.close()
        print(f"  applied: {tagged} newly tagged, "
              f"{skipped_already} already had the tag.")

    # --- Phase 3 safety report -------------------------------------------
    print("-" * 64)
    print("SAFETY CONFIRMATION")
    print("  emails sent from code ........ 0")
    print("  SMS sent from code ........... 0 (A2P pending — SMS stays off)")
    print("  workflows published .......... 0")
    print(f"  directory contacts touched ... 0 (of {len(directory)})")
    print(f"  opt-outs / DND excluded ...... {len(real_excluded)} real customers held back")
    print("=" * 64)

    # --- items needing operator input ------------------------------------
    bad_emails = [c for c in real if "missing_or_invalid_email" in c.exclude_reasons]
    if bad_emails or missing:
        print("NEEDS YOUR INPUT:")
        if missing:
            print(f"  • Unmatched custom fields: {', '.join(missing)} — confirm "
                  "the exact GHL field names so classification isn't undercounting.")
        if bad_emails:
            print(f"  • {len(bad_emails)} real customers have a missing/invalid "
                  "email and were excluded — fix in GHL if you want them mailed.")

    print()
    print("NEXT MANUAL STEP (the only send action — done by YOU in GHL):")
    print(f"  1. In GHL, open the smart list filtered to tag '{ELIGIBLE_TAG}'.")
    print(f"  2. Confirm the count matches {len(eligible)} above.")
    print("  3. Publish/enable the review-request EMAIL workflow for that tag.")
    print("  4. Leave SMS disabled until A2P 10DLC shows Approved.")
    return 0


def build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true",
                    help="actually add the eligible tag (default: dry-run)")
    ap.add_argument("--out", default=DEFAULT_OUT, help="eligible-list CSV path")
    ap.add_argument("--limit", type=int, default=0,
                    help="process at most N contacts (testing)")
    ap.add_argument("--debug", action="store_true", help="verbose (token redacted)")
    return ap


if __name__ == "__main__":
    raise SystemExit(run(build_arg_parser().parse_args()))
