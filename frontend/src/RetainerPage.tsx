/// <reference types="vite/client" />
/**
 * Lola SEO — /retainer close page (the done-for-you Growth Roadmap).
 *
 * Single-CTA scrollable funnel optimized for hot leads from cold outreach
 * and audit completers ready to buy. Andrea Palacio-style — value stack,
 * ROI math, founding-member urgency, dual guarantee, FAQ, founder story.
 *
 * Repositioned onto the phased roadmap model (Foundation → Growth → Scale).
 * Growth Roadmap ($497/mo, default $597 regular) is the recurring done-for-you
 * default this page sells; Scale System ($697/mo, $997+ competitive) is the
 * next stage. Foundation Sprint ($297 one-time) is the start line. Prices come
 * from ./lib/pricing (canonical mirror of docs/PRICING.md).
 *
 * Sticky mobile CTA bar at bottom. Desktop hides the sticky bar.
 *
 * Sections:
 *   1. Hero — single primary CTA
 *   2. The roadmap (Foundation → Growth → Scale)
 *   3. Value stack (agency-cost anchor → done-for-you Growth price)
 *   4. ROI math (Time / Leads / Compound)
 *   5. Founding-member urgency (live count from /pricing endpoint)
 *   6. Dual guarantee stack
 *   7. What's included (what each roadmap stage delivers)
 *   8. Who this is for
 *   9. FAQ accordion (7 questions)
 *  10. Founder story (Coach Ty)
 *  11. Final CTA + trust row
 */

import { useEffect, useState } from 'react';
import { API_URL } from './api';
import { track } from './analytics';
import { ROADMAP } from './lib/pricing';
import { useSeo } from './lib/seo';

// Roadmap stage prices, pulled from the canonical pricing source.
const FOUNDATION = ROADMAP.find((s) => s.id === 'foundation')!;
const GROWTH = ROADMAP.find((s) => s.id === 'growth')!;
const SCALE = ROADMAP.find((s) => s.id === 'scale')!;

// Founding rate = the current Growth price ($497). Regular rate is the price
// the first 10 founders lock against ($597). Both are display strings.
const GROWTH_FOUNDING = GROWTH.price; // "$497"
const GROWTH_REGULAR = '$597';

// Call-first rebuild: every retainer CTA now books a free strategy call
// instead of Stripe self-serve checkout. Name kept for the env-var contract;
// VITE_STRATEGY_CALL_URL / VITE_CALENDAR_URL override the default.
const BOOKING_URL =
  (import.meta.env.VITE_STRATEGY_CALL_URL as string | undefined) ||
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

function withUtm(url: string, content: string) {
  const p = new URLSearchParams({
    utm_source: 'lola_retainer',
    utm_medium: 'close_page',
    utm_campaign: 'retainer',
    utm_content: content,
  });
  return `${url}${url.includes('?') ? '&' : '?'}${p.toString()}`;
}

export default function RetainerPage() {
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null);
  const [foundingCap, setFoundingCap] = useState<number>(10);

  useSeo({
    title: 'Done-For-You Local SEO & AI Visibility | The Lola Growth Roadmap',
    description:
      'The done-for-you growth roadmap for local service businesses — Foundation, Growth, and Scale. Google + AI search visibility, a live dashboard, 30-day half-back guarantee.',
  });

  // Pull founding-member count from backend; fall back gracefully if unreachable.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/pricing`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.founding_slots_remaining === 'number') setSlotsRemaining(data.founding_slots_remaining);
        if (typeof data.founding_cap === 'number') setFoundingCap(data.founding_cap);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    track('retainer_page_viewed');
  }, []);

  const retainerHref = withUtm(BOOKING_URL, 'sticky_cta');
  const heroHref = withUtm(BOOKING_URL, 'hero_cta');
  const finalHref = withUtm(BOOKING_URL, 'final_cta');

  return (
    <>
      <main className="flex flex-1 flex-col pb-24 sm:pb-12">
        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <section className="relative pt-2 text-center sm:pt-6">
          {/* Ambient aurora — shared premium glow across all page heroes. */}
          <div
            aria-hidden
            className="animate-aurora pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[600px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
            style={{
              background:
                'radial-gradient(38% 50% at 22% 12%, rgba(111,155,255,0.12), transparent 70%), radial-gradient(46% 56% at 82% 6%, rgba(212,175,55,0.20), transparent 70%), radial-gradient(42% 46% at 56% 36%, rgba(165,96,231,0.10), transparent 70%)',
            }}
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The Growth Roadmap
          </p>
          <h1
            className="mx-auto mt-4 max-w-[820px] font-bold leading-[1.05] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
          >
            Stop reading SEO audits.{' '}
            <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
              Start ranking.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
            This isn't a random SEO package — it's a phased growth roadmap. Coach Ty and Lola
            build your foundation, then advance you through Growth and Scale. Agency-grade
            execution, done for you.{' '}
            <span className="font-semibold text-white">
              Growth Roadmap from {GROWTH_FOUNDING}/mo. Cancel anytime.
            </span>
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={heroHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('retainer_cta_clicked', { from: 'hero' })}
              className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 py-3 text-center text-[14px] font-bold uppercase leading-tight tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:w-auto sm:text-[15px]"
            >
              🦴 Start the Growth Roadmap — {GROWTH_FOUNDING}/mo →
            </a>
            {/* Desktop: full button. Mobile: small text link (sticky bar
                already provides primary CTA; this avoids occlusion). */}
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'hero' })}
              className="hidden sm:inline-flex h-16 items-center justify-center rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[15px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition-all hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06]"
            >
              Apply first (we'll review fit)
            </a>
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'hero_mobile' })}
              className="text-[13px] font-semibold text-[#D4AF37] underline-offset-2 hover:underline sm:hidden"
            >
              Or apply first — Coach Ty reviews fit →
            </a>
          </div>
        </section>

        {/* ── 2. THE ROADMAP ──────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The roadmap, not a random package
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Foundation → Growth → Scale.
          </h2>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
            You don't buy random SEO tasks — you enter a phased roadmap and advance through
            stages of maturity. The first 30 days create the base. Days 31–90 build signals.
            After 90 days, the data compounds. You're not paying more for no reason — you're
            paying for maturity as the work expands.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {[FOUNDATION, GROWTH, SCALE].map((stage) => (
              <div
                key={stage.id}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
                  stage.featured
                    ? 'border-[#D4AF37]/60 bg-[#D4AF37]/[0.05] shadow-[0_0_28px_rgba(212,175,55,0.12)]'
                    : 'border-white/[0.08] bg-white/[0.02]'
                }`}
              >
                {stage.badge && (
                  <span className="absolute right-4 top-4 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D4AF37]">
                    {stage.badge}
                  </span>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8A8F98]">
                  {stage.phase}
                </p>
                <p className="mt-2 text-[18px] font-bold text-white sm:text-[20px]">{stage.name}</p>
                <p className="mt-3">
                  <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[30px] font-extrabold leading-none text-transparent sm:text-[34px]">
                    {stage.price}
                  </span>
                  <span className="ml-1 text-[13px] font-semibold text-[#8A8F98]">
                    {stage.period}
                  </span>
                </p>
                {stage.priceNote && (
                  <p className="mt-1.5 text-[12px] leading-[1.5] text-[#8A8F98]">
                    {stage.priceNote}
                  </p>
                )}
                <p className="mt-4 text-[13px] leading-[1.6] text-[#C5C5C8]">{stage.outcome}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-[640px] text-[13px] leading-[1.6] text-[#8A8F98]">
            Most clients start with the <span className="font-semibold text-white">Foundation
            Sprint</span> ({FOUNDATION.price} one-time), then continue into the{' '}
            <span className="font-semibold text-[#D4AF37]">Growth Roadmap</span> — the recurring
            done-for-you default this page is built around.
          </p>
        </section>

        {/* ── 3. VALUE STACK ──────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            What you're actually getting
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Agency-grade execution, done for you — across the whole roadmap.
          </h2>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
            <table className="w-full text-left text-[13px] sm:text-[15px]">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Stage</th>
                  <th className="px-4 py-3 text-right sm:px-6 sm:py-4">What it delivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  [`${FOUNDATION.name} · ${FOUNDATION.price} ${FOUNDATION.period}`, 'A searchable, trackable, presentable base — your start line.'],
                  [`${GROWTH.name} · ${GROWTH.price}${GROWTH.period}`, 'Ongoing SEO, content, Google Business posting, and tracking — momentum on the dashboard.'],
                  [`${SCALE.name} · ${SCALE.price}${SCALE.period}`, 'Multi-service / multi-city strategy, attribution, and the Evidence Engine — a full growth system.'],
                ].map(([stage, delivers]) => (
                  <tr key={stage}>
                    <td className="px-4 py-3 align-top font-semibold text-white sm:px-6 sm:py-4">{stage}</td>
                    <td className="px-4 py-3 text-right text-[#C5C5C8] sm:px-6 sm:py-4">{delivers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border-[1.5px] border-[#D4AF37]/40 bg-[#D4AF37]/[0.04] p-6 text-center sm:p-8">
            <p className="text-[14px] uppercase tracking-[0.22em] text-[#8A8F98]">
              Your Growth Roadmap investment
            </p>
            <p className="mt-3">
              <span className="text-[24px] font-medium text-[#7A7F8A] line-through sm:text-[28px]">
                $2,000–$5,000/mo
              </span>{' '}
              <span className="inline-block bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[44px] font-extrabold leading-none text-transparent sm:text-[56px]">
                {GROWTH_FOUNDING}/mo
              </span>
            </p>
            <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-[1.6] text-[#C5C5C8] sm:text-[14px]">
              Agencies charge $2,000–$5,000/mo for this kind of execution. Lola does it for you on
              the Growth Roadmap — because the AI does the heavy lifting, not a 30-person team you
              don't need. Need multi-location or competitive-market execution? That's the Scale
              System at {SCALE.price}/mo ($997+ competitive).
            </p>
          </div>
        </section>

        {/* ── 4. ROI MATH ─────────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">The math</p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Real revenue math, in plain English.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                eyebrow: 'TIME',
                h: '$7,200/year back',
                body: 'If your time is worth $60/hr and Lola saves 10 hrs/month of SEO work, that\'s $7,200/year back to running the business.',
              },
              {
                eyebrow: 'LEADS',
                h: '$12,000/year new',
                body: 'If Lola helps you close 2 extra jobs/month at $500 each, that\'s $12,000/year in new revenue.',
              },
              {
                eyebrow: 'THE COMPOUND',
                h: 'Maturity compounds',
                body: 'This is a roadmap, not a one-off. The first 30 days build the foundation, days 31–90 build signals, and after 90 days the data compounds — so each month\'s work builds on the last.',
              },
            ].map((c) => (
              <div
                key={c.eyebrow}
                className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-6"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                  {c.eyebrow}
                </p>
                <p className="mt-3 text-[20px] font-bold text-white sm:text-[22px]">{c.h}</p>
                <p className="mt-3 text-[13px] leading-[1.55] text-[#C5C5C8] sm:text-[14px]">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-[640px] text-center text-[15px] font-semibold leading-[1.55] text-white sm:text-[17px]">
            Illustrative upside: <span className="text-[#D4AF37]">$19,000+/year</span>. Growth
            Roadmap investment: <span className="text-[#D4AF37]">$5,964/year</span> ({GROWTH_FOUNDING}/mo).
            These are example scenarios, not guaranteed results.
          </p>
        </section>

        {/* ── 5. FOUNDING-MEMBER URGENCY ──────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#D4AF37]/60 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] p-7 sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_60%)] blur-2xl"
            />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              🦴 Founding Member Pricing
            </p>
            <h2 className="relative mt-3 text-[24px] font-bold tracking-[-0.01em] text-white sm:text-[28px]">
              First 10 Growth clients lock the {GROWTH_FOUNDING}/mo founding rate.
            </h2>
            <p className="relative mt-4 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
              After {foundingCap} founding spots are taken, the regular Growth Roadmap rate moves
              to <span className="font-semibold text-white">{GROWTH_REGULAR}/mo</span>. Founders
              keep {GROWTH_FOUNDING}/mo, even as the regular rate goes up.
            </p>
            {/* Only show numeric counter when we have a real reading. Hiding
                the chip on fetch-fail beats showing "10 of 10" which reads as
                no urgency (or worse: as already sold out). */}
            {slotsRemaining !== null && slotsRemaining > 0 && (
              <p className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] px-4 py-2 text-[13px] font-bold text-[#D4AF37]">
                Spots remaining: {slotsRemaining} of {foundingCap}
              </p>
            )}
          </div>
        </section>

        {/* ── 6. GUARANTEE STACK ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Our promise to you
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Two guarantees. Both in writing.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {[
              {
                emoji: '🛡️',
                title: '30-Day Half-Back Guarantee',
                body: 'If Lola doesn\'t move your ranking in your first 30 days, your next month is half off — Coach Ty refunds 50%. Same way he\'d want to be treated.',
              },
              {
                emoji: '📊',
                title: 'First Win Promise',
                body: 'At least one measurable win — a new ranking, a new lead, or a Google Business improvement — in your first 60 days, or your next month is on us.',
              },
            ].map((g) => (
              <div
                key={g.title}
                className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0A0B] p-7 shadow-[0_0_28px_rgba(212,175,55,0.10)] sm:p-9"
              >
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                  <span aria-hidden className="text-[18px]">{g.emoji}</span>
                  {g.title}
                </p>
                <p className="mt-4 text-[15px] leading-[1.6] text-white sm:text-[16px]">{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. WHAT'S INCLUDED ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            What's included, done for you
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            What each stage delivers.
          </h2>

          <ul className="mt-8 flex flex-col gap-3">
            {[FOUNDATION, GROWTH, SCALE].map((stage) => (
              <li
                key={stage.id}
                className="flex items-start gap-4 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
              >
                <span aria-hidden className="mt-0.5 text-[20px] text-[#D4AF37]">→</span>
                <div>
                  <p className="text-[15px] font-bold text-white sm:text-[16px]">
                    {stage.name}{' '}
                    <span className="text-[#D4AF37]">
                      · {stage.price}
                      {stage.period.startsWith('/') ? stage.period : ` ${stage.period}`}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#C5C5C8] sm:text-[14px]">
                    {stage.outcome}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 8. WHO THIS IS FOR ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The fit check
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            This is for you if…
          </h2>

          <ul className="mt-8 flex flex-col gap-3 text-[15px] leading-[1.55] text-white sm:text-[16px]">
            {[
              'Florida local service business doing $200K–$2M/year',
              'Tired of being invisible while competitors rank #1',
              'Want SEO done FOR you — not another tool to manage',
              'Want measurable wins in 30 days, not 12 months',
              'Believe in real work over agency BS',
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-[12px] border border-[#D4AF37]/15 bg-white/[0.02] px-5 py-3"
              >
                <span aria-hidden className="mt-0.5 text-[18px] text-[#D4AF37]">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 9. FAQ ──────────────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Common questions
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            The honest answers.
          </h2>

          <div className="mt-8 flex flex-col gap-3">
            {[
              {
                q: "What's the difference between Lola and SEMrush/BrightLocal?",
                a: 'Other tools tell you what\'s broken. Lola fixes it weekly. You don\'t manage Lola. Lola manages your SEO.',
              },
              {
                q: "What does 'done-for-you' actually mean?",
                a: 'Coach Ty and Lola execute the work for you — fixes in your GMB, on your site, and in your citations, advancing through the roadmap stages. You don\'t touch a dashboard unless you want to.',
              },
              {
                q: "What if I'm already working with an SEO agency?",
                a: `Fire them. Most agencies charge $2K–$5K/mo and deliver less than Lola does on the Growth Roadmap from ${GROWTH_FOUNDING}/mo. Or run us in parallel for 60 days and compare.`,
              },
              {
                q: 'How does the roadmap work — and how fast do things move?',
                a: 'You start with the Foundation Sprint, then continue into the Growth Roadmap. The 30-Day Half-Back and First Win Promise back the early stages. The first 30 days build the foundation, days 31–90 build signals, and after 90 days the data compounds — this is a roadmap, not an overnight switch.',
              },
              {
                q: "What if I'm not in Florida — or not a contractor?",
                a: 'Lola works for any local service business — home services, cleaning, salons, med spas, auto detailing, lawn care, the whole map. We\'re Tampa-based because that\'s our home network, but the system works anywhere with Google Maps + AI search.',
              },
              {
                q: "What's the cancellation policy?",
                a: 'Cancel anytime. No contracts. No minimum commitment. If we\'re not earning back your investment, you don\'t owe us another dollar.',
              },
              {
                q: `Why ${GROWTH_FOUNDING}/mo when agencies charge $2K+?`,
                a: 'Lola\'s AI does the work that would require a 5-person agency team. Coach Ty oversees strategy. You pay for the work, not bloat. Multi-location or competitive markets move up to the Scale System.',
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
                onToggle={(e) => {
                  if ((e.currentTarget as HTMLDetailsElement).open) {
                    track('retainer_faq_opened', { question: item.q.slice(0, 40) });
                  }
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-[18px] text-[#D4AF37] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-[1.65] text-[#C5C5C8] sm:px-6 sm:pb-6 sm:text-[15px]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 10. FOUNDER STORY ───────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Why Lola exists
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-10">
            <div className="mx-auto h-[160px] w-[160px] overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] sm:mx-0">
              <div className="flex h-full w-full items-center justify-center text-[44px]">🐾</div>
            </div>

            <div className="space-y-4 text-[15px] leading-[1.65] text-[#C5C5C8] sm:text-[16px]">
              <p>
                I built Lola because I watched too many local service businesses lose jobs
                to competitors with worse work but better Google presence.
              </p>
              <p>
                I'm Coach Ty. I run Ty Alexander Media in Tampa. I train for HYROX when I'm
                not building Lola. My fiancée Valeria keeps me grounded. My faith keeps me
                focused.
              </p>
              <p>
                Lola isn't a SaaS tool I'm trying to scale to a $100M exit. She's a real
                system I built for local owners I actually know.{' '}
                <span className="font-semibold text-white">Starting with my dad.</span>
              </p>
              <p className="text-white">
                <span className="font-bold text-[#D4AF37]">
                  You answer your own phones. So do I. Let's work.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 11. FINAL CTA ───────────────────────────────────────────── */}
        <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Last step
          </p>
          <h2
            className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
          >
            Done thinking. Time to rank.
          </h2>

          <a
            href={finalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('retainer_cta_clicked', { from: 'final' })}
            className="mt-7 inline-flex min-h-[56px] w-full max-w-[420px] items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-8 py-3 text-center text-[14px] font-bold uppercase leading-tight tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:w-auto sm:max-w-none sm:text-[16px]"
          >
            🦴 Start the Growth Roadmap — {GROWTH_FOUNDING}/mo →
          </a>

          <p className="mt-4 text-[13px] text-[#D4AF37]/85">
            <a
              href="/apply"
              onClick={() => track('retainer_apply_clicked', { from: 'final' })}
              className="font-semibold underline-offset-2 hover:underline"
            >
              Or apply first — Coach Ty reviews every application →
            </a>
          </p>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#8A8F98] sm:text-[12px]">
            <span>🔒 No payment to book</span>
            <span aria-hidden>·</span>
            <span>Cancel anytime</span>
            <span aria-hidden>·</span>
            <span>30-Day Half-Back</span>
            <span aria-hidden>·</span>
            <span>First Win Promise</span>
          </p>
        </section>

        {/* footer */}
        <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68]">
          <p>Ty Alexander Media · Tampa Bay</p>
          <p className="mt-1">© 2026 · Built with Lola 🐾</p>
        </div>
      </main>

      {/* Sticky bottom CTA bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/30 bg-[#0A0A0B]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] backdrop-blur-[12px] sm:hidden">
        <a
          href={retainerHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('retainer_cta_clicked', { from: 'sticky_mobile' })}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-4 text-center text-[13px] font-bold uppercase leading-tight tracking-[0.04em] text-[#0A0A0B] shadow-[0_4px_16px_rgba(212,175,55,0.4)]"
        >
          🦴 Start the Growth Roadmap — {GROWTH_FOUNDING}/mo →
        </a>
      </div>
    </>
  );
}
