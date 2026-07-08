/// <reference types="vite/client" />
/**
 * /build/start — instant onboarding after paying for the $997 Full Build.
 *
 * The Full Build Stripe Payment Link redirects here with ?session_id=... after
 * payment. There's no digital deliverable to gate (the build is done-for-you),
 * so this page's job is momentum: confirm the purchase, show exactly what
 * happens next, and get the kickoff call booked while intent is hot.
 */

import { useEffect, useState } from 'react';
import { useReveal } from './lib/useReveal';
import { track } from './analytics';
import { useSeo } from './lib/seo';
import { checkoutUrl } from './lib/checkout';
import { BUILD, HALF_BACK_GUARANTEE } from './lib/pricing';

const CALENDAR_URL =
  (import.meta.env.VITE_STRATEGY_CALL_URL as string | undefined) ||
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
  {
    n: '01',
    title: 'Book your kickoff call',
    body: 'Grab a time below — this week is best. It\'s you and Ty, 20–30 minutes. No prep required beyond the short list below.',
  },
  {
    n: '02',
    title: 'We pick your 5 money keywords together',
    body: 'On the call we choose the 5 searches most likely to bring you real jobs. These are what the Half-Back Guarantee is measured against.',
  },
  {
    n: '03',
    title: 'We build your site',
    body: 'Ty and Lola build your new site — fast, clean, and built to turn visitors into calls. You review it before it goes live.',
  },
  {
    n: '04',
    title: '30 days of getting you found',
    body: 'We work your visibility across Google and the AI tools (ChatGPT, Perplexity, Gemini) and optimize your Google Business Profile — so you show up where people are already searching.',
  },
];

export default function BuildOnboarding() {
  useReveal();
  const [paid, setPaid] = useState(false);

  useSeo({
    title: 'Your Full Build — Start Here | Lola',
    description:
      'Welcome to your $997 Full Build. Book your kickoff call, pick your 5 money keywords with Ty, and we build and rank it — backed by the Half-Back Guarantee.',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ok = params.get('session_id') || params.get('paid');
    setPaid(Boolean(ok));
    track(ok ? 'build_onboarding_paid_view' : 'build_onboarding_view');
  }, []);

  const bookHref = `${CALENDAR_URL}${CALENDAR_URL.includes('?') ? '&' : '?'}utm_source=lola&utm_medium=build_onboarding&utm_campaign=kickoff`;

  return (
    <main className="flex flex-1 flex-col">
      <section className="animate-slide-up relative pt-2 text-center sm:pt-6">
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-12%] -z-10 h-[560px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(40% 52% at 24% 12%, rgba(111,155,255,0.10), transparent 70%), radial-gradient(46% 56% at 80% 6%, rgba(212,175,55,0.18), transparent 70%)',
          }}
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          {paid ? '✓ Payment confirmed · Full Build' : 'The Full Build · $997'}
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3rem)' }}
        >
          {paid ? "You're in. Let's build it." : 'Ready to build it and rank it?'}
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          {paid
            ? 'One thing to do right now: book your kickoff call. Everything else, we drive.'
            : 'The Full Build is done-for-you — a new site, 30 days of visibility work, and your keywords picked with Ty. Start below.'}
        </p>

        <a
          href={paid ? bookHref : checkoutUrl('build') || '/retainer'}
          target={paid ? '_blank' : undefined}
          rel={paid ? 'noreferrer' : undefined}
          onClick={() => track(paid ? 'build_kickoff_cta' : 'build_buy_cta')}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-8 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02] sm:text-[15px]"
        >
          {paid ? 'Book your kickoff call →' : `Start my build — ${BUILD.price} →`}
        </a>
      </section>

      {/* What happens next */}
      <section className="mx-auto mt-14 flex w-full max-w-[760px] flex-col gap-4 sm:mt-16">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
            <div className="flex items-baseline gap-3">
              <span className="text-[13px] font-bold text-[#D4AF37]/70">{s.n}</span>
              <h3 className="text-[18px] font-bold text-white sm:text-[20px]">{s.title}</h3>
            </div>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">{s.body}</p>
          </div>
        ))}
      </section>

      {/* Prep list */}
      <section className="mx-auto mt-12 w-full max-w-[640px] rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-7 sm:p-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Bring to your kickoff</p>
        <p className="mt-2 text-[14px] text-[#9CA3AF]">Two minutes of thinking now saves a week later.</p>
        <ul className="mt-4 flex flex-col gap-2.5 text-[15px] text-white">
          {[
            'The 5 jobs or searches you most want to win (e.g. "AC repair Tampa")',
            'The towns and neighborhoods you serve',
            'Your top 3–5 services',
            'Your logo and a few real job photos, if you have them',
          ].map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 text-[#D4AF37]">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* Guarantee reminder */}
      <section className="mx-auto mt-12 w-full max-w-[640px] rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-7 text-center sm:p-8">
        <p className="flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          <span aria-hidden>{HALF_BACK_GUARANTEE.emoji}</span>
          {HALF_BACK_GUARANTEE.title}
        </p>
        <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-[1.6] text-white sm:text-[15px]">
          {HALF_BACK_GUARANTEE.body}
        </p>
      </section>

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
