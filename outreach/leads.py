"""
CSV ingestion + email validation for cold outreach.

CSV schema (header row required):

    business_name,owner_first_name,website,city,email

Validation drops:
  - empty / malformed emails
  - role accounts (info@, sales@, hello@, etc.)
  - obvious junk (bare-tld, no @)
"""

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, List

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Filter out generic role addresses — low reply rate + high spam complaint rate.
ROLE_LOCAL_PARTS = {
    "info", "sales", "contact", "hello", "admin", "support",
    "billing", "marketing", "office", "team", "service",
    "noreply", "no-reply", "donotreply", "webmaster", "postmaster",
    "abuse", "spam",
}


@dataclass
class Lead:
    business_name: str
    owner_first_name: str
    website: str
    city: str
    email: str


def _normalize(s: str) -> str:
    return (s or "").strip()


def is_valid_business_email(email: str) -> bool:
    """True only if it looks like a real person's inbox."""
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        return False
    local = email.split("@", 1)[0]
    # Strip plus-addressing for the role check
    local_root = local.split("+", 1)[0]
    if local_root in ROLE_LOCAL_PARTS:
        return False
    return True


def read_leads_csv(path: Path) -> List[Lead]:
    """Read a leads CSV and return validated Lead objects."""
    leads: List[Lead] = []
    seen_emails = set()  # dedupe within the file itself
    with open(path, "r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = _normalize(row.get("email")).lower()
            if not email or email in seen_emails:
                continue
            if not is_valid_business_email(email):
                continue
            seen_emails.add(email)
            leads.append(
                Lead(
                    business_name=_normalize(row.get("business_name")),
                    owner_first_name=_normalize(row.get("owner_first_name")),
                    website=_normalize(row.get("website")),
                    city=_normalize(row.get("city")),
                    email=email,
                )
            )
    return leads


def chunks_of(items: List[Lead], n: int) -> Iterator[List[Lead]]:
    for i in range(0, len(items), n):
        yield items[i : i + n]
