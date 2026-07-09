"""
Missed-Call Text-Back (MCTB) — the flagship recurring feature.

Lola already provisions a tracking number per client that forwards to their
real line (see /twilio/voice/{slug} + /twilio/status/{slug}). When a forwarded
call is NOT answered, this module lets us instantly text the caller back so the
lead isn't lost — the single highest-ROI justification for the monthly.

This module owns:
  • per-client config (enabled, message template, quote link)
  • a sent-log keyed on call_sid for dedup (Twilio can fire the status callback
    more than once per call) + simple reporting

Everything is opt-in per client and gated globally on MCTB_ENABLED + Twilio.
"""

import os
import time
import aiosqlite
from typing import Optional

DB_PATH = os.getenv("DB_PATH", "lola.db")

# Statuses from Twilio's <Dial> action callback that mean "the caller never got
# through" — i.e. a missed call worth texting back.
MISSED_STATUSES = {"no-answer", "busy", "failed", "canceled"}

DEFAULT_TEMPLATE = (
    "Hey! Sorry we missed your call to {business}. We're likely on a job — "
    "text us right back here and we'll get you taken care of.{quote}"
)

CREATE_CONFIG = """
CREATE TABLE IF NOT EXISTS mctb_config (
    slug       TEXT PRIMARY KEY,
    enabled    INTEGER NOT NULL DEFAULT 1,
    template   TEXT,
    quote_url  TEXT,
    updated_at REAL
);
"""

CREATE_SENT = """
CREATE TABLE IF NOT EXISTS mctb_sent (
    call_sid TEXT PRIMARY KEY,
    slug     TEXT,
    caller   TEXT,
    sent_at  REAL
);
"""


def mctb_globally_enabled() -> bool:
    return os.getenv("MCTB_ENABLED", "true").strip().lower() == "true"


def is_missed(status: str, duration_sec: int = 0) -> bool:
    """True when a forwarded call should trigger a text-back."""
    s = (status or "").strip().lower()
    if s in MISSED_STATUSES:
        return True
    # Anything that isn't a real, connected conversation counts as missed.
    return s != "completed" and duration_sec <= 0


def render_text(template: Optional[str], *, business: str, quote_url: Optional[str]) -> str:
    """Fill the template. {quote} expands to a link clause or nothing."""
    tpl = (template or "").strip() or DEFAULT_TEMPLATE
    quote = ""
    if quote_url:
        quote = f" Or grab a fast quote: {quote_url}"
    try:
        return tpl.format(business=business or "us", quote=quote)
    except (KeyError, IndexError):
        # Bad custom template — fall back so we never crash the call flow.
        return DEFAULT_TEMPLATE.format(business=business or "us", quote=quote)


async def init_mctb_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_CONFIG)
        await db.execute(CREATE_SENT)
        await db.commit()
    print(f"✅ Missed-Call Text-Back tables ready at {DB_PATH}")


async def get_config(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM mctb_config WHERE slug = ?", (slug,))
        row = await cur.fetchone()
        return dict(row) if row else None


async def upsert_config(
    slug: str,
    *,
    enabled: bool = True,
    template: Optional[str] = None,
    quote_url: Optional[str] = None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO mctb_config (slug, enabled, template, quote_url, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(slug) DO UPDATE SET
                 enabled = excluded.enabled,
                 template = excluded.template,
                 quote_url = excluded.quote_url,
                 updated_at = excluded.updated_at""",
            (slug, 1 if enabled else 0, template, quote_url, time.time()),
        )
        await db.commit()


async def already_texted(call_sid: str) -> bool:
    if not call_sid:
        return False
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT 1 FROM mctb_sent WHERE call_sid = ?", (call_sid,))
        return (await cur.fetchone()) is not None


async def record_texted(call_sid: str, slug: str, caller: str) -> bool:
    """Record a sent text-back. Returns False if this call_sid was already
    recorded (atomic dedup guard against duplicate Twilio callbacks)."""
    if not call_sid:
        return True
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO mctb_sent (call_sid, slug, caller, sent_at) VALUES (?, ?, ?, ?)",
                (call_sid, slug, caller, time.time()),
            )
            await db.commit()
        return True
    except aiosqlite.IntegrityError:
        return False  # already recorded by a concurrent callback


async def stats(slug: str) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT COUNT(*) FROM mctb_sent WHERE slug = ?", (slug,))
        (n,) = await cur.fetchone()
        cfg = await get_config(slug)
        return {"slug": slug, "texts_sent": n or 0, "config": cfg}


async def stats_all() -> dict:
    """Global MCTB totals for the owner dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT COUNT(*) FROM mctb_sent")
        (sent,) = await cur.fetchone()
        cur2 = await db.execute("SELECT COUNT(*) FROM mctb_config WHERE enabled = 1")
        (enabled,) = await cur2.fetchone()
    return {"texts_sent": sent or 0, "clients_enabled": enabled or 0}
