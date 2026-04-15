"""
LOLA SEO — Agent 2: Personalized HTML Report Generator
Every sentence references THIS business by name.
Every issue is tied to dollars lost or customers missed.
Zero generic language. Zero assumptions.
"""

GRADE_EMOJI = {"A": "🏆", "B": "✅", "C": "🐾", "D": "⚠️", "F": "🚨"}
SEVERITY_COLOR = {"Critical": "#f87171", "High": "#fbbf24", "Medium": "#60a5fa"}

STRIPE_LINK = "https://www.tyalexandermedia.com/contact?offer=quick-fix"
CALENDLY_LINK = "https://www.tyalexandermedia.com/contact"
LOLA_LOGO = "https://lola-seo.vercel.app/lola-logo.png"


def generate_html_report(audit: dict) -> str:
    biz  = audit.get("business_name", "Your Business")
    city = audit.get("city", "your city").split(",")[0].strip()
    url  = audit.get("website", "")
    btype = audit.get("business_type", "contractor").replace("_", " ").title()
    total = audit.get("total_score", 0)
    grade = audit.get("grade", "F")
    grade_label = audit.get("grade_label", "Off the Leash")
    revenue_leak = audit.get("revenue_leak_monthly", 0)
    leads_lost = audit.get("leads_lost_monthly", "20–35")
    issues = audit.get("issues", [])
    quick_wins = audit.get("quick_wins", [])
    cats = audit.get("categories", {})
    competitor = (audit.get("competitors") or [{}])[0] if audit.get("competitors") else {}
    comp_name = competitor.get("title", f"a competitor in {city}")
    comp_url  = competitor.get("url", "")
    roadmap   = audit.get("roadmap", {})

    # Lola's one-line summary based on grade
    summaries = {
        "A": f"{biz} is dialed in. A few more moves and you own {city}.",
        "B": f"{biz} has a solid foundation — but the gap to #1 in {city} is specific and closable.",
        "C": f"{biz} is showing up, but leaving real money on the table in {city} every week.",
        "D": f"{biz} has serious gaps. Customers in {city} are searching — and finding someone else.",
        "F": f"{biz} is effectively invisible on Google right now. Every day costs you customers.",
    }
    summary = summaries.get(grade, summaries["F"])

    def cat_row(name: str, key: str) -> str:
        cat = cats.get(key, {})
        score = cat.get("score", 0)
        status = cat.get("status", "critical")
        color = "#22c55e" if status == "good" else "#fbbf24" if status == "warning" else "#f87171"
        bar = round(score)
        return f"""
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#94a8cc;border-bottom:1px solid #111e40">{name}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #111e40">
            <div style="background:#0d1224;border-radius:4px;height:8px;width:100%;max-width:160px">
              <div style="background:{color};height:8px;border-radius:4px;width:{bar}%"></div>
            </div>
          </td>
          <td style="padding:10px 16px;font-size:15px;font-weight:800;color:{color};border-bottom:1px solid #111e40;text-align:right">{score}/100</td>
        </tr>"""

    def issue_block(issue: dict) -> str:
        sev = issue.get("severity", "Medium")
        color = SEVERITY_COLOR.get(sev, "#60a5fa")
        return f"""
        <div style="border-left:4px solid {color};padding:16px 20px;background:#0a1020;border-radius:0 8px 8px 0;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">{sev} Impact</div>
          <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">{issue.get('issue','')}</div>
          <div style="font-size:13px;color:#94a8cc;line-height:1.65;margin-bottom:6px">{issue.get('description','')}</div>
          <div style="font-size:12px;color:{color};font-weight:600">💸 {issue.get('revenue_impact','')}</div>
        </div>"""

    def win_block(win: dict) -> str:
        steps_html = "".join(
            f'<li style="font-size:12px;color:#94a8cc;line-height:1.6;margin-bottom:4px">{s}</li>'
            for s in (win.get("steps") or [])
        )
        return f"""
        <div style="background:#0d1224;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #111e40">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <div style="font-size:14px;font-weight:700;color:#fff">#{win.get('rank','')} {win.get('win','')}</div>
            <div style="font-size:10px;font-weight:700;padding:3px 8px;background:rgba(34,197,94,0.1);color:#22c55e;border-radius:99px;border:1px solid rgba(34,197,94,0.2)">{win.get('effort','')}</div>
          </div>
          <ol style="margin:0;padding-left:20px">{steps_html}</ol>
        </div>"""

    issues_html   = "".join(issue_block(i) for i in issues[:6])
    wins_html     = "".join(win_block(w) for w in quick_wins[:4])
    score_color   = "#22c55e" if total >= 70 else "#fbbf24" if total >= 45 else "#f87171"
    grade_emoji   = GRADE_EMOJI.get(grade, "🚨")

    roadmap_html = ""
    for label, key, color in [("Days 1–30", "day_30", "#22c55e"), ("Days 31–60", "day_60", "#fbbf24"), ("Days 61–90", "day_90", "#6366f1")]:
        items = roadmap.get(key, [])
        items_html = "".join(f'<li style="font-size:12px;color:#94a8cc;line-height:1.6;margin-bottom:3px">{i}</li>' for i in items)
        roadmap_html += f"""
        <div style="border-left:3px solid {color};padding:12px 16px;margin-bottom:8px;background:#0a1020;border-radius:0 6px 6px 0">
          <div style="font-size:10px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">{label}</div>
          <ul style="margin:0;padding-left:16px">{items_html}</ul>
        </div>"""

    comp_section = ""
    if comp_name and comp_name != f"a competitor in {city}":
        comp_section = f"""
        <div style="padding:28px 24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#f87171;margin-bottom:12px">🏁 Who's Beating You in {city}</div>
          <div style="background:#0d1224;border-radius:10px;padding:20px;border:1px solid #111e40">
            <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px">{comp_name}</div>
            <div style="font-size:12px;color:#4d637a;margin-bottom:12px">{comp_url}</div>
            <p style="font-size:13px;color:#94a8cc;line-height:1.7;margin:0">
              Lola searched <em>"{btype.lower()} in {city}"</em> on Google. {comp_name} is ranking above {biz}.
              Every day that holds, they're getting calls that should be yours.
            </p>
          </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LOLA SEO Report — {biz}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#050811">
<div style="max-width:600px;margin:0 auto;background:#06080f;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a3a8f,#0c1530);padding:24px;text-align:center">
    <img src="{LOLA_LOGO}" alt="Lola SEO" style="width:60px;height:60px;border-radius:50%;border:2px solid #e4b118;margin-bottom:12px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#e4b118;margin-bottom:4px">LOLA SEO · BY TY ALEXANDER MEDIA</div>
    <div style="font-size:20px;font-weight:800;color:#fff">{biz} — Your Free Audit Report</div>
    <div style="font-size:12px;color:#4d637a;margin-top:4px">{url} · {city}</div>
  </div>

  <!-- Score hero -->
  <div style="padding:28px 24px;text-align:center;border-bottom:1px solid #111e40">
    <div style="font-size:11px;color:#4d637a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Lola's Verdict</div>
    <div style="font-size:80px;font-weight:800;color:{score_color};line-height:1">{total}</div>
    <div style="font-size:14px;color:#94a8cc;margin-bottom:8px">/100 · Grade {grade}</div>
    <div style="display:inline-block;padding:6px 16px;background:rgba(228,177,24,0.1);border:1px solid rgba(228,177,24,0.3);border-radius:99px;font-size:13px;font-weight:700;color:#e4b118;margin-bottom:16px">
      {grade_emoji} {grade_label}
    </div>
    <p style="font-size:14px;color:#94a8cc;line-height:1.7;margin:0">{summary}</p>
    <div style="margin-top:14px;padding:12px 20px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);border-radius:8px;display:inline-block">
      <span style="font-size:14px;font-weight:700;color:#f87171">📞 At your current score, you&rsquo;re missing an estimated {leads_lost} inbound calls per month.</span>
    </div>
  </div>

  <!-- Revenue leak -->
  <div style="margin:20px 24px;padding:20px;background:#0d1224;border:1px solid #f87171;border-radius:10px;text-align:center">
    <div style="font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">💸 Estimated Monthly Revenue Leak</div>
    <div style="font-size:48px;font-weight:800;color:#fff;line-height:1">${revenue_leak:,}</div>
    <div style="font-size:12px;color:#4d637a;margin-top:4px">in missed leads per month based on your market and score</div>
  </div>

  <!-- Score breakdown -->
  <div style="padding:0 24px 20px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a8cc;margin-bottom:12px">🐾 Score Breakdown</div>
    <table style="width:100%;border-collapse:collapse">
      {cat_row("Site Health", "site_health")}
      {cat_row("Local Presence", "local_presence")}
      {cat_row("Mobile Experience", "mobile")}
      {cat_row("Page Speed", "page_speed")}
      {cat_row("Content Quality", "content")}
    </table>
  </div>

  <!-- Issues -->
  <div style="padding:0 24px 20px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#f87171;margin-bottom:12px">🚨 What Lola Sniffed Out</div>
    {issues_html}
  </div>

  {comp_section}

  <!-- Quick wins -->
  <div style="padding:0 24px 20px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#22c55e;margin-bottom:12px">🎾 Quick Wins — Do These First</div>
    {wins_html}
  </div>

  <!-- Sandbar case study -->
  <div style="margin:0 24px 20px;padding:20px;background:#0d1224;border:1px solid #111e40;border-radius:10px;border-left:4px solid #6366f1">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:8px">🐾 Real Results — Tampa, FL</div>
    <p style="font-size:13px;color:#94a8cc;line-height:1.7;margin:0">
      We fixed these exact issues for a soft wash contractor in Tampa. Missing title tags. No GBP optimization. Zero schema markup.
      <strong style="color:#fff">They ranked for their top 5 keywords in 3 weeks.</strong>
      {biz} has the same issues they had.
    </p>
  </div>

  <!-- Price anchor -->
  <div style="padding:0 24px 8px;text-align:center">
    <p style="font-size:12px;color:#4d637a;margin:0">Agencies charge $500–$1,500 for this audit alone. Ty&rsquo;s team fixes your title tags, meta descriptions, schema, and Open Graph tags in 24 hours.</p>
  </div>

  <!-- $97 CTA -->
  <div style="margin:0 24px 20px;padding:24px;background:linear-gradient(135deg,#0f1d3a,#091020);border:1px solid rgba(228,177,24,0.3);border-radius:12px;text-align:center">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#e4b118;margin-bottom:10px">⚡ Done-For-You Fix — $97</div>
    <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px">Quick-Fix Implementation Package</div>
    <div style="font-size:13px;color:#94a8cc;line-height:1.7;margin-bottom:16px">
      Ty's team implements your 4 fastest fixes — title tag, meta description,
      schema markup, and Open Graph — directly on {biz}'s site within 24 hours.<br><br>
      <strong style="color:#f87171">Every day you wait is another day {comp_name if comp_name != f'a competitor in {city}' else 'your competitor'} gets that call.</strong>
    </div>
    <a href="{STRIPE_LINK}&biz={biz}&score={total}" style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#f0c840,#e4b118);color:#07100a;font-weight:800;font-size:16px;border-radius:10px;text-decoration:none">
      Get It Fixed — $97 →
    </a>
    <div style="font-size:11px;color:#4d637a;margin-top:10px">🐾 Not satisfied? Full refund. No questions.</div>
  </div>

  <!-- Roadmap -->
  <div style="padding:0 24px 20px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:12px">📅 Your 90-Day Roadmap</div>
    {roadmap_html}
  </div>

  <!-- $400 retainer CTA -->
  <div style="margin:0 24px 28px;padding:24px;background:#0d1224;border:1px solid #111e40;border-radius:12px;text-align:center">
    <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:8px">Want Ty's team to handle all of this for you?</div>
    <div style="font-size:13px;color:#94a8cc;line-height:1.7;margin-bottom:16px">
      $400/month. GBP management, monthly audit, one new city page, monthly report.<br>
      You run your business. We get {biz} found, called, and chosen.
    </div>
    <a href="{CALENDLY_LINK}?ref=retainer-report" style="display:inline-block;padding:14px 28px;border:1.5px solid rgba(228,177,24,0.4);color:#e4b118;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none">
      Book a Free Strategy Call →
    </a>
  </div>

  <!-- Referral -->
  <div style="padding:12px 24px;background:#0a1020;text-align:center;border-top:1px solid #0c1530">
    <p style="font-size:12px;color:#4d637a;margin:0">Know another contractor who&rsquo;s invisible on Google? Send them this link. Lola works for free. 🐾<br>
    <a href="https://lola-seo.vercel.app" style="color:#e4b118;text-decoration:none">lola-seo.vercel.app</a></p>
  </div>

  <!-- Footer -->
  <div style="padding:16px 24px;background:#050811;text-align:center;border-top:1px solid #0c1530">
    <div style="font-size:11px;color:#2a3950">
      Ty Alexander Media · Tampa Bay, FL ·
      <a href="tel:+17273006573" style="color:#e4b118;text-decoration:none">727-300-6573</a> ·
      <a href="https://tyalexandermedia.com" style="color:#4d637a;text-decoration:none">tyalexandermedia.com</a>
    </div>
  </div>

</div>
</body>
</html>"""
