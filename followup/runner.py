"""
Growth Score follow-up runner.

Walks enrolled leads (db/followups.py) through a 3-touch cadence so a free
Growth Score turns into a sale:

    Step 1  (~24h)  Nudge  — "did you see your score? here's the #1 fix" + checkout
    Step 2  (~72h)  Proof  — the 90-Day Promise + exclusivity
    Step 3  (~7d)   Final  — EMAIL ONLY, the offer stated plainly one last time

There's a SECOND sequence, kind='build', for people who have already paid. It
used to upsell them from a $997 one-time build to a $297/mo retainer; with a
single $397/month plan there is nothing to upsell, so it now chases the thing
that actually blocks delivery — the 2-minute intake at /apply. Checkout takes a
card; it doesn't tell Ty what the business does.

Channels: email (Resend) + SMS (Twilio, only if the lead consented). Every SMS
gets "Reply STOP to opt out." appended by reviews.sms.send_sms.

Safety:
  • Dormant until a provider is actually configured (RESEND_API_KEY or Twilio),
    so enabling the loop with nothing wired up never silently burns the sequence.
  • A step is advanced on ATTEMPT (not only on success), so a transient provider
    error can't trap a lead in an infinite resend loop.
  • Step 3 is EMAIL ONLY in both sequences — the last touch is the one most
    likely to read as pestering, and it costs less trust in an inbox than a text.
  • The 'build' sequence never sells. Those rows are paying subscribers; every
    message in it points at the intake form and nothing else.
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
# Checkout, not a calendar. These emails used to point at a Google Calendar
# booking link; Ty doesn't sell on calls, and a booking form is a slower, lossier
# ask than the Payment Link the rest of the site now uses.
CHECKOUT_URL = os.getenv(
    "STRIPE_MONTHLY_URL", "https://buy.stripe.com/00w3cu8e6g3lcLTcTD3oA0c"
).strip()
PLAN_PRICE = os.getenv("FOLLOWUP_PLAN_PRICE", "$397/month")
from api_clients.ghl import outbound_via_ghl

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


# ── Post-purchase onboarding nudges ────────────────────────────────────────
# This branch used to nurture $997 Full Build buyers toward a $297/mo "Lola
# Managed" upsell. Both of those products are retired: there is one plan, and a
# "build" row is now someone who is already paying $397/month. Pitching them a
# monthly they already have is the worst email we could send.
#
# What they actually need is the intake form. Checkout collects a card, not a
# business — until /apply is filled in, Ty has a subscriber he can't start work
# for. So these three steps chase the intake, not a sale.
INTAKE_URL = f"{PUBLIC_APP_URL}/apply"
BUILD_STEP1_SEC = _days("FOLLOWUP_BUILD_STEP1_DAYS", 1) * 86400
BUILD_GAP_1_2_SEC = _days("FOLLOWUP_BUILD_GAP12_DAYS", 2) * 86400
BUILD_GAP_2_3_SEC = _days("FOLLOWUP_BUILD_GAP23_DAYS", 4) * 86400


def followup_enabled() -> bool:
    return os.getenv("FOLLOWUP_ENABLED", "true").strip().lower() == "true"


def _providers_ready() -> bool:
    """Only run when we can actually deliver something — and when it's ours to send."""
    # GHL owns outbound to clients' customers. RESEND_API_KEY is set on this
    # service regardless (main.py sends Lola's own audit-confirmation mail with
    # it), so without this check that key alone would wake this runner and put
    # a second sender in front of people GHL is already messaging.
    if outbound_via_ghl():
        return False
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
        subject = f"{name}: fix #1 is done — three left"
        html = _email_wrap(
            "Did you catch your Growth Score?",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Hey {name}, it's Ty. Your Growth Score came with your first fix already written — the title tag for your page. Paste it in and it works; that one's yours free.</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.65;">Three left: your Google Business Profile description, your first GBP post, and the schema that decides whether AI can read your business at all. <a href="{report}" style="color:#B8860B;">👉 Re-open your score</a> — or I do all of it, plus build you a new site, for {PLAN_PRICE}.</p>
<p style="margin:0 0 22px;">{_btn(CHECKOUT_URL, f"Start my monthly — {PLAN_PRICE} →")} &nbsp; <a href="{pricing}" style="color:#B8860B;font-weight:700;">or see what's included</a></p>""",
        )
        text = (
            f"Hey {name}, it's Ty. Your Growth Score came with your first fix written and ready "
            f"to paste — that one's free. Three left: GBP description, first post, and your "
            f"schema. Re-open it: {report} — or I do all of it plus build your site for "
            f"{PLAN_PRICE}: {CHECKOUT_URL}"
        )
        sms = (
            f"Hey {name}, it's Lola 🐾 Your first fix is written and waiting in your score: "
            f"{report} — or Ty does all of it plus builds your site: {PLAN_PRICE}, {pricing}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    if step == 2:
        subject = "I'll put the guarantee in writing"
        html = _email_wrap(
            "The 90-Day Promise",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Most agencies want $2,000–$5,000/mo and a 6-month contract. Mine is {PLAN_PRICE} — and your website design is included free. No setup fee, no build charge. Cancel anytime after the first 3 months.</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.65;"><strong>And it's guaranteed:</strong> we pick your 5 money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free. No fine print.</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.65;">One more thing worth knowing: I take one client per trade, per city. I can't rank two soft-wash companies in the same town against each other — so I don't take the second one.</p>
<p style="margin:0 0 22px;">{_btn(CHECKOUT_URL, f"Start my monthly — {PLAN_PRICE} →")}</p>""",
        )
        text = (
            f"{PLAN_PRICE} — website design included free, no setup fee, cancel anytime after 3 "
            "months. Backed by the 90-Day Promise: we pick your 5 money keywords in week 1, and "
            "if I don't get you ranking on page one or in the map pack within 90 days, your next "
            f"2 months are free. Start: {CHECKOUT_URL}"
        )
        sms = (
            f"{name}, it's {PLAN_PRICE} and your site build is included free — backed by my "
            f"90-Day Promise: ranking in 90 days or your next 2 months are free. {CHECKOUT_URL}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    # step 3 — final, EMAIL ONLY
    subject = "Last note from Lola 🐾"
    html = _email_wrap(
        "One last thing",
        f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">I won't keep bugging you, {name} — but you ran your Growth Score for a reason, and every week you're not found is jobs going to the competitor above you.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">One plan, one price: <strong>{PLAN_PRICE}</strong>. Your website designed and built — included free — then your Google Business Profile managed and ongoing work to get you named when someone asks Google or ChatGPT for a company like yours. Backed by the 90-Day Promise.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">I take one client per trade, per city. If someone in your trade and town starts before you, that's the seat.</p>
<p style="margin:0 0 22px;">{_btn(CHECKOUT_URL, f"Start my monthly — {PLAN_PRICE} →")} &nbsp; <a href="{pricing}" style="color:#B8860B;font-weight:700;">or see what's included</a></p>""",
    )
    text = (
        f"Last note, {name}. One plan: {PLAN_PRICE}, website design included free, no setup fee, "
        "cancel anytime after 3 months. Backed by the 90-Day Promise. One client per trade, per "
        f"city. Start: {CHECKOUT_URL} · What's included: {pricing}"
    )
    return {"subject": subject, "html": html, "text": text, "sms": None}


def _build_content(step: int, row: dict) -> dict:
    """Post-purchase onboarding. Steps 1..3 — chase the intake, never upsell.

    These rows are paying subscribers. The only thing missing is the 2-minute
    intake at /apply: without it Ty has a card on file and no idea what the
    business does, where it works, or which keywords to pick in week 1.
    """
    name = _name(row)

    if step == 1:
        subject = "Two minutes and I can start 🐾"
        html = _email_wrap(
            "You're in — one small thing left",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Welcome aboard, {name}. Your payment's in and your seat is held — one client per trade, per city, and that's yours now.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">I need about two minutes from you before I can start: your trade, the towns you actually drive to, and your current site if you have one. That's what I use to pick your 5 money keywords in week 1 — the ones the 90-Day Promise is measured against.</p>
<p style="margin:0 0 22px;">{_btn(INTAKE_URL, "Fill in my 2-minute intake →")}</p>""",
        )
        text = (
            f"Welcome aboard, {name}. Your payment's in. I need ~2 minutes from you before I can "
            f"start — trade, towns you serve, current site: {INTAKE_URL}"
        )
        sms = (
            f"Hey {name}, it's Lola 🐾 You're in. Ty needs 2 min from you before he can start — "
            f"trade, towns, current site: {INTAKE_URL}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    if step == 2:
        subject = "Still need your details to start"
        html = _email_wrap(
            "I don't want to burn your week 1",
            f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">{name} — you're paid up and I still can't start. I've got a card and no business: I don't know your trade, your service area, or what your customers actually type into Google.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">The 90-day clock is real, and week 1 is when we pick the keywords it's measured against. Two minutes fixes it.</p>
<p style="margin:0 0 22px;">{_btn(INTAKE_URL, "Send Ty my details →")}</p>""",
        )
        text = (
            f"{name} — you're paid up and I still can't start. Two minutes: trade, service area, "
            f"current site. {INTAKE_URL}"
        )
        sms = (
            f"{name}, Ty still can't start — he needs your trade + service area. 2 min: {INTAKE_URL}"
        )
        return {"subject": subject, "html": html, "text": text, "sms": sms}

    # step 3 — final, email only
    subject = "Want me to just call you? 🐾"
    html = _email_wrap(
        "Last nudge, then I'll come to you",
        f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Last one, {name}. You're paying and not being worked on, and that sits wrong with me.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;">Either fill in the intake — two minutes, link below — or just hit reply to this email with your trade and the towns you serve, and I'll set the rest up myself. Whichever is easier for you.</p>
<p style="margin:0 0 22px;">{_btn(INTAKE_URL, "Fill in my intake →")}</p>""",
    )
    text = (
        f"Last one, {name}. You're paying and not being worked on. Fill in the intake "
        f"({INTAKE_URL}) or just reply to this email with your trade and the towns you serve, "
        "and I'll set it up myself."
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
