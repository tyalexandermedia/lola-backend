"""
LOLA SEO — Agent 2: Personalized HTML Email Report
Matches the frontend conversion flow exactly:
  Score → Issues → $97 Playbook → $400 Retainer
Every sentence references THIS business. No generic copy.
"""

GRADE_EMOJI  = {"A": "🏆", "B": "✅", "C": "🐾", "D": "⚠️", "F": "🚨"}
SEV_COLOR    = {"Critical": "#E05252", "High": "#E08840", "Medium": "#D4B84A"}

QUICK_FIX_LINK = "https://www.tyalexandermedia.com/contact?offer=quick-fix"
RETAINER_LINK  = "https://www.tyalexandermedia.com/contact?offer=retainer"
REVIEW_LINK    = "https://share.google/IPROAQnD4PhW8zXxi"
LOLA_LOGO      = "https://lola-seo.vercel.app/lola-logo.png"

# ── Design tokens (matches frontend exactly) ─────────────────
DARK      = "#0A0A0A"
DARK_CARD = "#111111"
DARK_BDR  = "#1E1E1E"
GOLD      = "#C9A84C"
GOLD_DIM  = "#8B6E2E"
TEXT      = "#F0EAD6"
MUTED     = "#8A8278"
FAINT     = "#5A554E"
CRITICAL  = "#E05252"
HIGH      = "#E08840"
GREEN     = "#4CAF80"


def generate_html_report(audit: dict) -> str:
    biz         = audit.get("business_name", "Your Business")
    city        = audit.get("city", "your city").split(",")[0].strip()
    url         = audit.get("website", "")
    btype       = audit.get("business_type", "contractor").replace("_", " ").title()
    total       = audit.get("total_score", 0)
    grade       = audit.get("grade", "F")
    grade_label = audit.get("grade_label", "Off the Leash")
    revenue_leak= audit.get("revenue_leak_monthly", 0)
    leads_lost  = audit.get("leads_lost_monthly", "20–35")
    issues      = audit.get("issues", [])
    quick_wins  = audit.get("quick_wins", [])
    cats        = audit.get("categories", {})
    roadmap     = audit.get("roadmap", {})

    competitors = audit.get("competitors") or []
    comp        = competitors[0] if competitors else {}
    comp_name   = comp.get("title") or comp.get("name") or comp.get("business_name") or ""
    comp_url    = comp.get("url", "")
    has_comp    = bool(comp_name and comp_name.strip())

    # Score color
    if total >= 75:
        score_color = GREEN
    elif total >= 50:
        score_color = HIGH
    else:
        score_color = CRITICAL

    grade_emoji = GRADE_EMOJI.get(grade, "🚨")

    # Grade-aware one-liner summary
    summaries = {
        "A": f"{biz} is dialed in. A few more moves and you own {city}.",
        "B": f"{biz} has a solid base — but the gap to #1 in {city} is specific and closable.",
        "C": f"{biz} is showing up but leaving real money on the table in {city} every week.",
        "D": f"{biz} has serious gaps. Customers in {city} are searching — and finding someone else.",
        "F": f"{biz} is effectively invisible on Google right now. Every day costs you customers.",
    }
    summary = summaries.get(grade, summaries["F"])

    # Urgency line for $97 CTA
    if has_comp:
        urgency = f"Every day you wait is another day {comp_name} gets that call instead of you."
    else:
        urgency = f"Every day you wait, a competitor in {city} is picking up the phone you should be answering."

    # ── Helper: category bar row ────────────────────────────
    def cat_row(label: str, key: str) -> str:
        cat   = cats.get(key, {})
        score = cat.get("score", 0)
        status= cat.get("status", "critical")
        color = GREEN if status == "good" else GOLD if status == "warning" else CRITICAL
        return f"""
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:{MUTED};border-bottom:1px solid {DARK_BDR};font-family:-apple-system,sans-serif">{label}</td>
          <td style="padding:10px 16px;border-bottom:1px solid {DARK_BDR}">
            <div style="background:{DARK};border-radius:2px;height:6px;width:100%;max-width:140px">
              <div style="background:{color};height:6px;border-radius:2px;width:{score}%"></div>
            </div>
          </td>
          <td style="padding:10px 16px;font-size:16px;font-weight:700;color:{color};border-bottom:1px solid {DARK_BDR};text-align:right;font-family:'DM Mono',monospace,sans-serif">{score}<span style="font-size:11px;color:{FAINT}">/100</span></td>
        </tr>"""

    # ── Helper: issue block ──────────────────────────────────
    def issue_block(issue: dict) -> str:
        sev   = issue.get("severity", "Medium")
        color = SEV_COLOR.get(sev, GOLD)
        rev   = issue.get("revenue_impact", "")
        return f"""
        <div style="border-left:3px solid {color};padding:14px 18px;background:{DARK};border-radius:0 6px 6px 0;margin-bottom:10px">
          <div style="font-size:10px;font-weight:600;color:{color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">{sev} Impact</div>
          <div style="font-size:14px;font-weight:600;color:{TEXT};margin-bottom:5px;font-family:-apple-system,sans-serif">{issue.get('issue','')}</div>
          <div style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:6px;font-family:-apple-system,sans-serif">{issue.get('description','')}</div>
          {f'<div style="font-size:12px;color:{color};font-weight:600">💸 {rev}</div>' if rev else ''}
        </div>"""

    # ── Helper: quick win block ──────────────────────────────
    def win_block(win: dict) -> str:
        steps_html = "".join(
            f'<li style="font-size:12px;color:{MUTED};line-height:1.65;margin-bottom:4px;font-family:-apple-system,sans-serif">{s}</li>'
            for s in (win.get("steps") or [])
        )
        return f"""
        <div style="background:{DARK};border-radius:6px;padding:14px 16px;margin-bottom:10px;border:1px solid {DARK_BDR}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <div style="font-size:13px;font-weight:600;color:{TEXT};font-family:-apple-system,sans-serif">#{win.get('rank','')} {win.get('win','')}</div>
            <div style="font-size:10px;font-weight:600;padding:3px 8px;background:rgba(76,175,128,0.1);color:{GREEN};border-radius:99px;border:1px solid rgba(76,175,128,0.2);white-space:nowrap">{win.get('effort','')}</div>
          </div>
          <ol style="margin:0;padding-left:18px">{steps_html}</ol>
        </div>"""

    # ── Helper: roadmap block ────────────────────────────────
    def roadmap_block(label: str, key: str, color: str) -> str:
        items = roadmap.get(key, [])
        if not items:
            return ""
        items_html = "".join(
            f'<li style="font-size:12px;color:{MUTED};line-height:1.65;margin-bottom:3px;font-family:-apple-system,sans-serif">{i}</li>'
            for i in items
        )
        return f"""
        <div style="border-left:3px solid {color};padding:12px 16px;margin-bottom:8px;background:{DARK};border-radius:0 6px 6px 0">
          <div style="font-size:10px;font-weight:600;color:{color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">{label}</div>
          <ul style="margin:0;padding-left:16px">{items_html}</ul>
        </div>"""

    # ── Build sections ───────────────────────────────────────
    issues_html  = "".join(issue_block(i) for i in issues[:6])
    wins_html    = "".join(win_block(w) for w in quick_wins[:4])
    roadmap_html = (
        roadmap_block("Days 1–30",  "day_30", GREEN)
      + roadmap_block("Days 31–60", "day_60", GOLD)
      + roadmap_block("Days 61–90", "day_90", "#6366f1")
    )

    comp_section = ""
    if has_comp:
        comp_section = f"""
        <!-- Competitor -->
        <div style="padding:0 24px 20px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:{CRITICAL};margin-bottom:10px">🏁 Who's Beating You in {city}</div>
          <div style="background:{DARK};border-radius:6px;padding:18px;border:1px solid {DARK_BDR};border-left:3px solid {CRITICAL}">
            <div style="font-size:15px;font-weight:700;color:{TEXT};margin-bottom:2px;font-family:-apple-system,sans-serif">{comp_name}</div>
            {f'<div style="font-size:11px;color:{FAINT};margin-bottom:10px">{comp_url}</div>' if comp_url else ''}
            <p style="font-size:13px;color:{MUTED};line-height:1.65;margin:0;font-family:-apple-system,sans-serif">
              Lola searched <em>&ldquo;{btype.lower()} in {city}&rdquo;</em> on Google.
              {comp_name} is ranking above {biz} right now.
              Every day that holds, they&rsquo;re getting calls that should be yours.
            </p>
          </div>
        </div>"""

    # ── Sandbar proof point (only for non-A grades) ──────────
    proof_section = ""
    if grade not in ("A", "B"):
        proof_section = f"""
        <div style="margin:0 24px 20px;padding:18px;background:{DARK};border:1px solid {DARK_BDR};border-radius:6px;border-left:3px solid {GOLD}">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:{GOLD};margin-bottom:8px">🐾 Real Results — Tampa Bay</div>
          <p style="font-size:13px;color:{MUTED};line-height:1.65;margin:0;font-family:-apple-system,sans-serif">
            A soft wash contractor in Tampa had the same gaps as {biz} — missing title tags, no GBP, zero schema.
            <strong style="color:{TEXT}">They ranked for their top 5 keywords in 3 weeks.</strong>
            The fix list below is the same playbook.
          </p>
        </div>"""

    # ── Google review link ───────────────────────────────────
    google_review = f"""
        <div style="margin:0 24px 20px;padding:18px;background:{DARK};border:1px solid {DARK_BDR};border-radius:6px;text-align:center">
          <div style="font-size:13px;color:{MUTED};margin-bottom:10px;font-family:-apple-system,sans-serif">Did this report help {biz}? Lola runs on referrals. 🐾</div>
          <a href="{REVIEW_LINK}" style="display:inline-block;padding:10px 20px;border:1px solid {GOLD_DIM};color:{GOLD};font-size:13px;font-weight:600;border-radius:4px;text-decoration:none;font-family:-apple-system,sans-serif">
            Leave Lola a Google Review →
          </a>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LOLA SEO — {biz} Audit Report</title>
</head>
<body style="margin:0;padding:0;background:{DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;background:{DARK_CARD};border-radius:8px;overflow:hidden;border:1px solid {DARK_BDR}">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,{DARK_CARD},{DARK});padding:24px;text-align:center;border-bottom:1px solid {DARK_BDR}">
    <img src="{LOLA_LOGO}" alt="Lola" style="width:56px;height:56px;border-radius:50%;border:2px solid {GOLD_DIM};margin-bottom:12px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:{GOLD};margin-bottom:4px;font-family:'DM Mono',monospace,sans-serif">LOLA SEO · TY ALEXANDER MEDIA</div>
    <div style="font-size:18px;font-weight:700;color:{TEXT};font-family:-apple-system,sans-serif">{biz} — Free SEO Audit</div>
    <div style="font-size:11px;color:{FAINT};margin-top:4px;font-family:'DM Mono',monospace,sans-serif">{url} · {city}</div>
  </div>

  <!-- Score hero -->
  <div style="padding:28px 24px;text-align:center;border-bottom:1px solid {DARK_BDR}">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{FAINT};margin-bottom:10px;font-family:'DM Mono',monospace,sans-serif">Lola&rsquo;s Verdict</div>
    <div style="font-size:80px;font-weight:800;color:{score_color};line-height:1;font-family:'DM Mono',monospace,sans-serif">{total}</div>
    <div style="font-size:12px;color:{FAINT};margin-bottom:10px;font-family:'DM Mono',monospace,sans-serif">/100 · Grade {grade}</div>
    <div style="display:inline-block;padding:6px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:99px;font-size:12px;font-weight:600;color:{GOLD};margin-bottom:16px;font-family:'DM Mono',monospace,sans-serif">
      {grade_emoji} {grade_label}
    </div>
    <p style="font-size:14px;color:{MUTED};line-height:1.7;margin:0 0 14px;font-family:-apple-system,sans-serif">{summary}</p>
    <div style="padding:12px 20px;background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.25);border-radius:6px;display:inline-block">
      <span style="font-size:14px;font-weight:600;color:{CRITICAL};font-family:-apple-system,sans-serif">You&rsquo;re missing an estimated {leads_lost} inbound calls per month.</span>
    </div>
  </div>

  <!-- Revenue leak -->
  <div style="margin:20px 24px;padding:18px 20px;background:{DARK};border:1px solid rgba(224,82,82,0.3);border-radius:6px;text-align:center">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:{CRITICAL};margin-bottom:8px;font-family:'DM Mono',monospace,sans-serif">Estimated Monthly Revenue Leak</div>
    <div style="font-size:52px;font-weight:800;color:{TEXT};line-height:1;font-family:'DM Mono',monospace,sans-serif">${revenue_leak:,}</div>
    <div style="font-size:11px;color:{FAINT};margin-top:4px;font-family:-apple-system,sans-serif">in missed leads per month based on your market and score</div>
  </div>

  <!-- Score breakdown -->
  <div style="padding:0 24px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{GOLD};margin-bottom:12px;font-family:'DM Mono',monospace,sans-serif">🐾 Score Breakdown</div>
    <table style="width:100%;border-collapse:collapse;background:{DARK};border-radius:6px;overflow:hidden;border:1px solid {DARK_BDR}">
      {cat_row("Site Health",     "site_health")}
      {cat_row("Local Presence",  "local_presence")}
      {cat_row("Mobile",          "mobile")}
      {cat_row("Page Speed",      "page_speed")}
      {cat_row("Content",         "content")}
    </table>
  </div>

  <!-- Issues -->
  <div style="padding:0 24px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{CRITICAL};margin-bottom:12px;font-family:'DM Mono',monospace,sans-serif">🚨 What Lola Found</div>
    {issues_html}
  </div>

  {comp_section}

  <!-- Quick wins -->
  <div style="padding:0 24px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{GREEN};margin-bottom:12px;font-family:'DM Mono',monospace,sans-serif">🎾 Quick Wins — Do These First</div>
    {wins_html}
  </div>

  {proof_section}

  <!-- $97 PLAYBOOK CTA (matches frontend exactly) -->
  <div style="margin:0 24px 16px;padding:24px;background:{DARK};border-radius:6px;border-left:3px solid {GOLD};border-top:1px solid {DARK_BDR};border-right:1px solid {DARK_BDR};border-bottom:1px solid {DARK_BDR}">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{GOLD};margin-bottom:8px;font-family:'DM Mono',monospace,sans-serif">Do It Yourself</div>
    <div style="font-size:22px;font-weight:700;color:{TEXT};margin-bottom:8px;font-family:-apple-system,sans-serif">Get Lola&rsquo;s Full Playbook — $97</div>
    <p style="font-size:13px;color:{MUTED};line-height:1.65;margin:0 0 14px;font-family:-apple-system,sans-serif">
      Your score is a <strong style="color:{score_color}">{total}/100</strong>. Agencies charge $500–1,500 for an audit like this.
      Lola&rsquo;s playbook is $97. One time. Yours forever.
    </p>
    <ul style="margin:0 0 16px;padding-left:18px">
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">Exact title tag formulas for {biz} and {city}</li>
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">Meta description templates — ready to copy and paste</li>
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">Schema markup code to paste directly into your site</li>
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">GBP optimization checklist</li>
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">Local citation submission guide</li>
      <li style="font-size:13px;color:{MUTED};line-height:1.65;margin-bottom:5px;font-family:-apple-system,sans-serif">Priority fix order — know exactly what to do first</li>
    </ul>
    <a href="{QUICK_FIX_LINK}&biz={biz}&score={total}" style="display:block;padding:16px;background:{GOLD};color:{DARK};font-weight:700;font-size:17px;border-radius:4px;text-decoration:none;text-align:center;font-family:-apple-system,sans-serif">
      Get the $97 Playbook →
    </a>
    <p style="font-size:12px;color:{CRITICAL};text-align:center;margin:10px 0 0;font-family:-apple-system,sans-serif">{urgency}</p>
  </div>

  <!-- $400 RETAINER UPSELL (immediately after $97) -->
  <div style="margin:0 24px 20px;padding:24px;background:{DARK};border-radius:6px;border:1px solid {GOLD}">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{GOLD};margin-bottom:8px;font-family:'DM Mono',monospace,sans-serif">Most Popular · Best Value</div>
    <div style="font-size:22px;font-weight:700;color:{TEXT};margin-bottom:8px;font-family:-apple-system,sans-serif">Let Ty&rsquo;s Team Handle All of It</div>

    <!-- Value stack -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
      {''.join(f"""<tr><td style="font-size:12px;color:{MUTED};padding:5px 0;border-bottom:1px solid {DARK_BDR};font-family:-apple-system,sans-serif">✓ {item}</td><td style="font-size:11px;color:{FAINT};padding:5px 0;border-bottom:1px solid {DARK_BDR};text-align:right;text-decoration:line-through;font-family:'DM Mono',monospace,sans-serif">{val}</td></tr>""" for item, val in [
        ("Full Lola Audit Report", "$500"),
        ("Title Tag + Meta Implementation", "$300"),
        ("Schema Markup Setup", "$200"),
        ("GBP Optimization", "$300"),
        ("Local Citation Cleanup", "$200"),
        ("Monthly Content (1 page/blog)", "$300"),
        ("Monthly Ranking Report", "$150"),
      ])}
    </table>
    <div style="border-top:1px solid {DARK_BDR};padding-top:10px;margin-bottom:14px;display:flex;justify-content:space-between">
      <span style="font-size:12px;color:{MUTED};font-family:-apple-system,sans-serif">Total Value:</span>
      <span style="font-size:13px;color:{FAINT};text-decoration:line-through;font-family:'DM Mono',monospace,sans-serif">$1,950</span>
    </div>

    <div style="font-size:22px;font-weight:700;color:{GOLD};margin-bottom:8px;font-family:-apple-system,sans-serif">You get all of it for $397 total</div>
    <p style="font-size:13px;color:{MUTED};line-height:1.65;margin:0 0 14px;font-family:-apple-system,sans-serif">
      Add the $97 playbook + Ty&rsquo;s full implementation team for $300 more.
      That&rsquo;s $397 for your first month. Then just $400/month after that.
      Cancel anytime. No contracts. You run {biz} — we get it found, called, and chosen.
    </p>
    <div style="display:inline-block;padding:5px 12px;background:{GOLD};color:{DARK};font-size:11px;font-weight:700;border-radius:3px;margin-bottom:14px;font-family:'DM Mono',monospace,sans-serif">YOU SAVE OVER $1,500</div>
    <br>
    <a href="{RETAINER_LINK}&score={total}&biz={biz}" style="display:block;padding:14px;background:transparent;color:{GOLD};font-weight:700;font-size:16px;border-radius:4px;text-decoration:none;text-align:center;border:1.5px solid {GOLD};font-family:-apple-system,sans-serif">
      Add Ty&rsquo;s Team for $300 More →
    </a>
    <p style="font-size:11px;color:{FAINT};text-align:center;margin:8px 0 0;font-family:-apple-system,sans-serif">Month to month. Cancel anytime. First month = full implementation of everything Lola found today.</p>
  </div>

  <!-- Roadmap -->
  <div style="padding:0 24px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:{MUTED};margin-bottom:12px;font-family:'DM Mono',monospace,sans-serif">📅 Your 90-Day Fix Roadmap</div>
    {roadmap_html}
  </div>

  <!-- Google Review -->
  {google_review}

  <!-- Footer -->
  <div style="padding:16px 24px;background:{DARK};text-align:center;border-top:1px solid {DARK_BDR}">
    <div style="font-size:10px;color:{FAINT};font-family:'DM Mono',monospace,sans-serif">
      Ty Alexander Media · Tampa Bay, FL ·
      <a href="tel:+17273006573" style="color:{GOLD};text-decoration:none">727-300-6573</a> ·
      <a href="https://tyalexandermedia.com" style="color:{FAINT};text-decoration:none">tyalexandermedia.com</a>
    </div>
    <div style="font-size:10px;color:{FAINT};margin-top:6px;font-family:'DM Mono',monospace,sans-serif">
      © 2026 Ty Alexander Media · Tampa Bay FL
    </div>
  </div>

</div>
</body>
</html>"""
