/// <reference types="vite/client" />
/**
 * /start — the dead-simple front door.
 *
 * One clear next step, one button. No comparison tables, no scrolling
 * marathon. This is the link you TEXT someone: they grasp
 * "what do I get / where do I start / what do I do" in one screen.
 *
 * For shoppers who want detail, /pricing still exists (linked at the bottom).
 */

import { useEffect } from 'react';
import { useReveal } from './lib/useReveal';
import { track } from './analytics';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const callHref = `${CALENDAR_URL}${CALENDAR_URL.includes('?') ? '&' : '?'}utm_source=start&utm_medium=page&utm_campaign=start_cta`;

export default function Start() {
  useReveal();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = 'Get Found Online — Done For You | Lola';
    if (desc) desc.setAttribute('content', 'AI website + local SEO + Google Business + AI-search visibility, done for you. The $997 Full Build, one-time — backed by the Half-Back Guarantee. Prefer to do it yourself? $197 DIY. You answer the phone; we handle the rest.');
    track('start_page_viewed');
    return () => { document.title = prevTitle; if (desc) desc.setAttribute('content', prevDesc); };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* HERO — the whole pitch, above the fold */}
      <section className="relative pt-4 text-center sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_60%)] blur-2xl"
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          For local service businesses
        </p>
        <h1
          className="mx-auto mt-4 max-w-[680px] font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 3.75rem)' }}
        >
          Get found online —{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            we do all of it
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          You answer the phone. We handle everything that makes it ring —
          on Google <span className="text-white">and</span> AI search.
        </p>

        <a
          href={callHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('start_cta_clicked', { spot: 'hero' })}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-8 text-[15px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right active:scale-[0.98] sm:h-16 sm:text-[16px]"
        >
          Book a free 15-min call →
        </a>
        <p className="mt-4 text-[13px] text-[#9CA3AF]">
          <span className="font-semibold text-white">$997 Full Build</span>, one-time · no setup fee · Half-Back Guarantee
        </p>
      </section>

      {/* WHAT YOU GET — 4 plain tiles */}
      <section className="mt-14 sm:mt-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85">
          Everything's included
        </p>
        <div className="mx-auto mt-5 grid max-w-[640px] grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { e: '🌐', t: 'AI Website', s: 'Built + hosted' },
            { e: '🔎', t: 'Get Ranked', s: 'Google + AI' },
            { e: '📍', t: 'Google Business', s: 'Managed weekly' },
            { e: '📊', t: 'Live Dashboard', s: 'See every call' },
          ].map((x) => (
            <div key={x.t} className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <div aria-hidden className="text-[24px]">{x.e}</div>
              <p className="mt-2 text-[14px] font-semibold text-white">{x.t}</p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{x.s}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-[520px] text-center text-[13px] text-[#8A8F98]">
          Prefer to do it yourself? The <span className="text-white">$197 DIY</span> guide gives you your Growth Score plus a simple 5-step fix-it checklist.
        </p>
      </section>

      {/* HOW IT WORKS — 3 steps, dead simple */}
      <section className="mt-14 sm:mt-20">
        <div className="mx-auto grid max-w-[680px] grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { n: '1', h: 'Book a call', s: '15 minutes. We confirm your market is open.' },
            { n: '2', h: 'We build + launch', s: 'Website, SEO, Google Business — done in days.' },
            { n: '3', h: 'You answer the phone', s: 'Calls, clicks + forms land. You watch the dashboard.' },
          ].map((x) => (
            <div key={x.n} className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Step {x.n}</p>
              <p className="mt-2 text-[17px] font-bold text-white">{x.h}</p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-[#C5C5C8]">{x.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROOF + GUARANTEE strip */}
      <section className="mx-auto mt-12 flex max-w-[640px] flex-col items-center gap-3 rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-6 text-center sm:mt-16">
        <p className="text-[14px] leading-[1.6] text-[#C5C5C8]">
          🛡️ <span className="font-semibold text-white">Half-Back Guarantee.</span>{' '}
          We pick 5 money keywords together in week 1. If we don&apos;t get at least 1 ranking on
          page 1 or in the map pack within 30 days, you get half back.
        </p>
        <p className="text-[13px] text-[#9CA3AF]">
          Real proof:{' '}
          <a href="/r/client/sandbar" className="text-[#D4AF37] underline-offset-2 hover:underline">
            Sandbar Soft Wash — watch the live ranking dashboard →
          </a>
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto mt-12 w-full max-w-[640px] rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-16 sm:p-10">
        <h2 className="font-bold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)' }}>
          Start your build today.
        </h2>
        <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]">
          The $997 Full Build gets you a new site built and ranked — on Google and in AI answers — backed by the Half-Back Guarantee. Book the call to get started.
        </p>
        <a
          href={callHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('start_cta_clicked', { spot: 'final' })}
          className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-8 text-[15px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right active:scale-[0.98] sm:h-16"
        >
          Start my build →
        </a>
      </section>

      <div className="mt-10 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68]">
        <p>
          Want the full breakdown? <a href="/pricing" className="text-[#D4AF37] underline-offset-2 hover:underline">See all plans →</a>
        </p>
        <p className="mt-3">Ty Alexander Media · Tampa Bay · © 2026 🐾</p>
      </div>
    </main>
  );
}
