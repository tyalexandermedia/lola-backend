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
import { checkoutUrl, startSmsHref } from './lib/checkout';
import { FOUNDER } from './lib/lola';
import { SITE_ORIGIN, PRICING_QA } from './lib/pageMeta';
import { AFTER_YOU_START, EXCLUSIVITY, GUARANTEE, LEAD_MAGNET, PLAN, PLAN_INCLUDED, trialLine } from './lib/pricing';
import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

// The accordion renders PRICING_QA from lib/pageMeta, which is the same array
// the prerenderer turns into this route's FAQPage — Google requires the schema
// to match the rendered copy, and one array is the only way to guarantee it.

export default function PricingPage() {
  useReveal();
  usePageMeta('/pricing');

  // Route-specific Offer schema, built from the same constants the page
  // renders so the two can't drift. Cleaned up on unmount.
  //
  // The FAQPage that used to live here is gone: scripts/prerender.mjs now
  // writes this route's FAQPage into the static HTML from pageMeta, so keeping
  // this one would put two FAQPage nodes on one URL — and only the prerendered
  // one is visible to a crawler that doesn't run JS.
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
          url: SITE_ORIGIN,
        },
        areaServed: { '@type': 'Country', name: 'United States' },
        offers: {
          '@type': 'Offer',
          price: amount,
          priceCurrency: 'USD',
          url: `${SITE_ORIGIN}/pricing`,
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

  // Self-serve. Ty doesn't want to sell on calls, so the fallback can't be a
  // calendar — that would make "book a call" the only route to buying, which is
  // the exact thing being removed.
  //
  // With the Stripe link set: one tap to checkout.
  // Without it: a text straight to Ty, which still starts the sale in one tap
  // and never leaves the visitor on a page with no way forward. Set
  // VITE_STRIPE_MONTHLY_URL and this becomes real checkout with no other edit.
  // Two ways forward, always. The primary buys; the secondary captures.
  //
  // The fallback used to be a bare sms: link, which meant an unconfigured
  // Payment Link turned every interested reader into an anonymous text — no
  // business name, no trade, no website, nothing to follow up on. /apply posts
  // to the backend, writes the applications row and emails Ty the details, so
  // the lead arrives with its information attached. The text stays as an
  // explicit third option for people who just want to ask something.
  const pay = checkoutUrl();
  const primaryHref = pay || '/apply';
  const primaryLabel = pay ? PLAN.cta : 'Start — send me your details';
  const smsHref = startSmsHref("Hi Ty — I want to start the $397/month plan.");

  return (
    <main className="flex flex-1 flex-col">
      {/* ── THE OFFER ─────────────────────────────────────────────── */}
      <section className="pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold">
          One plan · everything included
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] text-balance font-display font-bold leading-[1.06] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(2rem, 4.6vw, 3.4rem)' }}
        >
          {PLAN.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-[1.6] text-ink-2 sm:text-[17px]">
          {PLAN.positioning}
        </p>

        <div className="mx-auto mt-9 w-full max-w-[520px] rounded-2xl border border-gold/30 bg-surface p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:p-8">
          <p className="flex items-baseline justify-center gap-1">
            <span className="font-display text-[52px] font-bold leading-none text-ink sm:text-[64px]">
              {PLAN.price}
            </span>
            <span className="text-[18px] font-semibold text-ink-3">{PLAN.period}</span>
          </p>
          {/* Shrinks the number to something an owner compares against a job,
              not against a salary. */}
          <p className="mt-2 text-[13px] text-ink-3">{PLAN.perDay}</p>

          <ul className="mt-6 space-y-2.5 text-left">
            {PLAN.includes.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5] text-ink-2">
                <span aria-hidden className="mt-[3px] shrink-0 text-ok">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <a
            href={primaryHref}
            className="group mt-7 inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-6 py-3 text-[16px] font-bold text-on-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_26px_rgba(212,175,55,0.32)] transition-all duration-200 hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_36px_rgba(212,175,55,0.5)] active:scale-[0.99]"
          >
            {primaryLabel}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>

          {/* Second way forward. When checkout is live this catches the reader
              who isn't ready to pay today but IS a lead — they land on the form
              rather than closing the tab. When it isn't, the form IS the
              primary and this drops to the text. Either way nobody leaves
              without a path that ends in Ty's inbox. */}
          <a
            href={pay ? '/apply' : smsHref}
            className="mt-2.5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gold/30 px-6 py-3 text-[14px] font-semibold text-gold transition hover:border-gold/60 hover:bg-gold/[0.08]"
          >
            {pay
              ? 'Not ready today? Send me your details'
              : `Or just text me — ${FOUNDER.phoneDisplay}`}
          </a>

          {/* Guarantee, exclusivity and terms sit AT the button, where the
              hesitation is. Exclusivity is the one true reason to act now
              rather than bookmark the page. */}
          {trialLine() && (
            <p className="mt-3 text-[13.5px] font-bold leading-[1.5] text-ok">{trialLine()}</p>
          )}
          <p className="mt-3 text-[13px] font-semibold leading-[1.5] text-gold">
            {GUARANTEE.short}
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-2">
            <span className="font-semibold text-ink">{EXCLUSIVITY.short}.</span>{' '}
            {EXCLUSIVITY.why}{' '}<a href="/#founder" className="text-gold underline underline-offset-2 decoration-gold/50 hover:decoration-gold">Who you&apos;re working with →</a>
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-3">{PLAN.terms}</p>
        </div>

        <p className="mx-auto mt-6 text-[13.5px] text-ink-3">
          Not ready?{' '}
          <a
            href={LEAD_MAGNET.href}
            className="font-semibold text-ink underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
          >
            Get your free Growth Score
          </a>{' '}
          first — 60 seconds, no card.
        </p>
      </section>

      {/* WHERE $397 SITS IN THE MARKET.
          Both facts come from the competitor research already in VsPage, not
          from fresh claims: four of the six major players won't quote without a
          sales call, and Podium — the closest published price — is $399/mo for
          SOFTWARE you operate yourself. Same money, and you'd still need a
          website. Stated as their model vs ours, never as "they're bad". */}
      <section className="mt-16 sm:mt-20">
        <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">
          What $397 buys everywhere else
        </h2>
        <div className="mx-auto mt-8 max-w-[720px] overflow-hidden rounded-2xl border border-white/10">
          {[
            {
              who: 'Podium',
              price: '$399–$799/mo',
              what: 'Software you run yourself. No website, no one doing the work.',
            },
            {
              who: 'Scorpion · LocalIQ · Yext · Hibu',
              price: 'Quote-only',
              what: "Four of the six biggest names won't tell you a price without a sales call.",
            },
            {
              who: 'BrightLocal',
              price: '$39–$59/mo',
              what: 'A genuinely good DIY toolset — but you do all of the work.',
            },
            {
              who: 'Lola',
              price: '$397/mo',
              what: 'Website designed and built, included. I do the work. Price published.',
              us: true,
            },
          ].map((r) => (
            <div
              key={r.who}
              className={`flex flex-col gap-1 border-b border-white/[0.07] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 ${
                r.us ? 'bg-gold/[0.07]' : ''
              }`}
            >
              <span
                className={`w-full shrink-0 text-[14.5px] font-semibold sm:w-[210px] ${
                  r.us ? 'text-gold' : 'text-ink'
                }`}
              >
                {r.who}
              </span>
              <span className="w-full shrink-0 text-[13.5px] text-ink-3 sm:w-[120px]">{r.price}</span>
              <span className="text-[13.5px] leading-[1.5] text-ink-2">{r.what}</span>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-[720px] text-center text-[12.5px] leading-[1.55] text-ink-3">
          Public pricing as listed by each vendor. They're all capable — the difference is what
          you get for the money, and whether you have to sit through a call to hear the number.
        </p>
      </section>

      {/* ── WHAT HAPPENS AFTER YOU START ──────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">
          What happens after you start
        </h2>
        <ol className="mx-auto mt-8 grid max-w-[880px] grid-cols-1 gap-4 sm:grid-cols-3">
          {AFTER_YOU_START.map((s, i) => (
            <li
              key={s.step}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left"
            >
              <p className="text-[12px] font-bold text-gold">Step {i + 1}</p>
              <p className="mt-1.5 text-[16px] font-semibold text-ink">{s.step}</p>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-3">{s.detail}</p>
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
        <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">
          Straight answers
        </h2>
        <div className="mx-auto mt-8 max-w-[760px] divide-y divide-white/10 border-y border-white/10">
          {PRICING_QA.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[16px] font-semibold text-ink">
                {f.q}
                <span
                  aria-hidden
                  className="shrink-0 text-gold transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CLOSE ─────────────────────────────────────────────────── */}
      <section className="mt-16 text-center sm:mt-20">
        <h2 className="mx-auto max-w-[640px] text-balance font-display text-[28px] font-bold leading-[1.15] text-ink sm:text-[36px]">
          Make sure the answer is you.
        </h2>
        <a
          href={primaryHref}
          {...(pay ? {} : { target: '_blank', rel: 'noreferrer' })}
          className="mt-7 inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gold px-8 py-3 text-[15px] font-bold text-on-gold transition hover:bg-gold-bright"
        >
          {primaryLabel} →
        </a>
        <p className="mt-3 text-[13px] text-ink-3">
          {PLAN.price}{PLAN.period} · {PLAN.terms}
        </p>
      </section>
    </main>
  );
}
