#!/usr/bin/env python3
"""Generate Tampa Bay Power Clean service pages from a shared template."""
import json
import os
import html as htmllib

OUT_DIR = "/home/user/lola-backend/frontend/public/lp/tampa-bay-power-clean"
BASE = "https://www.tampabaypowerclean.com"
PHONE_DISPLAY = "727-712-6281"
PHONE_HREF = "tel:+17277126281"

CSS = """
:root{--navy:#0b2233;--navy2:#10344c;--ink:#152430;--body:#43555f;--soft:#6b7c85;--line:#e4e0d5;--gold:#c99a2e;--gold2:#e8c25d;--cream:#faf7f0;--white:#fff;--green:#1d7a5f}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--body);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%;height:auto}
.shell{width:min(1140px,calc(100% - 44px));margin:0 auto}
h1,h2,h3,h4{margin:0;color:var(--ink);font-weight:800;line-height:1.15;letter-spacing:-.015em}
h1{font-size:clamp(30px,4vw,46px);color:#fff}
h2{font-size:clamp(25px,3.2vw,34px)}
h3{font-size:19px}
p{margin:0}
.eyebrow{margin:0 0 12px;font-size:12.5px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:var(--gold)}
.topbar{background:var(--navy);color:#dfe8ea;font-size:13px;text-align:center;padding:8px 16px}
.topbar strong{color:var(--gold2)}
.nav{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:72px}
.brand{display:flex;align-items:center;gap:11px;min-width:0}
.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:var(--navy);color:var(--gold2);font-weight:900;font-size:17px}
.wordmark{font-weight:900;font-size:19px;line-height:1.05;color:var(--navy)}
.wordmark span{display:block;font-size:11.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.14em}
.nav-links{display:flex;align-items:center;gap:22px;font-size:14px;font-weight:700}
.nav-links>a{color:var(--ink);padding:10px 0;min-height:44px;display:inline-flex;align-items:center}
.nav-links>a:hover{color:var(--gold)}
.nav-phone{display:inline-flex;align-items:center;gap:8px;color:var(--navy);font-weight:800}
.btn{display:inline-flex;min-height:52px;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:0 24px;background:var(--gold);color:#fff;font-size:15px;font-weight:800;box-shadow:0 10px 24px rgba(201,154,46,.35);transition:transform .15s;border:0;cursor:pointer;font-family:inherit}
.btn:hover{transform:translateY(-1px)}
.btn.ghost{background:transparent;border:2px solid rgba(255,255,255,.55);color:#fff;box-shadow:none}
.btn.nav-cta{min-height:44px;padding:0 18px;font-size:13.5px}
.crumbs{padding:14px 0 0;font-size:13px;color:#b9c9d1}
.crumbs a{color:#d9e4e8;font-weight:700}
.crumbs a:hover{color:var(--gold2)}
.hero{position:relative;background:linear-gradient(100deg,rgba(8,24,36,.96) 0%,rgba(9,28,42,.88) 52%,rgba(10,31,46,.62) 100%),url("/images/tampa-bay-power-clean-hero.png") center right/cover no-repeat;border-bottom:6px solid var(--gold)}
.hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(330px,.65fr);gap:48px;align-items:center;padding:48px 0 64px}
.hero .eyebrow{color:var(--gold2)}
.hero-sub{max-width:600px;margin:18px 0 0;font-size:clamp(16.5px,1.8vw,19px);color:#d9e4e8}
.hero-sub strong{color:#fff}
.hero-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.hero-trust{display:flex;flex-wrap:wrap;gap:9px 20px;margin:24px 0 0;padding:0;list-style:none;color:#cfdde2;font-size:14px;font-weight:600}
.hero-trust li{display:flex;align-items:center;gap:7px}
.hero-trust svg{color:var(--gold2)}
.quote-card{background:var(--white);border-radius:16px;padding:26px 24px 24px;box-shadow:0 30px 70px rgba(4,16,26,.45)}
.quote-card h2{font-size:20px}
.quote-card .qc-sub{margin:6px 0 16px;font-size:13.5px;color:var(--soft)}
.qfield{margin-bottom:11px}
.qfield label{display:block;margin-bottom:5px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--soft)}
.qfield input,.qfield select{width:100%;padding:13px 14px;border:1.5px solid var(--line);border-radius:9px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink)}
.qfield input:focus,.qfield select:focus{outline:0;border-color:var(--gold)}
.honey{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}
.q-submit{width:100%;margin-top:6px}
.q-note{margin-top:10px;font-size:12px;color:var(--soft);text-align:center}
.q-done{display:none;text-align:center;padding:26px 6px}
.q-done .big{font-size:40px;line-height:1;margin-bottom:12px}
.q-done h3{margin-bottom:8px}
.q-done p{font-size:14.5px}
.q-done a{color:var(--gold);font-weight:800}
section.block{padding:76px 0}
.center{text-align:center}
.lede{max-width:660px;margin:14px auto 0;font-size:17.5px}
.prose{max-width:780px;margin:0 auto}
.prose h2{margin-top:0}
.prose p{margin-top:16px;font-size:16.5px}
.prose p strong{color:var(--ink)}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:38px}
.card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:26px;box-shadow:0 12px 30px rgba(20,35,45,.05)}
.card h3{color:var(--navy)}
.card p{margin-top:10px;font-size:14.8px}
.checkgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:34px}
.checkgrid div{display:flex;gap:10px;align-items:flex-start;background:var(--white);border:1px solid var(--line);border-radius:12px;padding:16px 18px;font-size:15px;color:var(--ink);font-weight:600}
.checkgrid div::before{content:"✓";color:var(--green);font-weight:900}
.band{background:var(--navy);color:#d6e2e7}
.band .eyebrow{color:var(--gold2)}
.band h2{color:#fff}
.band .prose p{color:#c9d7dd}
.band .prose p strong{color:var(--gold2)}
.cities{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:34px}
.cities div{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:16px 18px;font-size:14.5px}
.cities strong{display:block;color:var(--navy);font-size:15.5px;margin-bottom:3px}
.xlinks{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:34px}
.xlink{display:block;background:var(--white);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:12px;padding:20px 22px}
.xlink strong{display:block;color:var(--navy);font-size:16.5px}
.xlink span{display:block;margin-top:5px;font-size:14px;color:var(--soft)}
.xlink:hover strong{color:var(--gold)}
.faq-list{max-width:780px;margin:34px auto 0}
details{border:1px solid var(--line);border-radius:12px;background:var(--white);margin-bottom:10px;overflow:hidden}
summary{cursor:pointer;padding:18px 20px;color:var(--ink);font-weight:800;font-size:16px;list-style:none;display:flex;justify-content:space-between;gap:14px;align-items:center}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--gold);font-size:22px;font-weight:700;line-height:1}
details[open] summary::after{content:"–"}
details p{padding:0 20px 18px;font-size:15px}
.final{background:linear-gradient(115deg,var(--navy) 0%,var(--navy2) 100%);color:#d6e2e7;text-align:center;border-top:6px solid var(--gold)}
.final h2{color:#fff}
.final p{max-width:620px;margin:16px auto 0}
.final .hero-ctas{justify-content:center}
footer{background:var(--navy);color:#9db1ba;border-top:1px solid rgba(255,255,255,.08);padding:44px 0 90px;font-size:14px}
.foot-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:36px}
.foot-grid h4{color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
.foot-grid ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.foot-grid a:hover{color:var(--gold2)}
.foot-brand p{margin-top:12px;max-width:300px;font-size:13.5px;line-height:1.55}
.foot-bottom{margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);font-size:12.5px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
.sticky-call{position:fixed;right:0;bottom:0;left:0;z-index:50;display:none;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}
.sticky-call a{display:flex;min-height:58px;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:800}
.sticky-call .sc-call{background:var(--navy);color:#fff}
.sticky-call .sc-quote{background:var(--gold);color:#fff}
@media(max-width:960px){
  .hero-grid{grid-template-columns:1fr;gap:36px;padding:40px 0 56px}
  .quote-card{max-width:560px}
  .cards3{grid-template-columns:1fr}
  .checkgrid,.xlinks{grid-template-columns:1fr}
  .cities{grid-template-columns:repeat(2,1fr)}
  .foot-grid{grid-template-columns:1fr;gap:28px}
}
@media(max-width:640px){
  body{font-size:16px}
  .shell{width:min(100% - 32px,1140px)}
  .nav-links>a:not(.nav-cta){display:none}
  .nav-phone{display:none}
  section.block{padding:56px 0}
  .cities{grid-template-columns:1fr 1fr}
  .sticky-call{display:grid}
  footer{padding-bottom:110px}
}
""".strip()

JS = """
(function(){
  document.getElementById('yr').textContent = new Date().getFullYear();
  var form = document.getElementById('lead-form');
  var done = document.getElementById('lead-done');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var f = new FormData(form);
    if (f.get('company')) { form.style.display='none'; done.style.display='block'; return; }
    var name = (f.get('name')||'').toString().trim();
    var phone = (f.get('phone')||'').toString().trim();
    var address = (f.get('address')||'').toString().trim();
    if (!name || !phone || !address) { form.reportValidity ? form.reportValidity() : alert('Please fill in your name, phone, and address.'); return; }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    var payload = {
      client_slug: 'tampa-bay-power-clean',
      name: name,
      phone: phone,
      address: address,
      service: (f.get('service')||'').toString(),
      source_url: location.href,
      source_medium: 'website'
    };
    fetch('/lead-gen/webhook/form', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    }).catch(function(){
      return fetch('https://lola-backend-production.up.railway.app/lead-gen/webhook/form', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
    }).finally(function(){
      form.style.display = 'none';
      done.style.display = 'block';
    });
  });
})();
""".strip()

SERVICE_OPTIONS = [
    "Roof Cleaning",
    "House Washing",
    "Paver Cleaning & Sealing",
    "Roof + House Bundle",
    "Driveway Cleaning",
    "Pool Cage Cleaning",
    "Fence Cleaning",
    "Window Cleaning",
    "Solar Panel Cleaning",
    "Commercial Pressure Washing",
    "Other / Not sure",
]

SIBLINGS = {
    "roof-cleaning": [
        ("house-washing", "House Washing", "Bundle a house wash with your roof cleaning and save on the combined visit."),
        ("paver-sealing", "Paver Cleaning & Sealing", "Driveway looking as tired as the roof did? Clean, re-sand, and seal it in one job."),
    ],
    "house-washing": [
        ("roof-cleaning", "Roof Cleaning", "Black streaks up top? A soft wash roof cleaning pairs perfectly with a house wash."),
        ("paver-sealing", "Paver Cleaning & Sealing", "Finish the transformation — restore and seal the driveway and pool deck."),
    ],
    "paver-sealing": [
        ("roof-cleaning", "Roof Cleaning", "Protect the biggest surface on the property while we're there."),
        ("house-washing", "House Washing", "A clean exterior makes freshly sealed pavers look twice as good."),
    ],
}

def build_faq_schema(faqs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs
        ],
    }

def build_page_schema(svc):
    url = f"{BASE}/{svc['slug']}"
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "@id": f"{url}#service",
                "name": svc["service_name"],
                "serviceType": svc["service_type"],
                "description": svc["meta_desc"],
                "url": url,
                "provider": {
                    "@type": "HomeAndConstructionBusiness",
                    "@id": f"{BASE}/#business",
                    "name": "Tampa Bay Power Clean",
                    "telephone": "+17277126281",
                    "url": f"{BASE}/",
                },
                "areaServed": [
                    {"@type": "City", "name": c} for c in
                    ["Dunedin", "Clearwater", "Palm Harbor", "Safety Harbor", "Largo",
                     "Seminole", "St. Petersburg", "Tarpon Springs"]
                ] + [{"@type": "AdministrativeArea", "name": "Pinellas County"}],
            },
            {
                "@type": "WebPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": svc["title"],
                "isPartOf": {"@id": f"{BASE}/#website"},
                "about": {"@id": f"{url}#service"},
                "breadcrumb": {"@id": f"{url}#breadcrumb"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE}/"},
                    {"@type": "ListItem", "position": 2, "name": svc["service_name"], "item": url},
                ],
            },
        ],
    }

def esc(s):
    return htmllib.escape(s, quote=False)

def render(svc):
    url = f"{BASE}/{svc['slug']}"
    schema = json.dumps(build_page_schema(svc), indent=1)
    faq_schema = json.dumps(build_faq_schema(svc["faqs"]), indent=1)

    options = "\n".join(
        f'              <option value="{o}"{" selected" if o == svc["form_service"] else ""}>{esc(o)}</option>'
        for o in SERVICE_OPTIONS
    )

    trust = """
        <ul class="hero-trust" aria-label="Trust highlights">
          <li><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5.25 3.4 10.16 8 11 4.6-.84 8-5.75 8-11V5l-8-3Z"/></svg>Fully insured</li>
          <li><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-5.1-10-9.6C.4 8 2.4 4.5 6 4.5c2 0 3.4 1 4.5 2.4h3C14.6 5.5 16 4.5 18 4.5c3.6 0 5.6 3.5 4 6.9C19.5 15.9 12 21 12 21Z"/></svg>Family-owned &amp; local</li>
          <li><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 10.6 4.2 2.5-.8 1.3L11 13V6.5h2Z"/></svg>Quotes in 24 hours</li>
        </ul>""".rstrip()

    body_sections = svc["body_html"]

    cities_html = "\n".join(
        f'        <div><strong>{c}</strong>{t}</div>' for c, t in svc["cities"]
    )

    faqs_html = "\n".join(
        f"""        <details>
          <summary>{esc(q)}</summary>
          <p>{esc(a)}</p>
        </details>""" for q, a in svc["faqs"]
    )

    xlinks = "\n".join(
        f"""        <a class="xlink" href="/tampa-bay-power-clean/{slug}"><strong>{name} →</strong><span>{blurb}</span></a>"""
        for slug, name, blurb in SIBLINGS[svc["slug"]]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(svc['title'])}</title>
<meta name="description" content="{esc(svc['meta_desc'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tampa Bay Power Clean">
<meta property="og:title" content="{esc(svc['title'])}">
<meta property="og:description" content="{esc(svc['meta_desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{svc['og_image']}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(svc['title'])}">
<meta name="twitter:description" content="{esc(svc['meta_desc'])}">
<meta name="twitter:image" content="{svc['og_image']}">
<meta name="theme-color" content="#0b2233">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="geo.region" content="US-FL">
<meta name="geo.placename" content="Dunedin, Florida">
<meta name="format-detection" content="telephone=yes">
<link rel="icon" href="/favicon.svg">
<link rel="preload" as="image" href="/images/tampa-bay-power-clean-hero.png" fetchpriority="high">
<script type="application/ld+json">
{schema}
</script>
<script type="application/ld+json">
{faq_schema}
</script>
<style>
{CSS}
</style>
</head>
<body>
<div class="topbar">Serving <strong>Dunedin, Clearwater, Palm Harbor</strong> &amp; all of Pinellas County · Quotes within <strong>24 hours</strong></div>
<header class="nav">
  <div class="shell nav-inner">
    <a class="brand" href="/tampa-bay-power-clean" aria-label="Tampa Bay Power Clean home">
      <span class="mark">TB</span>
      <span class="wordmark">Tampa Bay Power Clean<span>Exterior Cleaning · Dunedin, FL</span></span>
    </a>
    <nav class="nav-links" aria-label="Primary navigation">
      <a href="/tampa-bay-power-clean/roof-cleaning">Roof Cleaning</a>
      <a href="/tampa-bay-power-clean/house-washing">House Washing</a>
      <a href="/tampa-bay-power-clean/paver-sealing">Paver Sealing</a>
      <a class="nav-phone" href="{PHONE_HREF}" aria-label="Call Tampa Bay Power Clean at {PHONE_DISPLAY}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/></svg>
        {PHONE_DISPLAY}
      </a>
      <a class="btn nav-cta" href="#quote">Get My Free Quote</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero">
    <div class="shell">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/tampa-bay-power-clean">Home</a> <span aria-hidden="true">›</span> {svc['service_name']}</nav>
    </div>
    <div class="shell hero-grid">
      <div>
        <p class="eyebrow">{esc(svc['eyebrow'])}</p>
        <h1>{svc['h1']}</h1>
        <p class="hero-sub">{svc['hero_sub']}</p>
        <div class="hero-ctas">
          <a class="btn" href="#quote">Get My Free Quote</a>
          <a class="btn ghost" href="{PHONE_HREF}" aria-label="Call Tampa Bay Power Clean at {PHONE_DISPLAY}">Call {PHONE_DISPLAY}</a>
        </div>
{trust}
      </div>
      <div class="quote-card" id="quote">
        <h2>{esc(svc['form_heading'])}</h2>
        <p class="qc-sub">No home visit. No pressure. Just a clear number for your property.</p>
        <form id="lead-form" novalidate>
          <div class="qfield">
            <label for="lf-name">Name</label>
            <input id="lf-name" name="name" type="text" autocomplete="name" required placeholder="Jane Smith">
          </div>
          <div class="qfield">
            <label for="lf-phone">Phone</label>
            <input id="lf-phone" name="phone" type="tel" autocomplete="tel" required placeholder="(727) 555-0123" inputmode="tel">
          </div>
          <div class="qfield">
            <label for="lf-address">Property address or city</label>
            <input id="lf-address" name="address" type="text" autocomplete="street-address" required placeholder="123 Main St, Dunedin">
          </div>
          <div class="qfield">
            <label for="lf-service">What do you need cleaned?</label>
            <select id="lf-service" name="service" required>
{options}
            </select>
          </div>
          <input class="honey" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="btn q-submit" type="submit">Send My Quote Request</button>
          <p class="q-note">Prefer to talk? Call <a href="{PHONE_HREF}" style="color:var(--gold);font-weight:800">{PHONE_DISPLAY}</a></p>
        </form>
        <div class="q-done" id="lead-done" role="status">
          <div class="big" aria-hidden="true">✅</div>
          <h3>Request received!</h3>
          <p>We'll get back to you with a quote within 24 hours. Need it faster? Call <a href="{PHONE_HREF}">{PHONE_DISPLAY}</a>.</p>
        </div>
      </div>
    </div>
  </section>

{body_sections}

  <section class="block" id="cities" style="background:var(--white);border-block:1px solid var(--line)">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">Where we work</p>
        <h2>{esc(svc['cities_heading'])}</h2>
      </div>
      <div class="cities">
{cities_html}
      </div>
    </div>
  </section>

  <section class="block" id="faq">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">Good questions</p>
        <h2>{esc(svc['faq_heading'])}</h2>
      </div>
      <div class="faq-list">
{faqs_html}
      </div>
    </div>
  </section>

  <section class="block" style="padding-top:0">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">While we're there</p>
        <h2>Pairs well with</h2>
      </div>
      <div class="xlinks">
{xlinks}
      </div>
    </div>
  </section>

  <section class="block final">
    <div class="shell">
      <p class="eyebrow">Ready when you are</p>
      <h2>{esc(svc['final_heading'])}</h2>
      <p>{esc(svc['final_sub'])}</p>
      <div class="hero-ctas">
        <a class="btn" href="#quote">Get My Free Quote</a>
        <a class="btn ghost" href="{PHONE_HREF}" aria-label="Call Tampa Bay Power Clean at {PHONE_DISPLAY}">Call {PHONE_DISPLAY}</a>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="shell foot-grid">
    <div class="foot-brand">
      <a class="brand" href="/tampa-bay-power-clean" aria-label="Tampa Bay Power Clean home" style="color:#fff">
        <span class="mark">TB</span>
        <span class="wordmark" style="color:#fff">Tampa Bay Power Clean<span>Exterior Cleaning · Dunedin, FL</span></span>
      </a>
      <p>Family-owned soft wash and pressure washing company serving Dunedin, Clearwater, Palm Harbor, and all of Pinellas County, Florida.</p>
    </div>
    <div>
      <h4>Services</h4>
      <ul>
        <li><a href="/tampa-bay-power-clean/roof-cleaning">Roof Cleaning</a></li>
        <li><a href="/tampa-bay-power-clean/house-washing">House Washing</a></li>
        <li><a href="/tampa-bay-power-clean/paver-sealing">Paver Cleaning &amp; Sealing</a></li>
        <li><a href="/tampa-bay-power-clean#services">All services</a></li>
      </ul>
    </div>
    <div>
      <h4>Contact</h4>
      <ul>
        <li><a href="{PHONE_HREF}">{PHONE_DISPLAY}</a></li>
        <li><a href="#quote">Request a quote</a></li>
        <li><a href="/tampa-bay-power-clean#areas">Service areas</a></li>
        <li><a href="/tampa-bay-power-clean#faq">FAQ</a></li>
      </ul>
    </div>
  </div>
  <div class="shell foot-bottom">
    <span>© <span id="yr">2026</span> Tampa Bay Power Clean · Dunedin, FL</span>
    <span>Roof Cleaning · House Washing · Paver Sealing · Pinellas County</span>
  </div>
</footer>

<nav class="sticky-call" aria-label="Quick contact">
  <a class="sc-call" href="{PHONE_HREF}">☎ Call Now</a>
  <a class="sc-quote" href="#quote">Get Free Quote</a>
</nav>

<script>
{JS}
</script>
</body>
</html>
"""

WIX = "https://static.wixstatic.com/media"

SERVICES = [
    # ─────────────────────────── ROOF CLEANING ───────────────────────────
    {
        "slug": "roof-cleaning",
        "service_name": "Roof Cleaning",
        "service_type": "Soft wash roof cleaning",
        "title": "Roof Cleaning Dunedin FL | Soft Wash Roof Cleaning Pinellas County",
        "meta_desc": "Soft wash roof cleaning in Dunedin, Clearwater, Palm Harbor & Pinellas County. Remove black algae streaks safely, protect your warranty, and extend roof life. Free 24-hour quote — 727-712-6281.",
        "og_image": f"{WIX}/a210f4_e6a878454e9542d3af3a62d72f8fa8ab~mv2.png/v1/fill/w_640,h_583,al_c,lg_1,q_90,enc_avif,quality_auto/Roof%20Wash.png",
        "eyebrow": "Soft Wash Roof Cleaning · Dunedin & Pinellas County",
        "h1": 'Roof cleaning that protects your roof — <span style="color:var(--gold2)">not just your curb appeal</span>',
        "hero_sub": 'Those black streaks are living algae shortening your roof\'s life. Our low-pressure soft wash removes them safely — for a small fraction of the <strong>$15,000–$30,000+</strong> a Pinellas County roof replacement costs.',
        "form_heading": "Get your free roof cleaning quote",
        "form_service": "Roof Cleaning",
        "body_html": """  <section class="block">
    <div class="shell prose">
      <p class="eyebrow">Why your roof streaks</p>
      <h2>The black stains on Pinellas County roofs are alive</h2>
      <p>They're called <strong>Gloeocapsa magma</strong> — an airborne algae that lands on your roof, feeds on the limestone filler inside asphalt shingles, and spreads through Florida's humid air from roof to roof. That's why once one house on the street streaks, the neighbors follow.</p>
      <p>The algae doesn't just look bad. It <strong>holds moisture against the roof surface</strong>, keeps shingles hotter, and slowly digests them. Left alone, it can take years off a roof's expected life — and in Dunedin, Clearwater, and Palm Harbor's climate, it never stops on its own.</p>
      <p>Roof cleaning done right isn't cosmetic. It's <strong>maintenance that delays a five-figure replacement.</strong></p>
    </div>
  </section>

  <section class="block band">
    <div class="shell prose">
      <p class="eyebrow">Soft wash vs. pressure washing</p>
      <h2>Why we never blast a roof with high pressure</h2>
      <p>High-pressure washing strips the protective granules off shingles, forces water under tile, and can <strong>void your roofing manufacturer's warranty</strong>. That's why shingle manufacturers and the roofing industry recommend low-pressure chemical cleaning — soft washing — as the safe method.</p>
      <p>Our soft wash applies a biodegradable cleaning solution at <strong>lower pressure than heavy rain</strong>. It kills the algae, lichen, and mold at the root rather than shaving off the visible layer — which is why a soft-washed roof typically stays clean <strong>18–36 months</strong>, several times longer than a pressure-washed one.</p>
    </div>
  </section>

  <section class="block">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">Every roof type in Pinellas</p>
        <h2>Shingle, tile, and metal — each cleaned its own way</h2>
      </div>
      <div class="cards3">
        <div class="card"><h3>Asphalt shingle</h3><p>The most common roof in Dunedin and Largo — and the most vulnerable to algae. We soft wash with warranty-safe chemistry that preserves the granules that protect your home.</p></div>
        <div class="card"><h3>Tile roofs</h3><p>Palm Harbor and Clearwater favorites. Tile cracks under foot traffic and pressure, so we clean from ladders and wands with low-pressure methods that reach the grout lines where growth hides.</p></div>
        <div class="card"><h3>Metal roofs</h3><p>Coastal homes near Dunedin and Tarpon Springs collect salt film and mildew. We use pH-appropriate solutions that clean without dulling the painted finish.</p></div>
      </div>
      <div class="checkgrid">
        <div>Removes black streaks, algae, lichen, and moss at the root</div>
        <div>Low pressure — safe for shingle, tile, and metal</div>
        <div>Landscaping pre-wetted, rinsed, and protected</div>
        <div>Photo documentation for HOA notices and your records</div>
        <div>Residential and commercial roofs quoted within 24 hours</div>
        <div>Results that typically last 18–36 months in Tampa Bay humidity</div>
      </div>
    </div>
  </section>""",
        "cities_heading": "Roof cleaning across Dunedin & Pinellas County",
        "cities": [
            ("Roof cleaning Dunedin", "Our home base — fast scheduling citywide, from downtown to Dunedin Isles."),
            ("Roof cleaning Clearwater", "Shingle and tile soft washing from Countryside to the beach."),
            ("Roof cleaning Palm Harbor", "Tile roof specialists for deed-restricted communities."),
            ("Roof cleaning Safety Harbor", "Soft wash service from Main Street to the bayfront."),
            ("Roof cleaning Largo", "Shingle roof algae removal across Largo neighborhoods."),
            ("Roof cleaning Seminole", "Roof soft washing for Seminole homes and townhomes."),
            ("Roof cleaning St. Petersburg", "Residential and commercial roofs throughout St. Pete."),
            ("Roof cleaning Tarpon Springs", "Coastal roofs that take the brunt of salt air."),
            ("Pinellas County", "Surrounding communities welcome — ask when you call."),
        ],
        "faq_heading": "Roof cleaning questions, answered",
        "faqs": [
            ("How much does roof cleaning cost in Dunedin?", "Every roof is quoted individually based on size, pitch, material, and buildup — send your address and you'll have a clear number within 24 hours, no home visit needed. Whatever the number, it's a small fraction of the $15,000–$30,000+ a Pinellas County roof replacement runs."),
            ("Will soft washing damage my shingles or void my warranty?", "No — it's the opposite. Low-pressure soft washing is the cleaning method roofing manufacturers recommend. It's high-pressure washing that strips protective granules and can void shingle warranties."),
            ("How long does a roof cleaning take?", "Most residential roofs in Pinellas County are done in a few hours, in a single visit. You don't need to be home — we just need access to outdoor water and gates unlocked."),
            ("How long will my roof stay clean?", "Typically 18–36 months in Tampa Bay humidity. North-facing slopes and roofs under heavy tree cover regrow faster. Ask about maintenance scheduling to stay ahead of it."),
            ("Is the cleaning solution safe for my plants and pets?", "Yes. We use biodegradable solutions, pre-wet and rinse landscaping around the house, and ask that pets stay clear of treated areas while surfaces dry."),
            ("My HOA says my roof must be cleaned. What now?", "Send us the notice — it's one of our most common calls in Dunedin, Palm Harbor, and Clearwater. We schedule quickly and give you finished photos to send back to the association."),
        ],
        "final_heading": "Stop the algae before it costs you a roof.",
        "final_sub": "Free roof cleaning quote in 24 hours. Family-owned, fully insured, based in Dunedin. Bundle a house wash and save on the combined visit.",
    },
    # ─────────────────────────── HOUSE WASHING ───────────────────────────
    {
        "slug": "house-washing",
        "service_name": "House Washing",
        "service_type": "Soft wash house washing",
        "title": "House Washing Dunedin FL | Soft Wash Exterior Cleaning Pinellas County",
        "meta_desc": "Low-pressure house washing in Dunedin, Clearwater, Palm Harbor & Pinellas County. Safely remove algae, mildew & salt film from stucco and siding. Free 24-hour quote — 727-712-6281.",
        "og_image": f"{WIX}/a210f4_4f27034c8d1e4066bcd94fab3580bd6d~mv2.png/v1/fill/w_640,h_583,al_c,lg_1,q_90,enc_avif,quality_auto/Soft%20Wash.png",
        "eyebrow": "Soft Wash House Washing · Dunedin & Pinellas County",
        "h1": 'House washing that renews your exterior — <span style="color:var(--gold2)">without blasting it apart</span>',
        "hero_sub": 'Florida humidity turns stucco green and siding grimy. Our low-pressure soft wash removes algae, mildew, pollen, and salt film safely — the fastest curb-appeal upgrade a <strong>Pinellas County</strong> home can get.',
        "form_heading": "Get your free house washing quote",
        "form_service": "House Washing",
        "body_html": """  <section class="block">
    <div class="shell prose">
      <p class="eyebrow">What Florida does to your exterior</p>
      <h2>Green stucco isn't dirt. It's growth.</h2>
      <p>The green film creeping up your walls is <strong>algae and mildew</strong> feeding on the moisture Florida air delivers daily — plus pollen, dust, and, near the coast in Dunedin and Tarpon Springs, a salt-air film that dulls paint. It always starts on the shaded north side, and it never stops on its own.</p>
      <p>Beyond looks, growth holds moisture against stucco and siding, stains painted surfaces, and shortens repaint cycles. A proper house wash removes it at the root — so the exterior stays clean <strong>12–24 months</strong>, not weeks.</p>
      <p>It's also the single <strong>fastest way to raise curb appeal</strong> before listing a home, hosting an event, or answering an HOA letter.</p>
    </div>
  </section>

  <section class="block band">
    <div class="shell prose">
      <p class="eyebrow">The soft wash difference</p>
      <h2>Low pressure cleans deeper — and breaks nothing</h2>
      <p>Pointing a pressure washer at a house is how paint gets stripped, screens get torn, window seals fail, and water gets forced behind stucco. That damage costs far more than the wash.</p>
      <p>We soft wash the whole exterior instead: <strong>walls, soffits, fascia, gutters' outside faces, lanais, and screen enclosures</strong>, using biodegradable solutions at low pressure. The chemistry does the work, the rinse is gentle, and your plants are pre-wetted, covered where needed, and rinsed after.</p>
    </div>
  </section>

  <section class="block">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">Built for Florida exteriors</p>
        <h2>Every surface your home shows the street</h2>
      </div>
      <div class="cards3">
        <div class="card"><h3>Stucco &amp; block</h3><p>The classic Pinellas exterior — porous, paint-coated, and quick to grow algae in shade. Soft washing cleans the pores without driving water through them.</p></div>
        <div class="card"><h3>Siding &amp; trim</h3><p>Vinyl and fiber-cement siding, soffits, and fascia cleaned evenly with no wand stripes, no lifted edges, and no water forced behind panels.</p></div>
        <div class="card"><h3>Lanais &amp; screens</h3><p>Screen enclosures and lanai frames collect grime and spider webbing fast. Low pressure cleans them without stretching or tearing the mesh.</p></div>
      </div>
      <div class="checkgrid">
        <div>Removes algae, mildew, pollen, and salt-air film</div>
        <div>Safe for paint, stucco, siding, seals, and screens</div>
        <div>Landscaping protected before, during, and after</div>
        <div>Whole-exterior clean in a single visit</div>
        <div>Ideal before listing, painting, or an HOA deadline</div>
        <div>Bundle with roof cleaning and save on the combined visit</div>
      </div>
    </div>
  </section>""",
        "cities_heading": "House washing across Dunedin & Pinellas County",
        "cities": [
            ("House washing Dunedin", "Our home base — stucco and siding soft washed citywide."),
            ("House washing Clearwater", "Exterior cleaning from Countryside to Sand Key."),
            ("House washing Palm Harbor", "Soft washing for deed-restricted communities and HOA deadlines."),
            ("House washing Safety Harbor", "Gentle exterior cleaning for bayfront humidity."),
            ("House washing Largo", "Whole-exterior washes across Largo neighborhoods."),
            ("House washing Seminole", "Soft wash service for homes and townhomes."),
            ("House washing St. Petersburg", "Residential exteriors throughout St. Pete."),
            ("House washing Tarpon Springs", "Salt-film removal for coastal exteriors."),
            ("Pinellas County", "Surrounding communities welcome — ask when you call."),
        ],
        "faq_heading": "House washing questions, answered",
        "faqs": [
            ("How much does house washing cost in Pinellas County?", "It depends on the home's size, height, and exterior type. Send your address through the quote form and you'll have a clear number within 24 hours — no walkthrough or in-home appointment needed."),
            ("Will soft washing hurt my plants, paint, or screens?", "No. We use biodegradable solutions at low pressure, pre-wet and rinse landscaping, and clean screens and painted surfaces with methods that won't strip, tear, or stain them."),
            ("How often should a Florida home be washed?", "Most Pinellas County exteriors need washing every 12–24 months. Shaded, tree-covered, or north-facing walls regrow algae faster; coastal homes collect salt film sooner."),
            ("Do I need to be home during the wash?", "No. We need outdoor water access and unlocked gates. Windows should be closed — we'll confirm the details when we schedule."),
            ("Can you wash my house before I sell it?", "Absolutely — a soft wash is one of the cheapest, fastest ways to boost curb appeal before photos and showings. Many agents in Dunedin and Clearwater schedule us right before listing."),
            ("Can I bundle house washing with roof cleaning?", "Yes, and it's the most popular combination we do. One visit, one setup, a cleaner whole property — and a lower combined price than booking separately."),
        ],
        "final_heading": "Your home can look new again by next week.",
        "final_sub": "Free house washing quote in 24 hours. Family-owned, fully insured, based in Dunedin. Bundle with a roof wash and save.",
    },
    # ─────────────────────────── PAVER SEALING ───────────────────────────
    {
        "slug": "paver-sealing",
        "service_name": "Paver Cleaning & Sealing",
        "service_type": "Paver cleaning and sealing",
        "title": "Paver Sealing Pinellas County | Paver Cleaning & Sealing Dunedin FL",
        "meta_desc": "Paver cleaning, re-sanding & sealing in Dunedin, Clearwater, Palm Harbor & Pinellas County. Lock in color, stop weeds & mold, protect your investment. Free 24-hour quote — 727-712-6281.",
        "og_image": f"{WIX}/a210f4_dc8a0bd33484469288860e8270c2bb27~mv2.png/v1/fill/w_640,h_583,al_c,lg_1,q_90,enc_avif,quality_auto/driveway.png",
        "eyebrow": "Paver Cleaning & Sealing · Dunedin & Pinellas County",
        "h1": 'Paver sealing that locks in the color — <span style="color:var(--gold2)">and locks out the weeds</span>',
        "hero_sub": 'Your pavers were a five-figure investment. Florida sun fades them, rain washes out the joint sand, and mold moves into the pores. We <strong>clean, re-sand, and seal</strong> — one job that protects all of it.',
        "form_heading": "Get your free paver sealing quote",
        "form_service": "Paver Cleaning & Sealing",
        "body_html": """  <section class="block">
    <div class="shell prose">
      <p class="eyebrow">What Florida does to pavers</p>
      <h2>Unsealed pavers in Florida are on a countdown</h2>
      <p>Paver driveways, patios, and pool decks are among the most expensive surfaces on a Pinellas County property — and the most exposed. <strong>UV bleaches the color. Rain washes out the joint sand</strong> that holds everything tight. Mold and algae move into the open pores, weeds root in the joints, and every oil drip soaks in permanently.</p>
      <p>Pressure washing alone makes it worse over time: it strips more sand out of the joints and opens the pores wider, so the surface gets dirty <em>faster</em> after each wash.</p>
      <p>The fix is a system, not a rinse: <strong>deep clean, restore the joint sand, then seal.</strong></p>
    </div>
  </section>

  <section class="block band">
    <div class="shell prose">
      <p class="eyebrow">Our three-step system</p>
      <h2>Clean. Re-sand. Seal. Done as one job.</h2>
      <p><strong>1 — Deep clean.</strong> We remove mold, algae, stains, and old failing sand from the surface and the joints, using the right method for the paver type and condition.</p>
      <p><strong>2 — Re-sand.</strong> Fresh joint sand goes back between the pavers, restoring the interlock that keeps the surface tight, level, and weed-resistant.</p>
      <p><strong>3 — Seal.</strong> A <strong>UV-stable sealer formulated for Florida</strong> locks in the color, hardens the joints, and makes the surface shed water, resist oil and tire stains, and stay clean far longer. Finish options range from natural look to wet-look enhancement.</p>
    </div>
  </section>

  <section class="block">
    <div class="shell">
      <div class="center">
        <p class="eyebrow">Every hardscape surface</p>
        <h2>Driveways, patios, pool decks &amp; walkways</h2>
      </div>
      <div class="cards3">
        <div class="card"><h3>Paver driveways</h3><p>The first thing anyone sees. Sealed pavers resist tire marks, oil drips, and fading — and make the whole property read as maintained.</p></div>
        <div class="card"><h3>Pool decks &amp; patios</h3><p>Sealing knocks down mold in the damp zone around the pool and makes furniture scuffs and sunscreen stains rinse off instead of soaking in.</p></div>
        <div class="card"><h3>Walkways &amp; entries</h3><p>Joint-sand restoration keeps walk surfaces tight and level; sealing keeps weeds and ant mounds from re-opening the joints.</p></div>
      </div>
      <div class="checkgrid">
        <div>Deep clean, re-sand, and seal — one visit, one crew</div>
        <div>UV-stable sealer made for Florida sun and rain</div>
        <div>Locks in color and blocks oil, rust, and tire stains</div>
        <div>Stabilized joints resist weeds and washout</div>
        <div>Natural or wet-look finish options</div>
        <div>Driveways, patios, pool decks, and walkways quoted in 24 hours</div>
      </div>
    </div>
  </section>""",
        "cities_heading": "Paver cleaning & sealing across Pinellas County",
        "cities": [
            ("Paver sealing Dunedin", "Our home base — driveways to pool decks, quoted fast."),
            ("Paver sealing Clearwater", "Color restoration and sealing from Countryside to the beach."),
            ("Paver sealing Palm Harbor", "Driveway sealing for deed-restricted communities."),
            ("Paver sealing Safety Harbor", "Patios and entries protected against bayfront humidity."),
            ("Paver sealing Largo", "Clean, re-sand, and seal across Largo neighborhoods."),
            ("Paver sealing Seminole", "Pool decks and driveways sealed for Seminole homes."),
            ("Paver sealing St. Petersburg", "Residential and commercial hardscapes in St. Pete."),
            ("Paver sealing Tarpon Springs", "Coastal paver protection where salt and sun hit hardest."),
            ("Pinellas County", "Surrounding communities welcome — ask when you call."),
        ],
        "faq_heading": "Paver sealing questions, answered",
        "faqs": [
            ("How much does paver sealing cost in Pinellas County?", "It depends on square footage, paver condition, and how much cleaning and re-sanding the joints need. Send your address and surface type through the quote form and you'll have a clear number within 24 hours."),
            ("How often should pavers be resealed in Florida?", "Every 2–4 years for most surfaces, depending on sun exposure, traffic, and sealer type. If water no longer beads on the surface or the color looks flat, it's due. We'll tell you honestly if yours isn't due yet."),
            ("Can you fix pavers that are already faded and mossy?", "In most cases, yes. Deep cleaning removes the growth and grime, re-sanding restores the joints, and an enhancing sealer brings back color depth that looks close to new. Severely spalled or crumbling pavers we'll flag before any work."),
            ("Should I seal brand-new pavers?", "Usually yes, after any efflorescence (the white haze on new pavers) has weathered off — typically 30–90 days after installation. Sealing new pavers early locks in the color before Florida sun starts fading it."),
            ("What's the difference between natural and wet-look sealer?", "Natural finish protects without changing the appearance. Wet-look enhances the color depth, similar to how pavers look after rain. Both use UV-stable, Florida-grade sealers — the choice is aesthetic."),
            ("How long before I can drive on sealed pavers?", "Foot traffic is typically fine within 24 hours and vehicles within 48–72 hours, depending on the sealer and weather. We confirm cure times when we schedule your job."),
        ],
        "final_heading": "Protect the investment sitting in your driveway.",
        "final_sub": "Free paver cleaning & sealing quote in 24 hours. Family-owned, fully insured, based in Dunedin. Add a house or roof wash and save on the combined visit.",
    },
]

os.makedirs(OUT_DIR, exist_ok=True)
for svc in SERVICES:
    path = os.path.join(OUT_DIR, f"{svc['slug']}.html")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(render(svc))
    print(f"wrote {path} ({os.path.getsize(path)} bytes)")
