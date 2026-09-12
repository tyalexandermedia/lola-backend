/**
 * Coach Ty Leads — standalone /pricing page.
 *
 * Source of truth: docs/PRICING.md → frontend/src/lib/pricing.ts.
 *
 * The model (2026-09-12): a FREE Growth Score diagnostic is the primary
 * conversion, then TWO genuinely different paid plans and a custom Expansion
 * route:
 *   • Free Growth Score — $0 (diagnostic, primary CTA)
 *   • Local Visibility — $397/mo + $397 activation (already have a website)
 *   • Local Growth System — $797/mo + $997 launch — RECOMMENDED (website built in)
 *   • Expansion — custom, from $1,497/mo (multi-location / multi-territory)
 *
 * This replaced the single $397 all-inclusive page. The two plans now solve
 * genuinely different problems (already-have-a-site vs. need-one-built), so a
 * deliberately-small two-plan comparison is the honest layout — not a single
 * button, and not a SaaS-style five-column grid.
 *
 * Page chrome (minimal nav + global footer + mobile sticky CTA) is provided by
 * App.tsx, so this component renders the pricing body only.
 *
 * Structured data (Organization / Service with both plan offers / FAQPage from
 * PRICING_QA) is emitted into the static HTML by scripts/prerender.mjs from
 * lib/pageMeta.ts — there is deliberately NO route-injected schema here, so the
 * page can't ship a duplicate or a no-@id Service node. The FAQ questions below
 * are rendered verbatim from the same PRICING_QA the schema uses, which is what
 * keeps scripts/check-seo.mjs (FAQPage-visibility gate) green.
 *
 * CTAs: the free Growth Score everywhere as the primary path; both paid plans
 * and Expansion route to /apply (with a ?plan= hint) so territory availability
 * and launch scope are confirmed before any charge — never straight to Stripe.
 */

import { useState } from 'react';

import { startSmsHref } from './lib/checkout';
import { FOUNDER } from './lib/lola';
import { PRICING_QA } from './lib/pageMeta';
import {
  AFTER_YOU_START,
  BREAK_EVEN,
  COMMITMENT,
  DELIVERABLES,
  EXPANSION,
  FREE_GROWTH_SCORE,
  PLAN_GROWTH,
  PLAN_VISIBILITY,
  TERRITORY,
  type PlanTier,
} from './lib/pricing';
import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

const CHECK = (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden className="mt-[3px] shrink-0">
    <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PricingPage() {
  useReveal();
  usePageMeta('/pricing');

  return (
    <main className="flex flex-1 flex-col">
      <PricingHero />
      <FreeGrowthScore />
      <TwoPlans />
      <DecisionHelper />
      <DeliverablesTable />
      <SandbarProof />
      <BreakEven />
      <Process />
      <Territory />
      <Commitment />
      <Faq />
      <FinalCta />
    </main>
  );
}

/* ── 2 · HERO ──────────────────────────────────────────────────────────── */
function PricingHero() {
  return (
    <section className="pt-2 text-center sm:pt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
        Simple pricing. Work you can verify.
      </p>
      <h1
        className="mx-auto mt-4 max-w-[860px] text-balance font-display font-bold leading-[1.04] tracking-[-0.02em] text-ink"
        style={{ fontSize: 'clamp(2.1rem, 5vw, 3.6rem)' }}
      >
        Local growth pricing built around calls — not marketing clutter.
      </h1>
      <p className="mx-auto mt-5 max-w-[640px] text-[16px] leading-[1.6] text-ink-2 sm:text-[17px]">
        Start with your free Growth Score. When you&rsquo;re ready, choose the level of
        visibility, follow-up and website support your business actually needs.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={FREE_GROWTH_SCORE.href}
          className="group inline-flex min-h-[56px] w-full max-w-[340px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-7 py-3 text-[16px] font-bold text-on-gold shadow-glow transition-all duration-200 hover:bg-right active:scale-[0.99] sm:w-auto"
        >
          {FREE_GROWTH_SCORE.cta}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
        <a
          href="#plans"
          className="inline-flex min-h-[56px] w-full max-w-[340px] items-center justify-center rounded-xl border border-ink/15 px-7 py-3 text-[15px] font-semibold text-ink transition hover:border-gold/60 hover:text-gold sm:w-auto"
        >
          Compare plans
        </a>
      </div>

      <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.22em] text-ink-4">
        Get found. Get called. Get booked.
      </p>
    </section>
  );
}

/* ── 3 · FREE GROWTH SCORE (primary conversion) ────────────────────────── */
function FreeGrowthScore() {
  return (
    <section className="mt-14 sm:mt-20">
      <div className="mx-auto grid max-w-[960px] items-center gap-8 rounded-2xl border border-gold/30 bg-surface p-6 shadow-lift sm:grid-cols-[1.15fr_1fr] sm:p-9">
        <div className="text-left">
          <div className="flex items-baseline gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Start here — free</p>
          </div>
          <h2 className="mt-3 font-display text-[28px] font-bold leading-[1.1] text-ink sm:text-[34px]">
            {FREE_GROWTH_SCORE.name}
            <span className="ml-3 align-middle text-[22px] font-bold text-ink-3">{FREE_GROWTH_SCORE.price}</span>
          </h2>
          <p className="mt-3 max-w-[420px] text-[15px] leading-[1.6] text-ink-2">
            {FREE_GROWTH_SCORE.supporting}
          </p>
          <p className="mt-2 max-w-[420px] text-[13px] leading-[1.55] text-ink-3">
            {FREE_GROWTH_SCORE.clarify}
          </p>
          <a
            href={FREE_GROWTH_SCORE.href}
            className="group mt-6 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-7 py-3 text-[15px] font-bold text-on-gold shadow-glow transition-all duration-200 hover:bg-right active:scale-[0.99]"
          >
            {FREE_GROWTH_SCORE.cta}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>

        <ul className="grid gap-2.5 rounded-xl bg-surface-2 p-5 text-left">
          <li className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">What you get</li>
          {FREE_GROWTH_SCORE.includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-ink-2">
              <span className="text-ok">{CHECK}</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 4 · TWO PLANS ─────────────────────────────────────────────────────── */
function TwoPlans() {
  return (
    <section id="plans" className="mt-16 scroll-mt-20 sm:mt-24">
      <div className="text-center">
        <h2 className="font-display text-[28px] font-bold text-ink sm:text-[36px]">Choose your level</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-[1.6] text-ink-3">
          Two plans that solve two different problems. Both run a 90-day initial term,
          then month-to-month — no long contract.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-[900px] items-start gap-6 md:grid-cols-2">
        <PlanCard plan={PLAN_VISIBILITY} />
        <PlanCard plan={PLAN_GROWTH} />
      </div>

      {/* Expansion — a narrower route below the two cards, NOT an equal card. */}
      <div className="mx-auto mt-6 max-w-[900px] rounded-2xl border border-ink/10 bg-surface-2 p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">{EXPANSION.fromLabel}</p>
            <h3 className="mt-1.5 font-display text-[22px] font-bold text-ink sm:text-[26px]">
              {EXPANSION.name}
              <span className="ml-2 align-middle text-[16px] font-semibold text-ink-3">
                from {EXPANSION.from}{EXPANSION.period}
              </span>
            </h3>
            <p className="mt-2 max-w-[520px] text-[13.5px] leading-[1.55] text-ink-3">
              For {EXPANSION.forWho.slice(0, 4).join(', ').toLowerCase()}, and more. {EXPANSION.note}
            </p>
          </div>
          <a
            href={EXPANSION.ctaHref}
            className="inline-flex min-h-[50px] shrink-0 items-center justify-center rounded-xl border border-gold/40 px-6 py-3 text-[14px] font-bold text-gold transition hover:border-gold/70 hover:bg-gold/[0.08]"
          >
            {EXPANSION.cta} →
          </a>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: PlanTier }) {
  const rec = plan.recommended;
  return (
    <div
      className={
        rec
          ? 'relative rounded-2xl bg-navy p-6 shadow-[0_28px_70px_-28px_rgba(15,25,46,0.55)] ring-1 ring-navy sm:p-8 md:-mt-3'
          : 'relative rounded-2xl border border-ink/12 bg-surface p-6 shadow-lift sm:p-8'
      }
    >
      {rec && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold via-gold-bright to-gold px-4 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-gold shadow-glow">
          Recommended
        </span>
      )}

      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${rec ? 'text-gold-bright' : 'text-gold'}`}>
        {rec ? 'Local Growth System' : 'Local Visibility'}
      </p>

      <p className="mt-4 flex items-baseline gap-1">
        <span className={`font-display text-[44px] font-bold leading-none sm:text-[52px] ${rec ? 'text-on-navy' : 'text-ink'}`}>
          {plan.monthly}
        </span>
        <span className={`text-[16px] font-semibold ${rec ? 'text-on-navy-2' : 'text-ink-3'}`}>{plan.period}</span>
      </p>
      <p className={`mt-2 text-[13px] font-semibold ${rec ? 'text-gold-bright' : 'text-gold'}`}>
        + {plan.oneTime.amount} one-time {plan.oneTime.label}
      </p>
      <p className={`mt-1 text-[12.5px] ${rec ? 'text-on-navy-2' : 'text-ink-3'}`}>{plan.term}</p>

      <p className={`mt-4 text-[13.5px] leading-[1.55] ${rec ? 'text-on-navy' : 'text-ink-2'}`}>
        {plan.idealFor}
      </p>

      <a
        href={plan.ctaHref}
        className={
          rec
            ? 'group mt-6 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-6 py-3 text-[15px] font-bold text-on-gold shadow-glow transition-all duration-200 hover:bg-right active:scale-[0.99]'
            : 'group mt-6 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/[0.06] px-6 py-3 text-[15px] font-bold text-gold transition hover:border-gold/80 hover:bg-gold/[0.12] active:scale-[0.99]'
        }
      >
        {plan.cta}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </a>

      {plan.inheritsLabel && (
        <p className={`mt-6 text-[12.5px] font-bold ${rec ? 'text-on-navy' : 'text-ink'}`}>{plan.inheritsLabel}</p>
      )}
      <ul className={`${plan.inheritsLabel ? 'mt-3' : 'mt-6'} space-y-2.5`}>
        {plan.includes.map((line) => (
          <li key={line} className={`flex items-start gap-2.5 text-[13.5px] leading-[1.45] ${rec ? 'text-on-navy' : 'text-ink-2'}`}>
            <span className={rec ? 'text-gold-bright' : 'text-ok'}>{CHECK}</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-6 border-t pt-4 ${rec ? 'border-on-navy/15' : 'border-ink/10'}`}>
        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${rec ? 'text-on-navy-2' : 'text-ink-4'}`}>
          Not included
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {plan.excludes.map((line) => (
            <li key={line} className={`text-[12px] leading-[1.4] ${rec ? 'text-on-navy-2' : 'text-ink-4'}`}>
              — {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── 5 · DECISION HELPER ───────────────────────────────────────────────── */
function DecisionHelper() {
  const choices = [
    {
      q: 'Already have a website that works?',
      answer: 'Start with Local Visibility',
      detail: 'Keep the site you have. We strengthen your Google presence, reviews and lead response around it.',
      href: PLAN_VISIBILITY.ctaHref,
      cta: PLAN_VISIBILITY.cta,
    },
    {
      q: 'Need a complete website + growth system?',
      answer: 'Go with the Local Growth System',
      detail: 'We build the conversion-focused website and the full foundation, then run visibility and follow-up on top.',
      href: PLAN_GROWTH.ctaHref,
      cta: PLAN_GROWTH.cta,
    },
  ];
  return (
    <section className="mt-16 sm:mt-24">
      <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">Which plan fits?</h2>
      <p className="mx-auto mt-3 max-w-[520px] text-center text-[15px] leading-[1.6] text-ink-3">
        One question decides it. No quiz, no call.
      </p>
      <div className="mx-auto mt-8 grid max-w-[860px] gap-5 sm:grid-cols-2">
        {choices.map((c) => (
          <div key={c.q} className="flex flex-col rounded-2xl border border-ink/12 bg-surface p-6 text-left shadow-lift">
            <p className="text-[17px] font-bold leading-[1.3] text-ink">{c.q}</p>
            <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.06em] text-gold">{c.answer}</p>
            <p className="mt-2 flex-1 text-[13.5px] leading-[1.55] text-ink-2">{c.detail}</p>
            <a
              href={c.href}
              className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gold/40 px-5 py-2.5 text-[14px] font-bold text-gold transition hover:border-gold/70 hover:bg-gold/[0.08]"
            >
              {c.cta} →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 6 · DELIVERABLES TABLE ────────────────────────────────────────────── */
function DeliverablesTable() {
  return (
    <section className="mt-16 sm:mt-24">
      <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">
        Everything in each plan
      </h2>
      <p className="mx-auto mt-3 max-w-[560px] text-center text-[15px] leading-[1.6] text-ink-3">
        The full list, side by side — nothing hidden behind a drop-down.
      </p>

      <div className="mx-auto mt-8 max-w-[820px] overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Deliverables included in Local Visibility and Local Growth System</caption>
          <thead>
            <tr className="border-b border-ink/15">
              <th scope="col" className="py-3 pr-3 text-[13px] font-bold text-ink">Deliverable</th>
              <th scope="col" className="w-[92px] px-2 py-3 text-center text-[12.5px] font-bold text-ink">
                Local<br />Visibility
              </th>
              <th scope="col" className="w-[92px] px-2 py-3 text-center text-[12.5px] font-bold text-gold">
                Local Growth<br />System
              </th>
            </tr>
          </thead>
          <tbody>
            {DELIVERABLES.map((row) => (
              <tr key={row.label} className="border-b border-ink/[0.07]">
                <td className="py-3 pr-3 text-[13.5px] leading-[1.4] text-ink-2">{row.label}</td>
                <td className="px-2 py-3 text-center">
                  <Cell on={row.visibility} />
                </td>
                <td className="bg-gold/[0.05] px-2 py-3 text-center">
                  <Cell on={row.growth} gold />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ on, gold }: { on: boolean; gold?: boolean }) {
  if (!on) return <span aria-label="Not included" className="text-[15px] text-ink-4">—</span>;
  return (
    <span aria-label="Included" className={`inline-flex ${gold ? 'text-gold' : 'text-ok'}`}>
      <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden>
        <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ── 7 · SANDBAR PROOF ─────────────────────────────────────────────────── */
function SandbarProof() {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="mx-auto max-w-[780px] rounded-2xl border border-ink/12 bg-surface p-6 text-left shadow-lift sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Where this was proven</p>
        <h2 className="mt-3 font-display text-[24px] font-bold leading-[1.15] text-ink sm:text-[30px]">
          Sandbar Soft Wash — the original testing ground
        </h2>
        <p className="mt-4 text-[15px] leading-[1.65] text-ink-2">
          Sandbar Soft Wash is Ty&rsquo;s father&rsquo;s business, and the original testing ground for
          the Lola Local Growth System. It&rsquo;s where the plan you&rsquo;re looking at was built and
          run before it was offered to anyone else — which is why the progress is tracked in the
          open, on a live public dashboard you can check yourself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/r/client/sandbar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gold/40 px-5 py-2.5 text-[14px] font-bold text-gold transition hover:border-gold/70 hover:bg-gold/[0.08]"
          >
            See the live dashboard ↗
          </a>
          <a
            href="/case-studies/sandbar"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 py-2.5 text-[14px] font-semibold text-ink underline decoration-gold/40 underline-offset-4 transition hover:decoration-gold"
          >
            Read the case study
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── 8 · BREAK-EVEN CALCULATOR (no inputs stored or transmitted) ───────── */
function BreakEven() {
  // Pure client-side state. Nothing here is persisted, logged, sent to the
  // backend, or handed to analytics — per docs/PRICING.md, calculator inputs
  // are never stored or transmitted.
  const [profit, setProfit] = useState('');
  const p = Number(profit.replace(/[^0-9.]/g, ''));
  const vis = Number(PLAN_VISIBILITY.monthly.replace(/[^0-9.]/g, ''));
  const grow = Number(PLAN_GROWTH.monthly.replace(/[^0-9.]/g, ''));
  const valid = p > 0;
  const jobs = (monthly: number) => Math.ceil(monthly / p);
  const label = (n: number) => `${n} ${n === 1 ? 'job' : 'jobs'}`;

  return (
    <section className="mt-16 sm:mt-24">
      <div className="mx-auto max-w-[720px] rounded-2xl border border-ink/12 bg-surface p-6 text-left shadow-lift sm:p-8">
        <h2 className="font-display text-[24px] font-bold text-ink sm:text-[30px]">{BREAK_EVEN.title}</h2>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-2">
          Enter what you clear in profit on one completed job, and see how many extra jobs a
          month cover each plan.
        </p>

        <label htmlFor="profit-input" className="mt-6 block text-[13px] font-semibold text-ink">
          {BREAK_EVEN.inputLabel}
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/15 bg-surface-2 px-4 focus-within:border-gold/60">
          <span aria-hidden className="text-[18px] font-semibold text-ink-3">$</span>
          <input
            id="profit-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 450"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            className="min-h-[52px] w-full bg-transparent text-[18px] font-semibold text-ink outline-none placeholder:text-ink-4"
          />
        </div>
        <p className="mt-2 text-[12.5px] text-ink-3">{BREAK_EVEN.helper}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-4">Local Visibility · {PLAN_VISIBILITY.monthly}/mo</p>
            <p className="mt-1.5 text-[20px] font-bold text-ink">
              {valid ? <>≈ {label(jobs(vis))}<span className="text-[14px] font-semibold text-ink-3"> / month</span></> : <span className="text-ink-4">—</span>}
            </p>
          </div>
          <div className="rounded-xl bg-navy p-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-navy-2">Local Growth System · {PLAN_GROWTH.monthly}/mo</p>
            <p className="mt-1.5 text-[20px] font-bold text-on-navy">
              {valid ? <>≈ {label(jobs(grow))}<span className="text-[14px] font-semibold text-on-navy-2"> / month</span></> : <span className="text-on-navy-2">—</span>}
            </p>
          </div>
        </div>

        <p className="mt-5 text-[12.5px] font-semibold leading-[1.5] text-ink-3">{BREAK_EVEN.disclaimer}</p>
      </div>
    </section>
  );
}

/* ── 9 · PROCESS / TIMELINE ────────────────────────────────────────────── */
function Process() {
  return (
    <section className="mt-16 sm:mt-24">
      <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">How it works</h2>
      <ol className="mx-auto mt-8 grid max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-3">
        {AFTER_YOU_START.map((s, i) => (
          <li key={s.step} className="rounded-xl border border-ink/12 bg-surface p-5 text-left shadow-lift">
            <p className="text-[12px] font-bold text-gold">Step {i + 1}</p>
            <p className="mt-1.5 text-[16px] font-semibold text-ink">{s.step}</p>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-3">{s.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── 10 · TERRITORY EXCLUSIVITY ────────────────────────────────────────── */
function Territory() {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="mx-auto max-w-[780px] rounded-2xl border border-gold/25 bg-surface p-6 text-left shadow-lift sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Territory</p>
        <h2 className="mt-3 font-display text-[24px] font-bold leading-[1.2] text-ink sm:text-[30px]">
          {TERRITORY.short}
        </h2>
        <p className="mt-4 text-[15px] leading-[1.65] text-ink-2">{TERRITORY.why}</p>
        <ul className="mt-5 grid gap-2.5">
          {TERRITORY.points.map((pt) => (
            <li key={pt} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-ink-2">
              <span className="text-ok">{CHECK}</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 11 · IMPLEMENTATION COMMITMENT (replaces the retired guarantee) ───── */
function Commitment() {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-navy p-7 text-left shadow-[0_28px_70px_-28px_rgba(15,25,46,0.55)] sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-bright">{COMMITMENT.title}</p>
        <p className="mt-4 font-display text-[22px] font-bold leading-[1.3] text-on-navy sm:text-[27px]">
          {COMMITMENT.body}
        </p>
        <p className="mt-5 text-[13.5px] leading-[1.6] text-on-navy-2">{COMMITMENT.qualification}</p>
        <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.2em] text-gold-bright">
          Lola watches. Ty does the work.
        </p>
      </div>
    </section>
  );
}

/* ── 12 · FAQ (rendered verbatim from PRICING_QA → matches FAQPage schema) ── */
function Faq() {
  return (
    <section className="mt-16 sm:mt-24">
      <h2 className="text-center font-display text-[26px] font-bold text-ink sm:text-[32px]">Straight answers</h2>
      <div className="mx-auto mt-8 max-w-[760px] divide-y divide-ink/10 border-y border-ink/10">
        {PRICING_QA.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[16px] font-semibold text-ink">
              {f.q}
              <span aria-hidden className="shrink-0 text-gold transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-3 text-[14.5px] leading-[1.65] text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── 13 · FINAL CTA ────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="mt-16 text-center sm:mt-24">
      <h2 className="mx-auto max-w-[640px] text-balance font-display text-[28px] font-bold leading-[1.15] text-ink sm:text-[36px]">
        Start free. See where your leads are leaking.
      </h2>
      <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.6] text-ink-2">
        Run your Growth Score first — 60 seconds, no card, no call. When you&rsquo;re ready,
        pick the plan that fits.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={FREE_GROWTH_SCORE.href}
          className="group inline-flex min-h-[56px] w-full max-w-[340px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-8 py-3 text-[16px] font-bold text-on-gold shadow-glow transition-all duration-200 hover:bg-right active:scale-[0.99] sm:w-auto"
        >
          {FREE_GROWTH_SCORE.cta}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
        <a
          href="#plans"
          className="inline-flex min-h-[56px] w-full max-w-[340px] items-center justify-center rounded-xl border border-ink/15 px-8 py-3 text-[15px] font-semibold text-ink transition hover:border-gold/60 hover:text-gold sm:w-auto"
        >
          Compare plans
        </a>
      </div>
      <p className="mt-5 text-[13px] text-ink-3">
        Prefer to ask first?{' '}
        <a
          href={startSmsHref(`Hi ${FOUNDER.knownAs} — I have a question about the plans.`)}
          className="font-semibold text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
        >
          Text {FOUNDER.knownAs} at {FOUNDER.phoneDisplay}
        </a>
      </p>
      <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.22em] text-ink-4">
        Get found. Get called. Get booked.
      </p>
    </section>
  );
}
