#!/usr/bin/env python3
"""
Go-live preflight — what is actually configured, and the exact fix for what isn't.

    python3 scripts/preflight.py

Reads environment only. Sends nothing, writes nothing, calls no external API,
and never prints a secret — just whether each one is present, and what breaks
while it isn't.

Why this exists: the answer to "what do I still need to set up" was spread
across docs/SETUP.md, docs/GO-LIVE.md, .env.example and several code comments,
and those drift. This reads the same variables the code reads, so it cannot be
out of date in the way a checklist can.

Exit code is 0 when nothing CRITICAL is missing, 1 otherwise, so it can gate a
deploy if you ever want it to.
"""

import os
import sys

# ── severity ────────────────────────────────────────────────────────────────
CRITICAL = "CRITICAL"  # money or trust is lost while this is unset
HIGH = "HIGH"          # a built feature silently does nothing
LATER = "LATER"        # real, but nothing breaks today

COLOR = {CRITICAL: "\033[31m", HIGH: "\033[33m", LATER: "\033[90m"}
RESET = "\033[0m"
OK = "\033[32m"


def val(name: str) -> str:
    return os.getenv(name, "").strip()


def has(name: str) -> bool:
    return bool(val(name))


class Check:
    def __init__(self, name, severity, ok, breaks, fix):
        self.name, self.severity, self.ok, self.breaks, self.fix = name, severity, ok, breaks, fix


def build_checks() -> list:
    checks = []

    # ── take money ──────────────────────────────────────────────────────────
    checks.append(Check(
        "STRIPE_WEBHOOK_SECRET", CRITICAL, has("STRIPE_WEBHOOK_SECRET"),
        "A buyer pays $397 and hears nothing. main.py::stripe_webhook fails "
        "closed (503) without this, so no confirmation email, no intake nudge, "
        "and the follow-up sequence never learns they converted.",
        "Stripe → Developers → Webhooks → Add endpoint\n"
        "      URL:   https://lola-backend-production.up.railway.app/stripe/webhook\n"
        "      Event: checkout.session.completed   (the only one handled)\n"
        "      Copy the whsec_… signing secret into Railway.",
    ))

    checks.append(Check(
        "RESEND_API_KEY", CRITICAL, has("RESEND_API_KEY"),
        "The purchase confirmation is EMAIL ONLY — the webhook's SMS path is "
        "gated by twilio_enabled(), which is False whenever OUTBOUND_VIA_GHL "
        "is on (the default). So without this key a buyer gets nothing at all, "
        "even with the webhook secret set.",
        "Railway → RESEND_API_KEY=re_…  (the key rotated after the Aug incident)",
    ))

    checks.append(Check(
        "STRIPE_SECRET_KEY", HIGH, has("STRIPE_SECRET_KEY"),
        "/checkout/verify can't confirm a session server-side, so /diy stays "
        "locked for anyone who legitimately paid for the retired fix kit.",
        "Railway → STRIPE_SECRET_KEY=sk_live_…",
    ))

    # ── cold outreach ───────────────────────────────────────────────────────
    checks.append(Check(
        "LOLA_SECRET_ADMIN_KEY", CRITICAL, has("LOLA_SECRET_ADMIN_KEY"),
        "Every cold email's one-click unsubscribe link is signed with this. "
        "Without it outreach.sender REFUSES TO SEND — deliberately. Gmail and "
        "Yahoo require a working one-click unsubscribe from bulk senders, and "
        "a dead one on a domain already carrying a phishing incident is the "
        "fastest way to finish off its reputation. It also gates /admin/hq.",
        "Generate one and set it in Railway (and locally to run outreach):\n"
        "      python3 -c \"import secrets; print(secrets.token_urlsafe(32))\"",
    ))

    from_email = val("OUTREACH_FROM_EMAIL")
    root_domain = from_email.endswith("tyalexandermedia.com>") or from_email.endswith("@tyalexandermedia.com")
    checks.append(Check(
        "OUTREACH_FROM_EMAIL", HIGH, bool(from_email) and not root_domain,
        "Cold email is sending from the ROOT domain — the same one running "
        "Google Workspace and real client conversations, and the one used in "
        "the Aug 2026 authenticated phishing blast. A spam complaint on a cold "
        "batch lands on the inbox you run the business from."
        if root_domain else
        "Not set, so outreach falls back to a default sender.",
        "Verify a SUBDOMAIN in Resend (e.g. send.tyalexandermedia.com) and use\n"
        "      it here: OUTREACH_FROM_EMAIL=\"Coach Ty <ty@send.tyalexandermedia.com>\"\n"
        "      Root-domain reputation then stays separate from cold volume.",
    ))

    # ── reviews / GHL ───────────────────────────────────────────────────────
    checks.append(Check(
        "GHL_API_TOKEN", HIGH, has("GHL_API_TOKEN") and not val("GHL_API_TOKEN").startswith("pit-revoked"),
        "services/build_review_segment.py can't read contacts, so Sandbar's "
        "review segment can't be built — and reviews are the biggest map-pack "
        "lever there is. Sandbar has 0 today.",
        "Generate a FRESH GoHighLevel Private Integration token (the Aug-2 one\n"
        "      is revoked and the script halts on it), then:\n"
        "      export GHL_API_TOKEN=pit-…  GHL_LOCATION_ID=…\n"
        "      python3 services/build_review_segment.py           # dry run\n"
        "      python3 services/build_review_segment.py --apply",
    ))

    # Deliberately NOT an env var: GHL owns outbound to clients' customers, so
    # the review link lives in the GHL campaign, not in this repo. Listing it
    # as a variable here would tell you to set something nothing reads. It is
    # checked as a manual gate because it blocks the highest ranking lever
    # there is, and because it is the step people skip.
    checks.append(Check(
        "Sandbar GBP claimed  (manual)", HIGH, False,
        "A review campaign needs somewhere to send people, and that link needs "
        "Sandbar's Google Business Profile to be CLAIMED and verified. That is "
        "the real gate — not the script, which is ready. Sandbar has 0 reviews "
        "today, and review count is the biggest map-pack signal after "
        "proximity.",
        "1. Claim + verify Sandbar's GBP\n"
        "      2. Get its place ID -> https://search.google.com/local/writereview?placeid=…\n"
        "      3. Confirm past customers exist in GHL tagged `customer:past`\n"
        "      4. Put the link in the GHL campaign, sending from SANDBAR's\n"
        "         domain and number — not yours. Full order in docs/LAUNCH.md §4.",
    ))

    # ── the site's own credibility ──────────────────────────────────────────
    checks.append(Check(
        "VITE_GBP_URL", LATER, has("VITE_GBP_URL"),
        "The founder block reads 'Find us on Google Maps' instead of "
        "'✓ Verified Google Business'. That is deliberate and correct until "
        "there is a real listing — the badge used to claim a verification that "
        "pointed at a Maps SEARCH QUERY.",
        "Claim your own GBP (verification has a multi-week lag — start it now),\n"
        "      then set VITE_GBP_URL in Vercel and REDEPLOY (Vite bakes VITE_* in\n"
        "      at build time; saving the variable is not enough).",
    ))

    checks.append(Check(
        "VITE_VSL_URL", LATER, has("VITE_VSL_URL"),
        "The VSL player renders nothing on the homepage and /start. No broken "
        "embed, just absent.",
        "Vercel → VITE_VSL_URL=https://www.youtube.com/watch?v=…\n"
        "      plus VITE_VSL_POSTER and VITE_VSL_UPLOAD_DATE. Redeploy.",
    ))

    checks.append(Check(
        "Portfolio screenshots", LATER,
        os.path.exists("frontend/public/images/work/sandbarsoftwash-com.jpg"),
        "/work and the homepage portfolio ship two <img> tags pointing at 404s. "
        "An onError handler hides them in a browser, but they are still in the "
        "crawlable HTML.",
        "Save real screenshots to\n"
        "      frontend/public/images/work/sandbarsoftwash-com.jpg\n"
        "      frontend/public/images/work/travelsbyval-com.jpg",
    ))

    # ── dashboard truthfulness ──────────────────────────────────────────────
    for var, label in [
        ("CALLRAIL_API_KEY", "call tracking"),
        ("GSC_SERVICE_ACCOUNT_JSON", "Search Console"),
        ("GOOGLE_OAUTH_CLIENT_ID", "Google Business Profile"),
    ]:
        checks.append(Check(
            var, LATER, has(var),
            f"The client dashboard shows {label} as pending rather than live.",
            f"Railway → {var}=…  (GBP needs Google to approve API access — "
            f"that approval wait is the long pole, so start it early.)",
        ))

    return checks


def main() -> int:
    checks = build_checks()
    width = max(len(c.name) for c in checks) + 2

    print("\n  LOLA GO-LIVE PREFLIGHT")
    print("  " + "─" * 66)
    for sev in (CRITICAL, HIGH, LATER):
        group = [c for c in checks if c.severity == sev]
        if not group:
            continue
        print(f"\n  {COLOR[sev]}{sev}{RESET}")
        for c in group:
            mark = f"{OK}✓{RESET}" if c.ok else f"{COLOR[sev]}✗{RESET}"
            print(f"    {mark}  {c.name:<{width}}")

    missing = [c for c in checks if not c.ok]
    if missing:
        print("\n  " + "─" * 66)
        print("  WHAT EACH MISSING ONE COSTS YOU\n")
        for c in missing:
            print(f"  {COLOR[c.severity]}✗ {c.name}{RESET}  [{c.severity}]")
            print(f"      breaks: {c.breaks}")
            print(f"      fix:    {c.fix}\n")

    crit = [c for c in missing if c.severity == CRITICAL]
    done = len(checks) - len(missing)
    print("  " + "─" * 66)
    print(f"  {done}/{len(checks)} configured · {len(crit)} critical outstanding\n")
    if crit:
        print(f"  {COLOR[CRITICAL]}Do these first:{RESET} " + ", ".join(c.name for c in crit) + "\n")
    return 1 if crit else 0


if __name__ == "__main__":
    sys.exit(main())
