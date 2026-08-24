# Security — what's free, what matters, in order

Written after the 2026-08-22 audit found live credentials in a `.env` committed
to a **public** repository on 2026-07-03 and left at the tip of the `gh-pages`
branch. Everything below is free. It is ordered by how much risk each step
removes per minute spent.

## Enable the guard (30 seconds, once per clone)

```
git config core.hooksPath .githooks
```

`scripts/secret_guard.py` then reads staged **content** before every commit and
refuses anything matching a credential shape — Google, Stripe, Resend,
SendGrid, Brevo, Anthropic, OpenAI, GitHub, Twilio, GHL, AWS, Slack, private
key blocks, and webhook URLs for Make / Zapier / Slack.

`.gitignore` already listed `.env` when the leak happened. **It did not help**:
`git add -f`, `git add -A` from the wrong directory, and agents that stage
explicit paths all walk straight past an ignore rule. An ignore rule is a
default. This is a control.

It never prints the matched value — a scanner that echoes the secret into your
scrollback and CI logs has widened the exposure it was built to catch.

Audit history any time:

```
python3 scripts/secret_guard.py --history
```

## 0 · The account is wide open RIGHT NOW — fix this before the incident

The 2026-08-23 Workspace audit found that `ty@tyalexandermedia.com` is, today,
in worse shape than the incident itself:

- **2-Step Verification is OFF.**
- **The Google password was last changed Jan 13** — it was *never rotated*
  after the August incident.
- **No recovery phone and no recovery email** on the account.

That is a live, open door independent of anything the attacker did. Turn on
2SV, rotate the password, and add recovery — before the API-key work below.
Everything else is remediation; this is an unlocked front door.

## 0b · Revised incident theory — NOT Gmail, and NOT GoHighLevel either

Two forensic passes have now *removed* the two most obvious senders.

**Gmail is not the pipe.** In the incident window: zero bounce-backs, only 19
sent threads, all recognisable business mail. The blast did not leave through
this mailbox's send path.

**GoHighLevel is not the pipe either** — this is the correction, from the
2026-08-23 read-only GHL audit of the `tyalexandermedia.com` sub-account. An
earlier draft of this section fingered GHL's dedicated-domain sending. The audit
disproves it:

- **Zero sends, ever.** Email Analytics across 2026-05-24 → 08-23 (fully
  covering Aug 2–4): Sent 0, Delivered 0, Bounced 0, Complained 0. A blast
  leaves a trace in its own sender's analytics. There is none.
- **No dedicated domain.** The sub-account sends on GHL's shared pool
  (`mg.msgsndr.biz`) at warm-up "Stage 1" — never configured to send as
  `tyalexandermedia.com`. The Aug 2/4 *"enable sending on dedicated domain"*
  support threads were an attempt that **never completed**; no dedicated domain
  exists on the account.
- **No API tokens, no installed apps, no Make.com app.** Nothing dated, nothing
  created on/after Aug 1. The Aug-2 token is gone, not relabeled — both token
  lists render zero rows.
- **Audit log ends Jul 12**, every entry actioned by Ty. Reactivation restored
  nothing — no key, no domain, no automation.

So both platforms are cleared. What remains is the one authenticated-sender
candidate that fits *all* the evidence: **a leaked ESP credential from the
public `.env`, authorised in the domain's DNS.**

**SendGrid is the prime suspect.** Its keys were in the leaked `.env` (see
§"What this does not cover"). SendGrid is an ESP that DKIM-signs mail *as your
domain* once its DNS records are added — which is exactly what an "authenticated
blast with valid DKIM/SPF" looks like when sent by someone holding the key, with
the mailbox and GHL never touched. It passed because DMARC was `p=none`.

**Whole incident, corrected:** the public repo leaked `.env` (§1) → it held an
ESP key (SendGrid most likely; Brevo and Resend are also live senders) → that
ESP was authorised in `tyalexandermedia.com`'s DNS → mail went out DKIM-signed
through the ESP's pipe → it passed because DMARC was `p=none`. Not Gmail, not
GHL.

This moves the investigation exactly where the auditor said it would — **your
DNS, your registrar, and the ESP's own send logs.** Priorities now:

1. **Read `tyalexandermedia.com`'s SPF + DKIM records.** Every `include:` in the
   SPF record and every DKIM selector is an ESP authorised to send as you.
   Anything you don't actively use — SendGrid above all — is an open,
   authenticated pipe. Remove it from DNS.
2. **Kill SendGrid entirely** — delete the account/keys AND remove its SPF
   `include` and DKIM CNAMEs. It is retired in code; retire its authorisation in
   DNS too.
3. **Check the ESP send logs for Aug 2–4** — SendGrid's Activity feed, Brevo's
   logs. This is where the actual blast will show, if it is anywhere.
4. **Rotate Brevo + Resend keys** — both are live, both authorised to send.
5. **DMARC enforcement (§5) is still the backstop** — it stops an
   authorised-looking sender regardless of which key leaked.

**Two GHL housekeeping items** from the same audit, neither incident-related:

- `team@sandbarsoftwash.com` is a **shared role mailbox holding ACCOUNT-ADMIN**
  on the Sandbar sub-account — anyone with that inbox has admin there (no access
  to the Ty Alexander Media sub-account). Decide whether Eli should hold a named
  personal login instead. Not urgent.
- **10 of the 13 workflows were not verified for webhook nodes** — those live
  only on the canvas, which the audit kept closed. All 10 are Draft with 0
  enrolled, so none can send. Fastest way to close the gap: check **Make.com's
  execution history** for Aug 1–6 — if the scenario never fired, the GHL side is
  moot.

The GHL account was clean. Pausing it was reasonable containment, but it can
return to normal use once those two items are handled — it was never the hole.

## 0c · OAuth apps that can send as you — triage

The audit found **four** third-party apps holding `gmail.send` on this account:
Brevo, OpenAI (ChatGPT), Perplexity Connector, and Claude for Gmail. **None was
granted in the July–August window**, so none is a freshly planted foothold — but:

- **Brevo** holds Gmail read/compose/send (granted May 4). The reporting agent
  uses Brevo's *own API* (`BREVO_API_KEY`), not this Gmail grant — so the
  `gmail.send` scope is very likely **unnecessary and revocable**. It is an
  email platform with a live send path on the domain that had a sending
  incident; revoke the Gmail grant unless something genuinely uses it.
- **OpenAI** and **Perplexity** hold `gmail.send` *plus* very broad scopes
  (full Drive, Docs, Sheets, Calendar, Contacts, directory). Legitimate only if
  you actively use those connectors; the scope is large enough to be worth a
  hard look.
- **Claude for Gmail** is first-party and expected if you use it.

Two anchors to identify, neither a mail foothold but both worth explaining:

- ✅ **`yogateq.firebaseapp.com`** (Jul 19) — CLEARED. Owner-confirmed: a
  beach-town yoga app he signed into that night. Not hostile.
- ✅ **Windows — Colorado — Jun 16** — CLEARED. Owner-confirmed his own login.
  Not an intrusion.

**Conclusion: the Google account was never breached.** No forwarding, no
filter, no delegate, no unfamiliar OAuth grant, no unfamiliar session or device
— and the two anchors that looked suspicious are both the owner. There is no
human intruder to evict inside Google. The account-hygiene items in §0 (2SV off,
stale password, no recovery) are an *open door to close as prevention*, not
evidence of a break-in.

## 0d · The DNS read + SendGrid audit — exposure found, no exploitation

The 2026-08-23 read-only DNS audit of `tyalexandermedia.com` (Wix confirmed
authoritative — `ns10`/`ns11.wixdns.net`, separate Wix login from Sandbar)
mapped a wide, unmonitored sending-authorisation surface — and led to the
SendGrid audit that **cleared** the account which looked like the pipe.

**The apex SPF is a decoy.** Apex is `v=spf1 include:_spf.google.com ~all` —
Google only. But three *subdomains* carry their own SPF, and DMARC alignment
defaults to **relaxed**, so a subdomain counts as aligned to the apex `From:`:

- `sg.` → `include:sendgrid.net` — Wix Ascend's own SendGrid plumbing (account
  `u59301223`, cluster `wl224`). Expected.
- **`em6980.` → `include:sendgrid.net` — a SECOND, INDEPENDENT SendGrid account
  (`u59341807`, cluster `wl058`).** The `emXXXX` CNAME is the fingerprint of
  SendGrid's own Domain-Authentication wizard: someone authenticated this domain
  **directly on SendGrid, outside Wix.** Its key was in the leaked `.env` — but
  the SendGrid audit below found the domain auth was **never verified** and the
  account **sent zero mail all year**, so this was exposure, not the pipe.
- `send.` → `include:amazonses.com` — Resend (it sends via Amazon SES), with
  `send.` MX → `feedback-smtp.us-east-1.amazonses.com`.

**DKIM: six selectors, four ESPs, all live** — SendGrid (`s1`/`s2`), Wix Ascend
(`sel1`), Brevo (`brevo1`/`brevo2`), Resend (`resend`). **Four senders beyond
Google are authorised to put DMARC-passing mail in an inbox as
`ty@tyalexandermedia.com`.**

**The vulnerability this creates:** any mail with envelope-from a
`*.tyalexandermedia.com` subdomain an ESP is authorised for, plus
`From: ty@tyalexandermedia.com` → SPF passes on the subdomain → relaxed
alignment → **DMARC PASS**, inbox delivery, no aligned DKIM even required. That
is the open door `p=none` + relaxed alignment leaves — for Wix Ascend, Brevo,
and Resend too, not just the SendGrid subdomain. Whether anyone actually walked
through it is answered by the channel audits below: so far, no.

**Why you never saw a DMARC report:** `_dmarc` is a **CNAME to
`_dmarc.wixemails.com`** — Wix's shared `p=none` policy, `rua` pointing at Wix's
vendor (`vali.email`), not you. You don't control the record and never received
a report. That is the visibility gap that let Aug 2–4 leave no trail either way.

### SendGrid audited and cleared — and what it means

The account that looked like the pipe (`u59341807`) was audited directly and
**sent zero mail in all of 2026** (Global Stats, Jan 1 – Aug 23: 0 requests, 0
bounces, 0 spam). Its `em6980` domain auth was **never verified — status
Pending** — so the pipe was never usable. Both API keys are now **deleted** (a
key and its all-caps duplicate; the spare is what leaked). No unknown teammates.
The per-message feed had already aged out — retention is **3 days, not 30** — but
the aggregate counter, which persists, is conclusive.

So all three audited channels — **Gmail** (0 bounces, normal Sent), **GHL** (0
sends, no dedicated domain), **SendGrid** (0 sends all year) — are clean. When
written, that read as "exposure but no exploitation." **It was incomplete: a
later mailbox search found the real send in a fourth channel — Resend, on Aug 11
(see §0e) — and the incident date had been a week off.** The two hypotheses below
were the right fork; §0e resolves it to the second one.

1. **External spoofing** — a forged `From:` with no account access, which
   `p=none` waves straight through. If so there is no pipe to find, and DMARC
   enforcement is the entire fix.
2. **An unaudited ESP** — Brevo, Resend, or Wix Ascend, each holding a live
   domain-aligned key here. A look at each send log for Aug 2–4 closes it.

Choosing between them needs the original signal — bounce-backs, a recipient's
report, spam from your own address in your own inbox, or a tool alert. Until
that's pinned down the remediation is identical, and **none of it is urgent**
(real exposure, no evidence of exploitation):

1. **Rotate every secret from the leaked `.env`, not just SendGrid** — the
   Google keys, `LOLA_SECRET_ADMIN_KEY`, the Make webhook, and the Brevo/Resend
   keys. A public `.env` rarely holds one credential; treat them all as burned
   (§1).
2. **Strip the `em6980` records at Wix** and **take DMARC off the Wix CNAME**
   onto your own `p=quarantine` TXT with reports coming to you. This is the one
   control that actually stops domain spoofing — worth doing regardless of
   attribution.
3. **Check Brevo + Resend send logs for Aug 2–4, and rotate their keys.**
4. **Prune to what you use, then `aspf=s adkim=s` and `p=reject`.** Google is
   apex-aligned, so Workspace still passes; set strict only *after* the prune, or
   you'll block a real sender.
5. **Delete SendGrid account `u59341807`.** Key-less now, but a dormant account
   holding a domain-auth entry for your subdomain is liability with no upside.

## 0e · Found it — Resend, Aug 11 (the incident date was a week off)

The mailbox search that resolved this looked for the *alert*, not the mail — and
the alert was never a leaked-key notice or a blocklist. It was **Resend's own
quota warnings, dated Aug 11, 2026**:

- Resend → "80% of your daily quota" → "100%" → **"200% of your daily quota of
  100 emails — your requests won't be processed anymore"**, all on Aug 11.
- **200+ send attempts through Resend in one day.** Real mail moved. Resend's
  100/day cap cut it off before volume was high enough for a reputation hit —
  which is exactly why no blocklist or Postmaster alert ever fired. The rate
  limit protected the domain.

**The date was wrong by a week, which is why every earlier search came up empty.**
The Aug 2–4 "enable sending on dedicated domain" threads that pointed at
GoHighLevel were Ty's own Sandbar work (an Aug 2 deliverability test, an Aug 4
GHL ticket for `mail.sandbarsoftwash.com`) — legitimate and unrelated. That is
why GHL and SendGrid were clean: the incident was never in that window or those
tools.

**The mechanism fits the exposure.** A Resend API key was **hardcoded in the
`lola-seo` repo** — a bot opened PR #13 on Jul 5 to move it to an env var — and
Resend keys were in the leaked `.env` too. An exposed Resend key plus 200 sends
in a day is the shape of a leaked credential in use. **But it could also be a
forgotten outreach batch Ty ran himself** — Lola's own outreach sends through
Resend. The Aug-11 recipient list is what tells those two apart.

**Brevo — read directly from the mailbox, and it changes the read.** The key
`xkeysib-…tHw5w5` was **marked inactive on Aug 5** (Brevo auto-deactivates unused
keys), then on Aug 14/15 Brevo flagged **two API calls from never-before-seen
IPs** in one San Jose `/24` (`152.55.176.115`, `.93`), an hour apart, on that
same key — verbatim: *"Someone tried to use your organization account and make an
API call with an IP address you have never used before."* A **dormant** key —
one that sat in the leaked `.env` — poked from an unfamiliar cloud IP is the
signature of **someone testing a leaked credential**, not Ty's own infra (which
would have kept the key active). It was likely blunted because the key was
already inactive, the same way Resend's 100/day cap blunted Aug 11. Confirm the
IP against your own Vercel/Railway egress before calling it hostile — but until
then, treat every leaked key as **in hostile hands**.

### What actually closes this

The Brevo probe shows leaked keys are being *tried* by an outside party, so
credential rotation is no longer "hygiene on your own schedule" — do it now.
The protective limits (Resend's quota, Brevo's inactivity) appear to have
contained the damage, but the keys are known. In order:

1. **Resend → Logs → Aug 11.** Recipient domains, subjects, which key. If the
   recipients are Ty's contractor outreach list, it was a forgotten batch. If
   they're unrelated, the exposed key was abused. This is the decisive check.
2. **Rotate the Resend key now, either way** — it was in the repo. Coordinate:
   regenerate in Resend → update `RESEND_API_KEY` in Railway → verify. It's a
   live key; don't just delete it.
3. **Check the Brevo Aug-14 IPs** against your own Vercel/Railway egress before
   assuming hostile; rotate that Brevo key regardless (same coordinated dance).
4. **Rotate the four Google keys regardless.** No Google alert ≠ no exposure —
   Google only scans public GitHub. If the `.env` leaked via a build artifact,
   preview deploy, or shared folder, Google never sees it and never emails you.
   Silence is not clearance (§1, §1b).
5. **Finish DMARC** — correct regardless of which way the Aug-11 log reads (§5).

## 1 · Rotate what leaked — before anything else

A blob pushed to a public repo stays fetchable **by SHA** even after the branch
is deleted. Assume every one of these is known:

| credential | where |
|---|---|
| 4 × Google API keys | Google Cloud Console → APIs & Services → Credentials |
| `LOLA_SECRET_ADMIN_KEY` | regenerate, set in Railway |
| Make webhook URL | Make → the scenario → regenerate the hook |
| **SendGrid API key** | **the prime incident suspect (§0b). Delete the key AND remove SendGrid's SPF include + DKIM from DNS — it is retired in code but may still be authorised to send as your domain.** |
| Brevo + Resend keys | live senders; rotate and confirm each is still needed (§0b) |

**Deleting the branch is cleanup, not a fix.** Rotation is the fix.

While you're in Google Cloud: put **restrictions** on the new keys — HTTP
referrer for browser keys, IP allowlist for server keys. A restricted key that
leaks is close to worthless, and it's the single highest-leverage free control
in this whole document.

## 1b · Cap the bill, not just the blast radius

Restricting a key to a single API contains *what* a leaked key can call. It
does **not** cap *how much* it can spend, and Places Text Search / Place
Details run $17–32 per 1,000 calls — so an API-restricted Places key, leaked
and hammered, is a contained incident with an uncapped invoice.

Three ten-minute additions in Google Cloud Console close that:

1. **Per-API daily quota caps** — APIs & Services → the API → Quotas. Set the
   ceiling to ~2–3× real daily volume. This is the money-stop; the key
   restriction is the scope-stop. You need both.
2. **A billing budget alert** on the project at a threshold you'd notice.
3. **One key per API**, never one key with three APIs enabled. Then rotation
   after a leak is surgical — kill the one key — instead of a full outage
   across every service that shared it.

On deployment shape: these keys are called **server-side from Railway**, whose
Hobby tier has **no static outbound IP** (Pro's are shared and load-balanced
across three addresses, so even paying wouldn't buy a real allowlist — it would
buy an outage risk). Per Google's own guidance, **API restriction is the
correct control for server-side keys without a static IP** — not a downgrade
from IP restriction, the right tool for this shape. Google's console will still
show a yellow "unrestricted application" triangle; it is cosmetic here. Ignore
it.

## 2 · Make the repository private

It is public today. That means the full backend — admin endpoints, client
references, business logic — is readable by anyone, and always was.

One tradeoff, stated honestly: GitHub's **secret scanning and push protection
are free on public repos** and require paid Advanced Security on private ones.
You lose that by going private. The guard above replaces it locally, and
private-with-a-local-guard beats public-with-scanning by a wide margin — the
scanner tells you after the fact; the guard stops it happening.

## 3 · Turn on 2FA everywhere, today

GitHub · Vercel · Google Workspace · GoDaddy · Stripe · Resend · GoHighLevel.

Free, ten minutes total, and it defeats the entire class of attack that starts
with a reused or phished password. Given August, this is not optional.

## 4 · Clean up after the email incident — the step people skip

Rotating a key does nothing about **persistence**. An attacker who had access
to a mailbox usually leaves a way back in. In Google Workspace, check:

- **Forwarding rules** — Settings → Forwarding and POP/IMAP. An auto-forward to
  an address you don't recognise is the classic one.
- **Filters** — a rule that archives or deletes anything matching "invoice" or
  "password" hides the attacker's own traffic from you.
- **App passwords** — Google Account → Security. These bypass 2FA entirely.
  Delete any you didn't create.
- **Third-party OAuth grants** — Security → Your connections. Revoke anything
  unfamiliar. This is how a "revoked" key stays alive.
- **Login history** — Admin console → Reports → Audit → Login, for unfamiliar
  locations around the incident.
- **Send-as / delegates** — an added "send mail as" address lets someone send
  from your domain without your password.

Also: **check Make's execution history** around the incident date. A leaked
webhook URL is a bearer credential, and a Make scenario that sends email turns
that URL into a sending capability without any email key being stolen.

## 5 · Finish the DMARC work

`tyalexandermedia.com` is still at `p=none`, which observes and enforces
nothing — on the domain that was actually used in the phishing blast.

Its DNS is managed at **Wix** (nameservers `NS10`/`NS11.WIXDNS.NET`) — edit this
record in the Wix DNS panel, **not** GoDaddy. GoDaddy holds `coachtyalexander.com`;
the two domains live in different registrars' DNS, which is easy to trip on.

**Read §0d first** — the DNS audit found `_dmarc` is currently a **CNAME to
Wix's shared policy**, not a record you own. You must delete that CNAME before a
TXT of your own will resolve, and the real hole is relaxed alignment on rogue
subdomains, not the apex. The record below is the destination; §0d is the full
sequence.

```
Host:  _dmarc
Type:  TXT
Value: v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s; rua=mailto:dmarc@tyalexandermedia.com
```

Two weeks at `p=quarantine`, read the reports, then `p=reject`.

`coachtyalexander.com` is already done — `v=spf1 -all`, null MX, `p=reject`.
That domain cannot be spoofed.

## 6 · Branch protection on `main`

Settings → Branches → add a rule for `main`: require a pull request, and block
force pushes. Free on public repos and on private repos for individual
accounts. It means nothing lands on the deployed branch without passing through
a diff you can read.

---

## What this does not cover

Reading the actual environment-variable **values** in Railway and Vercel
requires console access no tool here has. Two things worth doing by hand:

- **List every var in both** and delete anything you don't recognise or no
  longer use. Two email senders are wired for one job: **Resend** (Lola's own
  mail) and **Brevo** (the reporting agent, `agents/reporting_agent/`). SendGrid
  is fully retired — no code, no config — but its keys were in the leaked `.env`,
  so if a `SENDGRID_*` var still exists in Railway or Vercel, delete it: it's a
  credential for a sender nothing uses. Two authorised senders for one domain is
  already one more attack surface than the job needs; decide if Brevo earns its
  place or if the reporting agent should move to Resend too.
- **Check Vercel deploy hooks** (Settings → Git → Deploy Hooks) and **GitHub
  webhooks** (Settings → Webhooks). Both are URLs that trigger action when
  called, and neither was inspectable from here.
