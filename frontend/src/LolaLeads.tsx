/// <reference types="vite/client" />
/**
 * /lolaleads — the Lola Leads front door.
 *
 * Part of the Option-C+ restructure: the domain leads with Coach Ty (personal
 * brand) and Lola Leads gets its own home here. This page is a FRONT DOOR, not
 * a second copy of the funnel — it states the offer once and routes into the
 * pages that already rank and convert (/growth-score, /pricing, /start, /vs,
 * /case-studies). It deliberately does NOT duplicate the deep pricing or
 * comparison content, so it can't cannibalise the URLs that carry the rankings.
 *
 * Every fact on this page comes from lib/pricing (the single offer source) —
 * nothing here is hand-authored copy that could drift from docs/PRICING.md.
 */

import { PLAN, MONTHLY_AT_A_GLANCE, GUARANTEE, EXCLUSIVITY, LEAD_MAGNET, OFFER_FULL, OFFER_ONE_LINER } from './lib/pricing';
import { startHref } from './lib/checkout';
import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

const START = startHref();

/**
 * Every Lola Leads sub-page, surfaced from the one door. When the homepage
 * re-leads with Coach Ty, this is what keeps the whole product reachable in a
 * single hop — nothing gets stranded. These pages keep their own URLs (they're
 * what rank); /lolaleads just indexes them. /growth-score is the free check
 * that /audit and /grader both 301 to.
 */
const SUBPAGES: ReadonlyArray<{ href: string; label: string; blurb: string }> = [
  { href: '/growth-score', label: 'Free Growth Score', blurb: 'The 60-second visibility check. No call, no card.' },
  { href: '/pricing', label: 'Pricing & what’s included', blurb: `Everything in the ${PLAN.price}${PLAN.period} plan, in full.` },
  { href: '/work', label: 'Sites we’ve built', blurb: 'Live sites Lola designed and ranks.' },
  { href: '/methodology', label: 'How the scoring works', blurb: 'The exact method behind the score — no black box.' },
  { href: '/vs', label: 'Lola vs agencies & tools', blurb: 'Honest comparisons with real pricing.' },
  { href: '/case-studies', label: 'Case studies', blurb: 'Real clients, tracked on live public dashboards.' },
  { href: '/apply', label: 'Apply for a slot', blurb: 'One client per trade, per city.' },
  { href: '/start', label: `Start — ${PLAN.price}${PLAN.period}`, blurb: 'One tap. No sales call required.' },
];

// One gold treatment for the primary CTAs — mirrors Homepage's GOLD_CTA so the
// button reads identically to the rest of the site.
const GOLD_CTA =
  'group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-lg ' +
  'bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left ' +
  'px-6 py-3 text-[14px] font-bold uppercase tracking-[0.04em] text-on-gold ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_rgba(212,175,55,0.28)] ' +
  'transition-all duration-200 hover:bg-right ' +
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_rgba(212,175,55,0.44)] ' +
  'active:scale-[0.99]';

const GHOST_CTA =
  'inline-flex min-h-[56px] items-center justify-center whitespace-nowrap rounded-lg ' +
  'border border-gold/35 px-5 py-3 text-[14px] font-semibold text-gold transition-colors ' +
  'hover:border-gold/70 hover:bg-gold/[0.08]';

export default function LolaLeads() {
  usePageMeta('/lolaleads');
  useReveal();

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-2 sm:pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.13)_0%,transparent_62%)] blur-2xl"
        />
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          Lola Leads · Done-for-you local SEO
        </span>
        <h1 className="mt-4 max-w-[760px] text-balance font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[52px]">
          Get found on Google and AI —{' '}
          <span className="text-gold">and chosen.</span>
        </h1>
        <p className="mt-5 max-w-[560px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[18px]">
          Lola is done-for-you local visibility for home-service contractors:
          your site written so Google and ChatGPT can read it, your Google
          Business Profile managed, reviews and follow-up running on their own —
          so the next customer who searches finds you and picks you.
        </p>

        {/* Price / included anchor — same struck-price pattern as the homepage. */}
        <div className="mt-6 max-w-[440px] overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] shadow-[0_14px_40px_-18px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
            <span className="text-[14.5px] font-semibold text-ink">Your website, designed &amp; built</span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-[13px] text-ink-4 line-through">$3,000+</span>
              <span className="rounded-full border border-ok/35 bg-ok/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ok">
                Included
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[14.5px] text-ink-2">Then everything else, monthly</span>
            <span className="shrink-0 text-[17px] font-bold text-ink">
              {PLAN.price}<span className="text-[13px] font-semibold text-ink-3">{PLAN.period}</span>
            </span>
          </div>
        </div>
        <p className="mt-2.5 text-[13px] leading-[1.5] text-ink-3">{PLAN.terms}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a href={LEAD_MAGNET.href} className={`${GOLD_CTA} shrink-0 whitespace-nowrap`}>
            Run my free Growth Score
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <a href={START} className={`${GHOST_CTA} shrink-0`}>
            Start — {PLAN.price}{PLAN.period}
          </a>
          <a href="/pricing" className="text-[14px] font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            See everything included →
          </a>
        </div>
      </section>

      {/* ── THE WHOLE OFFER, IN TY'S WORDS ─────────────────────── */}
      <section className="reveal mt-14 sm:mt-20">
        <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
          The whole offer, straight from Ty
        </h2>
        <p className="mt-6 max-w-[68ch] text-[16px] leading-[1.7] text-ink-2 sm:text-[17px]">
          {OFFER_FULL}
        </p>
        <p className="mt-6 max-w-[68ch] border-l-2 border-gold pl-4 text-[16px] font-semibold leading-[1.6] text-ink">
          {OFFER_ONE_LINER}
        </p>
      </section>

      {/* ── WHAT LANDS EVERY MONTH ─────────────────────────────── */}
      <section className="reveal mt-14 sm:mt-20">
        <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
          What lands every month
        </h2>
        <p className="mt-3 max-w-[620px] text-[15.5px] leading-[1.6] text-ink-2">
          One all-inclusive plan — no setup fee, no separate build charge. The
          full breakdown lives on{' '}
          <a href="/pricing" className="text-gold underline-offset-4 hover:underline">the pricing page</a>.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHLY_AT_A_GLANCE.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[14.5px] text-ink-2"
            >
              <span aria-hidden className="mt-0.5 text-gold">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── PROMISE + EXCLUSIVITY ──────────────────────────────── */}
      <section className="reveal mt-14 grid grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-2">
        <div className="rounded-xl border border-gold/30 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] p-5">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-gold">
            <span aria-hidden>{GUARANTEE.emoji}</span> {GUARANTEE.title}
          </div>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{GUARANTEE.body}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-3">
            {EXCLUSIVITY.short}
          </div>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{EXCLUSIVITY.why}</p>
        </div>
      </section>

      {/* ── PROOF + COMPARE (routes into the ranked pages) ─────── */}
      <section className="reveal mt-14 sm:mt-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/case-studies/sandbar"
            className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-gold/40 hover:bg-gold/[0.04]"
          >
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-gold">Proof</div>
            <div className="mt-2 font-display text-[20px] font-bold text-ink">See a real client — Sandbar Soft Wash</div>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-3">
              Tracked in the open on a live public dashboard, not a sales deck.
              <span className="ml-1 text-gold transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </a>
          <a
            href="/vs"
            className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-gold/40 hover:bg-gold/[0.04]"
          >
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-gold">Compare</div>
            <div className="mt-2 font-display text-[20px] font-bold text-ink">Lola vs the agencies &amp; tools</div>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-3">
              Honest breakdowns vs LocalIQ, Scorpion, Podium, Yext and more — real pricing.
              <span className="ml-1 text-gold transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </a>
        </div>
      </section>

      {/* ── EVERYTHING UNDER LOLA LEADS (sub-page index) ───────── */}
      <section className="reveal mt-14 sm:mt-20">
        <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
          Everything under Lola Leads
        </h2>
        <p className="mt-3 max-w-[620px] text-[15.5px] leading-[1.6] text-ink-2">
          The whole product, one hop away. Each page keeps its own address —
          this is just the front door to all of them.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUBPAGES.map((p) => (
            <li key={p.href}>
              <a
                href={p.href}
                className="group flex items-start justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-gold/40 hover:bg-gold/[0.04]"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{p.label}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-[1.45] text-ink-3">{p.blurb}</span>
                </span>
                <span aria-hidden className="mt-0.5 shrink-0 text-gold transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section className="reveal mt-14 rounded-2xl border border-gold/30 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] p-6 text-center sm:mt-20 sm:p-10">
        <h2 className="mx-auto max-w-[560px] font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
          Start with the free 60-second Growth Score
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.6] text-ink-2">
          {LEAD_MAGNET.blurb}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={LEAD_MAGNET.href} className={`${GOLD_CTA} w-full sm:w-auto`}>
            Run my free Growth Score
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <a href={START} className={`${GHOST_CTA} w-full sm:w-auto`}>
            Start — {PLAN.price}{PLAN.period}
          </a>
        </div>
      </section>
    </main>
  );
}
