/// <reference types="vite/client" />
/**
 * /case-studies — index page listing all published Lola case studies.
 *
 * Currently 1 published (Sandbar), 2 placeholders honestly framed as "coming
 * soon." This page is the SEO + trust anchor — internal-link target for
 * /sandbar, gives the homepage somewhere to send "see proof" traffic, and
 * signals the case-study slot for future publishes.
 *
 * No fake "Coming soon — Brand X" placeholders. Either we have a real client
 * with a public-shareable story, or we frame the slot honestly without
 * naming a client that hasn't agreed to be public.
 */

import { useEffect } from 'react';
import { track } from './analytics';

export default function CaseStudiesIndex() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = 'Case Studies — Lola | Local AI Visibility Wins';
    if (desc) {
      desc.setAttribute(
        'content',
        'Real Lola case studies — how we moved local service businesses from invisible to ranked across Google + AI search. Honest fine print, real claims only.',
      );
    }

    const block = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Lola Local AI Visibility — Case Studies',
      url: 'https://lola.tyalexandermedia.com/case-studies',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            url: 'https://lola.tyalexandermedia.com/case-studies/sandbar',
            name: 'Sandbar Soft Wash — Palm Harbor, FL',
          },
        ],
      },
    };
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.dataset.lola = 'case-studies-index';
    tag.textContent = JSON.stringify(block);
    document.head.appendChild(tag);

    track('case_studies_index_viewed');

    return () => {
      tag.parentNode?.removeChild(tag);
      document.title = prevTitle;
      if (desc) desc.setAttribute('content', prevDesc);
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="pt-2 sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Case Studies · Real Wins
        </p>
        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          The{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            proof
          </span>{' '}
          file.
        </h1>
        <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          Each case study uses only claims we already publish elsewhere on the site —
          no fabricated metrics. Live time-series graphs land on each page as the
          tracker accumulates more history.
        </p>
      </section>

      {/* ── PUBLISHED ─────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Published
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <a
            href="/case-studies/sandbar"
            onClick={() => track('case_studies_card_clicked', { slug: 'sandbar' })}
            className="group relative flex flex-col rounded-[14px] border border-[#D4AF37]/30 bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#15110A] p-6 shadow-[0_0_28px_rgba(212,175,55,0.10)] transition-all hover:-translate-y-1 hover:border-[#D4AF37]/60 hover:shadow-[0_0_44px_rgba(212,175,55,0.22)] sm:p-7"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
              Pressure Washing · Palm Harbor, FL
            </p>
            <h2 className="mt-3 text-[24px] font-bold tracking-[-0.01em] text-white sm:text-[28px]">
              Sandbar Soft Wash
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
              From invisible to 5 ranked keywords in 3 weeks. The original proof story
              — Coach Ty&apos;s father&apos;s 15+ year master-certified family business, and
              the reason Lola exists.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
                5 keywords
              </span>
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
                3 weeks
              </span>
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
                20+ cities
              </span>
            </div>
            <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition group-hover:translate-x-1">
              Read the case study →
            </p>
          </a>

          {/* Live dashboard card — public proof you can hand a prospect. */}
          <a
            href="/r/client/sandbar"
            onClick={() => track('case_studies_card_clicked', { slug: 'sandbar', kind: 'live' })}
            className="group relative flex flex-col rounded-[14px] border border-emerald-500/30 bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#0A1410] p-6 shadow-[0_0_28px_rgba(16,185,129,0.10)] transition-all hover:-translate-y-1 hover:border-emerald-500/60 sm:p-7"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <span aria-hidden className="mr-1">●</span>Live dashboard · updated weekly
            </p>
            <h2 className="mt-3 text-[24px] font-bold tracking-[-0.01em] text-white sm:text-[28px]">
              Sandbar Soft Wash — live data
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
              The real ranking history, AI Share of Voice, and calls/leads/clicks Lola is driving
              right now. No login. PII stripped. The dashboard we&apos;d hand your business too.
            </p>
            <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-300 transition group-hover:translate-x-1">
              Open the live dashboard →
            </p>
          </a>

          {/* Honest placeholder card — we're explicit it's coming, no
              fake business names or fabricated numbers. */}
          <div className="flex flex-col rounded-[14px] border border-dashed border-white/[0.10] bg-white/[0.01] p-6 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Next publish — coming
            </p>
            <h2 className="mt-3 text-[24px] font-bold tracking-[-0.01em] text-[#9CA3AF] sm:text-[28px]">
              Your business?
            </h2>
            <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-[#9CA3AF] sm:text-[15px]">
              When a roadmap client agrees to go public, this is where their story lands.
              Real numbers from the live tracker, week-by-week playbook breakdown, AI
              Share-of-Voice graphs. Want to be next?
            </p>
            <a
              href="/grader"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 self-start rounded-[10px] border border-[#D4AF37]/40 bg-white/[0.02] px-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.08]"
            >
              Run the free Grader →
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW WE WRITE THESE ─────────────────────────── */}
      <section className="mt-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          How we write these
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          The rules.
        </h2>
        <ul className="mt-5 flex flex-col gap-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">No fabricated metrics.</span>{' '}
              Every number on a Lola case study comes from a public claim we already make
              elsewhere on the site OR the live tracker.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">Client written consent.</span>{' '}
              We don&apos;t name a client publicly until they&apos;ve agreed in writing.
              Sandbar is family — that&apos;s a separate kind of consent.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">Conflict of interest disclosure.</span>{' '}
              Sandbar is Coach Ty&apos;s father&apos;s business. That&apos;s flagged on the
              case study itself, not hidden in a footnote.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">Live time-series graphs.</span>{' '}
              As each case study&apos;s tracker accumulates more history, we publish the
              actual ranking + AI Share-of-Voice graphs from the dashboard. No static
              "before/after" — the data lives.
            </span>
          </li>
        </ul>
      </section>

      <div className="mt-12 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-16">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
