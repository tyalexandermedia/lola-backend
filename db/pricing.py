"""
Coach Ty Leads — pricing & offer (backend source of truth).

Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
then this file, then frontend/src/lib/pricing.ts and frontend/scripts/gen_lp.py.

Model (2026-09-12): a free Growth Score diagnostic + two paid plans + a custom
Expansion route.

  - Local Visibility     $397/month + $397 one-time activation
  - Local Growth System  $797/month + $997 one-time launch   (recommended)
  - Expansion            custom, from $1,497/month

Replaces the single $397 all-inclusive plan (website included free, 90-Day
Promise), which replaced the two-tier one-time model (DIY $197, Full Build $997).
The Growth Score stays the free, branded, top-of-funnel diagnostic.

The DB-backed counter is retained (function signatures unchanged for import
compatibility) as a simple build-signup counter.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# ── Offer prices (source of truth) ────────────────────────────────
VISIBILITY_PRICE = 397         # Local Visibility — $/month
VISIBILITY_ACTIVATION = 397    # one-time activation
GROWTH_PRICE = 797             # Local Growth System — $/month (recommended)
GROWTH_LAUNCH = 997            # one-time launch
EXPANSION_FROM = 1497          # Expansion — custom, from $/month

# The live Stripe subscription (and its webhook validation) is $397/month, which
# equals the Local Visibility monthly. Older imports referencing MONTHLY_PRICE
# resolve to that entry price.
MONTHLY_PRICE = VISIBILITY_PRICE
# Back-compat aliases so older imports keep resolving to a live price.
DIY_PRICE = VISIBILITY_PRICE
BUILD_PRICE = GROWTH_PRICE
RETAINER_PRICE = GROWTH_PRICE

PRICE_RANGE = "$397–$797/month"

# ── Signup counter ────────────────────────────────────────────────
# Retained for import compatibility with main.py. Kept as a simple counter.
FOUNDING_CAP = 10
FOUNDING_STANDARD_PRICE = MONTHLY_PRICE
REGULAR_STANDARD_PRICE = MONTHLY_PRICE

CREATE_FOUNDING = """
CREATE TABLE IF NOT EXISTS founding_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    tier TEXT NOT NULL,
    claimed_at TEXT DEFAULT (datetime('now'))
);
"""


async def init_pricing_table():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_FOUNDING)
        await db.commit()
    print(f"✅ Pricing table ready at {DB_PATH}")


async def get_founding_count(tier: str = "build") -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM founding_signups WHERE tier = ?",
            (tier,),
        ) as cur:
            row = await cur.fetchone()
    return int(row[0]) if row else 0


async def record_founding_signup(email: str, tier: str = "build") -> int:
    """Record a signup and return the new count."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO founding_signups (email, tier) VALUES (?, ?)",
            (email, tier),
        )
        await db.commit()
    return await get_founding_count(tier)


def growth_price_for_count(count: int) -> Tuple[int, bool]:
    """
    Returns (price, founding_active). One published monthly price for everyone,
    so this always returns it with False. Kept for import compatibility.
    """
    return MONTHLY_PRICE, False


# Back-compat alias — older callers used `standard_price_for_count`.
def standard_price_for_count(count: int) -> Tuple[int, bool]:
    return growth_price_for_count(count)
