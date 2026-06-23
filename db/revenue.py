"""
Revenue Agent storage and rollups.

This module owns Lola's revenue pipeline tables:
contacts -> opportunities -> estimates -> won revenue -> agent actions.
All migrations are additive and safe against an existing SQLite database.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

OPPORTUNITY_STATUSES = ("new", "qualified", "estimate_sent", "won", "lost")
ESTIMATE_STATUSES = ("draft", "sent", "accepted", "declined", "expired")
ACTION_STATUSES = ("open", "completed", "dismissed")


CREATE_CONTACTS = """
CREATE TABLE IF NOT EXISTS revenue_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    contact_type TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    meta_json TEXT NOT NULL DEFAULT '{}',
    first_seen_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    UNIQUE(slug, source, source_id)
);
"""

CREATE_OPPORTUNITIES = """
CREATE TABLE IF NOT EXISTS revenue_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    contact_id INTEGER,
    source TEXT,
    source_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    estimated_value INTEGER NOT NULL DEFAULT 0,
    won_value INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    won_at TEXT,
    lost_at TEXT,
    UNIQUE(slug, source, source_id)
);
"""

CREATE_ESTIMATES = """
CREATE TABLE IF NOT EXISTS revenue_estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    opportunity_id INTEGER,
    contact_id INTEGER,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sent',
    description TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    declined_at TEXT,
    expired_at TEXT
);
"""

CREATE_ACTIONS = """
CREATE TABLE IF NOT EXISTS revenue_agent_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    opportunity_id INTEGER,
    estimate_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    dismissed_at TEXT
);
"""

CREATE_RUNS = """
CREATE TABLE IF NOT EXISTS revenue_agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    contacts_synced INTEGER NOT NULL DEFAULT 0,
    opportunities_synced INTEGER NOT NULL DEFAULT 0,
    actions_created INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_revenue_contacts_slug ON revenue_contacts(slug, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_opps_slug_status ON revenue_opportunities(slug, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_estimates_slug_status ON revenue_estimates(slug, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_actions_slug_status ON revenue_agent_actions(slug, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_open_estimate_actions
  ON revenue_agent_actions(slug, action_type, estimate_id)
  WHERE status = 'open' AND estimate_id IS NOT NULL;
"""

ADD_WON_JOB_OPPORTUNITY = "ALTER TABLE won_jobs ADD COLUMN opportunity_id INTEGER"


async def _ensure_column(db: aiosqlite.Connection, table: str, column: str, ddl: str) -> None:
    async with db.execute(f"PRAGMA table_info({table})") as cur:
        cols = {row[1] for row in await cur.fetchall()}
    if column not in cols:
        await db.execute(ddl)


async def init_revenue_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        for stmt in (
            CREATE_CONTACTS,
            CREATE_OPPORTUNITIES,
            CREATE_ESTIMATES,
            CREATE_ACTIONS,
            CREATE_RUNS,
        ):
            await db.execute(stmt)
        for stmt in CREATE_INDEXES.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await _ensure_column(db, "won_jobs", "opportunity_id", ADD_WON_JOB_OPPORTUNITY)
        await db.commit()
    print(f"✅ Revenue Agent tables ready at {DB_PATH}")


def _slug(slug: str) -> str:
    return slug.strip().lower()


def _json_loads(raw: str | None, default: Any) -> Any:
    try:
        return json.loads(raw or "")
    except Exception:
        return default


def _hydrate(row: aiosqlite.Row) -> dict:
    d = dict(row)
    if "meta_json" in d:
        d["meta"] = _json_loads(d.pop("meta_json"), {})
    if "summary_json" in d:
        d["summary"] = _json_loads(d.pop("summary_json"), {})
    return d


async def upsert_contact(
    *,
    slug: str,
    source: str,
    source_id: str,
    contact_type: str,
    name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    meta: Optional[dict] = None,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO revenue_contacts
               (slug, source, source_id, contact_type, name, phone, email, meta_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(slug, source, source_id) DO UPDATE SET
                 contact_type = excluded.contact_type,
                 name = COALESCE(excluded.name, revenue_contacts.name),
                 phone = COALESCE(excluded.phone, revenue_contacts.phone),
                 email = COALESCE(excluded.email, revenue_contacts.email),
                 meta_json = excluded.meta_json,
                 last_seen_at = datetime('now')""",
            (
                _slug(slug),
                source,
                source_id,
                contact_type,
                name,
                phone,
                email,
                json.dumps(meta or {})[:4000],
            ),
        )
        await db.commit()
        async with db.execute(
            "SELECT id FROM revenue_contacts WHERE slug = ? AND source = ? AND source_id = ?",
            (_slug(slug), source, source_id),
        ) as cur:
            row = await cur.fetchone()
            return int(row[0])


async def upsert_opportunity(
    *,
    slug: str,
    title: str,
    contact_id: int | None = None,
    source: str | None = None,
    source_id: str | None = None,
    status: str = "new",
    estimated_value: int = 0,
    notes: str | None = None,
) -> int:
    validate_opportunity_status(status)
    async with aiosqlite.connect(DB_PATH) as db:
        if source and source_id:
            await db.execute(
                """INSERT INTO revenue_opportunities
                   (slug, contact_id, source, source_id, title, status, estimated_value, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(slug, source, source_id) DO UPDATE SET
                     contact_id = COALESCE(excluded.contact_id, revenue_opportunities.contact_id),
                     title = excluded.title,
                     estimated_value = MAX(revenue_opportunities.estimated_value, excluded.estimated_value),
                     notes = COALESCE(excluded.notes, revenue_opportunities.notes),
                     updated_at = datetime('now')""",
                (_slug(slug), contact_id, source, source_id, title, status, int(estimated_value or 0), notes),
            )
            await db.commit()
            async with db.execute(
                "SELECT id FROM revenue_opportunities WHERE slug = ? AND source = ? AND source_id = ?",
                (_slug(slug), source, source_id),
            ) as cur:
                row = await cur.fetchone()
                return int(row[0])
        cur = await db.execute(
            """INSERT INTO revenue_opportunities
               (slug, contact_id, source, source_id, title, status, estimated_value, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (_slug(slug), contact_id, source, source_id, title, status, int(estimated_value or 0), notes),
        )
        await db.commit()
        return int(cur.lastrowid or 0)


async def update_opportunity_status(
    opportunity_id: int,
    status: str,
    *,
    won_value: int | None = None,
    notes: str | None = None,
) -> dict | None:
    validate_opportunity_status(status)
    fields = ["status = ?", "updated_at = datetime('now')"]
    values: list[Any] = [status]
    if status == "won":
        fields.append("won_at = COALESCE(won_at, datetime('now'))")
        fields.append("lost_at = NULL")
        if won_value is not None:
            fields.append("won_value = ?")
            values.append(max(0, int(won_value)))
    elif status == "lost":
        fields.append("lost_at = COALESCE(lost_at, datetime('now'))")
    if notes is not None:
        fields.append("notes = ?")
        values.append(notes)
    values.append(int(opportunity_id))
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            f"UPDATE revenue_opportunities SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        await db.commit()
        if not cur.rowcount:
            return None
        async with db.execute("SELECT * FROM revenue_opportunities WHERE id = ?", (int(opportunity_id),)) as sel:
            row = await sel.fetchone()
            return dict(row) if row else None


async def create_estimate(
    *,
    slug: str,
    amount: int,
    opportunity_id: int | None = None,
    contact_id: int | None = None,
    status: str = "sent",
    description: str | None = None,
) -> int:
    validate_estimate_status(status)
    async with aiosqlite.connect(DB_PATH) as db:
        if opportunity_id:
            async with db.execute(
                "SELECT id FROM revenue_opportunities WHERE id = ? AND slug = ?",
                (int(opportunity_id), _slug(slug)),
            ) as cur:
                if not await cur.fetchone():
                    raise ValueError("opportunity_id not found for slug")
        cur = await db.execute(
            """INSERT INTO revenue_estimates
               (slug, opportunity_id, contact_id, amount, status, description)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (_slug(slug), opportunity_id, contact_id, max(0, int(amount or 0)), status, description),
        )
        if opportunity_id and status == "sent":
            await db.execute(
                """UPDATE revenue_opportunities
                   SET status = CASE WHEN status IN ('new','qualified') THEN 'estimate_sent' ELSE status END,
                       estimated_value = MAX(estimated_value, ?),
                       updated_at = datetime('now')
                   WHERE id = ?""",
                (max(0, int(amount or 0)), int(opportunity_id)),
            )
        await db.commit()
        return int(cur.lastrowid or 0)


async def update_estimate_status(estimate_id: int, status: str) -> dict | None:
    validate_estimate_status(status)
    stamp = {
        "accepted": "accepted_at = COALESCE(accepted_at, datetime('now'))",
        "declined": "declined_at = COALESCE(declined_at, datetime('now'))",
        "expired": "expired_at = COALESCE(expired_at, datetime('now'))",
    }.get(status)
    fields = ["status = ?", "updated_at = datetime('now')"]
    if stamp:
        fields.append(stamp)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            f"UPDATE revenue_estimates SET {', '.join(fields)} WHERE id = ?",
            (status, int(estimate_id)),
        )
        await db.commit()
        if not cur.rowcount:
            return None
        async with db.execute("SELECT * FROM revenue_estimates WHERE id = ?", (int(estimate_id),)) as sel:
            row = await sel.fetchone()
            return dict(row) if row else None


async def list_opportunities(slug: str, limit: int = 100) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM revenue_opportunities
               WHERE slug = ? ORDER BY updated_at DESC, id DESC LIMIT ?""",
            (_slug(slug), max(1, min(int(limit), 250))),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def list_estimates(slug: str, limit: int = 100) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM revenue_estimates
               WHERE slug = ? ORDER BY sent_at DESC, id DESC LIMIT ?""",
            (_slug(slug), max(1, min(int(limit), 250))),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def list_actions(slug: str, include_done: bool = False, limit: int = 100) -> list[dict]:
    where = "slug = ?" if include_done else "slug = ? AND status = 'open'"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            f"""SELECT * FROM revenue_agent_actions
                WHERE {where} ORDER BY created_at DESC, id DESC LIMIT ?""",
            (_slug(slug), max(1, min(int(limit), 250))),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def complete_action(action_id: int, status: str = "completed") -> dict | None:
    validate_action_status(status)
    if status == "open":
        raise ValueError("action status must be completed or dismissed")
    stamp = "completed_at" if status == "completed" else "dismissed_at"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            f"""UPDATE revenue_agent_actions
                SET status = ?, {stamp} = COALESCE({stamp}, datetime('now'))
                WHERE id = ?""",
            (status, int(action_id)),
        )
        await db.commit()
        if not cur.rowcount:
            return None
        async with db.execute("SELECT * FROM revenue_agent_actions WHERE id = ?", (int(action_id),)) as sel:
            row = await sel.fetchone()
            return dict(row) if row else None


async def ensure_estimate_followup_action(slug: str, estimate: dict) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT OR IGNORE INTO revenue_agent_actions
               (slug, action_type, title, detail, opportunity_id, estimate_id)
               VALUES (?, 'follow_up_estimate', ?, ?, ?, ?)""",
            (
                _slug(slug),
                f"Follow up on ${int(estimate.get('amount') or 0):,} estimate",
                "Estimate has been sent for 7+ days without acceptance, decline, or expiry.",
                estimate.get("opportunity_id"),
                estimate["id"],
            ),
        )
        await db.commit()
        return bool(cur.rowcount)


async def stale_sent_estimates(slug: str, days: int = 7) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM revenue_estimates
               WHERE slug = ? AND status = 'sent'
                 AND sent_at <= datetime('now', ?)
               ORDER BY sent_at ASC""",
            (_slug(slug), f"-{max(1, int(days))} days"),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def link_won_job_to_opportunity(opportunity_id: int, job_value: int) -> dict | None:
    return await update_opportunity_status(opportunity_id, "won", won_value=job_value)


async def revenue_summary(slug: str) -> dict:
    slug_l = _slug(slug)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT status, COUNT(*) AS n, COALESCE(SUM(estimated_value),0) AS est, COALESCE(SUM(won_value),0) AS won FROM revenue_opportunities WHERE slug = ? GROUP BY status",
            (slug_l,),
        ) as cur:
            opp_rows = await cur.fetchall()
        async with db.execute(
            "SELECT status, COUNT(*) AS n, COALESCE(SUM(amount),0) AS amount FROM revenue_estimates WHERE slug = ? GROUP BY status",
            (slug_l,),
        ) as cur:
            est_rows = await cur.fetchall()
        async with db.execute(
            "SELECT COUNT(*) AS n FROM revenue_contacts WHERE slug = ?",
            (slug_l,),
        ) as cur:
            contacts = int((await cur.fetchone())["n"] or 0)
        async with db.execute(
            "SELECT COUNT(*) AS n FROM revenue_agent_actions WHERE slug = ? AND status = 'open'",
            (slug_l,),
        ) as cur:
            open_actions = int((await cur.fetchone())["n"] or 0)

    opportunities = {s: {"count": 0, "estimated_value": 0, "won_value": 0} for s in OPPORTUNITY_STATUSES}
    for r in opp_rows:
        if r["status"] in opportunities:
            opportunities[r["status"]] = {
                "count": int(r["n"] or 0),
                "estimated_value": int(r["est"] or 0),
                "won_value": int(r["won"] or 0),
            }
    estimates = {s: {"count": 0, "amount": 0} for s in ESTIMATE_STATUSES}
    for r in est_rows:
        if r["status"] in estimates:
            estimates[r["status"]] = {"count": int(r["n"] or 0), "amount": int(r["amount"] or 0)}
    pipeline_value = sum(v["estimated_value"] for k, v in opportunities.items() if k not in ("won", "lost"))
    won_revenue = opportunities["won"]["won_value"]
    return {
        "slug": slug_l,
        "contacts": contacts,
        "opportunities": opportunities,
        "estimates": estimates,
        "pipeline_value": pipeline_value,
        "won_revenue": won_revenue,
        "open_actions": open_actions,
    }


async def save_agent_run(slug: str, contacts_synced: int, opportunities_synced: int, actions_created: int, summary: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO revenue_agent_runs
               (slug, contacts_synced, opportunities_synced, actions_created, summary_json)
               VALUES (?, ?, ?, ?, ?)""",
            (_slug(slug), contacts_synced, opportunities_synced, actions_created, json.dumps(summary)[:8000]),
        )
        await db.commit()
        return int(cur.lastrowid or 0)


def validate_opportunity_status(status: str) -> None:
    if status not in OPPORTUNITY_STATUSES:
        raise ValueError(f"Invalid opportunity status: {status}")


def validate_estimate_status(status: str) -> None:
    if status not in ESTIMATE_STATUSES:
        raise ValueError(f"Invalid estimate status: {status}")


def validate_action_status(status: str) -> None:
    if status not in ACTION_STATUSES:
        raise ValueError(f"Invalid action status: {status}")
