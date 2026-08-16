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
import { PLAN, GUARANTEE, GROWTH_SCORE_DIMENSIONS, MONTHLY_AT_A_GLANCE, EXCLUSIVITY, trialLine } from './lib/pricing';
import { startHref } from './lib/checkout';
import Vsl from './Vsl';
import FeatureShowcase from './FeatureShowcase';
import BeforeAfter from './BeforeAfter';
import { useSeo } from './lib/seo';
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
  'bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left ' +
  'text-[14px] font-bold uppercase tracking-[0.04em] text-[#0A0A0B] ' +
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
  useSeo({
    title: 'Did you show up? Get found on Google & AI — Lola Leads, Tampa Bay',
    description:
      "Your next customer already searched for you on Google and ChatGPT. Lola makes sure you're the one they find — and the one they choose. Free 60-second Growth Score, then the $397/month plan, backed by the 90-Day Promise.",
  });
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
              className="h-12 w-12 shrink-0 rounded-full border border-[#D4AF37]/40 object-cover [object-position:center_52%]"
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold leading-tight text-[#ECECEF]">
                {FOUNDER.knownAs} — I do the work myself
              </span>
              <span className="block text-[11px] uppercase tracking-[0.1em] text-[#D4AF37]">
                AI Leads Expert · Tampa Bay
              </span>
            </span>
          </div>

          {/* text-balance stops the last line orphaning a word ("up?") when the
              display face falls back to a wider system font. */}
          <h1 className="mt-5 text-balance font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-[#ECECEF] sm:text-[52px] lg:text-[60px]">
            Your next customer already searched for you.
            <span className="mt-2 block text-[#D4AF37]">Did you show up?</span>
          </h1>

          {/* ONE line, not four.
              This used to open with "Every day, customers pick a competitor from
              a Google or AI result you never knew existed" — four lines of setup
              that pushed the button off a phone screen, and that ProblemSection
              already makes better two scrolls down. The headline is the punch;
              this only has to land the promise and get out of the way. */}
          <p className="mt-5 max-w-[520px] text-[16.5px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
            Lola makes sure you're the one they find —{' '}
            <span className="font-semibold text-[#ECECEF]">and the one they choose.</span>
          </p>

          {/* VALUE ANCHOR, not a sentence.
              As prose, "included free ... most shops charge $3,000+" made the
              reader do the arithmetic themselves, and most won't. Struck price
              beside "Included" does it for them in one glance — the $397 lands
              against $3,000, not against nothing. Same claim, no new promises. */}
          <div className="mt-5 max-w-[440px] overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] shadow-[0_14px_40px_-18px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <span className="text-[14.5px] font-semibold text-[#ECECEF]">Your website, designed &amp; built</span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-[13px] text-[#7A7F8A] line-through">$3,000+</span>
                <span className="rounded-full border border-[#4ADE80]/35 bg-[#4ADE80]/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#4ADE80]">
                  Included
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[14.5px] text-[#C5C5C8]">Then everything else, monthly</span>
              <span className="shrink-0 text-[17px] font-bold text-[#ECECEF]">
                {PLAN.price}<span className="text-[13px] font-semibold text-[#8A8F98]">{PLAN.period}</span>
              </span>
            </div>
          </div>
          {/* One line. The struck $3,000+ above already makes the comparison —
              spelling it out again in two more lines was the reader doing the
              same arithmetic twice. */}
          <p className="mt-2.5 text-[13px] leading-[1.5] text-[#8A8F98]">
            No setup fee. Most shops charge that up front.
          </p>

          {/* flex-wrap guards the shrink-0 buttons: at narrow desktop widths the
              second one drops to its own row instead of overflowing the column. */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="/growth-score"
              className={`${GOLD_CTA} shrink-0 whitespace-nowrap px-6 py-3`}
            >
              Run my free Growth Score
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href={START}
              // Hidden on mobile: the sticky bar carries "START — $397/MO"
              // permanently at the bottom of the screen, so this rendered the
              // same ask twice within one thumb-reach — and the lower copy was
              // clipped by the bar duplicating it.
              className="hidden min-h-[56px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#D4AF37]/35 px-5 py-3 text-[14px] font-semibold text-[#D4AF37] transition-colors hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.08] sm:inline-flex"
            >
              Start — {PLAN.price}{PLAN.period}
            </a>
          </div>

          {/* "No setup fee" was here too — it now sits directly above the
              buttons, and saying it twice in 60px of screen reads as filler. */}
          {/* The only honest urgency here. No counter — "3 spots left in Tampa"
              converts better and is invented, which is the exact thing this
              business is positioned against. */}
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#8A8F98]">
            {trialLine() && <span className="text-[#4ADE80]">{trialLine()}</span>}
            {trialLine() && <span aria-hidden className="text-[#3A3F48]">/</span>}
            <span>Free 60-second Growth Score</span>
            <span aria-hidden className="text-[#3A3F48]">/</span>
            <span className="text-[#D4AF37]">Ranking in 90 days or 2 months free</span>
          </p>

          {/* PROOF ABOVE THE FOLD.
              The hero had none — nothing said anyone else trusts this. Every
              line here is checkable, which is the only kind worth putting in a
              hero: the dashboard opens with no login, the Google listing is
              real, and "Ty does the work" is the offer itself. Deliberately no
              star rating or client count — D-014 holds those until there are
              receipts, and an invented one would undo the rest of the page. */}
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-5 text-[12.5px] text-[#9AA0A6]">
            <a
              href="/r/client/sandbar"
              className="inline-flex items-center gap-1.5 underline decoration-white/20 underline-offset-4 transition hover:text-[#D4AF37] hover:decoration-[#D4AF37]"
            >
              <span aria-hidden className="text-[#4ADE80]">●</span>
              See a real client's dashboard — no login
            </a>
            <span className="inline-flex items-center gap-1.5" title={EXCLUSIVITY.why}>
              <span aria-hidden className="text-[#4ADE80]">✓</span>
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
              className="group inline-flex items-center gap-1.5 py-0.5 transition hover:text-[#D4AF37]"
            >
              <span aria-hidden className="text-[#4ADE80]">✓</span>
              Lola watches 24/7. Ty does the work.{' '}
              <span className="underline decoration-white/25 underline-offset-4 group-hover:decoration-[#D4AF37]">
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
      <div aria-hidden className="mt-14 h-px w-full bg-gradient-to-r from-[#D4AF37]/40 via-white/10 to-transparent sm:mt-20" />
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
    <figure className="relative overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#191A1F] to-[#141519] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
      {/* header band — names the offer and the price, not a product feature */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1C1D23] px-5 py-3">
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">
          🐾 Lola · What you get
        </span>
        <span className="text-[11px] font-bold text-[#ECECEF]">
          {PLAN.price}
          <span className="text-[10px] font-semibold text-[#8A8F98]">{PLAN.period}</span>
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
        <div className="rounded-lg border border-[#4ADE80]/25 bg-[#4ADE80]/[0.05] p-4">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[#4ADE80]">
            <span aria-hidden>✦</span> Get named in AI answers
          </p>
          <p className="mt-2 text-[14px] font-semibold leading-[1.5] text-[#ECECEF]">
            Your customer stopped scrolling ten blue links. They just ask.
          </p>

          <div className="mt-3 space-y-2">
            {/* what they type */}
            <div className="flex justify-end">
              <div className="max-w-[86%] rounded-2xl rounded-br-sm bg-[#3A62B8] px-3.5 py-2.5">
                <p className="text-[12.5px] leading-[1.45] text-[#ECECEF]">
                  who&apos;s the best soft wash company in Dunedin?
                </p>
              </div>
            </div>
            {/* what comes back */}
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/[0.09] bg-[#17181C] px-3.5 py-2.5">
                <p className="text-[12.5px] leading-[1.5] text-[#E8E4D8]">
                  <span aria-hidden className="mr-1.5 text-[#4ADE80]">✦</span>
                  I&apos;d start with{' '}
                  <span className="font-semibold text-[#ECECEF]">[Your Company]</span> — strong
                  reviews and they cover Dunedin.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[12.5px] leading-[1.5] text-[#9AA0A6]">
            Most shops are invisible here.{' '}
            <span className="font-semibold text-[#ECECEF]">Getting you named is the job.</span>
          </p>
        </div>

        {/* ── the rest of the monthly, as a plain checklist ── */}
        <p className="mt-5 text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">
          Every month, you also get
        </p>
        <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {MONTHLY_AT_A_GLANCE.map((item) => (
            <li
              key={item}
              className="flex items-start gap-1.5 text-[12px] leading-[1.45] text-[#C5C5C8]"
            >
              <span aria-hidden className="mt-[2px] shrink-0 text-[10px] text-[#4ADE80]">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* The struck price is what makes $397 land. It lived only in the left
            column, so the card listing everything you get never showed the one
            number that reframes the price. */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/[0.05] px-3.5 py-3">
          <span className="text-[12.5px] leading-[1.4] text-[#C5C5C8]">
            <span aria-hidden className="mr-1.5">🌐</span>
            Your website, designed &amp; built
          </span>
          <span className="flex shrink-0 items-baseline gap-2">
            <span className="text-[12px] text-[#7A7F8A] line-through">$3,000+</span>
            <span className="rounded-full border border-[#4ADE80]/35 bg-[#4ADE80]/[0.12] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#4ADE80]">
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
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">
                And you can watch it work
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[#C5C5C8]">
                Your Growth Score, re-checked every month on your own dashboard.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-[#4ADE80]">
                {SAMPLE_SCORE}
                <span className="text-[13px] text-[#8A8F98]">/100</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#4ADE80]">Grade {grade}</p>
            </div>
          </div>

          {/* Compact bars — 5px rather than 7px, tighter rhythm. Same data. */}
          <div className="mt-3 space-y-1.5">
            {SAMPLE_DIMENSIONS.map((d) => (
              <div key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                <div className="flex items-center gap-2">
                  <span className="w-[132px] shrink-0 text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">
                    {d.name}
                  </span>
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-[#4ADE80]/60"
                      style={{ width: `${d.value}%` }}
                    />
                  </span>
                </div>
                <span className="font-mono text-[10.5px] tabular-nums text-[#4ADE80]/75">
                  {String(d.value).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-[#8A8F98]">
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
        <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-[#8A8F98]">
          No setup fee · cancel anytime after the first 3 months
        </p>

        {/* Softer second path, 44px min height. */}
        <a
          href="/growth-score"
          className="group mt-3 flex min-h-[44px] items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2.5 transition-colors hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.08]"
        >
          <p className="flex-1 text-[13px] leading-[1.45] text-[#C5C5C8]">
            <span className="font-semibold text-[#ECECEF]">See your own score first</span> — free, 60
            seconds, no signup.
          </p>
          <span
            aria-hidden
            className="shrink-0 text-[13px] text-[#D4AF37] transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </a>
      </div>

      <figcaption className="border-t border-white/10 bg-[#1C1D23] px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">
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
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#ECECEF] sm:text-[40px]">
            Right now, someone near you is asking for exactly what you sell.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
            If you're not in the answer, they hire someone else. You never find out the
            sale existed — <span className="font-semibold text-[#ECECEF]">and neither do they.</span>
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
        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#D4AF37]">
            ✓ What I guarantee
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-[#ECECEF]">
            You get found. On Google, and in the AI answers.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            That's the part I control.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[#D4AF37]">
            {GUARANTEE.emoji} {GUARANTEE.title}
          </p>
        </div>

        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#8A8F98]">
            ✗ What I won't fake
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-[#ECECEF]">
            Leads. Anyone promising you those is guessing.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            I get you in front of them. Closing is on both of us.
          </p>
        </div>
      </div>
    </section>
  );
}

function QueryCard({ engine, query, answer }: { engine: string; query: string; answer: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0E0E10] p-4 sm:p-5">
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
        <span aria-hidden className="text-[11px] text-[#D4AF37]">⌕</span>
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">{engine}</span>
      </div>
      <p className="mt-3 text-[15px] font-medium text-[#ECECEF]">"{query}"</p>
      <p className="mt-2 flex items-start gap-2 text-[13px] leading-[1.55] text-[#9AA0A6]">
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
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#ECECEF] sm:text-[40px]">
        Most agencies show you a case study. I'll just give you the login.
      </h2>
      <p className="mt-5 max-w-[680px] text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
        Every move I make for a client is tracked on a dashboard anyone can open. No
        screenshot I picked, no number I typed in myself.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* the receipts */}
        <a
          href="/r/client/sandbar"
          className="group flex flex-col rounded-xl border border-[#D4AF37]/30 bg-[#0E0E10] p-6 transition-colors hover:border-[#D4AF37]/60 sm:p-7"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#D4AF37]">
            Live client dashboard
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-[#ECECEF]">
            Sandbar Soft Wash — 15 years of great work. Almost zero Google.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[#C5C5C8]">
            A real Palm Harbor business serving 20+ cities across Tampa Bay, that nobody
            could find online. The whole rebuild is in the open — every move, timestamped,
            for anyone to check.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-[#D4AF37]">
            Open the dashboard
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>

        {/* self-proof — better than any case study, because it's about them */}
        <a
          href="/growth-score"
          className="group flex flex-col rounded-xl border border-white/12 bg-[#0B0B0D] p-6 transition-colors hover:border-[#D4AF37]/40 sm:p-7"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#8A8F98]">
            Or skip my proof entirely
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-[#ECECEF]">
            Run it on your own business. Right now, free.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[#C5C5C8]">
            Sixty seconds, no signup. You'll see exactly where you stand on Google and in
            AI answers — and the one fix that moves you most. Whether you hire me is a
            separate conversation.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-[#ECECEF]">
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
    <section className="mt-14 sm:mt-20">
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
          <div className="overflow-hidden rounded-xl border border-[#D4AF37]/25">
            <img
              src="/images/ty-lola-beach.jpg"
              alt="Ty Alexander Traufield — Coach Ty — with his dog Lola, the namesake of Lola Leads, on a Tampa Bay beach at sunset"
              loading="lazy"
              width={600}
              height={800}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
            Ty &amp; Lola · St. Pete, FL
          </figcaption>
        </figure>


        {/* the letter */}
        <div className="order-2 sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#ECECEF] sm:text-[40px]">
            Hey — I'm Ty.
          </h2>

          {/* max-w keeps the letter at a readable ~70 characters per line. */}
          <div className="mt-6 max-w-[58ch] space-y-4 text-[16px] leading-[1.7] text-[#C5C5C8] sm:text-[17px]">
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
              <span className="font-semibold text-[#ECECEF]">half basset hound, half shepherd</span>,{' '}
              {LOLA_TURNS} this February. The basset never loses a scent. The shepherd never
              leaves the flock. Turns out that's the whole job.
            </p>
            <p>
              So that's how we work. Lola watches — your rankings, your reviews, your calls.
              Around the clock, never bored, never off.{' '}
              <span className="font-semibold text-[#ECECEF]">I do the work she turns up.</span>
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
                className="font-semibold text-[#ECECEF] underline decoration-[#D4AF37]/40 underline-offset-4 transition hover:decoration-[#D4AF37]"
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
            <p className="border-l-2 border-[#D4AF37] pl-4 text-[#ECECEF]">
              What I'm not: a $5K-a-month agency hiding behind a dashboard. I answer my own phone.
              I do the work myself.{' '}
              <span className="font-bold text-[#D4AF37]">{GUARANTEE.short}</span> In writing.
            </p>
            <p>
              A local business that finally gets found changes what a family can say yes to.
              That's the whole point. Enough of you win,{' '}
              <span className="font-semibold text-[#ECECEF]">and Lola gets the backyard she deserves.</span>
            </p>
            <p className="text-[17px] font-semibold text-[#ECECEF] sm:text-[18px]">
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
          <p className="font-display text-[20px] text-[#D4AF37]">— {FOUNDER.knownAs}</p>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-[#C5C5C8]">
            <span className="font-semibold text-[#ECECEF]">{FOUNDER.fullName}</span>
            <br />
            {FOUNDER.title} · {FOUNDER.company}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
            {FOUNDER.location}
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 py-2.5 text-[11px] uppercase leading-[1.2] tracking-[0.12em] text-[#D4AF37] transition hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.12]"
          >
            ✓ Verified Google Business <span aria-hidden>↗</span>
          </a>
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
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#ECECEF] sm:text-[40px]">
        If you've been quoted {usd(AGENCY_MONTHLY)} a month, read this part twice.
      </h2>
      <p className="mt-5 max-w-[680px] text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
        Same job. An agency just has salaries to cover before your first result. I don't.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* the comparison */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0E0E10]">
          {/* Mobile: label on its own line, then the two values side by side.
              sm+: a true three-column table. Keeps the label readable at 320px
              instead of crushing it into a ~70px gutter. */}
          <div className="grid grid-cols-2 items-end gap-x-3 border-b border-white/10 bg-[#141416] px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5">
            <span className="hidden text-[10px] uppercase tracking-[0.08em] text-[#8A8F98] sm:block">
              Compare
            </span>
            <span className="text-left text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-[#8A8F98] sm:w-[128px] sm:text-right lg:w-[152px]">
              {usd(AGENCY_MONTHLY)}/mo agency
            </span>
            <span className="text-right text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-[#D4AF37] sm:w-[136px] lg:w-[160px]">
              Lola — $397/mo
            </span>
          </div>

          <dl className="divide-y divide-white/[0.07]">
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-2 items-start gap-x-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5"
              >
                <dt className="col-span-2 mb-1.5 text-[10px] uppercase tracking-[0.06em] text-[#8A8F98] sm:col-span-1 sm:mb-0 sm:font-sans sm:text-[13px] sm:normal-case sm:tracking-normal">
                  {row.label}
                </dt>
                {/* The strike-through is the only thing marking the agency
                    column, and text-decoration isn't exposed to screen
                    readers — so name each side explicitly. */}
                <dd className="text-left text-[13px] leading-[1.4] text-[#9AA0A6] line-through decoration-[#E5534B]/50 sm:w-[128px] sm:text-right lg:w-[152px]">
                  <span className="sr-only">{usd(AGENCY_MONTHLY)}/mo agency: </span>
                  {row.agency}
                </dd>
                <dd className="text-right text-[13px] font-semibold leading-[1.4] text-[#ECECEF] sm:w-[136px] lg:w-[160px]">
                  <span className="sr-only">Lola — $397/mo: </span>
                  {row.lola}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 py-4 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">
              Year-one difference
            </p>
            <p className="mt-1 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#ECECEF] sm:text-[38px]">
              {usd(AGENCY_YEAR_ONE - LOLA_YEAR_ONE)}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-[#C5C5C8]">
              stays in your business
            </p>
            {/* The qualifier has to sit WITH the big number — on mobile the
                disclaimer in the calculator card renders far below it. */}
            <p className="mt-3 text-[12px] leading-[1.55] text-[#8A8F98]">
              Versus a {usd(AGENCY_MONTHLY)}/mo retainer over 12 months. Comparing{' '}
              <span className="text-[#C5C5C8]">what you pay</span>, not what you get.
            </p>
          </div>
        </div>

        {/* break-even calculator */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-[#0B0B0D] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">
            Break-even
          </p>
          <label
            htmlFor="avg-job"
            className="mt-3 block text-[17px] font-semibold leading-[1.35] text-[#ECECEF]"
          >
            What's one job worth to you?
          </label>

          {/* aria-hidden: the range reports this same value via aria-valuetext,
              and a live region here would fight the one on the result below. */}
          <output
            htmlFor="avg-job"
            aria-hidden="true"
            className="mt-4 block font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-[#D4AF37]"
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
            className="mt-4 h-12 w-full cursor-pointer accent-[#D4AF37]"
          />
          <div
            id="avg-job-help"
            className="-mt-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[#8A8F98]"
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

          <p className="mt-5 text-[12px] leading-[1.55] text-[#8A8F98]">
            <span className="text-[#C5C5C8]">Cost math, not a lead promise.</span> And that's one
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
      <span className={`text-[13px] ${featured ? 'font-semibold text-[#ECECEF]' : 'text-[#C5C5C8]'}`}>
        {label}
      </span>
      <span className={`text-[13px] tabular-nums ${featured ? 'text-[#D4AF37]' : 'text-[#C5C5C8]'}`}>
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
      <h2 className="mt-8 max-w-[760px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#ECECEF] sm:text-[40px]">
        See exactly where you stand — free — then pick your path.
      </h2>

      {/* free step */}
      <a
        href="/growth-score"
        className="group mt-8 flex flex-col gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-5 transition-colors hover:bg-[#D4AF37]/[0.09] sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-center gap-4">
          <span className="font-display text-[26px] font-bold text-[#D4AF37]">00</span>
          <div>
            <p className="text-[17px] font-semibold text-[#ECECEF]">Free 60-second Growth Score</p>
            <p className="mt-0.5 text-[14px] text-[#C5C5C8]">Your 0–100 score across six dimensions + your single biggest fix. No signup.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.1em] text-[#D4AF37]">
          Start free <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </a>

      {/* One plan. A two-up grid of the same card was what the sweep left
          behind once DIY and BUILD both aliased PLAN. */}
      <div className="mt-4 mx-auto max-w-[520px]">
        <TierCard tier={PLAN} href={START} featured />
      </div>

      <p className="mt-5 text-[12px] leading-[1.6] text-[#8A8F98]">
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
        featured ? 'border-[#D4AF37]/50 bg-[#0E0E10]' : 'border-white/12 bg-[#0B0B0D]'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] uppercase tracking-[0.08em] text-[#ECECEF]">{tier.name}</p>
        {featured && (
          <span className="rounded-md bg-[#D4AF37] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B]">
            {undefined}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-[#ECECEF]">
        {tier.price}
        <span className="ml-2 text-[12px] font-normal uppercase tracking-[0.14em] text-[#8A8F98]">{tier.period}</span>
      </p>
      <p className="mt-3 text-[15px] font-medium leading-[1.45] text-[#E8E4D8]">{tier.tagline}</p>

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-white/[0.07] pt-5">
        {tier.includes.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-[#C5C5C8]">
            <span aria-hidden className="mt-0.5 text-[#D4AF37]">✓</span>
            <span>{line}</span>
          </li>
        ))}
        {true && (
          <li className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-[#ECECEF]">
            <span aria-hidden className="mt-0.5">{GUARANTEE.emoji}</span>
            <span className="font-semibold">{GUARANTEE.title}</span>
          </li>
        )}
      </ul>

      <a
        href={href}
        className={`mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
          featured
            ? 'bg-[#D4AF37] text-[#0A0A0B] hover:bg-[#F4D47C]'
            : 'border border-white/15 text-[#ECECEF] hover:border-[#D4AF37]/60 hover:text-[#D4AF37]'
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
const FAQ: { q: string; a: string }[] = [
  {
    q: 'What kinds of businesses does Lola work with?',
    a: 'Local service businesses of all kinds — pressure washing, plumbing, HVAC, roofing, pool care, cleaning, and other local trades. If your next customer is searching Google or asking ChatGPT for a business near them, Lola helps them find you.',
  },
  {
    q: 'How much does Lola cost?',
    a: 'One plan: $397/month, all-inclusive. Your website design is included — no setup fee, no build charge — then I manage your Google Business Profile and keep you visible on Google and in AI answers. Cancel anytime after the first 3 months. Backed by the 90-Day Promise. Start with the free Growth Score.',
  },
  {
    q: 'Is there a guarantee?',
    a: "Yes — the 90-Day Promise. We pick your money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free. No fine print.",
  },
  {
    q: 'Can you actually guarantee leads?',
    a: "No — and we won't pretend to. We guarantee visibility: that you're found and clickable on Google and in AI answers. Whether a click becomes a job also depends on your pricing and follow-through. The 90-Day Promise is on the ranking we control: pick 5 money keywords together in week 1, and if we don't get at least 1 to page 1 or the map pack within 30 days, you get half back.",
  },
  {
    q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews), because that's increasingly where buyers ask for a recommendation.",
  },
  {
    q: 'Why is it $397/month when agencies quote $5,000 a month?',
    a: "Because you're not paying for an office, an account manager, or a sales team — Ty does the work himself. A $5,000/month retainer is $60,000 in year one and usually a 12-month contract. The monthly is $397/month, no contract, and if I don't get you ranking in 90 days, your next 2 months are free. Same job, without the overhead you were funding.",
  },
  {
    q: 'Who is behind Lola?',
    a: 'Ty Alexander Traufield — “Coach Ty” — based in St. Petersburg and serving all of Tampa Bay. He’s a group strength & conditioning coach and a full-time GM who trains for HYROX, and he built Lola to fix the local visibility of his father’s real business, Sandbar Soft Wash. He now runs that same system for other local service businesses, does the work himself, and answers his own phone.',
  },
  {
    q: 'Why is it called Lola?',
    a: "Lola is Ty's dog — born in 2018, and the reason the whole thing exists. The goal behind the business is simple: help enough local businesses win to buy her the backyard she deserves. When you win, so does she.",
  },
];

function FaqSection() {
  return (
    <section className="mt-14 sm:mt-20">
      <SectionHead kicker="Straight answers" />
      {/* Every other section is labelled by an h2; without this the FAQ is
          unreachable by screen-reader heading navigation. */}
      <h2 className="sr-only">Straight answers</h2>
      <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {FAQ.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-[#ECECEF] [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <span aria-hidden className="shrink-0 text-[20px] text-[#D4AF37] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-6 pr-8 text-[15px] leading-[1.65] text-[#C5C5C8]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FINAL CTA — the searcher is live right now.
   ───────────────────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="relative left-1/2 right-1/2 mt-14 -mx-[50vw] w-screen border-t border-[#D4AF37]/30 bg-black py-14 sm:mt-20 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-5 text-center sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.1em] text-[#D4AF37]">Your next customer is searching right now</p>
        <h2 className="mx-auto mt-5 max-w-[760px] font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#ECECEF] sm:text-[48px]">
          Make sure the answer is you.
        </h2>
        <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-[#C5C5C8]">
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
            className="inline-flex min-h-[56px] items-center justify-center rounded-lg border border-[#D4AF37]/35 px-8 py-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-[#D4AF37] transition-colors hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.08]"
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
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
      <span className="text-[14px] font-semibold text-[#D4AF37] sm:text-[15px]">{kicker}</span>
    </div>
  );
}
