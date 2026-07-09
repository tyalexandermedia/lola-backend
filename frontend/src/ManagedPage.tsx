/**
 * /managed — "Lola Managed" $297/mo continuity page.
 *
 * NOT a public cold-traffic tier (that stays a clean two-tier $197/$997 on
 * /pricing). This is the LANDING PAGE the post-build nurture emails/texts point
 * to — "keep winning after your build". It's the place to actually convert the
 * monthly: what it does, cancel-anytime/no-contract trust, and a subscribe CTA.
 */

import { useReveal } from './lib/useReveal';
import { useSeo } from './lib/seo';
import { HALF_BACK_GUARANTEE } from './lib/pricing';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

// Stripe SUBSCRIPTION Payment Link for Lola Managed ($297/mo). Until set, the
// CTA falls back to booking a call so you can still close it live.
const MANAGED_URL =
  (import.meta.env.VITE_STRIPE_MANAGED_URL as string | undefined)?.trim() || '';

const PRICE = '$297';

const INCLUDES: ReadonlyArray<{ icon: string; title: string; detail: string }> = [
  {
    icon: '📲',
    title: 'Missed-Call Text-Back',
    detail:
      "Miss a call while you're on a job? The caller gets an instant text from your number so the lead never slips away. This alone pays for the month.",
  },
  {
    icon: '⭐',
    title: 'Review engine',
    detail:
      'We keep asking your happy customers for Google reviews on autopilot — the #1 driver of map-pack rankings and the trust that closes quotes.',
  },
  {
    icon: '🔁',
    title: 'Automated lead follow-up',
    detail:
      'Every new lead gets followed up by text and email so nothing goes cold while you’re in the field.',
  },
  {
    icon: '📍',
    title: 'Google Business + local SEO, kept fresh',
    detail:
      'Monthly Google Business posts, profile upkeep, and ongoing local SEO so you keep climbing instead of slipping.',
  },
  {
    icon: '🤖',
    title: 'AI-visibility monitoring',
    detail:
      'We watch how you show up when people ask ChatGPT, Perplexity, and Gemini for a company like yours — and keep you in the answer.',
  },
  {
    icon: '📈',
    title: 'Your live results dashboard',
    detail:
      'Calls, leads, reviews, and rankings in one place — so you can see exactly what the monthly is buying you.',
  },
];

export default function ManagedPage() {
  useReveal();
  useSeo({
    title: 'Lola Managed — keep winning after your build ($297/mo) | Lola',
    description:
      'Already built with Lola? Lola Managed keeps you winning every month — Missed-Call Text-Back, review engine, lead follow-up, Google Business + local SEO, and AI-visibility monitoring. $297/mo, cancel anytime, no contract.',
  });

  const startHref = MANAGED_URL || CALENDAR_URL;

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="animate-slide-up relative pt-2 text-center sm:pt-6">
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-12%] -z-10 h-[520px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(40% 52% at 24% 12%, rgba(111,155,255,0.10), transparent 70%), radial-gradient(46% 56% at 80% 6%, rgba(212,175,55,0.18), transparent 70%)',
          }}
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Lola Managed · for build clients
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] font-bold leading-[1.08] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)' }}
        >
          You built it. Now let’s{' '}
          <span className="animate-shimmer bg-gradient-to-r from-[#D4AF37] via-[#FFF0B8] to-[#D4AF37] bg-clip-text text-transparent">
            keep you winning.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          Rankings and reviews aren’t “set it and forget it.” The businesses that stay on top keep
          showing up every week. Lola Managed keeps your engine running — so the phone keeps ringing.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <a
            href={startHref}
            target={MANAGED_URL ? undefined : '_blank'}
            rel={MANAGED_URL ? undefined : 'noreferrer'}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-8 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02] sm:h-16 sm:text-[15px]"
          >
            {MANAGED_URL ? `Start Lola Managed — ${PRICE}/mo →` : 'Talk to Ty about Managed →'}
          </a>
          <p className="text-[12px] text-[#8A8F98]">
            {PRICE}/mo · cancel anytime · no contract{MANAGED_URL ? ' · secure checkout' : ''}
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="mt-16 sm:mt-20">
        <h2
          className="text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}
        >
          What we handle every month
        </h2>
        <div className="mx-auto mt-8 grid max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-2">
          {INCLUDES.map((f) => (
            <div
              key={f.title}
              className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-[#D4AF37]/30 sm:p-6"
            >
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="text-[22px]">{f.icon}</span>
                <h3 className="text-[16px] font-bold text-white sm:text-[17px]">{f.title}</h3>
              </div>
              <p className="mt-2 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / no-contract */}
      <section className="mx-auto mt-14 w-full max-w-[640px] rounded-2xl border border-[#D4AF37]/30 bg-white/[0.02] p-7 text-center sm:mt-16 sm:p-9">
        <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">No games</p>
        <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.6] text-white sm:text-[16px]">
          <span className="font-semibold">Cancel anytime.</span> No contract, no lock-in. If Managed isn’t
          earning its keep, you turn it off — you already own your site and your results.
        </p>
      </section>

      {/* Final CTA */}
      <section className="mt-14 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-16 sm:p-12">
        <h2
          className="mx-auto max-w-[600px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.5rem)' }}
        >
          Keep the momentum going.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          {PRICE}/mo keeps you ranked, reviewed, and followed up — everywhere your next customer looks.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={startHref}
            target={MANAGED_URL ? undefined : '_blank'}
            rel={MANAGED_URL ? undefined : 'noreferrer'}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02] sm:h-16 sm:text-[15px]"
          >
            {MANAGED_URL ? `Start Lola Managed — ${PRICE}/mo →` : 'Book a quick call →'}
          </a>
          {MANAGED_URL && (
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
            >
              Or ask Ty first
            </a>
          )}
        </div>
        <p className="mx-auto mt-6 flex items-center justify-center gap-2 text-[12px] text-[#8A8F98]">
          <span aria-hidden>{HALF_BACK_GUARANTEE.emoji}</span>
          Backed by the same straight-shooting promise as your build.
        </p>
      </section>

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
