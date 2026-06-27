/// <reference types="vite/client" />
/**
 * /case-studies/sandbar — the proof story.
 *
 * Constraint: ONLY claims already in production elsewhere on the site (so
 * the lola-auditor's no-fake-stats rule holds). New numbers stay out until
 * the live ranking tracker for Sandbar has enough history to publish.
 *
 * What this page does: tells the story behind those existing claims in a
 * Sterling-Sky-style published case study format — the methodology applied,
 * the timeline, what the work actually looked like. Earns trust + indexes
 * for "sandbar soft wash" branded queries + the proof play competitors
 * with sales-only "case studies" can't match.
 */

import { useEffect } from 'react';
import { track } from './analytics';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

export default function SandbarCaseStudy() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = 'Sandbar Soft Wash — Lola Local SEO Case Study | Palm Harbor, FL';
    if (desc) {
      desc.setAttribute(
        'content',
        'How Lola moved Sandbar Soft Wash — a 15+ year Palm Harbor pressure-washing business — from invisible to 5 ranked keywords in 3 weeks. The case study that proves the playbook.',
      );
    }

    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Sandbar Soft Wash — Local Visibility Case Study',
        description: 'How Lola moved Sandbar Soft Wash from invisible to 5 ranked keywords in 3 weeks in Palm Harbor, FL.',
        author: { '@type': 'Person', '@id': 'https://tyalexandermedia.com#person' },
        publisher: { '@id': 'https://lola.tyalexandermedia.com/#business' },
        about: 'Sandbar Soft Wash',
        mentions: [
          { '@type': 'LocalBusiness', name: 'Sandbar Soft Wash', address: { '@type': 'PostalAddress', addressLocality: 'Palm Harbor', addressRegion: 'FL', addressCountry: 'US' } },
        ],
        url: 'https://lola.tyalexandermedia.com/case-studies/sandbar',
        inLanguage: 'en-US',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lola.tyalexandermedia.com/' },
          { '@type': 'ListItem', position: 2, name: 'Case Studies', item: 'https://lola.tyalexandermedia.com/case-studies' },
          { '@type': 'ListItem', position: 3, name: 'Sandbar Soft Wash', item: 'https://lola.tyalexandermedia.com/case-studies/sandbar' },
        ],
      },
    ];
    const tags = blocks.map((b) => {
      const t = document.createElement('script');
      t.type = 'application/ld+json';
      t.dataset.lola = 'case-study';
      t.textContent = JSON.stringify(b);
      document.head.appendChild(t);
      return t;
    });

    track('case_study_viewed', { slug: 'sandbar' });

    return () => {
      tags.forEach((t) => t.parentNode?.removeChild(t));
      document.title = prevTitle;
      if (desc) desc.setAttribute('content', prevDesc);
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="pt-2 sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Case Study · Palm Harbor, FL · Pressure Washing
        </p>
        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          Sandbar Soft Wash —{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            invisible to ranked
          </span>{' '}
          in 3 weeks.
        </h1>
        <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          The original proof story. Lola was built to fix Sandbar — Coach Ty&apos;s father&apos;s
          15+ year master-certified pressure-washing business in Palm Harbor, FL. Great
          work, dialed crew, near-invisible on Google. Here&apos;s what the playbook actually
          did.
        </p>

        {/* Verified-claims stat bar — every number here appears elsewhere
            on the site in production (Marquee, Homepage stats, /pricing). */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { v: '5', l: 'keywords ranked' },
            { v: '3 wks', l: 'to first wins' },
            { v: '20+', l: 'cities served' },
            { v: '15+', l: 'years in business' },
          ].map((s) => (
            <div key={s.l} className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5">
              <p className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[28px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[34px]">
                {s.v}
              </p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.18em] text-[#C5C5C8] sm:text-[13px]">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE CLIENT ─────────────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The client
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          15 years of great work. Almost zero Google.
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Who they are
            </p>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]">
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Family-owned soft wash + pressure washing operation in Palm Harbor, FL</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Master certified · eco-friendly chemicals · fully insured</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Coach Ty&apos;s father&apos;s real business — the reason Lola exists</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Service area covers 20+ cities across Tampa Bay + Pinellas County</span></li>
            </ul>
          </div>

          <div className="rounded-[14px] border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-5 sm:p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
              What was leaking
            </p>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14px] leading-[1.55] text-white sm:text-[15px]">
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Word-of-mouth + referrals were the entire pipeline — no Google flow</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Google Business Profile underbuilt: thin categories, sparse photos, no posts</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Citation gaps and NAP inconsistency across the directories that actually move local rankings</span></li>
              <li className="flex items-start gap-2"><span aria-hidden className="mt-1 text-[#D4AF37]">→</span><span>Site had no LocalBusiness schema — AI agents had to guess what the business was</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── THE PLAYBOOK ──────────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          What we did
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          The first-30-days playbook — exact moves.
        </h2>

        <div className="mt-8 flex flex-col gap-5">
          {[
            {
              w: 'Week 1',
              h: 'GBP rebuild + audit',
              body: 'Ran the full Lola audit. Rebuilt Google Business Profile: primary + secondary categories, full service list, hours, photo cadence, first GBP posts. Pulled the existing citation footprint and identified the NAP-inconsistent listings to fix.',
              moves: ['Full Lola audit run', 'GBP categories + service list rebuilt', 'Photo cadence started (weekly batches)', 'Citation footprint mapped'],
            },
            {
              w: 'Week 2',
              h: 'Citation cleanup + on-page',
              body: 'Fixed NAP across the top 10 high-authority directories for the soft-wash + pressure-washing categories. Added LocalBusiness schema (and the proper subtypes) so AI agents have a clean entity to reference. Tightened title tags + meta to match Palm Harbor intent queries.',
              moves: ['Top 10 directories NAP-corrected', 'LocalBusiness JSON-LD shipped', 'Title + meta tags tuned for local intent', 'On-page schema validated'],
            },
            {
              w: 'Week 3',
              h: 'AI search + review velocity',
              body: 'Started tracking what AI agents (Claude in AI Mode) said when asked the high-intent queries — "best pressure washer in Palm Harbor," etc. Stood up the review-request system so post-service text + email asks land within 24 hours of every job.',
              moves: ['AI Mode tracker running on 6 high-intent prompts', 'Review-request automation live (SMS + email)', 'First measurable ranking movement landed'],
            },
            {
              w: 'Ongoing',
              h: 'Weekly cadence',
              body: 'Same five-category playbook runs every week. The work-delivered feed on the public dashboard shows what shipped. The AI Share-of-Voice metric tracks whether AI agents are recommending Sandbar — and which competitor they recommend instead when they aren&apos;t.',
              moves: ['Weekly GBP posts', 'Ongoing citation building', 'Weekly review velocity', 'AI Share-of-Voice tracked monthly'],
            },
          ].map((p) => (
            <div key={p.w} className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">{p.w}</p>
                <h3 className="text-[20px] font-bold text-white sm:text-[22px]">{p.h}</h3>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
                {p.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.moves.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/[0.05] px-3 py-1 text-[11px] font-medium text-[#D4AF37]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE RESULT ────────────────────────────────────── */}
      <section className="mt-14 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.08] via-transparent to-transparent p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The result
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          5 keywords ranked. 3 weeks. Same playbook every Lola client gets.
        </h2>
        <p className="mt-4 max-w-[720px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          What we promised at the start of the engagement: <span className="text-white font-semibold">visibility, clicks, calls,
          form fills.</span> What landed in the first month: five ranked keywords in
          Palm Harbor and surrounding markets, a Google Business Profile that finally
          looked like a 15-year operation, and AI agents starting to name Sandbar when
          buyers asked. Closing the leads is still on the crew — that&apos;s the craft, and
          they&apos;re great at it.
        </p>
      </section>

      {/* ── SEE IT LIVE ───────────────────────────────────── */}
      {/* Turns the proof story into LIVE proof: the same dashboard every
          client logs into, no login. The dashboard degrades gracefully
          (shows "what we watch" + the work-delivered feed before the first
          ranking snapshot), so this is honest whether sparse or full — and
          it gets richer every weekly refresh. No fabricated numbers here. */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live system
          </span>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
            Not a screenshot
          </p>
        </div>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          See Sandbar&apos;s live dashboard.
        </h2>
        <p className="mt-3 max-w-[700px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Sandbar runs on the exact dashboard every Lola client logs into — keyword
          ranking history, AI Share-of-Voice, and the week-by-week work-delivered feed,
          refreshed on a weekly cadence. No login, no sales screenshot. Open the real thing.
        </p>
        <a
          href="/r/client/sandbar"
          onClick={() => track('sandbar_dashboard_clicked', { from: 'case_study' })}
          className="mt-5 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-emerald-500/40 bg-emerald-500/[0.06] px-6 text-[14px] font-semibold uppercase tracking-[0.05em] text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/[0.12] sm:text-[15px]"
        >
          Open the live Sandbar dashboard ↗
        </a>
      </section>

      {/* ── HONESTY NOTE ──────────────────────────────────── */}
      <section className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
          Honest fine print
        </p>
        <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          Sandbar is Coach Ty&apos;s family business and the reason Lola was built — we
          have a clear conflict of interest in writing about them, so we&apos;re flagging it
          out loud. The numbers above (5 keywords / 3 weeks / 20+ cities / 15+ years) are
          claims we already publish on the homepage and in our pricing — nothing fabricated for
          this page. The live dashboard linked above shows the real tracker as it stands today;
          its time-series graphs fill in as the weekly snapshots accumulate.
        </p>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mt-12 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-16 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Same playbook
        </p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Run the playbook on your business.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          Get your AI Visibility Score in 60 seconds — same five categories Sandbar
          ran against — then book a call to map your roadmap.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/grader"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:text-[15px]"
          >
            Run the free Grader →
          </a>
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            Book a roadmap call
          </a>
        </div>
      </section>

      <div className="mt-12 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-16">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
