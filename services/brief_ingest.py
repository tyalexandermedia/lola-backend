"""
Brief ingestion — mirror existing revenue signals into `lola_items` so the
priority engine has ONE thing to rank (not four scattered task systems).

Sources mirrored (all idempotent via source_ref, safe to re-run):
  - product hot leads              -> opportunity items (lola-leads)
  - product stale sent estimates   -> opportunity items ($ waiting)
  - product open revenue actions   -> task items
  - GHL open opportunities         -> opportunity items (Sandbar + Lola Leads)

Nothing here invents revenue: a hot lead carries no $ to Ty yet, so its
revenue_estimate stays 0 and it ranks on "someone's waiting" + age, not a made-up
number. Estimates and GHL opportunities carry their real amounts.

Safe-by-default: product ingestion no-ops cleanly if the tables are empty; GHL
ingestion is dormant unless GHL_API_TOKEN + a location id are configured.
"""

from db.lola_items import upsert_external
from db.leads import get_warm_leads
from db.reporting import get_active_clients
from db.revenue import stale_sent_estimates, list_actions
from api_clients.ghl_read import fetch_all_open_opportunities, ghl_read_enabled

# Sandbar is its own workspace; every other product client is a Lola Leads client.
def _slug_workspace(slug: str) -> str:
    return "sandbar" if (slug or "").strip().lower() == "sandbar" else "lola-leads"


async def ingest_product_signals() -> dict:
    counts = {"hot_leads": 0, "estimates": 0, "actions": 0}

    # Hot leads → opportunities. No invented $; rank on urgency + "waiting".
    try:
        for lead in await get_warm_leads(limit=50, only_hot=True):
            conf = min(max(float(lead.get("lead_score") or 0) / 100.0, 0.3), 0.95)
            leak = int(lead.get("revenue_leak") or 0)
            detail = (
                f"Hot Growth Score lead in {lead.get('city') or 'unknown city'}. "
                f"Est. monthly revenue leak on their side: ${leak:,}. "
                f"Score {lead.get('total_score')}, grade {lead.get('grade')}."
            )
            res = await upsert_external(
                source="product",
                source_ref=f"hotlead:{lead.get('id')}",
                workspace="lola-leads",
                type="opportunity",
                title=f"Follow up hot lead: {lead.get('business_name') or lead.get('email')}",
                detail=detail,
                revenue_estimate=0,
                confidence=conf,
                urgency_at=lead.get("created_at"),
                effort="small",
            )
            if res in ("created", "updated"):
                counts["hot_leads"] += 1
    except Exception as e:
        print(f"⚠️ hot-lead ingest failed: {e}")

    # Per-client: stale estimates ($ waiting) + open revenue actions.
    try:
        clients = await get_active_clients()
    except Exception as e:
        print(f"⚠️ could not load active clients: {e}")
        clients = []

    for c in clients or []:
        slug = c.get("slug") or ""
        ws = _slug_workspace(slug)
        try:
            for est in await stale_sent_estimates(slug):
                amount = float(est.get("amount") or 0)
                await upsert_external(
                    source="product",
                    source_ref=f"estimate:{slug}:{est.get('id')}",
                    workspace=ws,
                    type="opportunity",
                    title=f"Follow up ${int(amount):,} estimate — {c.get('client_name') or slug}",
                    detail="Estimate sent 7+ days ago, still unanswered.",
                    revenue_estimate=amount,
                    revenue_recurring=False,
                    confidence=0.6,
                    urgency_at=est.get("sent_at"),
                    effort="small",
                )
                counts["estimates"] += 1
        except Exception as e:
            print(f"⚠️ estimate ingest failed for {slug}: {e}")

        try:
            for act in await list_actions(slug):
                await upsert_external(
                    source="product",
                    source_ref=f"action:{slug}:{act.get('id')}",
                    workspace=ws,
                    type="task",
                    title=act.get("title") or f"Revenue action — {slug}",
                    detail=act.get("detail") or "",
                    urgency_at=act.get("created_at"),
                    effort="small",
                )
                counts["actions"] += 1
        except Exception as e:
            print(f"⚠️ action ingest failed for {slug}: {e}")

    return counts


async def ingest_ghl() -> dict:
    """Mirror GHL open opportunities. Dormant unless GHL read is configured."""
    if not ghl_read_enabled():
        return {"ghl_opportunities": 0, "enabled": False}
    count = 0
    try:
        for opp in await fetch_all_open_opportunities():
            value = float(opp.get("value") or 0)
            who = opp.get("contact_name") or ""
            await upsert_external(
                source="ghl",
                source_ref=f"opp:{opp.get('id')}",
                workspace=opp.get("workspace") or "lola-leads",
                type="opportunity",
                title=opp.get("name") or "GHL opportunity",
                detail=f"Open GHL opportunity{f' — {who}' if who else ''}.",
                revenue_estimate=value,
                revenue_recurring=False,
                confidence=0.6,
                urgency_at=opp.get("updated_at") or None,
                waiting_on=who,
                effort="small",
            )
            count += 1
    except Exception as e:
        print(f"⚠️ GHL opportunity ingest failed: {e}")
    return {"ghl_opportunities": count, "enabled": True}


async def refresh_all() -> dict:
    product = await ingest_product_signals()
    ghl = await ingest_ghl()
    return {"product": product, "ghl": ghl}
