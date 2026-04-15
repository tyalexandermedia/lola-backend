"""
LOLA SEO — Email Report Generator v4
Mobile-first HTML email. Every sentence references THIS business.
Offer ladder: $97 DIY Playbook → $400/mo Ty's Team.
"""

# ── Design tokens (matches frontend exactly) ─────────────────────
DARK      = "#0A0A0A"
DARK_CARD = "#111111"
DARK_BDR  = "#222222"
GOLD      = "#C9A84C"
GOLD_DIM  = "#8B6E2E"
GOLD_BG   = "rgba(201,168,76,0.08)"
TEXT      = "#F0EAD6"
TEXT_BR   = "#C8C0B0"   # brightened for desktop readability
MUTED     = "#A89F94"   # up from #8A8278
FAINT     = "#6E6860"   # up from #5A554E
CRITICAL  = "#E05252"
HIGH      = "#E08840"
MEDIUM    = "#D4B84A"
GREEN     = "#4CAF80"
GREEN_BG  = "rgba(76,175,128,0.08)"

LOLA_LOGO     = "https://lola-seo.vercel.app/lola-logo.png"
QF_LINK       = "https://www.tyalexandermedia.com/contact?offer=quick-fix"
RETAINER_LINK = "https://www.tyalexandermedia.com/contact?offer=retainer"
REVIEW_LINK   = "https://share.google/IPROAQnD4PhW8zXxi"

GRADE_EMOJI = {"A": "🏆", "B": "✅", "C": "🐾", "D": "⚠️", "F": "🚨"}
SEV_COLOR   = {"Critical": CRITICAL, "High": HIGH, "Medium": MEDIUM}

GRADE_SUMMARY = {
    "A": "{biz} is dialed in. A few more moves and you own {city}.",
    "B": "{biz} is showing up — but the gap to #1 in {city} is specific and very closable.",
    "C": "{biz} is visible but leaving real money on the table in {city} every week.",
    "D": "{biz} has serious gaps. People in {city} are searching right now — and calling someone else.",
    "F": "{biz} is effectively invisible on Google. Every day costs you real customers in {city}.",
}


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def _color_for_score(s: int) -> str:
    if s >= 75: return GREEN
    if s >= 50: return MEDIUM
    return CRITICAL

def _bar(score: int, color: str) -> str:
    w = max(2, min(score, 100))
    return (
        f'<div style="background:{DARK};border-radius:3px;height:6px;'
        f'width:100%;max-width:120px;display:inline-block;vertical-align:middle">'
        f'<div style="background:{color};height:6px;border-radius:3px;width:{w}%"></div>'
        f'</div>'
    )

def _badge(text: str, color: str, bg: str) -> str:
    return (
        f'<span style="display:inline-block;padding:3px 9px;border-radius:99px;'
        f'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;'
        f'color:{color};background:{bg};border:1px solid {color}40;'
        f'font-family:\'DM Mono\',monospace,sans-serif">{text}</span>'
    )

def _section_label(icon: str, text: str, color: str = GOLD) -> str:
    return (
        f'<div style="font-size:10px;font-weight:700;text-transform:uppercase;'
        f'letter-spacing:0.18em;color:{color};margin:0 0 14px;padding-bottom:8px;'
        f'border-bottom:1px solid {DARK_BDR};font-family:\'DM Mono\',monospace,sans-serif">'
        f'{icon}&nbsp; {text}</div>'
    )

def _issue_row(issue: dict, biz: str, city: str, btype: str, audit_url: str = "") -> str:
    sev   = issue.get("severity", "Medium")
    color = SEV_COLOR.get(sev, MEDIUM)
    title = issue.get("issue", "")
    desc  = issue.get("description", "")
    rev   = issue.get("revenue_impact", "")
    # Ensure every description mentions this specific business
    # If neither biz name nor domain appears, prefix with business context
    url_domain = audit_url.replace("https://","").replace("http://","").rstrip("/") if audit_url else ""
    biz_mentioned = biz.lower() in desc.lower() or (url_domain and url_domain.lower() in desc.lower())
    city_mentioned = city.lower() in desc.lower()
    if not biz_mentioned:
        desc = f"<strong>{biz}:</strong> {desc}"
    # Upsell pill for GBP/local issues → $400 retainer
    cta_type = issue.get("cta_type", "")
    upsell_html = ""
    if cta_type == "retainer" or "Business Profile" in title or "address" in title.lower():
        upsell_html = f'''
<div style="padding:10px 16px;border-top:1px solid {DARK_BDR};
  background:rgba(201,168,76,0.03);display:flex;align-items:center;
  flex-wrap:wrap;gap:8px;font-size:12px;color:{MUTED};
  font-family:-apple-system,sans-serif">
  <span>Ty's team fixes this for you →</span>
  <a href="https://www.tyalexandermedia.com/contact?offer=retainer&issue=gbp"
    style="display:inline-block;padding:5px 12px;background:{GOLD};
    color:{DARK};font-size:11px;font-weight:700;border-radius:4px;
    text-decoration:none;font-family:-apple-system,sans-serif">
    See the $400/mo Plan
  </a>
</div>'''
    elif cta_type == "quick-fix":
        upsell_html = f'''
<div style="padding:10px 16px;border-top:1px solid {DARK_BDR};
  background:rgba(201,168,76,0.03);display:flex;align-items:center;
  flex-wrap:wrap;gap:8px">
  <span style="font-size:12px;color:{MUTED};font-family:-apple-system,sans-serif">
    Get the exact fix template →
  </span>
  <a href="https://www.tyalexandermedia.com/contact?offer=quick-fix"
    style="display:inline-block;padding:5px 12px;background:{GOLD};
    color:{DARK};font-size:11px;font-weight:700;border-radius:4px;
    text-decoration:none;font-family:-apple-system,sans-serif">
    $97 Playbook
  </a>
</div>'''

    return f"""
<div style="margin-bottom:12px;border-left:3px solid {color};border-radius:0 8px 8px 0;
  background:{DARK};border-top:1px solid {DARK_BDR};
  border-right:1px solid {DARK_BDR};border-bottom:1px solid {DARK_BDR};overflow:hidden">
  <div style="padding:14px 16px">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:{TEXT};line-height:1.4;
          font-family:-apple-system,sans-serif;margin-bottom:4px">{title}</div>
        <p style="font-size:13px;color:{TEXT_BR};line-height:1.7;margin:0 0 6px;
          font-family:-apple-system,sans-serif">{desc}</p>
        {f'<div style="font-size:11px;font-weight:700;color:{color};font-family:DM Mono,monospace,sans-serif">>> {rev}</div>' if rev else ''}
      </div>
      <div style="flex-shrink:0;padding-top:2px">{_badge(sev, color, color + "15")}</div>
    </div>
  </div>
  {upsell_html}
</div>"""

def _win_row(win: dict, idx: int, biz: str, city: str) -> str:
    steps = win.get("steps") or []
    steps_html = "".join(
        f'<li style="font-size:13px;color:{TEXT_BR};line-height:1.7;margin-bottom:5px;'
        f'font-family:-apple-system,sans-serif">{s}</li>'
        for s in steps[:5]
    )
    effort = win.get("effort", "")
    return f"""
<div style="margin-bottom:12px;background:{DARK};border:1px solid {DARK_BDR};
  border-radius:8px;overflow:hidden">
  <div style="padding:12px 16px;border-bottom:1px solid {DARK_BDR};
    display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:24px;height:24px;border-radius:50%;background:{GREEN};
        color:#061410;font-size:11px;font-weight:700;display:flex;align-items:center;
        justify-content:center;flex-shrink:0;font-family:DM Mono,monospace,sans-serif">
        {idx}
      </div>
      <span style="font-size:14px;font-weight:700;color:{TEXT};
        font-family:-apple-system,sans-serif">{win.get('win','')}</span>
    </div>
    {f'<span style="font-size:10px;color:{GREEN};font-weight:700;font-family:DM Mono,monospace,sans-serif;background:{GREEN_BG};padding:3px 8px;border-radius:99px;border:1px solid {GREEN}40">{effort}</span>' if effort else ''}
  </div>
  {f'<div style="padding:12px 16px"><ol style="margin:0;padding-left:18px">{steps_html}</ol></div>' if steps_html else ''}
</div>"""

def _roadmap_row(label: str, items: list, color: str) -> str:
    if not items: return ""
    rows = "".join(
        f'<li style="font-size:13px;color:{TEXT_BR};line-height:1.7;margin-bottom:4px;'
        f'font-family:-apple-system,sans-serif">{i}</li>'
        for i in items
    )
    return f"""
<div style="margin-bottom:10px;border-left:3px solid {color};padding:12px 16px;
  background:{DARK};border-radius:0 8px 8px 0;border-top:1px solid {DARK_BDR};
  border-right:1px solid {DARK_BDR};border-bottom:1px solid {DARK_BDR}">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
    color:{color};margin-bottom:8px;font-family:DM Mono,monospace,sans-serif">{label}</div>
  <ul style="margin:0;padding-left:16px">{rows}</ul>
</div>"""


# ─────────────────────────────────────────────────────────────────
# MAIN GENERATOR
# ─────────────────────────────────────────────────────────────────

def generate_html_report(audit: dict) -> str:
    biz         = audit.get("business_name", "Your Business")
    city_full   = audit.get("city", "your city")
    city        = city_full.split(",")[0].strip()
    url         = audit.get("website", "")
    url_display = url.replace("https://", "").replace("http://", "").rstrip("/")
    btype       = audit.get("business_type", "contractor").replace("_", " ").title()
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
    comp_url    = comp.get("url", "")
    has_comp    = bool(comp_name)

    score_color  = _color_for_score(total)
    grade_emoji  = GRADE_EMOJI.get(grade, "🚨")
    summary      = GRADE_SUMMARY.get(grade, GRADE_SUMMARY["F"]).format(biz=biz, city=city)

    urgency_line = (
        f"Every day you wait is another day {comp_name} gets the call instead of {biz}."
        if has_comp else
        f"Every day {biz} isn't on page 1, a competitor in {city} gets that customer instead."
    )

    # ── Score ring (SVG, works in most email clients) ─────────────
    pct         = total / 100
    circ        = 282  # 2π×45
    dash_offset = circ - (circ * pct)
    score_ring  = f"""
<svg width="110" height="110" viewBox="0 0 110 110" style="display:block;margin:0 auto 8px">
  <circle cx="55" cy="55" r="45" fill="none" stroke="{DARK_BDR}" stroke-width="8"/>
  <circle cx="55" cy="55" r="45" fill="none" stroke="{score_color}" stroke-width="8"
    stroke-dasharray="{circ}" stroke-dashoffset="{dash_offset:.1f}"
    stroke-linecap="round" transform="rotate(-90 55 55)"/>
  <text x="55" y="52" text-anchor="middle" font-size="26" font-weight="800"
    fill="{score_color}" font-family="DM Mono,monospace,sans-serif">{total}</text>
  <text x="55" y="66" text-anchor="middle" font-size="11" fill="{FAINT}"
    font-family="DM Mono,monospace,sans-serif">/100</text>
</svg>"""

    # ── Category rows ─────────────────────────────────────────────
    def cat_row(label: str, icon: str, key: str) -> str:
        s = int(cats.get(key, {}).get("score", 0))
        c = _color_for_score(s)
        return f"""
<tr>
  <td style="padding:10px 14px;font-size:13px;color:{MUTED};border-bottom:1px solid {DARK_BDR};
    font-family:-apple-system,sans-serif;white-space:nowrap">{icon} {label}</td>
  <td style="padding:10px 14px;border-bottom:1px solid {DARK_BDR};width:50%">
    {_bar(s, c)}
  </td>
  <td style="padding:10px 14px;font-size:18px;font-weight:800;color:{c};
    border-bottom:1px solid {DARK_BDR};text-align:right;font-family:DM Mono,monospace,sans-serif;
    white-space:nowrap">{s}<span style="font-size:10px;color:{FAINT}">/100</span></td>
</tr>"""

    cats_html = (
        cat_row("Site Health",    "🌐", "site_health")
      + cat_row("Local Presence", "📍", "local_presence")
      + cat_row("Mobile",         "📱", "mobile")
      + cat_row("Page Speed",     "⚡", "page_speed")
      + cat_row("Content",        "✍️", "content")
    )

    issues_html  = "".join(_issue_row(i, biz, city, btype, url) for i in issues)
    wins_html    = "".join(_win_row(w, i+1, biz, city) for i, w in enumerate(wins))
    roadmap_html = (
        _roadmap_row("Days 1–30",  roadmap.get("day_30", []), GREEN)
      + _roadmap_row("Days 31–60", roadmap.get("day_60", []), GOLD)
      + _roadmap_row("Days 61–90", roadmap.get("day_90", []), "#7C6FCD")
    )

    # ── Competitor block ──────────────────────────────────────────
    comp_block = ""
    if has_comp:
        comp_block = f"""
<div style="padding:0 20px 20px">
  {_section_label("🏁", f"Who's Beating {biz} in {city}", CRITICAL)}
  <div style="background:{DARK};border:1px solid {DARK_BDR};border-left:3px solid {CRITICAL};
    border-radius:0 8px 8px 0;padding:16px">
    <div style="font-size:15px;font-weight:700;color:{TEXT};margin-bottom:3px;
      font-family:-apple-system,sans-serif">{comp_name}</div>
    {f'<div style="font-size:11px;color:{FAINT};margin-bottom:10px;font-family:DM Mono,monospace,sans-serif">{comp_url}</div>' if comp_url else ''}
    <p style="font-size:13px;color:{TEXT_BR};line-height:1.7;margin:0;
      font-family:-apple-system,sans-serif">
      Lola searched <em>"{btype.lower()} in {city}"</em> on Google.
      {comp_name} is ranking above {biz} right now.
      Every call they get from {city} is a call {biz} should have answered.
    </p>
  </div>
</div>"""

    # ── Proof point ───────────────────────────────────────────────
    proof_block = ""
    if grade not in ("A", "B"):
        proof_block = f"""
<div style="margin:0 20px 20px;padding:16px;background:{DARK};border:1px solid {DARK_BDR};
  border-left:3px solid {GOLD};border-radius:0 8px 8px 0">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;
    color:{GOLD};margin-bottom:8px;font-family:DM Mono,monospace,sans-serif">🐾 Real Results — Tampa Bay</div>
  <p style="font-size:13px;color:{TEXT_BR};line-height:1.7;margin:0;
    font-family:-apple-system,sans-serif">
    A {btype.lower()} in Tampa had the exact same gaps as {biz} — no title tag,
    no GBP, zero schema markup.
    <strong style="color:{TEXT}">Ranked for their top 5 keywords in 3 weeks.</strong>
    The fix list below is the same playbook.
  </p>
</div>"""

    # ── $97 DIY Playbook CTA ──────────────────────────────────────
    offer_97 = f"""
<div style="margin:0 20px 16px;border-radius:8px;overflow:hidden;
  border-left:3px solid {GOLD};border-top:1px solid {DARK_BDR};
  border-right:1px solid {DARK_BDR};border-bottom:1px solid {DARK_BDR};
  background:{DARK}">
  <div style="padding:20px">
    <!-- Score badge -->
    <div style="display:flex;align-items:center;gap:14px;background:{DARK_CARD};
      border:1px solid {DARK_BDR};border-radius:6px;padding:14px;margin-bottom:18px">
      <div style="font-size:44px;font-weight:800;color:{score_color};line-height:1;
        font-family:DM Mono,monospace,sans-serif;flex-shrink:0">
        {total}<span style="font-size:14px;color:{FAINT}">/100</span>
      </div>
      <div>
        <div style="font-size:16px;font-weight:700;color:{TEXT};
          font-family:-apple-system,sans-serif">{grade_emoji} {grade_label}</div>
        <div style="font-size:12px;color:{CRITICAL};font-weight:600;
          font-family:-apple-system,sans-serif">
          Estimated ${revenue:,}/mo in missed leads
        </div>
      </div>
    </div>

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;
      color:{GOLD};margin-bottom:8px;font-family:DM Mono,monospace,sans-serif">Do It Yourself</div>
    <div style="font-size:22px;font-weight:700;color:{TEXT};margin-bottom:10px;
      font-family:-apple-system,sans-serif;line-height:1.2">
      Get Lola's Full Playbook — $97
    </div>
    <p style="font-size:13px;color:{MUTED};line-height:1.7;margin:0 0 14px;
      font-family:-apple-system,sans-serif">
      Lola gives you the exact fix list for {biz} — written for your business,
      your city, your gaps. You implement it yourself. No call needed.
      Agencies charge $500–1,500 for an audit like this. $97. One time. Yours forever.
    </p>

    <!-- Deliverables -->
    <div style="margin-bottom:18px">
      {"".join(f'<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid {DARK_BDR};font-size:13px;color:{TEXT_BR};font-family:-apple-system,sans-serif"><span style="color:{GOLD};font-weight:700;flex-shrink:0">✓</span>{item}</div>' for item in [
        f"Exact title tag formula for {biz} in {city}",
        "Meta description template — ready to copy and paste",
        "Schema markup code to paste directly into your site",
        "GBP optimization checklist (step-by-step)",
        "Local citation submission guide",
        "Priority fix order — know exactly what to do first",
      ])}
    </div>

    <a href="{QF_LINK}&biz={biz.replace(' ','%20')}&score={total}"
      style="display:block;padding:16px;background:{GOLD};color:{DARK};font-weight:700;
      font-size:18px;border-radius:6px;text-decoration:none;text-align:center;
      font-family:-apple-system,sans-serif;letter-spacing:0.03em">
      Get the $97 Playbook →
    </a>
    <p style="font-size:12px;color:{CRITICAL};font-weight:600;text-align:center;
      margin:10px 0 0;font-family:-apple-system,sans-serif">{urgency_line}</p>
  </div>
</div>"""

    # ── $400/mo Retainer CTA ──────────────────────────────────────
    stack_rows = "".join(
        f'<tr>'
        f'<td style="padding:7px 14px;font-size:13px;color:{TEXT_BR};'
        f'border-bottom:1px solid {DARK_BDR};font-family:-apple-system,sans-serif">✓ {item}</td>'
        f'<td style="padding:7px 14px;font-size:11px;color:{FAINT};'
        f'border-bottom:1px solid {DARK_BDR};text-align:right;text-decoration:line-through;'
        f'font-family:DM Mono,monospace,sans-serif;white-space:nowrap">{val}</td>'
        f'</tr>'
        for item, val in [
            ("Full Lola Audit + Findings Report", "$500"),
            ("Title Tag + Meta Description — Implemented", "$300"),
            ("Schema Markup — Installed", "$200"),
            ("Google Business Profile — Fully Optimized", "$300"),
            ("Local Citation Cleanup", "$200"),
            ("Monthly Content (1 page or blog post)", "$300"),
            ("Monthly Ranking Report", "$150"),
        ]
    )

    offer_400 = f"""
<div style="margin:0 20px 20px;border-radius:8px;overflow:hidden;
  border:1px solid {GOLD};background:{DARK}">
  <div style="padding:20px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;
      color:{GOLD};margin-bottom:8px;font-family:DM Mono,monospace,sans-serif">
      Most Popular · Best Value
    </div>
    <div style="font-size:22px;font-weight:700;color:{TEXT};margin-bottom:10px;
      font-family:-apple-system,sans-serif;line-height:1.2">
      Let Ty's Team Fix {biz} for You
    </div>
    <p style="font-size:13px;color:{MUTED};line-height:1.7;margin:0 0 16px;
      font-family:-apple-system,sans-serif">
      Skip the DIY. Ty's team takes every finding in this report and executes it
      for {biz} — GBP setup, on-page fixes, monthly content, citations, and a
      ranking report every month. You run your business. We get it found, called, and chosen.
    </p>

    <!-- Value stack -->
    <table style="width:100%;border-collapse:collapse;background:{DARK_CARD};
      border-radius:6px;overflow:hidden;border:1px solid {DARK_BDR};margin-bottom:14px">
      {stack_rows}
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:{MUTED};
          font-family:-apple-system,sans-serif;font-weight:600">Total Value:</td>
        <td style="padding:10px 14px;font-size:14px;color:{FAINT};text-decoration:line-through;
          text-align:right;font-family:DM Mono,monospace,sans-serif">$1,950</td>
      </tr>
    </table>

    <!-- Price perception -->
    <div style="font-size:24px;font-weight:700;color:{GOLD};margin-bottom:8px;
      font-family:-apple-system,sans-serif">
      You get all of it for $397 total
    </div>
    <p style="font-size:13px;color:{MUTED};line-height:1.7;margin:0 0 16px;
      font-family:-apple-system,sans-serif">
      That's the $97 playbook + Ty's full implementation team for $300 more.
      First month is $397 — then just $400/month after that.
      Month to month. Cancel anytime. No contracts.
    </p>

    <div style="display:inline-block;padding:5px 14px;background:{GOLD};color:{DARK};
      font-size:11px;font-weight:700;border-radius:3px;margin-bottom:16px;
      font-family:DM Mono,monospace,sans-serif">
      YOU SAVE OVER $1,500
    </div>
    <br>
    <a href="{RETAINER_LINK}&biz={biz.replace(' ','%20')}&score={total}"
      style="display:block;padding:14px;background:transparent;color:{GOLD};font-weight:700;
      font-size:18px;border-radius:6px;text-decoration:none;text-align:center;
      border:1.5px solid {GOLD};font-family:-apple-system,sans-serif;letter-spacing:0.03em">
      Add Ty's Team for $300 More →
    </a>
    <p style="font-size:11px;color:{FAINT};text-align:center;margin:8px 0 0;
      font-family:-apple-system,sans-serif">
      First month = full implementation of everything Lola found for {biz} today.
    </p>
  </div>
</div>"""

    # ── Google review link ────────────────────────────────────────
    review_block = f"""
<div style="margin:0 20px 20px;padding:16px;background:{DARK};border:1px solid {DARK_BDR};
  border-radius:8px;text-align:center">
  <p style="font-size:13px;color:{MUTED};margin:0 0 12px;
    font-family:-apple-system,sans-serif">
    Did Lola help {biz}? Leave a Google review — it helps other local businesses find us. 🐾
  </p>
  <a href="{REVIEW_LINK}"
    style="display:inline-block;padding:10px 22px;border:1px solid {GOLD_DIM};color:{GOLD};
    font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;
    font-family:-apple-system,sans-serif">
    Leave Lola a Google Review →
  </a>
</div>"""

    # ─────────────────────────────────────────────────────────────
    # FINAL HTML (mobile-first, 600px max, inline styles only)
    # ─────────────────────────────────────────────────────────────
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>LOLA SEO — {biz} Audit</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media only screen and (max-width:600px) {{
    .email-outer {{ padding:8px !important; }}
    .email-card  {{ border-radius:12px !important; }}
    .hero-score  {{ font-size:80px !important; }}
    .section-pad {{ padding:0 14px 18px !important; }}
    .offer-pad   {{ margin:0 14px 14px !important; }}
    table        {{ width:100% !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#050505;-webkit-text-size-adjust:100%">
<div class="email-outer" style="max-width:600px;margin:0 auto;padding:16px">
<div class="email-card" style="background:{DARK_CARD};border-radius:8px;
  overflow:hidden;border:1px solid {DARK_BDR}">

  <!-- ── HEADER ── -->
  <div style="background:linear-gradient(160deg,#161616,{DARK});padding:24px 20px;
    text-align:center;border-bottom:1px solid {DARK_BDR}">
    <img src="{LOLA_LOGO}" alt="Lola" width="56" height="56"
      style="border-radius:50%;border:2px solid {GOLD_DIM};margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;
      color:{GOLD};margin-bottom:5px;font-family:DM Mono,monospace,sans-serif">
      LOLA SEO · BY TY ALEXANDER MEDIA
    </div>
    <div style="font-size:19px;font-weight:700;color:{TEXT};margin-bottom:4px;
      font-family:-apple-system,sans-serif">{biz} — Free SEO Audit</div>
    <div style="font-size:11px;color:{FAINT};font-family:DM Mono,monospace,sans-serif">
      {url_display} · {city}
    </div>
  </div>

  <!-- ── SCORE HERO ── -->
  <div style="padding:28px 20px 20px;text-align:center;
    border-bottom:1px solid {DARK_BDR};
    background:radial-gradient(ellipse at 50% 0%,rgba(201,168,76,0.06) 0%,transparent 60%)">

    {score_ring}

    <div style="font-size:12px;color:{FAINT};margin-bottom:10px;
      font-family:DM Mono,monospace,sans-serif">Grade {grade}</div>

    <div style="display:inline-block;padding:7px 18px;
      background:{score_color}18;border:1px solid {score_color}40;
      border-radius:99px;font-size:13px;font-weight:700;color:{score_color};
      margin-bottom:16px;font-family:DM Mono,monospace,sans-serif">
      {grade_emoji} {grade_label}
    </div>

    <p style="font-size:14px;color:{MUTED};line-height:1.75;
      margin:0 0 16px;max-width:400px;margin-left:auto;margin-right:auto;
      font-family:-apple-system,sans-serif">{summary}</p>

    <!-- Leads lost callout -->
    <div style="display:inline-block;padding:12px 20px;
      background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);
      border-radius:8px;max-width:100%;box-sizing:border-box">
      <div style="font-size:15px;font-weight:700;color:{CRITICAL};
        font-family:-apple-system,sans-serif;line-height:1.5">
        You're missing an estimated {leads} inbound calls per month.
      </div>
    </div>
  </div>

  <!-- ── REVENUE LEAK ── -->
  <div style="margin:18px 20px;padding:18px;background:{DARK};
    border:1px solid rgba(224,82,82,0.25);border-radius:8px;text-align:center">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;
      color:{CRITICAL};margin-bottom:8px;font-family:DM Mono,monospace,sans-serif">
      Estimated Monthly Revenue Leak
    </div>
    <div style="font-size:56px;font-weight:800;color:{TEXT};line-height:1;
      font-family:DM Mono,monospace,sans-serif">${revenue:,}</div>
    <div style="font-size:12px;color:{FAINT};margin-top:5px;
      font-family:-apple-system,sans-serif">
      in missed leads per month based on {city} market + your score
    </div>
  </div>

  <!-- ── SCORE BREAKDOWN ── -->
  <div class="section-pad" style="padding:0 20px 18px">
    {_section_label("🐾", "Score Breakdown")}
    <table style="width:100%;border-collapse:collapse;background:{DARK};
      border-radius:8px;overflow:hidden;border:1px solid {DARK_BDR}">
      {cats_html}
    </table>
  </div>

  <!-- ── ISSUES ── -->
  <div class="section-pad" style="padding:0 20px 18px">
    {_section_label("🚨", "What Lola Found", CRITICAL)}
    {issues_html}
  </div>

  {comp_block}

  <!-- ── QUICK WINS ── -->
  <div class="section-pad" style="padding:0 20px 18px">
    {_section_label("🎾", "Quick Wins — Do These First", GREEN)}
    {wins_html}
  </div>

  {proof_block}

  <!-- ── $97 DIY PLAYBOOK ── -->
  {offer_97}

  <!-- ── $400 RETAINER UPSELL ── -->
  {offer_400}

  <!-- ── 90-DAY ROADMAP ── -->
  <div class="section-pad" style="padding:0 20px 18px">
    {_section_label("📅", "Your 90-Day Fix Roadmap", MUTED)}
    {roadmap_html}
  </div>

  <!-- ── GOOGLE REVIEW ── -->
  {review_block}

  <!-- ── FOOTER ── -->
  <div style="padding:16px 20px;background:{DARK};border-top:1px solid {DARK_BDR};
    text-align:center">
    <div style="font-size:11px;color:{FAINT};line-height:1.8;
      font-family:DM Mono,monospace,sans-serif">
      Ty Alexander Media · Tampa Bay, FL<br>
      <a href="tel:+17273006573" style="color:{GOLD};text-decoration:none">727-300-6573</a>
      &nbsp;·&nbsp;
      <a href="https://tyalexandermedia.com" style="color:{FAINT};text-decoration:none">
        tyalexandermedia.com
      </a><br>
      <span style="color:{FAINT}">© 2026 Ty Alexander Media</span>
    </div>
  </div>

</div>
</div>
</body>
</html>"""
