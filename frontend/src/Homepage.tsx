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
import RoadmapJourney from './RoadmapJourney';
import { ROADMAP } from './lib/pricing';

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

  // Roadmap stages, pulled from the canonical pricing source so homepage copy
  // never drifts from docs/PRICING.md.
  const foundation = ROADMAP.find((s) => s.id === 'foundation')!;
  const growth = ROADMAP.find((s) => s.id === 'growth')!;
  const scale = ROADMAP.find((s) => s.id === 'scale')!;

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

        {/* Verified-GBP + Sandbar proof pill — visible above the hero on
            every breakpoint. Two trust signals in one row: 'we have a real
            verified Google Business' (kills agency-skepticism) + 'we have a
            real client proof story you can read' (kills no-track-record
            skepticism). Both link out to verifiable destinations. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] sm:text-[12px]">
          <a
            href="/case-studies/sandbar"
            className="group inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1 font-semibold uppercase tracking-[0.08em] text-[#D4AF37] transition hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.12]"
          >
            🛡️ Real proof story: Sandbar Soft Wash
            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </a>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] sm:inline-flex">
            ✓ Verified Google Business · Ty Alexander Media
          </span>
        </div>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)' }}
        >
          Get found on Google AND AI search —{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            calls, clicks, form fills
          </span>{' '}
          land on autopilot.
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

        {/* Friction-killer single-input form. Replaced the trade dropdown
            (one extra decision before the click) with a single business-name
            input that routes to /grader?biz=<name>. Visitor lands on the
            Grader already mid-form — perceived progress + lower drop-off.
            Submit-on-Enter is wired so keyboard users get instant action. */}
        <form
          className="mt-7 max-w-[520px]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const biz = String(fd.get('biz') || '').trim();
            const q = new URLSearchParams();
            if (biz) q.set('biz', biz);
            if (trade) q.set('trade', trade);
            window.location.assign(`/growth-score${q.toString() ? '?' + q.toString() : ''}`);
          }}
        >
          <label htmlFor="biz" className="block text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85">
            What&apos;s your business name?
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="biz"
              name="biz"
              type="text"
              required
              autoComplete="organization"
              placeholder="e.g. Sandbar Soft Wash"
              className="h-14 flex-1 rounded-[12px] border border-[#D4AF37]/30 bg-[#0F0F12] px-4 text-[15px] font-medium text-white outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
            />
            <button
              type="submit"
              className="h-14 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:text-[14px]"
            >
              Get my Growth Score →
            </button>
          </div>
          <p className="mt-3 text-[12px] text-[#7A7F8A] sm:text-[13px]">
            60 seconds · no signup · your 0–100 Growth Score across 6 dimensions + your next step
          </p>
        </form>

        {/* Secondary CTA — the call. Still higher-LTV conversion, but no
            longer the front door (Grader took that). */}
        <div className="mt-5">
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:text-[#F4D47C] sm:text-[15px]"
          >
            Or book a free 15-min strategy call →
          </a>
        </div>

        {/* Education-first wedge — the Growth Roadmap (/roadmap) lead-gen page.
            Complements the Foundation-first narrative below by letting the
            visitor SEE the phased journey. */}
        <div className="mt-3">
          <a
            href="/roadmap"
            className="inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:text-[#F4D47C] sm:text-[15px]"
          >
            See the full Growth Roadmap →
          </a>
        </div>

        {/* Free-website hook — lead with the biggest bonus (Hormozi: value up front) */}
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] px-4 py-1.5 text-[12px] font-semibold text-[#E8E4D8] sm:text-[13px]">
          🎁 Includes a <span className="font-bold text-white">free $3,000 website</span> — built + hosted, $0 setup
        </p>

        {/* Trust + pricing-transparency wedge. Competitors (LocalIQ, Scorpion)
            quote-gate every CTA — Lola's public pricing is the moat, so we
            surface it the moment the visitor commits to looking. */}
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#7A7F8A] sm:text-[13px]">
          <span><span className="font-semibold text-white">Foundation from {foundation.price} {foundation.period}</span> · a phased growth roadmap, all done-for-you</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>🛡️ 30-day half-back guarantee</span>
          <span aria-hidden className="text-[#3A3F48]">·</span>
          <span>No contract · cancel anytime</span>
        </p>

        {/* Foundation-first positioning — the core narrative wedge. */}
        <p className="mt-6 max-w-[680px] rounded-[10px] border-l-2 border-[#D4AF37]/60 bg-[#D4AF37]/[0.04] py-3 pl-4 pr-3 text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]">
          <span className="font-semibold text-white">Most businesses don&apos;t have a marketing problem first — they have a foundation problem.</span>{' '}
          Lola starts there. Month 1 builds the base, days 31–90 build the signals, and after 90 days the data compounds.
        </p>
      </section>

      {/* ── 1a. VISUAL ROADMAP — the signature journey graphic ──────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The path
        </p>
        <h2
          className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          Start free. Advance by maturity.
        </h2>
        <p className="mx-auto mt-4 mb-10 max-w-[600px] text-center text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          One number, then a phased roadmap — not a generic monthly package. Here&apos;s the whole journey.
        </p>
        <RoadmapJourney />
        <div className="mt-8 text-center">
          <a
            href="/roadmap"
            className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:text-[#F4D47C]"
          >
            See the full roadmap →
          </a>
        </div>
      </section>

      {/* ── 1b. AI SEARCH PLATFORMS TRACKED ──────────────────────────
          Tight visual proof of WHICH AI engines Lola tracks. Otterly
          publishes the data: ChatGPT = 56% of AI search referrals, Gemini
          = 18%, Perplexity = 8%. Putting the platforms on the page makes
          the AI-search claim concrete the moment cold visitors hit the site. */}
      <section className="mt-10 sm:mt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85">
          AI engines Lola tracks for you
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            { name: 'ChatGPT', share: '56%', sub: 'of AI traffic' },
            { name: 'Gemini', share: '18%', sub: 'of AI traffic' },
            { name: 'Perplexity', share: '8%', sub: 'of AI traffic' },
            { name: 'Claude', share: 'Rising', sub: 'of AI traffic' },
          ].map((p) => (
            <div
              key={p.name}
              className="flex flex-col rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition-colors hover:border-[#D4AF37]/30"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-white sm:text-[14px]">{p.name}</p>
                <p className="text-[11px] font-bold tabular-nums text-[#D4AF37]">{p.share}</p>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">{p.sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-[1.5] text-[#7A7F8A] sm:text-[12px]">
          Source: <span className="text-[#9CA3AF]">Otterly AI 2026 research — 15% of all website traffic now comes from AI agents.</span> Lola tracks all four across your growth roadmap, as integrations are connected.
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
        <span className="font-bold text-[#D4AF37]">Lola builds the foundation for {foundation.price}, then runs your growth roadmap from {growth.price}{growth.period}</span> — with a
        guarantee.{' '}
        <span className="font-bold text-white">Real work or you walk.</span>
      </p>

      {/* Outcome-tracking band — ties the offer to measurable results, the
          thing that justifies the retainer. Mirrors the live dashboard. */}
      <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-[#D4AF37]/20 bg-white/[0.02] p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 sm:p-6">
        <div className="flex gap-3 sm:gap-4">
          {[['📞', 'Calls'], ['📝', 'Leads'], ['👆', 'Clicks']].map(([e, l]) => (
            <div key={l} className="flex flex-col items-center rounded-[10px] border border-white/[0.08] bg-[#0F0F12] px-4 py-2.5">
              <span aria-hidden className="text-[18px]">{e}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">{l}</span>
            </div>
          ))}
        </div>
        <p className="text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]">
          <span className="font-semibold text-white">You get a live Growth Score dashboard</span> — calls,
          leads, and clicks tracked where access exists and as integrations are connected. Not vanity rankings:
          the signals that pay your bills, and exactly where you are on the roadmap.{' '}
          <span className="text-[#D4AF37]">Evidence you can see, not take on faith.</span>
        </p>
      </div>

      {/* ── 3b. VALUE STACK — anchor the roadmap against agency pricing (mirrors /pricing) ─ */}
      <section className="mt-14 sm:mt-20">
        <h2
          className="mx-auto max-w-[760px] text-center font-bold leading-[1.15] tracking-[-0.01em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.4rem)' }}
        >
          Everything you&apos;d pay an agency{' '}
          <span className="bg-gradient-to-br from-[#FFD166] to-[#D4AF37] bg-clip-text text-transparent">$2,000–$5,000/mo</span> for —
          on a roadmap that starts at <span className="bg-gradient-to-br from-[#FFD166] to-[#D4AF37] bg-clip-text text-transparent">{foundation.price}</span>.
        </h2>
        <div className="mx-auto mt-7 max-w-[600px] rounded-[18px] border border-[#D4AF37]/25 bg-white/[0.02] p-6 shadow-[0_0_44px_rgba(212,175,55,0.06)] sm:p-7">
          <ul className="space-y-2.5 text-[14px] sm:text-[15px]">
            {[
              [`🧱 ${foundation.name}`, `${foundation.price} ${foundation.period}`],
              [`🚀 ${growth.name} (most popular)`, `${growth.price}${growth.period}`],
              [`📈 ${scale.name}`, `${scale.price}${scale.period}`],
              ['🌐 Done-for-you AI website', 'included'],
              ['🤖 AI-search visibility + call tracking', 'included'],
              ['📊 Live Growth Score dashboard', 'included'],
            ].map(([label, val]) => (
              <li key={label} className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] pb-2.5">
                <span className="text-[#E8E4D8]">{label}</span>
                <span className="whitespace-nowrap text-[13px] font-semibold text-[#9CA3AF]">{val}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col items-center gap-1 rounded-[12px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] py-4 text-center">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[#9CA3AF]">Agencies charge $2,000–$5,000/mo — Lola is done-for-you on the roadmap</p>
            <p className="text-[15px] font-bold text-white">Start at <span className="text-[#D4AF37]">{foundation.price} {foundation.period}</span>, then {growth.price}{growth.period} · $0 setup</p>
          </div>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right"
            >
              Book a free strategy call →
            </a>
            <a href="/pricing" className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:text-[#F4D47C]">
              See full pricing →
            </a>
          </div>
        </div>
      </section>

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
            <p className="mt-3">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#D4AF37]/85 underline-offset-2 transition hover:text-[#D4AF37] hover:underline"
              >
                ✓ Verified Google Business — Ty Alexander Media, Tampa Bay, FL
                <span aria-hidden>↗</span>
              </a>
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
            { n: '04', h: 'Dominate', body: 'Multi-service, multi-city execution with attribution and the Evidence Engine — the Scale System.', get: 'Competitors wonder how you did it', pro: true },
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
                  Scale
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
              a: "It's a phased growth roadmap, not a one-size package. You start with the Foundation Sprint — $297 one-time — to build a searchable, trackable base. From there, Growth Roadmap is $497/mo (most popular) once the foundation's in place, and Scale System is $697/mo ($997+ in competitive or multi-location markets). No setup fee, no contract, month-to-month on the recurring stages. You're not paying more for no reason — you're paying for maturity as the work expands.",
            },
            {
              q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
              a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews) because that's increasingly where buyers ask for a recommendation. We track which AI agents recommend you and which competitor they recommend when they don't.",
            },
            {
              q: 'How fast will I see results?',
              a: "Think in roadmap stages. Month 1 (the Foundation Sprint) builds the base. Days 31–90 build the signals — this is where rankings, impressions, calls, and lead signals start becoming visible. After 90 days the data compounds. Two real guarantees back it: the 30-Day Half-Back — if Lola doesn't move your ranking in your first 30 days, your next month is 50% off — and the First Win Promise — at least one measurable win (a new ranking, a new lead, or a Google Business improvement) in your first 60 days, or your next month is on us.",
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
              q: "What's actually included at each stage?",
              a: "The Foundation Sprint ($297 one-time) creates the base: landing page / website foundation, core SEO setup, Google indexing basics, on-page SEO, local service-area targeting, call CTA + tracking setup, and your first roadmap snapshot + visibility score. Growth Roadmap ($497/mo) adds ongoing SEO, content expansion, Google Business posting (where access exists), call/form/message tracking review, monthly roadmap updates, and review strategy. Scale System ($697/mo, $997+ competitive) layers on multi-service and multi-city strategy, advanced dashboard reporting, attribution, conversion optimization, and the Evidence Engine. See /pricing for the full breakdown.",
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

        {/* Offer snapshot — the growth roadmap entry point (mirrors /pricing) */}
        <div className="mx-auto mt-7 max-w-[560px] rounded-[16px] border border-[#D4AF37]/30 bg-[#0A0A0B]/50 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">🐾 The LOLA OS growth roadmap</p>
          <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-[1.55] text-[#E8E4D8]">
            Start with a <span className="font-semibold text-white">$297 Foundation Sprint</span> — website foundation, local SEO,
            tracking, a baseline audit &amp; your 90-day roadmap — <span className="font-semibold text-white">done for you</span>.
          </p>
          <p className="mt-4 text-[34px] font-black leading-none text-[#D4AF37] sm:text-[40px]">
            $297<span className="text-[15px] font-bold text-[#9CA3AF]"> one-time, then $497–$997/mo</span>
          </p>
          <p className="mt-2 text-[12px] text-[#8A8F98]">$0 setup · cancel anytime on recurring stages · 30-day half-back</p>
          <a href="/pricing" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#D4AF37] hover:text-[#F4D47C]">
            See your full roadmap →
          </a>
        </div>

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
