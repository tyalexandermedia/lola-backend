/**
 * /roadmap — the dedicated visual roadmap page.
 *
 * The one-screen explanation of how LOLA OS works: a phased growth roadmap,
 * not an SEO package. Anchors the funnel — every "see your roadmap" link
 * across the site lands here. Built from canonical constants (lib/pricing).
 */

import { useEffect } from 'react';
import RoadmapJourney from './RoadmapJourney';
import { GROWTH_SCORE_DIMENSIONS } from './lib/pricing';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const TIMELINE = [
  { tag: 'Days 1–30', h: 'Build the base', body: 'Website foundation, core SEO + tracking, GBP cleanup, baseline audit + your visibility score.', stage: 'Foundation' },
  { tag: 'Days 31–60', h: 'Signals start moving', body: 'Content + service-area pages, posting cadence, review velocity. The first calls and form-fills show up.', stage: 'Growth' },
  { tag: 'Days 61–90+', h: 'It compounds', body: 'Authority and AI visibility stack month over month. Better data, better decisions, climbing score.', stage: 'Scale' },
];

export default function RoadmapPage() {
  // BreadcrumbList JSON-LD so the page slots cleanly into the site graph.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lola.tyalexandermedia.com/' },
        { '@type': 'ListItem', position: 2, name: 'The Growth Roadmap', item: 'https://lola.tyalexandermedia.com/roadmap' },
      ],
    };
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.dataset.lola = 'roadmap';
    tag.textContent = JSON.stringify(ld);
    document.head.appendChild(tag);
    return () => { tag.parentNode?.removeChild(tag); };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative pt-2 text-center sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The Growth Roadmap
        </p>
        <h1
          className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.08] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
        >
          You&apos;re not buying SEO. You&apos;re{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            following a roadmap
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[17px]">
          Start free, see your number, then advance by maturity — not by the calendar.
          Here&apos;s the whole path, end to end.
        </p>
      </section>

      {/* ── THE VISUAL ROADMAP ────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <RoadmapJourney />
      </section>

      {/* ── CONSTRAINT FRAMING — one bottleneck per stage ─────────────
          Applies the core scaling principle: growth = finding and removing
          the single biggest constraint at your level. Reframes the roadmap as
          a diagnostic, not a menu. */}
      <section className="mt-16 sm:mt-24">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Why stages
        </p>
        <h2
          className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          Every stage breaks one bottleneck.
        </h2>
        <p className="mx-auto mt-4 max-w-[620px] text-center text-[14px] leading-[1.6] text-[#C5C5C8]">
          Growth isn&apos;t a hundred things at once — it&apos;s removing the single thing
          holding you back right now. Each stage targets the one constraint that matters at
          your level, so you never pay for work that&apos;s ahead of where you are.
        </p>
        <div className="mx-auto mt-8 flex max-w-[760px] flex-col gap-3">
          {[
            { stage: 'Before you start', bottleneck: 'You can’t see where you stand.', fix: 'The free Growth Score names your number — and your #1 gap.' },
            { stage: 'Foundation', bottleneck: 'You’re invisible and untracked.', fix: 'A searchable, trackable base, so every later dollar compounds instead of leaking.' },
            { stage: 'Growth', bottleneck: 'Not enough flow.', fix: 'Content, posting, and reviews turn visibility into calls, forms, and messages.' },
            { stage: 'Scale', bottleneck: 'Growth has stopped compounding.', fix: 'Multi-service, multi-city, and AI-search systems stack month over month.' },
          ].map((c) => (
            <div
              key={c.stage}
              className="flex flex-col gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:gap-5"
            >
              <div className="sm:w-[150px] sm:shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">{c.stage}</p>
                <p className="mt-1 text-[13px] font-semibold text-white">{c.bottleneck}</p>
              </div>
              <div className="hidden h-10 w-px bg-white/[0.10] sm:block" />
              <p className="flex-1 text-[13px] leading-[1.55] text-[#C5C5C8]">
                <span className="font-semibold text-[#D4AF37]">We break it: </span>{c.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT TO EXPECT (30/60/90) ─────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          What to expect
        </p>
        <h2
          className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          Visibility compounds. Here&apos;s the curve.
        </h2>
        <div className="mx-auto mt-8 grid max-w-[860px] grid-cols-1 gap-4 sm:grid-cols-3">
          {TIMELINE.map((t, i) => (
            <div key={t.tag} className="flex flex-col rounded-[14px] border border-white/[0.10] bg-white/[0.02] p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37]/[0.12] text-[12px] font-bold text-[#D4AF37]">
                  {i + 1}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{t.tag}</span>
              </div>
              <p className="mt-3 text-[17px] font-bold text-white">{t.h}</p>
              <p className="mt-2 flex-1 text-[13px] leading-[1.55] text-[#C5C5C8]">{t.body}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A8F98]">{t.stage} stage</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-[600px] text-center text-[11px] text-[#5A5F68]">
          Timelines vary by market and starting point. The 30-Day Half-Back and First Win
          guarantees put real accountability on the early days.
        </p>
      </section>

      {/* ── THE GROWTH SCORE ──────────────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          How we measure it
        </p>
        <h2
          className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          One Growth Score. Six dimensions.
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-center text-[14px] leading-[1.6] text-[#C5C5C8]">
          Every stage moves specific dimensions. Your dashboard rolls them into one number —
          so progress is never a mystery.
        </p>
        <div className="mx-auto mt-8 flex max-w-[720px] flex-wrap justify-center gap-2.5">
          {GROWTH_SCORE_DIMENSIONS.map((dim) => (
            <span
              key={dim}
              className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 py-2 text-[13px] font-semibold text-[#E8E4D8]"
            >
              {dim}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-24 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Start at step one</p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.5rem)' }}
        >
          Get your free Growth Score.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.55] text-[#C5C5C8]">
          60 seconds, no signup. See your number, then we&apos;ll map the fastest path to your next one.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/growth-score"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right active:scale-[0.98] sm:w-auto"
          >
            Get my Growth Score →
          </a>
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition hover:border-white/[0.3] sm:w-auto"
          >
            Book a free roadmap call
          </a>
        </div>
      </section>

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
