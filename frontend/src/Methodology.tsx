/// <reference types="vite/client" />
/**
 * /methodology — How the Lola Local AI Visibility Grader scores you.
 *
 * Pure E-E-A-T play. Transparency about how the score is computed kills
 * the "black box" objection competitors leverage, earns linking from
 * other SEO blogs (Sterling Sky-style), and feeds the Article schema
 * for AI Overview eligibility on "how does local AI visibility work"
 * type queries.
 *
 * No CTA pressure. Trust comes from showing the work.
 */

import { useEffect } from 'react';
import { track } from './analytics';

export default function Methodology() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = 'Methodology — How the Lola Local AI Visibility Grader Scores | Lola';
    if (desc) {
      desc.setAttribute(
        'content',
        'Full transparency: exactly how the Lola Local AI Visibility Grader scores your business across 5 categories (GBP, citations, reviews, on-page, AI search presence). No black box.',
      );
    }

    // Article + BreadcrumbList JSON-LD. The Article makes the page
    // eligible for AI Overview / featured-snippet coverage on
    // "how does local AI SEO work" style queries.
    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How the Lola Local AI Visibility Grader Scores',
        description: 'Full methodology for the 0-100 Local AI Visibility Score: 5 categories, weighting, and how each signal is measured.',
        author: { '@type': 'Person', '@id': 'https://tyalexandermedia.com#person' },
        publisher: { '@id': 'https://lola.tyalexandermedia.com/#business' },
        url: 'https://lola.tyalexandermedia.com/methodology',
        about: ['Local SEO', 'AI Search Visibility', 'Google Business Profile', 'AEO', 'GEO'],
        inLanguage: 'en-US',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lola.tyalexandermedia.com/' },
          { '@type': 'ListItem', position: 2, name: 'Methodology', item: 'https://lola.tyalexandermedia.com/methodology' },
        ],
      },
    ];
    const tags = blocks.map((b) => {
      const t = document.createElement('script');
      t.type = 'application/ld+json';
      t.dataset.lola = 'methodology';
      t.textContent = JSON.stringify(b);
      document.head.appendChild(t);
      return t;
    });

    track('methodology_viewed');

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
          Methodology · Open Book
        </p>
        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          How the Lola{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            AI Visibility Score
          </span>{' '}
          is calculated.
        </h1>
        <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          We don&apos;t hide the math. Five categories, weighted by what actually moves rankings and
          AI recommendations for local service businesses. Run the Grader and you get the same
          breakdown — this page just shows you what&apos;s under the hood.
        </p>
      </section>

      {/* ── HEADLINE FORMULA ──────────────────────────────── */}
      <section className="mt-16 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.06] via-transparent to-transparent p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          The formula
        </p>
        <p className="mt-4 text-[18px] leading-[1.6] text-white sm:text-[20px]">
          <span className="font-semibold">Final Score (0–100)</span> = weighted sum of five category
          scores. Each category is scored 0–100 based on objective signals pulled from Google,
          public directories, and live AI-agent responses. No subjective scoring, no &quot;our gut feel.&quot;
        </p>
      </section>

      {/* ── 5 CATEGORIES IN DEPTH ─────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The five categories
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          What we measure, and why.
        </h2>

        <div className="mt-8 flex flex-col gap-5">
          {[
            {
              n: '01',
              weight: '25%',
              h: 'Google Business Profile completeness',
              why: "GBP is still the #1 signal for &apos;[service] near me&apos; rankings and Maps presence. AI agents lean on GBP for hours, services, and category fit when answering local recommendation queries.",
              signals: [
                'Profile claimed + verified status',
                'Primary + secondary categories filled correctly',
                'Service list present and matches what you actually offer',
                'Business hours present + accurate',
                'Photo count + recency (last upload < 30 days)',
                'GBP posts in the last 30 days (signals active management)',
              ],
              source: 'Google Places API (live)',
            },
            {
              n: '02',
              weight: '20%',
              h: 'Citations + NAP consistency',
              why: 'Inconsistent Name/Address/Phone across the top local directories tanks both Google rankings and AI confidence. AI agents treat inconsistency as a signal the business may not be reputable.',
              signals: [
                'Listed on the top 10 high-authority directories for your category',
                'Name, address, phone identical across all listings',
                'Category alignment across directories',
                'No duplicate or stale listings',
              ],
              source: 'Public directory APIs + Google Custom Search',
            },
            {
              n: '03',
              weight: '15%',
              h: 'Reviews + velocity',
              why: 'Star rating is the single biggest conversion lever in local search. Review velocity (rate of new reviews) is a freshness signal that both Google and AI agents weigh heavily.',
              signals: [
                'Average star rating (Google + Yelp + industry-specific sources)',
                'Total review count',
                'Velocity: new reviews in the last 90 days vs prior 90 days',
                'Response rate to negative reviews',
              ],
              source: 'Google Places API + public review aggregators',
            },
            {
              n: '04',
              weight: '15%',
              h: 'On-page + schema',
              why: 'On-page signals tell crawlers what the page is about. Schema (JSON-LD) tells AI agents what your business is — without schema, AI search has to guess from copy.',
              signals: [
                'Title tag includes service + city (local intent signal)',
                'H1 present and matches the page topic',
                'Meta description present and < 160 chars',
                'Canonical tag present',
                'Schema.org JSON-LD: LocalBusiness or appropriate subtype (e.g. Plumber, Roofer)',
                'Mobile + Core Web Vitals (page speed)',
              ],
              source: 'Live HTML fetch + parsing (audits/page_seo_checks.py)',
            },
            {
              n: '05',
              weight: '25%',
              h: 'AI search presence',
              why: 'The newest and fastest-growing category. We ask ChatGPT/Perplexity/Gemini/Claude the queries your buyers ask — "best [service] in [city]" — and record whether your business is named. If it isn&apos;t, we log who is, so the playbook can target their citation sources.',
              signals: [
                'Mention rate across AI Mode prompts (% of runs where AI named you)',
                'Share of Voice vs the top 3 competitors named instead',
                'Citation sources AI references when recommending competitors (Wikipedia, Yelp, BBB, etc.)',
                'Sentiment of mentions (positive / neutral / negative)',
              ],
              source: 'Live AI calls + structured output parsing (case_studies/tracker.py)',
            },
          ].map((c) => (
            <div
              key={c.n}
              className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">{c.n}</p>
                  <h3 className="text-[20px] font-bold text-white sm:text-[22px]">{c.h}</h3>
                </div>
                <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Weight {c.weight}
                </span>
              </div>
              <p
                className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]"
                dangerouslySetInnerHTML={{ __html: c.why }}
              />

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">
                  Signals measured
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {c.signals.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-[13px] leading-[1.55] text-[#C5C5C8] sm:text-[14px]">
                      <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-5 text-[11px] text-[#7A7F8A]">
                <span className="font-semibold text-[#9CA3AF]">Source:</span> {c.source}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DATA HONESTY ──────────────────────────────────── */}
      <section className="mt-16 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          What we don&apos;t do
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          The honest fine print.
        </h2>
        <ul className="mt-5 flex flex-col gap-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">We don&apos;t fabricate scores.</span> If
              Google Places or an AI API is down or rate-limited, the affected category shows as
              "pending" — we don&apos;t guess.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">Weights aren&apos;t arbitrary.</span> They&apos;re
              derived from what actually moves rankings in our own client data
              (Sandbar Soft Wash + the broader Lola portfolio). We update weights when the data
              tells us to — quarterly review.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">AI search is still moving.</span> ChatGPT, Perplexity,
              Gemini, and Google AI Overviews are all evolving how they rank local businesses.
              When their behavior shifts, the AI search presence signals shift — we&apos;ll update this
              page when that happens.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-1 text-[#D4AF37]">→</span>
            <span>
              <span className="font-semibold text-white">Your score is a snapshot.</span> Local
              search is dynamic — your score can move 5-10 points week-to-week without action.
              The trend over time is what matters.
            </span>
          </li>
        </ul>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Ready?</p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Run your free score with this methodology.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          60 seconds. Same five categories. Same math. You see your number and your top fixes.
        </p>
        <a
          href="/grader"
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:text-[15px]"
        >
          Run the Grader →
        </a>
      </section>

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
