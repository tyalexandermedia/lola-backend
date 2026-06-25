"""
Lola SEO — founding-member pricing.

DB-backed counter so the founding-member discount can't run past the cap.
The frontend reads `/pricing` to render the Standard tier price + the
"First N clients" tag dynamically.

One price: $697/mo for the Standard (Lola) plan — no founding ramp. The
founding counter still tracks the "first 10 clients" urgency tag, but the
price is flat $697 whether founding is active or not. Multi-Market and Social
are add-ons on top, not separate tiers.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

FOUNDING_CAP = 10
FOUNDING_STANDARD_PRICE = 697
REGULAR_STANDARD_PRICE = 697

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


async def get_founding_count(tier: str = "standard") -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM founding_signups WHERE tier = ?",
            (tier,),
        ) as cur:
            row = await cur.fetchone()
    return int(row[0]) if row else 0


async def record_founding_signup(email: str, tier: str) -> int:
    """Record a founding-member signup and return the new count."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO founding_signups (email, tier) VALUES (?, ?)",
            (email, tier),
        )
        await db.commit()
    return await get_founding_count(tier)


def standard_price_for_count(count: int) -> Tuple[int, bool]:
    """
    Returns (monthly_price, founding_active). Founding active while there are
    slots left; once the cap is hit, price jumps to the regular tier.
    """
    if count < FOUNDING_CAP:
        return FOUNDING_STANDARD_PRICE, True
    return REGULAR_STANDARD_PRICE, False
