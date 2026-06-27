import asyncio
import os
import tempfile


async def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        os.environ["DB_PATH"] = os.path.join(td, "revenue.db")

        from db.tracking import init_tracking_tables, log_call, log_event
        from db.revenue import (
            create_estimate,
            ensure_estimate_followup_action,
            init_revenue_tables,
            link_won_job_to_opportunity,
            list_actions,
            list_estimates,
            list_opportunities,
            revenue_summary,
            stale_sent_estimates,
            update_estimate_status,
            update_opportunity_status,
            upsert_opportunity,
        )
        from agents.revenue_agent.main import run_revenue_agent, sync_from_tracking

        await init_tracking_tables()
        await init_revenue_tables()
        # Re-run migrations to prove additive safety.
        await init_tracking_tables()
        await init_revenue_tables()

        await log_call(
            "sandbar",
            call_sid="CA123",
            caller_number="+17275550123",
            tracking_number="+17275559999",
            forwarded_to="+17275558888",
            source="callrail",
        )
        await log_call(
            "sandbar",
            call_sid="CA123",
            caller_number="+17275550123",
            tracking_number="+17275559999",
            forwarded_to="+17275558888",
            source="callrail",
        )
        await log_event("sandbar", "lead", source="website", meta={"name": "Pat", "email": "pat@example.com"})

        await sync_from_tracking("sandbar")
        await sync_from_tracking("sandbar")
        opps = await list_opportunities("sandbar")
        assert len(opps) == 2, opps

        manual_id = await upsert_opportunity(
            slug="sandbar",
            title="Roof cleaning quote",
            status="qualified",
            estimated_value=900,
        )
        updated = await update_opportunity_status(manual_id, "estimate_sent")
        assert updated and updated["status"] == "estimate_sent"
        try:
            await update_opportunity_status(manual_id, "almost_won")
        except ValueError:
            pass
        else:
            raise AssertionError("invalid opportunity status accepted")

        estimate_id = await create_estimate(slug="sandbar", opportunity_id=manual_id, amount=900)
        estimates = await list_estimates("sandbar")
        assert any(e["id"] == estimate_id for e in estimates)
        accepted = await update_estimate_status(estimate_id, "accepted")
        assert accepted and accepted["status"] == "accepted"
        try:
            await update_estimate_status(estimate_id, "paid-ish")
        except ValueError:
            pass
        else:
            raise AssertionError("invalid estimate status accepted")

        stale_id = await create_estimate(slug="sandbar", opportunity_id=manual_id, amount=500)
        import aiosqlite
        async with aiosqlite.connect(os.environ["DB_PATH"]) as db:
            await db.execute(
                "UPDATE revenue_estimates SET sent_at = datetime('now','-8 days') WHERE id = ?",
                (stale_id,),
            )
            await db.commit()
        stale = await stale_sent_estimates("sandbar")
        stale_estimate = next(e for e in stale if e["id"] == stale_id)
        created_once = await ensure_estimate_followup_action("sandbar", stale_estimate)
        created_twice = await ensure_estimate_followup_action("sandbar", stale_estimate)
        assert created_once is True
        assert created_twice is False
        actions = await list_actions("sandbar")
        assert len([a for a in actions if a["estimate_id"] == stale_id]) == 1

        linked = await link_won_job_to_opportunity(manual_id, 900)
        assert linked and linked["status"] == "won" and linked["won_value"] == 900

        summary = await revenue_summary("sandbar")
        assert summary["contacts"] == 2
        assert summary["opportunities"]["won"]["count"] == 1
        assert summary["won_revenue"] == 900

        run = await run_revenue_agent("sandbar")
        assert run["ok"] is True


if __name__ == "__main__":
    asyncio.run(main())
