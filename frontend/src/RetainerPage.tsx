/// <reference types="vite/client" />
/**
 * Lola SEO — /retainer close page.
 *
 * Single-CTA scrollable funnel optimized for hot leads from cold outreach
 * and audit completers ready to buy. Andrea Palacio-style — value stack,
 * ROI math, founding-member urgency, dual guarantee, FAQ, founder story.
 *
 * Sticky mobile CTA bar at bottom. Desktop hides the sticky bar.
 *
 * Sections:
 *   1. Hero — single primary CTA
 *   2. Value stack (6 agents → $6,000/mo value → $697 price)
 *   3. ROI math (Time / Leads / Compound)
 *   4. Founding-member urgency (live count from /pricing endpoint)
 *   5. Dual guarantee stack
 *   6. What's included (agent breakdown)
 *   7. Who this is for
 *   8. FAQ accordion (7 questions)
 *   9. Founder story (Coach Ty)
 *  10. Final CTA + trust row
 */

import { useEffect, useState } from 'react';
import { API_URL } from './AuditFlow';
import { track } from './analytics';

// Call-first rebuild: every retainer CTA now books a free strategy call
// instead of Stripe self-serve checkout. Name kept for the env-var contract;
// VITE_STRATEGY_CALL_URL / VITE_CALENDAR_URL override the default.
const STRIPE_RETAINER_URL =
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

  const retainerHref = withUtm(STRIPE_RETAINER_URL, 'sticky_cta');
  const heroHref = withUtm(STRIPE_RETAINER_URL, 'hero_cta');
  const finalHref = withUtm(STRIPE_RETAINER_URL, 'final_cta');

  return (
    <>
      <main className="flex flex-1 flex-col pb-24 sm:pb-12">
        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <section className="relative pt-2 text-center sm:pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_60%)] blur-2xl"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The Lola Retainer
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
            The Lola Retainer puts six specialist AI agents + Coach Ty on your account weekly.
            Done-for-you. <span className="font-semibold text-white">$697/mo. Cancel anytime.</span>
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={heroHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('retainer_cta_clicked', { from: 'hero' })}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:text-[15px]"
            >
              🦴 Activate the Retainer — $697/mo →
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

        {/* ── 2. VALUE STACK ──────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            What you're actually getting
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Six AI agents. One Coach Ty. $6,000/mo of value.
          </h2>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
            <table className="w-full text-left text-[13px] sm:text-[15px]">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-[#8A8F98]">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Agent</th>
                  <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Equivalent value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ['Technical Agent', '$1,500/mo'],
                  ['Content Agent', '$1,200/mo'],
                  ['Authority Agent', '$800/mo'],
                  ['Local Agent', '$600/mo'],
                  ['AI Visibility Agent', '$400/mo'],
                  ['Strategy Agent (Ty)', '$1,500/mo'],
                ].map(([agent, value]) => (
                  <tr key={agent}>
                    <td className="px-4 py-3 text-white sm:px-6 sm:py-4">{agent}</td>
                    <td className="px-4 py-3 text-right text-[#D4AF37] sm:px-6 sm:py-4">{value}</td>
                  </tr>
                ))}
                <tr className="bg-[#D4AF37]/[0.06] font-bold">
                  <td className="px-4 py-4 text-white sm:px-6">Total value</td>
                  <td className="px-4 py-4 text-right text-[#D4AF37] sm:px-6">$6,000/mo</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border-[1.5px] border-[#D4AF37]/40 bg-[#D4AF37]/[0.04] p-6 text-center sm:p-8">
            <p className="text-[14px] uppercase tracking-[0.22em] text-[#8A8F98]">Your investment</p>
            <p className="mt-3">
              <span className="text-[24px] font-medium text-[#7A7F8A] line-through sm:text-[28px]">
                $6,000/mo
              </span>{' '}
              <span className="inline-block bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[44px] font-extrabold leading-none text-transparent sm:text-[56px]">
                $697/mo
              </span>
            </p>
            <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-[1.6] text-[#C5C5C8] sm:text-[14px]">
              88% off agency pricing — because Lola does the heavy lifting, not a 30-person team
              you don't need.
            </p>
          </div>
        </section>

        {/* ── 3. ROI MATH ─────────────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">The math</p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Real revenue math, in plain English.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                eyebrow: 'TIME',
                h: '$6,000/year back',
                body: 'If your time is worth $50/hr and Lola saves 10 hrs/month of SEO work, that\'s $6,000/year back to running the business.',
              },
              {
                eyebrow: 'LEADS',
                h: '$12,000/year new',
                body: 'If Lola helps you close 2 extra jobs/month at $500 each, that\'s $12,000/year in new revenue.',
              },
              {
                eyebrow: 'THE COMPOUND',
                h: 'Top 3 by month 6',
                body: 'Rankings stack month over month. By month 6 you\'re capturing 73% of local clicks. By month 12 competitors can\'t catch up.',
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
            Total upside: <span className="text-[#D4AF37]">$18,000+/year</span>. Investment:{' '}
            <span className="text-[#D4AF37]">$8,364/year</span>. ROI:{' '}
            <span className="text-[#D4AF37]">215%</span>.
          </p>
        </section>

        {/* ── 4. FOUNDING-MEMBER URGENCY ──────────────────────────────── */}
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
              First 10 retainer clients get $697/mo — locked for life.
            </h2>
            <p className="relative mt-4 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
              After {foundingCap} founding spots are taken, the public rate moves to{' '}
              <span className="font-semibold text-white">$897/mo</span>. Founders keep $697/mo
              forever, even when public pricing goes up.
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

        {/* ── 5. GUARANTEE STACK ──────────────────────────────────────── */}
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
                title: '14-Day No-Questions Guarantee',
                body: 'Activate the Retainer. If it\'s not the right fit in 14 days, full refund. No questions, no friction.',
              },
              {
                emoji: '🛡️',
                title: 'First Win Promise',
                body: 'At least one measurable keyword ranking improvement OR new GMB visibility gain in your first 30 days. If we don\'t deliver, 50% refund automatically.',
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

        {/* ── 6. WHAT'S INCLUDED ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Your dedicated SEO agent team
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            Six agents. One mission.
          </h2>

          <ul className="mt-8 flex flex-col gap-3">
            {[
              { name: 'Technical Agent', desc: 'Weekly site fixes (speed, schema, indexing).' },
              { name: 'Content Agent', desc: 'Monthly blog + service page optimization.' },
              { name: 'Authority Agent', desc: 'Citations, directory submissions, link building.' },
              { name: 'Local Agent', desc: 'GMB management, weekly posts, review strategy.' },
              { name: 'AI Visibility Agent', desc: 'Monitors ChatGPT, Perplexity, Google AI Overviews.' },
              { name: 'Strategy Agent (Coach Ty)', desc: 'On-demand via priority Slack + text.' },
            ].map((a) => (
              <li
                key={a.name}
                className="flex items-start gap-4 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
              >
                <span aria-hidden className="mt-0.5 text-[20px] text-[#D4AF37]">→</span>
                <div>
                  <p className="text-[15px] font-bold text-white sm:text-[16px]">{a.name}</p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#C5C5C8] sm:text-[14px]">
                    {a.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 7. WHO THIS IS FOR ──────────────────────────────────────── */}
        <section className="mt-16 sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            The fit check
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[32px]">
            This is for you if…
          </h2>

          <ul className="mt-8 flex flex-col gap-3 text-[15px] leading-[1.55] text-white sm:text-[16px]">
            {[
              'Florida contractor doing $200K–$2M/year',
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

        {/* ── 8. FAQ ──────────────────────────────────────────────────── */}
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
                a: 'Six specialist AI agents + Coach Ty execute weekly fixes in your GMB, on your site, and in your citations. You don\'t touch a dashboard unless you want to.',
              },
              {
                q: "What if I'm already working with an SEO agency?",
                a: 'Fire them. Most agencies charge $2K–$5K/mo and deliver less than Lola does at $697. Or run us in parallel for 60 days and compare.',
              },
              {
                q: 'How fast will I see results?',
                a: 'First Win Promise: measurable ranking improvement in 30 days. Full ROI typically hits month 3. By month 6 you\'re in the top 3.',
              },
              {
                q: "What if I'm not a Florida contractor?",
                a: 'Lola works for any local service business. We\'re Florida-focused because that\'s our network — but the system works anywhere with Google Maps.',
              },
              {
                q: "What's the cancellation policy?",
                a: 'Cancel anytime. No contracts. No minimum commitment. If we\'re not earning back your investment, you don\'t owe us another dollar.',
              },
              {
                q: 'Why $697/mo when agencies charge $2K+?',
                a: 'Lola\'s AI does the work that would require a 5-person agency team. Coach Ty oversees strategy. You pay for results, not bloat.',
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

        {/* ── 9. FOUNDER STORY ────────────────────────────────────────── */}
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
                I built Lola because I watched too many Florida contractors lose jobs to
                competitors with worse work but better Google presence.
              </p>
              <p>
                I'm Coach Ty. I run Ty Alexander Media in Tampa. I train for HYROX when I'm
                not building Lola. My fiancée Valeria keeps me grounded. My faith keeps me
                focused.
              </p>
              <p>
                Lola isn't a SaaS tool I'm trying to scale to a $100M exit. She's a real
                system I built for contractors I actually know.{' '}
                <span className="font-semibold text-white">Including my dad.</span>
              </p>
              <p className="text-white">
                <span className="font-bold text-[#D4AF37]">
                  You answer your own phones. So do I. Let's work.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── 10. FINAL CTA ───────────────────────────────────────────── */}
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
            className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-8 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:text-[16px]"
          >
            🦴 Activate the Retainer — $697/mo →
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
            <span>🔒 Stripe secure</span>
            <span aria-hidden>·</span>
            <span>Cancel anytime</span>
            <span aria-hidden>·</span>
            <span>14-day guarantee</span>
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
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-4 text-[13px] font-bold uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[0_4px_16px_rgba(212,175,55,0.4)]"
        >
          🦴 Activate the Retainer — $697/mo →
        </a>
      </div>
    </>
  );
}
