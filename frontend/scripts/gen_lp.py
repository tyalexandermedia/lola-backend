#!/usr/bin/env python3
"""
gen_lp.py — Lola SEO landing-page generator.

Single source of truth for the [service]-seo-[city] landing pages.
Run from the repo root:

    python3 frontend/scripts/gen_lp.py

It (re)generates, idempotently:
  - frontend/public/lp/{service}-seo-{city}.html   (8 services x 6 cities = 48)
  - frontend/public/lp/industries.html             (the hub page)
  - frontend/public/sitemap.xml
  - frontend/vercel.json

Design notes
------------
* Dependency-free: Python stdlib only (json, html, os, pathlib).
* The <style> block is copied VERBATIM from the canonical page
  (local-seo-plumbers-tampa.html) so every page shares the dark-gold aesthetic.
* Copy is varied per SERVICE (H1, intent framing, "what we do" bullets, FAQ)
  and per CITY (neighborhoods, nearby cities) so pages are not thin duplicates.
* Pricing is the NEW 3-tier monthly model only: $297 / $697 / $997.
* Every primary CTA books a call at the Google Calendar link.
"""

import html
import json
from pathlib import Path

# --------------------------------------------------------------------------- #
# Constants / brand facts (single source of truth)
# --------------------------------------------------------------------------- #

BASE_URL = "https://lola.tyalexandermedia.com"
CALENDAR_URL = "https://calendar.app.google/J7idjUDitd2Hziuc7"
PHONE = "+1-727-300-6573"
EMAIL = "ty@tyalexandermedia.com"

# New monthly pricing tiers (the ONLY tiers — old $47/$397/$6,970 are dead).
TIERS = [
    {"name": "Starter", "price": "$297/mo", "featured": False,
     "blurb": "Core GBP + Map Pack optimization, citations cleaned, monthly reporting."},
    {"name": "Growth", "price": "$697/mo", "featured": True,
     "blurb": "Everything in Starter + content, review velocity, AI-search tracking. Most popular."},
    {"name": "Pro", "price": "$997/mo", "featured": False,
     "blurb": "Everything in Growth + multi-location / service-area pages and priority support."},
]
PRICE_RANGE = "$297-$997"
LOW_PRICE = "297"
HIGH_PRICE = "997"

# Repo-root-relative output locations. Resolved against the repo root, which we
# derive from this file's location so the script works from any cwd.
REPO_ROOT = Path(__file__).resolve().parents[2]
LP_DIR = REPO_ROOT / "frontend" / "public" / "lp"
SITEMAP_PATH = REPO_ROOT / "frontend" / "public" / "sitemap.xml"
VERCEL_PATH = REPO_ROOT / "frontend" / "vercel.json"

# Verbatim style block + head meta from the canonical page.
STYLE_BLOCK = """<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0A0A0B;color:#E8E4D8;line-height:1.55;font-size:16px;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{color:#D4AF37;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:24px 20px 96px}
.eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.28em;color:#D4AF37}
h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(2.25rem,6vw,3.75rem);line-height:1.05;letter-spacing:-0.01em;color:#F0EAD6;margin-top:16px}
h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(1.6rem,4vw,2.5rem);line-height:1.1;letter-spacing:-0.005em;color:#F0EAD6;margin-top:48px}
h3{font-family:'Inter Tight',sans-serif;font-size:18px;font-weight:700;color:#F0EAD6;margin-top:20px}
p{margin-top:14px;color:#C8C0B0}
strong{color:#F0EAD6;font-weight:600}
.sub{margin-top:18px;font-size:18px;color:#C8C0B0;max-width:640px}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 28px;margin-top:28px;background:linear-gradient(90deg,#D4AF37,#F4D47C,#D4AF37);background-size:200% 100%;background-position:left;color:#0A0A0B;font-weight:700;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),0 6px 20px rgba(212,175,55,0.32);transition:background-position 0.3s,box-shadow 0.3s}
.cta:hover{background-position:right;box-shadow:inset 0 1px 0 rgba(255,255,255,0.4),0 10px 32px rgba(212,175,55,0.55);text-decoration:none}
.cta-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 28px;margin-top:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(212,175,55,0.4);color:#D4AF37;font-weight:600;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;border-radius:12px}
.cta-secondary:hover{background:rgba(212,175,55,0.06);border-color:rgba(212,175,55,0.7);text-decoration:none}
.card{border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;margin-top:20px;background:rgba(255,255,255,0.02)}
.card-gold{border:1.5px solid rgba(212,175,55,0.5);background:linear-gradient(135deg,rgba(212,175,55,0.06),transparent)}
.row{display:grid;grid-template-columns:1fr;gap:16px;margin-top:20px}
@media(min-width:640px){.row-2{grid-template-columns:1fr 1fr}}
ul{margin-top:14px;padding-left:0;list-style:none}
ul li{position:relative;padding-left:24px;margin-top:10px;color:#C8C0B0}
ul li::before{content:"\\2192";position:absolute;left:0;color:#D4AF37;font-weight:700}
ul.no-arrow li::before{content:"\\2713";color:#D4AF37}
.pricing{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
.pricing th,.pricing td{padding:12px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06)}
.pricing th{background:rgba(212,175,55,0.06);color:#D4AF37;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;font-size:11px}
.pricing tr.featured td{background:rgba(212,175,55,0.04);color:#F0EAD6;font-weight:600}
details{border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 18px;margin-top:10px;background:rgba(255,255,255,0.02)}
details[open]{border-color:rgba(212,175,55,0.3);background:rgba(255,255,255,0.04)}
summary{cursor:pointer;font-weight:600;font-size:15px;color:#F0EAD6;list-style:none;display:flex;justify-content:space-between;gap:12px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:#D4AF37;font-size:18px;transition:transform 0.2s}
details[open] summary::after{content:"\\2212"}
details p{margin-top:14px;font-size:14px;color:#C8C0B0}
.footer-links{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;padding:24px 0;border-top:1px solid rgba(255,255,255,0.08)}
.footer-links a{font-size:13px;padding:6px 12px;border:1px solid rgba(212,175,55,0.2);border-radius:6px}
.footer{margin-top:48px;padding:20px 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:12px;color:#5A5F68}
.divider{height:1px;background:rgba(255,255,255,0.06);margin:32px 0}
.founding{padding:24px;border-radius:14px;border:1.5px solid rgba(212,175,55,0.55);background:linear-gradient(135deg,#1A1408,rgba(212,175,55,0.04));margin-top:24px}
.founding .eyebrow{color:#D4AF37}
.spots{display:inline-block;margin-top:14px;padding:8px 16px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.4);border-radius:999px;font-size:12px;font-weight:700;color:#D4AF37;letter-spacing:0.06em;text-transform:uppercase}
</style>"""

# --------------------------------------------------------------------------- #
# CITIES — slug -> display + local color (neighborhoods, nearby service areas)
# --------------------------------------------------------------------------- #

CITIES = {
    "tampa": {
        "name": "Tampa",
        "neighborhoods": "South Tampa, Carrollwood, Brandon, and Riverview",
        "nearby": "Brandon, Riverview, and Carrollwood",
    },
    "st-petersburg": {
        "name": "St. Petersburg",
        "neighborhoods": "Downtown St. Pete, Kenwood, the Gateway, and Pinellas Point",
        "nearby": "Gulfport, Pinellas Park, and Seminole",
    },
    "clearwater": {
        "name": "Clearwater",
        "neighborhoods": "Clearwater Beach, Countryside, and Safety Harbor",
        "nearby": "Dunedin, Largo, and Safety Harbor",
    },
    "palm-harbor": {
        "name": "Palm Harbor",
        "neighborhoods": "Ozona, Crystal Beach, and the Lansbrook area",
        "nearby": "Dunedin, Tarpon Springs, and East Lake",
    },
    "brandon": {
        "name": "Brandon",
        "neighborhoods": "Bloomingdale, Valrico, and Riverview",
        "nearby": "Valrico, Riverview, and Seffner",
    },
    "sarasota": {
        "name": "Sarasota",
        "neighborhoods": "Downtown Sarasota, Siesta Key, Lakewood Ranch, and Osprey",
        "nearby": "Bradenton, Venice, and Lakewood Ranch",
    },
}

# --------------------------------------------------------------------------- #
# SERVICES — slug -> all the data needed for unique copy
#
# Each service carries:
#   name          display name
#   noun          the operator ("plumbers", "HVAC contractors", ...)
#   trade_param   value for the /audit ?trade= param
#   intent        the high-intent moment that drives the H1
#   h1(city)      headline (function of city)
#   sub(city)     sub-headline
#   not_this      list of "don't do this" bullets
#   this          list of "do this instead" bullets (Lola promise)
#   do(city)      list of (label, detail) tuples — "what we do"
#   faqs(city)    list of (question, answer) tuples used for BOTH the visible
#                 <details> and the FAQPage JSON-LD (they MUST match)
# --------------------------------------------------------------------------- #


def _svc(name, noun, trade_param, eyebrow_word, h1, sub, not_this, this_, do, faqs):
    return {
        "name": name, "noun": noun, "trade_param": trade_param,
        "eyebrow_word": eyebrow_word, "h1": h1, "sub": sub,
        "not_this": not_this, "this": this_, "do": do, "faqs": faqs,
    }


SERVICES = {
    # ---------------------------------------------------------------- #
    "pressure-washing": _svc(
        "Pressure Washing", "pressure washing pros", "Pressure Washing", "Pressure Washing",
        h1=lambda c: f'{c["name"]} pressure washing: own the "{c["name"].lower()} house washing near me" search.',
        sub=lambda c: f'Homeowners in {c["name"]} search the second they see the green creeping up the driveway. Lola gets your soft-wash business ranking on Google + ChatGPT for those exact searches. Done for you. From $297/mo.',
        not_this=[
            'Buying shared leads you split with 3 other washers',
            'Boosting Facebook posts that never reach buyers ready to book',
            'A $1,800/mo agency that has never quoted a roof wash',
            'Pretty PDFs that never move your Map Pack ranking',
        ],
        this_=[
            'Map Pack rankings you keep for good',
            'From $297/mo, cancel anytime, no setup fee',
            'Soft-wash + house-wash keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Service-keyword optimization", f'"soft wash {c["name"]}," "roof cleaning {c["name"]}," "driveway pressure washing near me"'),
            ("Before/after photo strategy", "the single highest-converting GBP asset for washing — we build the cadence"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Yelp, Angi, Nextdoor, BBB so Google trusts your listing"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Google AI Overviews recommend you"),
            ("Review velocity", "text-after-job review requests with branded responses"),
            ("Buyer content", '"soft wash vs pressure wash," paver-sealing cost guides, HOA roof-stain pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "roof cleaning {c["name"]}"?',
             "Yes — soft-wash and roof-cleaning keywords are exactly the high-intent local terms we target across Map Pack, organic, and AI search."),
            ("How fast will I see new bookings?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most washers see new GBP calls within 6-8 weeks."),
            ("Do you understand soft wash vs pressure wash?",
             "Yes. Coach Ty's dad runs Sandbar Soft Wash in Palm Harbor — 15+ years, master certified. We know the difference and we optimize for both."),
            ("Is there a contract?",
             "No. It's month-to-month from $297/mo. Cancel anytime. The 30-day half-refund promise is on top of that."),
            ("Can you handle a seasonal schedule?",
             f"Yes — we build GBP post cadence around {c['name']}'s busy washing season and keep ranking signals warm in the off months."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "plumber": _svc(
        "Plumbing", "plumbers", "Plumber", "Plumbing",
        h1=lambda c: f'{c["name"]} plumbers: be the first result when someone searches "plumber near me" at 11pm.',
        sub=lambda c: f'Emergency plumbing searches in {c["name"]} happen on phones, mostly at night, mostly desperate. Lola gets your business ranking on Google + ChatGPT for those high-intent moments. Done for you. From $297/mo.',
        not_this=[
            '"Pay $50/lead" services that share your leads with 3 competitors',
            '$2,500/mo plumbing agencies with 12-month contracts',
            'Generic SEO that ignores emergency-intent keywords',
            '50-page audits that never move rankings',
        ],
        this_=[
            'Organic Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Emergency-keyword targeting baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Emergency-keyword optimization", f'"emergency plumber {c["name"]}," "water heater repair {c["name"]}," "drain cleaning near me"'),
            ('"Open 24 hours" wired correctly', "so a 2am burst-pipe search shows you as Open Now before competitors"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP inconsistencies across HomeAdvisor, Yelp, Angi, BBB"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Gemini recommend you for plumbing queries"),
            ("Review velocity", "text-after-service requests with branded responses"),
            ("Buyer content", '"DIY vs call a pro," tankless vs traditional, repair cost guides'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "emergency plumber {c["name"]}"?',
             "Yes — that's exactly the kind of high-intent local keyword we target. Map Pack + organic + AI search visibility."),
            ("How fast will I see new calls?",
             "30-day promise: measurable ranking improvement in the first month, or I refund half. Most clients see new GMB call volume within 6-8 weeks."),
            ("What if my GMB profile is a mess?",
             "That's part of week 1. We audit, fix categories, add proper services, photo cadence, and post strategy. Included from $297/mo."),
            ("Do you do Google LSA (Local Service Ads)?",
             "LSA is a separate paid channel. Lola handles organic + Map Pack. Many clients pause LSA after 60 days because organic catches up."),
            ("We have 10 service vans — will the system scale?",
             "Yes — the Pro tier adds service-area pages as you grow. Same playbook whether you're 1 truck or 20."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "hvac": _svc(
        "HVAC", "HVAC contractors", "HVAC", "HVAC",
        h1=lambda c: f'{c["name"]} HVAC: be the "AC not cooling near me" call before your competitor is.',
        sub=lambda c: f'When the AC dies in a {c["name"]} summer, people grab a phone and search — fast. Lola gets your HVAC business ranking on Google + ChatGPT for those emergency moments. Done for you. From $297/mo.',
        not_this=[
            'Lead resellers who sell the same homeowner to 4 HVAC shops',
            '$3,000/mo agencies locking you into a year',
            'Generic SEO that ignores "AC repair near me" intent',
            'Reports that look great and rank nothing',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Emergency AC-repair keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Emergency-keyword optimization", f'"AC repair {c["name"]}," "emergency HVAC {c["name"]}," "AC not cooling near me"'),
            ("Seasonal GBP cadence", "summer = emergency repair posts; shoulder season = maintenance + replace-vs-repair"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Angi, Yelp, BBB, and manufacturer locators"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Google AI Overviews recommend you"),
            ("Review velocity", "post-install and post-repair review requests with branded responses"),
            ("Buyer content", '"repair vs replace," SEER guides, financing pages, indoor-air-quality content'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "AC repair {c["name"]}"?',
             "Yes — emergency AC keywords are the core of what we target across Map Pack, organic, and AI search."),
            ("How fast will I see new calls?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most HVAC shops see new call volume within 6-8 weeks."),
            ("Can you handle our seasonal swings?",
             f"Yes — we tune {c['name']} GBP cadence to the season so you're visible for emergency repair in peak summer and maintenance in the shoulder months."),
            ("Do you optimize for replace-vs-repair searches?",
             "Yes. Those buyers are high-ticket and high-intent. We build content and GBP services to capture them."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "roofing": _svc(
        "Roofing", "roofers", "Roofing", "Roofing",
        h1=lambda c: f'{c["name"]} roofers: own the search the morning after the storm.',
        sub=lambda c: f'After a {c["name"]} storm, homeowners search "roof repair near me" and call whoever shows up first on Google. Lola gets you ranking on Google + ChatGPT before the storm-chasers do. Done for you. From $297/mo.',
        not_this=[
            'Out-of-state storm-chasers buying your local keywords',
            '$4,000/mo agencies on 12-month contracts',
            'Generic SEO that ignores insurance + storm intent',
            'Audits that never touch your Map Pack',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Storm + insurance-claim keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Storm-intent optimization", f'"roof repair {c["name"]}," "storm damage roof {c["name"]}," "roof leak near me"'),
            ("Hurricane-season GBP strategy", "pre-positioned posts so you're ranking the moment a storm hits, not days after"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Angi, Yelp, BBB, and GAF/Owens Corning locators"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Gemini recommend you"),
            ("Review velocity", "post-job review requests with branded responses to out-rank storm-chasers"),
            ("Buyer content", '"insurance claim roof," "metal vs shingle," storm-damage inspection pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "roof repair {c["name"]}"?',
             "Yes — storm and repair keywords are exactly what we target across Map Pack, organic, and AI search."),
            ("How do you beat out-of-state storm-chasers?",
             "Local trust signals: a clean GBP, real review velocity, and pre-positioned storm content so you rank before they roll into town."),
            ("How fast will I see new leads?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most roofers see new call volume within 6-8 weeks."),
            ("Do you build insurance-claim content?",
             "Yes — insurance-claim and storm-inspection pages are high-intent and we make them part of the playbook."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "pool-service": _svc(
        "Pool Service", "pool service pros", "Pool Service", "Pool Service",
        h1=lambda c: f'{c["name"]} pool service: lock in recurring weekly accounts from "pool cleaning near me."',
        sub=lambda c: f'In {c["name"]}, a pool that turns green sends the owner straight to Google. Lola gets your pool business ranking on Google + ChatGPT so you win the recurring weekly contract, not just the one-off. Done for you. From $297/mo.',
        not_this=[
            'Shared-lead apps that pit you against every other route',
            '$2,000/mo agencies that never sold a weekly service plan',
            'Generic SEO that ignores recurring-contract intent',
            'Reports that look nice and book nothing',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Weekly-service + green-pool keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Service-keyword optimization", f'"pool service {c["name"]}," "green pool cleanup {c["name"]}," "weekly pool cleaning near me"'),
            ("Recurring-contract framing", "GBP services and content built to sell the weekly plan, not the one-time clean"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Yelp, Angi, Nextdoor, BBB"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Google AI Overviews recommend you"),
            ("Review velocity", "review requests after the first clean to build trust fast"),
            ("Buyer content", '"green pool recovery," equipment-repair guides, salt vs chlorine pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "pool service {c["name"]}"?',
             "Yes — weekly-service and green-pool keywords are exactly what we target across Map Pack, organic, and AI search."),
            ("Can you help me sell recurring contracts, not one-offs?",
             "Yes — that's the whole point. We frame your GBP and content around the weekly plan so you win the lifetime value, not just the single job."),
            ("How fast will I see new accounts?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most pool pros see new call volume within 6-8 weeks."),
            ("Do you handle seasonal demand?",
             f"Yes — we keep {c['name']} ranking signals warm year-round so you're first in line when pool season ramps."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "lawn-care": _svc(
        "Lawn Care", "lawn care pros", "Lawn Care", "Lawn Care",
        h1=lambda c: f'{c["name"]} lawn care: win the route, not just the one-time mow.',
        sub=lambda c: f'In {c["name"]}, "lawn care near me" searches turn into recurring weekly routes — if you show up first. Lola gets your lawn business ranking on Google + ChatGPT for that local demand. Done for you. From $297/mo.',
        not_this=[
            'Lead apps that auction you against every mower in town',
            '$1,500/mo agencies that never built a route business',
            'Generic SEO that ignores recurring-service intent',
            'Pretty reports that grow nothing',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Weekly-service + lawn-treatment keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Service-keyword optimization", f'"lawn care {c["name"]}," "lawn mowing service {c["name"]}," "lawn fertilization near me"'),
            ("Route-building framing", "GBP services and content built to sell the weekly route, not the single cut"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Yelp, Angi, Nextdoor, BBB"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Gemini recommend you"),
            ("Review velocity", "review requests after the first service with branded responses"),
            ("Buyer content", '"lawn treatment schedule Florida," sod + weed-control guides, irrigation pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "lawn care {c["name"]}"?',
             "Yes — lawn-care and lawn-treatment keywords are exactly what we target across Map Pack, organic, and AI search."),
            ("Can you help me build recurring routes?",
             "Yes — we frame your GBP and content around the weekly route so you win lifetime value, not just one mow."),
            ("How fast will I see new accounts?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most lawn pros see new call volume within 6-8 weeks."),
            ("Do you optimize for fertilization and treatment too?",
             "Yes — treatment and fertilization searches are higher-margin and high-intent. We target them alongside mowing."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "electrician": _svc(
        "Electrical", "electricians", "Electrician", "Electrical",
        h1=lambda c: f'{c["name"]} electricians: be the "electrician near me" call when the power\'s out.',
        sub=lambda c: f'When a panel trips or the power\'s out in {c["name"]}, people search and call the first trusted result. Lola gets your electrical business ranking on Google + ChatGPT for those urgent moments. Done for you. From $297/mo.',
        not_this=[
            'Lead resellers selling the same homeowner to 4 shops',
            '$2,500/mo agencies on 12-month contracts',
            'Generic SEO that ignores emergency + permit intent',
            'Audits that never move your Map Pack',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Emergency + panel-upgrade keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Emergency-keyword optimization", f'"emergency electrician {c["name"]}," "panel upgrade {c["name"]}," "electrician near me"'),
            ('"Open 24 hours" wired correctly', "so an after-hours power-outage search shows you as Open Now first"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Angi, Yelp, BBB, and licensing directories"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Google AI Overviews recommend you"),
            ("Review velocity", "post-job review requests with branded responses"),
            ("Buyer content", '"panel upgrade cost," EV-charger install, generator + whole-home surge pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "electrician {c["name"]}"?',
             "Yes — emergency and panel-upgrade keywords are exactly what we target across Map Pack, organic, and AI search."),
            ("How fast will I see new calls?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most electricians see new call volume within 6-8 weeks."),
            ("Do you optimize for high-ticket jobs like panel upgrades and EV chargers?",
             "Yes — those buyers are high-intent and we build content and GBP services to capture them."),
            ("What if my licensing info is inconsistent online?",
             "That's part of week 1. We fix NAP and licensing citations so Google trusts your listing."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
    # ---------------------------------------------------------------- #
    "cleaning": _svc(
        "Cleaning Services", "cleaning companies", "Cleaning", "Cleaning",
        h1=lambda c: f'{c["name"]} cleaning services: win recurring clients from "house cleaning near me."',
        sub=lambda c: f'In {c["name"]}, "house cleaning near me" and "move-out cleaning" searches turn into recurring clients — if you rank. Lola gets your cleaning business ranking on Google + ChatGPT for that local demand. Done for you. From $297/mo.',
        not_this=[
            'Lead apps that auction you against every cleaner in town',
            '$1,800/mo agencies that never sold a recurring plan',
            'Generic SEO that ignores recurring + move-out intent',
            'Reports that look clean and book nothing',
        ],
        this_=[
            'Map Pack rankings you own forever',
            'From $297/mo, cancel anytime, no setup fee',
            'Recurring + deep-clean keywords baked in',
            '30-day move-the-ranking promise (half back if not)',
        ],
        do=lambda c: [
            ("Service-keyword optimization", f'"house cleaning {c["name"]}," "move-out cleaning {c["name"]}," "maid service near me"'),
            ("Recurring-client framing", "GBP services and content built to sell weekly/biweekly plans, not one-offs"),
            ("Map Pack tuning", f'service-area targeting for {c["neighborhoods"]}'),
            ("Citation cleanup", "fix NAP across Yelp, Angi, Nextdoor, Thumbtack, BBB"),
            ("AI Search Visibility", "track when ChatGPT, Perplexity, and Gemini recommend you"),
            ("Review velocity", "post-clean review requests with branded responses"),
            ("Buyer content", '"deep clean vs standard clean," move-out checklists, recurring-plan pages'),
        ],
        faqs=lambda c: [
            (f'Will this help me rank for "house cleaning {c["name"]}"?',
             "Yes — recurring and deep-clean keywords are exactly what we target across Map Pack, organic, and AI search."),
            ("Can you help me sell recurring plans, not one-time cleans?",
             "Yes — we frame your GBP and content around weekly/biweekly plans so you win lifetime value."),
            ("How fast will I see new clients?",
             "30-day promise: measurable ranking movement in the first month, or I refund half. Most cleaning companies see new call volume within 6-8 weeks."),
            ("Do you target commercial cleaning too?",
             "Yes — we can add commercial and office-cleaning keywords and pages on the Pro tier as you grow."),
            ("Is there a contract?",
             "No — month-to-month from $297/mo, cancel anytime, plus the 30-day half-refund promise."),
        ],
    ),
}

# Old slugs -> new slugs, for 301 redirects (preserve link equity).
OLD_TO_NEW = [
    ("/lp/local-seo-pressure-washing-florida", "/lp/pressure-washing-seo-tampa"),
    ("/lp/local-seo-hvac-contractors-tampa", "/lp/hvac-seo-tampa"),
    ("/lp/local-seo-roofers-florida", "/lp/roofing-seo-tampa"),
    ("/lp/local-seo-plumbers-tampa", "/lp/plumber-seo-tampa"),
    ("/lp/local-seo-pool-service-florida", "/lp/pool-service-seo-tampa"),
]

# Stale hand-written files to delete after generation.
STALE_FILES = [
    "local-seo-pressure-washing-florida.html",
    "local-seo-hvac-contractors-tampa.html",
    "local-seo-roofers-florida.html",
    "local-seo-plumbers-tampa.html",
    "local-seo-pool-service-florida.html",
]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def esc(s):
    """HTML-escape for text content / attribute values."""
    return html.escape(str(s), quote=True)


def cta_href(slug):
    """Primary CTA — books a call on the Google Calendar link, new tab."""
    return f"{CALENDAR_URL}?utm_source=lp&utm_medium=cta&utm_campaign={slug}"


def jsonld(obj):
    """Render a compact, valid JSON-LD <script> block."""
    return ('<script type="application/ld+json">\n'
            + json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
            + "\n</script>")


# --------------------------------------------------------------------------- #
# Page rendering
# --------------------------------------------------------------------------- #

def render_page(svc_slug, svc, city_slug, city):
    slug = f"{svc_slug}-seo-{city_slug}"
    url = f"{BASE_URL}/lp/{slug}"
    cname = city["name"]
    title = f'{svc["name"]} SEO {cname} | Rank on Google + AI | Lola'
    desc = (f'Done-for-you local SEO for {cname} {svc["noun"]}. Rank on Google + '
            f'ChatGPT for high-intent searches. 3 monthly plans from $297/mo. '
            f'Book a free strategy call with Coach Ty.')

    faqs = svc["faqs"](city)
    do_items = svc["do"](city)

    # ---- JSON-LD: ProfessionalService ----
    professional_service = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": f"{url}#business",
        "name": "Lola SEO by Ty Alexander Media",
        "image": f"{BASE_URL}/coach-ty.jpg",
        "url": url,
        "telephone": PHONE,
        "email": EMAIL,
        "priceRange": PRICE_RANGE,
        "serviceType": f"Local SEO for {svc['name']} businesses",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Tampa Bay",
            "addressRegion": "FL",
            "addressCountry": "US",
        },
        "geo": {"@type": "GeoCoordinates", "latitude": "27.9506", "longitude": "-82.4572"},
        "areaServed": [
            {"@type": "City", "name": cname},
            {"@type": "State", "name": "Florida"},
        ],
        "offers": {
            "@type": "AggregateOffer",
            "lowPrice": LOW_PRICE,
            "highPrice": HIGH_PRICE,
            "priceCurrency": "USD",
            "offerCount": "3",
        },
        "sameAs": ["https://www.instagram.com/tyalexandermedia"],
    }

    # ---- JSON-LD: FAQPage (must match the visible <details>) ----
    faq_page = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in faqs
        ],
    }

    # ---- JSON-LD: Person (Coach Ty) ----
    person = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": "https://tyalexandermedia.com#person",
        "name": "Coach Ty",
        "givenName": "Ty",
        "jobTitle": "Founder, Local SEO Strategist",
        "image": f"{BASE_URL}/coach-ty.jpg",
        "url": "https://tyalexandermedia.com",
        "email": EMAIL,
        "telephone": PHONE,
        "address": {"@type": "PostalAddress", "addressLocality": "Tampa Bay",
                    "addressRegion": "FL", "addressCountry": "US"},
        "sameAs": ["https://www.instagram.com/tyalexandermedia"],
        "worksFor": {"@id": f"{url}#business"},
        "knowsAbout": [
            "Local SEO", "Google Business Profile optimization",
            "Local service business marketing", "AI Search Visibility",
            "Home service contractor marketing",
        ],
    }

    # ---- JSON-LD: BreadcrumbList ----
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Industries",
             "item": f"{BASE_URL}/lp/industries"},
            {"@type": "ListItem", "position": 3, "name": f"{svc['name']} — {cname}", "item": url},
        ],
    }

    # ---- HTML fragments ----
    not_this_li = "".join(f"<li>{esc(x)}</li>" for x in svc["not_this"])
    this_li = "".join(f"<li>{esc(x)}</li>" for x in svc["this"])
    do_li = "".join(
        f"<li><strong>{esc(label)}</strong> — {esc(detail)}</li>"
        for label, detail in do_items
    )
    pricing_rows = ""
    for t in TIERS:
        cls = ' class="featured"' if t["featured"] else ""
        label = t["name"] + (" · Most Popular" if t["featured"] else "")
        pricing_rows += (f'<tr{cls}><td>{esc(label)}</td>'
                         f'<td>{esc(t["price"])} · cancel anytime</td></tr>')

    faq_details = "".join(
        f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>"
        for q, a in faqs
    )

    primary_cta = cta_href(slug)

    # Footer cross-links: this city's other top services + the hub.
    cross = [
        ("plumber", "Plumbing"), ("hvac", "HVAC"), ("roofing", "Roofing"),
        ("pressure-washing", "Pressure Washing"),
    ]
    footer_links = ""
    for s_slug, s_name in cross:
        if s_slug == svc_slug:
            continue
        footer_links += (f'<a href="/lp/{s_slug}-seo-{city_slug}">'
                         f'{esc(s_name)} {esc(cname)}</a>')
    footer_links += '<a href="/lp/industries">All industries &amp; cities</a>'

    head = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE_URL}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A0A0B">
<meta name="google-site-verification" content="T9uR-1_o17WTlgJz1zN-KPcvCn1qjrN_QmUZ11M8QNU">
<meta name="msvalidate.01" content="CD8E25FF91F5386338431014B7D68066">
<link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter+Tight:wght@400;500;600;700;800&display=swap" rel="stylesheet">
{jsonld(professional_service)}
{jsonld(faq_page)}
{jsonld(person)}
{jsonld(breadcrumb)}
{STYLE_BLOCK}
</head>"""

    body = f"""<body>
<main class="wrap">
<p class="eyebrow">Local SEO · {esc(svc["eyebrow_word"])} · {esc(cname)}, FL</p>
<h1>{esc(svc["h1"](city))}</h1>
<p class="sub">{esc(svc["sub"](city))}</p>
<a class="cta" href="{esc(primary_cta)}" target="_blank" rel="noopener">Book a free strategy call &rarr;</a>
<a class="cta-secondary" href="https://lola.tyalexandermedia.com/audit?utm_source=lp&utm_medium=cta&utm_campaign={slug}&trade={esc(svc['trade_param'])}">Or run a free 20-second audit first &rarr;</a>

<h2>Not this. This.</h2>
<div class="row row-2">
<div class="card">
<h3>&#10060; Not this</h3>
<ul class="no-arrow">{not_this_li}</ul>
</div>
<div class="card card-gold">
<h3>&#9989; This</h3>
<ul>{this_li}</ul>
</div>
</div>

<h2>What we do for {esc(cname)} {esc(svc["noun"])}</h2>
<ul>
{do_li}
</ul>

<div class="founding">
<p class="eyebrow">&#129446; The 30-day promise</p>
<h3 style="margin-top:8px">If Lola doesn't move your ranking in 30 days, I refund half.</h3>
<p>That's the deal. Real proof you can verify: <strong>Sandbar Soft Wash</strong> — Coach Ty's father's Palm Harbor pressure-washing business, 15+ years, master certified. We rank local service businesses on Google <em>and</em> ChatGPT, Perplexity, Gemini, and Google AI Overviews — that's where your next customer is already searching. Your {esc(cname)} {esc(svc["name"])} case study is being written right now. Want to be it?</p>
<span class="spots">30-day move-the-ranking promise · half back if not</span>
</div>

<h2>Pricing</h2>
<table class="pricing">
<thead><tr><th>Plan</th><th>Price</th></tr></thead>
<tbody>
{pricing_rows}
</tbody>
</table>
<a class="cta" href="{esc(primary_cta)}" target="_blank" rel="noopener">Book a free strategy call &rarr;</a>

<div class="divider"></div>

<h2>Built by Coach Ty in Tampa Bay</h2>
<p>I'm Coach Ty. I answer my own phone. &#128241; I built Lola because my dad's pressure-washing business (Sandbar Soft Wash, Palm Harbor) kept losing jobs to bigger competitors who weren't doing better work — just better Google. Lola fixes that for local service businesses across {esc(cname)} and {esc(city["nearby"])}. You answer the phone. I plus a team of AI agents handle the ranking — on Google and on AI search.</p>

<h2>FAQ</h2>
{faq_details}

<a class="cta" href="{esc(primary_cta)}" target="_blank" rel="noopener" style="margin-top:40px">Book a free strategy call &rarr;</a>
<a class="cta-secondary" href="https://lola.tyalexandermedia.com/audit?utm_source=lp&utm_medium=cta&utm_campaign={slug}&trade={esc(svc['trade_param'])}">Or run a free 20-second audit first &rarr;</a>

<div class="footer-links">
{footer_links}
</div>

<div class="footer">
<p>Lola SEO by Ty Alexander Media · Tampa Bay</p>
<p>&copy; 2026 · Built with Lola &#128062;</p>
</div>
</main>
</body>
</html>"""

    return slug, head + "\n" + body + "\n"


# --------------------------------------------------------------------------- #
# Hub page (industries.html)
# --------------------------------------------------------------------------- #

def render_hub():
    url = f"{BASE_URL}/lp/industries"
    title = "Local SEO by Industry & City — Tampa Bay & Florida | Lola"
    desc = ("Done-for-you local SEO for service businesses across Tampa Bay & "
            "Florida. Pick your trade and city. Rank on Google + ChatGPT. "
            "Plans from $297/mo. Book a free strategy call with Coach Ty.")

    # ItemList of every generated page for the CollectionPage schema.
    item_list = []
    pos = 1
    for svc_slug, svc in SERVICES.items():
        for city_slug, city in CITIES.items():
            slug = f"{svc_slug}-seo-{city_slug}"
            item_list.append({
                "@type": "ListItem", "position": pos,
                "url": f"{BASE_URL}/lp/{slug}",
                "name": f'{svc["name"]} — {city["name"]}',
            })
            pos += 1

    collection = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Local SEO by Industry & City",
        "url": url,
        "mainEntity": {"@type": "ItemList", "itemListElement": item_list},
    }
    professional_service = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": f"{url}#business",
        "name": "Lola SEO by Ty Alexander Media",
        "image": f"{BASE_URL}/coach-ty.jpg",
        "url": url,
        "telephone": PHONE,
        "email": EMAIL,
        "priceRange": PRICE_RANGE,
        "address": {"@type": "PostalAddress", "addressLocality": "Tampa Bay",
                    "addressRegion": "FL", "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": "27.9506", "longitude": "-82.4572"},
        "areaServed": [{"@type": "State", "name": "Florida"}]
        + [{"@type": "City", "name": c["name"]} for c in CITIES.values()],
        "offers": {"@type": "AggregateOffer", "lowPrice": LOW_PRICE,
                   "highPrice": HIGH_PRICE, "priceCurrency": "USD", "offerCount": "3"},
        "sameAs": ["https://www.instagram.com/tyalexandermedia"],
    }
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Industries", "item": url},
        ],
    }

    # Build the grouped link sections (one block per service, listing cities).
    sections = ""
    for svc_slug, svc in SERVICES.items():
        tiles = ""
        for city_slug, city in CITIES.items():
            slug = f"{svc_slug}-seo-{city_slug}"
            tiles += (f'<a class="tile" href="/lp/{slug}">'
                      f'<h3>{esc(svc["name"])} — {esc(city["name"])}</h3>'
                      f'<p>Rank for high-intent "{esc(svc["noun"])} near me" searches '
                      f'in {esc(city["name"])} on Google + AI search.</p>'
                      f'<span class="arrow">See the playbook &rarr;</span></a>')
        sections += (f'<h2>{esc(svc["name"])}</h2>'
                     f'<div class="grid">{tiles}</div>')

    hub_style = """<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0A0A0B;color:#E8E4D8;line-height:1.55;font-size:16px;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{color:#D4AF37;text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:24px 20px 96px}
.eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.28em;color:#D4AF37}
h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,6vw,4rem);line-height:1.05;letter-spacing:-0.01em;color:#F0EAD6;margin-top:16px}
h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(1.6rem,4vw,2.5rem);line-height:1.1;color:#F0EAD6;margin-top:48px}
.sub{margin-top:18px;font-size:18px;color:#C8C0B0;max-width:680px}
.grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:24px}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr 1fr}}
.tile{display:block;padding:20px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.02);transition:border-color 0.2s,transform 0.2s}
.tile:hover{border-color:rgba(212,175,55,0.5);transform:translateY(-2px);text-decoration:none}
.tile h3{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#F0EAD6;margin-top:0;letter-spacing:-0.005em}
.tile p{margin-top:8px;font-size:13px;color:#C8C0B0;line-height:1.6}
.tile .arrow{margin-top:12px;font-size:13px;font-weight:600;color:#D4AF37;display:block}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 28px;margin-top:28px;background:linear-gradient(90deg,#D4AF37,#F4D47C,#D4AF37);background-size:200% 100%;background-position:left;color:#0A0A0B;font-weight:700;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),0 6px 20px rgba(212,175,55,0.32);transition:background-position 0.3s,box-shadow 0.3s}
.cta:hover{background-position:right;text-decoration:none}
.pricing{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
.pricing th,.pricing td{padding:12px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06)}
.pricing th{background:rgba(212,175,55,0.06);color:#D4AF37;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;font-size:11px}
.pricing tr.featured td{background:rgba(212,175,55,0.04);color:#F0EAD6;font-weight:600}
.foot{margin-top:64px;padding:20px 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:12px;color:#5A5F68}
.coachty{margin-top:40px;padding:24px;border-radius:14px;border:1px solid rgba(212,175,55,0.25);background:linear-gradient(135deg,#1A1408,rgba(212,175,55,0.04))}
.coachty p{margin-top:12px;font-size:14px;color:#C8C0B0;line-height:1.65}
</style>"""

    pricing_rows = ""
    for t in TIERS:
        cls = ' class="featured"' if t["featured"] else ""
        label = t["name"] + (" · Most Popular" if t["featured"] else "")
        pricing_rows += (f'<tr{cls}><td>{esc(label)}</td>'
                         f'<td>{esc(t["price"])}</td><td>{esc(t["blurb"])}</td></tr>')

    cta = cta_href("industries-hub")

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE_URL}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A0A0B">
<meta name="google-site-verification" content="T9uR-1_o17WTlgJz1zN-KPcvCn1qjrN_QmUZ11M8QNU">
<meta name="msvalidate.01" content="CD8E25FF91F5386338431014B7D68066">
<link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter+Tight:wght@400;500;600;700;800&display=swap" rel="stylesheet">
{jsonld(collection)}
{jsonld(professional_service)}
{jsonld(breadcrumb)}
{hub_style}
</head>
<body>
<main class="wrap">
<p class="eyebrow">Industries &amp; Cities · Lola SEO</p>
<h1>Local SEO by industry &amp; city. Tampa Bay &amp; Florida.</h1>
<p class="sub">Done-for-you local SEO for service businesses across Tampa Bay and Florida. Pick your trade and your city. Each page shows exactly what Lola does to get you ranking on Google <em>and</em> AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews). Plans from $297/mo.</p>
<a class="cta" href="{esc(cta)}" target="_blank" rel="noopener">Book a free strategy call &rarr;</a>

{sections}

<h2>Pricing</h2>
<table class="pricing">
<thead><tr><th>Plan</th><th>Price</th><th>What you get</th></tr></thead>
<tbody>
{pricing_rows}
</tbody>
</table>
<a class="cta" href="{esc(cta)}" target="_blank" rel="noopener">Book a free strategy call &rarr;</a>

<div class="coachty">
<p class="eyebrow">Why Lola</p>
<p>I'm Coach Ty. I answer my own phone. &#128241; I built Lola because my dad's pressure-washing business (Sandbar Soft Wash, Palm Harbor — 15+ years, master certified) kept losing jobs to bigger competitors with worse work but better Google. Lola fixes that for local service businesses. If Lola doesn't move your ranking in 30 days, I refund half. Built with faith, run with hustle, and yes — there's a dog named Lola. &#128062;</p>
</div>

<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;padding:24px 0;border-top:1px solid rgba(255,255,255,0.08)">
<a style="font-size:13px;padding:6px 12px;border:1px solid rgba(212,175,55,0.2);border-radius:6px" href="{esc(cta)}" target="_blank" rel="noopener">Book a strategy call</a>
<a style="font-size:13px;padding:6px 12px;border:1px solid rgba(212,175,55,0.2);border-radius:6px" href="https://lola.tyalexandermedia.com/audit">Run a free audit</a>
<a style="font-size:13px;padding:6px 12px;border:1px solid rgba(212,175,55,0.2);border-radius:6px" href="https://lola.tyalexandermedia.com/pricing">See pricing</a>
</div>

<div class="foot">
<p>Lola SEO by Ty Alexander Media · Tampa Bay</p>
<p>&copy; 2026 · Built with Lola &#128062;</p>
</div>
</main>
</body>
</html>
"""
    return page


# --------------------------------------------------------------------------- #
# sitemap.xml + vercel.json
# --------------------------------------------------------------------------- #

def render_sitemap(slugs):
    core = [
        ("/", "weekly", "1.0"),
        ("/grader", "weekly", "0.95"),    # primary lead magnet
        ("/audit", "monthly", "0.9"),
        ("/pricing", "monthly", "0.9"),
        ("/retainer", "monthly", "0.9"),
        ("/apply", "monthly", "0.7"),
        ("/lp/industries", "monthly", "0.8"),
        ("/methodology", "monthly", "0.8"),
        ("/case-studies", "monthly", "0.82"),
        ("/case-studies/sandbar", "monthly", "0.85"),
        # High-intent comparison pages — keep in sync with COMPETITORS
        # in frontend/src/VsPage.tsx.
        ("/vs", "monthly", "0.88"),
        ("/vs/localiq", "monthly", "0.85"),
        ("/vs/brightlocal", "monthly", "0.85"),
        ("/vs/scorpion", "monthly", "0.85"),
        ("/vs/podium", "monthly", "0.85"),
        ("/vs/yext", "monthly", "0.85"),
        ("/vs/hibu", "monthly", "0.85"),
    ]
    rows = ""
    for path, freq, pri in core:
        rows += (f"  <url>\n    <loc>{BASE_URL}{path}</loc>\n"
                 f"    <changefreq>{freq}</changefreq>\n"
                 f"    <priority>{pri}</priority>\n  </url>\n")
    for slug in slugs:
        rows += (f"  <url>\n    <loc>{BASE_URL}/lp/{slug}</loc>\n"
                 f"    <changefreq>monthly</changefreq>\n"
                 f"    <priority>0.9</priority>\n  </url>\n")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + rows + "</urlset>\n")


def render_vercel(slugs):
    rewrites = []
    # 1. Clean-URL rewrite for each generated LP slug.
    for slug in slugs:
        rewrites.append({"source": f"/lp/{slug}", "destination": f"/lp/{slug}.html"})
    # 2. Hub + kept HTML pages.
    rewrites.append({"source": "/lp/industries", "destination": "/lp/industries.html"})
    rewrites.append({"source": "/lp/feedback", "destination": "/lp/feedback.html"})
    rewrites.append({"source": "/lp/reviews-admin", "destination": "/lp/reviews-admin.html"})
    rewrites.append({"source": "/lp/clients-admin", "destination": "/lp/clients-admin.html"})
    rewrites.append({"source": "/lp/outreach-admin", "destination": "/lp/outreach-admin.html"})
    # 3. Reviews proxy — exactly as-is.
    rewrites.append({"source": "/reviews/(.*)",
                     "destination": "https://lola-backend-production.up.railway.app/reviews/$1"})
    # 4. Catch-all LAST.
    rewrites.append({"source": "/(.*)", "destination": "/index.html"})

    redirects = [
        {"source": old, "destination": new, "permanent": True}
        for old, new in OLD_TO_NEW
    ]

    obj = {"redirects": redirects, "rewrites": rewrites}
    return json.dumps(obj, indent=2) + "\n"


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    LP_DIR.mkdir(parents=True, exist_ok=True)

    slugs = []
    # Stable, predictable order: services outer, cities inner.
    for svc_slug, svc in SERVICES.items():
        for city_slug, city in CITIES.items():
            slug, html_doc = render_page(svc_slug, svc, city_slug, city)
            (LP_DIR / f"{slug}.html").write_text(html_doc, encoding="utf-8")
            slugs.append(slug)

    # Hub page.
    (LP_DIR / "industries.html").write_text(render_hub(), encoding="utf-8")

    # Sitemap + Vercel config.
    SITEMAP_PATH.write_text(render_sitemap(slugs), encoding="utf-8")
    VERCEL_PATH.write_text(render_vercel(slugs), encoding="utf-8")

    # Clean up stale hand-written pages (idempotent).
    removed = []
    for fname in STALE_FILES:
        p = LP_DIR / fname
        if p.exists():
            p.unlink()
            removed.append(fname)

    print(f"Generated {len(slugs)} landing pages -> {LP_DIR}")
    print(f"Generated industries.html, sitemap.xml, vercel.json")
    if removed:
        print(f"Removed {len(removed)} stale files: {', '.join(removed)}")
    else:
        print("No stale files to remove.")


if __name__ == "__main__":
    main()
