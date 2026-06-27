/**
 * LOLA OS — standalone /pricing page.
 *
 * Roadmap model (source of truth: docs/PRICING.md → frontend/src/lib/pricing.ts):
 *   - Foundation Sprint  $297 one-time   the low-risk front door
 *   - Growth Roadmap     $497/mo         Most Popular
 *   - Scale System       $697/mo         $997+ competitive markets
 *
 * Positioning: LOLA OS sells measurable progress through a phased growth
 * roadmap — not a generic monthly SEO package. The retired "Local Lock"
 * model has been replaced with Foundation → Growth → Scale + the Growth Score.
 *
 * Every CTA books a free strategy call. No Stripe self-serve checkout — at
 * these price points a 15-minute call closes far better than a cold cart.
 */

import { useEffect, useRef } from 'react';
import {
  ROADMAP,
  ADD_ONS,
  GUARANTEES,
  GROWTH_SCORE_DIMENSIONS,
  type RoadmapStage,
} from './lib/pricing';

// Page-scoped FAQs — each entry powers the visible accordion AND the
// FAQPage JSON-LD we inject into <head> at mount (route-specific schema
// since the static index.html schema only covers the homepage's FAQ set).
const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Why is LOLA OS a roadmap instead of a package?',
    a: "Because most local businesses don't have a marketing problem first — they have a foundation problem. You don't buy random SEO tasks; you enter a 30/60/90+ day roadmap and advance by maturity. Month 1 creates the base. Days 31–90 build signals. After 90 days the data compounds. You're not paying more each month for no reason — you're paying for a more mature growth system.",
  },
  {
    q: 'What do I actually get? Is the website included?',
    a: "Yes. The Foundation Sprint ($297 one-time) builds your landing-page/website foundation, sets up core SEO and tracking, and gives you a baseline audit, a visibility score, and your 90-day roadmap. Growth ($497/mo) and Scale ($697/mo) then expand visibility, content, and reporting over time. You don't manage anything — it's done for you.",
  },
  {
    q: 'Where do I start?',
    a: "Most businesses start with the Foundation Sprint — it's one-time, low-risk, and you walk away with a real foundation plus a roadmap even if you never continue. From there, Growth is the default for businesses ready to build momentum, and Scale is for competing across multiple services and cities. Not sure? Book the free roadmap call and Coach Ty will tell you straight where you are.",
  },
  {
    q: 'What is the Growth Score?',
    a: "Your dashboard isn't a pile of charts — it's a Growth Score. You log in and see exactly where you are across Foundation, Growth, Authority, AI Visibility, Reputation, and Revenue Tracking. Instead of 'what are you doing this month?', the score answers it: we're getting you from, say, 42 to 70. Metrics show up as they're connected — calls, forms, messages, clicks, Google Business activity, and SEO movement where access exists.",
  },
  {
    q: 'Why does the price go up at each stage?',
    a: "Because the work expands and the data becomes more useful. Foundation creates the base once. Growth adds ongoing content, posting, tracking, and review work. Scale adds multi-service and multi-city expansion, attribution, and strategy. You move up the roadmap when you're ready — not on a clock.",
  },
  {
    q: 'Can I move between stages?',
    a: 'Anytime. Start with Foundation, continue into Growth, scale when the data says it’s time — or pause. Recurring stages are month-to-month. We pro-rate the difference when you move up. No friction, no penalty.',
  },
  {
    q: 'What about social, video, email, or AI visibility?',
    a: "Those are optional add-ons so the core roadmap stays clean: Social Posting ($200–$500/mo), Video/Shorts (from $200/mo), Email/SMS Follow-Up ($99–$300/mo), one-time SEO Sprints ($197–$497), and a premium AI Visibility add-on for tracking ChatGPT, Perplexity, Gemini, and Google AI. Bolt any onto any stage.",
  },
  {
    q: "What's NOT included?",
    a: "Paid ads (Google LSA, Meta, paid social) — LOLA OS is organic + AI search. Full custom website rebuilds beyond the foundation — we'll scope those separately. CRM and phone systems — we help you capture more leads; you close them.",
  },
  {
    q: 'How does the 30-Day Half-Back Guarantee work?',
    a: "If Lola doesn't move your ranking in the first 30 days, Coach Ty refunds 50% of that month — automatically, no support ticket required.",
  },
  {
    q: 'Is there a setup fee or contract?',
    a: 'No setup fee. No contract on recurring stages. Foundation is a one-time sprint; Growth and Scale are month-to-month, cancel anytime.',
  },
  {
    q: 'How fast is onboarding?',
    a: '48-hour onboarding from the moment your Foundation Sprint clears. Week 1: audit + GBP setup. Week 2: citation cleanup + on-page fixes. Week 3–4: content + reviews begin. You watch the work feed live on your Growth Score dashboard.',
  },
  {
    q: 'Do you work outside Florida?',
    a: "Yes. Tampa Bay is home and our proof story (Sandbar Soft Wash) lives there, but the roadmap works in any market with Google Maps and AI search. Clients are in multiple states.",
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

// Illustrative Growth Score snapshot (presentational — not live client data).
const GROWTH_SCORE_DEMO: Record<string, number> = {
  Foundation: 100,
  Growth: 55,
  Authority: 20,
  'AI Visibility': 15,
  Reputation: 60,
  'Revenue Tracking': 40,
};

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
  // "lola os pricing" with stage-specific facts. Cleaned up on unmount.
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

  const hrefFor = (stage: RoadmapStage) =>
    withUtm(CALENDAR_URL, stage.id, stage.id);

  return (
    <main className="flex flex-1 flex-col">
      {/* ── 1. POSITIONING BLOCK ──────────────────────────────────────── */}
      <section className="pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The Growth Roadmap
        </p>
        <h1
          className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
        >
          You&apos;re not buying SEO. You&apos;re{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            completing a roadmap
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-[700px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
          Most local businesses don&apos;t have a marketing problem first — they have a
          foundation problem. LOLA OS is a phased growth operating system: build the
          base, build momentum, then scale. You advance by maturity, not by the calendar.
        </p>
        <p className="mx-auto mt-3 max-w-[680px] text-[13px] italic leading-[1.55] text-[#9CA3AF] sm:text-[14px]">
          Month 1 creates the base. Days 31–90 build signals. After 90 days, the data compounds.
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

      {/* ── 1b. ROADMAP STEPPER ───────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mx-auto flex max-w-[760px] items-stretch gap-2 sm:gap-3">
          {ROADMAP.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className="flex-1 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-3 text-center sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
                  {s.phase}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-white sm:text-[15px]">{s.name}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                  {s.price}
                  <span className="text-[10px]"> {s.period}</span>
                </p>
              </div>
              {i < ROADMAP.length - 1 && (
                <span aria-hidden className="shrink-0 text-[#D4AF37]/60">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. ROADMAP STAGE GRID ─────────────────────────────────────── */}
      <section className="mt-12 sm:mt-16">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-5">
          {ROADMAP.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              ctaHref={hrefFor(stage)}
              onCtaClick={() => track(`${stage.id}_cta_clicked`)}
            />
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-[680px] text-center text-[12px] leading-[1.55] text-[#8A8F98]">
          Not sure where you are? Book the free roadmap call and Coach Ty will tell you
          straight — even if the honest answer is &quot;just start with Foundation.&quot;
          Move up a stage whenever the data says you&apos;re ready.
        </p>
      </section>

      {/* ── 2b. ADD-ONS ───────────────────────────────────────────────── */}
      <section className="mt-14 sm:mt-16">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Add-ons — bolt onto any stage
        </p>
        <div className="mx-auto mt-6 grid max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADD_ONS.map((a) => (
            <div
              key={a.name}
              className="flex flex-col rounded-[14px] border border-white/[0.10] bg-white/[0.02] p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  {a.emoji} {a.name}
                </p>
              </div>
              <p className="mt-2 text-[16px] font-extrabold text-white">{a.price}</p>
              <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-[#C5C5C8]">{a.blurb}</p>
              {a.note && <p className="mt-3 text-[12px] text-[#8A8F98]">{a.note}</p>}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-[680px] text-center text-[12px] text-[#8A8F98]">
          Add any of these when you book — or anytime after. No contracts on add-ons.
        </p>
      </section>

      {/* ── 3. GUARANTEES ─────────────────────────────────────────────── */}
      <section ref={promiseRef} className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-[680px] text-center text-[14px] italic leading-[1.6] text-[#C5C5C8]">
          SEO tools guarantee nothing. Premium agencies say &quot;results not
          guaranteed.&quot; We put it in writing — twice.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
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
        ✓ Foundation included · ✓ No setup fee · ✓ Cancel anytime on recurring stages · ✓ Month-to-month · ✓ Real work or you walk
      </div>

      {/* ── 5. GROWTH SCORE ───────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Your dashboard
        </p>
        <h2
          className="mx-auto mt-3 max-w-[720px] text-center font-bold leading-[1.15] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          You never have to ask &quot;what are you doing this month?&quot;
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-center text-[14px] leading-[1.6] text-[#C5C5C8]">
          The dashboard is a <span className="text-white">Growth Score</span>. Log in and see
          exactly where you are — and what&apos;s next. Pricing isn&apos;t &quot;$497/month,&quot;
          it&apos;s &quot;we&apos;re getting you from 42 to 70.&quot;
        </p>

        <div className="mx-auto mt-8 max-w-[560px] rounded-2xl border border-[#D4AF37]/30 bg-[#0A0A0B] p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#8A8F98]">
              Overall Growth Score
            </p>
            <p className="text-[28px] font-extrabold text-[#D4AF37]">48<span className="text-[14px] text-[#8A8F98]">/100</span></p>
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {GROWTH_SCORE_DIMENSIONS.map((dim) => {
              const v = GROWTH_SCORE_DEMO[dim] ?? 0;
              return (
                <div key={dim}>
                  <div className="flex items-center justify-between text-[12px] text-[#C5C5C8]">
                    <span>{dim}</span>
                    <span className="text-[#8A8F98]">{v}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4D47C]"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-[11px] text-[#5A5F68]">
            Illustrative. Live metrics appear as integrations are connected — calls, forms,
            clicks, Google Business activity, and SEO movement where access exists.
          </p>
        </div>
      </section>

      {/* ── 6. 3-COLUMN COMPARISON TABLE ──────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <h2
          className="text-center font-bold leading-[1.15] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Why LOLA OS beats SEO tools <span className="text-[#D4AF37]">AND</span> premium agencies
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
                  LOLA OS
                  <span className="block text-[10px] font-normal text-[#D4AF37]">$297 → $997/mo</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {[
                ['❌ You DIY', '✓ Done for you', '✓ Done for you'],
                ['❌ A tool, not a plan', '⚠️ A retainer, not a roadmap', '✓ A phased growth roadmap'],
                ['❌ Hidden total cost', '❌ Hidden pricing', '✓ Transparent, staged pricing'],
                ['⚠️ Month-to-month (you handle it)', '❌ 12-month contracts', '✓ Month-to-month, cancel anytime'],
                ['❌ No guarantee', '❌ "Results not guaranteed"', '✓ 30-Day Half-Back + First Win'],
                ['❌ Pile of charts', '❌ PDF reports', '✓ A single Growth Score'],
                ['❌ Generic audience', '❌ "Serve everyone"', '✓ Local service business specialist'],
                ['⚠️ Steep learning curve', '⚠️ Long sales call', '✓ Free roadmap call, real answers'],
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
          We&apos;re not against tools or agencies. We just believe local service businesses
          deserve a clear roadmap, done-for-you execution, transparent pricing, and a
          guarantee — without the learning curve of tools or the price tag of premium agencies.
        </p>
      </section>

      {/* ── 7. TESTIMONIAL ────────────────────────────────────────────── */}
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
          — Lola OS Case Study, Palm Harbor FL
        </figcaption>
      </figure>

      {/* ── 8. FAQ ────────────────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Roadmap FAQ
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
          Book a free 15-minute roadmap call.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          We&apos;ll look at your business live, tell you where you are on the roadmap, and pick
          the right next stage together. No pitch deck — Coach Ty answers his own phone.
        </p>
        <a
          href={withUtm(CALENDAR_URL, 'final_cta', 'pricing_final')}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('pricing_final_cta_clicked')}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
        >
          Book a free roadmap call →
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

function StageCard({
  stage,
  ctaHref,
  onCtaClick,
}: {
  stage: RoadmapStage;
  ctaHref: string;
  onCtaClick: () => void;
}) {
  const isFeatured = !!stage.featured;
  const cardClass = isFeatured
    ? 'relative flex h-full flex-col rounded-[14px] border-[1.5px] border-[#D4AF37] bg-gradient-to-br from-[#0F0F12] via-[#0F0F12] to-[#1A1408] p-6 shadow-[inset_0_0_40px_rgba(212,175,55,0.06),0_0_36px_rgba(212,175,55,0.18)] transition-all duration-300 hover:shadow-[inset_0_0_50px_rgba(212,175,55,0.10),0_0_56px_rgba(212,175,55,0.32)] sm:p-7 lg:scale-[1.03]'
    : 'relative flex h-full flex-col rounded-[14px] border border-white/[0.10] bg-[#0F0F12]/85 p-6 transition-all duration-300 hover:border-white/[0.18] hover:-translate-y-1 sm:p-7';

  return (
    <div className={cardClass}>
      {stage.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.35)]">
          {stage.badge}
        </span>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
        {stage.phase}
      </p>
      <h3 className="mt-3 text-[22px] font-bold tracking-[-0.01em] text-white sm:text-[26px]">
        {stage.name}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[46px]">
          {stage.price}
        </span>
        <span className="text-[13px] font-normal text-[#A0A5AE] sm:text-[14px]">{stage.period}</span>
      </div>
      {stage.priceNote && (
        <p className="mt-1.5 text-[12px] font-medium text-[#A0A5AE]">{stage.priceNote}</p>
      )}

      <p className="mt-4 text-[14px] leading-[1.55] text-white sm:text-[15px]">
        {stage.positioning}
      </p>

      <ul className="mt-5 flex w-full min-w-0 flex-col gap-2.5">
        {stage.includes.map((feature, i) => (
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
          {stage.cta} →
        </a>
        <p className="mt-3 text-center text-[10px] leading-[1.4] text-[#7A7F8A] sm:text-[11px]">
          Free 15-min roadmap call · {stage.period === 'one-time' ? 'One-time · 48hr onboarding' : 'Cancel anytime · 48hr onboarding'}
        </p>
      </div>
    </div>
  );
}
