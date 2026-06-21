"""
Agent Two orchestrator — per-client and weekly-run entry points.

`run_for_client(slug)` — full pipeline for one client. Returns a dict for
the admin endpoint.

`run_weekly_for_all_active()` — iterates active clients, calls
`run_for_client` per slug, never throws (errors get logged + alerted).
"""

from __future__ import annotations
from datetime import date, timedelta

from agents.reporting_agent.claude_client import ClaudeError, generate_email_body
from agents.reporting_agent.config import is_configured
from agents.reporting_agent.data_fetcher import (
    estimate_weekly_revenue,
    fetch_ga,
    fetch_gsc,
    fetch_implementation_tracker,
    pct_delta,
)
from agents.reporting_agent.prompt_builder import build_messages, build_user_payload
from agents.reporting_agent.brevo_sender import send_alert_to_ty, send_report_email
from db.reporting import get_active_clients, get_client_by_slug, log_send


def _this_week_monday() -> str:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


async def run_for_client(slug: str) -> dict:
    """End-to-end pipeline for one client. Logs every outcome to reporting_sends."""
    ok, reason = is_configured()
    if not ok:
        return {"ok": False, "slug": slug, "stage": "config", "error": reason}

    client = await get_client_by_slug(slug)
    if not client:
        return {"ok": False, "slug": slug, "stage": "config", "error": "client not found"}
    if not client.get("active"):
        return {"ok": False, "slug": slug, "stage": "config", "error": "client inactive"}

    week_of = _this_week_monday()

    # 1. Fetch GSC + GA
    gsc = await fetch_gsc(
        site_url=client["site_url"],
        money_keywords=client.get("money_keywords") or [],
        gsc_property=client.get("gsc_property"),
    )
    ga = await fetch_ga(ga_property_id=client.get("ga_property_id"))

    # Spec: if data fetch fails → alert Ty, skip client this week
    if gsc.get("error") or ga.get("error"):
        err = f"GSC: {gsc.get('error') or 'ok'} | GA: {ga.get('error') or 'ok'}"
        await log_send(
            client_id=client["id"], slug=slug, week_of=week_of,
            status="fetch_failed", error=err,
            data_snapshot={"gsc": gsc, "ga": ga},
        )
        await send_alert_to_ty(
            f"{client['client_name']} weekly fetch failed",
            f"Slug: {slug}\nWeek: {week_of}\n\n{err}\n\nSkipping client this week.",
        )
        return {"ok": False, "slug": slug, "stage": "fetch", "error": err}

    impl = await fetch_implementation_tracker(slug)
    delta_pct = pct_delta(
        gsc.get("organic_clicks_this_week", 0),
        gsc.get("organic_clicks_prev_week", 0),
    )
    est_rev = estimate_weekly_revenue(
        organic_sessions=ga.get("organic_sessions_this_week", 0),
        conversion_rate=float(client.get("conversion_rate", 0.03)),
        avg_job_value=int(client.get("avg_job_value", 400)),
    )

    # Pull latest Revenue Agent snapshot (pre-computed by weekly cron before this runs)
    revenue_snapshot = None
    try:
        from db.revenue import get_latest_snapshot as _get_rev
        revenue_snapshot = await _get_rev(slug)
    except Exception:
        pass

    # 2. Build prompt + call Claude (3-retry exp backoff in claude_client)
    payload = build_user_payload(
        client=client, gsc=gsc, ga=ga, implementation=impl,
        estimated_revenue=est_rev, traffic_delta_pct=delta_pct,
        revenue_snapshot=revenue_snapshot,
    )
    try:
        body = await generate_email_body(build_messages(payload))
    except ClaudeError as e:
        await log_send(
            client_id=client["id"], slug=slug, week_of=week_of,
            status="claude_failed", error=str(e),
            data_snapshot=payload,
        )
        await send_alert_to_ty(
            f"{client['client_name']} Claude failed",
            f"Slug: {slug}\nWeek: {week_of}\n\n{e}",
        )
        return {"ok": False, "slug": slug, "stage": "claude", "error": str(e)}

    # 3. Deliver via Brevo (1 retry after 5 min if first send fails)
    subject = f"Lola weekly — {client['client_name']} · week of {week_of}"
    sent_ok, msg_or_err = await send_report_email(
        to_email=client["client_email"],
        to_name=client["client_name"],
        subject=subject,
        report_body=body,
        template_id=client.get("brevo_template_id"),
    )

    if not sent_ok:
        await log_send(
            client_id=client["id"], slug=slug, week_of=week_of,
            status="brevo_failed", error=msg_or_err,
            email_subject=subject, email_preview=body,
            data_snapshot=payload,
        )
        await send_alert_to_ty(
            f"{client['client_name']} Brevo send failed",
            f"Slug: {slug}\nWeek: {week_of}\n\n{msg_or_err}",
        )
        return {"ok": False, "slug": slug, "stage": "brevo", "error": msg_or_err}

    await log_send(
        client_id=client["id"], slug=slug, week_of=week_of,
        status="sent", error=None,
        email_subject=subject, email_preview=body,
        data_snapshot=payload,
    )
    return {
        "ok": True, "slug": slug, "stage": "sent",
        "message_id": msg_or_err,
        "subject": subject,
        "preview": body[:240],
    }


async def run_weekly_for_all_active() -> dict:
    """Iterate every active client. Never throws — collect outcomes for cron caller."""
    clients = await get_active_clients()
    results = []
    for c in clients:
        try:
            results.append(await run_for_client(c["slug"]))
        except Exception as e:
            results.append({"ok": False, "slug": c["slug"], "stage": "orchestrator", "error": str(e)})
    return {
        "total": len(clients),
        "sent": sum(1 for r in results if r.get("ok")),
        "failed": sum(1 for r in results if not r.get("ok")),
        "results": results,
    }
