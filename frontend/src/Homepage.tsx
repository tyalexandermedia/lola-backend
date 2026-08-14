/**
 * Lola — marketing homepage at `/`.
 *
 * Rebuilt to the 2026 brief:
 *   • Copy — the "did you show up?" narrative (hero → problem → honest fix →
 *     story → offer). Exact approved wording.
 *   • Design — editorial, asymmetric, solid black + hairlines, one branded
 *     gold accent (no pastel gradient blobs, minimal rounding). Real photos
 *     over icons (Ty & Lola; real Tampa Bay before/afters).
 *   • Growth Score is shown as a genuine diagnostic report card, not a
 *     lead-capture gimmick.
 *
 * SSR-safe by construction: every section's copy is static markup that renders
 * with react-dom/server (see scripts/prerender.mjs), so the headline, body and
 * offer are readable in the raw HTML before any JS runs. Nothing here reads
 * `window`/`document` during render; the only effects (useSeo, useReveal) are
 * progressive enhancement. Pricing, Stripe links and the Half-Back Guarantee
 * are NOT defined here — they live in lib/pricing, lib/checkout and the
 * index.html JSON-LD, which this page intentionally does not touch.
 */

import { useState } from 'react';

import { DIY, BUILD, HALF_BACK_GUARANTEE, GROWTH_SCORE_DIMENSIONS } from './lib/pricing';
import { useSeo } from './lib/seo';
import { useReveal } from './lib/useReveal';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

/**
 * Lola (the dog, and the name on the door) was born 16 Feb 2018. Her age is
 * derived rather than hardcoded so the founder's letter ages itself —
 * "turns 9 this February 16" silently becomes "turns 10" on its own.
 * Returns the age she turns on her NEXT birthday.
 *
 * Caveat: this is evaluated at module scope, so the prerendered HTML that
 * crawlers and AI answer engines read carries the BUILD-time value. Visitors
 * with JS see the current one. Any deploy after 16 Feb refreshes the static
 * copy; without one it can lag by a year for bots only.
 */
const LOLA_BORN_YEAR = 2018;
const LOLA_BORN_MONTH = 1; // 0-indexed → February
const LOLA_BORN_DAY = 16;

function lolaNextAge(now: Date): number {
  const year = now.getFullYear();
  const birthdayThisYear = new Date(year, LOLA_BORN_MONTH, LOLA_BORN_DAY);
  // Before her birthday she still turns that age this year; after it, next year.
  const nextBirthdayYear = now.getTime() > birthdayThisYear.getTime() ? year + 1 : year;
  return nextBirthdayYear - LOLA_BORN_YEAR;
}

const LOLA_TURNS = lolaNextAge(new Date());

// The hybrid throughline — strength + endurance is the same shape as
// Google + AI answers. Ty's own framing, shown as a parallel.
const HYBRID: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Day job', value: 'Full-time GM' },
  { label: 'Coaching', value: 'Group strength & conditioning' },
  { label: 'Training for', value: 'HYROX' },
  { label: 'Builds for you', value: 'Google + AI answers' },
];

// Sample Growth Score — an honest, representative scorecard (labelled SAMPLE),
// not a real client's numbers. The two low bars (AI Visibility, Revenue
// Tracking) are the leaks Lola is built to close.
const SAMPLE_SCORE = 62;
// Values line up with the six canonical dimensions (single source of truth).
// The two lows — AI Visibility, Revenue Tracking — are the leaks Lola closes.
const SAMPLE_VALUES = [74, 58, 46, 21, 66, 18];
const SAMPLE_DIMENSIONS = GROWTH_SCORE_DIMENSIONS.map((name, i) => ({
  name,
  value: SAMPLE_VALUES[i] ?? 50,
}));

export default function Homepage() {
  useSeo({
    title: 'Did you show up? Get found on Google & AI — Lola Leads, Tampa Bay',
    description:
      "Your next customer already searched for you on Google and ChatGPT. Lola makes sure you're the one they find — and the one they choose. Free 60-second Growth Score, then DIY $197 or the $997 Full Build, backed by the Half-Back Guarantee.",
  });
  useReveal();

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      {/* Ty leads. He IS the differentiator, and a contractor deciding whether
          to keep reading is deciding about a person, not an argument. The
          analysis follows once they know who's talking. */}
      <StorySection />
      <ProblemSection />
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
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-14">
        {/* LEFT — the statement */}
        <div className="animate-slide-up">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#D4AF37]">
            AI Leads Expert · Tampa Bay
          </p>

          <h1 className="mt-6 font-display text-[40px] font-bold leading-[0.98] tracking-[-0.03em] text-white sm:text-[58px] lg:text-[64px]">
            Your next customer<br className="hidden sm:block" /> already searched for you.
            <span className="mt-2 block text-[#D4AF37]">Did you show up?</span>
          </h1>

          <p className="mt-7 max-w-[560px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
            Local service businesses are losing customers every day to Google and AI
            search results they don't even know exist. Lola makes sure you're the one
            they find — <span className="font-semibold text-white">and the one they choose.</span>
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/growth-score"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-[4px] bg-[#D4AF37] px-7 text-[14px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] transition-colors hover:bg-[#F4D47C] sm:h-16"
            >
              Run my free Growth Score
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center rounded-[4px] border border-white/15 px-7 text-[14px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37] sm:h-16"
            >
              Book a 15-min call
            </a>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-[#8A8F98]">
            <span>60-sec Growth Score</span>
            <span aria-hidden className="text-[#3A3F48]">/</span>
            <span>then {DIY.price} DIY or {BUILD.price} Full Build</span>
            <span aria-hidden className="text-[#3A3F48]">/</span>
            <span className="text-[#D4AF37]">Half-Back Guarantee</span>
          </p>
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
   REPORT CARD — the Growth Score result as a real diagnostic scorecard.
   Static markup (SSR-safe): grade, six graded dimensions, biggest-leak
   callout, next move. Reads like a report, not a form.
   ───────────────────────────────────────────────────────────────────────── */
function ReportCard() {
  const grade = SAMPLE_SCORE >= 80 ? 'B' : SAMPLE_SCORE >= 60 ? 'C+' : SAMPLE_SCORE >= 40 ? 'D' : 'F';
  return (
    <figure className="relative overflow-hidden rounded-[6px] border border-[#D4AF37]/25 bg-[#0E0E10] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
      {/* header band */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#141416] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4AF37]">
          🐾 Lola · Growth Score
        </span>
        <span className="rounded-[3px] border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A8F98]">
          Sample
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {/* subject + grade */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8A8F98]">Subject</p>
            <p className="mt-1 text-[15px] font-semibold text-white">Local pressure-washing co.</p>
            <p className="font-mono text-[11px] text-[#8A8F98]">Tampa Bay, FL</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8A8F98]">Score</p>
            <p className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-[#D4AF37]">
              {SAMPLE_SCORE}
              <span className="text-[16px] text-[#8A8F98]">/100</span>
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white">Grade {grade} · Needs work</p>
          </div>
        </div>

        {/* dimension bars */}
        <div className="mt-5 space-y-2.5">
          {SAMPLE_DIMENSIONS.map((d) => {
            const low = d.value < 40;
            return (
              <div key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                <div className="flex items-center gap-2">
                  <span className="w-[112px] shrink-0 truncate font-mono text-[11px] uppercase tracking-[0.1em] text-[#C5C5C8]">
                    {d.name}
                  </span>
                  <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className={`block h-full rounded-full ${low ? 'bg-[#E5534B]' : 'bg-[#D4AF37]'}`}
                      style={{ width: `${d.value}%` }}
                    />
                  </span>
                </div>
                <span className={`font-mono text-[11px] tabular-nums ${low ? 'text-[#E5534B]' : 'text-[#C5C5C8]'}`}>
                  {String(d.value).padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>

        {/* biggest leak */}
        <div className="mt-5 border-l-2 border-[#E5534B] bg-[#E5534B]/[0.06] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E5534B]">Biggest leak</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-[#E8E4D8]">
            <span className="font-semibold text-white">AI Visibility.</span> Ask ChatGPT for a
            company like yours and it names a competitor — not you.
          </p>
        </div>

        {/* next move */}
        <div className="mt-3 flex items-start gap-2">
          <span aria-hidden className="mt-0.5 font-mono text-[12px] text-[#D4AF37]">→</span>
          <p className="text-[13px] leading-[1.5] text-[#C5C5C8]">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Next move&nbsp;</span>
            Fix your Google Business Profile + get named in AI answers. That's the $997 Full Build.
          </p>
        </div>
      </div>

      <figcaption className="border-t border-white/10 bg-[#141416] px-5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A8F98]">
        Your real score · 60 seconds · no signup
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
    <section className="mt-16 sm:mt-24">
      <SectionHead index="02" kicker="What's going wrong" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
        <div>
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
            Right now, someone near you is asking for exactly what you sell.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
            If you're not in the answer, they hire someone else. You never find out the
            sale existed — <span className="font-semibold text-white">and neither do they.</span>
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
      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-white/10 bg-white/10 sm:grid-cols-2">
        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">
            ✓ What I guarantee
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-white">
            You get found. On Google, and in the AI answers.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            That's the part I control, so I put it in writing.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-[4px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#D4AF37]">
            {HALF_BACK_GUARANTEE.emoji} {HALF_BACK_GUARANTEE.title}
          </p>
        </div>

        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A8F98]">
            ✗ What I won't fake
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-white">
            Leads. Anyone promising you those is guessing.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            Whether a click becomes a booked job depends on your pricing and your
            follow-through too. I get you in front of them. Closing is on both of us.
          </p>
        </div>
      </div>
    </section>
  );
}

function QueryCard({ engine, query, answer }: { engine: string; query: string; answer: string }) {
  return (
    <div className="rounded-[6px] border border-white/10 bg-[#0E0E10] p-4 sm:p-5">
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
        <span aria-hidden className="font-mono text-[11px] text-[#D4AF37]">⌕</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A8F98]">{engine}</span>
      </div>
      <p className="mt-3 text-[15px] font-medium text-white">"{query}"</p>
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
    <section className="mt-16 sm:mt-24">
      <SectionHead index="03" kicker="Don't take my word for it" />
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
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
          className="group flex flex-col rounded-[6px] border border-[#D4AF37]/30 bg-[#0E0E10] p-6 transition-colors hover:border-[#D4AF37]/60 sm:p-7"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">
            Live client dashboard
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-white">
            Sandbar Soft Wash — 15 years of great work. Almost zero Google.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[#C5C5C8]">
            A real Palm Harbor business serving 20+ cities across Tampa Bay, that nobody
            could find online. The whole rebuild is in the open — every move, timestamped,
            for anyone to check.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-[#D4AF37]">
            Open the dashboard
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </a>

        {/* self-proof — better than any case study, because it's about them */}
        <a
          href="/growth-score"
          className="group flex flex-col rounded-[6px] border border-white/12 bg-[#0B0B0D] p-6 transition-colors hover:border-[#D4AF37]/40 sm:p-7"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A8F98]">
            Or skip my proof entirely
          </p>
          <p className="mt-4 text-[19px] font-semibold leading-[1.35] text-white">
            Run it on your own business. Right now, free.
          </p>
          <p className="mt-3 flex-1 text-[15px] leading-[1.6] text-[#C5C5C8]">
            Sixty seconds, no signup. You'll see exactly where you stand on Google and in
            AI answers — and the one fix that moves you most. Whether you hire me is a
            separate conversation.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-white">
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
    <section className="mt-16 sm:mt-24">
      <SectionHead index="01" kicker="Who you're dealing with" />
      {/* Three grid children so mobile can read photo → letter → résumé.
          Keeping the résumé glued under the photo pushed the first line of the
          letter ~660px down the page on a small phone. Desktop is unchanged:
          explicit row/column placement puts photo and résumé back in the left
          column with the letter spanning both rows on the right. */}
      <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-[300px_1fr] sm:items-start sm:gap-x-12 sm:gap-y-5">
        <figure className="order-1 sm:col-start-1 sm:row-start-1">
          <div className="overflow-hidden rounded-[6px] border border-[#D4AF37]/25">
            <img
              src="/images/ty-lola-beach.jpg"
              alt="Ty Alexander Traufield — Coach Ty — with his dog Lola, the namesake of Lola Leads, on a Tampa Bay beach at sunset"
              loading="lazy"
              width={600}
              height={800}
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
            Ty &amp; Lola · St. Pete, FL
          </figcaption>
        </figure>

        {/* The hybrid throughline, stated as a parallel. */}
        <div className="order-3 sm:col-start-1 sm:row-start-2">
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {HYBRID.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8F98]">
                  {row.label}
                </dt>
                <dd className="text-right text-[13px] font-medium text-[#E8E4D8]">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
            Hybrid all the way down
          </p>
        </div>

        {/* the letter */}
        <div className="order-2 sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
            Hey — I'm Ty.
          </h2>

          {/* max-w keeps the letter at a readable ~70 characters per line. */}
          <div className="mt-6 max-w-[64ch] space-y-4 text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
            <p>
              Lola's the name on the door, and yeah — she's exactly who you think:{' '}
              <span className="font-semibold text-white">my dog.</span> A 2018 girl who turns{' '}
              {LOLA_TURNS} this February 16. And honestly? She's the whole reason any of this exists.
            </p>
            <p>
              I'm a group strength &amp; conditioning coach and a full-time GM, training for{' '}
              <span className="font-semibold text-white">HYROX</span> on my own time. That makes me a
              hybrid athlete — strength and endurance, no either/or. Turns out that's how I've built
              everything: coach and founder, gym and laptop, getting you found on Google{' '}
              <span className="font-semibold text-white">and</span> in the AI answers.
            </p>
            <p>
              The whole thing started with one crew:{' '}
              <a
                href="/case-studies/sandbar"
                className="font-semibold text-white underline decoration-[#D4AF37]/40 underline-offset-4 transition hover:decoration-[#D4AF37]"
              >
                Sandbar Soft Wash
              </a>
              , right here in the bay. I got them found and got their phone ringing — Google and AI.
              It worked. So I'm scaling the system, and that's Lola Leads.
            </p>
            <p className="border-l-2 border-[#D4AF37] pl-4 text-white">
              Here's what I'm not: a $5K-a-month agency hiding behind a dashboard. No 50-page report
              that dies in your inbox. I answer my own phone. I do the work myself. And if I don't
              get you ranking, you get half your money back — the{' '}
              <span className="font-bold text-[#D4AF37]">Half-Back Guarantee. In writing.</span>
            </p>
            <p>
              The real goal? Enough local businesses win with Lola that I can buy the actual Lola{' '}
              <span className="font-semibold text-white">the backyard she deserves.</span> She's
              earned it — and when you win, so do I.
            </p>
            <p className="text-[17px] font-semibold text-white sm:text-[18px]">
              Let's get your phone ringing.
            </p>
          </div>

          {/* signature block */}
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="font-display text-[20px] text-[#D4AF37]">— Coach Ty</p>
            <p className="mt-1.5 text-[14px] text-[#C5C5C8]">
              <span className="font-semibold text-white">Ty Alexander Traufield</span> — Founder,
              Lola Leads · Ty Alexander Media
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
              St. Pete · serving all of Tampa Bay, FL
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[48px] items-center gap-1.5 rounded-[4px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 py-2.5 font-mono text-[11px] uppercase leading-[1.2] tracking-[0.12em] text-[#D4AF37] transition hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.12]"
            >
              ✓ Verified Google Business <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
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
const BUILD_PRICE = Number(BUILD.price.replace(/[^0-9.]/g, ''));
const DIY_PRICE = Number(DIY.price.replace(/[^0-9.]/g, ''));
/** The comparison Ty gets quoted against — a $5K/mo retainer agency. */
const AGENCY_MONTHLY = 5000;
const AGENCY_YEAR_ONE = AGENCY_MONTHLY * 12;

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

const COMPARISON: ReadonlyArray<{ label: string; agency: string; lola: string }> = [
  { label: 'Year one', agency: usd(AGENCY_YEAR_ONE), lola: `${usd(BUILD_PRICE)} once` },
  { label: 'Contract', agency: '12 months, locked', lola: 'None' },
  { label: 'Who does the work', agency: 'An account manager', lola: 'Ty — the one you texted' },
  { label: 'What you get monthly', agency: 'A 50-page PDF report', lola: 'A live score you can check' },
  { label: "If you don't rank", agency: 'You keep paying', lola: 'You get half your money back' },
];

function RoiSection() {
  // Visitor's own average job value — the only input, and it never leaves the
  // browser. Default is a plausible mid-range local-services ticket.
  const [avgJob, setAvgJob] = useState(500);
  const jobsForBuild = Math.max(1, Math.ceil(BUILD_PRICE / Math.max(avgJob, 1)));
  const jobsForDiy = Math.max(1, Math.ceil(DIY_PRICE / Math.max(avgJob, 1)));

  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="04" kicker="The math" />
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        If you've been quoted {usd(AGENCY_MONTHLY)} a month, read this part twice.
      </h2>
      <p className="mt-5 max-w-[680px] text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
        Same job. An agency just has salaries to cover before your first result. I don't.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* the comparison */}
        <div className="overflow-hidden rounded-[6px] border border-white/10 bg-[#0E0E10]">
          {/* Mobile: label on its own line, then the two values side by side.
              sm+: a true three-column table. Keeps the label readable at 320px
              instead of crushing it into a ~70px gutter. */}
          <div className="grid grid-cols-2 items-end gap-x-3 border-b border-white/10 bg-[#141416] px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A8F98] sm:block">
              Compare
            </span>
            <span className="text-left font-mono text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-[#8A8F98] sm:w-[128px] sm:text-right lg:w-[152px]">
              {usd(AGENCY_MONTHLY)}/mo agency
            </span>
            <span className="text-right font-mono text-[10px] uppercase leading-[1.3] tracking-[0.14em] text-[#D4AF37] sm:w-[136px] lg:w-[160px]">
              Lola Full Build
            </span>
          </div>

          <dl className="divide-y divide-white/[0.07]">
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-2 items-start gap-x-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-5"
              >
                <dt className="col-span-2 mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8F98] sm:col-span-1 sm:mb-0 sm:font-sans sm:text-[13px] sm:normal-case sm:tracking-normal">
                  {row.label}
                </dt>
                {/* The strike-through is the only thing marking the agency
                    column, and text-decoration isn't exposed to screen
                    readers — so name each side explicitly. */}
                <dd className="text-left text-[13px] leading-[1.4] text-[#9AA0A6] line-through decoration-[#E5534B]/50 sm:w-[128px] sm:text-right lg:w-[152px]">
                  <span className="sr-only">{usd(AGENCY_MONTHLY)}/mo agency: </span>
                  {row.agency}
                </dd>
                <dd className="text-right text-[13px] font-semibold leading-[1.4] text-white sm:w-[136px] lg:w-[160px]">
                  <span className="sr-only">Lola Full Build: </span>
                  {row.lola}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 py-4 sm:px-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
              Year-one difference
            </p>
            <p className="mt-1 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-[38px]">
              {usd(AGENCY_YEAR_ONE - BUILD_PRICE)}
            </p>
            <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.14em] text-[#C5C5C8]">
              stays in your business
            </p>
            {/* The qualifier has to sit WITH the big number — on mobile the
                disclaimer in the calculator card renders far below it. */}
            <p className="mt-3 text-[12px] leading-[1.55] text-[#8A8F98]">
              Versus a {usd(AGENCY_MONTHLY)}/mo retainer over 12 months. Your quote may differ, and
              this compares <span className="text-[#C5C5C8]">what you pay</span> — not a promise
              that both get the same result.
            </p>
          </div>
        </div>

        {/* break-even calculator */}
        <div className="flex flex-col rounded-[6px] border border-white/10 bg-[#0B0B0D] p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A8F98]">
            Break-even
          </p>
          <label
            htmlFor="avg-job"
            className="mt-3 block text-[17px] font-semibold leading-[1.35] text-white"
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
            className="-mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8F98]"
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
              label={`${DIY.name} · ${DIY.price}`}
              jobs={jobsForDiy}
            />
            <BreakEvenRow
              label={`${BUILD.name} · ${BUILD.price}`}
              jobs={jobsForBuild}
              featured
            />
          </div>

          <p className="mt-5 text-[12px] leading-[1.55] text-[#8A8F98]">
            That's <span className="text-[#C5C5C8]">cost math, not a lead promise</span> — we don't
            make those (see above). It's simply what the build costs, measured in jobs you already
            know the value of.
          </p>

          {/* Peak intent: the number just resolved against their own ticket. */}
          <a
            href="/pricing"
            className="group mt-5 inline-flex h-14 items-center justify-center gap-2 rounded-[4px] bg-[#D4AF37] px-6 text-[13px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] transition-colors hover:bg-[#F4D47C]"
          >
            Start my {BUILD.price} Full Build
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
    // wraps "Full Build · $997" onto four lines.
    <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className={`text-[13px] ${featured ? 'font-semibold text-white' : 'text-[#C5C5C8]'}`}>
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
    <section className="mt-16 sm:mt-24">
      <SectionHead index="05" kicker="Start free, then choose" />
      <h2 className="mt-8 max-w-[760px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        See exactly where you stand — free — then pick your path.
      </h2>

      {/* free step */}
      <a
        href="/growth-score"
        className="group mt-8 flex flex-col gap-3 rounded-[6px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-5 transition-colors hover:bg-[#D4AF37]/[0.09] sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-center gap-4">
          <span className="font-display text-[26px] font-bold text-[#D4AF37]">00</span>
          <div>
            <p className="text-[17px] font-semibold text-white">Free 60-second Growth Score</p>
            <p className="mt-0.5 text-[14px] text-[#C5C5C8]">Your 0–100 score across six dimensions + your single biggest fix. No signup.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[#D4AF37]">
          Start free <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </a>

      {/* two tiers */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TierCard tier={DIY} href="/pricing" />
        <TierCard tier={BUILD} href="/pricing" featured />
      </div>

      <p className="mt-5 font-mono text-[12px] leading-[1.6] text-[#8A8F98]">
        Both one-time · $0 setup · no contract · {HALF_BACK_GUARANTEE.emoji} {HALF_BACK_GUARANTEE.title} on the Full Build.
      </p>
    </section>
  );
}

function TierCard({ tier, href, featured }: { tier: typeof DIY; href: string; featured?: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-[6px] border p-6 sm:p-7 ${
        featured ? 'border-[#D4AF37]/50 bg-[#0E0E10]' : 'border-white/12 bg-[#0B0B0D]'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-white">{tier.name}</p>
        {featured && (
          <span className="rounded-[3px] bg-[#D4AF37] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#0A0A0B]">
            {tier.badge}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-white">
        {tier.price}
        <span className="ml-2 font-mono text-[12px] font-normal uppercase tracking-[0.14em] text-[#8A8F98]">{tier.period}</span>
      </p>
      <p className="mt-3 text-[15px] font-medium leading-[1.45] text-[#E8E4D8]">{tier.tagline}</p>

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-white/[0.07] pt-5">
        {tier.includes.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-[#C5C5C8]">
            <span aria-hidden className="mt-0.5 text-[#D4AF37]">✓</span>
            <span>{line}</span>
          </li>
        ))}
        {tier.guaranteed && (
          <li className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white">
            <span aria-hidden className="mt-0.5">{HALF_BACK_GUARANTEE.emoji}</span>
            <span className="font-semibold">{HALF_BACK_GUARANTEE.title}</span>
          </li>
        )}
      </ul>

      <a
        href={href}
        className={`mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[4px] px-6 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
          featured
            ? 'bg-[#D4AF37] text-[#0A0A0B] hover:bg-[#F4D47C]'
            : 'border border-white/15 text-white hover:border-[#D4AF37]/60 hover:text-[#D4AF37]'
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
    a: 'Two simple options, both one-time. DIY is $197 — your full Growth Score plus a 5-step fix-it checklist, done yourself. The Full Build is $997 — we build your site and get you found on Google and in AI answers, backed by the Half-Back Guarantee. No setup fee, no contract. Start with the free Growth Score.',
  },
  {
    q: 'Is there a guarantee?',
    a: "Yes — the Half-Back Guarantee on the Full Build. We pick 5 money keywords for your business together in week 1. If we don't get at least 1 of them ranking on page 1 or in the map pack within 30 days, you get half your investment back. No fine print.",
  },
  {
    q: 'Can you actually guarantee leads?',
    a: "No — and we won't pretend to. We guarantee visibility: that you're found and clickable on Google and in AI answers. Whether a click becomes a job also depends on your pricing and follow-through. The Half-Back Guarantee is on the ranking we control: pick 5 money keywords together in week 1, and if we don't get at least 1 to page 1 or the map pack within 30 days, you get half back.",
  },
  {
    q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews), because that's increasingly where buyers ask for a recommendation.",
  },
  {
    q: 'Why is it $997 when agencies quote $5,000 a month?',
    a: "Because you're not paying for an office, an account manager, or a sales team — Ty does the work himself. A $5,000/month retainer is $60,000 in year one and usually a 12-month contract. The Full Build is $997 one-time, no contract, and if we don't get you ranking you get half of that back. Same job, without the overhead you were funding.",
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
    <section className="mt-16 sm:mt-24">
      <SectionHead index="06" kicker="Straight answers" />
      {/* Every other section is labelled by an h2; without this the FAQ is
          unreachable by screen-reader heading navigation. */}
      <h2 className="sr-only">Straight answers</h2>
      <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {FAQ.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-white [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <span aria-hidden className="shrink-0 font-mono text-[20px] text-[#D4AF37] transition-transform group-open:rotate-45">+</span>
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
    <section className="relative left-1/2 right-1/2 mt-16 -mx-[50vw] w-screen border-t border-[#D4AF37]/30 bg-black py-16 sm:mt-24 sm:py-20">
      <div className="mx-auto max-w-[1120px] px-5 text-center sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#D4AF37]">Your next customer is searching right now</p>
        <h2 className="mx-auto mt-5 max-w-[760px] font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-[48px]">
          Make sure the answer is you.
        </h2>
        <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-[#C5C5C8]">
          Run the free 60-second Growth Score, or book a straight-talk 15-minute call with Ty. No pitch deck — just where you stand and what to fix first.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/growth-score"
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-[4px] bg-[#D4AF37] px-8 text-[14px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] transition-colors hover:bg-[#F4D47C]"
          >
            Get my free Growth Score <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 items-center justify-center rounded-[4px] border border-white/15 px-8 text-[14px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
          >
            Book a 15-min call
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── shared: section header with hanging index number ────────────────────── */
function SectionHead({ index, kicker }: { index: string; kicker: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-display text-[13px] font-bold text-[#D4AF37]">{index}</span>
      <span aria-hidden className="h-px w-8 bg-[#D4AF37]/50" />
      <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8A8F98]">{kicker}</span>
    </div>
  );
}
