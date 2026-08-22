# Launch runbook

Everything here is account configuration — DNS, Stripe, Railway, GHL. It needs
your credentials, which is why it couldn't be done for you.

The one piece that WAS code is done: `outreach/build_leads.py` builds the lead
list §3 needs, so the revenue step is no longer blocked on a spreadsheet.

Run this first; it reads the same variables the code reads, so it can't drift
the way a checklist does:

```
python3 scripts/preflight.py
```

Exit 0 = nothing critical outstanding. Exit 1 = a buyer or a domain is at risk.

---

## 0 · Domain migration — do this FIRST

`lola.tyalexandermedia.com` → **`www.coachtyalexander.com`**

The code side is done. Every canonical, `og:url`, schema `@id`, the sitemap,
robots.txt and all 48 `/lp` pages now say `www.coachtyalexander.com`. **Until
the DNS and redirects are in place, the site is telling Google to index a
hostname that doesn't answer** — so this goes before everything else.

### Why now is the right time

- The site has essentially **no rankings yet**, so the cost of moving is close
  to zero. This is the cheapest this migration will ever be.
- `tyalexandermedia.com` carries the **August authenticated phishing incident**.
  `coachtyalexander.com` is clean. Moving is a reputation *upgrade*, not just a
  rename.
- Doing it **before** the outreach ramp means every cold-email link points at
  the final domain instead of collecting a redirect hop.

### The steps, in order

**1 · Vercel → Project → Domains**
Add both `coachtyalexander.com` and `www.coachtyalexander.com`.
Set **`www` as primary**; the apex should redirect to it. Serving both is
duplicate content — picking one and redirecting the other is the whole job.

**2 · GoDaddy DNS**
Point both at Vercel. Vercel prints the exact A / CNAME records when you add
each domain — use those, not remembered values.

**3 · The redirect that actually matters**
In Vercel, set `lola.tyalexandermedia.com` to **redirect to**
`www.coachtyalexander.com`. Vercel does this **path-for-path**, which is the
point: `/pricing` → `/pricing`, `/lp/roofing-seo-tampa` → `/lp/roofing-seo-tampa`.

> A blanket redirect to the homepage is the classic way to lose a migration.
> Every URL that had any equity dumps it on `/` and Google treats the rest as
> soft-404s. Path-for-path preserves it.

**Leave these redirects up permanently.** Not 30 days — permanently.

Vercel issues **308**, not 301. That is correct and nothing to fix: 308 is the
permanent redirect that also preserves the request method, and Google treats
301 and 308 identically for ranking-signal transfer. Vercel domain redirects
preserve the **path and the query string**, so UTM-tagged links to the old
hostname arrive intact.

**4 · Stripe**
Success URL →
`https://www.coachtyalexander.com/start?session_id={CHECKOUT_SESSION_ID}`

It works either way once the redirect is live, but a buyer shouldn't eat an
extra hop on the one page that confirms their money went through.

**5 · Google Search Console**
- Verify `www.coachtyalexander.com` as a new property
- Submit `https://www.coachtyalexander.com/sitemap.xml`
- On the OLD property, run **Settings → Change of Address**

The Change of Address tool is what tells Google this was a move rather than a
disappearance. Skipping it is the difference between weeks and months.

**6 · Anywhere else the old URL is written down**
GoHighLevel campaigns · your Instagram bio · email signature · the Stripe
Payment Link's own branding · Google Business Profile · any printed collateral.

### Lock the new domain against spoofing

`coachtyalexander.com` sends no mail — no MX, no SPF, no DKIM. It does carry
`_dmarc` at `p=quarantine`.

That is not a gap. For a domain that never sends, a DMARC policy with nothing
behind it is exactly right: it tells receivers to distrust anything claiming to
be from `@coachtyalexander.com`, and nothing legitimate is affected because
nothing legitimate sends. The only thing missing is making the "sends no mail"
part explicit, which is the RFC-recommended posture:

```
Host: @        Type: TXT   Value: v=spf1 -all
Host: @        Type: MX    Value: .            Priority: 0
Host: _dmarc   Type: TXT   Value: v=DMARC1; p=reject; rua=mailto:dmarc@tyalexandermedia.com
```

`v=spf1 -all` says no server is authorised to send as this domain. The null MX
(`.` with priority 0) says it receives no mail either — receivers reject rather
than queue and retry. And with nothing legitimate to break, `p=reject` is
strictly better than `p=quarantine` here.

Now that this domain is the public face of the business, that matters more than
it did when it was parked: a spoofed `ty@coachtyalexander.com` invoice is the
exact attack the root domain already ate once.

**Only do this while the domain genuinely sends no mail.** The day you add a
mailbox or send from it, this has to be rebuilt properly first.

### Reverting

`VITE_SITE_ORIGIN` overrides the default everywhere — frontend, prerenderer,
SEO checker and the `/lp` generator all read it. Set it in Vercel and redeploy
to point the whole site somewhere else in one variable. That is deliberate: a
domain move is the change most likely to need undoing in a hurry, and a
find-replace across 28 files is not what you want to be doing at that moment.

---

## 1 · Take money — 10 minutes

**Stripe → Developers → Webhooks → Add endpoint**

| field | value |
|---|---|
| Endpoint URL | `https://lola-backend-production.up.railway.app/stripe/webhook` |
| Event | `checkout.session.completed` — the only one `main.py` acts on |

Copy the `whsec_…` signing secret → **Railway → `STRIPE_WEBHOOK_SECRET`**.

**Set `RESEND_API_KEY` in the same pass.** This is the part that isn't obvious:
the webhook tries to send the buyer a text *and* an email, but `send_sms` is
gated by `twilio_enabled()`, which returns `False` whenever `OUTBOUND_VIA_GHL`
is on — and it is, by default. **Email is the only channel that fires.** With
the webhook secret set and no Resend key, a buyer still hears nothing.

Then verify in Stripe the Payment Link is:

- **Recurring** $397/month, not one-time. Stripe prices are immutable, so a
  one-time price can't be converted later — the link has to be rebuilt.
- Success redirect exactly
  `https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}`
- Apple Pay / Google Pay / Link enabled.
- **Old $197 / $997 / $297 links deactivated.** A bookmarked URL still charges.

---

## 2 · Protect the sending domain — do this BEFORE any cold email

The domain was used in an authenticated phishing blast (valid key, valid
DKIM/SPF) in Aug 2026, and DMARC is still `p=none` — which observes and does
nothing. It also shares reputation with the Google Workspace running real
client conversations.

Sending a cold batch from it in that state is how you lose both.

### 2a · Tighten DMARC

Replace the `_dmarc` TXT record on `tyalexandermedia.com`:

```
Host:  _dmarc
Type:  TXT
Value: v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s; rua=mailto:dmarc@tyalexandermedia.com
```

Run it two weeks, read the aggregate reports, then move to `p=reject`.
`adkim=s` / `aspf=s` are strict alignment — they're what stop a lookalike
subdomain passing as you.

### 2b · Drop the unused sending platform

If Brevo is unused, delete the `brevo-code` TXT record from the root domain.
It authorises a second platform with a second set of credentials to send as
you, which is exactly the surface the August incident used.

### 2c · Send cold email from a subdomain, not the root

Verify **`send.tyalexandermedia.com`** in Resend (Resend → Domains → Add).
Resend gives you three records; they look like this:

```
Host: resend._domainkey.send    Type: TXT     Value: (Resend gives you this)
Host: send                      Type: MX      Value: feedback-smtp.us-east-1.amazonses.com   Priority: 10
Host: send                      Type: TXT     Value: v=spf1 include:amazonses.com ~all
```

Then:

```
OUTREACH_FROM_EMAIL="Coach Ty <ty@send.tyalexandermedia.com>"
```

Now a spam complaint on a cold batch lands on the subdomain's reputation, not
on the inbox you run the business from.

---

## 3 · Cold outreach — the ramp

The machine is built: warmup phasing, a daily cap, a suppression list,
per-lead HMAC unsubscribe tokens, dry-run. It has never been run.

**It refuses to send without `LOLA_SECRET_ADMIN_KEY`**, on purpose — that key
signs the one-click unsubscribe link, and an unsigned link renders as
`?email=x&token=` which is a dead link at the bottom of every email. Gmail and
Yahoo require a working one-click unsubscribe from bulk senders.

```
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set it in Railway and locally. Then:

```bash
# 1 — look at one, end to end, before anyone receives anything
python3 -m outreach.cli preview --variant D --csv leads.csv

# 2 — dry run the whole batch. Renders every email, sends zero.
python3 -m outreach.cli send --csv leads.csv --dry-run

# 3 — send for real, once a day. The cap is enforced in code, not by you.
python3 -m outreach.cli send --csv leads.csv

# 4 — read what happened
python3 -m outreach.cli status --days 7
```

### The ramp

| week | cap/day | watch for |
|---|---|---|
| 1 | 10 | any bounce over 2% — stop and check the list |
| 2 | 25 | replies going to spam; complaints over 0.1% |
| 3+ | 50 | keep it here; volume is not the lever, list quality is |

The cap comes from `outreach/warmup.py` and is enforced by `send`, so the way
to go faster is to wait, not to pass a flag.

### Lead list — built for you

`outreach/build_leads.py` produces the CSV. It was the one genuinely missing
piece: `leads.py` validated a lead file and `cli.py` sent from one, but nothing
made one, so the whole machine was blocked on a spreadsheet.

```bash
# see what Places returns for a target, fetch nothing
python3 -m outreach.build_leads --trade "roofing contractor" --city "Tampa FL" --dry-run

# build it
python3 -m outreach.build_leads --trade "roofing contractor" --city "Tampa FL"

# or run the whole Tampa Bay target set in one pass
python3 -m outreach.build_leads --config outreach/targets.example.json --append
```

It searches Google Places (the same `GOOGLE_PLACES_API_KEY` the Growth Score
already uses), keeps operational businesses that publish a website, then reads
each business's own site for a published address.

**It never guesses an address.** No email on the site means the business is
skipped, not written as `info@theirdomain.com`. A fabricated address bounces,
and bounces are what get a sending domain blocked — which on this domain is the
thing to avoid above all else. Role accounts (`info@`, `sales@`, `office@`) are
dropped for the same reason, using `leads.py`'s own filter so the builder and
the validator can't disagree.

It's sequential with a delay between sites and an honest User-Agent. These are
small-business web hosts, not CDNs.

Every email deep-links to `/growth-score?biz=<their business>`, which prefills
the form and fires the Places lookup — so a cold reader lands with the business
name, website and city already filled. Two fields, not five.

**Suppress anyone who replies**, immediately:

```
python3 -m outreach.cli suppress --email them@example.com --reason replied
```

---

## 4 · Sandbar reviews — the real order

Sandbar has **0 Google reviews**. Review count and velocity are the biggest
prominence signal in the map pack after proximity, so this is the highest
ranking lever available — but it is not "run the script."

1. **Is Sandbar's Google Business Profile claimed and verified?**
   Everything below is blocked until it is. This is the gate.
2. Get its place ID → build the review link:
   `https://search.google.com/local/writereview?placeid=…`
   This is **not** an env var in this repo. GHL owns outbound to clients'
   customers, so the link belongs in the GHL campaign.
3. **Are the past customers actually in GHL, tagged `customer:past`?**
   `build_review_segment.py` reads that tag. If the customer list is in a
   notebook or QuickBooks, that import is the real work, not the script.
4. Fresh GHL Private Integration token (line 220 halts on the revoked Aug-2
   one), then:
   ```
   export GHL_API_TOKEN=pit-…  GHL_LOCATION_ID=…
   python3 services/build_review_segment.py            # dry run, sends nothing
   # read reports/review_eligible.csv, sanity-check the names
   python3 services/build_review_segment.py --apply    # tags eligible contacts
   ```
5. Build the campaign **in GHL**, against the `review-send-eligible` tag,
   sending from **Sandbar's own domain and number** — not yours. A Sandbar
   customer receiving mail from `tyalexandermedia.com` doesn't know who that
   is, and the complaint lands on your domain.

---

## 5 · Your own Google Business Profile

Verification has a multi-week lag, so start it now and forget it. When it
lands, set `VITE_GBP_URL` in **Vercel** and **redeploy** — Vite bakes `VITE_*`
in at build time, so saving the variable is not enough.

Until then the founder block reads "Find us on Google Maps" rather than
"✓ Verified Google Business." That is deliberate: the badge used to claim a
verification while pointing at a Maps *search query*.

Be realistic about the return. Ranking your own business for "local SEO Tampa"
means outranking agencies with hundreds of reviews. This is a credibility fix,
not a traffic source.

---

## Order, by return

| # | do | why |
|---|---|---|
| 0 | §0 Domain migration | The code already serves the new domain. Until DNS and the 301s land, canonicals point at a host that doesn't answer. |
| 1 | §1 Stripe + Resend | 10 min. Insures the first sale. |
| 2 | §2 DMARC + sending subdomain | Unblocks §3 and protects the inbox you actually work from. |
| 3 | §3 Outreach ramp | **The only item here that produces revenue in weeks.** SEO takes months; the site is done and has no traffic. |
| 4 | §4 Sandbar reviews | Biggest ranking lever, and the proof that makes §3 close. |
| 5 | §5 Your own GBP | Long lag. Start it, then ignore it. |

Step 0 is a prerequisite, not a return in itself — but everything downstream
points at the wrong host until it's done.

Steps 2 and 3 are where the return is. Nothing in 1, 4 or 5 gets you a customer
this month.
