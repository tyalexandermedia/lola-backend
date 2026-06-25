/**
 * Lola SEO — standalone /pricing page.
 *
 * Sections:
 *   1. Transparency block (above tiers)
 *   2. One price ($697) + add-ons (Social, Multi-Market)
 *   3. 30-Day Half-Back + First Win guarantees
 *   4. Trust strip
 *   5. 3-column comparison: SEO Tools vs Premium Agencies vs Lola
 *   6. Testimonial card
 *
 * Pricing matrix (locked 2026-06-24 — two-tier collapse, no feature gates):
 *   - Lola      $697/mo   one price · everything · no feature gates
 *   - Add-ons   Social +$197/$397 · Multi-Market +$300 · Extra location +$200
 *
 * Every CTA books a free strategy call. No Stripe self-serve checkout — at
 * these price points a 15-minute call closes far better than a cold cart.
 */

import { useEffect, useRef, useState } from 'react';
import LockChecker from './LockChecker';
import { API_URL } from './api';

// Page-scoped FAQs — each entry powers the visible accordion AND the
// FAQPage JSON-LD we inject into <head> at mount (route-specific schema
// since the static index.html schema only covers the homepage's FAQ set).
const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What is the Local Lock — and what does it actually promise?',
    a: "One business per niche per city. When you lock a market, Lola won't run our playbook for your direct competitor in the same city + niche — we say no, in writing. WHAT WE PROMISE: visibility (Google + AI search), clicks to your site, calls to your phone, form fills in your CRM. WHAT WE DON'T PROMISE: closing the lead. That's your craft — your sales process, your follow-up, your trust-building. We get the customer to your door; you earn the job.",
  },
  {
    q: 'What do I actually get? Is the website included?',
    a: "Every plan includes a done-for-you AI website (built + hosted, no setup fee), local SEO across Google + AI search, weekly Google Business Profile management, and a live dashboard showing your calls, leads, and clicks. You don't manage anything — it's set-it-and-forget-it. One price covers all of it; add-ons (social posting, multi-market) bolt on only if you need them.",
  },
  {
    q: 'How much is it — and are there hidden tiers?',
    a: "One price: $697/mo, everything done-for-you with no feature gates — that's the whole product for most home-service businesses (up to 5 cities, your full van radius). Two optional add-ons if you need them: Social Media Management (from +$197/mo) and Multi-Market (+$300/mo — region-wide or multi-location coverage plus a monthly strategy call with Coach Ty). Not sure? Book the free call and Coach Ty will tell you straight.",
  },
  {
    q: 'Do you handle social media posting too?',
    a: "Yes — Social Media Management is an add-on with two levels: Essentials ($197/mo) covers Google Business, Facebook, and Instagram; Complete ($397/mo) adds YouTube Shorts + TikTok short-form video. We create, schedule, and publish — you just approve. It's posting, not video editing, so your channels stay active without you lifting a finger. Add or drop it anytime.",
  },
  {
    q: 'What if a competitor locks my market before I do?',
    a: "We tell you straight on the call. If your direct competitor is already locked in your city, we'll either point you to an adjacent market we can serve, or place you on a notice list in case the lock opens. We don't play both sides.",
  },
  {
    q: 'Can I add or drop add-ons later?',
    a: 'Anytime. Add Social or Multi-Market — or drop them — with one Slack message. We pro-rate the difference. No friction, no penalty.',
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

// Live "markets claimed" momentum — real /locks/recent data. Self-hides when
// empty so a new business never shows fabricated scarcity: social proof + the
// one-per-market scarcity in one honest strip, auto-activating as locks land.
function MarketMomentum() {
  const [locks, setLocks] = useState<Array<{ niche: string; city: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/locks/recent?limit=8`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && Array.isArray(d?.locks)) setLocks(d.locks); })
      .catch(() => { /* silent — strip stays hidden */ });
    return () => { cancelled = true; };
  }, []);
  if (locks.length === 0) return null;
  return (
    <div className="mx-auto mt-16 max-w-[640px] rounded-[14px] border border-[#D4AF37]/25 bg-white/[0.02] px-5 py-4 sm:mt-20">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
        🔒 Recently locked markets
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {locks.map((l, i) => (
          <span key={`${l.niche}-${l.city}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0F0F12] px-3 py-1 text-[11px] text-[#C5C5C8]">
            <span className="capitalize text-white">{l.niche}</span>
            <span aria-hidden className="text-[#5A5F68]">·</span>
            {l.city}
            <span aria-hidden className="text-[#F59E0B]">🔒</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-[12px] text-[#7A7F8A]">
        One business per niche per city. Yours is still open — for now.
      </p>
    </div>
  );
}

// ROI calculator — makes the $697 math undeniable for cold traffic. Honest:
// the visitor sets the numbers; Lola only claims to get them found + called.
function RoiCalculator({ ctaHref }: { ctaHref: string }) {
  const [jobValue, setJobValue] = useState(500);
  const [jobsPerMo, setJobsPerMo] = useState(3);
  const monthly = jobValue * jobsPerMo;
  const annual = monthly * 12;
  const roiX = monthly / 697;
  const breakeven = Math.max(1, Math.ceil(697 / jobValue));
  const money = (n: number) => '$' + Math.round(n).toLocaleString();
  return (
    <section className="mt-16 sm:mt-20">
      <div className="mx-auto max-w-[620px] rounded-[18px] border border-[#D4AF37]/25 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 shadow-[0_0_50px_rgba(212,175,55,0.07)] sm:p-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Do the math</p>
        <h2 className="mt-2 text-center text-[22px] font-bold tracking-[-0.01em] text-white sm:text-[26px]">
          What is getting found actually worth?
        </h2>
        <p className="mx-auto mt-2 max-w-[440px] text-center text-[13px] leading-[1.5] text-[#9CA3AF]">
          You set the numbers. Lola gets your phone ringing — you close the jobs.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="roi-job" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Your average job</label>
              <span className="text-[18px] font-extrabold text-white">{money(jobValue)}</span>
            </div>
            <input id="roi-job" type="range" min={150} max={5000} step={50} value={jobValue} onChange={(e) => setJobValue(+e.target.value)} className="mt-3 w-full accent-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="roi-jobs" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Extra jobs / month</label>
              <span className="text-[18px] font-extrabold text-white">{jobsPerMo}</span>
            </div>
            <input id="roi-jobs" type="range" min={1} max={20} step={1} value={jobsPerMo} onChange={(e) => setJobsPerMo(+e.target.value)} className="mt-3 w-full accent-[#D4AF37]" />
          </div>
        </div>

        <div className="mt-7 rounded-[14px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-5 text-center">
          <p className="text-[13px] text-[#C5C5C8]">
            {jobsPerMo} extra job{jobsPerMo > 1 ? 's' : ''}/mo at {money(jobValue)} each =
          </p>
          <p className="mt-1 text-[40px] font-black leading-none text-[#D4AF37] sm:text-[48px]">
            {money(monthly)}<span className="text-[16px] font-bold text-[#9CA3AF]">/mo</span>
          </p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">{money(annual)}/year in new work</p>
          <div className="mt-4 flex flex-col gap-1 border-t border-white/[0.08] pt-4 text-[13px] text-[#C5C5C8]">
            <p>Lola pays for itself with <span className="font-bold text-white">{breakeven} job{breakeven > 1 ? 's' : ''}</span> — the rest is profit.</p>
            <p><span className="font-bold text-[#D4AF37]">{roiX.toFixed(1)}× return</span> on your $697/mo.</p>
          </div>
        </div>

        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('growth_cta_clicked', { from: 'roi_calc' })}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left text-[15px] font-black uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(212,175,55,0.4)] transition-all hover:bg-right active:scale-[0.99] sm:h-16 sm:text-[16px]"
        >
          🔒 Lock my market — book a free call →
        </a>
        <p className="mt-3 text-center text-[11px] text-[#7A7F8A]">
          We don&apos;t promise jobs — we get you found, clicked, and called. Closing is your craft.
        </p>
      </div>
    </section>
  );
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

  const growthHref = withUtm(CALENDAR_URL, 'growth', 'growth');
  const proHref = withUtm(CALENDAR_URL, 'pro', 'pro');

  return (
    <main className="flex flex-1 flex-col">
      {/* Desktop floating CTA — always-visible buy button on pricing (mobile uses the global sticky bar) */}
      <a
        href={growthHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('growth_cta_clicked', { from: 'desktop_float' })}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-6 py-3.5 text-[14px] font-black uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[0_8px_28px_rgba(212,175,55,0.45)] transition-all hover:scale-[1.03] sm:flex"
      >
        🔒 Lock my market — $697 →
      </a>
      {/* ── 1. TRANSPARENCY BLOCK ─────────────────────────────────────── */}
      <section className="pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Transparent Pricing
        </p>
        <h1
          className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
        >
          Pick your{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            Local Lock
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[700px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
          One business per niche per city. When you lock a market, we don&apos;t run
          the Lola playbook for your direct competitor there. One price covers your
          full delivery radius — up to 5 cities. Serve a whole region? The
          Multi-Market add-on extends the Lock.
        </p>
        <p className="mx-auto mt-3 max-w-[680px] text-[13px] italic leading-[1.55] text-[#9CA3AF] sm:text-[14px]">
          Plain English: we get you <span className="text-white">found, clicked, called, and form-filled</span>.
          Closing the lead is on you — that&apos;s your craft, not ours.
        </p>

        {/* Above-the-fold price + CTA + honest Lock scarcity — first thing they see */}
        <div className="mx-auto mt-7 flex max-w-[520px] flex-col items-center gap-3">
          <p className="text-[15px] text-[#C5C5C8]">
            Everything done-for-you — <span className="text-[22px] font-black text-[#D4AF37]">$697</span><span className="text-[13px] font-bold text-[#9CA3AF]">/mo</span>. No setup fee. Cancel anytime.
          </p>
          <a
            href={growthHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('growth_cta_clicked', { from: 'hero' })}
            className="flex h-14 w-full max-w-[420px] items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left text-[15px] font-black uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(212,175,55,0.4)] transition-all hover:bg-right active:scale-[0.99] sm:h-16 sm:text-[16px]"
          >
            🔒 Lock my market — book a free call →
          </a>
          <p className="text-[12px] text-[#9CA3AF]">
            One business per niche per city — when yours is locked, your competitor can&apos;t hire us.
          </p>
        </div>
      </section>

      {/* ── 1b. EVERY PLAN INCLUDES — instant bundle clarity ──────────
          So a texted link reads in 5 seconds: this is what you get, every
          tier. Website is included, no setup fee. */}
      <section className="mt-10">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85">
          Every plan includes — no setup fee
        </p>
        <div className="mx-auto mt-4 grid max-w-[760px] grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { emoji: '🌐', t: 'AI website', s: 'Built + hosted for you' },
            { emoji: '🔎', t: 'Local SEO', s: 'Google + AI search' },
            { emoji: '📍', t: 'Google Business', s: 'Managed weekly' },
            { emoji: '📊', t: 'Live dashboard', s: 'Calls · leads · clicks' },
          ].map((x) => (
            <div key={x.t} className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <div aria-hidden className="text-[22px]">{x.emoji}</div>
              <p className="mt-2 text-[14px] font-semibold text-white">{x.t}</p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{x.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. ONE PRICE ───────────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        {/* One price. $697 is the whole product — every signal Lola tracks,
            no feature gates. Region-wide coverage + a monthly strategy call
            are the Multi-Market add-on below. */}
        {/* Agency-price anchor — frame the one price as a steal */}
        <div className="mx-auto mb-6 max-w-[600px] rounded-[14px] border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.08] to-transparent px-5 py-4 text-center">
          <p className="text-[14px] leading-[1.55] text-[#E8E4D8]">
            Most agencies charge <span className="font-bold text-white">$2,000–$5,000/mo</span> — for just
            <span className="italic"> pieces</span> of this. Lola does <span className="font-semibold text-[#D4AF37]">all of it</span>,
            done-for-you, for <span className="font-bold text-white">$697/mo</span>. No setup fee. Cancel anytime.
          </p>
        </div>
        <div className="mx-auto max-w-[460px]">
          {/* GROWTH (featured — Most Popular) — Service area lock */}
          <div className="order-1">
            <TierCard
              variant="growth"
              eyebrow="Done-for-you local visibility · Monthly"
              name="Lola Leads"
              price="$697"
              pricePeriod="/month · cancel anytime"
              positioning="Get found everywhere your next customer looks — Google, Maps, and AI search — so your phone rings. We do all of it. One business per market: lock yours and we say no to your direct competitor."
              features={[
                '🌐 Done-for-you AI website — built + hosted ($3,000 value, free)',
                '🔒 Local Lock — your niche + up to 5 cities, exclusive',
                '🔎 Everything Lola tracks — SEO, GBP, content, reviews, calls, AI search',
                '📊 Live client dashboard + bi-weekly reports',
                '💬 Direct Slack + text with Coach Ty',
              ]}
              ctaLabel="Claim your service area →"
              ctaHref={growthHref}
              ctaSubtext="Free 15-min call · Cancel anytime · 48hr onboarding"
              onCtaClick={() => track('growth_cta_clicked')}
            />
          </div>

        </div>

        {/* Grand-slam value + bonus stack — deliverables → free bonuses → total → price → CTA */}
        <div className="mx-auto mt-8 max-w-[620px] overflow-hidden rounded-[18px] border border-[#D4AF37]/25 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[0_0_50px_rgba(212,175,55,0.08)]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Here&apos;s everything you get</p>
          </div>
          <div className="p-6 sm:p-8">
            <ul className="space-y-3 text-[14px] sm:text-[15px]">
              {[
                ['Local SEO — Google + Map Pack rankings', '$1,500/mo'],
                ['Google Business Profile + weekly posts', '$400/mo'],
                ['Content + link building', '$600/mo'],
                ['Review-generation system', '$150/mo'],
                ['Call tracking + lead attribution', '$100/mo'],
                ['AI Search Visibility tracking', '$250/mo'],
                ['Live dashboard + reporting', '$150/mo'],
              ].map(([label, val]) => (
                <li key={label} className="flex items-baseline justify-between gap-4">
                  <span className="flex items-baseline gap-2 text-[#E8E4D8]"><span className="text-[#D4AF37]">✓</span>{label}</span>
                  <span className="whitespace-nowrap text-[13px] font-medium text-[#7A7F8A] line-through">{val}</span>
                </li>
              ))}
            </ul>

            {/* Free bonuses — the Hormozi stack */}
            <div className="mt-6 rounded-[14px] border border-[#D4AF37]/35 bg-[#D4AF37]/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">🎁 Plus free bonuses when you lock your market</p>
              <ul className="mt-4 space-y-3 text-[14px] sm:text-[15px]">
                {[
                  ['Done-for-you AI website — built + hosted', '$3,000', 'FREE'],
                  ['Your Market Lock — we turn away your competitor, in writing', 'Exclusive', 'FREE'],
                  ['Competitor Teardown on your call — who beats you + how to pass them', '$500', 'FREE'],
                  ['48-hour onboarding — work starts in 2 days, no setup fee', '$500', 'FREE'],
                ].map(([label, val, tag]) => (
                  <li key={label} className="flex items-start justify-between gap-3">
                    <span className="text-[#F0EAD6]">{label} <span className="whitespace-nowrap text-[12px] text-[#9CA3AF]">({val} value)</span></span>
                    <span className="mt-0.5 whitespace-nowrap rounded-full bg-[#D4AF37] px-2.5 py-0.5 text-[10px] font-black tracking-wide text-[#0A0A0B]">{tag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Total → price reveal */}
            <div className="mt-7 text-center">
              <p className="text-[12px] uppercase tracking-[0.2em] text-[#9CA3AF]">
                Real value: <span className="font-bold text-white">$3,150/mo</span> + <span className="font-bold text-white">$4,000</span> in bonuses
              </p>
              <p className="mt-3 text-[14px] text-[#C5C5C8]">Your price</p>
              <p className="text-[52px] font-black leading-none text-[#D4AF37] sm:text-[60px]">
                $697<span className="text-[20px] font-bold text-[#9CA3AF]">/mo</span>
              </p>
              <p className="mt-3 text-[12px] text-[#8A8F98]">$0 setup · cancel anytime · 30-day half-back guarantee</p>
            </div>

            {/* BIG CTA — easy to click & buy */}
            <a
              href={growthHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('growth_cta_clicked', { from: 'value_stack' })}
              className="mt-6 flex h-16 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left text-center text-[15px] font-black uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_30px_rgba(212,175,55,0.4)] transition-all hover:bg-right active:scale-[0.99] sm:text-[16px]"
            >
              🔒 Lock my market — book a free call →
            </a>
            <p className="mt-3 text-center text-[12px] text-[#9CA3AF]">
              No credit card · 15-minute call · We&apos;ll tell you straight if it&apos;s not a fit
            </p>

            {/* Easy in / easy out — kill the commitment objection (the #1 conversion lever) */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">✅ Easy in</p>
                <p className="mt-1 text-[12px] text-[#C5C5C8]">No setup fee · no card to book · live in 48 hours</p>
              </div>
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">🚪 Easy out</p>
                <p className="mt-1 text-[12px] text-[#C5C5C8]">No contract · cancel anytime in one text</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[680px] text-center text-[12px] leading-[1.55] text-[#8A8F98]">
          One price, everything included — no feature gates. Need region-wide
          coverage or a monthly strategy call with Coach Ty? Add Multi-Market
          below. Book the free call and Coach Ty will tell you straight — even
          if the honest answer is &quot;you don&apos;t need the add-on yet.&quot;
        </p>
      </section>

      {/* ── 2b. ADD-ONS — clear good/better pricing, expansion revenue ──── */}
      <section className="mt-14 sm:mt-16">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Optional add-ons — bolt on only what you need
        </p>
        <p className="mx-auto mt-2 max-w-[560px] text-center text-[13px] leading-[1.5] text-[#9CA3AF]">
          The $697 plan is the whole growth system. These just extend your reach — add or drop anytime, no contract.
        </p>
        <div className="mx-auto mt-6 grid max-w-[860px] grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Social Media Management — Essentials / Complete */}
          <div className="flex flex-col rounded-[14px] border border-[#D4AF37]/30 bg-white/[0.02] p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">📣 Social Media Management</p>
            <p className="mt-2 text-[13px] leading-[1.55] text-[#9CA3AF]">
              Done-for-you content — we create it, schedule it, and post it. You approve; we publish. Your feeds stay
              alive without you lifting a finger.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-bold text-white">Essentials</p>
                  <p className="text-[18px] font-extrabold text-white">+$197<span className="text-[11px] font-medium text-[#9CA3AF]">/mo</span></p>
                </div>
                <p className="mt-1 text-[12px] text-[#C5C5C8]">Google Business · Facebook · Instagram</p>
              </div>
              <div className="relative rounded-[10px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-4">
                <span className="absolute -top-2 right-3 rounded-full bg-[#D4AF37] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0A0A0B]">Best value</span>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-bold text-white">Complete</p>
                  <p className="text-[18px] font-extrabold text-white">+$397<span className="text-[11px] font-medium text-[#9CA3AF]">/mo</span></p>
                </div>
                <p className="mt-1 text-[12px] text-[#C5C5C8]">Everything in Essentials <span className="text-[#D4AF37]">+ YouTube Shorts &amp; TikTok</span></p>
              </div>
            </div>
          </div>

          {/* Multi-Market & Locations — id="pro" keeps /pricing#pro deep-links working */}
          <div id="pro" className="flex scroll-mt-24 flex-col rounded-[14px] border border-[#D4AF37]/30 bg-white/[0.02] p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">📍 Multi-Market &amp; Locations</p>
            <p className="mt-2 text-[13px] leading-[1.55] text-[#9CA3AF]">
              Serve more than your home turf — stretch the Lock across a region, or run more than one storefront.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-bold text-white">Multi-Market</p>
                  <p className="text-[18px] font-extrabold text-white">+$300<span className="text-[11px] font-medium text-[#9CA3AF]">/mo</span></p>
                </div>
                <p className="mt-1 text-[12px] leading-[1.45] text-[#C5C5C8]">Region-wide — up to 10 cities · monthly strategy call with Coach Ty · per-location dashboards · priority queue</p>
              </div>
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-bold text-white">Each extra location</p>
                  <p className="text-[18px] font-extrabold text-white">+$200<span className="text-[11px] font-medium text-[#9CA3AF]">/mo</span></p>
                </div>
                <p className="mt-1 text-[12px] leading-[1.45] text-[#C5C5C8]">A 2nd or 3rd storefront — its own Google Business Profile, location page &amp; call tracking</p>
              </div>
            </div>
          </div>

        </div>
        <p className="mx-auto mt-5 max-w-[680px] text-center text-[12px] text-[#8A8F98]">
          Add any of these when you book — or anytime after. No contracts on add-ons either.{' '}
          <a href={proHref} target="_blank" rel="noopener noreferrer" onClick={() => track('pro_cta_clicked')} className="font-semibold text-[#D4AF37] hover:text-[#F4D47C]">Book a call to add one →</a>
        </p>
      </section>

      {/* ── 2c. ROI CALCULATOR — make the $697 math undeniable ──────── */}
      <RoiCalculator ctaHref={growthHref} />

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
        ✓ Website included · ✓ No setup fee · ✓ Cancel anytime · ✓ Month-to-month · ✓ Real work or you walk
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
                  <span className="block text-[10px] font-normal text-[#D4AF37]">$697/mo</span>
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
                ['❌ No founder access', '⚠️ Account manager only', '✓ Founder access; monthly calls via Multi-Market'],
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

      {/* ── 6c. LIVE LOCK AVAILABILITY ────────────────────────────────
          Turns the structural Lock backend (local_locks table + DB-level
          uniqueness) into a visible conversion lever. Real data, real
          urgency, no fabricated scarcity. */}
      <MarketMomentum />

      <LockChecker />

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

      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
          {eyebrow}
        </p>
        <h3 className="mt-2.5 flex items-center justify-center gap-2 text-[28px] font-extrabold leading-tight tracking-[-0.01em] text-white sm:text-[34px]">
          <span aria-hidden className="text-[#D4AF37]">🐾</span>
          {name}
        </h3>
        <div className="mt-3 flex items-baseline justify-center gap-2">
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[46px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[54px]">
            {price}
          </span>
          {priceStrikethrough && (
            <span className="text-[14px] font-medium text-[#7A7F8A] line-through">
              {priceStrikethrough}
            </span>
          )}
        </div>
        <p className="mt-2 text-[13px] font-normal text-[#A0A5AE] sm:text-[14px]">
          {pricePeriod}
        </p>
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
