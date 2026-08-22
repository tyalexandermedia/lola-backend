/// <reference types="vite/client" />
/**
 * /start — the one-screen front door, and the page a buyer lands on after paying.
 *
 * This page does two jobs depending on how you arrived:
 *
 *   1. NO `session_id` — the dead-simple buy page. One screen, one button, no
 *      comparison tables. This is the link you TEXT someone: they grasp "what
 *      do I get / what does it cost / where do I click" without scrolling.
 *      /pricing still exists for shoppers who want the full breakdown.
 *
 *   2. WITH `session_id` — Stripe's success redirect (see lib/checkout for the
 *      exact URL to configure). A customer who just paid gets a receipt and
 *      their next step, NOT another sales pitch.
 *
 * 2026-08-15 rewrite. The previous version was the last surface still selling
 * the retired model, and it was wrong in ways that mattered:
 *   • Both CTAs opened a Google Calendar booking link — the call path removed
 *     everywhere else, on the page Stripe redirects buyers to.
 *   • "$397/month plan, one-time" and "Prefer to do it yourself? The $397/month
 *     guide" — the two-tier sweep mangled the copy into contradictions.
 *   • It published the RETIRED Half-Back Guarantee ("1 ranking within 30 days
 *     or you get half back") alongside the live 90-Day Promise elsewhere on the
 *     site. Two different published guarantees for one product is the kind of
 *     thing you only find out about in an argument.
 *
 * It rotted because it hardcoded every number and promise. Everything below now
 * reads from lib/pricing, so it cannot drift from the canonical offer again.
 *
 * 2026-08-20: this page IS prerendered and indexable now, in its unpaid state.
 * The old note here said the opposite — "not prerendered and noindexed on
 * purpose" — while App.tsx published a canonical for it and the sitemap
 * submitted it. Three sources disagreeing about one URL. The buy screen is a
 * legitimate landing page (it is where the VSL points), so it ranks; the
 * receipt view (?session_id=…) is the part that must never be indexed, and
 * that is now the only thing carrying noindex.
 */

import { useState } from 'react';

import { FOUNDER } from './lib/lola';
import { AFTER_YOU_START, GUARANTEE, MONTHLY_AT_A_GLANCE, PLAN } from './lib/pricing';
import { startHref, startSmsHref } from './lib/checkout';
import Vsl from './Vsl';
import { useSeo } from './lib/seo';
import { PAGE_META, canonicalFor } from './lib/pageMeta';
import { useReveal } from './lib/useReveal';
import { track } from './analytics';

const GOLD_BUTTON =
  'inline-flex h-14 w-full max-w-[380px] items-center justify-center gap-2 rounded-[12px] ' +
  'bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left ' +
  'px-8 text-[15px] font-bold uppercase tracking-[0.05em] text-on-gold ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] ' +
  'transition-all hover:bg-right active:scale-[0.98] sm:h-16 sm:text-[16px]';

export default function Start() {
  useReveal();

  // Lazy initializer rather than an effect: reading it during the first render
  // means a paying customer never sees a flash of the sales page before the
  // thank-you swaps in. Guarded for the SSR/prerender pass, which has no window.
  //
  // Presence of session_id is NOT proof of payment — anyone can append it. That
  // is fine here because this page unlocks nothing; it says thank you and links
  // to the intake. DiyAccess does real server-side verification because it
  // hands over assets.
  // Keep the id, not just a boolean: it gets carried into the intake so /apply
  // can tell a paying customer from a not-ready-today lead and say the right
  // thing to each.
  const [sessionId] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('session_id') || '',
  );
  const paid = Boolean(sessionId);

  useSeo({
    // The unpaid title/description come from PAGE_META so the prerendered
    // /start head and this one cannot disagree; the paid view gets its own,
    // and its noindex, because it is a receipt rather than a landing page.
    title: paid ? "You're in — Lola Leads" : PAGE_META['/start'].title,
    description: paid
      ? 'Your plan is active. Here is what happens next.'
      : PAGE_META['/start'].description,
    canonical: paid ? undefined : canonicalFor('/start'),
    // Two pages at one URL, and only one of them should rank. The receipt view
    // (?session_id=…) must never be indexed. The bare /start is the buy screen
    // the VSL points at — it has a title and description written to rank and it
    // is in the sitemap, so blanket-noindexing it was submitting a URL to Google
    // and telling Google to ignore it in the same request.
    robots: paid ? 'noindex' : undefined,
  });

  return paid ? <Welcome sessionId={sessionId} /> : <BuyScreen />;
}

/* ─────────────────────────────────────────────────────────────────────────
   PAID — receipt and next step. No pricing, no pitch, nothing to buy.
   ───────────────────────────────────────────────────────────────────────── */
function Welcome({ sessionId }: { sessionId: string }) {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-[640px] pt-8 text-center sm:pt-14">
        <p aria-hidden className="text-[40px] leading-none">🐾</p>
        <h1
          className="mt-4 font-display font-bold leading-[1.05] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(2rem, 5.5vw, 3.25rem)' }}
        >
          You&apos;re in.
        </h1>
        <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-[1.6] text-ink-2">
          Payment went through and your plan is active. Ty starts on your build
          today — here&apos;s the one thing he needs from you.
        </p>

        <a
          href={`/apply?session_id=${encodeURIComponent(sessionId)}`}
          onClick={() => track('start_intake_clicked')}
          className={`${GOLD_BUTTON} mt-7`}
        >
          Do the 2-minute intake →
        </a>
        <p className="mt-3 text-[13px] text-ink-3">
          It&apos;s the only form you&apos;ll fill out. No call required.
        </p>
      </section>

      {/* What happens next — same three steps quoted at checkout, so the
          promise made before paying is the one repeated after. */}
      <section className="mx-auto mt-12 w-full max-w-[640px] sm:mt-16">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-gold/85">
          What happens next
        </p>
        <ol className="mt-5 space-y-3">
          {AFTER_YOU_START.map((s, i) => (
            <li
              key={s.step}
              className="flex items-start gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[12px] font-bold text-gold">
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">{s.step}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.5] text-ink-2">
                  {s.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <DirectLine
        heading="Your direct line"
        blurb="You're not routed through a support desk. This is Ty's actual phone."
      />

      <div className="mt-10 pb-10 text-center text-[12px] leading-[1.6] text-ink-4">
        <p>{FOUNDER.company} · Tampa Bay · © 2026 🐾</p>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   UNPAID — the whole offer on one screen, one button.
   ───────────────────────────────────────────────────────────────────────── */
function BuyScreen() {
  // atOffer: this page IS the offer, so if the Payment Link isn't configured
  // the button opens a pre-filled text rather than bouncing to /pricing.
  const href = startHref(true);

  return (
    <main className="flex flex-1 flex-col">
      {/* overflow-hidden clips the decorative glow, which is a fixed 680px wide
          and hangs past the viewport on a phone. */}
      <section className="relative mx-auto w-full max-w-[680px] overflow-hidden pt-4 text-center sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_60%)] blur-2xl"
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
          For local service businesses
        </p>
        <h1
          className="mx-auto mt-4 max-w-[600px] font-display font-bold leading-[1.05] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(2.1rem, 5.5vw, 3.4rem)' }}
        >
          Get found online —{' '}
          <span className="bg-gradient-to-br from-gold-hi via-gold-bright to-gold bg-clip-text text-transparent">
            we do all of it
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[500px] text-[16px] leading-[1.55] text-ink-2 sm:text-[17px]">
          You answer the phone. We handle everything that makes it ring — on
          Google <span className="text-ink">and</span> in AI answers.
        </p>

        {/* The VSL belongs HERE, not only on the homepage.
            This is the one-screen page — the link you text, and the one a video
            CTA should point at. On the homepage the video competes with a
            12-screen scroll and six other CTAs; here it sits between the
            promise and the price with nothing else asking for attention.
            Renders nothing until VITE_VSL_URL is set, so it costs nothing
            while the video is still being recorded. */}
        <Vsl />

        {/* The price, anchored. Same two-row block as the homepage hero: the
            struck $3,000+ does the arithmetic so the reader doesn't have to. */}
        <div className="mx-auto mt-7 max-w-[420px] overflow-hidden rounded-xl border border-gold/30 bg-surface text-left">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
            <span className="text-[14.5px] font-semibold text-ink">
              Your website, designed &amp; built
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-[13px] text-ink-4 line-through">$3,000+</span>
              <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-ok">
                Included
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[14.5px] text-ink-2">Then everything else, monthly</span>
            <span className="shrink-0 text-[17px] font-bold text-ink">
              {PLAN.price}
              <span className="text-[13px] font-semibold text-ink-3">{PLAN.period}</span>
            </span>
          </div>
        </div>

        <a
          href={href}
          onClick={() => track('start_cta_clicked', { spot: 'hero' })}
          className={`${GOLD_BUTTON} mx-auto mt-6`}
        >
          {PLAN.cta} →
        </a>
        <p className="mt-3 text-[13px] text-ink-3">
          {PLAN.perDay} · {PLAN.terms}
        </p>
      </section>

      {/* WHAT YOU GET — four tiles, then the rest as plain labels. */}
      <section className="mx-auto mt-14 w-full max-w-[680px] sm:mt-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-gold/85">
          Everything&apos;s included
        </p>
        <div className="mx-auto mt-5 grid max-w-[640px] grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { e: '🌐', t: 'Your Website', s: 'Built + included' },
            { e: '🔎', t: 'Get Ranked', s: 'Google + AI' },
            { e: '📍', t: 'Google Business', s: 'Managed monthly' },
            { e: '📊', t: 'Live Dashboard', s: 'See every call' },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4 text-center"
            >
              <div aria-hidden className="text-[24px]">{x.e}</div>
              <p className="mt-2 text-[14px] font-semibold text-ink">{x.t}</p>
              <p className="mt-0.5 text-[11px] text-ink-3">{x.s}</p>
            </div>
          ))}
        </div>
        <ul className="mx-auto mt-4 flex max-w-[560px] flex-wrap justify-center gap-x-4 gap-y-1.5">
          {MONTHLY_AT_A_GLANCE.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <span aria-hidden className="text-[10px] text-ok">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS — the real three steps. Step 1 used to be "book a call". */}
      <section className="mx-auto mt-14 w-full max-w-[680px] sm:mt-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {AFTER_YOU_START.map((s, i) => (
            <div
              key={s.step}
              className="rounded-[12px] border border-gold/20 bg-white/[0.02] p-5"
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-gold">
                Step {i + 1}
              </p>
              <p className="mt-2 text-[17px] font-bold text-ink">{s.step}</p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-2">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GUARANTEE + PROOF — quoted from lib/pricing, never retyped. */}
      <section className="mx-auto mt-12 flex w-full max-w-[640px] flex-col items-center gap-3 rounded-2xl border border-gold/25 bg-white/[0.02] p-6 text-center sm:mt-16">
        <p className="text-[14px] leading-[1.6] text-ink-2">
          {GUARANTEE.emoji}{' '}
          <span className="font-semibold text-ink">{GUARANTEE.title}.</span> {GUARANTEE.body}
        </p>
        <p className="text-[13px] text-ink-3">
          Real proof:{' '}
          <a href="/r/client/sandbar" className="text-gold underline-offset-2 hover:underline">
            see a live client dashboard — no login →
          </a>
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto mt-12 w-full max-w-[640px] rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.10] via-gold-deep/[0.05] to-on-gold p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-16 sm:p-10">
        <h2
          className="font-display font-bold leading-[1.1] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}
        >
          Start today.
        </h2>
        <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-[1.55] text-ink-2 sm:text-[15px]">
          {PLAN.tagline} {GUARANTEE.short}
        </p>
        <a
          href={href}
          onClick={() => track('start_cta_clicked', { spot: 'final' })}
          className={`${GOLD_BUTTON} mx-auto mt-6`}
        >
          {PLAN.cta} →
        </a>
      </section>

      <DirectLine
        heading="Rather ask first?"
        blurb="Text Ty directly. He answers his own phone — no account manager, no sales team."
      />

      <div className="mt-10 pb-10 text-center text-[12px] leading-[1.6] text-ink-4">
        <p>
          Want the full breakdown?{' '}
          <a href="/pricing" className="text-gold underline-offset-2 hover:underline">
            See what&apos;s included →
          </a>
        </p>
        <p className="mt-3">{FOUNDER.company} · Tampa Bay · © 2026 🐾</p>
      </div>
    </main>
  );
}

/**
 * Ty's real number, as two 44px targets. "You text Ty directly" is the offer,
 * so it has to be tappable wherever a customer would reach for it.
 */
function DirectLine({ heading, blurb }: { heading: string; blurb: string }) {
  return (
    <section className="mx-auto mt-12 w-full max-w-[640px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center sm:mt-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold/85">
        {heading}
      </p>
      <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-[1.55] text-ink-2">
        {blurb}
      </p>
      <div className="mt-4 flex flex-col justify-center gap-2.5 sm:flex-row">
        <a
          href={startSmsHref('Hi Ty — question about getting started.')}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gold/35 px-5 text-[14px] font-semibold text-gold transition-colors hover:border-gold/70 hover:bg-gold/[0.08]"
        >
          Text {FOUNDER.phoneDisplay}
        </a>
        <a
          href={`tel:${FOUNDER.phone}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-5 text-[14px] font-semibold text-ink-2 transition-colors hover:border-white/35 hover:text-ink"
        >
          Call {FOUNDER.phoneDisplay}
        </a>
      </div>
    </section>
  );
}
