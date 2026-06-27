"""
Revenue Agent orchestration.

sync_from_tracking(slug) imports raw tracked calls/leads into the revenue
pipeline idempotently. run_revenue_agent(slug) performs sync, opens follow-up
actions for stale sent estimates, and stores a run summary.
"""

from __future__ import annotations

import json
import os

import aiosqlite

from db.revenue import (
    ensure_estimate_followup_action,
    revenue_summary,
    save_agent_run,
    stale_sent_estimates,
    upsert_contact,
    upsert_opportunity,
)

DB_PATH = os.getenv("DB_PATH", "lola.db")


async def sync_from_tracking(slug: str) -> dict:
    slug_l = slug.strip().lower()
    contacts_synced = 0
    opportunities_synced = 0

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, call_sid, caller_number, caller_city, caller_state,
                      source, status, duration_sec, created_at
               FROM tracked_calls
               WHERE slug = ? AND call_sid IS NOT NULL AND call_sid != ''
               ORDER BY created_at ASC""",
            (slug_l,),
        ) as cur:
            calls = await cur.fetchall()
        async with db.execute(
            """SELECT id, source, meta_json, created_at
               FROM tracked_events
               WHERE slug = ? AND event_type = 'lead'
               ORDER BY created_at ASC""",
            (slug_l,),
        ) as cur:
            leads = await cur.fetchall()

    for call in calls:
        call_sid = str(call["call_sid"])
        contact_id = await upsert_contact(
            slug=slug_l,
            source="tracked_calls",
            source_id=call_sid,
            contact_type="call",
            phone=call["caller_number"],
            meta={
                "caller_city": call["caller_city"],
                "caller_state": call["caller_state"],
                "status": call["status"],
                "duration_sec": call["duration_sec"],
                "created_at": call["created_at"],
            },
        )
        contacts_synced += 1
        await upsert_opportunity(
            slug=slug_l,
            contact_id=contact_id,
            source="tracked_calls",
            source_id=call_sid,
            title=f"Call from {call['caller_number'] or 'tracked number'}",
            status="new",
            notes=f"Imported from tracked call {call_sid}",
        )
        opportunities_synced += 1

    for lead in leads:
        source_id = str(lead["id"])
        meta = _parse_meta(lead["meta_json"])
        contact_id = await upsert_contact(
            slug=slug_l,
            source="tracked_events",
            source_id=source_id,
            contact_type="lead",
            name=_first(meta, "name", "full_name", "customer_name"),
            phone=_first(meta, "phone", "phone_number", "tel"),
            email=_first(meta, "email"),
            meta={**meta, "source": lead["source"], "created_at": lead["created_at"]},
        )
        contacts_synced += 1
        title = _first(meta, "project", "service", "message") or f"Lead #{source_id}"
        await upsert_opportunity(
            slug=slug_l,
            contact_id=contact_id,
            source="tracked_events",
            source_id=source_id,
            title=str(title)[:140],
            status="new",
            notes="Imported from tracked lead event",
        )
        opportunities_synced += 1

    return {
        "contacts_synced": contacts_synced,
        "opportunities_synced": opportunities_synced,
    }


async def run_revenue_agent(slug: str) -> dict:
    sync = await sync_from_tracking(slug)
    actions_created = 0
    for estimate in await stale_sent_estimates(slug):
        if await ensure_estimate_followup_action(slug, estimate):
            actions_created += 1
    summary = await revenue_summary(slug)
    run_id = await save_agent_run(
        slug,
        sync["contacts_synced"],
        sync["opportunities_synced"],
        actions_created,
        summary,
    )
    return {
        "ok": True,
        "id": run_id,
        **sync,
        "actions_created": actions_created,
        "summary": summary,
    }


def _parse_meta(raw: str | None) -> dict:
    try:
        data = json.loads(raw or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _first(meta: dict, *keys: str):
    for key in keys:
        value = meta.get(key)
        if value:
            return value
    return None
