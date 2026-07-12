/**
 * LOLA — standalone /pricing page.
 *
 * Two-tier offer (source of truth: docs/PRICING.md → frontend/src/lib/pricing.ts):
 *   - DIY         $197 one-time   "See your score. Fix it yourself."
 *   - Full Build  $997 one-time   "We build it. We rank it — everywhere people search now."
 *
 * The Full Build carries the Half-Back Guarantee. The Growth Score stays the
 * free, branded top-of-funnel lead magnet.
 *
 * Every CTA books a free call or starts the build. No Stripe self-serve
 * checkout — at these price points a 15-minute call closes far better than a
 * cold cart.
 */

import { useEffect, useRef } from 'react';
import { useReveal } from './lib/useReveal';
import {
  TIERS,
  GUARANTEES,
  BUILD_INCLUDED,
  type OfferTier,
} from './lib/pricing';
import { useSeo } from './lib/seo';
import IncludedAccordion from './IncludedAccordion';
import { checkoutUrl } from './lib/checkout';

// Page-scoped FAQs — each entry powers the visible accordion AND the
// FAQPage JSON-LD we inject into <head> at mount (route-specific schema
// since the static index.html schema only covers the homepage's FAQ set).
const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What if you don’t rank me?',
    a: 'You get half back, no argument. We only succeed if you do.',
  },
  {
    q: "What's the difference between DIY and the Full Build?",
    a: "DIY ($197, one-time) is for owners who want to do the work themselves — you get your full Growth Score plus a simple 5-step fix-it checklist. The Full Build ($997, one-time) is done for you: we build the site and get you found on Google and in AI answers, and it's backed by the Half-Back Guarantee.",
  },
  {
    q: 'What do I actually get with the Full Build?',
    a: "A custom website built for you, 30 days of visibility work across Google and the AI answer engines (ChatGPT, Perplexity, Gemini), Google Business Profile optimization, and direct access to Ty during the build. The whole point: you get found when people search — and get more calls and leads.",
  },
  {
    q: 'What is the Growth Score?',
    a: "It's a free 60-second scan of how you show up on Google and in AI answers, scored 0–100, with the one move that lifts you fastest. It's the front door — no cost, no signup. From there you can fix it yourself with the DIY guide or have us handle it with the Full Build.",
  },
  {
    q: 'How does the Half-Back Guarantee work?',
    a: 'We pick 5 money keywords for your business together in week 1. If we don’t get at least 1 of them ranking on page 1 or in the map pack within 30 days, you get half your investment back. No fine print.',
  },
  {
    q: 'Do you get me found in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. We get you found when people ask ChatGPT, Perplexity, or Gemini for a company like yours, on top of ranking you in Google and the map pack.",
  },
  {
    q: 'Is there a setup fee or contract?',
    a: 'No setup fee, no contract. Both DIY and the Full Build are one-time. You own the result.',
  },
  {
    q: 'Do you work outside Florida?',
    a: "Yes. Tampa Bay is home and our proof story (Sandbar Soft Wash) lives there, but the work lands in any market with Google Maps and AI search. Clients are in multiple states.",
  },
];

// ── Strategy-call destination (env-overridable) ───────────────
// Single source of truth: every stage CTA + the final CTA point here.
const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

function withUtm(url: string, content: string, campaign: string): string {
  const p = new URLSearchParams({
    utm_source: 'lola_pricing',
    utm_medium: 'pricing_page',
    utm_campaign: campaign,
    utm_content: content,
  });
  return `${url}${url.includes('?') ? '&' : '?'}${p.toString()}`;
}

function track(label: string, props?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    plausible?: (e: string, opts?: { props?: object }) => void;
    gtag?: (cmd: string, e: string, opts?: object) => void;
  };
  try {
    if (w.plausible) w.plausible(label, props ? { props } : undefined);
    else if (w.gtag) w.gtag('event', label, { event_category: 'pricing', ...(props || {}) });
    else console.log(`[track] ${label}`, props || {});
  } catch {}
}

export default function PricingPage() {
  useReveal();
  const promiseRef = useRef<HTMLDivElement>(null);
  const promiseSeen = useRef(false);

  useSeo({
    title: 'Pricing — DIY $197 or Full Build $997 | Lola',
    description:
      "Two simple options: DIY ($197 one-time) — see your Growth Score and fix it yourself. Full Build ($997 one-time) — we build your site and get you ranked on Google and in AI answers, backed by the Half-Back Guarantee.",
  });

  useEffect(() => {
    const el = promiseRef.current;
    if (!el || promiseSeen.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !promiseSeen.current) {
          promiseSeen.current = true;
          track('guarantee_viewed');
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Inject route-specific FAQPage JSON-LD. The static index.html schema only
  // covers homepage Qs; this layer answers buyer-intent queries like
  // "lola os pricing" with stage-specific facts. Cleaned up on unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PRICING_FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      // Service + per-tier Offer schema → eligible for rich pricing results.
      // Prices come straight from the canonical TIERS (lib/pricing.ts) so the
      // structured data can never drift from what's rendered on the page. Both
      // tiers are one-time.
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'LOLA — Local SEO & AI Visibility',
        serviceType: 'Local SEO and AI search visibility for service businesses',
        provider: {
          '@type': 'Organization',
          name: 'LOLA',
          url: 'https://lola.tyalexandermedia.com',
        },
        areaServed: { '@type': 'Country', name: 'United States' },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'LOLA offers',
          itemListElement: TIERS.map((tier) => {
            const amount = tier.price.replace(/[^0-9]/g, '');
            return {
              '@type': 'Offer',
              name: tier.name,
              description: tier.tagline,
              price: amount,
              priceCurrency: 'USD',
              url: 'https://lola.tyalexandermedia.com/pricing',
              category: 'OneTimePayment',
            };
          }),
        },
      },
    ];
    const tags = blocks.map((b) => {
      const t = document.createElement('script');
      t.type = 'application/ld+json';
      t.dataset.lola = 'pricing-schema';
      t.textContent = JSON.stringify(b);
      document.head.appendChild(t);
      return t;
    });
    return () => {
      tags.forEach((t) => t.parentNode?.removeChild(t));
    };
  }, []);

  // DIY starts with the free Growth Score (self-service front door); the Full
  // Build books a call / starts the build.
  const hrefFor = (tier: OfferTier) => {
    // Pay-now → instant access when the Stripe Payment Link is configured.
    const pay = checkoutUrl(tier.id);
    if (pay) return pay;
    // Fallback before links exist: DIY → free score, Build → book a call.
    return tier.id === 'diy'
      ? withUtm('/growth-score', 'diy', 'diy')
      : withUtm(CALENDAR_URL, tier.id, tier.id);
  };

  return (
    <main className="flex flex-1 flex-col">
      {/* ── 1. POSITIONING BLOCK ──────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 text-center sm:pt-6">
        {/* Ambient aurora — same premium multi-tone glow as the homepage hero,
            so the whole funnel reads as one system. Decorative only. */}
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-12%] -z-10 h-[600px] w-[min(1040px,128vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(38% 50% at 22% 12%, rgba(111,155,255,0.12), transparent 70%), radial-gradient(46% 56% at 82% 6%, rgba(212,175,55,0.20), transparent 70%), radial-gradient(42% 46% at 56% 36%, rgba(165,96,231,0.10), transparent 70%)',
          }}
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Two ways to win
        </p>
        <h1
          className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
        >
          See your score and fix it yourself — or{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            we build it and rank it
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[700px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
          No packages, no tiers to decode. Get your free Growth Score, then pick one: the{' '}
          <span className="font-semibold text-white">$197 DIY guide</span> if you want to do it
          yourself, or the <span className="font-semibold text-white">$997 Full Build</span> if you
          want us to handle it — build the site and get you found on Google and in AI answers.
        </p>
        <p className="mx-auto mt-3 max-w-[680px] text-[13px] italic leading-[1.55] text-[#9CA3AF] sm:text-[14px]">
          We get you found when people ask ChatGPT or Google for a company like yours.
        </p>
      </section>

      {/* ── 2. TIER GRID ──────────────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <div className="mx-auto flex max-w-[820px] flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-5">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              ctaHref={hrefFor(tier)}
              onCtaClick={() => track(`${tier.id}_cta_clicked`)}
            />
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-[680px] text-center text-[12px] leading-[1.55] text-[#8A8F98]">
          Not sure which fits? Start with the free Growth Score — then do it yourself for $197,
          or have us build and rank it for $997.
        </p>
      </section>

      {/* ── 2·5. WHAT'S INCLUDED, EXPLAINED (clarity accordion) ───────── */}
      <IncludedAccordion items={BUILD_INCLUDED} />

      {/* ── 3. GUARANTEE ──────────────────────────────────────────────── */}
      <section ref={promiseRef} className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-[680px] text-center text-[14px] italic leading-[1.6] text-[#C5C5C8]">
          SEO tools guarantee nothing. Premium agencies say &quot;results not
          guaranteed.&quot; We put it in writing.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6">
          {GUARANTEES.map((g) => (
            <div
              key={g.title}
              className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
              />
              <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
                <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">
                  {g.emoji}
                </span>
                {g.title}
              </p>
              <p className="relative mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">
                {g.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. TRUST STRIP ────────────────────────────────────────────── */}
      <div className="mx-auto mt-10 max-w-[700px] text-center text-[12px] leading-[1.7] text-[#8A8F98] sm:text-[13px]">
        ✓ One-time · ✓ No setup fee · ✓ No contract · ✓ Half-Back Guarantee on the Full Build · ✓ Real work or you walk
      </div>

      {/* ── 5. SEE-MORE BAND — funnel links ──────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-4 rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-7 text-center sm:p-9">
          <h2 className="font-bold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Not sure which fits?
          </h2>
          <p className="max-w-[520px] text-[14px] leading-[1.6] text-[#C5C5C8]">
            Get your free Growth Score to see exactly where you stand — then do it yourself
            for $197, or have us build and rank it for $997.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <a
              href="/growth-score"
              onClick={() => track('pricing_growth_score_cta_clicked')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_4px_16px_rgba(212,175,55,0.28)] transition hover:scale-[1.02]"
            >
              Get my free Growth Score →
            </a>
            <a
              href={withUtm(CALENDAR_URL, 'see_more_call', 'pricing_see_more')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12]"
            >
              Book a free call →
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. PROOF (live tracker, not a testimonial — no invented quotes
             or star ratings; D-014 keeps results claims off until measured) ── */}
      <figure className="mx-auto mt-16 max-w-[600px] rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#15110A] p-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:mt-20 sm:p-9">
        <blockquote className="text-[17px] italic leading-[1.5] text-white sm:text-[19px]">
          Our first build is family: Sandbar Soft Wash, a 15-year Palm Harbor
          operation. Every ranking move is tracked on a{' '}
          <a href="/r/client/sandbar" className="not-italic font-semibold text-[#D4AF37] underline-offset-2 hover:underline">
            live public dashboard
          </a>{' '}
          — no login, no sales screenshot.
        </blockquote>
        <figcaption className="mt-4 text-[13px] font-medium text-[#D4AF37] sm:text-[14px]">
          — Sandbar Soft Wash · Palm Harbor, FL
        </figcaption>
      </figure>

      {/* ── 8. FAQ ────────────────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Pricing FAQ
        </p>
        <h2
          className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Straight answers before you book.
        </h2>

        <div className="mx-auto mt-8 flex max-w-[820px] flex-col gap-3">
          {PRICING_FAQS.map((item, i) => (
            <details
              key={i}
              className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  track('pricing_faq_opened', { question: item.q.slice(0, 40) });
                }
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span aria-hidden className="shrink-0 text-[18px] text-[#D4AF37] transition group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-[14px] leading-[1.65] text-[#C5C5C8] sm:px-6 sm:pb-6 sm:text-[15px]">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 9. FINAL CTA ──────────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Start Here</p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Book a free 15-minute call.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          We&apos;ll look at your business live and tell you straight what it&apos;ll take to get you
          more calls and leads. No pitch deck — Coach Ty answers his own phone.
        </p>
        <a
          href={withUtm(CALENDAR_URL, 'final_cta', 'pricing_final')}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('pricing_final_cta_clicked')}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
        >
          Book a free call →
        </a>
      </section>

      {/* Minimal footer */}
      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}

// ── Components ──────────────────────────────────────────────────

function TierCard({
  tier,
  ctaHref,
  onCtaClick,
}: {
  tier: OfferTier;
  ctaHref: string;
  onCtaClick: () => void;
}) {
  const isFeatured = !!tier.featured;
  // Internal links (the DIY → /growth-score front door) stay in-tab; the Full
  // Build books an external calendar and opens a new tab.
  const isExternal = /^https?:\/\//i.test(ctaHref);
  const cardClass = isFeatured
    ? 'relative flex h-full flex-col rounded-[14px] border-[1.5px] border-[#D4AF37] bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#1A1408] p-6 shadow-[inset_0_0_40px_rgba(212,175,55,0.06),0_0_36px_rgba(212,175,55,0.18)] transition-all duration-300 hover:shadow-[inset_0_0_50px_rgba(212,175,55,0.10),0_0_56px_rgba(212,175,55,0.32)] sm:p-7 lg:scale-[1.03]'
    : 'relative flex h-full flex-col rounded-[14px] border border-white/[0.10] bg-[#0F0F12]/85 p-6 transition-all duration-300 hover:border-white/[0.18] hover:-translate-y-1 sm:p-7';

  return (
    <div className={cardClass}>
      {tier.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.35)]">
          {tier.badge}
        </span>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
        {tier.tagline}
      </p>
      <h3 className="mt-3 text-[22px] font-bold tracking-[-0.01em] text-white sm:text-[26px]">
        {tier.name}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[46px]">
          {tier.price}
        </span>
        <span className="text-[13px] font-normal text-[#A0A5AE] sm:text-[14px]">{tier.period}</span>
      </div>

      <p className="mt-4 text-[14px] leading-[1.55] text-white sm:text-[15px]">
        {tier.positioning}
      </p>

      <ul className="mt-5 flex w-full min-w-0 flex-col gap-2.5">
        {tier.includes.map((feature, i) => (
          <li key={`${feature}-${i}`} className="flex w-full min-w-0 items-start gap-2.5">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-[#D4AF37]"
            >
              <polyline points="3 8 7 12 13 4" />
            </svg>
            <span className="min-w-0 flex-1 text-[13px] leading-[1.5] text-white sm:text-[14px]">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.06] pt-3 text-[10px] text-[#8A8F98]">
        {tier.guaranteed ? (
          <span className="whitespace-nowrap">🛡️ Half-Back Guarantee</span>
        ) : (
          <span className="whitespace-nowrap">🧭 Do it yourself, on your time</span>
        )}
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span className="whitespace-nowrap">✓ One-time</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span className="whitespace-nowrap">✓ No contract</span>
      </div>

      <div className="mt-auto pt-6">
        <a
          href={ctaHref}
          {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
          onClick={onCtaClick}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-3 text-center text-[12px] font-bold uppercase leading-tight tracking-[0.04em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(212,175,55,0.25)] transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_8px_28px_rgba(212,175,55,0.5)] active:scale-[0.99] sm:text-[13px]"
        >
          {tier.cta} →
        </a>
        <p className="mt-3 text-center text-[10px] leading-[1.4] text-[#7A7F8A] sm:text-[11px]">
          {tier.guaranteed ? 'Backed by the Half-Back Guarantee · one-time' : 'Free Growth Score included · one-time'}
        </p>
      </div>
    </div>
  );
}
