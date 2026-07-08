/// <reference types="vite/client" />
/**
 * Lola — /retainer close page, repurposed as the $997 Full Build sales page.
 *
 * Single-CTA scrollable funnel optimized for hot leads from cold outreach and
 * Growth Score completers ready to buy. The Full Build ($997, one-time) is the
 * done-for-you offer: we build the site and get you ranked on Google and in AI
 * answers, backed by the Half-Back Guarantee. Price is shown once.
 *
 * Sticky mobile CTA bar at bottom. Desktop hides the sticky bar.
 *
 * Sections:
 *   1. Hero — single primary CTA
 *   2. What you get (the Full Build inclusions + price, shown once)
 *   3. Half-Back Guarantee (exact approved copy, near the price)
 *   4. How it works (onboarding — 5 keywords in week 1)
 *   5. Who this is for
 *   6. FAQ accordion (incl. guarantee Q&A)
 *   7. Founder story (Coach Ty)
 *   8. Final CTA + trust row
 */

import { useEffect } from 'react';
import { track } from './analytics';
import { BUILD, HALF_BACK_GUARANTEE } from './lib/pricing';
import { useSeo } from './lib/seo';
import { checkoutUrl } from './lib/checkout';

// Call-first: every Full Build CTA books a free call / starts the build.
// VITE_STRATEGY_CALL_URL / VITE_CALENDAR_URL override the default.
const BOOKING_URL =
  (import.meta.env.VITE_STRATEGY_CALL_URL as string | undefined) ||
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

function withUtm(url: string, content: string) {
  const p = new URLSearchParams({
    utm_source: 'lola_retainer',
    utm_medium: 'close_page',
    utm_campaign: 'full_build',
    utm_content: content,
  });
  return `${url}${url.includes('?') ? '&' : '?'}${p.toString()}`;
}

export default function RetainerPage() {
  useSeo({
    title: 'The Full Build — We Build It. We Rank It. $997 | Lola',
    description:
      'The $997 Full Build for local service businesses: a custom website built for you, 30 days of visibility work across Google and AI answer engines, Google Business Profile optimization, and direct access to Ty — backed by the Half-Back Guarantee.',
  });

  useEffect(() => {
    track('retainer_page_viewed');
  }, []);

  // Pay-now → instant onboarding when the Stripe Payment Link is configured;
  // otherwise fall back to booking a call (nothing breaks before the link exists).
  const buildPay = checkoutUrl('build');
  const retainerHref = buildPay || withUtm(BOOKING_URL, 'sticky_cta');
  const heroHref = buildPay || withUtm(BOOKING_URL, 'hero_cta');
  const finalHref = buildPay || withUtm(BOOKING_URL, 'final_cta');

  return (
    <>
      <main className="flex flex-1 flex-col pb-24 sm:pb-12">
        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <section className="relative pt-2 text-center sm:pt-6">
          {/* Ambient aurora — shared premium glow across all page heroes. */}
          <div
            aria-hidden
            className="animate-aurora pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[600px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
            style={{
              background:
                'radial-gradient(38% 50% at 22% 12%, rgba(111,155,255,0.12), transparent 70%), radial-gradient(46% 56% at 82% 6%, rgba(212,175,55,0.20), transparent 70%), radial-gradient(42% 46% at 56% 36%, rgba(165,96,231,0.10), transparent 70%)',
            }}
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The Full Build · Done for you
          </p>
          <h1
            className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.05] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
          >
            We build it.{' '}
            <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
              We rank it — everywhere people search now.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
            Stop reading SEO audits. We build your site and get you found — on Google and when
            people ask ChatGPT, Perplexity, or Gemini for a company like yours.{' '}
            <span className="font-semibold text-white">
              One-time {BUILD.price}, backed by the Half-Back Guarantee.
            </span>
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={heroHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('retainer_cta_clicked', { from: 'hero' })}
              className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 py-3 text-center text-[14px] font-bold uppercase leading-tight tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:w-auto sm:text-[15px]"
            >
              🦴 Start my build →
            </a>
            {/* Desktop: full button. Mobile: small text link (sticky bar
                already provides primary CTA; this avoids occlusion). */}
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'hero' })}
              className="hidden sm:inline-flex h-16 items-center justify-center rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[15px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition-all hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06]"
            >
              Apply first (we'll review fit)
            </a>
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'hero_mobile' })}
              className="text-[13px] font-semibold text-[#D4AF37] underline-offset-2 hover:underline sm:hidden"
            >
              Or apply first — Coach Ty reviews fit →
            </a>
          </div>
        </section>

        {/* ── 2. WHAT YOU GET (inclusions + price, shown once) ─────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            What you get
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Everything to get you found — done for you.
          </h2>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
            No packages, no tiers, no monthly retainer to sign. One flat price. Here&apos;s exactly
            what the Full Build includes.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
            {/* Inclusions */}
            <ul className="flex flex-col gap-3">
              {BUILD.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
                >
                  <span aria-hidden className="mt-0.5 text-[20px] text-[#D4AF37]">✓</span>
                  <p className="text-[15px] font-medium leading-[1.55] text-white sm:text-[16px]">
                    {item}
                  </p>
                </li>
              ))}
            </ul>

            {/* Price card — the ONLY place the price is shown */}
            <div className="rounded-2xl border-[1.5px] border-[#D4AF37]/50 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] p-7 text-center shadow-[0_0_28px_rgba(212,175,55,0.14)] sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8A8F98]">
                The Full Build
              </p>
              <p className="mt-3">
                <span className="inline-block bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[52px] font-extrabold leading-none text-transparent sm:text-[60px]">
                  {BUILD.price}
                </span>
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[#A0A5AE]">one-time · no contract</p>
              <a
                href={heroHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('retainer_cta_clicked', { from: 'price_card' })}
                className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right"
              >
                Start my build →
              </a>
              <p className="mt-3 text-[11px] text-[#8A8F98]">🔒 No payment to book a call</p>
            </div>
          </div>
        </section>

        {/* ── 3. HALF-BACK GUARANTEE (near the price) ──────────────────── */}
        <section className="mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#D4AF37]/50 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">
                {HALF_BACK_GUARANTEE.emoji}
              </span>
              {HALF_BACK_GUARANTEE.title}
            </p>
            <p className="relative mt-4 max-w-[720px] text-[16px] leading-[1.6] text-white sm:text-[18px]">
              {HALF_BACK_GUARANTEE.body}
            </p>
          </div>
        </section>

        {/* ── 4. HOW IT WORKS (onboarding) ─────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            How it works
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Simple, fast, and clear from day one.
          </h2>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
            <span className="font-semibold text-white">We&apos;ll choose your 5 target keywords together in week 1.</span>{' '}
            Then we build the site and go to work getting you found.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { n: '1', h: 'Book a call', s: '15 minutes. We confirm your market and pick your 5 money keywords together.' },
              { n: '2', h: 'We build + launch', s: 'Your custom site goes live and your Google Business Profile gets optimized.' },
              { n: '3', h: 'We rank you', s: '30 days of visibility work across Google and AI answers. You answer the phone.' },
            ].map((x) => (
              <div key={x.n} className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Step {x.n}</p>
                <p className="mt-2 text-[17px] font-bold text-white">{x.h}</p>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-[#C5C5C8]">{x.s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. WHO THIS IS FOR ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The fit check
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            This is for you if…
          </h2>

          <ul className="mt-8 flex flex-col gap-3 text-[15px] leading-[1.55] text-white sm:text-[16px]">
            {[
              'You run a local service business and want more calls and leads',
              'Tired of being invisible while competitors show up first',
              'Want it done FOR you — not another tool or dashboard to manage',
              'Want to get found on Google AND in AI answers (ChatGPT, Perplexity, Gemini)',
              'Believe in real work over agency BS',
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-[12px] border border-[#D4AF37]/15 bg-white/[0.02] px-5 py-3"
              >
                <span aria-hidden className="mt-0.5 text-[18px] text-[#D4AF37]">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 6. FAQ ──────────────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Common questions
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            The honest answers.
          </h2>

          <div className="mt-8 flex flex-col gap-3">
            {[
              {
                q: 'What if you don’t rank me?',
                a: 'You get half back, no argument. We only succeed if you do.',
              },
              {
                q: "What does 'done-for-you' actually mean?",
                a: "Coach Ty and Lola do the work for you — we build the site, optimize your Google Business Profile, and spend 30 days getting you found on Google and in AI answers. You don't touch a dashboard unless you want to.",
              },
              {
                q: 'Do you get me found in ChatGPT and AI search, not just Google?',
                a: 'Yes — that’s the whole point. We get you found when people ask ChatGPT, Perplexity, or Gemini for a company like yours, on top of ranking you in Google and the map pack.',
              },
              {
                q: 'How does the Half-Back Guarantee work?',
                a: HALF_BACK_GUARANTEE.body,
              },
              {
                q: "What if I'm already working with an SEO agency?",
                a: 'Fire them, or run us in parallel and compare. Most agencies charge $2K–$5K/mo and drag it out. The Full Build is one-time and backed by the Half-Back Guarantee.',
              },
              {
                q: "What if I'm not in Florida — or not a contractor?",
                a: "Lola works for any local service business — home services, cleaning, salons, med spas, auto detailing, lawn care, the whole map. We're Tampa-based because that's our home network, but the work lands anywhere with Google Maps and AI search.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
                onToggle={(e) => {
                  if ((e.currentTarget as HTMLDetailsElement).open) {
                    track('retainer_faq_opened', { question: item.q.slice(0, 40) });
                  }
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-[18px] text-[#D4AF37] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-[1.65] text-[#C5C5C8] sm:px-6 sm:pb-6 sm:text-[15px]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 7. FOUNDER STORY ────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Why Lola exists
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-10">
            <div className="mx-auto h-[160px] w-[160px] overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] sm:mx-0">
              <div className="flex h-full w-full items-center justify-center text-[44px]">🐾</div>
            </div>

            <div className="space-y-4 text-[15px] leading-[1.65] text-[#C5C5C8] sm:text-[16px]">
              <p>
                I built Lola because I watched too many local service businesses lose jobs
                to competitors with worse work but better Google presence.
              </p>
              <p>
                I'm Coach Ty. I run Ty Alexander Media in Tampa. My first proof story is my
                dad's business — Sandbar Soft Wash in Palm Harbor —{' '}
                <a href="/case-studies/sandbar" className="font-semibold text-[#D4AF37] underline-offset-2 hover:underline">
                  5 keywords ranked in 3 weeks
                </a>
                .
              </p>
              <p>
                Lola isn't a SaaS tool I'm trying to scale to a $100M exit. She's a real
                system I run for local owners I actually know.{' '}
                <span className="font-semibold text-white">Starting with my dad.</span>
              </p>
              <p className="text-white">
                <span className="font-bold text-[#D4AF37]">
                  You answer your own phones. So do I. Let's work.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 8. FINAL CTA ────────────────────────────────────────────── */}
        <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Last step
          </p>
          <h2
            className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
          >
            Done thinking. Time to rank.
          </h2>

          <a
            href={finalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('retainer_cta_clicked', { from: 'final' })}
            className="mt-7 inline-flex min-h-[56px] w-full max-w-[420px] items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-8 py-3 text-center text-[14px] font-bold uppercase leading-tight tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:w-auto sm:max-w-none sm:text-[16px]"
          >
            🦴 Start my build →
          </a>

          <p className="mt-4 text-[13px] text-[#D4AF37]/85">
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'final' })}
              className="font-semibold underline-offset-2 hover:underline"
            >
              Or apply first — Coach Ty reviews every application →
            </a>
          </p>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#8A8F98] sm:text-[12px]">
            <span>🔒 No payment to book</span>
            <span aria-hidden>·</span>
            <span>One-time {BUILD.price}</span>
            <span aria-hidden>·</span>
            <span>🛡️ Half-Back Guarantee</span>
          </p>
        </section>

        {/* footer */}
        <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68]">
          <p>Ty Alexander Media · Tampa Bay</p>
          <p className="mt-1">© 2026 · Built with Lola 🐾</p>
        </div>
      </main>

      {/* Sticky bottom CTA bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/30 bg-[#0A0A0B]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] backdrop-blur-[12px] sm:hidden">
        <a
          href={retainerHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('retainer_cta_clicked', { from: 'sticky_mobile' })}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-4 text-center text-[13px] font-bold uppercase leading-tight tracking-[0.04em] text-[#0A0A0B] shadow-[0_4px_16px_rgba(212,175,55,0.4)]"
        >
          🦴 Start my build — {BUILD.price} →
        </a>
      </div>
    </>
  );
}
