"""
Lola SEO — Cold outreach (Agent 4) storage.

Two tables:

    cold_outreach_log    one row per outbound send. Joined to audit
                         conversions by email match.
    cold_suppression     unsubscribe + reply + audit-conversion list.
                         Sender refuses to send if email is here.

Phase 1 keeps reply detection MANUAL: when you see a reply in your inbox,
run `python -m outreach.cli suppress --email foo@bar.com --reason replied`.
That keeps the schema honest about what we actually know.
"""

import os
from typing import List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")


CREATE_OUTREACH_LOG = """
CREATE TABLE IF NOT EXISTS cold_outreach_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    owner_first_name TEXT,
    business_name TEXT,
    website TEXT,
    city TEXT,
    variant TEXT NOT NULL,
    subject TEXT,
    resend_message_id TEXT,
    reply_alias TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    delivered_at TEXT,
    opened_at TEXT,
    clicked_at TEXT,
    bounced INTEGER DEFAULT 0,
    complained_at TEXT,
    replied_at TEXT,
    audit_submitted_at TEXT,
    status TEXT DEFAULT 'sent'
);
"""

# Idempotent migrations — handle the case where the table existed before the
# Tier 2/3/4 columns were added.
MIGRATIONS = [
    "ALTER TABLE cold_outreach_log ADD COLUMN reply_alias TEXT",
    "ALTER TABLE cold_outreach_log ADD COLUMN delivered_at TEXT",
    "ALTER TABLE cold_outreach_log ADD COLUMN opened_at TEXT",
    "ALTER TABLE cold_outreach_log ADD COLUMN clicked_at TEXT",
    "ALTER TABLE cold_outreach_log ADD COLUMN complained_at TEXT",
]

CREATE_SUPPRESSION = """
CREATE TABLE IF NOT EXISTS cold_suppression (
    email TEXT PRIMARY KEY,
    reason TEXT,
    added_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_outreach_email ON cold_outreach_log(email);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON cold_outreach_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_outreach_variant ON cold_outreach_log(variant);
"""


async def init_outreach_tables():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_OUTREACH_LOG)
        await db.execute(CREATE_SUPPRESSION)
        # Apply Tier 2/3/4 migrations on existing tables (idempotent — ALTER
        # TABLE ADD COLUMN errors if the column already exists, so we swallow
        # those specifically).
        for migration in MIGRATIONS:
            try:
                await db.execute(migration)
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    raise
        for stmt in CREATE_INDEXES.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Outreach tables ready at {DB_PATH}")


# ── Sent log ────────────────────────────────────────────────


async def record_send(
    email: str,
    owner_first_name: str,
    business_name: str,
    website: str,
    city: str,
    variant: str,
    subject: str,
    resend_message_id: Optional[str],
    bounced: bool = False,
    reply_alias: Optional[str] = None,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO cold_outreach_log
              (email, owner_first_name, business_name, website, city,
               variant, subject, resend_message_id, reply_alias, bounced, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email.lower().strip(),
                owner_first_name,
                business_name,
                website,
                city,
                variant,
                subject,
                resend_message_id,
                reply_alias,
                1 if bounced else 0,
                "bounced" if bounced else "sent",
            ),
        )
        await db.commit()
        return cursor.lastrowid or 0


# ── Webhook event handlers (Tier 2: Resend event webhook) ───


async def mark_event(resend_message_id: str, event_type: str) -> bool:
    """
    Idempotent update for Resend webhook events. Returns True if a row was
    updated. event_type is the Resend event name (email.delivered, email.opened,
    email.clicked, email.bounced, email.complained).

    Idempotency: each column only gets stamped if it's currently NULL, so
    duplicate webhooks (which Resend retries on 5xx) don't corrupt timestamps.
    """
    if not resend_message_id:
        return False

    column = {
        "email.delivered": "delivered_at",
        "email.opened": "opened_at",
        "email.clicked": "clicked_at",
        "email.complained": "complained_at",
    }.get(event_type)

    async with aiosqlite.connect(DB_PATH) as db:
        if event_type == "email.bounced":
            cur = await db.execute(
                """
                UPDATE cold_outreach_log
                SET bounced = 1, status = 'bounced'
                WHERE resend_message_id = ? AND bounced = 0
                """,
                (resend_message_id,),
            )
            # On bounce, suppress immediately so we never retry.
            async with db.execute(
                "SELECT email FROM cold_outreach_log WHERE resend_message_id = ?",
                (resend_message_id,),
            ) as cur2:
                row = await cur2.fetchone()
            if row and row[0]:
                await db.execute(
                    """
                    INSERT INTO cold_suppression (email, reason)
                    VALUES (?, 'bounced')
                    ON CONFLICT(email) DO NOTHING
                    """,
                    (row[0],),
                )
            await db.commit()
            return (cur.rowcount or 0) > 0

        if not column:
            return False

        cur = await db.execute(
            f"""
            UPDATE cold_outreach_log
            SET {column} = datetime('now')
            WHERE resend_message_id = ? AND {column} IS NULL
            """,
            (resend_message_id,),
        )
        await db.commit()
        return (cur.rowcount or 0) > 0


# ── Reply tracking (Tier 4) ─────────────────────────────────


async def mark_replied(email: Optional[str] = None, reply_alias: Optional[str] = None) -> bool:
    """
    Mark a lead as replied. Auto-suppresses. Resolves by either email match or
    reply_alias match (the Tier 4 path uses unique reply aliases per send).
    """
    if not email and not reply_alias:
        return False

    async with aiosqlite.connect(DB_PATH) as db:
        if reply_alias:
            async with db.execute(
                "SELECT email FROM cold_outreach_log WHERE reply_alias = ? LIMIT 1",
                (reply_alias,),
            ) as cur:
                row = await cur.fetchone()
            if row:
                email = row[0]

        if not email:
            return False

        email_l = email.lower().strip()
        cur = await db.execute(
            """
            UPDATE cold_outreach_log
            SET replied_at = datetime('now'), status = 'replied'
            WHERE email = ? AND replied_at IS NULL
            """,
            (email_l,),
        )
        await db.execute(
            """
            INSERT INTO cold_suppression (email, reason)
            VALUES (?, 'replied')
            ON CONFLICT(email) DO UPDATE SET reason = 'replied'
            """,
            (email_l,),
        )
        await db.commit()
        return (cur.rowcount or 0) > 0


async def already_sent(email: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT 1 FROM cold_outreach_log WHERE email = ? LIMIT 1",
            (email.lower().strip(),),
        ) as cur:
            row = await cur.fetchone()
    return row is not None


async def count_sends_today() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM cold_outreach_log WHERE date(sent_at) = date('now')"
        ) as cur:
            row = await cur.fetchone()
    return int(row[0]) if row else 0


# ── Suppression ─────────────────────────────────────────────


async def is_suppressed(email: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT 1 FROM cold_suppression WHERE email = ? LIMIT 1",
            (email.lower().strip(),),
        ) as cur:
            row = await cur.fetchone()
    return row is not None


async def suppress(email: str, reason: str = "unsubscribed"):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO cold_suppression (email, reason)
            VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET reason = excluded.reason
            """,
            (email.lower().strip(), reason),
        )
        await db.commit()


# ── Conversion tracking ─────────────────────────────────────


async def mark_audit_submitted(email: str):
    """
    Called from /audit. If a cold-outreach lead submits an audit, flag the
    matching log row + suppress so we never re-target a converted lead.
    """
    email_l = email.lower().strip()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE cold_outreach_log
            SET audit_submitted_at = datetime('now'),
                status = 'converted'
            WHERE email = ? AND audit_submitted_at IS NULL
            """,
            (email_l,),
        )
        await db.execute(
            """
            INSERT INTO cold_suppression (email, reason)
            VALUES (?, 'audited')
            ON CONFLICT(email) DO NOTHING
            """,
            (email_l,),
        )
        await db.commit()


# ── Reporting ───────────────────────────────────────────────


async def stats(days: int = 7) -> dict:
    """
    Per-variant aggregate stats for the last N days.
    Returns: { totals, by_variant: { A: {...}, B: {...}, C: {...} } }
    """
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            f"""
            SELECT
              variant,
              COUNT(*) AS sent,
              SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) AS opened,
              SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicked,
              SUM(CASE WHEN bounced = 1 THEN 1 ELSE 0 END) AS bounced,
              SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) AS replied,
              SUM(CASE WHEN audit_submitted_at IS NOT NULL THEN 1 ELSE 0 END) AS converted
            FROM cold_outreach_log
            WHERE date(sent_at) >= date('now', '-{int(days)} days')
            GROUP BY variant
            ORDER BY variant
            """
        ) as cur:
            rows = await cur.fetchall()

        async with db.execute(
            "SELECT COUNT(*) FROM cold_suppression"
        ) as cur:
            sup_row = await cur.fetchone()

    by_variant = {}
    totals = {
        "sent": 0, "delivered": 0, "opened": 0, "clicked": 0,
        "bounced": 0, "replied": 0, "converted": 0,
    }

    def _pct(n: int, d: int) -> float:
        return round(n / d * 100, 1) if d else 0.0

    for variant, sent, delivered, opened, clicked, bounced, replied, converted in rows:
        sent_i = int(sent or 0)
        by_variant[variant] = {
            "sent": sent_i,
            "delivered": int(delivered or 0),
            "opened": int(opened or 0),
            "clicked": int(clicked or 0),
            "bounced": int(bounced or 0),
            "replied": int(replied or 0),
            "converted": int(converted or 0),
            "open_rate": _pct(int(opened or 0), sent_i),
            "click_rate": _pct(int(clicked or 0), sent_i),
            "reply_rate": _pct(int(replied or 0), sent_i),
            "conversion_rate": _pct(int(converted or 0), sent_i),
        }
        totals["sent"] += sent_i
        totals["delivered"] += int(delivered or 0)
        totals["opened"] += int(opened or 0)
        totals["clicked"] += int(clicked or 0)
        totals["bounced"] += int(bounced or 0)
        totals["replied"] += int(replied or 0)
        totals["converted"] += int(converted or 0)

    totals["open_rate"] = _pct(totals["opened"], totals["sent"])
    totals["click_rate"] = _pct(totals["clicked"], totals["sent"])
    totals["reply_rate"] = _pct(totals["replied"], totals["sent"])
    totals["conversion_rate"] = _pct(totals["converted"], totals["sent"])

    return {
        "days": days,
        "totals": totals,
        "by_variant": by_variant,
        "suppression_count": int(sup_row[0]) if sup_row else 0,
    }


async def recent_sends(limit: int = 25) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT email, business_name, city, variant, subject, sent_at,
                   bounced, status, audit_submitted_at, replied_at
            FROM cold_outreach_log
            ORDER BY sent_at DESC
            LIMIT ?
            """,
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
