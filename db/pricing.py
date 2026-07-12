"""
LOLA — pricing & offer (backend source of truth).

Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
then this file, then frontend/src/lib/pricing.ts and frontend/scripts/gen_lp.py.

Model: a simple two-tier offer, both one-time.

  - DIY         $197 one-time   "See your score. Fix it yourself."
  - Full Build  $997 one-time   "We build it. We rank it — everywhere people search now."

Replaces the retired Foundation → Growth → Scale roadmap ($297 / $497 / $697 / $997+).
The Growth Score stays the free, branded, top-of-funnel lead magnet. The optional
$297/mo retainer is introduced ONLY in the final follow-up email, never modeled as a tier.

The DB-backed counter is retained (function signatures unchanged for import
compatibility) as a simple build-signup counter.
"""

import os
from typing import Tuple

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# ── Offer prices (source of truth) ────────────────────────────────
DIY_PRICE = 197            # one-time — Growth Score + 5-step fix-it checklist
BUILD_PRICE = 997          # one-time — Full Build (site + 30-day visibility + GBP + Ty access)

# Optional, EMAIL-ONLY retainer. Never surfaced on a page; introduced only in the
# final follow-up email. Modeled here purely so backend copy has one source.
RETAINER_PRICE = 297       # /mo — totally optional ongoing management (D-013: $297 canonical)

PRICE_RANGE = "$197-$997"

# ── Signup counter ────────────────────────────────────────────────
# Retained for import compatibility with main.py. No longer drives a monthly
# founding rate (the two-tier offer is one-time), but kept as a simple counter.
FOUNDING_CAP = 10
FOUNDING_STANDARD_PRICE = BUILD_PRICE
REGULAR_STANDARD_PRICE = BUILD_PRICE

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
    Returns (price, founding_active). The two-tier offer is one-time, so this
    always returns the Full Build price and False (no monthly founding rate).
    Kept for import compatibility.
    """
    return BUILD_PRICE, False


# Back-compat alias — older callers used `standard_price_for_count`.
def standard_price_for_count(count: int) -> Tuple[int, bool]:
    return growth_price_for_count(count)
