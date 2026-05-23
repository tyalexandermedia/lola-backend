/**
 * Lola SEO — standalone /pricing page.
 *
 * Sections:
 *   1. Transparency block (above tiers)
 *   2. 3-tier grid: Sprint · Retainer (featured) · Pro
 *   3. First Win Promise + 90-Day Baseline guarantees
 *   4. Trust strip
 *   5. 3-column comparison: SEO Tools vs Premium Agencies vs Lola
 *   6. Testimonial card
 *   7. Final CTA
 */

import { useEffect, useRef, useState } from 'react';

// ── Stripe payment URLs (env-overridable) ─────────────────────
const STRIPE_SPRINT_URL =
  (import.meta.env.VITE_STRIPE_SPRINT_URL as string | undefined) ||
  'https://buy.stripe.com/sprint-placeholder';

const STRIPE_RETAINER_MONTHLY_URL =
  (import.meta.env.VITE_STRIPE_RETAINER_MONTHLY_URL as string | undefined) ||
  'https://buy.stripe.com/retainer-monthly-placeholder';

const STRIPE_RETAINER_ANNUAL_URL =
  (import.meta.env.VITE_STRIPE_RETAINER_ANNUAL_URL as string | undefined) ||
  'https://buy.stripe.com/retainer-annual-placeholder';

const STRIPE_PRO_URL =
  (import.meta.env.VITE_STRIPE_PRO_URL as string | undefined) ||
  'https://buy.stripe.com/pro-placeholder';

if (typeof window !== 'undefined') {
  for (const [name, val] of [
    ['VITE_STRIPE_SPRINT_URL', STRIPE_SPRINT_URL],
    ['VITE_STRIPE_RETAINER_MONTHLY_URL', STRIPE_RETAINER_MONTHLY_URL],
    ['VITE_STRIPE_RETAINER_ANNUAL_URL', STRIPE_RETAINER_ANNUAL_URL],
    ['VITE_STRIPE_PRO_URL', STRIPE_PRO_URL],
  ] as const) {
    if (val.includes('placeholder')) {
      console.warn(`[lola pricing] ${name} not set — using placeholder.`);
    }
  }
}

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

type Billing = 'monthly' | 'annual';

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const promiseRef = useRef<HTMLDivElement>(null);
  const promiseSeen = useRef(false);

  useEffect(() => {
    const el = promiseRef.current;
    if (!el || promiseSeen.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !promiseSeen.current) {
          promiseSeen.current = true;
          track('first_win_promise_viewed');
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleToggle = (v: Billing) => {
    if (v === billing) return;
    setBilling(v);
    track(v === 'monthly' ? 'pricing_billing_toggled_monthly' : 'pricing_billing_toggled_annual');
  };

  const retainerHref = withUtm(
    billing === 'monthly' ? STRIPE_RETAINER_MONTHLY_URL : STRIPE_RETAINER_ANNUAL_URL,
    billing === 'monthly' ? 'retainer_monthly' : 'retainer_annual',
    'retainer',
  );
  const sprintHref = withUtm(STRIPE_SPRINT_URL, 'sprint', 'sprint');
  const proHref = withUtm(STRIPE_PRO_URL, 'pro', 'pro');

  return (
    <main className="flex flex-1 flex-col">
      {/* ── 1. TRANSPARENCY BLOCK ─────────────────────────────────────── */}
      <section className="pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Transparent Pricing
        </p>
        <h1
          className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
        >
          No "book a call to find out."<br />
          No 12-month contracts.
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
          Just three clear paths, real work, and a guarantee that holds us
          accountable.
        </p>
      </section>

      {/* ── 2. 3-TIER GRID ─────────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        {/* DOM order: Sprint, Retainer, Pro (desktop left→right).
            Mobile order: Retainer (1) → Pro (2) → Sprint (3) — anchor high. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {/* SPRINT */}
          <div className="order-3 lg:order-1">
            <TierCard
              variant="sprint"
              eyebrow="One-time project"
              name="Local SEO Sprint"
              price="$499"
              pricePeriod="one-time payment"
              positioning="For contractors who want one focused fix — fast."
              features={[
                'Full Lola audit + priority fix list',
                'Agent Readiness Score',
                'Agent Share of Voice baseline (5 prompts)',
                'Custom 90-day SEO action plan',
                '60-min strategy call',
                'GMB optimization checklist',
                'Citation + directory audit',
                '30 days email/Slack support',
              ]}
              ctaLabel="Start the Sprint →"
              ctaHref={sprintHref}
              ctaSubtext="Stripe secure · No subscription · Delivery in 7 days"
              onCtaClick={() => track('sprint_cta_clicked')}
            />
          </div>

          {/* RETAINER (featured) */}
          <div className="order-1 lg:order-2">
            <TierCard
              variant="retainer"
              eyebrow="Done-for-you monthly"
              name="Local SEO Retainer"
              billingToggle={
                <BillingToggle value={billing} onChange={handleToggle} />
              }
              price={billing === 'monthly' ? '$499' : '$4,990'}
              pricePeriod={billing === 'monthly' ? '/month · cancel anytime' : '/year · save $998'}
              priceMeta={
                billing === 'annual' ? (
                  <span className="inline-flex items-center rounded-full bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                    Best value · 2 months free
                  </span>
                ) : null
              }
              positioning="For contractors ready to dominate their market — month after month."
              features={[
                'Everything in the Sprint, ongoing',
                'Agent Share of Voice tracking (20 prompts/mo)',
                'Prompt tracking dashboard',
                'Monthly content + link building',
                'GMB management + weekly posts',
                'Citation cleanup + new directory submissions',
                'Bi-weekly performance reports',
                'Priority Slack + text support',
              ]}
              ctaLabel={billing === 'monthly' ? 'Start the Retainer →' : 'Get the Annual Deal →'}
              ctaHref={retainerHref}
              ctaSubtext={
                billing === 'monthly'
                  ? 'Stripe secure · No refund first month · Cancel anytime after'
                  : 'Stripe secure · Locks in your rate for 12 months · No refund first 30 days'
              }
              onCtaClick={() =>
                track(
                  billing === 'monthly'
                    ? 'retainer_monthly_cta_clicked'
                    : 'retainer_annual_cta_clicked',
                  { billing },
                )
              }
            />
          </div>

          {/* PRO */}
          <div className="order-2 lg:order-3">
            <TierCard
              variant="pro"
              eyebrow="Full-service AI domination"
              name="Lola Pro"
              price="$1,497"
              pricePeriod="/month"
              positioning="For contractors ready to own their market across every AI agent."
              features={[
                'Everything in the Retainer',
                'Lola Auto-Fix snippet — we push changes directly to your site',
                'Agent Share of Voice tracking (100 prompts/mo)',
                'Monthly AI Citation Report (PDF, white-glove)',
                'Quarterly 1-on-1 strategy calls with Ty',
                'Custom landing page builds (up to 2/year)',
                'Video case study production (1/year)',
                'Priority response — 4-hour SLA',
                'Competitor AI tracking (3 competitors)',
                'Done-for-you content publishing (2-4 posts/mo)',
                'Direct text line to Ty for urgent fixes',
              ]}
              ctaLabel="Go Pro →"
              ctaHref={proHref}
              ctaSubtext="Stripe secure · No refund first month · Cancel anytime after"
              onCtaClick={() => track('pro_cta_clicked')}
            />
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[640px] text-center text-[12px] leading-[1.55] text-[#8A8F98]">
          Pro tier limited to 10 contractors per quarter — we cap volume to
          ensure white-glove quality. If full, waitlist available.
        </p>
      </section>

      {/* ── 3. GUARANTEES ─────────────────────────────────────────── */}
      <section ref={promiseRef} className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-[680px] text-center text-[14px] italic leading-[1.6] text-[#C5C5C8]">
          Other tools don't guarantee anything. Premium agencies say "results
          not guaranteed." We put it in writing — twice.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {/* First Win Promise */}
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">🛡️</span>
              The First Win Promise
            </p>
            <p className="relative mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">
              If you don't see at least one measurable win in your first 60 days —
              a new ranking, a new lead, or a Google Business improvement — your
              next month is on us.
            </p>
          </div>

          {/* 90-Day Baseline */}
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">📊</span>
              The 90-Day Baseline
            </p>
            <p className="relative mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">
              At day 90, we re-audit your visibility across Google AI Overviews,
              ChatGPT, Perplexity, and Gemini. You see measurable movement in
              the Agent Share of Voice metric — or your next month is on us.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. TRUST STRIP ──────────────────────────────────────────── */}
      <div className="mx-auto mt-10 max-w-[680px] text-center text-[12px] leading-[1.7] text-[#8A8F98] sm:text-[13px]">
        🔒 Stripe secure · ✓ No setup fee · ✓ Cancel anytime · ✓ Real work or you walk
      </div>

      {/* ── 5. 3-COLUMN COMPARISON TABLE ──────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <h2
          className="text-center font-bold leading-[1.15] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Why Lola beats SEO tools <span className="text-[#D4AF37]">AND</span> premium agencies
        </h2>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08]">
          <table className="w-full text-left text-[13px] sm:text-[14px]">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">
              <tr>
                <th className="px-3 py-4 sm:px-5">
                  SEO Tools
                  <span className="block text-[10px] font-normal text-[#8A8F98]">$99–$399/mo</span>
                </th>
                <th className="px-3 py-4 sm:px-5">
                  Premium Agency
                  <span className="block text-[10px] font-normal text-[#8A8F98]">$2,500–$3,500/mo</span>
                </th>
                <th className="border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/[0.04] px-3 py-4 sm:px-5">
                  Lola
                  <span className="block text-[10px] font-normal text-[#D4AF37]">$499–$1,497/mo</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {[
                ['❌ You DIY', '✓ Done for you', '✓ Done for you'],
                ['❌ Hidden total cost', '❌ Hidden pricing', '✓ Transparent pricing'],
                ['⚠️ Month-to-month (you handle billing)', '❌ 12-month contracts', '✓ Cancel after first month'],
                ['❌ No guarantee', '❌ "Results not guaranteed"', '✓ First Win + 90-Day Baseline'],
                ['⚠️ Track LLMs (enterprise tier only)', '❌ Generic "rank #1" framing', '✓ Agent Share of Voice (local)'],
                ['❌ Generic audience', '❌ "Serve everyone"', '✓ Florida home-services specialist'],
                ['❌ No execution', '✓ Full service (manual)', '✓ Auto-Fix snippet (Pro tier)'],
                ['⚠️ Steep learning curve', '⚠️ Long sales call', '✓ Free audit in 20 sec'],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-3 py-3 leading-[1.45] text-[#C5C5C8] sm:px-5 sm:py-4 ${
                        j === 2 ? 'border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/[0.03] text-white' : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-6 max-w-[680px] text-center text-[12px] italic leading-[1.6] text-[#8A8F98] sm:text-[13px]">
          We're not against tools or agencies. We just believe contractors
          deserve done-for-you execution, transparent pricing, and a guarantee
          — without the learning curve of tools or the price tag of premium
          agencies.
        </p>
      </section>

      {/* ── 6. TESTIMONIAL ─────────────────────────────────────────── */}
      <figure className="mx-auto mt-16 max-w-[600px] rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#15110A] p-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:mt-20 sm:p-9">
        <div className="flex justify-center gap-1 text-[#D4AF37]" aria-label="5 stars">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} aria-hidden className="text-[14px]">★</span>
          ))}
        </div>
        <blockquote className="mt-4 text-[17px] italic leading-[1.5] text-white sm:text-[19px]">
          “Sandbar Soft Wash: 5 keywords ranked in 3 weeks on the Retainer.”
        </blockquote>
        <figcaption className="mt-4 text-[13px] font-medium text-[#D4AF37] sm:text-[14px]">
          — Lola SEO Case Study, Palm Harbor FL
        </figcaption>
      </figure>

      {/* Minimal footer */}
      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}

// ── Components ──────────────────────────────────────────────────

interface TierCardProps {
  variant: 'sprint' | 'retainer' | 'pro';
  eyebrow: string;
  name: string;
  price: string;
  pricePeriod: string;
  priceMeta?: React.ReactNode;
  billingToggle?: React.ReactNode;
  positioning: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaSubtext: string;
  onCtaClick: () => void;
}

function TierCard({
  variant,
  eyebrow,
  name,
  price,
  pricePeriod,
  priceMeta,
  billingToggle,
  positioning,
  features,
  ctaLabel,
  ctaHref,
  ctaSubtext,
  onCtaClick,
}: TierCardProps) {
  const isRetainer = variant === 'retainer';
  const isPro = variant === 'pro';

  const cardClass = isRetainer
    ? 'relative flex h-full flex-col rounded-[14px] border-[1.5px] border-[#D4AF37] bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#1A1408] p-6 shadow-[inset_0_0_40px_rgba(212,175,55,0.06),0_0_36px_rgba(212,175,55,0.18)] transition-all duration-300 hover:shadow-[inset_0_0_50px_rgba(212,175,55,0.10),0_0_56px_rgba(212,175,55,0.32)] sm:p-8 lg:scale-[1.04]'
    : isPro
    ? 'relative flex h-full flex-col rounded-[14px] border border-[#D4AF37]/40 bg-gradient-to-br from-[#0F0F12] via-[#100E0A] to-[#0F0F12] p-6 shadow-[0_0_24px_rgba(212,175,55,0.10)] transition-all duration-300 hover:border-[#D4AF37]/65 hover:shadow-[0_0_36px_rgba(212,175,55,0.22)] hover:-translate-y-1 sm:p-8'
    : 'relative flex h-full flex-col rounded-[14px] border border-white/[0.10] bg-[#0F0F12]/85 p-6 opacity-[0.97] transition-all duration-300 hover:border-white/[0.18] hover:-translate-y-1 sm:p-8';

  return (
    <div className={cardClass}>
      {isRetainer && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.35)]">
          Most Popular — Recurring
        </span>
      )}
      {isPro && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#D4AF37]/50 bg-[#0A0A0B] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          High-Ticket · Capped at 10
        </span>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-[24px] font-bold tracking-[-0.01em] text-white sm:text-[28px]">
        {name}
      </h3>

      {billingToggle && <div className="mt-4">{billingToggle}</div>}

      <div className={`${billingToggle ? 'mt-3' : 'mt-4'} flex items-baseline gap-2`}>
        <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[44px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[52px]">
          {price}
        </span>
        <span className="text-[13px] font-normal text-[#A0A5AE] sm:text-[14px]">
          {pricePeriod}
        </span>
      </div>

      {priceMeta && <div className="mt-2">{priceMeta}</div>}

      <p className="mt-4 text-[14px] leading-[1.55] text-white sm:text-[15px]">
        {positioning}
      </p>

      <ul className="mt-5 flex w-full min-w-0 flex-col gap-2.5">
        {features.map((feature, i) => (
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

      {/* In-card trust row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.06] pt-3 text-[10px] text-[#8A8F98]">
        <span className="whitespace-nowrap">🔒 Stripe</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span className="whitespace-nowrap">🛡️ First Win Promise</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span className="whitespace-nowrap">⚡ 48hr onboarding</span>
      </div>

      <div className="mt-auto pt-6">
        <a
          href={ctaHref}
          target="_blank"
          rel="noreferrer"
          onClick={onCtaClick}
          className="flex min-h-[60px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(212,175,55,0.25)] transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_8px_28px_rgba(212,175,55,0.5)] active:scale-[0.99] sm:text-[14px]"
        >
          {ctaLabel}
        </a>
        <p className="mt-3 text-center text-[10px] leading-[1.4] text-[#7A7F8A] sm:text-[11px]">
          {ctaSubtext}
        </p>
      </div>
    </div>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: Billing;
  onChange: (v: Billing) => void;
}) {
  return (
    <div className="inline-flex w-full max-w-[260px] items-center rounded-full border border-white/[0.10] bg-[#0A0A0B] p-1 text-[10px] font-bold uppercase tracking-[0.14em]">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        aria-pressed={value === 'monthly'}
        className={`flex-1 rounded-full px-2.5 py-1.5 transition-all duration-200 ${
          value === 'monthly'
            ? 'bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
            : 'text-[#8A8F98] hover:text-white'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        aria-pressed={value === 'annual'}
        className={`flex-1 rounded-full px-2.5 py-1.5 transition-all duration-200 ${
          value === 'annual'
            ? 'bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
            : 'text-[#8A8F98] hover:text-white'
        }`}
      >
        Annual
        <span
          className="ml-1 text-[9px]"
          style={{ color: value === 'annual' ? '#0A0A0B' : '#D4AF37' }}
        >
          -17%
        </span>
      </button>
    </div>
  );
}
