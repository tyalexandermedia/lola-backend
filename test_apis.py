"""
Local diagnostic — verify all four Google APIs return live data.

Usage:
    .venv/bin/python test_apis.py

Run this AFTER pasting real API keys into .env. Exits non-zero if any key
is missing or any API call fails.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing api_clients (since module reads env at import time)
load_dotenv(Path(__file__).parent / ".env")

import httpx  # noqa: E402

from api_clients.google_apis import (  # noqa: E402
    ApiBudget,
    get_page_speed,
    get_safe_browsing,
    get_business_info,
    get_competitors,
)

TEST_BUSINESS = "Sandbar Soft Wash"
TEST_CITY = "Palm Harbor, FL"
TEST_URL = "https://sandbarsoftwash.com"
TEST_BUSINESS_TYPE = "soft wash"

REQUIRED_KEYS = [
    "GOOGLE_PAGESPEED_API_KEY",
    "GOOGLE_PLACES_API_KEY",
    "GOOGLE_SAFE_BROWSING_API_KEY",
    "GOOGLE_CUSTOM_SEARCH_API_KEY",
    "GOOGLE_CUSTOM_SEARCH_CX",
]


def _mask(v: str) -> str:
    if not v:
        return "(empty)"
    if len(v) <= 10:
        return v
    return f"{v[:6]}…{v[-4:]}"


def check_keys() -> bool:
    print("\n=== ENV KEY PRESENCE ===")
    placeholders = {"your_key_here", "your_cx_id_here"}
    bad = []
    for k in REQUIRED_KEYS:
        v = (os.getenv(k) or "").strip()
        status = "PLACEHOLDER" if v in placeholders or not v else "SET"
        if status != "SET":
            bad.append(k)
        print(f"  {k:35s} {status:12s} {_mask(v)}")
    if bad:
        print(f"\n❌ {len(bad)} key(s) still set to placeholder/empty: {', '.join(bad)}")
        print("   Real probes will fail until these are real Google Cloud values.\n")
    return not bad


async def main() -> int:
    keys_ok = check_keys()

    async with httpx.AsyncClient() as client:
        budget = ApiBudget(cap=10)

        print("\n=== PAGESPEED ===")
        ps = await get_page_speed(client, TEST_URL, budget)
        print(ps)

        print("\n=== PLACES (NEW v1) ===")
        bi = await get_business_info(client, TEST_BUSINESS, TEST_CITY, budget)
        print(bi)

        print("\n=== SAFE BROWSING ===")
        sb = await get_safe_browsing(client, TEST_URL, budget)
        print(sb)

        print("\n=== CUSTOM SEARCH ===")
        cs = await get_competitors(client, TEST_BUSINESS_TYPE, TEST_CITY, budget)
        print(cs[:2] if cs else cs)

    all_ok = (
        ps.get("ok") and bi.get("ok") and sb.get("ok") and isinstance(cs, list) and len(cs) > 0
    )

    print("\n=== SUMMARY ===")
    print(f"  PageSpeed     ok={ps.get('ok')}")
    print(f"  Places (NEW)  ok={bi.get('ok')}")
    print(f"  Safe Browsing ok={sb.get('ok')}")
    print(f"  Custom Search ok={isinstance(cs, list) and len(cs) > 0}")

    if not keys_ok:
        return 2
    if not all_ok:
        return 1
    print("\n✅ All four APIs are returning live data.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
