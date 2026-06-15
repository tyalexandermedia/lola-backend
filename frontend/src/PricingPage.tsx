/**
 * Lola SEO — standalone /pricing page.
 *
 * Sections:
 *   1. Transparency block (above tiers)
 *   2. 3-tier grid: Starter · Growth (featured, Most Popular) · Pro
 *   3. 30-Day Half-Back + First Win guarantees
 *   4. Trust strip
 *   5. 3-column comparison: SEO Tools vs Premium Agencies vs Lola
 *   6. Testimonial card
 *
 * Pricing matrix (locked 2026-06-15 — call-first rebuild):
 *   - Starter   $297/mo   done-for-you, monthly, cancel anytime
 *   - Growth    $697/mo   Most Popular
 *   - Pro       $997/mo   premium, founder access
 *
 * Every CTA books a free strategy call. No Stripe self-serve checkout — at
 * these price points a 15-minute call closes far better than a cold cart.
 */

import { useEffect, useRef } from 'react';

// Page-scoped FAQs — each entry powers the visible accordion AND the
// FAQPage JSON-LD we inject into <head> at mount (route-specific schema
// since the static index.html schema only covers the homepage's FAQ set).
const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Which plan should I pick?',
    a: "If you just need to get found, Starter ($297). If you want to dominate your market month after month, Growth ($697) — the most popular. If you want everything plus live AI citation tracking, multi-location pages, and monthly 1:1s with Coach Ty, Pro ($997). Not sure? Book the free call and Coach Ty will tell you straight, even if the answer is 'start with Starter.'",
  },
  {
    q: 'Can I switch tiers later?',
    a: 'Anytime. Move up or down between Starter, Growth, and Pro with one Slack message. We pro-rate the difference. No friction, no penalty.',
  },
  {
    q: "What's NOT included?",
    a: "Paid ads (Google LSA, Meta, paid social) — Lola is organic + AI search. Website rebuilds — we optimize what's there; if you need a new site, we'll refer you. CRM and phone systems — we help you collect more leads, you close them.",
  },
  {
    q: 'How does the 30-Day Half-Back Guarantee actually work?',
    a: "If Lola doesn't move your rankings in the first 30 days, Coach Ty refunds 50% of that month — automatically, no support ticket required. Same way he'd want to be treated.",
  },
  {
    q: 'Is there a setup fee or contract?',
    a: 'No setup fee. No contract. Month-to-month. Cancel anytime. The only reason to stay is because Lola is making you money.',
  },
  {
    q: 'How fast is onboarding?',
    a: '48-hour onboarding from the moment your first month clears. Week 1: audit + GBP optimization. Week 2: citation cleanup + on-page fixes. Week 3-4: content + reviews start ramping. You see the work feed live on your client dashboard.',
  },
  {
    q: 'Do you work outside Florida?',
    a: "Yes. Tampa Bay is home and our proof story (Sandbar Soft Wash) lives there, but the system works in any market with Google Maps and AI search. Clients are in multiple states.",
  },
  {
    q: 'Why is this so much cheaper than premium agencies?',
    a: "Premium agencies charge $2,500–$3,500/mo and bury overhead in the price (sales reps, account managers, retainer floors). Lola is six specialist AI agents + Coach Ty running the playbook directly. Same execution, no agency bloat, transparent pricing.",
  },
];

// ── Strategy-call destination (env-overridable) ───────────────
// Single source of truth: every tier CTA + the final CTA point here.
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
  const promiseRef = useRef<HTMLDivElement>(null);
  const promiseSeen = useRef(false);

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
  // "lola seo pricing" with tier-specific facts. Cleaned up on unmount so
  // route changes don't leave stale schema in <head>.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: PRICING_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.dataset.lola = 'pricing-faq';
    tag.textContent = JSON.stringify(ld);
    document.head.appendChild(tag);
    return () => {
      tag.parentNode?.removeChild(tag);
    };
  }, []);

  const starterHref = withUtm(CALENDAR_URL, 'starter', 'starter');
  const growthHref = withUtm(CALENDAR_URL, 'growth', 'growth');
  const proHref = withUtm(CALENDAR_URL, 'pro', 'pro');

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
          Three plans.<br />
          No 12-month contracts.
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
          Every plan is done-for-you and month-to-month. Real work, a guarantee,
          no surprises. Pick the one that fits — then book a free call and we'll
          confirm it's the right move for your business.
        </p>
      </section>

      {/* ── 2. 3-TIER GRID ─────────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        {/* DOM order: Starter, Growth, Pro (desktop left→right value ladder).
            Mobile order: Growth (1) → Pro (2) → Starter (3) — anchor on popular. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-5">
          {/* STARTER */}
          <div className="order-3 lg:order-1">
            <TierCard
              variant="starter"
              eyebrow="Done-for-you · Monthly"
              name="Starter"
              price="$297"
              pricePeriod="/month · cancel anytime"
              positioning="For the local business that needs to get found — and wants it handled, not homework."
              features={[
                'Full Lola audit + priority fix list',
                'Google Business Profile optimization',
                'Citation + directory cleanup',
                'On-page SEO fixes (titles, schema, speed)',
                'Review-generation system set up',
                'AI search visibility baseline (ChatGPT, Perplexity, Gemini)',
                'Monthly progress report',
                'Email support',
              ]}
              ctaLabel="Book a call →"
              ctaHref={starterHref}
              ctaSubtext="Free 15-min call · No contract · 48hr onboarding"
              onCtaClick={() => track('starter_cta_clicked')}
            />
          </div>

          {/* GROWTH (featured — Most Popular) */}
          <div className="order-1 lg:order-2">
            <TierCard
              variant="growth"
              eyebrow="Done-for-you · Monthly"
              name="Growth"
              price="$697"
              pricePeriod="/month · cancel anytime"
              positioning="For the business ready to dominate its market — month after month."
              features={[
                'Everything in Starter, ongoing',
                'AI Search Visibility tracking (20 prompts/mo)',
                'Prompt tracking dashboard',
                'Monthly content + link building',
                'GMB management + weekly posts',
                'Ongoing citation building + new directories',
                'Bi-weekly performance reports',
                'Priority Slack + text support',
              ]}
              ctaLabel="Book a call →"
              ctaHref={growthHref}
              ctaSubtext="Free 15-min call · Cancel anytime · 48hr onboarding"
              onCtaClick={() => track('growth_cta_clicked')}
            />
          </div>

          {/* PRO — `id="pro"` is the deep-link target from /pricing#pro */}
          <div id="pro" className="order-2 scroll-mt-24 lg:order-3">
            <TierCard
              variant="pro"
              eyebrow="Premium · Monthly"
              name="Pro"
              price="$997"
              pricePeriod="/month · cancel anytime"
              positioning="For the business that wants to win the whole region — with Coach Ty on speed dial."
              features={[
                'Everything in Growth',
                'Live AI search citation tracking (ChatGPT, Perplexity, Gemini, Google AI)',
                'Multi-location / service-area expansion pages',
                'Monthly 1-on-1 strategy call with Coach Ty',
                'Priority fix queue (Pro clients first)',
                'Competitor + lead-list CSV exports (Pro-only)',
                'Lola Pro badge for your site footer',
                'Direct line to Coach Ty — Slack + text',
              ]}
              ctaLabel="Book a call →"
              ctaHref={proHref}
              ctaSubtext="Free 15-min call · Cancel anytime · Founder access"
              onCtaClick={() => track('pro_cta_clicked')}
            />
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[640px] text-center text-[12px] leading-[1.55] text-[#8A8F98]">
          Not sure which plan? Book the free call and Coach Ty will tell you
          straight — even if the honest answer is "start with Starter." Move up
          or down anytime.
        </p>
      </section>

      {/* ── 3. GUARANTEES ─────────────────────────────────────────── */}
      <section ref={promiseRef} className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-[680px] text-center text-[14px] italic leading-[1.6] text-[#C5C5C8]">
          SEO tools guarantee nothing. Premium agencies say "results not
          guaranteed." We put it in writing — twice.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {/* 30-Day Half-Back Guarantee */}
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">🛡️</span>
              30-Day Half-Back Guarantee
            </p>
            <p className="relative mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">
              If Lola doesn't move your ranking in your first 30 days, your next
              month is half off — Coach Ty refunds 50%. Same way he'd want to be
              treated.
            </p>
          </div>

          {/* First Win Promise */}
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_44px_rgba(212,175,55,0.12)] sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/4 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.20)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              <span aria-hidden className="text-[18px] drop-shadow-[0_2px_8px_rgba(212,175,55,0.5)]">📊</span>
              The First Win Promise
            </p>
            <p className="relative mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">
              At least one measurable win in your first 60 days — a new ranking,
              a new lead, or a Google Business improvement — or your next month
              is on us. We track it across Google and AI search and show you the
              receipts.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. TRUST STRIP ──────────────────────────────────────────── */}
      <div className="mx-auto mt-10 max-w-[680px] text-center text-[12px] leading-[1.7] text-[#8A8F98] sm:text-[13px]">
        ✓ No setup fee · ✓ Cancel anytime · ✓ Month-to-month · ✓ Real work or you walk
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
                  <span className="block text-[10px] font-normal text-[#D4AF37]">$297–$997/mo</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {[
                ['❌ You DIY', '✓ Done for you', '✓ Done for you'],
                ['❌ Hidden total cost', '❌ Hidden pricing', '✓ Transparent pricing'],
                ['⚠️ Month-to-month (you handle it)', '❌ 12-month contracts', '✓ Month-to-month, cancel anytime'],
                ['❌ No guarantee', '❌ "Results not guaranteed"', '✓ 30-Day Half-Back + First Win'],
                ['⚠️ Track LLMs (enterprise tier only)', '❌ Generic "rank #1" framing', '✓ AI Search Visibility (local)'],
                ['❌ Generic audience', '❌ "Serve everyone"', '✓ Local service business specialist'],
                ['❌ No execution', '✓ Full service (manual)', '✓ Done-for-you execution every week'],
                ['⚠️ Steep learning curve', '⚠️ Long sales call', '✓ Free 15-min call, real answers'],
                ['❌ No founder access', '⚠️ Account manager only', '✓ Pro tier: monthly calls with Coach Ty'],
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
          We're not against tools or agencies. We just believe local service
          businesses deserve done-for-you execution, transparent pricing, and a
          guarantee — without the learning curve of tools or the price tag of
          premium agencies.
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
          “Sandbar Soft Wash: 5 keywords ranked in 3 weeks.”
        </blockquote>
        <figcaption className="mt-4 text-[13px] font-medium text-[#D4AF37] sm:text-[14px]">
          — Lola SEO Case Study, Palm Harbor FL
        </figcaption>
      </figure>

      {/* ── 6b. FAQ — visible accordion + matching FAQPage JSON-LD ────
          Tier-choice + objection-killer Qs, paired with the route-specific
          JSON-LD injected in the useEffect above. Eligible for AI Overview
          + featured-snippet surfaces for "lola seo pricing" + variants. */}
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

      {/* ── 7. FINAL CTA ─────────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Start Here</p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Book a free 15-minute call with Coach Ty.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          We'll look at your business live, tell you what's leaking, and pick the
          right plan together. No pitch deck — Coach Ty answers his own phone.
        </p>
        <a
          href={withUtm(CALENDAR_URL, 'final_cta', 'pricing_final')}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('pricing_final_cta_clicked')}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
        >
          Book a free strategy call →
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

interface TierCardProps {
  variant: 'starter' | 'growth' | 'pro';
  eyebrow: string;
  name: string;
  price: string;
  priceStrikethrough?: string;
  pricePeriod: string;
  priceMeta?: React.ReactNode;
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
  priceStrikethrough,
  pricePeriod,
  priceMeta,
  positioning,
  features,
  ctaLabel,
  ctaHref,
  ctaSubtext,
  onCtaClick,
}: TierCardProps) {
  const isGrowth = variant === 'growth';
  const isPro = variant === 'pro';
  const isStarter = variant === 'starter';

  const cardClass = isGrowth
    ? 'relative flex h-full flex-col rounded-[14px] border-[1.5px] border-[#D4AF37] bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#1A1408] p-6 shadow-[inset_0_0_40px_rgba(212,175,55,0.06),0_0_36px_rgba(212,175,55,0.18)] transition-all duration-300 hover:shadow-[inset_0_0_50px_rgba(212,175,55,0.10),0_0_56px_rgba(212,175,55,0.32)] sm:p-7 lg:scale-[1.03]'
    : isPro
    ? 'relative flex h-full flex-col rounded-[14px] border-[1.5px] border-[#D4AF37]/70 bg-gradient-to-br from-[#0F0F12] via-[#100E0A] to-[#1A1408] p-6 shadow-[0_0_36px_rgba(212,175,55,0.18)] transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_48px_rgba(212,175,55,0.32)] hover:-translate-y-1 sm:p-7'
    : 'relative flex h-full flex-col rounded-[14px] border border-white/[0.10] bg-[#0F0F12]/85 p-6 opacity-[0.97] transition-all duration-300 hover:border-white/[0.18] hover:-translate-y-1 sm:p-7';

  return (
    <div className={cardClass}>
      {isGrowth && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.35)]">
          Most Popular
        </span>
      )}
      {isPro && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.45)]">
          Premium
        </span>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-[22px] font-bold tracking-[-0.01em] text-white sm:text-[26px]">
        {name}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[46px]">
          {price}
        </span>
        {priceStrikethrough && (
          <span className="text-[14px] font-medium text-[#7A7F8A] line-through">
            {priceStrikethrough}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] font-normal text-[#A0A5AE] sm:text-[14px]">
        {pricePeriod}
      </p>

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
        <span className="whitespace-nowrap">🛡️ 30-Day Half-Back</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span className="whitespace-nowrap">✓ Cancel anytime</span>
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
