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

## 0b · Revised incident theory — the mail did NOT go through Gmail

The mailbox forensics change the picture. In the incident window: **zero**
bounce-backs or delivery-failure messages, and only 19 sent threads — all
recognisable business mail. **The unauthorized email did not leave through this
Gmail mailbox's send path.**

Where it almost certainly did go: **GoHighLevel's dedicated-domain sending.**
Three facts line up on the same days:

- Sent folder shows GHL support threads titled *"Enable sending on dedicated
  domain"* on **Aug 2 and Aug 4**.
- The GHL Private Integration token was **revoked Aug 2** (see
  `services/build_review_segment.py`, which halts on it).
- The original incident was described as an *authenticated* blast with **valid
  DKIM/SPF** — which is exactly what mail sent through an authorised platform
  like GHL looks like, and exactly what mail forged from a random mailbox does
  NOT.

So the vector was most likely a **compromised GHL credential sending through the
domain's authorised GHL pipe**, which passed DMARC because DMARC was `p=none`.
That reframes the priorities:

1. **DMARC enforcement (§5) is the actual fix**, not a nice-to-have — it is what
   stops an authorised-looking sender the mailbox never touched.
2. **Audit GHL**: what sending domains and sub-accounts are configured, and
   confirm the Aug-2 token is dead and its replacement is scoped tight.
3. The Gmail mailbox is not the hole, and the Google account was not breached
   (§0c). Rotating its password (§0) matters for the *open door*, not for *this*
   incident.

**Whole incident, end to end:** the public repo leaked `.env` (§1) →
credentials for the domain's GoHighLevel sending pipe were exposed → mail went
out through GHL's authorised, DKIM-signed path → it passed because DMARC was
`p=none`. One vector, fully explained. The fix is: rotate the leaked
credentials, audit GHL, and enforce DMARC. Not a mailbox cleanup — there is
nothing in the mailbox to clean.

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

## 1 · Rotate what leaked — before anything else

A blob pushed to a public repo stays fetchable **by SHA** even after the branch
is deleted. Assume every one of these is known:

| credential | where |
|---|---|
| 4 × Google API keys | Google Cloud Console → APIs & Services → Credentials |
| `LOLA_SECRET_ADMIN_KEY` | regenerate, set in Railway |
| Make webhook URL | Make → the scenario → regenerate the hook |

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
