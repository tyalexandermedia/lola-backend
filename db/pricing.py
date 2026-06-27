"""
LOLA OS — pricing & roadmap (backend source of truth).

Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
then this file, then frontend/src/lib/pricing.ts and frontend/scripts/gen_lp.py.

Model: a phased growth roadmap (Foundation → Growth → Scale), NOT a generic
monthly SEO package. Replaces the retired "Local Lock" 3-tier model.

  - Foundation Sprint  $297 one-time   (the low-risk front door)
  - Growth Roadmap     $497/mo         (default recurring stage)
  - Scale System       $697/mo         ($997+ competitive markets)

The DB-backed founding counter still powers an honest "first N at the founding
rate" scarcity line in outreach. It now tracks the Growth Roadmap stage.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# ── Roadmap prices (source of truth) ──────────────────────────────
FOUNDATION_PRICE = 297          # one-time
GROWTH_PRICE = 497              # /mo — default recurring stage
SCALE_PRICE = 697              # /mo — standard
SCALE_PRICE_COMPETITIVE = 997   # /mo — competitive / multi-location

PRICE_RANGE = "$297-$997"

# ── Founding-rate counter ─────────────────────────────────────────
# First N Growth Roadmap clients lock the founding rate; after the cap it
# returns to the regular rate. Kept simple and easy to tune.
FOUNDING_CAP = 10
FOUNDING_GROWTH_PRICE = GROWTH_PRICE   # $497 founding
REGULAR_GROWTH_PRICE = 597             # $597 once the cap is hit

# Back-compat aliases (older imports referenced "standard" naming).
FOUNDING_STANDARD_PRICE = FOUNDING_GROWTH_PRICE
REGULAR_STANDARD_PRICE = REGULAR_GROWTH_PRICE

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


async def get_founding_count(tier: str = "growth") -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM founding_signups WHERE tier = ?",
            (tier,),
        ) as cur:
            row = await cur.fetchone()
    return int(row[0]) if row else 0


async def record_founding_signup(email: str, tier: str = "growth") -> int:
    """Record a founding-member signup and return the new count."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO founding_signups (email, tier) VALUES (?, ?)",
            (email, tier),
        )
        await db.commit()
    return await get_founding_count(tier)


def growth_price_for_count(count: int) -> Tuple[int, bool]:
    """
    Returns (monthly_price, founding_active) for the Growth Roadmap stage.
    Founding active while there are slots left; once the cap is hit, the price
    returns to the regular recurring rate.
    """
    if count < FOUNDING_CAP:
        return FOUNDING_GROWTH_PRICE, True
    return REGULAR_GROWTH_PRICE, False


# Back-compat alias — older callers used `standard_price_for_count`.
def standard_price_for_count(count: int) -> Tuple[int, bool]:
    return growth_price_for_count(count)
