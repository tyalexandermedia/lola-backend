"""
Growth Score follow-up sequence — persistent state + queue.

Every Growth Score / audit submission that leaves us a phone or an email gets
enrolled here. A background runner (followup/runner.py) walks each lead through
a fixed cadence — nudge → guarantee → final email — unless they buy or opt out.

Two safety properties by construction:
  1. Enrollment only happens for NEW submissions, so switching the runner on
     never retro-blasts the back catalogue of old leads.
  2. `INSERT OR IGNORE` keyed on audit_id means re-enrolling is a no-op.
"""

import os
import time
import aiosqlite
from typing import List, Optional

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS growth_followups (
    audit_id      TEXT PRIMARY KEY,
    kind          TEXT NOT NULL DEFAULT 'score',  -- 'score' (prospect) | 'build' (post-build → $297/mo)
    email         TEXT,
    phone         TEXT,
    sms_consent   INTEGER NOT NULL DEFAULT 0,
    business_name TEXT,
    report_url    TEXT,
    created_at    REAL NOT NULL,
    step          INTEGER NOT NULL DEFAULT 0,   -- steps already sent (0..3)
    next_at       REAL,                          -- epoch when the next step is due
    purchased     INTEGER NOT NULL DEFAULT 0,
    opted_out     INTEGER NOT NULL DEFAULT 0,
    done          INTEGER NOT NULL DEFAULT 0
);
"""

CREATE_IDX = (
    "CREATE INDEX IF NOT EXISTS idx_followup_due "
    "ON growth_followups(done, purchased, opted_out, next_at);"
)


async def init_followups_table() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_TABLE)
        await db.execute(CREATE_IDX)
        # Migration: add `kind` to tables created before the build-nurture split.
        cur = await db.execute("PRAGMA table_info(growth_followups)")
        cols = {row[1] for row in await cur.fetchall()}
        if "kind" not in cols:
            await db.execute(
                "ALTER TABLE growth_followups ADD COLUMN kind TEXT NOT NULL DEFAULT 'score'"
            )
        await db.commit()
    print(f"✅ Growth-Score follow-ups table ready at {DB_PATH}")


async def enroll(
    *,
    audit_id: str,
    email: str,
    phone: str,
    sms_consent: bool,
    business_name: str,
    report_url: str,
    first_delay_sec: float,
    kind: str = "score",
) -> None:
    """Enroll one lead. No-op if there's no contact channel or it already exists."""
    email = (email or "").strip().lower()
    phone = (phone or "").strip()
    if not audit_id or (not email and not phone):
        return
    now = time.time()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO growth_followups
               (audit_id, kind, email, phone, sms_consent, business_name, report_url,
                created_at, step, next_at, purchased, opted_out, done)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0)""",
            (
                audit_id,
                kind or "score",
                email,
                phone,
                1 if sms_consent else 0,
                business_name or "",
                report_url or "",
                now,
                now + max(0.0, first_delay_sec),
            ),
        )
        await db.commit()


async def due(now: Optional[float] = None, limit: int = 100) -> List[dict]:
    """Rows whose next step is due and who are still active (not bought/opted-out/done)."""
    now = now if now is not None else time.time()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """SELECT * FROM growth_followups
               WHERE done = 0 AND purchased = 0 AND opted_out = 0
                 AND next_at IS NOT NULL AND next_at <= ?
               ORDER BY next_at ASC LIMIT ?""",
            (now, limit),
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def advance(audit_id: str, *, step: int, next_at: Optional[float], done: bool) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE growth_followups SET step = ?, next_at = ?, done = ? WHERE audit_id = ?",
            (step, next_at, 1 if done else 0, audit_id),
        )
        await db.commit()


async def mark_purchased(*, email: str = "", phone: str = "", kind: str = "score") -> None:
    """
    Stop a sequence for a converted buyer (matched by email and/or phone).

    Scoped by `kind` so buying the $997 build stops only the prospect ('score')
    sequence — not the post-build ('build') sequence that pitches the $297/mo
    continuity. Pass kind='build' when the monthly retainer itself is purchased.
    """
    email = (email or "").strip().lower()
    phone = (phone or "").strip()
    if not email and not phone:
        return
    async with aiosqlite.connect(DB_PATH) as db:
        if email:
            await db.execute(
                "UPDATE growth_followups SET purchased = 1 WHERE email = ? AND kind = ?",
                (email, kind),
            )
        if phone:
            await db.execute(
                "UPDATE growth_followups SET purchased = 1 WHERE phone = ? AND kind = ?",
                (phone, kind),
            )
        await db.commit()


async def mark_opted_out(*, phone: str = "", email: str = "") -> None:
    phone = (phone or "").strip()
    email = (email or "").strip().lower()
    if not email and not phone:
        return
    async with aiosqlite.connect(DB_PATH) as db:
        if phone:
            await db.execute(
                "UPDATE growth_followups SET opted_out = 1 WHERE phone = ?", (phone,)
            )
        if email:
            await db.execute(
                "UPDATE growth_followups SET opted_out = 1 WHERE email = ?", (email,)
            )
        await db.commit()


async def stats() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """SELECT
                 COUNT(*) AS total,
                 SUM(CASE WHEN purchased = 1 THEN 1 ELSE 0 END) AS purchased,
                 SUM(CASE WHEN opted_out = 1 THEN 1 ELSE 0 END) AS opted_out,
                 SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) AS done,
                 SUM(CASE WHEN done = 0 AND purchased = 0 AND opted_out = 0 THEN 1 ELSE 0 END) AS active
               FROM growth_followups"""
        )
        row = await cur.fetchone()
        return {k: (row[k] or 0) for k in row.keys()} if row else {}
