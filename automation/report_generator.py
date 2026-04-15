"""
LOLA SEO — Email Report Generator v5
White/navy aesthetic matching tyalexandermedia.com
Clean, readable, professional. Mobile-first.
"""

# ── Design tokens (tyalexandermedia.com aesthetic) ───────────────────────────
WHITE      = "#FFFFFF"
OFF_WHITE  = "#F7F8FA"
LIGHT_GRAY = "#F0F2F5"
BORDER     = "#E2E6EA"
NAVY       = "#1A3A8F"       # primary brand blue
NAVY_DARK  = "#0F2460"       # darker navy for headings
NAVY_LIGHT = "#2B4DB3"       # hover state
BLUE_BG    = "#EEF2FF"       # light blue card bg
TEXT       = "#1A1A2E"       # near-black body text
TEXT_MUTED = "#5A6478"       # secondary text
TEXT_FAINT = "#9BA3B2"       # placeholder text
GOLD       = "#C9A84C"       # Lola accent — keep for score/grade
CRITICAL   = "#DC2626"       # red
HIGH       = "#EA580C"       # orange
MEDIUM     = "#D97706"       # amber
GREEN      = "#16A34A"       # green
GREEN_BG   = "#F0FDF4"       # light green bg
RED_BG     = "#FEF2F2"       # light red bg

LOLA_LOGO     = "https://lola-seo.vercel.app/lola-logo.png"
QF_LINK       = "https://www.tyalexandermedia.com/contact?offer=quick-fix"
RETAINER_LINK = "https://www.tyalexandermedia.com/contact?offer=retainer"
CALL_LINK     = "https://www.tyalexandermedia.com/contact?ref=report"
REVIEW_LINK   = "https://share.google/IPROAQnD4PhW8zXxi"

GRADE_EMOJI = {"A": "🏆", "B": "✅", "C": "🐾", "D": "⚠️", "F": "🚨"}
SEV_COLOR   = {"Critical": CRITICAL, "High": HIGH, "Medium": MEDIUM}
SEV_BG      = {"Critical": RED_BG,   "High": "#FFF7ED", "Medium": "#FFFBEB"}

GRADE_SUMMARY = {
    "A": "{biz} is well-optimized. A few more moves and you own {city}.",
    "B": "{biz} is showing up — but the gap to #1 in {city} is specific and closable.",
    "C": "{biz} has a solid base, but is leaving real leads on the table in {city} every week.",
    "D": "{biz} has gaps that are costing real customers in {city} every day.",
    "F": "{biz} is effectively invisible on Google. Every day costs you real customers in {city}.",
}


def _score_color(s):
    if s >= 75: return GREEN
    if s >= 50: return MEDIUM
    return CRITICAL

def _score_bg(s):
    if s >= 75: return GREEN_BG
    if s >= 50: return "#FFFBEB"
    return RED_BG

def _bar(score, color, width=140):
    w = max(2, min(score, 100))
    return (
        f'<div style="background:{BORDER};border-radius:99px;height:8px;'
        f'width:{width}px;display:inline-block;vertical-align:middle;overflow:hidden">'
        f'<div style="background:{color};height:8px;border-radius:99px;'
        f'width:{w}%;transition:width 0.6s ease"></div></div>'
    )

def _badge(text, color, bg):
    return (
        f'<span style="display:inline-block;padding:2px 10px;border-radius:99px;'
        f'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;'
        f'color:{color};background:{bg};font-family:-apple-system,sans-serif">{text}</span>'
    )

def _section_label(text, color=NAVY):
    return (
        f'<div style="font-size:11px;font-weight:700;text-transform:uppercase;'
        f'letter-spacing:0.12em;color:{color};margin:0 0 14px;padding-bottom:10px;'
        f'border-bottom:2px solid {BORDER};font-family:-apple-system,sans-serif">'
        f'{text}</div>'
    )

def _issue_row(issue, biz, city, btype, url=""):
    sev    = issue.get("severity", "Medium")
    color  = SEV_COLOR.get(sev, MEDIUM)
    bg     = SEV_BG.get(sev, "#FFFBEB")
    title  = issue.get("issue", "")
    desc   = issue.get("description", "")
    rev    = issue.get("revenue_impact", "")
    cta    = issue.get("cta_type", "")
    domain = url.replace("https://","").replace("http://","").rstrip("/") if url else biz

    # Inject business context
    if biz.lower() not in desc.lower() and domain.lower() not in desc.lower():
        desc = f"{biz}: {desc}"

    # Upsell pill
    upsell = ""
    if cta == "retainer" or "Business Profile" in title or "address" in title.lower():
        upsell = f'''<div style="padding:10px 16px;border-top:1px solid {BORDER};
  background:{BLUE_BG};display:flex;align-items:center;flex-wrap:wrap;gap:8px">
  <span style="font-size:12px;color:{TEXT_MUTED};font-family:-apple-system,sans-serif">
    Ty's team fixes this for you →
  </span>
  <a href="{RETAINER_LINK}"
    style="display:inline-block;padding:5px 14px;background:{NAVY};color:#fff;
    font-size:11px;font-weight:700;border-radius:4px;text-decoration:none;
    font-family:-apple-system,sans-serif">$400/mo Plan</a>
</div>'''
    elif cta == "quick-fix":
        upsell = f'''<div style="padding:10px 16px;border-top:1px solid {BORDER};
  background:{LIGHT_GRAY};display:flex;align-items:center;flex-wrap:wrap;gap:8px">
  <span style="font-size:12px;color:{TEXT_MUTED};font-family:-apple-system,sans-serif">
    Get the exact fix template →
  </span>
  <a href="{QF_LINK}"
    style="display:inline-block;padding:5px 14px;background:{GOLD};color:#fff;
    font-size:11px;font-weight:700;border-radius:4px;text-decoration:none;
    font-family:-apple-system,sans-serif">$97 Playbook</a>
</div>'''

    return f'''
<div style="margin-bottom:10px;border-radius:8px;overflow:hidden;
  border:1px solid {BORDER};background:{WHITE}">
  <div style="padding:4px 16px;background:{bg};border-bottom:1px solid {BORDER}">
    <span style="font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.06em;color:{color};font-family:-apple-system,sans-serif">{sev} Impact</span>
  </div>
  <div style="padding:14px 16px">
    <div style="font-size:14px;font-weight:700;color:{TEXT};margin-bottom:5px;
      font-family:-apple-system,sans-serif">{title}</div>
    <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0
      {f';margin-bottom:6px' if rev else ''};font-family:-apple-system,sans-serif">{desc}</p>
    {f'<div style="font-size:12px;font-weight:600;color:{color};margin-top:6px;font-family:-apple-system,sans-serif">Estimated impact: {rev}</div>' if rev else ''}
  </div>
  {upsell}
</div>'''

def _win_row(win, idx, biz, city):
    steps = win.get("steps") or []
    steps_html = "".join(
        f'<li style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;'
        f'margin-bottom:4px;font-family:-apple-system,sans-serif">{s}</li>'
        for s in steps[:5]
    )
    effort = win.get("effort", "")
    return f'''
<div style="margin-bottom:10px;border:1px solid {BORDER};border-radius:8px;
  overflow:hidden;background:{WHITE}">
  <div style="padding:12px 16px;border-bottom:1px solid {BORDER};
    background:{LIGHT_GRAY};display:flex;align-items:center;
    justify-content:space-between;gap:8px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:26px;height:26px;border-radius:50%;background:{NAVY};
        color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;
        justify-content:center;flex-shrink:0;font-family:-apple-system,sans-serif">{idx}</div>
      <span style="font-size:13px;font-weight:700;color:{TEXT};
        font-family:-apple-system,sans-serif">{win.get('win','')}</span>
    </div>
    {f'<span style="font-size:11px;color:{NAVY};font-weight:600;background:{BLUE_BG};padding:3px 10px;border-radius:99px;font-family:-apple-system,sans-serif">{effort}</span>' if effort else ''}
  </div>
  {f'<div style="padding:12px 16px"><ol style="margin:0;padding-left:18px">{steps_html}</ol></div>' if steps_html else ''}
</div>'''

def _roadmap_row(label, items, color):
    if not items: return ""
    rows = "".join(
        f'<li style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;'
        f'margin-bottom:3px;font-family:-apple-system,sans-serif">{i}</li>'
        for i in items
    )
    return f'''
<div style="margin-bottom:10px;border-left:4px solid {color};
  padding:12px 16px;background:{WHITE};border-radius:0 8px 8px 0;
  border-top:1px solid {BORDER};border-right:1px solid {BORDER};border-bottom:1px solid {BORDER}">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:0.1em;color:{color};margin-bottom:8px;
    font-family:-apple-system,sans-serif">{label}</div>
  <ul style="margin:0;padding-left:18px">{rows}</ul>
</div>'''


def generate_html_report(audit: dict) -> str:
    biz         = audit.get("business_name", "Your Business")
    city_full   = audit.get("city", "your city")
    city        = city_full.split(",")[0].strip()
    url         = audit.get("website", "")
    url_display = url.replace("https://","").replace("http://","").rstrip("/")
    btype       = audit.get("business_type","contractor").replace("_"," ").title()
    total       = int(audit.get("total_score", 0))
    grade       = audit.get("grade", "F")
    grade_label = audit.get("grade_label", "Off the Leash")
    revenue     = int(audit.get("revenue_leak_monthly", 0))
    leads       = audit.get("leads_lost_monthly", "20–35")
    issues      = audit.get("issues", [])[:7]
    wins        = audit.get("quick_wins", [])[:4]
    cats        = audit.get("categories", {})
    roadmap     = audit.get("roadmap", {})

    competitors = audit.get("competitors") or []
    comp        = competitors[0] if competitors else {}
    comp_name   = (comp.get("title") or comp.get("name") or comp.get("business_name") or "").strip()
    comp_url    = comp.get("link") or comp.get("url","")
    has_comp    = bool(comp_name)

    sc      = _score_color(total)
    sc_bg   = _score_bg(total)
    g_emoji = GRADE_EMOJI.get(grade, "🚨")
    summary = GRADE_SUMMARY.get(grade, GRADE_SUMMARY["F"]).format(biz=biz, city=city)

    urgency = (
        f"Every day you wait is another day {comp_name} gets that call instead of {biz}."
        if has_comp else
        f"Every day {biz} isn't on page 1, a competitor in {city} is getting your customers."
    )

    # Category rows
    def cat_row(label, key):
        s  = int(cats.get(key, {}).get("score", 0))
        c  = _score_color(s)
        return f'''
<tr>
  <td style="padding:12px 16px;font-size:13px;color:{TEXT};border-bottom:1px solid {BORDER};
    font-family:-apple-system,sans-serif;font-weight:500">{label}</td>
  <td style="padding:12px 16px;border-bottom:1px solid {BORDER}">{_bar(s, c)}</td>
  <td style="padding:12px 16px;font-size:18px;font-weight:800;color:{c};
    border-bottom:1px solid {BORDER};text-align:right;
    font-family:-apple-system,sans-serif;white-space:nowrap">
    {s}<span style="font-size:11px;color:{TEXT_FAINT};font-weight:400">/100</span>
  </td>
</tr>'''

    cats_html    = (cat_row("Site Health","site_health") + cat_row("Local Presence","local_presence")
                  + cat_row("Mobile","mobile") + cat_row("Page Speed","page_speed")
                  + cat_row("Content","content"))
    issues_html  = "".join(_issue_row(i, biz, city, btype, url) for i in issues)
    wins_html    = "".join(_win_row(w, i+1, biz, city) for i, w in enumerate(wins))
    roadmap_html = (_roadmap_row("Days 1–30", roadmap.get("day_30",[]), GREEN)
                  + _roadmap_row("Days 31–60", roadmap.get("day_60",[]), NAVY)
                  + _roadmap_row("Days 61–90", roadmap.get("day_90",[]), MEDIUM))

    # Competitor block
    comp_block = ""
    if has_comp:
        comp_block = f'''
<div style="padding:0 24px 24px">
  {_section_label("Who's Beating " + biz + " in " + city, CRITICAL)}
  <div style="background:{RED_BG};border:1px solid {BORDER};border-left:4px solid {CRITICAL};
    border-radius:0 8px 8px 0;padding:16px">
    <div style="font-size:14px;font-weight:700;color:{TEXT};margin-bottom:3px;
      font-family:-apple-system,sans-serif">{comp_name}</div>
    {f'<div style="font-size:12px;color:{TEXT_FAINT};margin-bottom:8px">{comp_url}</div>' if comp_url else ''}
    <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0;
      font-family:-apple-system,sans-serif">
      Lola searched <em>"{btype.lower()} in {city}"</em> — {comp_name} is ranking above
      {biz} right now. Every call from {city} they get is one you should have answered.
    </p>
  </div>
</div>'''

    # Proof block
    proof_block = ""
    if grade not in ("A","B"):
        proof_block = f'''
<div style="margin:0 24px 24px;padding:16px;background:{BLUE_BG};
  border:1px solid {BORDER};border-left:4px solid {NAVY};border-radius:0 8px 8px 0">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:0.1em;color:{NAVY};margin-bottom:8px;
    font-family:-apple-system,sans-serif">Real Results — Tampa Bay</div>
  <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0;
    font-family:-apple-system,sans-serif">
    A {btype.lower()} in Tampa had the same gaps as {biz} — no title tag,
    no GBP, zero schema. <strong style="color:{TEXT}">Ranked for their top
    5 keywords in 3 weeks.</strong> The fix list below is the same playbook.
  </p>
</div>'''

    # $97 offer
    offer_97 = f'''
<div style="margin:0 24px 16px;border-radius:8px;overflow:hidden;
  border:1px solid {BORDER};background:{WHITE}">
  <div style="padding:16px;background:{NAVY};text-align:center">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.15em;color:rgba(255,255,255,0.7);margin-bottom:4px;
      font-family:-apple-system,sans-serif">Do It Yourself</div>
    <div style="font-size:24px;font-weight:800;color:#fff;
      font-family:-apple-system,sans-serif">Get Lola's Full Playbook — $97</div>
  </div>
  <div style="padding:20px">
    <!-- Score badge -->
    <div style="display:flex;align-items:center;gap:14px;background:{sc_bg};
      border:1px solid {BORDER};border-radius:6px;padding:14px;margin-bottom:16px">
      <div style="font-size:40px;font-weight:800;color:{sc};line-height:1;
        font-family:-apple-system,sans-serif;flex-shrink:0">
        {total}<span style="font-size:14px;color:{TEXT_FAINT};font-weight:400">/100</span>
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:{TEXT};
          font-family:-apple-system,sans-serif">{g_emoji} {grade_label}</div>
        <div style="font-size:12px;color:{CRITICAL};font-weight:600;
          font-family:-apple-system,sans-serif">
          Estimated ${revenue:,}/mo in missed leads
        </div>
      </div>
    </div>
    <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0 0 14px;
      font-family:-apple-system,sans-serif">
      Your score is <strong style="color:{sc}">{total}/100</strong>.
      Agencies charge $500–1,500 for an audit like this.
      Lola's full playbook is $97. One time. Yours forever.
    </p>
    {"".join(f'<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid {BORDER};font-size:13px;color:{TEXT_MUTED};font-family:-apple-system,sans-serif"><span style="color:{NAVY};font-weight:700;flex-shrink:0">✓</span>{item}</div>' for item in [
        f"Exact title tag formula for {biz} in {city}",
        "Meta description template — ready to copy and paste",
        "Schema markup code to paste directly into your site",
        "GBP optimization checklist (step-by-step)",
        "Local citation submission guide",
        "Priority fix order — what to do first",
    ])}
    <a href="{QF_LINK}&biz={biz.replace(' ','%20')}&score={total}"
      style="display:block;padding:14px;background:{NAVY};color:#fff;font-weight:700;
      font-size:16px;border-radius:6px;text-decoration:none;text-align:center;
      margin-top:16px;font-family:-apple-system,sans-serif">
      Get the $97 Playbook →
    </a>
    <p style="font-size:12px;color:{CRITICAL};font-weight:600;text-align:center;
      margin:10px 0 0;font-family:-apple-system,sans-serif">{urgency}</p>
  </div>
</div>'''

    # $400 offer
    stack_rows = "".join(
        f'<tr><td style="padding:7px 16px;font-size:13px;color:{TEXT_MUTED};'
        f'border-bottom:1px solid {BORDER};font-family:-apple-system,sans-serif">✓ {item}</td>'
        f'<td style="padding:7px 16px;font-size:11px;color:{TEXT_FAINT};'
        f'border-bottom:1px solid {BORDER};text-align:right;text-decoration:line-through;'
        f'font-family:-apple-system,sans-serif;white-space:nowrap">{val}</td></tr>'
        for item, val in [
            ("Full Lola Audit + Report", "$500"),
            ("Title Tag + Meta — Implemented", "$300"),
            ("Schema Markup — Installed", "$200"),
            ("GBP Setup + Optimization", "$300"),
            ("Local Citation Cleanup", "$200"),
            ("Monthly Content (1 page/blog)", "$300"),
            ("Monthly Ranking Report", "$150"),
        ]
    )
    offer_400 = f'''
<div style="margin:0 24px 24px;border-radius:8px;overflow:hidden;
  border:2px solid {NAVY};background:{WHITE}">
  <div style="padding:14px 16px;background:{NAVY};text-align:center">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.15em;color:rgba(255,255,255,0.7);margin-bottom:4px;
      font-family:-apple-system,sans-serif">Most Popular · Best Value</div>
    <div style="font-size:24px;font-weight:800;color:#fff;
      font-family:-apple-system,sans-serif">Let Ty's Team Handle It</div>
  </div>
  <div style="padding:20px">
    <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0 0 16px;
      font-family:-apple-system,sans-serif">
      Skip the DIY. Ty's team takes every finding in this report and executes it
      for {biz}. You run your business. We get it found, called, and chosen.
    </p>
    <table style="width:100%;border-collapse:collapse;background:{LIGHT_GRAY};
      border-radius:6px;overflow:hidden;border:1px solid {BORDER};margin-bottom:16px">
      {stack_rows}
      <tr>
        <td style="padding:10px 16px;font-size:13px;font-weight:700;color:{TEXT};
          font-family:-apple-system,sans-serif">Total Value:</td>
        <td style="padding:10px 16px;font-size:14px;color:{TEXT_FAINT};
          text-decoration:line-through;text-align:right;
          font-family:-apple-system,sans-serif">$1,950</td>
      </tr>
    </table>
    <div style="font-size:22px;font-weight:800;color:{NAVY};margin-bottom:6px;
      font-family:-apple-system,sans-serif">You get all of it for $397 total</div>
    <p style="font-size:13px;color:{TEXT_MUTED};line-height:1.7;margin:0 0 16px;
      font-family:-apple-system,sans-serif">
      First month is $397 — then $400/month after that.
      Cancel anytime. No contracts.
    </p>
    <div style="display:inline-block;padding:5px 14px;background:{NAVY};
      color:#fff;font-size:11px;font-weight:700;border-radius:4px;
      margin-bottom:16px;font-family:-apple-system,sans-serif">
      YOU SAVE OVER $1,500
    </div><br>
    <a href="{RETAINER_LINK}&biz={biz.replace(' ','%20')}&score={total}"
      style="display:block;padding:14px;background:{WHITE};color:{NAVY};font-weight:700;
      font-size:16px;border-radius:6px;text-decoration:none;text-align:center;
      border:2px solid {NAVY};font-family:-apple-system,sans-serif">
      Add Ty's Team for $300 More →
    </a>
    <p style="font-size:11px;color:{TEXT_FAINT};text-align:center;margin:8px 0 0;
      font-family:-apple-system,sans-serif">
      First month = full implementation of everything Lola found for {biz} today.
    </p>
  </div>
</div>'''

    # Google review
    review_block = f'''
<div style="margin:0 24px 24px;padding:16px;background:{LIGHT_GRAY};
  border:1px solid {BORDER};border-radius:8px;text-align:center">
  <p style="font-size:13px;color:{TEXT_MUTED};margin:0 0 10px;
    font-family:-apple-system,sans-serif">
    Did Lola help {biz}? Leave us a review — it helps other local businesses find us. 🐾
  </p>
  <a href="{REVIEW_LINK}"
    style="display:inline-block;padding:10px 22px;background:{WHITE};
    border:1px solid {BORDER};color:{NAVY};font-size:13px;font-weight:600;
    border-radius:6px;text-decoration:none;font-family:-apple-system,sans-serif">
    Leave a Google Review →
  </a>
</div>'''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>LOLA SEO — {biz} Audit Report</title>
<style>
  @media only screen and (max-width:600px) {{
    .email-outer {{ padding:0 !important; }}
    .email-card  {{ border-radius:0 !important; }}
    .section-pad {{ padding:0 16px 20px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{LIGHT_GRAY};-webkit-text-size-adjust:100%">
<div class="email-outer" style="max-width:600px;margin:0 auto;padding:20px 16px">
<div class="email-card" style="background:{WHITE};border-radius:10px;
  overflow:hidden;border:1px solid {BORDER};box-shadow:0 2px 12px rgba(0,0,0,0.06)">

  <!-- HEADER -->
  <div style="background:{NAVY_DARK};padding:20px 24px;
    display:flex;align-items:center;gap:14px">
    <img src="{LOLA_LOGO}" alt="Lola" width="48" height="48"
      style="border-radius:50%;border:2px solid rgba(255,255,255,0.2);
      display:block;flex-shrink:0">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
        letter-spacing:0.2em;color:rgba(255,255,255,0.6);margin-bottom:2px;
        font-family:-apple-system,sans-serif">LOLA SEO · TY ALEXANDER MEDIA</div>
      <div style="font-size:16px;font-weight:700;color:#fff;
        font-family:-apple-system,sans-serif">{biz} — Free SEO Audit</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);
        font-family:-apple-system,sans-serif">{url_display} · {city}</div>
    </div>
  </div>

  <!-- SCORE HERO -->
  <div style="padding:28px 24px;text-align:center;
    border-bottom:1px solid {BORDER};background:{OFF_WHITE}">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;
      letter-spacing:0.12em;color:{TEXT_FAINT};margin-bottom:12px;
      font-family:-apple-system,sans-serif">Lola's Verdict</div>

    <!-- Score ring (CSS-only, works in most clients) -->
    <div style="display:inline-block;width:120px;height:120px;position:relative;
      margin-bottom:12px">
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="{BORDER}" stroke-width="8"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="{sc}" stroke-width="8"
          stroke-dasharray="314" stroke-dashoffset="{314 - 314 * total / 100:.1f}"
          stroke-linecap="round" transform="rotate(-90 60 60)"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center">
        <span style="font-size:32px;font-weight:800;color:{sc};line-height:1;
          font-family:-apple-system,sans-serif">{total}</span>
        <span style="font-size:11px;color:{TEXT_FAINT};font-family:-apple-system,sans-serif">/100</span>
      </div>
    </div>

    <div style="margin-bottom:6px">
      <span style="display:inline-block;padding:5px 16px;border-radius:99px;
        background:{sc_bg};border:1px solid {BORDER};
        font-size:13px;font-weight:700;color:{sc};
        font-family:-apple-system,sans-serif">{g_emoji} {grade_label} — Grade {grade}</span>
    </div>
    <p style="font-size:14px;color:{TEXT_MUTED};line-height:1.7;
      max-width:400px;margin:10px auto 16px;
      font-family:-apple-system,sans-serif">{summary}</p>

    <div style="display:inline-block;padding:12px 20px;
      background:{RED_BG};border:1px solid {BORDER};border-radius:8px">
      <div style="font-size:15px;font-weight:700;color:{CRITICAL};
        font-family:-apple-system,sans-serif">
        You're missing an estimated {leads} inbound calls per month.
      </div>
    </div>
  </div>

  <!-- REVENUE LEAK -->
  <div style="margin:20px 24px;padding:18px;background:{RED_BG};
    border:1px solid {BORDER};border-radius:8px;text-align:center">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.15em;color:{CRITICAL};margin-bottom:6px;
      font-family:-apple-system,sans-serif">Estimated Monthly Revenue Leak</div>
    <div style="font-size:52px;font-weight:800;color:{TEXT};line-height:1;
      font-family:-apple-system,sans-serif">${revenue:,}</div>
    <div style="font-size:12px;color:{TEXT_FAINT};margin-top:4px;
      font-family:-apple-system,sans-serif">
      in missed leads per month based on {city} market + your score
    </div>
  </div>

  <!-- SCORE BREAKDOWN -->
  <div class="section-pad" style="padding:0 24px 24px">
    {_section_label("Score Breakdown")}
    <table style="width:100%;border-collapse:collapse;background:{WHITE};
      border-radius:8px;overflow:hidden;border:1px solid {BORDER}">
      {cats_html}
    </table>
  </div>

  <!-- ISSUES -->
  <div class="section-pad" style="padding:0 24px 24px">
    {_section_label("What Lola Found", CRITICAL)}
    {issues_html}
  </div>

  {comp_block}

  <!-- QUICK WINS -->
  <div class="section-pad" style="padding:0 24px 24px">
    {_section_label("Quick Wins — Do These First", GREEN)}
    {wins_html}
  </div>

  {proof_block}

  <!-- $97 OFFER -->
  {offer_97}

  <!-- $400 OFFER -->
  {offer_400}

  <!-- ROADMAP -->
  <div class="section-pad" style="padding:0 24px 24px">
    {_section_label("Your 90-Day Fix Roadmap", TEXT_MUTED)}
    {roadmap_html}
  </div>

  <!-- GOOGLE REVIEW -->
  {review_block}

  <!-- FOOTER -->
  <div style="padding:16px 24px;background:{NAVY_DARK};text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.5);line-height:1.8;
      font-family:-apple-system,sans-serif">
      Ty Alexander Media · Tampa Bay, FL<br>
      <a href="tel:+17273006573" style="color:rgba(255,255,255,0.7);text-decoration:none">
        727-300-6573</a> &nbsp;·&nbsp;
      <a href="https://tyalexandermedia.com"
        style="color:rgba(255,255,255,0.5);text-decoration:none">
        tyalexandermedia.com</a><br>
      <span style="color:rgba(255,255,255,0.3)">© 2026 Ty Alexander Media</span>
    </div>
  </div>

</div>
</div>
</body>
</html>'''
