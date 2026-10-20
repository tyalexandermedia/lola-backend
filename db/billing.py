"""
Billing idempotency — guards Stripe webhook fulfillment against duplicate
deliveries (Stripe retries a webhook until it gets a 2xx, so the same paid
checkout.session.completed can arrive more than once).

Self-initializing: the table is created on first use, so there's no startup
wiring to add. Best-effort by design — if the store is unreachable we fulfill
rather than block a real sale.
"""

import os

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

_CREATE = """
CREATE TABLE IF NOT EXISTS fulfilled_checkout_sessions (
    session_id   TEXT PRIMARY KEY,
    fulfilled_at TEXT DEFAULT (datetime('now'))
);
"""


async def claim_checkout_session(session_id: str) -> bool:
    """
    Atomically claim a Stripe checkout session for fulfillment.

    Returns True when this session has NOT been fulfilled before (and records
    the claim), False when it already has (a duplicate delivery → skip). On a
    blank id or any storage error, returns True so a storage hiccup never blocks
    a genuine purchase from being fulfilled.
    """
    if not session_id:
        return True
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(_CREATE)
            try:
                await db.execute(
                    "INSERT INTO fulfilled_checkout_sessions (session_id) VALUES (?)",
                    (session_id,),
                )
                await db.commit()
                return True
            except aiosqlite.IntegrityError:
                # PRIMARY KEY collision → already fulfilled.
                return False
    except Exception as e:
        print(f"⚠️ claim_checkout_session storage error ({session_id}): {e}")
        return True
