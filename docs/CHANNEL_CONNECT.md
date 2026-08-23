# Channel-connect runbook — Coach Ty inbox

**What this is.** The order to connect Instagram and the other chat channels
into one inbox, why that order, and the two hard prerequisites people miss. This
is **dashboard config, not code** (same as `docs/GO-LIVE.md`) — nothing here
touches the repo. It exists so the steps are decided and reviewed before you
click "connect."

**Where everything lands.** GoHighLevel **Conversations** is the hub — the repo
already treats GHL as the owner of messaging (`api_clients/ghl.py`,
`reviews/sms.py`). Every channel below terminates in that one unified inbox.
There is no "connect" button in the Lola repo; connections are OAuth flows you
authorize inside GHL / Meta with your own login.

---

## 0 · Read this first — two guardrails that override the order

1. **Inbound is safe now. Automated *outbound* is not — yet.** Receiving DMs,
   web-chat, and texts touches nothing the Aug-2026 incident hit (that was the
   *sending* pipe — see `docs/SECURITY.md`). So connecting channels to *receive*
   is fine today. But do **not** switch on any auto-reply / drip / speed-to-lead
   workflow until BOTH are true: the GHL incident is closed **and** A2P 10DLC is
   approved for the sub-account (same gate as `docs/NEW_LEAD_SEQUENCE.md`).
   Reply to inbound by hand until then.

2. **One identity per sub-account. Never cross the streams.**
   - **Ty / agency sub-account** → `coachtyrellalexander` IG, the agency FB
     Page, the web chat on `coachtyalexander.com`, Ty's own number. This is
     *Ty talking to contractors and his creator audience* (B2B + fitness).
   - **Client sub-account** (e.g. Sandbar) → the *client's* IG/Page/number,
     the client's A2P registration. This is *the client talking to homeowners*
     (B2C). The whole system is built so client outbound sends from the client's
     identity, never Ty's (`api_clients/ghl.py::outbound_via_ghl`). Connecting
     Ty's Instagram into a client sub-account would break that — keep it in Ty's.

Everything below is the **Ty / agency** inbox, because that's what
`coachtyrellalexander` is.

---

## 1 · The two prerequisites that block Instagram

Instagram DM in GHL is not a standalone connection — it rides on Facebook. You
cannot connect it until:

- **The IG account is a Professional account** (Business *or* Creator).
  IG app → Settings → *Account type and tools* → Switch to Professional.
  `coachtyrellalexander` is a creator account, so this is likely already done —
  confirm it.
- **It is linked to a Facebook Page, and you're an admin of that Page.**
  IG DM messages route through the linked Page's inbox; no Page, no connection.
  Also turn on IG → Settings → *Messages and story replies* →
  **"Allow access to messages"** so third-party tools (GHL) can read/send DMs.

If there's no agency FB Page yet, creating one is step 1 — it's the carrier for
both Instagram **and** Messenger, so it pays for two channels at once.

---

## 2 · Connect order — by ROI

Ranked for *your* funnel: the site already has SEO traffic and a Growth Score
magnet, your creator audience is on IG, and outbound is gated. So the order is
"where warm inbound already exists, cheapest first."

| # | Channel | Why this rank | Effort | Blocked by |
|---|---------|---------------|--------|------------|
| 1 | **Web chat widget** on `coachtyalexander.com` | Highest-intent traffic you already own; catches visitors who won't fill the Growth Score form. Pure inbound — no incident/A2P risk. | Low | nothing |
| 2 | **Instagram DM** (`coachtyrellalexander`) | Your creator audience + inbound contractor prospects. The one you asked for. | Low | §1 prereqs |
| 3 | **Facebook Messenger** | Same FB Page connection as IG — near-zero extra effort once §1 is done. Connect both in the same flow. | ~0 | §1 prereqs |
| 4 | **SMS / text** (your number) | Two-way texting from the inbox. *Receiving* is fine now; keep auto-send off. | Low | A2P + incident for outbound |
| 5 | **Email** | Fold your reply-to inbox into GHL so every thread is one place. | Low | incident (sending) |
| 6 | **WhatsApp** | Only if your audience actually uses it — US home-services contractors mostly don't. Revisit when a client's customers do. | Med | Meta/WA approval |

**Explicitly not on the list:**
- **Google Business Profile chat** — Google **shut GBP chat/messaging down on
  2024-07-31**. It no longer exists. GBP still matters for *reviews and calls*
  (that feeds the `reviews/` engine), just not chat. Don't hunt for the button;
  it's gone.
- **TikTok DM** — GHL has no native TikTok Conversations channel. It'd need a
  third-party bridge (Zapier-style). Not worth it until TikTok is a real inbound
  source for you. Later.

---

## 3 · The clicks (GHL)

1. **Sub-account → Settings → Integrations → Facebook** → connect, pick the
   agency Page, grant messaging scopes. Instagram appears in the *same* consent
   screen when §1 is satisfied — check both **Messenger** and **Instagram**.
2. **Settings → Conversation AI / Channels** → confirm Instagram + Messenger now
   show "Connected."
3. **Web chat:** Sites → Chat Widget → build → copy the embed snippet. It goes
   on `coachtyalexander.com` (one `<script>` in the site head — a frontend task
   in `lola-seo` if you want it site-wide; say the word and I'll wire it in).
4. **Phone/SMS:** Settings → Phone Numbers — the LC Phone number for *this*
   sub-account. Leave workflows that auto-send **off** (guardrail §0.1).
5. **Send one test DM** to `coachtyrellalexander` from another account and
   confirm it lands in Conversations. Reply from the inbox to confirm two-way.

---

## 4 · Also worth connecting (not chat, but they close the loop)

A chat inbox only pays off if a conversation can turn into a booked call and a
payment. Cheap adds that do that:

- **A GHL calendar + booking link** — so "interested" in a DM becomes a booked
  call in one link instead of a scheduling back-and-forth.
- **Stripe** — already on the ROADMAP; ties payment to the pipeline stage.
- **Google Business Profile** (for reviews/calls, per above) — feeds the
  existing review engine.

---

## 5 · Definition of done

- [ ] Agency FB Page exists; `coachtyrellalexander` is Professional + linked + "Allow access to messages" on.
- [ ] Instagram + Messenger show "Connected" in the Ty/agency sub-account.
- [ ] Web-chat widget live on `coachtyalexander.com`.
- [ ] Test DM received **and** replied to from the GHL inbox.
- [ ] No auto-send workflow enabled (stays off until incident closed + A2P approved).
