# Coach Ty × Lola — brand & site strategy

Decision on file (2026-08-23): **Option C — personal hero, Lola engine.** The
homepage leads with Ty as a person; the money machinery stays the focused Lola
funnel; fitness is a real but *secondary* path, not a co-equal business. This
doc is the audit the master brief asked for, written against the actual code —
not a rebuild order.

The one-line reason C beat the full personal-umbrella version (Option A):
**a fitness audience and a contractor-lead-gen audience share almost no
keywords.** One domain ranking hard for both is one domain ranking well for
neither. C gets the personal-brand benefit (trust, face, story) at the top of
the funnel without diluting the B2B topical authority the last month built.

---

## 1 · Current-state audit — what's actually deployed

`coachtyalexander.com` today is a **focused Lola Leads B2B funnel**, not a
personal-brand hub. Grounded inventory:

**Marketing routes (9, all prerendered, unique metadata + schema):**
`/` · `/pricing` · `/growth-score` · `/work` · `/methodology` · `/vs` ·
`/apply` · `/start` · `/case-studies` (+ `/case-studies/sandbar`)

**SEO assets that already exist and rank-target:**
- **7 `/vs/<competitor>` pages** — LocalIQ, BrightLocal, Scorpion, Podium, Yext,
  Hibu, Local Service Ads. High-commercial-intent, honest-comparison format.
  These are the strongest organic play on the site.
- **8 `/lp` trade pages** (pressure-washing, roofing, HVAC, plumber, pool,
  lawn-care, cleaning, electrician) — Tampa-canonical, with 40 city variants
  canonicalised into them. Do **not** re-fragment these.
- **`/case-studies/sandbar`** — the one real proof story, verifiable facts only.

**What's strong (do not touch):**
- Per-route metadata + schema pipeline (`pageMeta.ts` → prerenderer →
  `check-seo.mjs` guard). 17/17 unique titles/descriptions. This is better SEO
  hygiene than 95% of small-business sites.
- Design tokens (gold/ink scale, measured contrast) and the PawMark motif.
- The `/growth-score` lead magnet and the single `$397/month` offer.
- The founder section already seeds the personal brand — Coach Ty, the "hybrid
  athlete · trains HYROX" chip, Lola-the-dog, the Sandbar origin story.

**What's weak for Option C:**
- The homepage H1 is *"Local SEO for Contractors — Found on Google & AI."* It
  answers "what does this sell" before "who is Ty." Under C, the *hero* should
  answer "who is Ty," then branch. The Lola offer moves one screen down, not
  away.
- **Zero fitness content exists.** No `/train`, no HYROX/basketball page. The
  entire TRAIN pillar is greenfield — which is fine, but it means "audit the
  training page" has nothing to audit yet.
- No `/about` as a standalone entity page. Ty-the-person lives only inside the
  homepage founder block.

---

## 2 · SEO-equity map — what must be preserved

The brief's equity-protection section matters here because we *just* did this
work. Preserve, do not churn:

| asset | why | rule |
|---|---|---|
| `/vs/*` (7) | highest-intent commercial pages | never rename or redirect |
| `/lp/*-seo-tampa` (8 canonical) | 40 city variants point here | never re-split |
| `/pricing`, `/growth-score`, `/start`, `/apply` | the money path | keep URLs exactly |
| `/case-studies/sandbar` | only real proof | keep |
| canonical = `www.coachtyalexander.com` | just migrated, live | one env var (`VITE_SITE_ORIGIN`); don't hardcode |

**Any new personal-brand page is additive.** `/about`, `/train` — new URLs, no
redirects, no churn. The pivot to Option C should not generate a single 301.

---

## 3 · Brand audit — Ty vs Lola today

The site currently communicates **Lola** clearly and **Ty** faintly. A visitor
learns "this is a $397/mo done-for-you local-SEO service" in five seconds and
"Ty is a real coach/founder who does the work himself" only if they scroll to
the founder block. Option C inverts the *first impression* without inverting the
*conversion machinery*:

- **Ty = the umbrella and the trust.** Human, athletic, editorial, first-person.
- **Lola = the engine and the scale.** Technical, systematic, the thing he sells.
- **Train = a real second door**, not a co-headline.

The existing Ty↔Lola visual contrast (warm gold + human photo vs. the dashboard
"99 score" demo) is already the right instinct. C amplifies it, doesn't invent
it.

---

## 4 · Recommended information architecture (Option C)

```
coachtyalexander.com
│
├─ /                 HERO: "who is Ty" → two doors (Grow primary, Train secondary)
│                    then the existing Lola offer, proof, growth-score CTA
├─ /about            NEW — entity page, first-person, Ty + why Lola exists
│
├─ GROW (the engine — unchanged money path)
│   ├─ /growth-score   lead magnet (keep)
│   ├─ /pricing        the $397/mo offer (keep)
│   ├─ /work /vs /case-studies  proof + comparison (keep)
│   └─ /start /apply   buy + intake (keep)
│
├─ TRAIN (new, secondary — greenfield)
│   └─ /train          ONE page to start. Not a second site. Real credentials
│                      only. CTA = "Train with Ty" (whatever the real intake is)
│
└─ /lola-os         OPTIONAL later — a "what the system is" explainer, only if
                    Lola starts being sold as software vs. done-for-you service
```

Nav: `Grow · Train · Growth Score · About` + one primary CTA. Not a ten-item
menu. `/lola-os` stays off the nav until Lola is genuinely a product, not a
service — putting it up early confuses the buyer about what they're getting.

---

## 5 · The plan — DO NOW / NEXT / LATER

### DO NOW (highest ROI, lowest risk, no URL churn)
1. **Homepage hero re-order.** Lead with Ty (face + one-line identity + the two
   doors), then the existing Lola offer block drops one screen. Pure front-end;
   touches `Homepage.tsx` only; no route or schema change.
2. **`/about`** — one new page, first-person, `Person` schema already exists in
   `pageMeta.ts` to point at it. Entity signal for "who is Coach Ty Alexander."
3. **Keep every money URL and every `/vs` and `/lp` exactly as-is.**

### DO NEXT (after the hero proves out)
4. **`/train`** — one honest page. Real credentials, real training philosophy,
   one CTA. No invented testimonials, results, or client counts (same proof
   rule the rest of the site already follows).
5. Nav update to `Grow · Train · Growth Score · About`.
6. Internal links: homepage → About, homepage → Train, Grow cluster stays intact.

### LATER (only when the trigger is real)
7. **`/lola-os`** — only if/when Lola is sold as software rather than a service.
8. **`/media`** content hub — only when there's a real cadence of content to
   house. An empty journal hurts more than no journal.
9. Fitness topic cluster (HYROX / hybrid-athlete content) — only if TRAIN
   becomes a real revenue line worth its own SEO investment.

---

## 6 · Guardrails carried from the existing site

- **No fabricated proof.** No testimonials, results, certifications, client
  counts, or revenue that aren't real. The whole site already holds this line.
- **One price.** `$397/month`, sourced from `pricing.ts`. Don't let a personal-
  brand rewrite introduce a second number.
- **No new domains.** `coachtyalexander.com` is the single owned asset. (The
  brief is explicit; so is a month of migration work.)
- **`check-seo.mjs` still gates the build** — any new route needs a `pageMeta`
  entry or the build fails. That's the feature working as intended.

---

## Sequencing note — security first

The GoHighLevel incident is still open (see `docs/SECURITY.md`). A site
restructure and an active-incident cleanup shouldn't run in the same week;
they'll step on each other and split attention on the thing that actually
matters right now, which is the compromised sending pipe. Recommended order:
finish the GHL audit + DMARC enforcement, **then** start the DO-NOW hero work.
Nothing in this plan expires by waiting.
