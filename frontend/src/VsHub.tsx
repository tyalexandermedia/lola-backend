/// <reference types="vite/client" />
/**
 * /vs — comparison hub.
 *
 * Lists every Lola-vs-X comparison page in a clean grid. Two ROI plays:
 *   1. Internal-linking authority — distributes link equity into the
 *      individual /vs/:slug pages.
 *   2. Captures broader-intent queries ("lola seo alternatives", "best
 *      local SEO for service businesses") that don't name a specific
 *      competitor.
 *
 * Pulls the COMPETITORS map from VsPage so adding a new competitor =
 * one config entry, both the hub and the detail page light up automatically.
 */

import { useEffect } from 'react';
import { track } from './analytics';
import { getCompetitorSlugs } from './VsPage';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

// Light-weight per-card data (shape mirrors the hero cards on competitor
// pages but doesn't pull the entire VsPage config — we just need the
// name, slug, one-line, and price-range column).
const CARDS: Array<{ slug: string; name: string; oneLine: string; priceRange: string; category: string }> = [
  { slug: 'localiq',     name: 'LocalIQ',     oneLine: 'Enterprise local marketing platform (Gannett-owned).', priceRange: 'Quote-only',           category: 'Platform + ads' },
  { slug: 'brightlocal', name: 'BrightLocal', oneLine: 'DIY local-SEO software platform used by 15,000+ businesses and agencies.', priceRange: '$39 – $59 /mo', category: 'DIY tool' },
  { slug: 'scorpion',    name: 'Scorpion',    oneLine: 'Enterprise local-services digital agency for home services, legal, franchise.', priceRange: 'Quote-only · $3K+ typical', category: 'Full-stack agency' },
  { slug: 'podium',      name: 'Podium',      oneLine: 'AI messaging + reviews platform — converts existing traffic into leads.', priceRange: '$399 – $799+ /mo', category: 'Lead capture' },
  { slug: 'yext',        name: 'Yext',        oneLine: 'Enterprise listings management + Answers AI for multi-location brands.', priceRange: 'Enterprise quote', category: 'Listings platform' },
  { slug: 'hibu',        name: 'Hibu',        oneLine: 'Full-service local digital marketing agency — sites, ads, SEO, social.', priceRange: 'Quote-only', category: 'Full-stack agency' },
];

export default function VsHub() {
  // Validate cards stay in sync with COMPETITORS map. If anyone adds a
  // config to VsPage.tsx but forgets the hub card, console.warn so it
  // gets noticed in dev — production still renders fine.
  useEffect(() => {
    const inMap = new Set(getCompetitorSlugs());
    const inCards = new Set(CARDS.map((c) => c.slug));
    const missingCards = [...inMap].filter((s) => !inCards.has(s));
    if (missingCards.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[VsHub] /vs detail pages exist without hub cards:', missingCards);
    }
  }, []);

  // Inject CollectionPage + ItemList JSON-LD for the comparison hub.
  // Title + description swap per route (SPA shell otherwise reuses the
  // homepage's static title).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = 'Compare Lola to Local SEO Alternatives — LocalIQ, BrightLocal, Scorpion + more | Lola';
    if (desc) {
      desc.setAttribute(
        'content',
        'Honest side-by-side comparisons of Lola vs LocalIQ, BrightLocal, Scorpion, Podium, Yext, and Hibu. Pricing, model, AI search, guarantee — see which fits.',
      );
    }

    const block = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Lola SEO Comparison Hub',
      url: 'https://lola.tyalexandermedia.com/vs',
      description: 'Lola vs the major local SEO + AI visibility alternatives.',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: CARDS.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://lola.tyalexandermedia.com/vs/${c.slug}`,
          name: `Lola vs ${c.name}`,
        })),
      },
    };
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.dataset.lola = 'vs-hub';
    tag.textContent = JSON.stringify(block);
    document.head.appendChild(tag);

    track('vs_hub_viewed');

    return () => {
      tag.parentNode?.removeChild(tag);
      document.title = prevTitle;
      if (desc) desc.setAttribute('content', prevDesc);
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Honest Comparisons
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          Lola vs{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            everyone else
          </span>
          .
        </h1>

        <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          Side-by-side breakdowns of how Lola compares to the major local SEO + AI visibility
          alternatives. Real pricing, honest fit cases, credit where credit&apos;s due. We don&apos;t
          take affiliate revenue from any of them.
        </p>
      </section>

      {/* ── COMPARISON GRID ───────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {CARDS.map((c) => (
            <a
              key={c.slug}
              href={`/vs/${c.slug}`}
              onClick={() => track('vs_hub_card_clicked', { competitor: c.slug })}
              className="group relative flex flex-col rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.04] sm:p-7"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/70">
                  {c.category}
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#8A8F98]">
                  {c.priceRange}
                </p>
              </div>

              <h2 className="mt-3 text-[22px] font-bold tracking-[-0.01em] text-white sm:text-[26px]">
                Lola vs <span className="text-[#D4AF37]">{c.name}</span>
              </h2>

              <p className="mt-3 flex-1 text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]">
                {c.oneLine}
              </p>

              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#D4AF37] transition group-hover:translate-x-1">
                See the comparison →
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* ── WHY WE PUBLISH THESE ──────────────────────────── */}
      <section className="mt-14 rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Why we publish these
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          Coach Ty&apos;s rule: tell the truth, even when it costs us the close.
        </h2>
        <p className="mt-4 text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          If LocalIQ, BrightLocal, Scorpion, Podium, Yext, or Hibu is the better fit for your
          business — we&apos;ll tell you. Each page calls out exactly when the competitor wins and
          when Lola wins. No affiliate links, no shill, no fake screenshots. The honest play is
          the durable one.
        </p>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mt-12 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-16 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Faster than reading comparison pages
        </p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Get your AI Visibility Score in 60 seconds.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          See exactly where you stand on Google, ChatGPT, Perplexity, and Gemini —
          then book a 15-minute call to pick the right next move.
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
            Book a strategy call
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
