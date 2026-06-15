/**
 * Lola SEO — marketing homepage at `/`.
 *
 * Sections (top to bottom):
 *   1. Hero — eyebrow, H1, subhead, AI line, trade dropdown, CTAs
 *   2. 3-step flow graphic
 *   3. Execution-first framing line
 *   4. Scrolling stats marquee
 *   5. Outcome stats (4 numbers)
 *   6. Coach Ty About (full bio block)
 *   7. 4-step process
 *   8. Why Lola comparison table
 *   9. Final CTA → /audit
 *
 * Trade dropdown writes to localStorage.lolaTrade — AuditFlow reads it on
 * mount to pre-fill the business_type question.
 */

import { Fragment, useEffect, useState } from 'react';
import Marquee from './Marquee';

// Books a free strategy call. Single source of truth for the whole homepage —
// every primary CTA points here. Env-overridable so the calendar link can be
// swapped without a code change.
const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const TRADES = [
  'HVAC',
  'Plumber',
  'Roofer',
  'Soft Wash / Pressure Wash',
  'Electrician',
  'Landscaper',
  'Painter',
  'Pool Services',
  'General Contractor',
  'Handyman',
  'Concrete',
  'Flooring',
  'Pest Control',
  'Carpet Cleaning',
  'Cleaning Services',
  'Lawn Care',
  'Auto Detailing',
  'Garage Doors',
  'Moving',
  'Med Spa',
  'Salon / Barber',
  'Locksmith',
  'Masonry',
  'Windows',
  'Gutters',
  'Duct Cleaning',
  'Fencing',
  'Home Remodeling',
  'Carpenter',
  'Arborist',
  'Other',
] as const;

// Trades that AuditFlow's TRADE_TO_SERVICE can pre-fill on Step 2. Keep
// strictly in sync with TRADE_TO_SERVICE in AuditFlow.tsx — claiming a trade
// is "mapped" but failing to pre-fill is a broken promise on step 1.
const MAPPED_TRADES = new Set<string>([
  'HVAC',
  'Plumber',
  'Roofer',
  'Soft Wash / Pressure Wash',
  'Pool Service',
  'Pool Services',
]);

const PLURAL: Record<string, string> = {
  HVAC: 'HVAC techs',
  Plumber: 'plumbers',
  Roofer: 'roofers',
  'Soft Wash / Pressure Wash': 'soft wash + pressure washing crews',
  Electrician: 'electricians',
  Landscaper: 'landscapers',
  Painter: 'painters',
  'Pool Services': 'pool pros',
  'General Contractor': 'GCs',
  Handyman: 'handymen',
  Concrete: 'concrete crews',
  Flooring: 'flooring pros',
  'Pest Control': 'pest control teams',
  'Carpet Cleaning': 'carpet cleaners',
  Locksmith: 'locksmiths',
  Masonry: 'masons',
  Windows: 'window pros',
  Gutters: 'gutter crews',
  'Duct Cleaning': 'duct cleaners',
  'Cleaning Services': 'cleaning companies',
  'Lawn Care': 'lawn care crews',
  'Auto Detailing': 'auto detailers',
  'Garage Doors': 'garage door pros',
  Moving: 'moving companies',
  'Med Spa': 'med spas',
  'Salon / Barber': 'salons + barbershops',
  Fencing: 'fencing crews',
  'Home Remodeling': 'remodelers',
  Carpenter: 'carpenters',
  Arborist: 'arborists',
  Other: 'local service businesses',
};

export default function Homepage() {
  const [trade, setTrade] = useState<string>('');

  // Hydrate from localStorage on mount; persist on change so AuditFlow can use it.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('lolaTrade');
      if (saved && TRADES.includes(saved as typeof TRADES[number])) setTrade(saved);
    } catch {
      /* ignore (private-mode / SSR) */
    }
  }, []);

  const handleTradeChange = (v: string) => {
    setTrade(v);
    try {
      if (v) window.localStorage.setItem('lolaTrade', v);
      else window.localStorage.removeItem('lolaTrade');
    } catch {
      /* ignore */
    }
  };

  const tradePlural = trade ? PLURAL[trade] ?? 'local service businesses' : '';
  const auditHref = trade ? `/audit?trade=${encodeURIComponent(trade)}` : '/audit';
  // Grader is the new lead-magnet (60-second single-page form). The trade
  // param threads through so the business_type pre-selects on submit.
  const graderHref = trade ? `/grader?trade=${encodeURIComponent(trade)}` : '/grader';

  return (
    <main className="flex flex-1 flex-col">
      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The AI Leads Expert · Local Service Businesses
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)' }}
        >
          I turn Google + AI search into{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            local leads for your business
          </span>{' '}
          — without you touching a thing.
        </h1>

        <p className="mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          {trade ? (
            <>
              Lola's built for{' '}
              <span className="font-semibold text-white">{tradePlural} in Florida</span>.
              Book a free call below — or run the audit first.
            </>
          ) : (
            <>
              For home services, cleaning, salons, med spas, auto detailing, lawn care —
              any local business buyers find on Google or ask AI to recommend. Lola gets
              you recommended on Google AI, ChatGPT, Perplexity, and Gemini. Done for you,
              transparent pricing, no long-term contracts.
            </>
          )}
        </p>

        {/* AI-line callout — hidden on mobile so trade picker + CTA stay
            above the fold at 375x667. Re-appears at sm: where there's room. */}
        <p className="mt-5 hidden max-w-[680px] rounded-[10px] border-l-2 border-[#D4AF37]/60 bg-[#D4AF37]/[0.04] py-3 pl-4 pr-3 text-[15px] leading-[1.55] text-white sm:block">
          Lola checks where your business shows up in{' '}
          <span className="font-semibold text-[#D4AF37]">Google</span> AND in{' '}
          <span className="font-semibold text-[#D4AF37]">ChatGPT/AI search</span> — because
          that's where your next customer is searching.
        </p>

        {/* Trade picker — feeds AuditFlow + reshapes subhead copy */}
        <div className="mt-6 max-w-[420px]">
          <label
            htmlFor="trade-picker"
            className="block text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85"
          >
            What kind of business are you?
          </label>
          <select
            id="trade-picker"
            value={trade}
            onChange={(e) => handleTradeChange(e.target.value)}
            className="mt-2 block w-full appearance-none rounded-[12px] border border-[#D4AF37]/30 bg-[#0F0F12] px-4 py-3 text-[15px] font-medium text-white shadow-inner outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23D4AF37' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '38px',
            }}
          >
            <option value="">Pick your business type…</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {/* Microcopy when an unmapped trade is picked — sets expectations
              honestly (Step 2 of the audit will still ask). */}
          {trade && !MAPPED_TRADES.has(trade) && (
            <p className="mt-2 text-[12px] leading-[1.5] text-[#8A8F98]">
              We've fully tuned audits for {Array.from(MAPPED_TRADES).slice(0, 5).join(', ')} so far. For{' '}
              <span className="text-[#D4AF37]">{trade}</span>, we'll ask the same questions and run a general local-business audit. Full {trade.toLowerCase()} playbook ships Q1 2026.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
          >
            Book a free strategy call →
          </a>
          <a
            href={graderHref}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition-all duration-200 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            Or get your free score
          </a>
        </div>

        {/* Trust + pricing-transparency wedge. Competitors (LocalIQ, Scorpion)
            quote-gate every CTA — Lola's public pricing is the moat, so we
            surface it the moment the visitor commits to looking. */}
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#7A7F8A] sm:text-[13px]">
          <span><span className="font-semibold text-white">From $297/mo</span> · 3 plans, all done-for-you</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>🛡️ 30-day half-back guarantee</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>Cancel anytime</span>
        </p>
      </section>

      {/* ── 2. 3-STEP FLOW GRAPHIC ──────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-4">
          {[
            { n: '1', h: 'Pick your business type', sub: 'Tell Lola what you do' },
            { n: '2', h: 'Lola sniffs your site', sub: '~20 seconds' },
            { n: '3', h: 'Get your fix list', sub: 'Plus revenue math' },
          ].map((step, i) => (
            <Fragment key={step.n}>
              <div className="flex flex-col rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                  Step {step.n}
                </p>
                <p className="mt-2 text-[18px] font-bold text-white sm:text-[20px]">{step.h}</p>
                <p className="mt-1 text-[13px] text-[#9AA0A6]">{step.sub}</p>
              </div>
              {i < 2 && (
                <div
                  aria-hidden
                  className="hidden items-center justify-center text-[#D4AF37]/60 sm:flex"
                >
                  <svg viewBox="0 0 24 8" width="36" height="14" fill="none">
                    <path
                      d="M1 4h18m0 0l-4-3m4 3l-4 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* ── 3. EXECUTION-FIRST FRAMING LINE ─────────────────────────── */}
      <p className="mt-10 max-w-[820px] text-[15px] leading-[1.6] text-white sm:mt-14 sm:text-[17px]">
        <span className="font-bold text-[#D4AF37]">SEO tools tell you what's broken.</span>{' '}
        Premium agencies charge $2,500/mo to fix it.{' '}
        <span className="font-bold text-[#D4AF37]">Lola does the work for $697/mo</span> — with a
        guarantee.{' '}
        <span className="font-bold text-white">Real work or you walk.</span>
      </p>

      {/* ── 4. SCROLLING STATS MARQUEE ──────────────────────────────── */}
      <div className="relative left-1/2 right-1/2 mt-12 -mx-[50vw] w-screen sm:mt-16">
        <Marquee />
      </div>

      {/* ── 5. OUTCOME STATS (honest, defensible) ───────────────────── */}
      <section className="mt-14 sm:mt-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { num: '20 sec', label: 'Audit completion time' },
            { num: '$1,800/mo', label: 'Saved vs premium agencies' },
            { num: '20+ cities', label: 'Sandbar Soft Wash service area' },
            { num: '60 days', label: 'To first guaranteed win' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5 sm:p-6"
            >
              <p className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[28px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[34px]">
                {s.num}
              </p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.18em] text-[#C5C5C8] sm:text-[13px]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-[13px] italic text-[#8A8F98]">
          Currently working with Sandbar Soft Wash and growing. Your business could be next.
        </p>
      </section>

      {/* ── 5b. INDUSTRIES WE SERVE ──────────────────────────────────
          8 tiles linking to the programmatic [service]-seo-[city] hubs.
          Two wins: (1) cold visitors self-identify into the right niche,
          (2) crawlable internal links into the LP tree boost entity SEO
          for "[service] local SEO" queries. Pattern lifted from Scorpion
          + LocalIQ, dialed to Lola's dark/gold aesthetic. */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Industries
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Built for the businesses your neighborhood searches for.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Tuned playbooks for each industry — keywords, schema, and AI-search
          prompts that match how buyers actually search for your work.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {[
            { emoji: '🏠', name: 'Home Services', slug: 'pressure-washing-seo-tampa' },
            { emoji: '🔧', name: 'Plumbing', slug: 'plumber-seo-tampa' },
            { emoji: '❄️', name: 'HVAC', slug: 'hvac-seo-tampa' },
            { emoji: '🏠', name: 'Roofing', slug: 'roofing-seo-tampa' },
            { emoji: '🏊', name: 'Pool Service', slug: 'pool-service-seo-tampa' },
            { emoji: '🧹', name: 'Cleaning', slug: 'cleaning-seo-tampa' },
            { emoji: '🌿', name: 'Lawn Care', slug: 'lawn-care-seo-tampa' },
            { emoji: '⚡', name: 'Electrical', slug: 'electrician-seo-tampa' },
          ].map((ind) => (
            <a
              key={ind.slug}
              href={`/lp/${ind.slug}`}
              className="group flex min-h-[88px] flex-col justify-between rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.04] sm:p-5"
            >
              <span aria-hidden className="text-[22px] sm:text-[24px]">{ind.emoji}</span>
              <span className="mt-2 text-[14px] font-semibold text-white group-hover:text-[#D4AF37] sm:text-[15px]">
                {ind.name}
              </span>
            </a>
          ))}
        </div>

        <p className="mt-5 text-[13px] text-[#8A8F98]">
          Not on the list? Lola works for any local service business — salons, med spas,
          auto detailing, moving, fencing, more.{' '}
          <a href="/lp/industries" className="font-semibold text-[#D4AF37] underline-offset-2 hover:underline">
            See all industries →
          </a>
        </p>
      </section>

      {/* ── 6. COACH TY ABOUT ────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Built by Coach Ty in Tampa
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-10">
          {/* Photo placeholder — swap to real headshot when ready */}
          <div className="mx-auto h-[160px] w-[160px] overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] sm:mx-0">
            <div className="flex h-full w-full items-center justify-center text-[44px]">🐾</div>
          </div>

          <div className="space-y-4 text-[15px] leading-[1.65] text-[#C5C5C8] sm:text-[16px]">
            <p>
              Most SEO guys hand you a wall of client logos. I'll show you one:{' '}
              <span className="font-semibold text-white">my dad's.</span>
            </p>
            <p>
              Sandbar Soft Wash — Palm Harbor, 15+ years, master certified. Does great work,
              but was nearly invisible on Google for the searches that actually book jobs. So I
              built Lola to fix it, and I'm doing it in public: real site, live dashboard, no
              cherry-picking the numbers.
            </p>
            <p>
              That's the offer. No 50-page audit that dies in your inbox. No $5K/mo agency
              retainer. I run the same system on your business that I run on my father's —{' '}
              <span className="font-semibold text-white">and I show you the receipts every week.</span>
            </p>
            <p className="text-white">
              I'm faith-driven, I answer my own phone, and if Lola doesn't move your ranking in
              30 days, I refund half.{' '}
              <span className="font-bold text-[#D4AF37]">Same way I'd want to be treated.</span>
            </p>
            <p className="text-[14px] text-[#D4AF37]">
              — Coach Ty
              <span className="block text-[12px] text-[#8A8F98] sm:inline sm:before:content-['_·_']">
                Founder, Lola | Ty Alexander Media | Tampa Bay, FL
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. 4-STEP PROCESS BLOCK ─────────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Our Process
        </p>
        <h2
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
        >
          We don't just diagnose. We execute.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          I'm not an SEO consultant who read a book about local business. I built AI
          visibility from the trenches — on my own father's service business first.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: '01', h: 'Audit', body: 'We baseline how AI agents see your business.', get: 'Total clarity on your visibility gaps', pro: false },
            { n: '02', h: 'Build', body: 'We fix the gaps. GMB, citations, reviews, schema.', get: 'AI-ready foundation in 30 days', pro: false },
            { n: '03', h: 'Reinforce', body: 'Monthly content, citations, reviews. Visibility compounds.', get: 'AI agent recommendations on autopilot', pro: false },
            { n: '04', h: 'Dominate', body: 'Auto-Fix snippet pushes changes directly. White-glove support.', get: 'Competitors wonder how you did it', pro: true },
          ].map((step) => (
            <div
              key={step.n}
              className={`group relative flex flex-col rounded-[12px] border bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 sm:p-6 ${
                step.pro
                  ? 'border-[#D4AF37]/40 hover:border-[#D4AF37]/65 hover:shadow-[0_0_28px_rgba(212,175,55,0.20)]'
                  : 'border-white/[0.08] hover:border-white/[0.18]'
              }`}
            >
              {step.pro && (
                <span className="absolute right-4 top-4 rounded-full bg-[#D4AF37]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Pro
                </span>
              )}
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">{step.n}</p>
              <h3 className="mt-2 text-[22px] font-bold text-white sm:text-[24px]">{step.h}</h3>
              <p className="mt-3 flex-1 text-[14px] leading-[1.55] text-[#C5C5C8]">{step.body}</p>
              <p className="mt-5 border-t border-white/[0.06] pt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]/70">
                You get:
              </p>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.45] text-white">{step.get}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. WHY LOLA COMPARISON TABLE ────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The Difference
        </p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Why Lola, not the others?
        </h2>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] text-left text-[13px] sm:text-[14px]">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="px-3 py-3 text-[#8A8F98] sm:px-5 sm:py-4"></th>
                <th className="border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/[0.06] px-3 py-3 text-center text-[#D4AF37] sm:px-5 sm:py-4">
                  Lola
                </th>
                <th className="px-3 py-3 text-center text-[#8A8F98] sm:px-5 sm:py-4">SiteSeen</th>
                <th className="px-3 py-3 text-center text-[#8A8F98] sm:px-5 sm:py-4">SEMrush</th>
                <th className="px-3 py-3 text-center text-[#8A8F98] sm:px-5 sm:py-4">BrightLocal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {[
                ['Built for local service businesses', '✅', '✅', '❌', '❌'],
                ['Done-for-you retainer',       '✅', '❌', '❌', '❌'],
                ['AI Search Visibility',        '✅', '❌', '❌', '❌'],
                ['Personal brand backed',       '✅', '❌', '❌', '❌'],
                ['Florida-focused',             '✅', '❌', '❌', '❌'],
                ['Under $1,000/mo',             '✅', '✅', '❌', '⚠️'],
                ['Coach Ty on Slack/text',      '✅', '❌', '❌', '❌'],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-3 py-3 leading-[1.45] sm:px-5 sm:py-4 ${
                        j === 0
                          ? 'text-[#C5C5C8]'
                          : j === 1
                          ? 'border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/[0.04] text-center text-white'
                          : 'text-center text-[#8A8F98]'
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

        <p className="mt-6 max-w-[680px] text-[14px] italic leading-[1.6] text-[#9AA0A6] sm:text-[15px]">
          Other tools tell you what's broken and disappear. Lola finds it AND fixes it weekly.
          That's the difference.
        </p>
      </section>

      {/* ── 8b. FAQ — visible accordion ─────────────────────────────
          Matches the FAQPage JSON-LD in index.html (search-engine win)
          and crushes the last-mile objections before the final CTA
          (conversion win). Pattern from BrightLocal/Scorpion. */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Common questions
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          The honest answers.
        </h2>

        <div className="mt-8 flex flex-col gap-3">
          {[
            {
              q: 'What kinds of businesses does Lola work with?',
              a: 'Local service businesses of all kinds — home services like pressure washing, plumbing, HVAC, roofing, pool care, plus cleaning, salons, med spas, auto detailing, lawn care, and other local trades. If your next customer is searching Google or asking ChatGPT for a business near them, Lola helps them find you.',
            },
            {
              q: 'How much does Lola cost?',
              a: 'Three simple monthly plans, no long-term contracts: Starter $297/mo, Growth $697/mo (most popular), Pro $997/mo. Every plan is done-for-you. No setup fee.',
            },
            {
              q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
              a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews) because that's increasingly where buyers ask for a recommendation. We track which AI agents recommend you and which competitor they recommend when they don't.",
            },
            {
              q: 'How fast will I see results?',
              a: "30-Day Half-Back: measurable ranking improvement in your first 30 days, or Coach Ty refunds 50%. First Win Promise: at least one measurable win (ranking, lead, or Google Business improvement) in the first 60 days, or your next month is on us. Full ROI typically hits month 3.",
            },
            {
              q: "Do you only work with Florida businesses?",
              a: "Tampa Bay is our home network and where our proof story (Sandbar Soft Wash) lives — but the system works anywhere with Google Maps and AI search. Plenty of clients are outside Florida.",
            },
            {
              q: "What's the cancellation policy?",
              a: "Cancel anytime. No contracts, no minimum commitment. If we're not earning back your investment, you don't owe another dollar.",
            },
            {
              q: "What's actually included each month?",
              a: "Google Business Profile management, citation cleanup + new submissions, on-page SEO fixes, schema markup, AI search visibility tracking, review-generation system, monthly content (Growth+), and Coach Ty oversight. The exact playbook depends on tier — see /pricing for the full breakdown.",
            },
            {
              q: 'Who is behind Lola?',
              a: "Coach Ty in Tampa Bay. He built Lola to fix the local visibility of his father's real business — Sandbar Soft Wash in Palm Harbor — and now runs the same system for other local service businesses. He answers his own phone.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
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

      {/* ── 9. FINAL CTA ─────────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-24 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Start Here</p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          Let's get your business recommended — by Google and by AI.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          Book a free 15-minute strategy call with Coach Ty. No pressure, no pitch deck —
          just a straight answer on what's leaking and what to fix first.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
          >
            Book a free strategy call →
          </a>
          <a
            href={graderHref}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition-all duration-200 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            Or get your free score
          </a>
        </div>
      </section>

      {/* Minimal footer */}
      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
