/**
 * Lola — marketing homepage at `/`.
 *
 * Order: hero → Ty's letter → the problem → proof → the math → offer → FAQ.
 * Ty leads deliberately; he's the differentiator, and a contractor deciding
 * whether to keep reading is deciding about a person, not an argument.
 *
 * Design notes:
 *   • Editorial and asymmetric — solid black, one branded gold accent, real
 *     photos over icons. No pastel gradient blobs.
 *   • Deliberately NOT "developer-looking": no monospace labels outside the
 *     one column of aligned digits, no "01 / 02" section numbers, no extreme
 *     letterspacing, rounded rather than hairline-sharp corners. The audience
 *     is a contractor on a phone; a terminal aesthetic reads as "this is for
 *     engineers" and costs trust. Charisma comes from the voice and the
 *     photography, not from a typewriter face.
 *   • Growth Score is shown as a genuine diagnostic report card, not a
 *     lead-capture gimmick.
 *   • Proof is only what's verifiable — a real client's public dashboard and
 *     the visitor's own score. See ProofSection for why the job photos went.
 *
 * SSR-safe by construction: every section's copy is static markup that renders
 * with react-dom/server (see scripts/prerender.mjs), so the headline, body and
 * offer are readable in the raw HTML before any JS runs. Nothing here reads
 * `window`/`document` during render; the only effects (useSeo, useReveal) are
 * progressive enhancement. Pricing, Stripe links and the 90-Day Promise
 * are NOT defined here — they live in lib/pricing, lib/checkout and the
 * index.html JSON-LD, which this page intentionally does not touch.
 */

import { useState } from 'react';

import { FOUNDER, LOLA_TURNS } from './lib/lola';
/** Real Google Business Profile listing URL. Until it is set the badge makes
 *  no verification claim — see the note where it renders. */
const GBP_URL = (import.meta.env.VITE_GBP_URL as string | undefined)?.trim() || '';

import AnswerBlock from './AnswerBlock';
import PawMark from './PawMark';
import { HOME_QA } from './lib/pageMeta';
import { PLAN, GUARANTEE, GROWTH_SCORE_DIMENSIONS, MONTHLY_AT_A_GLANCE, EXCLUSIVITY, trialLine } from './lib/pricing';
import { startHref } from './lib/checkout';
import Vsl from './Vsl';
import FeatureShowcase from './FeatureShowcase';
import BeforeAfter from './BeforeAfter';
import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

// Sample Growth Score — an honest, representative scorecard (labelled SAMPLE),
// not a real client's numbers. The two low bars (AI Visibility, Revenue
// Tracking) are the leaks Lola is built to close.
// The hero card shows the GOAL, not a diagnosis. A red 62 with two failing bars
// was an accurate picture of an unoptimised business, and it read like being told
// you're sick before you've said hello. This is where the work takes you —
// labelled as the target so it never reads as a client's result or a promise.
// Every "Start" on this page resolves through one rule: straight to Stripe
// checkout once the Payment Link exists, /pricing until it does. Reader is
// still inside the pitch here, so atOffer stays false. See lib/checkout.
const START = startHref();

/**
 * One gold treatment for every primary CTA on the page.
 *
 * The mobile sticky bar already used a gradient with an outer glow while the
 * in-page buttons were a flat #D4AF37 — so on any given screen the most
 * important control looked cheaper than the persistent one following you
 * around. Same face everywhere now: the gradient slides on hover, the glow
 * deepens, and the button dips a hair on press so a tap feels answered.
 */
const GOLD_CTA =
  'group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-lg ' +
  'bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left ' +
  'text-[14px] font-bold uppercase tracking-[0.04em] text-on-gold ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_rgba(212,175,55,0.28)] ' +
  'transition-all duration-200 hover:bg-right ' +
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_rgba(212,175,55,0.44)] ' +
  'active:scale-[0.99]';

const SAMPLE_SCORE = 99;
// Values line up with the six canonical dimensions (single source of truth).
// The two lows — AI Visibility, Revenue Tracking — are the leaks Lola closes.
const SAMPLE_VALUES = [99, 98, 97, 99, 100, 98];
const SAMPLE_DIMENSIONS = GROWTH_SCORE_DIMENSIONS.map((name, i) => ({
  name,
  value: SAMPLE_VALUES[i] ?? 50,
}));

export default function Homepage() {
  usePageMeta('/');
  useReveal();

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      {/* The VSL sits directly under the hero — highest-intent real estate on a
          sales funnel, and it renders nothing until VITE_VSL_URL is set, so it
          costs nothing while the video is still being recorded. */}
      <Vsl />
      {/* Ty leads. He IS the differentiator, and a contractor deciding whether
          to keep reading is deciding about a person, not an argument. The
          analysis follows once they know who's talking. */}
      <StorySection />
      <ProblemSection />
      {/* Problem, then exactly what lands about it — each feature as a picture
          rather than a ticked label. Sits before the proof and the math so the
          reader knows WHAT they're buying before being shown that it works and
          what it's worth. */}
      <FeatureShowcase />
      <ProofSection />
      <RoiSection />
      <OfferSection />
      <FaqSection />
      <FinalCta />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO — asymmetric split: statement headline (left) + diagnostic report
   card (right). Solid black, hairline grid texture, one gold rule.
   ───────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative pt-2 sm:pt-4">
      {/* Soft bloom behind the headline. The hero was flat black — correct as a
          palette, but with no imagery on a phone it read as a document rather
          than a designed page. Clipped by overflow so it can't widen the
          viewport, and purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.13)_0%,transparent_62%)] blur-2xl sm:left-1/3"
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-14">
        {/* LEFT — the statement */}
        <div className="animate-slide-up">
          {/* A byline, not a label. Every competitor's hero opens with a
              category tag; this opens with a face and a name, which is the one
              thing none of them can copy. Doubles as the photography the design
              notes ask for, on the screen that had none. */}
          <div className="flex items-center gap-3">
            <img
              src="/images/ty-lola-beach.jpg"
              alt="Ty Alexander Traufield with his dog Lola"
              width={96}
              height={96}
              // eager + high priority: it sits above the fold and is the first
              // thing a visitor sees, so it must not lazy-load into place.
              loading="eager"
              // object-position tuned to the figures, not the frame. This is a
              // wide beach photo where Ty and Lola sit around 52% down; the
              // default centre crop filled the circle with sky. It reads as a
              // man and a dog at sunset rather than a face — the right warm
              // signal from the only photo that exists, but a real headshot
              // would be materially better here.
              className="h-12 w-12 shrink-0 rounded-full border border-gold/40 object-cover [object-position:center_52%]"
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold leading-tight text-ink">
                {FOUNDER.knownAs} — I do the work myself
              </span>
              <span className="block text-[11px] uppercase tracking-[0.1em] text-gold">
                AI Leads Expert · Tampa Bay
              </span>
            </span>
          </div>

          {/* text-balance stops the last line orphaning a word ("up?") when the
              display face falls back to a wider system font. */}
          {/* RE-LED HERO (personal-brand restructure): the page leads with Ty
              the person and branches into two doors — Grow (the business) and
              Train (the coach). The Lola price + full offer machinery now drops
              one screen down (VSL, offer card) and lives in full on /lolaleads,
              so the hero stays about who you're dealing with, not the SKU. */}
          <h1 className="mt-5 text-balance font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[52px] lg:text-[60px]">
            Hey — I'm Coach Ty.
            <span className="mt-2 block text-gold">I do the work myself.</span>
          </h1>

          <p className="mt-5 max-w-[540px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[18px]">
            I get Tampa Bay contractors found on Google and AI —{' '}
            <span className="font-semibold text-ink">and I coach people who train hard.</span>{' '}
            Two ways to work with me:
          </p>

          {/* THE TWO DOORS. Grow is primary (gold) — it's the live business.
              Train points at /about for now; it becomes /train once that page
              has real content. Both are honest: the Train blurb is Ty's real
              athletic identity (HYROX, strength & conditioning), no invented
              programs or results. */}
          <div className="mt-6 grid max-w-[540px] grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href="/lolaleads"
              className="group flex flex-col rounded-xl border border-gold/40 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] p-4 transition-colors hover:border-gold/70"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold">Grow</span>
              <span className="mt-1 text-[16px] font-bold text-ink">Get my business found</span>
              <span className="mt-1 text-[13px] leading-[1.5] text-ink-3">
                Lola Leads — done-for-you local SEO &amp; AI visibility. From {PLAN.price}{PLAN.period}.
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-gold">
                Explore Lola Leads
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </a>
            <a
              href="/about"
              className="group flex flex-col rounded-xl border border-white/[0.1] bg-white/[0.02] p-4 transition-colors hover:border-gold/40 hover:bg-gold/[0.04]"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">Train</span>
              <span className="mt-1 text-[16px] font-bold text-ink">Train with Ty</span>
              <span className="mt-1 text-[13px] leading-[1.5] text-ink-3">
                Hybrid athlete, HYROX, strength &amp; conditioning — the coach behind Lola.
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-gold">
                Meet Coach Ty
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </a>
          </div>

          {/* Cold traffic that isn't ready to pick a door still gets the free
              lead magnet one tap away, plus the guarantee as reassurance. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
            <a
              href="/growth-score"
              className="inline-flex items-center gap-1 font-semibold text-ink-2 underline-offset-4 transition hover:text-gold hover:underline"
            >
              New here? Run your free 60-second Growth Score →
            </a>
            <span aria-hidden className="text-ink-4">/</span>
            <span className="text-gold">Ranking in 90 days or 2 months free</span>
          </p>

          {/* PROOF ABOVE THE FOLD.
              The hero had none — nothing said anyone else trusts this. Every
              line here is checkable, which is the only kind worth putting in a
              hero: the dashboard opens with no login, the Google listing is
              real, and "Ty does the work" is the offer itself. Deliberately no
              star rating or client count — D-014 holds those until there are
              receipts, and an invented one would undo the rest of the page. */}
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-5 text-[12.5px] text-ink-3">
            <a
              href="/r/client/sandbar"
              className="inline-flex items-center gap-1.5 underline decoration-white/20 underline-offset-4 transition hover:text-gold hover:decoration-gold"
            >
              <span aria-hidden className="text-ok">●</span>
              See a real client's dashboard — no login
            </a>
            <span className="inline-flex items-center gap-1.5" title={EXCLUSIVITY.why}>
              <span aria-hidden className="text-ok">✓</span>
              {EXCLUSIVITY.short}
            </span>
            {/* The split the rest of the app already uses — ClientReport says
                "Lola is set up and watching", AuditFlow says "Lola is on it" —
                said once where a stranger can see it. Three beats: the system
                never stops, the founder does the work, and you can reach him.
                Ty is named SECOND on purpose. Leading with the software reads
                as "a bot does your SEO", which is the exact fear this line
                exists to kill; leading with the watching and landing on the
                human inverts it.

                It's an sms: link, so the claim is its own proof — tapping it
                opens a text to Ty rather than asking you to trust the sentence.
                Only the tail is underlined; the whole chip is the target. */}
            <a
              href={`sms:${FOUNDER.phone}?&body=${encodeURIComponent('Hi Ty — quick question about Lola.')}`}
              className="group inline-flex items-center gap-1.5 py-0.5 transition hover:text-gold"
            >
              <span aria-hidden className="text-ok">✓</span>
              Lola watches 24/7. Ty does the work.{' '}
              <span className="underline decoration-white/25 underline-offset-4 group-hover:decoration-gold">
                You text him.
              </span>
            </a>
          </div>
        </div>

        {/* RIGHT — the report card */}
        <div className="animate-slide-up lg:pt-3">
          <ReportCard />
        </div>
      </div>

      {/* Full-bleed hairline under the hero. */}
      <div aria-hidden className="mt-14 h-px w-full bg-gradient-to-r from-gold/40 via-white/10 to-transparent sm:mt-20" />
    </section>
  );
}
/* ─────────────────────────────────────────────────────────────────────────
   THE OFFER CARD — what you get, then the proof you can watch it working.

   Was a diagnostic scorecard: it opened on a 99/100 and six graded
   dimensions. That order asked a contractor to learn what a "Growth Score"
   is before he could tell what he was buying, and a number he doesn't have
   context for reads as homework, not as value.

   Now it opens on the single most legible thing in the plan — you miss a
   call, the caller gets a text back, you keep the job — shown as an actual
   text bubble rather than described. Everything a contractor already
   understands goes first; the score and the dashboard follow as proof that
   the work is visible, which is what a report is FOR.

   Static markup (SSR-safe) so all of it is in the prerendered HTML.
   ───────────────────────────────────────────────────────────────────────── */
function ReportCard() {
  const grade = SAMPLE_SCORE >= 95 ? 'A+' : SAMPLE_SCORE >= 80 ? 'B' : SAMPLE_SCORE >= 60 ? 'C+' : 'D';
  // The whole list runs as the checklist. It used to be sliced — the first
  // entry was promoted into the hook and `rest` filled the list — but the hook
  // is AI visibility now, which is not one of these lines. Slicing here would
  // silently drop missed-call text-back off the card entirely.

  return (
    <figure className="relative overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-b from-[#191A1F] to-[#141519] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
      {/* header band — names the offer and the price, not a product feature */}
      <div className="flex items-center justify-between border-b border-white/10 bg-surface-2 px-5 py-3">
        <span className="text-[10px] uppercase tracking-[0.08em] text-gold">
          🐾 Lola · What you get
        </span>
        <span className="text-[11px] font-bold text-ink">
          {PLAN.price}
          <span className="text-[10px] font-semibold text-ink-3">{PLAN.period}</span>
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {/* ── THE HOOK: the AI answer, shown rather than described ──
            This led with missed-call text-back, which is the most visceral
            line in the plan but the wrong one to headline. Two reasons it
            moved down to the checklist:

              1. It is dormant until Twilio is configured, so the first thing
                 a visitor read was the one promise the backend could not yet
                 keep.
              2. It is Podium's core product. Leading on it puts Lola on a
                 competitor's ground, and every /vs page argues the opposite.

            AI visibility is the inverse on both counts: the tracker runs
            Claude and ChatGPT today with nothing left to configure, and none
            of the six competitors in /vs offer it at all. It is also what the
            h1 already asks — "your next customer already searched for you,
            did you show up?" — so the card now answers the headline instead
            of changing the subject.

            Rendered as a chat exchange for the same reason the SMS was a
            bubble: the reader recognises the shape before reading a word. */}
        <div className="rounded-lg border border-ok/25 bg-ok/[0.05] p-4">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-ok">
            <span aria-hidden>✦</span> Get named in AI answers
          </p>
          <p className="mt-2 text-[14px] font-semibold leading-[1.5] text-ink">
            Your customer stopped scrolling ten blue links. They just ask.
          </p>

          <div className="mt-3 space-y-2">
            {/* what they type */}
            <div className="flex justify-end">
              <div className="max-w-[86%] rounded-2xl rounded-br-sm bg-[#3A62B8] px-3.5 py-2.5">
                <p className="text-[12.5px] leading-[1.45] text-ink">
                  who&apos;s the best soft wash company in Dunedin?
                </p>
              </div>
            </div>
            {/* what comes back */}
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/[0.09] bg-[#17181C] px-3.5 py-2.5">
                <p className="text-[12.5px] leading-[1.5] text-ink-2">
                  <span aria-hidden className="mr-1.5 text-ok">✦</span>
                  I&apos;d start with{' '}
                  <span className="font-semibold text-ink">[Your Company]</span> — strong
                  reviews and they cover Dunedin.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[12.5px] leading-[1.5] text-ink-3">
            Most shops are invisible here.{' '}
            <span className="font-semibold text-ink">Getting you named is the job.</span>
          </p>
        </div>

        {/* ── the rest of the monthly, as a plain checklist ── */}
        <p className="mt-5 text-[10px] uppercase tracking-[0.08em] text-gold">
          Every month, you also get
        </p>
        <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {MONTHLY_AT_A_GLANCE.map((item) => (
            <li
              key={item}
              className="flex items-start gap-1.5 text-[12px] leading-[1.45] text-ink-2"
            >
              <span aria-hidden className="mt-[2px] shrink-0 text-[10px] text-ok">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* The struck price is what makes $397 land. It lived only in the left
            column, so the card listing everything you get never showed the one
            number that reframes the price. */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-3">
          <span className="text-[12.5px] leading-[1.4] text-ink-2">
            <span aria-hidden className="mr-1.5">🌐</span>
            Your website, designed &amp; built
          </span>
          <span className="flex shrink-0 items-baseline gap-2">
            <span className="text-[12px] text-ink-4 line-through">$3,000+</span>
            <span className="rounded-full border border-ok/35 bg-ok/[0.12] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-ok">
              Included
            </span>
          </span>
        </div>

        {/* ── THE PROOF: the score, demoted to where it belongs ──
            Same 99 and the same six dimensions, but after the offer instead of
            in front of it, and compressed. Its job here is "you can check my
            work", not "here is a number to interpret". */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.08em] text-gold">
                And you can watch it work
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-2">
                Your Growth Score, re-checked every month on your own dashboard.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-ok">
                {SAMPLE_SCORE}
                <span className="text-[13px] text-ink-3">/100</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-ok">Grade {grade}</p>
            </div>
          </div>

          {/* Compact bars — 5px rather than 7px, tighter rhythm. Same data. */}
          <div className="mt-3 space-y-1.5">
            {SAMPLE_DIMENSIONS.map((d) => (
              <div key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                <div className="flex items-center gap-2">
                  <span className="w-[132px] shrink-0 text-[10px] uppercase tracking-[0.08em] text-ink-3">
                    {d.name}
                  </span>
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-ok/60"
                      style={{ width: `${d.value}%` }}
                    />
                  </span>
                </div>
                <span className="font-mono text-[10.5px] tabular-nums text-ok/75">
                  {String(d.value).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-ink-3">
            Most start near 60. Sample shown — yours takes 60 seconds.
          </p>
        </div>

        {/* BUY, right here. The card spends its whole height explaining what
            $397 gets you and then offered no way to take it — the reader who
            was convinced by it had to go hunting. Primary is the purchase;
            the free score stays underneath for anyone not ready. */}
        <a href={START} className={`${GOLD_CTA} mt-5 w-full px-6 py-3`}>
          Start — {PLAN.price}{PLAN.period}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
        <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-ink-3">
          No setup fee · cancel anytime after the first 3 months
        </p>

        {/* Softer second path, 44px min height. */}
        <a
          href="/growth-score"
          className="group mt-3 flex min-h-[44px] items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2.5 transition-colors hover:border-gold/60 hover:bg-gold/[0.08]"
        >
          <p className="flex-1 text-[13px] leading-[1.45] text-ink-2">
            <span className="font-semibold text-ink">See your own score first</span> — free, 60
            seconds, no signup.
          </p>
          <span
            aria-hidden
            className="shrink-0 text-[13px] text-gold transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </a>
      </div>

      <figcaption className="border-t border-white/10 bg-surface-2 px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.08em] text-ink-3">
        🛡️ {GUARANTEE.short}
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   02 — THE PROBLEM, AND WHAT'S ACTUALLY PROMISED.

   Formerly two sections (problem + honest fix) running ~350 words to make one
   point. Merged and cut to the one-sentence register the voice guide asks for:
   the two query cards SHOW the failure, so the prose doesn't need to explain
   it, and the guarantee/won't-fake split carries the honesty pillar.
   ───────────────────────────────────────────────────────────────────────── */
function ProblemSection() {
  return (
    <section className="mt-14 sm:mt-20">
      <SectionHead kicker="What's going wrong" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
        <div>
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
            Right now, someone near you is asking for exactly what you sell.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.65] text-ink-2 sm:text-[17px]">
            If you're not in the answer, they hire someone else. You never find out the
            sale existed — <span className="font-semibold text-ink">and neither do they.</span>
          </p>
        </div>

        {/* The cards do the explaining — competitor picked, on Google and in AI. */}
        <div className="space-y-4">
          <QueryCard
            engine="Google"
            query="best pressure washing company near me"
            answer="Top 3 map results — your competitor, not you."
          />
          <QueryCard
            engine="ChatGPT"
            query="who should I hire to soft-wash my house in Tampa?"
            answer={"“Based on reviews and local presence, I’d recommend…” — and it names someone else."}
          />
        </div>
      </div>

      {/* The honest split — what's guaranteed, what isn't. */}
      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
        <div className="bg-surface p-6 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
            ✓ What I guarantee
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-ink">
            You get found. On Google, and in the AI answers.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">
            That's the part I control.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-gold">
            {GUARANTEE.emoji} {GUARANTEE.title}
          </p>
        </div>

        <div className="bg-surface p-6 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
            ✗ What I won't fake
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-ink">
            Leads. Anyone promising you those is guessing.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">
            I get you in front of them. Closing is on both of us.
          </p>
        </div>
      </div>
    </section>
  );
}

function QueryCard({ engine, query, answer }: { engine: string; query: string; answer: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
        <span aria-hidden className="text-[11px] text-gold">⌕</span>
        <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3">{engine}</span>
      </div>
      <p className="mt-3 text-[15px] font-medium text-ink">"{query}"</p>
      <p className="mt-2 flex items-start gap-2 text-[13px] leading-[1.55] text-ink-3">
        <span aria-hidden className="mt-0.5 text-[#E5534B]">✗</span>
        <span>{answer}</span>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   03 — PROOF, THE ONLY KIND WORTH SHOWING.

   This replaced a wall of before/after job photos. Two problems with those:
   the /gallery set is 40 filenames over 16 unique images (categories padded
   with byte-identical copies), which nobody can call "real work" under the
   no-fabricated-proof rule in DECISIONS.md — and clean driveways prove
   SANDBAR's work, not Lola's. What Lola actually sells is being found.

   So the proof is the two things that are genuinely verifiable: a real
   client's live public dashboard (no login — anyone can audit it), and the
   visitor's own score on their own business. Per DECISIONS.md the only
   Sandbar numbers quoted are the verifiable ones (15+ years, 20+ cities).
   ───────────────────────────────────────────────────────────────────────── */
function ProofSection() {
  return (
    <section className="mt-14 sm:mt-20">
      <SectionHead kicker="Don't take my word for it" />
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
        Most agencies show you a case study. I'll just give you the login.
      </h2>
      <p className="mt-5 max-w-[680px] text-[16px] leading-[1.65] text-ink-2 sm:text-[17px]">
        Every move I make for a client is tracked on a dashboard anyone can open. No
        screenshot I picked, no number I typed in myself.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* the receipts */}
        <a
          href="/r/client/sandbar"
          className="group flex flex-col rounded-xl border border-gold/30 bg-surface p-6 transition-colors hover:border-gold/60 sm:p-7"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
            Live client dashboard
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-ink">
            Sandbar Soft Wash — 15 years of great work. Almost zero Google.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-ink-2">
            A real Palm Harbor business serving 20+ cities across Tampa Bay, that nobody
            could find online. The whole rebuild is in the open — every move, timestamped,
            for anyone to check.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-gold">
            Open the dashboard
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>

        {/* self-proof — better than any case study, because it's about them */}
        <a
          href="/growth-score"
          className="group flex flex-col rounded-xl border border-white/12 bg-[#0B0B0D] p-6 transition-colors hover:border-gold/40 sm:p-7"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
            Or skip my proof entirely
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-ink">
            Run it on your own business. Right now, free.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-ink-2">
            Sixty seconds, no signup. You'll see exactly where you stand on Google and in
            AI answers — and the one fix that moves you most. Whether you hire me is a
            separate conversation.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-ink">
            Get my Growth Score
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   03 — THE STORY. A signed, first-person letter from Ty Alexander Traufield
   ("Coach Ty") — his own words. A named human with a photo and a stated
   motive outperforms third-person agency boilerplate, and it's the truth.
   ───────────────────────────────────────────────────────────────────────── */
function StorySection() {
  return (
    // id="founder" gives the founder story a stable, linkable address. It is
    // the one section other pages want to point at ("who you're working with")
    // and the only part of the site with no URL of its own — /pricing and
    // /growth-score both link here now. A standalone /about page would be
    // better still; this is the version that doesn't need a new route.
    <section id="founder" className="scroll-mt-24 mt-14 sm:mt-20">
      <SectionHead kicker="Who you're dealing with" />
      {/* Three grid children so mobile can read photo → letter → résumé.
          Keeping the résumé glued under the photo pushed the first line of the
          letter ~660px down the page on a small phone. Desktop is unchanged:
          explicit row/column placement puts photo and résumé back in the left
          column with the letter spanning both rows on the right. */}
      <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-[minmax(260px,340px)_1fr] sm:items-start sm:gap-x-14 sm:gap-y-5">
        {/* Sticky on desktop. The letter is taller than the photo no matter how
            tight the copy gets, and a fixed photo left ~490px of dead black
            column beside the text — which is what read as "choppy". Sticking it
            means the portrait travels with the letter instead of abandoning it. */}
        <figure className="order-1 sm:col-start-1 sm:row-start-1">
          <div className="overflow-hidden rounded-xl border border-gold/25">
            <img
              src="/images/ty-lola-beach.jpg"
              alt="Ty Alexander Traufield — Coach Ty — with his dog Lola, the namesake of Lola Leads, on a Tampa Bay beach at sunset"
              loading="lazy"
              width={600}
              height={800}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Ty &amp; Lola · St. Pete, FL
          </figcaption>
        </figure>


        {/* the letter */}
        <div className="order-2 sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
            Hey — I'm Ty.
          </h2>

          {/* max-w keeps the letter at a readable ~70 characters per line. */}
          <div className="mt-6 max-w-[58ch] space-y-4 text-[16px] leading-[1.7] text-ink-2 sm:text-[17px]">
            {/* The two halves of the dog ARE the two halves of the product, and
                saying so is the cleanest way to explain what's software and
                what's a person without using either word. Matches the hero
                chip — "Lola watches 24/7. Ty does the work."

                Cut from ~235 words to ~150. Every paragraph that survived got
                its setup removed: this is a founder letter on a sales page, not
                an essay, and the reader is deciding about a person in about
                fifteen seconds. Short sentences ARE the charisma here — the
                voice reads as someone talking, not writing. */}
            <p>
              Lola's my dog —{' '}
              <span className="font-semibold text-ink">half basset hound, half shepherd</span>,{' '}
              {LOLA_TURNS} this February. The basset never loses a scent. The shepherd never
              leaves the flock. Turns out that's the whole job.
            </p>
            <p>
              So that's how we work. Lola watches — your rankings, your reviews, your calls.
              Around the clock, never bored, never off.{' '}
              <span className="font-semibold text-ink">I do the work she turns up.</span>
            </p>
            <p>
              I coach strength and conditioning. Same job either way: show up, do the work, keep
              showing up on the days nothing's happening yet. That's what moves you up Google.
              It's the part most agencies quietly skip.
            </p>
            <p>
              It started with one crew —{' '}
              {/* Points at the LIVE dashboard, not /case-studies/sandbar. That
                  page is held by D-014 until the ranking tracker has real
                  receipts, and the route 404s while the flag is off — so this
                  link, in the one paragraph where the reader decides whether to
                  believe any of it, silently dropped them back on the homepage. */}
              <a
                href="/r/client/sandbar"
                className="font-semibold text-ink underline decoration-gold/40 underline-offset-4 transition hover:decoration-gold"
              >
                Sandbar Soft Wash
              </a>
              , right here in the bay. Got them found on Google and in the AI answers. The phone
              started ringing. So I built the system to do it again.
            </p>
            {/* GUARANTEE.short, not GUARANTEE.body. The full version opens with
                "We pick your money keywords together in week 1" — true, and the
                right level of detail on /pricing, but it turns the hardest-
                hitting line in the letter into a procedure. The terms live one
                click away; this paragraph only has to land the promise. */}
            <p className="border-l-2 border-gold pl-4 text-ink">
              What I'm not: a $5K-a-month agency hiding behind a dashboard. I answer my own phone.
              I do the work myself.{' '}
              <span className="font-bold text-gold">{GUARANTEE.short}</span> In writing.
            </p>
            <p>
              A local business that finally gets found changes what a family can say yes to.
              That's the whole point. Enough of you win,{' '}
              <span className="font-semibold text-ink">and Lola gets the backyard she deserves.</span>
            </p>
            <p className="text-[17px] font-semibold text-ink sm:text-[18px]">
              Let's get your phone ringing.
            </p>
          </div>

        </div>

        {/* Signature sits UNDER THE PORTRAIT on desktop, not at the end of the
            letter. Two reasons: it's where a signed letter puts it, next to the
            face; and it fills the column the photo used to leave empty, which
            is what made this section read as choppy. On mobile the explicit
            order keeps the human sequence — photo, letter, then who signed it. */}
        <div className="order-3 sm:col-start-1 sm:row-start-2 sm:-mt-1">
          <p className="font-display text-[20px] text-gold">— {FOUNDER.knownAs}</p>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-2">
            <span className="font-semibold text-ink">{FOUNDER.fullName}</span>
            <br />
            {FOUNDER.title} · {FOUNDER.company}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-3">
            {FOUNDER.location}
          </p>
          {/* This used to read "✓ Verified Google Business" while pointing at a
              Google Maps SEARCH QUERY — not a claimed listing — and the GBP
              integration is still unconfigured (see docs/SETUP.md). Claiming a
              verification the business doesn't have yet is the one thing this
              site cannot afford, on the page where it argues that everyone else
              inflates their proof.

              So the badge is honest by default and only claims verification
              when VITE_GBP_URL points at a real listing. Set that var and the
              ✓ appears with a link that actually proves it. */}
          <a
            href={GBP_URL || 'https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL'}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-2.5 text-[11px] uppercase leading-[1.2] tracking-[0.12em] text-gold transition hover:border-gold/60 hover:bg-gold/[0.12]"
          >
            {GBP_URL ? '✓ Verified Google Business' : 'Find us on Google Maps'}{' '}
            <span aria-hidden>↗</span>
          </a>

          {/* The signals the letter doesn't have room for, as chips rather than
              three more paragraphs — the brief asks for warm and credible, and
              a fourth paragraph of prose is neither. Every one is checkable or
              is a promise already published elsewhere on the site. */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {[
              'Hybrid athlete · trains HYROX',
              'Faith and family first',
              'Started with my dad\u2019s crew',
              GUARANTEE.title,
            ].map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-[11.5px] leading-none text-ink-3"
              >
                <PawMark className="shrink-0 text-gold/70" />
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Real screenshots beat every mock on this page. Renders nothing until
          the two images are in place and the flag is on — see BeforeAfter. */}
      <BeforeAfter />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   04 — THE MATH. The agency-cost contrast plus a break-even calculator.

   Deliberately COST arithmetic, never a return promise: every figure here is
   either the visitor's own number or a published price. Promising "X leads →
   Y revenue" would contradict section 02 (the honest fix), which is the most
   valuable thing on this page — so the section says so out loud.
   ───────────────────────────────────────────────────────────────────────── */

/** Numeric prices derived from the display strings so lib/pricing stays the
 *  single source of truth — change the price there and this math follows. */
const MONTHLY_PRICE = Number(PLAN.price.replace(/[^0-9.]/g, ''));
const LOLA_YEAR_ONE = MONTHLY_PRICE * 12;
/** The comparison Ty gets quoted against — a $5K/mo retainer agency. */
const AGENCY_MONTHLY = 5000;
const AGENCY_YEAR_ONE = AGENCY_MONTHLY * 12;

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

const COMPARISON: ReadonlyArray<{ label: string; agency: string; lola: string }> = [
  { label: 'Year one', agency: usd(AGENCY_YEAR_ONE), lola: `${usd(LOLA_YEAR_ONE)} — $${MONTHLY_PRICE}/mo` },
  { label: 'Website build', agency: '$3,000+ extra, up front', lola: 'Included, no setup fee' },
  { label: 'Contract', agency: '12 months, locked', lola: 'Cancel after 3 months' },
  { label: 'Who does the work', agency: 'An account manager', lola: 'Ty — the one you texted' },
  { label: 'What you get monthly', agency: 'A 50-page PDF report', lola: 'A live score you can check' },
  { label: "If you don't rank", agency: 'You keep paying', lola: 'Your next 2 months are free' },
];

function RoiSection() {
  // Visitor's own average job value — the only input, and it never leaves the
  // browser. Default is a plausible mid-range local-services ticket.
  const [avgJob, setAvgJob] = useState(500);
  // One plan, so one row. Two rows rendered identical text once DIY and BUILD
  // both aliased to PLAN — the sweep made it a literal duplicate.
  const jobsForMonthly = Math.max(1, Math.ceil(MONTHLY_PRICE / Math.max(avgJob, 1)));

  return (
    <section className="mt-14 sm:mt-20">
      <SectionHead kicker="The math" />
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
        If you've been quoted {usd(AGENCY_MONTHLY)} a month, read this part twice.
      </h2>
      <p className="mt-5 max-w-[680px] text-[16px] leading-[1.65] text-ink-2 sm:text-[17px]">
        Same job. An agency just has salaries to cover before your first result. I don't.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* the comparison */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface">
          {/* Mobile: label on its own line, then the two values side by side.
              sm+: a true three-column table. Keeps the label readable at 320px
              instead of crushing it into a ~70px gutter. */}
          <div className="grid grid-cols-2 items-end gap-x-3 border-b border-white/10 bg-[#141416] px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5">
            <span className="hidden text-[10px] uppercase tracking-[0.08em] text-ink-3 sm:block">
              Compare
            </span>
            <span className="text-left text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-ink-3 sm:w-[128px] sm:text-right lg:w-[152px]">
              {usd(AGENCY_MONTHLY)}/mo agency
            </span>
            <span className="text-right text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-gold sm:w-[136px] lg:w-[160px]">
              Lola — $397/mo
            </span>
          </div>

          <dl className="divide-y divide-white/[0.07]">
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-2 items-start gap-x-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5"
              >
                <dt className="col-span-2 mb-1.5 text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:col-span-1 sm:mb-0 sm:font-sans sm:text-[13px] sm:normal-case sm:tracking-normal">
                  {row.label}
                </dt>
                {/* The strike-through is the only thing marking the agency
                    column, and text-decoration isn't exposed to screen
                    readers — so name each side explicitly. */}
                <dd className="text-left text-[13px] leading-[1.4] text-ink-3 line-through decoration-[#E5534B]/50 sm:w-[128px] sm:text-right lg:w-[152px]">
                  <span className="sr-only">{usd(AGENCY_MONTHLY)}/mo agency: </span>
                  {row.agency}
                </dd>
                <dd className="text-right text-[13px] font-semibold leading-[1.4] text-ink sm:w-[136px] lg:w-[160px]">
                  <span className="sr-only">Lola — $397/mo: </span>
                  {row.lola}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-gold/25 bg-gold/[0.06] px-4 py-4 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-gold">
              Year-one difference
            </p>
            <p className="mt-1 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[38px]">
              {usd(AGENCY_YEAR_ONE - LOLA_YEAR_ONE)}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-ink-2">
              stays in your business
            </p>
            {/* The qualifier has to sit WITH the big number — on mobile the
                disclaimer in the calculator card renders far below it. */}
            <p className="mt-3 text-[12px] leading-[1.55] text-ink-3">
              Versus a {usd(AGENCY_MONTHLY)}/mo retainer over 12 months. Comparing{' '}
              <span className="text-ink-2">what you pay</span>, not what you get.
            </p>
          </div>
        </div>

        {/* break-even calculator */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-[#0B0B0D] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Break-even
          </p>
          <label
            htmlFor="avg-job"
            className="mt-3 block text-[17px] font-semibold leading-[1.35] text-ink"
          >
            What's one job worth to you?
          </label>

          {/* aria-hidden: the range reports this same value via aria-valuetext,
              and a live region here would fight the one on the result below. */}
          <output
            htmlFor="avg-job"
            aria-hidden="true"
            className="mt-4 block font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-gold"
          >
            {usd(avgJob)}
          </output>

          <input
            id="avg-job"
            type="range"
            min={100}
            max={2500}
            step={50}
            value={avgJob}
            onChange={(e) => setAvgJob(Number(e.target.value))}
            aria-valuetext={usd(avgJob)}
            aria-describedby="avg-job-help"
            className="mt-4 h-12 w-full cursor-pointer accent-gold"
          />
          <div
            id="avg-job-help"
            className="-mt-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-ink-3"
          >
            <span>$100</span>
            {/* Visually the first casualty at 375px, but `hidden` would drop it
                from the accessibility tree and gut the aria-describedby — so
                hide it visually only. */}
            <span className="sr-only sm:not-sr-only sm:inline">Drag to your average ticket</span>
            <span>$2,500</span>
          </div>

          {/* The result IS the widget's point — announce it, or a screen-reader
              user hears "550… 600…" and never learns the answer. */}
          <div
            role="status"
            aria-live="polite"
            className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-5"
          >
            <BreakEvenRow
              label={`${PLAN.price}${PLAN.period}`}
              jobs={jobsForMonthly}
              featured
            />
          </div>

          <p className="mt-5 text-[12px] leading-[1.55] text-ink-3">
            <span className="text-ink-2">Cost math, not a lead promise.</span> And that's one
            job a month — not one job total.
          </p>

          {/* Peak intent: the number just resolved against their own ticket. */}
          <a
            href={START}
            className={`${GOLD_CTA} mt-5 px-6 py-3`}
          >
            Start my {PLAN.price}{PLAN.period}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function BreakEvenRow({
  label,
  jobs,
  featured,
}: {
  label: string;
  jobs: number;
  featured?: boolean;
}) {
  return (
    // Stacks on mobile: side-by-side crushes the label to ~37px at 320px and
    // wraps the plan label onto four lines.
    <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className={`text-[13px] ${featured ? 'font-semibold text-ink' : 'text-ink-2'}`}>
        {label}
      </span>
      <span className={`text-[13px] tabular-nums ${featured ? 'text-gold' : 'text-ink-2'}`}>
        pays for itself at{' '}
        <span className="whitespace-nowrap font-bold">
          {jobs} job{jobs === 1 ? '' : 's'}
        </span>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   05 — THE OFFER. Free score first, then two tiers (DIY / Full Build).
   Pricing pulled from lib/pricing; CTAs route to /growth-score and /pricing
   (where the Stripe checkout lives) — no checkout links defined here.
   ───────────────────────────────────────────────────────────────────────── */
function OfferSection() {
  return (
    <section className="mt-14 sm:mt-20">
      <SectionHead kicker="Start free, then choose" />
      <h2 className="mt-8 max-w-[760px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
        See exactly where you stand — free — then pick your path.
      </h2>

      {/* free step */}
      <a
        href="/growth-score"
        className="group mt-8 flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/[0.05] p-5 transition-colors hover:bg-gold/[0.09] sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-center gap-4">
          <span className="font-display text-[26px] font-bold text-gold">00</span>
          <div>
            <p className="text-[17px] font-semibold text-ink">Free 60-second Growth Score</p>
            <p className="mt-0.5 text-[14px] text-ink-2">Your 0–100 score across six dimensions + your single biggest fix. No signup.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.1em] text-gold">
          Start free <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </a>

      {/* One plan. A two-up grid of the same card was what the sweep left
          behind once DIY and BUILD both aliased PLAN. */}
      <div className="mt-4 mx-auto max-w-[520px]">
        <TierCard tier={PLAN} href={START} featured />
      </div>

      <p className="mt-5 text-[12px] leading-[1.6] text-ink-3">
        Website design included · $0 setup · cancel after 3 months · {GUARANTEE.emoji}{' '}
        {GUARANTEE.title}.
      </p>
    </section>
  );
}

function TierCard({ tier, href, featured }: { tier: typeof PLAN; href: string; featured?: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 sm:p-7 ${
        featured ? 'border-gold/50 bg-surface' : 'border-white/12 bg-[#0B0B0D]'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] uppercase tracking-[0.08em] text-ink">{tier.name}</p>
        {featured && (
          <span className="rounded-md bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-on-gold">
            {undefined}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-ink">
        {tier.price}
        <span className="ml-2 text-[12px] font-normal uppercase tracking-[0.14em] text-ink-3">{tier.period}</span>
      </p>
      <p className="mt-3 text-[15px] font-medium leading-[1.45] text-ink-2">{tier.tagline}</p>

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-white/[0.07] pt-5">
        {tier.includes.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-ink-2">
            <span aria-hidden className="mt-0.5 text-gold">✓</span>
            <span>{line}</span>
          </li>
        ))}
        {true && (
          <li className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-ink">
            <span aria-hidden className="mt-0.5">{GUARANTEE.emoji}</span>
            <span className="font-semibold">{GUARANTEE.title}</span>
          </li>
        )}
      </ul>

      <a
        href={href}
        className={`mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
          featured
            ? 'bg-gold text-on-gold hover:bg-gold-bright'
            : 'border border-white/15 text-ink hover:border-gold/60 hover:text-gold'
        }`}
      >
        {tier.cta} <span aria-hidden>→</span>
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FAQ — mirrors the FAQPage JSON-LD in index.html. Pure <details>, SSR-safe.
   ───────────────────────────────────────────────────────────────────────── */
function FaqSection() {
  // HOME_QA is the same array src/lib/pageMeta.ts turns into this route's
  // FAQPage, so the schema and the rendered copy cannot drift. The three
  // demand questions ("how do I get found on Google and AI", "how much does
  // local SEO cost", "how long does it take") lead, because those are the
  // queries an answer engine is actually resolving when it cites a page.
  return (
    <AnswerBlock
      items={HOME_QA}
      heading="Straight answers"
      kicker="Straight answers"
      collapsible
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FINAL CTA — the searcher is live right now.
   ───────────────────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="relative left-1/2 right-1/2 mt-14 -mx-[50vw] w-screen border-t border-gold/30 bg-black py-14 sm:mt-20 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-5 text-center sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.1em] text-gold">Your next customer is searching right now</p>
        <h2 className="mx-auto mt-5 max-w-[760px] font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">
          Make sure the answer is you.
        </h2>
        <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
          See where you stand in 60 seconds — free, no card. Or start today: website design included, {PLAN.price}{PLAN.period}, cancel anytime after 3 months.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/growth-score"
            className={`${GOLD_CTA} px-8 py-3`}
          >
            Get my free Growth Score <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <a
            href={START}
            className="inline-flex min-h-[56px] items-center justify-center rounded-lg border border-gold/35 px-8 py-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-gold transition-colors hover:border-gold/70 hover:bg-gold/[0.08]"
          >
            Start now — {PLAN.price}{PLAN.period}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── shared: section header with hanging index number ────────────────────── */
/**
 * Section label. Deliberately NOT numbered: "01 —— THE PROBLEM" in a
 * letterspaced mono face reads like a source file, and the audience is a
 * contractor on a phone, not a developer. A gold dot and a plainly readable
 * label carry the same structure without the terminal costume.
 */
function SectionHead({ kicker }: { kicker: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <PawMark className="shrink-0 text-gold" />
      <span className="text-[14px] font-semibold text-gold sm:text-[15px]">{kicker}</span>
    </div>
  );
}
