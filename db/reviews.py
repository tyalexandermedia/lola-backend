"""
Lola — Review capture (internal MVP) storage.

Two tables:

    businesses        one row per client we manage. Ty creates these via
                      admin endpoints. Holds Google Place ID, owner contact,
                      and brand-styling hints for the public feedback page.
    review_requests   one row per outbound feedback ask. Tracks the full
                      funnel: sent → opened → rated → routed (Google or
                      private feedback to the owner).

Schema is locked by the public contract at /reviews/*. All timestamps are
ISO-8601 UTC strings to match db/outreach.py conventions (datetime('now')
is used for SQL-side stamps; Python writes use
`datetime.now(timezone.utc).isoformat()` to be explicit).
"""

import os
from datetime import datetime, timezone
from typing import List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")


CREATE_BUSINESSES = """
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    google_place_id TEXT NOT NULL,
    google_review_url TEXT,
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    brand_primary_color TEXT DEFAULT '#0a66c2',
    logo_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

CREATE_REVIEW_REQUESTS = """
CREATE TABLE IF NOT EXISTS review_requests (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    channel TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    opened_at TEXT,
    rating INTEGER,
    rating_at TEXT,
    routed TEXT,
    private_feedback TEXT,
    private_feedback_at TEXT,
    redirected_to_google_at TEXT,
    notes TEXT
);
"""

CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_review_requests_business ON review_requests(business_id);
"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def init_reviews_tables():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_BUSINESSES)
        await db.execute(CREATE_REVIEW_REQUESTS)
        for stmt in CREATE_INDEXES.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Reviews tables ready at {DB_PATH}")


# ── Businesses ─────────────────────────────────────────────


async def upsert_business(
    *,
    id: str,
    name: str,
    industry: Optional[str],
    google_place_id: str,
    google_review_url: Optional[str],
    owner_email: str,
    owner_phone: Optional[str],
    brand_primary_color: Optional[str],
    logo_url: Optional[str],
) -> dict:
    now = _now_iso()
    color = brand_primary_color or "#0a66c2"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            """
            INSERT INTO businesses
              (id, name, industry, google_place_id, google_review_url,
               owner_email, owner_phone, brand_primary_color, logo_url,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                industry = excluded.industry,
                google_place_id = excluded.google_place_id,
                google_review_url = excluded.google_review_url,
                owner_email = excluded.owner_email,
                owner_phone = excluded.owner_phone,
                brand_primary_color = excluded.brand_primary_color,
                logo_url = excluded.logo_url,
                updated_at = excluded.updated_at
            """,
            (
                id, name, industry, google_place_id, google_review_url,
                owner_email, owner_phone, color, logo_url, now, now,
            ),
        )
        await db.commit()
        async with db.execute(
            "SELECT * FROM businesses WHERE id = ?", (id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else {}


async def get_business(business_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM businesses WHERE id = ?", (business_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def list_businesses() -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM businesses ORDER BY created_at DESC"
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


# ── Review requests ────────────────────────────────────────


async def create_review_request(
    *,
    request_id: str,
    business_id: str,
    customer_name: Optional[str],
    customer_email: Optional[str],
    customer_phone: Optional[str],
    channel: str,
) -> dict:
    now = _now_iso()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            """
            INSERT INTO review_requests
              (id, business_id, customer_name, customer_email, customer_phone,
               channel, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request_id, business_id, customer_name, customer_email,
                customer_phone, channel, now,
            ),
        )
        await db.commit()
        async with db.execute(
            "SELECT * FROM review_requests WHERE id = ?", (request_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else {}


async def get_review_request(request_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM review_requests WHERE id = ?", (request_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def mark_opened(request_id: str) -> None:
    """Stamp opened_at on the first /config hit. Idempotent."""
    now = _now_iso()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE review_requests
            SET opened_at = ?
            WHERE id = ? AND opened_at IS NULL
            """,
            (now, request_id),
        )
        await db.commit()


async def record_rating(request_id: str, rating: int, routed: str) -> None:
    now = _now_iso()
    async with aiosqlite.connect(DB_PATH) as db:
        # Last write wins on rating (matches the feedback-idempotency rule).
        await db.execute(
            """
            UPDATE review_requests
            SET rating = ?,
                rating_at = ?,
                routed = ?,
                redirected_to_google_at = CASE
                    WHEN ? = 'google' THEN ?
                    ELSE redirected_to_google_at
                END
            WHERE id = ?
            """,
            (rating, now, routed, routed, now, request_id),
        )
        await db.commit()


async def record_feedback(request_id: str, message: str) -> None:
    """Idempotent — last write wins on private feedback."""
    now = _now_iso()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE review_requests
            SET private_feedback = ?,
                private_feedback_at = ?
            WHERE id = ?
            """,
            (message, now, request_id),
        )
        await db.commit()


async def list_review_requests(
    business_id: Optional[str] = None, limit: int = 50
) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if business_id:
            async with db.execute(
                """
                SELECT * FROM review_requests
                WHERE business_id = ?
                ORDER BY sent_at DESC
                LIMIT ?
                """,
                (business_id, limit),
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute(
                """
                SELECT * FROM review_requests
                ORDER BY sent_at DESC
                LIMIT ?
                """,
                (limit,),
            ) as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]
