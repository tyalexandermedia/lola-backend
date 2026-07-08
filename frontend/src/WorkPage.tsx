/**
 * /work — dedicated portfolio page.
 *
 * A shareable, indexable home for the real builds (own URL for outreach,
 * proposals, and "[Lola] portfolio" searches). Reuses the same <Portfolio />
 * cards + live-preview modal as the homepage/retainer sections, but owns the
 * page H1 so it reads as a standalone proof page.
 */

import { useReveal } from './lib/useReveal';
import { useSeo } from './lib/seo';
import Portfolio from './Portfolio';
import { PORTFOLIO } from './lib/portfolio';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

export default function WorkPage() {
  useReveal();
  useSeo({
    title: 'Our Work — Real Sites Lola Built & Ranked | Lola',
    description:
      'Real local-business websites Lola built and got found on Google and AI — Sandbar Soft Wash, Tampa Bay Power Clean, Travels by Val, and more. Scroll through the live sites.',
  });

  const count = PORTFOLIO.length;

  return (
    <main className="flex flex-1 flex-col">
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[520px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(40% 52% at 24% 12%, rgba(111,155,255,0.10), transparent 70%), radial-gradient(46% 56% at 80% 6%, rgba(212,175,55,0.18), transparent 70%)',
          }}
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">The work</p>
        <h1
          className="mt-4 max-w-[820px] font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.6vw, 3.4rem)' }}
        >
          Real businesses. Real sites.{' '}
          <span className="animate-shimmer bg-gradient-to-r from-[#D4AF37] via-[#FFF0B8] to-[#D4AF37] bg-clip-text text-transparent">
            Built and ranked.
          </span>
        </h1>
        <p className="mt-5 max-w-[660px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          Every one of these is a live site Lola built — and works to get found on Google and in
          AI answers. Tap any card to scroll through the real thing.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#9CA3AF]">
          <span className="font-semibold text-white">{count} live build{count === 1 ? '' : 's'}</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>Home services + beyond</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>Tampa Bay &amp; up</span>
        </div>
      </section>

      {/* Grid (header-less — the page owns the H1 above) */}
      <Portfolio showHeader={false} />

      {/* CTA */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-24 sm:p-12">
        <h2
          className="mx-auto max-w-[640px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.5rem)' }}
        >
          Want yours to be the next one?
        </h2>
        <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          The Full Build is $997, one-time — we build your site and get you found on Google and in
          AI answers, backed by the Half-Back Guarantee.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02] sm:h-16 sm:text-[15px]"
          >
            Book a free call →
          </a>
          <a
            href="/pricing"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            See pricing
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
