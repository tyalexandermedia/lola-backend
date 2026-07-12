"""
Growth Score follow-up runner.

Walks enrolled leads (db/followups.py) through a 3-touch cadence so a free
Growth Score turns into a booked call or a sale:

    Step 1  (~24h)  Nudge  — "did you see your score? here's the #1 fix" + pricing
    Step 2  (~72h)  Proof  — the Half-Back Guarantee + book/build
    Step 3  (~7d)   Final  — EMAIL ONLY, quietly introduces the monthly option

There's a SECOND sequence, kind='build', for people who bought the $997 Full
Build — it nurtures them toward the $297/mo "Lola Managed" continuity, timed to
land as their 30-day build window closes (~day 25 → 32 → 46). Recurring MRR is
the LTV engine; the build is the on-ramp.

Channels: email (Resend) + SMS (Twilio, only if the lead consented). Every SMS
gets "Reply STOP to opt out." appended by reviews.sms.send_sms.

Safety:
  • Dormant until a provider is actually configured (RESEND_API_KEY or Twilio),
    so enabling the loop with nothing wired up never silently burns the sequence.
  • A step is advanced on ATTEMPT (not only on success), so a transient provider
    error can't trap a lead in an infinite resend loop.
  • The monthly retainer is mentioned in the prospect final EMAIL only — never
    in prospect SMS (the build sequence does pitch it, since they're customers).
"""

import asyncio
import os
import time
import traceback
from typing import Optional

import httpx

from db import followups
from reviews.sms import send_sms, twilio_enabled

# ── Config (env-overridable; hours) ───────────────────────────────────────
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://lola.tyalexandermedia.com").rstrip("/")
CALL_URL = os.getenv(
    "FOLLOWUP_CALL_URL", "https://calendar.app.google/J7idjUDitd2Hziuc7"
)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip() or None
FROM_EMAIL = os.getenv("AUDIT_FROM_EMAIL", "Coach Ty (Lola) <ty@tyalexandermedia.com>")
REPLY_TO = os.getenv("AUDIT_REPLY_TO_EMAIL", "ty@tyalexandermedia.com")


def _hours(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# Delay before step 1, then the gaps between subsequent steps.
STEP1_DELAY_SEC = _hours("FOLLOWUP_STEP1_HOURS", 24) * 3600
GAP_1_2_SEC = _hours("FOLLOWUP_STEP2_GAP_HOURS", 48) * 3600   # ~72h from submit
GAP_2_3_SEC = _hours("FOLLOWUP_STEP3_GAP_HOURS", 96) * 3600   # ~7d from submit
SCAN_SECONDS = int(os.getenv("FOLLOWUP_SCAN_SECONDS", "900"))  # 15 min


def _days(name: str, default_days: float) -> float:
    try:
        return float(os.getenv(name, str(default_days)))
    except (TypeError, ValueError):
        return default_days


# ── Post-build → $297/mo "Lola Managed" continuity ─────────────────────────
# After someone buys the $997 Full Build, nurture them toward the monthly that
# keeps them ranked. Timed to land as the 30-day build window closes — right
# when they've felt the win and momentum matters most.
MANAGED_MONTHLY = os.getenv("FOLLOWUP_MANAGED_PRICE", "$297/mo")
# Nurture CTAs point at the /managed landing page by default (it holds the
# subscribe button + the full pitch). Override with a direct Stripe link if you
# prefer one-click checkout from the text/email.
MANAGED_URL = (os.getenv("FOLLOWUP_MANAGED_URL", "").strip() or f"{PUBLIC_APP_URL}/managed")
BUILD_STEP1_SEC = _days("FOLLOWUP_BUILD_STEP1_DAYS", 25) * 86400
BUILD_GAP_1_2_SEC = _days("FOLLOWUP_BUILD_GAP12_DAYS", 7) * 86400   # ~day 32
BUILD_GAP_2_3_SEC = _days("FOLLOWUP_BUILD_GAP23_DAYS", 14) * 86400  # ~day 46


def followup_enabled() -> bool:
    return os.getenv("FOLLOWUP_ENABLED", "true").strip().lower() == "true"


def _providers_ready() -> bool:
    """Only run when we can actually deliver something."""
    return bool(RESEND_API_KEY) or twilio_enabled()


def first_delay_sec() -> float:
    return STEP1_DELAY_SEC


def build_first_delay_sec() -> float:
    return BUILD_STEP1_SEC


def _next_gap(kind: str, step: int) -> Optional[float]:
    """Seconds until the next step for a sequence kind, or None when finished."""
    if kind == "build":
        if step == 1:
            return BUILD_GAP_1_2_SEC
        if step == 2:
            return BUILD_GAP_2_3_SEC
        return None
    if step == 1:
        return GAP_1_2_SEC
    if step == 2:
        return GAP_2_3_SEC
    return None


# ── Message content ────────────────────────────────────────────────────────

def _name(row: dict) -> str:
    return (row.get("business_name") or "there").strip() or "there"


def _email_wrap(title: str, body_html: str) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e3da;">
<tr><td style="background:#0A0A0B;padding:18px 28px;"><span style="color:#D4AF37;font-weight:800;letter-spacing:.14em;font-size:13px;">LOLA 🐾 — AI LEADS EXPERT</span></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0A0A0B;">{title}</h1>
{body_html}
</td></tr>
<tr><td style="padding:0 28px 26px;color:#8a8f98;font-size:12px;line-height:1.6;">
Coach Ty · Ty Alexander Media · Tampa Bay, FL<br>
You're getting this because you ran a free Growth Score at lola.tyalexandermedia.com. Reply STOP and I'll take you off follow-ups.
</td></tr>
</table></td></tr></table></body></html>"""


def _btn(href: str, label: str) -> str:
    return (
        f'<a href="{href}" style="display:inline-block;background:#D4AF37;color:#0A0A0B;'
        f'font-weight:800;text-decoration:none;padding:13px 22px;border-radius:10px;font-size:14px;">{label}</a>'
    )


def _content(step: int, row: dict) -> dict:
    """Return {subject, html, text, sms} for a given step (1..3)."""
    if (row.get("kind") or "score") == "build":
        return _build_content(step, row)

    name = _name(row)
    report = row.get("report_url") or f"{PUBLIC_APP_URL}/growth-score"
    pricing = f"{PUBLIC_APP_URL}/pricing"

    if step == 1:
        subject = f"{name}: your Growth Score + the #1 fix"
        html = _email_wrap(
            "Did you catch your Growth Score?",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Hey {name}, it's Ty. Your free Growth Score shows exactly where you show up on Google <em>and</em> in AI answers (ChatGPT, Perplexity, Gemini) — plus the single biggest fix to climb.</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.65;"><a href="{report}" style="color:#B8860B;">👉 Re-open your score</a>. Want to fix it yourself? The $197 DIY guide walks you through it. Want us to just build it and rank it? That's the $997 Full Build.</p>
<p style="margin:0 0 22px;">{_btn(pricing, "See my two options →")}</p>""",
        )
        text = (
            f"Hey {name}, it's Ty. Your free Growth Score shows where you show up on Google "
            f"and in AI answers, plus the #1 fix. Re-open it: {report} — "
            f"DIY $197 or we build+rank it for $997: {pricing}"
        )
        sms = (
            f"Hey {name}, it's Lola 🐾 Did you catch your Growth Score? Your #1 fix is inside: "
            f"{report} — or we build + rank it for you: {pricing}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    if step == 2:
        subject = "We'll put the guarantee in writing"
        html = _email_wrap(
            "The Half-Back Guarantee",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Most agencies want $2,000–$5,000/mo and a 6-month contract. The Full Build is a one-time $997 — a new site, 30 days of getting you found on Google and in AI answers, and your Google Business Profile dialed in.</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.65;"><strong>And it's guaranteed:</strong> we pick 5 money keywords together in week 1. If we don't get at least 1 of them ranking on page 1 or in the map pack within 30 days, you get half your investment back. No fine print.</p>
<p style="margin:0 0 22px;">{_btn(CALL_URL, "Book a free 15-min call →")}</p>""",
        )
        text = (
            "The $997 Full Build: new site + 30 days getting you found on Google and AI, "
            "backed by the Half-Back Guarantee (5 money keywords in week 1; if we don't rank "
            f"at least 1 in 30 days, half back). Book: {CALL_URL}"
        )
        sms = (
            f"{name}, the $997 Full Build is backed by our Half-Back Guarantee — we rank 1 of "
            f"your 5 money keywords in 30 days or half back. Grab a free call: {CALL_URL}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    # step 3 — final, EMAIL ONLY (introduces the $297/mo option)
    subject = "Last note from Lola 🐾"
    html = _email_wrap(
        "One last thing",
        f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">I won't keep bugging you, {name} — but you ran your Growth Score for a reason, and every week you're not found is jobs going to the competitor above you.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Two ways to fix it: the <strong>$197 DIY</strong> guide, or the <strong>$997 Full Build</strong> (done-for-you, Half-Back Guarantee). And if you want us to keep working your visibility every month after the build, there's an optional <strong>{MANAGED_MONTHLY}</strong> to keep you climbing and keep the reviews and rankings coming.</p>
<p style="margin:0 0 22px;">{_btn(CALL_URL, "Let's talk — free call →")} &nbsp; <a href="{PUBLIC_APP_URL}/pricing" style="color:#B8860B;font-weight:700;">or see pricing</a></p>""",
    )
    text = (
        f"Last note, {name}. Fix your visibility: $197 DIY or the $997 Full Build "
        f"(Half-Back Guarantee). Optional {MANAGED_MONTHLY} after the build keeps you climbing. "
        f"Book: {CALL_URL} · Pricing: {PUBLIC_APP_URL}/pricing"
    )
    return {"subject": subject, "html": html, "text": text, "sms": None}


def _build_content(step: int, row: dict) -> dict:
    """Post-build continuity toward $297/mo 'Lola Managed'. Steps 1..3."""
    name = _name(row)
    keep = MANAGED_URL  # Stripe subscription link when set, else the booking link

    if step == 1:
        subject = "Your 30 days are almost up 🐾"
        html = _email_wrap(
            "Want us to keep you climbing?",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Hey {name}, we're near the end of your Full Build's 30-day window — your site's live and we've been getting you found on Google and in AI answers.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Here's the thing: rankings and reviews aren't "set it and forget it." The businesses that stay on top keep showing up every week. <strong>Lola Managed ({MANAGED_MONTHLY})</strong> keeps the engine running — rankings + AI answers monitored, fresh Google Business posts, review requests going out, and new leads followed up automatically.</p>
<p style="margin:0 0 22px;">{_btn(keep, "Keep me climbing →")}</p>""",
        )
        text = (
            f"Hey {name}, your Full Build's 30-day window is almost up. Lola Managed "
            f"({MANAGED_MONTHLY}) keeps you ranked + in AI answers, keeps reviews and GBP "
            f"posts flowing, and follows up your leads. Keep it going: {keep}"
        )
        sms = (
            f"Hey {name}, it's Lola 🐾 Your 30-day build window's almost up. Want us to keep you "
            f"climbing every month? Lola Managed = {MANAGED_MONTHLY}. Keep it going: {keep}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    if step == 2:
        subject = "Don't let the momentum stall"
        html = _email_wrap(
            "What stops if we stop",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">{name} — the hardest part is done. But the moment the work stops, competitors keep posting, keep gathering reviews, and slowly climb back over you. Momentum is the whole game in local + AI search.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">For <strong>{MANAGED_MONTHLY}</strong>, Lola Managed keeps you in front: monthly Google Business posts, review requests to your happy customers, rankings + AI-answer monitoring, and automatic follow-up on every new lead — so the phone keeps ringing.</p>
<p style="margin:0 0 22px;">{_btn(keep, "Keep the momentum →")}</p>""",
        )
        text = (
            f"{name}, the hard part's done — don't let it stall. Lola Managed ({MANAGED_MONTHLY}) "
            f"keeps your rankings, reviews, GBP posts and lead follow-up going every month: {keep}"
        )
        sms = (
            f"{name}, don't let your momentum stall — competitors keep climbing. Lola Managed "
            f"({MANAGED_MONTHLY}) keeps you in front every month: {keep}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    # step 3 — final, email only
    subject = "Keeping your spot 🐾"
    html = _email_wrap(
        "One last note",
        f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">I won't keep nudging, {name}. You've got a great site and a real head start. If you want us to keep it working — rankings, AI answers, reviews, and lead follow-up handled every month — Lola Managed is {MANAGED_MONTHLY}, cancel anytime.</p>
<p style="margin:0 0 22px;">{_btn(keep, "Keep me on top →")} &nbsp; <a href="{CALL_URL}" style="color:#B8860B;font-weight:700;">or grab a quick call</a></p>""",
    )
    text = (
        f"Last note, {name}. Keep it working every month with Lola Managed ({MANAGED_MONTHLY}), "
        f"cancel anytime: {keep} — or book a call: {CALL_URL}"
    )
    return {"subject": subject, "html": html, "text": text, "sms": None}


# ── Sending ────────────────────────────────────────────────────────────────

async def _send_email(client: httpx.AsyncClient, to_email: str, subject: str, html: str, text: str) -> bool:
    if not RESEND_API_KEY or not to_email:
        return False
    try:
        resp = await client.post(
            "https://api.resend.com/emails",
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": REPLY_TO,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            timeout=15,
        )
        ok = 200 <= resp.status_code < 300
        if not ok:
            print(f"Followup email {resp.status_code}: {resp.text[:200]}")
        return ok
    except Exception:
        traceback.print_exc()
        return False


async def _send_step(client: httpx.AsyncClient, step: int, row: dict) -> bool:
    """Send one step across the channels we have. Returns True if anything sent."""
    c = _content(step, row)
    sent = False
    email = (row.get("email") or "").strip()
    phone = (row.get("phone") or "").strip()

    if email:
        sent = await _send_email(client, email, c["subject"], c["html"], c["text"]) or sent
    if c.get("sms") and phone and row.get("sms_consent"):
        sent = await send_sms(phone, c["sms"], client=client) or sent
    return sent


async def process_due(limit: int = 100) -> dict:
    """Send every currently-due step. Safe to call repeatedly / on demand."""
    if not followup_enabled():
        return {"skipped": "disabled"}
    if not _providers_ready():
        return {"skipped": "no_provider"}

    rows = await followups.due(limit=limit)
    if not rows:
        return {"processed": 0}

    processed = 0
    async with httpx.AsyncClient() as client:
        for row in rows:
            step = int(row.get("step") or 0) + 1  # next step to send (1..3)
            try:
                await _send_step(client, step, row)
            except Exception:
                traceback.print_exc()
            # Advance on attempt so a bad send can't loop a lead forever.
            gap = _next_gap(row.get("kind") or "score", step)
            done = step >= 3 or gap is None
            next_at: Optional[float] = None if done else time.time() + gap
            await followups.advance(row["audit_id"], step=step, next_at=next_at, done=done)
            processed += 1
    return {"processed": processed}


async def stats() -> dict:
    return await followups.stats()


async def run_loop() -> None:
    """Background scan loop — started on app startup when enabled."""
    print(
        f"🔁 Follow-up runner started (scan every {SCAN_SECONDS}s, "
        f"step1 +{STEP1_DELAY_SEC/3600:.0f}h)."
    )
    while True:
        try:
            if _providers_ready():
                result = await process_due()
                if result.get("processed"):
                    print(f"🔁 Follow-ups sent: {result['processed']}")
        except Exception:
            traceback.print_exc()
        await asyncio.sleep(SCAN_SECONDS)
