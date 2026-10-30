"""
Coach Ty Leads — pricing & offer (backend source of truth).

Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
then this file, then frontend/src/lib/pricing.ts and frontend/scripts/gen_lp.py.

Model (2026-10-30): a free Growth Score diagnostic + one flagship plan + a custom
Expansion route.

  - Local Growth System  $497/month + a one-time setup from $497 (website built in)
  - Expansion            custom, from $1,497/month

Replaces the $397/$797 two-plan model (Local Visibility + Local Growth System),
which replaced the single $397 all-inclusive plan. The Growth Score stays the
free, branded, top-of-funnel diagnostic.

The DB-backed counter is retained (function signatures unchanged for import
compatibility) as a simple build-signup counter.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# ── Offer prices (source of truth) ────────────────────────────────
# One flagship plan: the Local Growth System at $497/month + a one-time setup
# from $497 (simple website build included; complex sites/migrations quoted).
GROWTH_PRICE = 497             # Local Growth System — $/month
GROWTH_SETUP = 497             # one-time setup (a "from" floor)
EXPANSION_FROM = 1497          # Expansion — custom, from $/month

# The live Stripe subscription amount is validated in main.py by
# STRIPE_MONTHLY_AMOUNT (env, in cents), independent of these display constants.
MONTHLY_PRICE = GROWTH_PRICE
# Back-compat aliases so older imports keep resolving to the live price. The
# retired $397 "Local Visibility" and its activation now alias the one plan.
VISIBILITY_PRICE = GROWTH_PRICE
VISIBILITY_ACTIVATION = GROWTH_SETUP
GROWTH_LAUNCH = GROWTH_SETUP   # legacy name for the one-time setup
DIY_PRICE = GROWTH_PRICE
BUILD_PRICE = GROWTH_PRICE
RETAINER_PRICE = GROWTH_PRICE

PRICE_RANGE = "$497/month"

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
