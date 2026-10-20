/**
 * WHAT YOU GET — a plain, scannable grid of everything the monthly includes.
 *
 * ── Why this is a static grid, not the old interactive spotlight ───────────
 * This used to be a tablist: a vertical rail of seven headlines beside one
 * large rotating demo panel you clicked through, each demo badged "Example".
 * It demoed well to a designer and read as a toy to the audience — a
 * home-service or small-business owner scanning on a phone between jobs. They
 * don't operate a tablist; they scan a list and decide. The interactive
 * version made them work to find the one line that mattered to them, and the
 * animated "Example" panels made a real offer look like a product tour.
 *
 * So: every feature is on screen at once, as a card they can read in a glance —
 * icon, the plain benefit, and the one reason it matters. Nothing to click,
 * nothing that moves, nothing hidden behind a tab. The copy is unchanged from
 * the version buyers already saw; only the presentation got calmer.
 *
 * The live demo nodes still exist in lib/featureDemos and render on /pricing,
 * where a reader who wants the detailed walk-through goes deliberately.
 */

import PawMark from './PawMark';
import { PLAN, PLAN_GROWTH } from './lib/pricing';

/** What each of these systems is usually sold for ON ITS OWN. The "from"
 *  figures are typical à-la-carte prices when a shop buys them one at a time
 *  from separate vendors — stated as floors, not precise market rates, so the
 *  comparison stays honest. Nothing here is a Lola result or a Lola claim; it
 *  is what the same systems cost elsewhere, so the one-number price reads as
 *  what it is. Keep the sum in the closing line in step with these rows. */
const ALA_CARTE: ReadonlyArray<{ label: string; price: string }> = [
  { label: 'A website, designed and built', price: '$3,000+ one-time' },
  { label: 'Missed-call text-back', price: 'from $500/mo' },
  { label: 'Review automation', price: 'from $750/mo' },
  { label: 'Lead follow-up system', price: 'from $1,500/mo' },
  { label: 'Google Business Profile + AI visibility', price: 'included' },
];

/** Order is the argument: the two things no competitor sells lead. Each card is
 *  the plain benefit, the one reason it matters, and ONE line of how — the
 *  specific thing that gets done, in the trade's own words. The "how" lines are
 *  tightened from the canonical offer copy in lib/pricing.ts (PLAN_INCLUDED),
 *  so the homepage can never describe a different product than /pricing sells.
 *  That line is what separates "a list of features" from "someone who has
 *  actually done this for a roofer". */
const FEATURES: ReadonlyArray<{ icon: IconName; headline: string; worth: string; how: string }> = [
  {
    icon: 'ai',
    headline: 'Improve your visibility in AI search.',
    worth: 'Clear information customers can find',
    how: 'We improve service information and monitor AI mentions. Recommendations depend on the search engine and are not guaranteed.',
  },
  {
    icon: 'web',
    headline: 'Your website, built for inquiries.',
    worth: `Included in the ${PLAN_GROWTH.oneTime.amount} launch`,
    how: 'Fast, mobile-first, built around the jobs you actually want, with click-to-call and a quote form front and centre.',
  },
  {
    icon: 'pin',
    headline: 'A stronger Google Business Profile.',
    worth: 'Make your services easier to find',
    how: 'Right primary category, services, hours, photos and regular posts — the pin a neighbour actually taps.',
  },
  {
    icon: 'text',
    headline: 'Miss a call? It texts them back.',
    worth: 'Can cover the month',
    how: "You're on a roof. The caller gets a text from your number within a minute, so the job doesn't go to whoever answers next.",
  },
  {
    icon: 'star',
    headline: 'Reviews, without you asking.',
    worth: 'What closes quotes',
    how: 'Every completed job triggers an automatic Google review request — review count is the biggest lever in the map pack.',
  },
  {
    icon: 'loop',
    headline: 'Follow up while you’re in the field.',
    worth: 'Less manual chasing',
    how: 'Eligible inquiries receive the agreed text and email sequence. Replies and bookings pause sales follow-up for a human handoff.',
  },
  {
    icon: 'chart',
    headline: 'Check my work any time.',
    worth: 'No report to wait for',
    how: 'Calls, forms, rankings and what I shipped this month — on one page, whenever you want to look.',
  },
];

/** One stroke-icon set in the palette's gold. The emoji these replaced
 *  rendered in each platform's own colours (Apple's robot, Google's globe) —
 *  seven stickers from seven palettes. Same 24px grid, same 1.7 stroke, so
 *  the column reads as one designed set. */
type IconName = 'ai' | 'web' | 'pin' | 'text' | 'star' | 'loop' | 'chart';
const ICON_PATHS: Record<IconName, React.ReactNode> = {
  ai: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  web: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 9h18M6.5 6.8h.01M9 6.8h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  text: (
    <>
      <path d="M20 12.5a7.5 7.5 0 01-11 6.6L4 20.5l1.4-4.6A7.5 7.5 0 1120 12.5z" />
      <path d="M9 11.5h6M9 14.5h3.5" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  loop: (
    <>
      <path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5" />
      <path d="M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
};

function FeatureIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function FeatureShowcase() {
  return (
    // A full-bleed band (same trick as the closing section) on the site's
    // second surface tone. This is the densest section on the page; framing it
    // as one block gives the eye a place to rest between the letter and the
    // proof, and the white cards read as cards again instead of floating on
    // the same paper as everything else.
    // py-10 on phones: a band's own padding stacks on the normal section gap,
    // and at py-12 that made a 108px void above the label where every other
    // section has 60. Same on the offer band.
    // No top margin: this band follows the navy problem band directly, and a
    // margin here left a strip of paper between two full-bleed bands.
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-surface-2 py-10 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-6">
      {/* Same label as every other section head on the page (paw + a plainly
          readable label) — this was the one uppercase tag on the page. */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/[0.10] text-gold">
          <PawMark />
        </span>
        <span className="text-[14px] font-semibold text-gold sm:text-[15px]">What you get</span>
        <span aria-hidden className="h-px max-w-[220px] flex-1 bg-gradient-to-r from-gold/35 to-transparent" />
      </div>
      <h2 className="mt-8 max-w-[720px] font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[44px]">
        Everything below, <span className="text-gold">every month.</span>
      </h2>
      <p className="mt-4 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
        {PLAN.terms}
      </p>

      {/* Phones: a divided list — icon in the gutter, benefit and the one-line
          "how" beside it — because seven boxed cards stacked into 2.8 screens
          and the boxes were the height, not the words. Tablet and up: the
          same seven as cards in a grid, where there is width to spend. */}
      <div className="mt-6 grid grid-cols-1 border-t border-black/[0.07] sm:mt-9 sm:gap-4 sm:border-0 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.headline}
            // Seven cards in a three-column grid left the last one alone on
            // its row. The first (the thing no competitor sells) and the last
            // (the proof you can check) each span two columns on desktop:
            // 2+1 / 3 / 1+2 — a staggered rhythm with no orphan.
            className={`flex gap-3.5 border-b border-black/[0.07] py-3.5 sm:block sm:rounded-xl sm:border sm:border-black/[0.08] sm:bg-surface sm:p-6 sm:hover:border-gold/40 card-lift ${
              i === 0 || i === FEATURES.length - 1
                ? 'lg:col-span-2 lg:bg-gradient-to-br lg:from-surface lg:to-gold/[0.07]'
                : ''
            }`}
          >
            {/* Emoji render differently on every phone; a fixed tinted disc
                gives all seven the same footprint and weight, so the column
                reads as a designed icon set rather than a row of stickers. */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/[0.10] text-gold ring-1 ring-gold/20 sm:h-11 sm:w-11"
              aria-hidden
            >
              <FeatureIcon name={f.icon} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-bold leading-[1.25] text-ink sm:mt-3 sm:text-[18px]">
                {f.headline}
              </h3>
              <p className="mt-1 text-[12.5px] font-semibold text-gold sm:mt-1.5 sm:text-[13px]">{f.worth}</p>
              <p className="mt-1.5 text-[13.5px] leading-[1.45] text-ink-3 sm:mt-2.5 sm:text-[14px] sm:leading-[1.55]">{f.how}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── The value anchor ──────────────────────────────────────────────
          The grid says WHAT you get; this says what it is WORTH. The same
          systems are widely sold one at a time, each on its own monthly bill —
          so stating that beside one number is the most honest value frame
          there is: no invented result, just what it costs elsewhere. Stacks on
          mobile; total and price share a line where there's room. */}
      <div className="mt-8 rounded-xl border border-gold/30 bg-surface p-4 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">
          Bought one at a time
        </p>
        {/* Desktop only: on a phone the label above and the "Bought
            separately" total below already say it, and the list is the proof. */}
        <p className="mt-2 hidden max-w-[560px] text-[15px] leading-[1.55] text-ink-2 sm:block">
          These same systems are usually sold separately, each with its own
          monthly bill.
        </p>
        <ul className="mt-3 divide-y divide-black/[0.06] text-[14px] sm:mt-4 sm:text-[15px]">
          {ALA_CARTE.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between gap-4 py-1.5 sm:py-2.5">
              <span className="text-ink-2">{r.label}</span>
              <span className="shrink-0 font-semibold text-ink-3">{r.price}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-3 border-t border-gold/25 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[14px] leading-[1.5] text-ink-3">
            Bought separately:{' '}
            <span className="font-semibold text-ink">$3,000+ up front, then $2,750+ a month.</span>
          </p>
          <p className="font-display text-[22px] font-bold leading-none text-ink">
            Lola: <span className="text-gold">{PLAN.price}{PLAN.period}</span> — all of it.
          </p>
        </div>
      </div>
      </div>
    </section>
  );
}
