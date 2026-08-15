/**
 * LOLA — standalone /pricing page.
 *
 * ONE offer (source of truth: docs/PRICING.md → frontend/src/lib/pricing.ts):
 *   The monthly — $397/month, all-inclusive, website design included.
 *
 * 2026-08-15: replaced the two-tier one-time page (DIY $197 / Full Build $997
 * side by side). A comparison grid asks the visitor to make a decision before
 * he's decided to buy at all, and the old grid's job — "which of these two am
 * I?" — is a question nobody arrived wanting to answer. One price, one button.
 *
 * The Growth Score stays the free, branded top-of-funnel entry and is the only
 * secondary path offered.
 */

import { useEffect } from 'react';

import IncludedAccordion from './IncludedAccordion';
import { checkoutUrl } from './lib/checkout';
import { AFTER_YOU_START, GUARANTEE, LEAD_MAGNET, PLAN, PLAN_INCLUDED } from './lib/pricing';
import { useSeo } from './lib/seo';
import { useReveal } from './lib/useReveal';

const BOOKING_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

// Each entry powers the visible accordion AND the FAQPage JSON-LD, which Google
// requires to match the rendered copy.
const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  { q: 'What if you don’t rank me?', a: GUARANTEE.faqAnswer },
  {
    q: 'Is the website really included?',
    a: "Yes — designed, built, and kept current, with no setup fee and no build charge. Most shops bill $3,000 or more for the build and then charge you monthly on top. Here it's part of the monthly, and you review it before it goes live.",
  },
  {
    q: 'What makes it an “AI website”?',
    a: "Your customers have stopped scrolling ten blue links — they ask ChatGPT or Google's AI for a company like yours and take the answer. Those tools can only recommend a business they can actually read, and most websites are invisible to them. Yours is written so they can read it, and name you.",
  },
  {
    q: 'Am I locked in?',
    a: 'Cancel anytime after the first 3 months. I ask for three because that’s honestly how long this takes to land — anything shorter can’t be judged fairly, in either direction.',
  },
  {
    q: 'What do I have to do?',
    a: 'A 2-minute intake after checkout, and pick your money keywords with me in week 1. After that you run your business — everything else is mine.',
  },
  {
    q: 'Do I need to talk to someone first?',
    a: "Only if you want to. You can start from this page in one tap, or book a 15-minute call and ask me anything first. Same price either way.",
  },
];

export default function PricingPage() {
  useReveal();
  useSeo({
    title: `Pricing — ${PLAN.price}/month, website included | Lola Leads`,
    description: `One all-inclusive plan at ${PLAN.price}/month for local service businesses: website design included free, Google Business Profile managed, and visibility work across Google and AI answers. ${GUARANTEE.short}`,
  });

  // Route-specific Offer + FAQPage schema, built from the same constants the
  // page renders so the two can't drift. Cleaned up on unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const amount = PLAN.price.replace(/[^0-9]/g, '');
    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Lola monthly — local SEO and AI search visibility',
        serviceType: 'Local SEO, AI search visibility, and website',
        description: PLAN.positioning,
        provider: {
          '@type': 'Organization',
          name: 'Lola Leads — Ty Alexander Media',
          url: 'https://lola.tyalexandermedia.com',
        },
        areaServed: { '@type': 'Country', name: 'United States' },
        offers: {
          '@type': 'Offer',
          price: amount,
          priceCurrency: 'USD',
          url: 'https://lola.tyalexandermedia.com/pricing',
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: amount,
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitCode: 'MON',
          },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PRICING_FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
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
    return () => tags.forEach((t) => t.parentNode?.removeChild(t));
  }, []);

  // One-tap Stripe when the monthly link exists; booking a call until it does,
  // so the page never dead-ends before the link is configured.
  const pay = checkoutUrl();
  const primaryHref = pay || BOOKING_URL;
  const primaryLabel = pay ? PLAN.cta : 'Book a 15-min call';

  return (
    <main className="flex flex-1 flex-col">
      {/* ── THE OFFER ─────────────────────────────────────────────── */}
      <section className="pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#D4AF37]">
          One plan · everything included
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] text-balance font-display font-bold leading-[1.06] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.6vw, 3.4rem)' }}
        >
          {PLAN.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[17px]">
          {PLAN.positioning}
        </p>

        <div className="mx-auto mt-9 w-full max-w-[520px] rounded-2xl border border-[#D4AF37]/30 bg-[#0F0F12] p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:p-8">
          <p className="flex items-baseline justify-center gap-1">
            <span className="font-display text-[52px] font-bold leading-none text-white sm:text-[64px]">
              {PLAN.price}
            </span>
            <span className="text-[18px] font-semibold text-[#8A8F98]">{PLAN.period}</span>
          </p>
          {/* Shrinks the number to something an owner compares against a job,
              not against a salary. */}
          <p className="mt-2 text-[13px] text-[#9AA0A6]">{PLAN.perDay}</p>

          <ul className="mt-6 space-y-2.5 text-left">
            {PLAN.includes.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5] text-[#E8E4D8]">
                <span aria-hidden className="mt-[3px] shrink-0 text-[#4ADE80]">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <a
            href={primaryHref}
            {...(pay ? {} : { target: '_blank', rel: 'noreferrer' })}
            className="mt-7 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-3 text-[15px] font-bold text-[#0A0A0B] transition hover:bg-[#F4D47C] active:scale-[0.99]"
          >
            {primaryLabel} →
          </a>

          {/* Guarantee and terms sit AT the button, where the hesitation is. */}
          <p className="mt-3 text-[13px] font-semibold leading-[1.5] text-[#D4AF37]">
            {GUARANTEE.short}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[#8A8F98]">{PLAN.terms}</p>
        </div>

        <p className="mx-auto mt-6 text-[13.5px] text-[#9AA0A6]">
          Not ready?{' '}
          <a
            href={LEAD_MAGNET.href}
            className="font-semibold text-white underline decoration-[#D4AF37]/40 underline-offset-4 hover:decoration-[#D4AF37]"
          >
            Get your free Growth Score
          </a>{' '}
          first — 60 seconds, no card.
        </p>
      </section>

      {/* ── WHAT HAPPENS AFTER YOU START ──────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <h2 className="text-center font-display text-[26px] font-bold text-white sm:text-[32px]">
          What happens after you start
        </h2>
        <ol className="mx-auto mt-8 grid max-w-[880px] grid-cols-1 gap-4 sm:grid-cols-3">
          {AFTER_YOU_START.map((s, i) => (
            <li
              key={s.step}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left"
            >
              <p className="text-[12px] font-bold text-[#D4AF37]">Step {i + 1}</p>
              <p className="mt-1.5 text-[16px] font-semibold text-white">{s.step}</p>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[#9AA0A6]">{s.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── WHAT'S INCLUDED, IN FULL ──────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        {/* IncludedAccordion renders its own eyebrow + title, so wrapping it in
            another heading stacked two headings on top of each other. Let it own
            the section header. */}
        <div className="mx-auto max-w-[820px]">
          <IncludedAccordion items={PLAN_INCLUDED} />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <h2 className="text-center font-display text-[26px] font-bold text-white sm:text-[32px]">
          Straight answers
        </h2>
        <div className="mx-auto mt-8 max-w-[760px] divide-y divide-white/10 border-y border-white/10">
          {PRICING_FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[16px] font-semibold text-white">
                {f.q}
                <span
                  aria-hidden
                  className="shrink-0 text-[#D4AF37] transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-[#C5C5C8]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CLOSE ─────────────────────────────────────────────────── */}
      <section className="mt-16 text-center sm:mt-20">
        <h2 className="mx-auto max-w-[640px] text-balance font-display text-[28px] font-bold leading-[1.15] text-white sm:text-[36px]">
          Make sure the answer is you.
        </h2>
        <a
          href={primaryHref}
          {...(pay ? {} : { target: '_blank', rel: 'noreferrer' })}
          className="mt-7 inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-8 py-3 text-[15px] font-bold text-[#0A0A0B] transition hover:bg-[#F4D47C]"
        >
          {primaryLabel} →
        </a>
        <p className="mt-3 text-[13px] text-[#8A8F98]">
          {PLAN.price}{PLAN.period} · {PLAN.terms}
        </p>
      </section>
    </main>
  );
}
