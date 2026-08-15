"""
LOLA — pricing & offer (backend source of truth).

Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
then this file, then frontend/src/lib/pricing.ts and frontend/scripts/gen_lp.py.

Model: a simple two-tier offer, both one-time.

  - The monthly  $397/month  "Everything it takes to get you found. One monthly price."

Replaces the retired two-tier one-time model (DIY $197, Full Build $997), which
replaced the Foundation → Growth → Scale roadmap before it.
The Growth Score stays the free, branded, top-of-funnel lead magnet. The optional
There is no separate retainer any more: the monthly IS the offer, and it is public.

The DB-backed counter is retained (function signatures unchanged for import
compatibility) as a simple build-signup counter.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# ── Offer prices (source of truth) ────────────────────────────────
MONTHLY_PRICE = 397        # /month — all-inclusive; the only paid offer
# Back-compat aliases so older imports keep resolving to the live price rather
# than a retired one. Remove once nothing references them.
DIY_PRICE = MONTHLY_PRICE
BUILD_PRICE = MONTHLY_PRICE

# Optional, EMAIL-ONLY retainer. Never surfaced on a page; introduced only in the
# final follow-up email. Modeled here purely so backend copy has one source.
RETAINER_PRICE = MONTHLY_PRICE  # the monthly IS the offer now — no separate retainer

PRICE_RANGE = "$397/month"

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
