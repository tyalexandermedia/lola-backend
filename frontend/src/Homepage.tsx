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

import { DIY, BUILD, HALF_BACK_GUARANTEE, GROWTH_SCORE_DIMENSIONS } from './lib/pricing';
import { useSeo } from './lib/seo';
import { useReveal } from './lib/useReveal';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

// Real before/after work — ties the proof band to the Sandbar Soft Wash story.
const PROOF = [
  { before: '/gallery/house-5-before.jpg', after: '/gallery/house-5-after.jpg', label: 'House wash' },
  { before: '/gallery/driveway-3-before.jpg', after: '/gallery/driveway-3-after.jpg', label: 'Driveway' },
  { before: '/gallery/roof-2-before.jpg', after: '/gallery/roof-2-after.jpg', label: 'Roof' },
  { before: '/gallery/paver-1-before.jpg', after: '/gallery/paver-1-after.jpg', label: 'Pavers' },
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
    title: 'Did you show up? Get found on Google & AI — Lola, Tampa Bay',
    description:
      "Your next customer already searched for you on Google and ChatGPT. Lola makes sure you're the one they find — and the one they choose. Free 60-second Growth Score, then DIY $197 or the $997 Full Build, backed by the Half-Back Guarantee.",
  });
  useReveal();

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <ProblemSection />
      <FixSection />
      <ProofBand />
      <StorySection />
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
   01 — THE PROBLEM. The Tampa Bay searcher scenario + the silent lost sale.
   ───────────────────────────────────────────────────────────────────────── */
function ProblemSection() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="01" kicker="The problem" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
        <div>
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
            Right now, someone near you is asking for exactly what you sell.
          </h2>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
            <p>
              Somewhere in Tampa Bay, someone is asking Google — or ChatGPT — for the
              <span className="font-semibold text-white"> best pressure washing company, plumber, or roofer near them.</span>
            </p>
            <p>
              If your business isn't built to show up in those answers, that customer
              becomes <span className="font-semibold text-white">someone else's customer.</span>
            </p>
            <p className="border-l-2 border-[#D4AF37] pl-4 text-white">
              And here's the part that stings: they never even know the sale existed —
              and neither do you.
            </p>
          </div>
        </div>

        {/* Two "answer" cards: the competitor getting picked, on Google and in AI. */}
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
   02 — THE HONEST FIX. Visibility is guaranteed; leads are not.
   ───────────────────────────────────────────────────────────────────────── */
function FixSection() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="02" kicker="The honest fix" />
      <h2 className="mt-8 max-w-[820px] font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        We'll be straight with you about what can be guaranteed — and what can't.
      </h2>
      <p className="mt-5 max-w-[720px] text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
        Anyone promising you a flood of leads is guessing. We promise the thing that
        actually has to happen first: when your next customer searches, you show up.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-white/10 bg-white/10 sm:grid-cols-2">
        {/* guaranteed */}
        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">
            ✓ What we guarantee
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-white">
            Visibility. That you're found, and that you're clickable.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            Found on Google's map pack and search, and named in AI answers when people ask
            ChatGPT, Perplexity, or Gemini for a company like yours. That's the part we
            control — so we put it in writing.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-[4px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#D4AF37]">
            {HALF_BACK_GUARANTEE.emoji} {HALF_BACK_GUARANTEE.title}
          </p>
        </div>

        {/* not guaranteed */}
        <div className="bg-[#0E0E10] p-6 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A8F98]">
            ✗ What we won't fake
          </p>
          <p className="mt-4 text-[18px] font-semibold leading-[1.4] text-white">
            Leads. We can't guarantee those — and we won't pretend to.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8]">
            Whether a click becomes a booked job depends on your pricing and your
            follow-through too. We get you in front of the customer. Closing them is a
            partnership — and we'll tell you the truth about that from day one.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PROOF BAND — real Tampa Bay before/afters. Real photos, real texture.
   Full-bleed black band breaking out of the constrained container.
   ───────────────────────────────────────────────────────────────────────── */
function ProofBand() {
  return (
    <section className="relative left-1/2 right-1/2 mt-16 -mx-[50vw] w-screen border-y border-white/10 bg-black py-12 sm:mt-24 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-[30px]">
            Real work. Real Tampa Bay homes.
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8F98]">
            Drag the slider on any before/after
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {PROOF.map((p) => (
            <figure key={p.label} className="overflow-hidden rounded-[4px] border border-white/10 bg-[#0E0E10]">
              <div className="grid grid-cols-2">
                <img src={p.before} alt={`${p.label} before`} loading="lazy" className="aspect-[4/3] h-full w-full object-cover grayscale-[0.15]" />
                <img src={p.after} alt={`${p.label} after`} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
              </div>
              <figcaption className="flex items-center justify-between px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C5C5C8]">{p.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8A8F98]">before / after</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-[1.6] text-[#8A8F98]">
          The same work Lola was built to get found — for{' '}
          <a href="https://www.sandbarsoftwash.com" target="_blank" rel="noreferrer" className="text-[#D4AF37] underline-offset-2 hover:underline">
            Sandbar Soft Wash
          </a>
          , the business that started it all.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   03 — THE STORY. Ty Alexander Traufield. Real photo, asymmetric.
   ───────────────────────────────────────────────────────────────────────── */
function StorySection() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="03" kicker="Who's behind Lola" />
      <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-[300px_1fr] sm:items-start sm:gap-12">
        {/* photo */}
        <figure className="order-1">
          <div className="overflow-hidden rounded-[6px] border border-[#D4AF37]/25">
            <img
              src="/images/ty-lola-beach.jpg"
              alt="Ty Alexander Traufield — Coach Ty — with his dog Lola on a Tampa Bay beach at sunset"
              loading="lazy"
              className="aspect-[3/4] h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
            Ty &amp; Lola · Tampa Bay
          </figcaption>
        </figure>

        {/* story */}
        <div className="order-2">
          <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
            One person who lived the problem.<br className="hidden sm:block" /> Not a faceless agency.
          </h2>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.65] text-[#C5C5C8] sm:text-[17px]">
            <p>
              Lola was built by <span className="font-semibold text-white">Ty Alexander Traufield</span> —
              known around Tampa Bay as <span className="font-semibold text-white">Coach Ty</span>. He
              didn't start with a theory.
            </p>
            <p>
              He fixed this exact problem first for his father's real business,{' '}
              <span className="font-semibold text-white">Sandbar Soft Wash</span> — then turned what
              actually worked into a repeatable system he could run for any local service business.
            </p>
            <p className="text-white">
              Ty answers his own phone. You text him directly during the build. No account managers,
              no 50-page report that dies in your inbox —{' '}
              <span className="font-bold text-[#D4AF37]">and if he doesn't get you ranking, you get half back.</span>
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="font-display text-[15px] text-[#D4AF37]">— Coach Ty</span>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8A8F98] underline-offset-2 transition hover:text-[#D4AF37] hover:underline"
            >
              ✓ Verified Google Business — Ty Alexander Media <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   04 — THE OFFER. Free score first, then two tiers (DIY / Full Build).
   Pricing pulled from lib/pricing; CTAs route to /growth-score and /pricing
   (where the Stripe checkout lives) — no checkout links defined here.
   ───────────────────────────────────────────────────────────────────────── */
function OfferSection() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="04" kicker="Start free, then choose" />
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
    q: 'Can you actually guarantee leads?',
    a: "No — and we won't pretend to. We guarantee visibility: that you're found and clickable on Google and in AI answers. Whether a click becomes a job also depends on your pricing and follow-through. The Half-Back Guarantee is on the ranking we control: pick 5 money keywords together in week 1, and if we don't get at least 1 to page 1 or the map pack within 30 days, you get half back.",
  },
  {
    q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews), because that's increasingly where buyers ask for a recommendation.",
  },
  {
    q: 'Who is behind Lola?',
    a: 'Ty Alexander Traufield — “Coach Ty” — in Tampa Bay. He built Lola to fix the local visibility of his father’s real business, Sandbar Soft Wash, and now runs the same system for other local service businesses. He answers his own phone.',
  },
];

function FaqSection() {
  return (
    <section className="mt-16 sm:mt-24">
      <SectionHead index="05" kicker="Straight answers" />
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
