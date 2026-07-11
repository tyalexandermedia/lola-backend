# ROADMAP

Where Lola is headed. Organized **Now / Next / Later**. This is direction, not
a contract — reprioritize as clients and revenue dictate. "Complete next best
ROI" is the operating cadence.

> Living document. Coach Ty can paste over any section with canonical wording.

## Shipped (on `main`)

- Two-tier public pricing ($197 DIY / $997 Full Build) across both repos.
- Prerender of 16 marketing routes at build time (AI-crawler fix; `/lp`
  excluded; fail-safe).
- Portfolio (`/work` + home/`/retainer` sections), screenshot-first cards.
- Growth Score follow-up automation + post-build → $297/mo continuity nurture.
- Missed-Call Text-Back (`db/mctb.py`), per-client opt-in.
- `/managed` continuity landing page.
- Owner dashboard `/admin/hq` (funnel + automation health + clients).
- Scroll delight, image compression, sitemap `lastmod`, clarity accordions.

## Now — launch of first client (Sandbar Soft Wash)

Go-live is **dashboard config, not code** (see `docs/GO-LIVE.md`). Ty-only:

- Stripe links + `STRIPE_WEBHOOK_SECRET` (Railway) — pay-now + fulfillment.
- Resend (`RESEND_API_KEY`) — result emails + nurture.
- Twilio (`TWILIO_ENABLED=true` + creds) — Growth Score text + MCTB.
- `LOLA_SECRET_ADMIN_KEY` (Railway) — unblocks `/admin/hq`.
- `VITE_EXPLAINER_VIDEO_URL` — the "See how it works" Loom.

## Next — CRM at scale + proof

- **GHL lead-bridge** — every Growth Score lead pushed into GoHighLevel
  (contact + "growth-score" tag + pipeline stage) via inbound webhook.
  Safe-by-default; dormant unless `GHL_INBOUND_WEBHOOK_URL` is set.
- **Stripe → GHL pipeline update** — advance the contact's stage on purchase.
- **Portfolio previews** — real screenshots + correct URLs
  (`/public/images/work/<host>.jpg` or `thumb` in `lib/portfolio.ts`). Note:
  `tampabaypowerclean.com` is the OLD site — use Ty's new build URL.
- **Stripe $297/mo subscription link** → `VITE_STRIPE_MANAGED_URL` /
  `FOLLOWUP_MANAGED_URL`.

## Later — Managed-tier depth

- Managed-client operations: review engine, GBP posts, lead follow-up, live
  dashboard — deepen only when a paying Managed client needs it.
- All-in-one inbox and other speculative features: build when a real client
  asks, not before ("clarity through motion").
- Keep the AI-visibility engine custom and ahead — it's the moat.

## Guardrails (do not violate)

- "Growth Score", never "audit". Public pricing stays two-tier ($197/$997).
- $297/mo stays nurture-only, never public.
- `/lp/*` pages are sacred (no URL/schema/content changes).
- No fabricated proof. Nothing is live until merged to `main`.
