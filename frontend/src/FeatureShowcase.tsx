/**
 * WHAT LANDS — every feature visible at once, each one shown rather than named.
 *
 * This was a tab set. Tabs were the wrong pattern for the job: they put six of
 * the seven features behind a click, so a buyer scrolling past saw exactly one
 * piece of value and had to work to discover the rest. "See it instantly" and
 * "click to reveal" are opposite instructions, and instantly wins on a sales
 * page — most readers never touch a tab.
 *
 * It's a bento grid now. Everything is on screen, sized by weight: the two
 * things no competitor sells (AI answers, the included website) take the big
 * cells, the rest take compact ones. No interaction is required to see value —
 * the interaction that remains is reward, not a toll.
 *
 *   • Numbers count up and bars grow when they scroll into view, so motion
 *     happens where the reader is looking instead of firing off-screen at load.
 *   • Cards lift and warm their border on hover.
 *   • Every demo is labelled "Example" — these illustrate what each feature
 *     produces, not screenshots of a client's account, and the badge stops any
 *     of them being read as a testimonial or a real result.
 *
 * Reduced motion is honoured in both layers: the CSS transitions carry
 * motion-reduce variants, and CountUp checks the media query at runtime because
 * a CSS rule cannot stop a JS-driven number. Both render the final value, so
 * the figure in the HTML is always the true one — the animation only ever
 * counts up to something already correct.
 */

import type { ReactNode } from 'react';

import { DEMOS } from './lib/featureDemos';

/* ── card shell ────────────────────────────────────────────────────────── */

function Card({
  span,
  headline,
  worth,
  children,
}: {
  span: string;
  headline: string;
  worth: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-gradient-to-b from-[#131316] to-[#0B0B0D] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 hover:shadow-[0_18px_44px_-18px_rgba(212,175,55,0.30)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${span}`}
    >
      <div className="px-5 pt-5 pr-16">
        <h3 className="text-balance font-display text-[19px] font-bold leading-[1.18] tracking-[-0.02em] text-white sm:text-[21px]">
          {headline}
        </h3>
        <span className="mt-2 inline-block rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#F4D47C]">
          {worth}
        </span>
      </div>
      <div className="mt-4 flex-1 px-5 pb-5">{children}</div>
      {/* These illustrate what the feature produces — not a client's account. */}
      <span className="pointer-events-none absolute right-4 top-5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#4B5563]">
        Example
      </span>
    </article>
  );
}

/* ── the grid ──────────────────────────────────────────────────────────── */

/**
 * Cell sizing IS the argument: the two things no competitor sells get the big
 * cells. Every demo comes from lib/featureDemos, the same nodes /pricing
 * renders, so a buyer can't be shown different products one click apart.
 */
const CELLS: ReadonlyArray<{
  id: keyof typeof DEMOS;
  span: string;
  headline: string;
  worth: string;
}> = [
  {
    id: 'ai',
    span: 'sm:col-span-2 lg:col-span-4',
    headline: 'Named when they ask ChatGPT.',
    worth: 'Nobody else does this',
  },
  { id: 'website', span: 'lg:col-span-2', headline: 'A $3,000 website. Included.', worth: 'No setup fee' },
  { id: 'gbp', span: 'lg:col-span-3', headline: 'First in the map pack.', worth: 'Half your local leads' },
  {
    id: 'missed-call',
    span: 'lg:col-span-3',
    headline: "You can't answer. It answers.",
    worth: 'Covers the month',
  },
  { id: 'reviews', span: 'lg:col-span-2', headline: 'Reviews, without you asking.', worth: 'What closes quotes' },
  { id: 'follow-up', span: 'lg:col-span-2', headline: 'No lead goes cold.', worth: 'Most jobs die in silence' },
  { id: 'dashboard', span: 'lg:col-span-2', headline: 'Check my work any time.', worth: 'No report to wait for' },
];

export default function FeatureShowcase() {
  return (
    <section className="mt-14 sm:mt-20">
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#D4AF37]">What lands</p>
      <h2 className="mt-3 max-w-[760px] text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        Not a list of features. Here&apos;s what actually lands.
      </h2>

      {/* Six columns so cells can be 4 / 3 / 2 wide; one column on a phone. */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {CELLS.map((c) => (
          <Card key={c.id} span={c.span} headline={c.headline} worth={c.worth}>
            {DEMOS[c.id]}
          </Card>
        ))}
      </div>
    </section>
  );
}
