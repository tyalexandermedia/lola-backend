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

import { PLAN } from './lib/pricing';

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
const FEATURES: ReadonlyArray<{ icon: string; headline: string; worth: string; how: string }> = [
  {
    icon: '🤖',
    headline: 'Named when they ask AI.',
    worth: 'Nobody else does this',
    how: "AI can only recommend a business it can actually read. Yours is written so ChatGPT, Gemini and Google's AI can — and name you.",
  },
  {
    icon: '🌐',
    headline: 'A $3,000 website, included.',
    worth: 'No setup fee',
    how: 'Fast, mobile-first, built around the jobs you actually want, with click-to-call and a quote form front and centre.',
  },
  {
    icon: '📍',
    headline: 'First in the Google map.',
    worth: 'Half your local leads',
    how: 'Right primary category, services, hours, photos and regular posts — the pin a neighbour actually taps.',
  },
  {
    icon: '📲',
    headline: 'Miss a call? It texts them back.',
    worth: 'Can cover the month',
    how: "You're on a roof. The caller gets a text from your number within a minute, so the job doesn't go to whoever answers next.",
  },
  {
    icon: '⭐',
    headline: 'Reviews, without you asking.',
    worth: 'What closes quotes',
    how: 'Every completed job triggers an automatic Google review request — review count is the biggest lever in the map pack.',
  },
  {
    icon: '🔁',
    headline: 'No lead ever goes cold.',
    worth: 'Most jobs die in silence',
    how: "Every new lead gets a reply within a minute, then 3 follow-ups by text and email while you're in the field. Jobs are lost to silence, not price.",
  },
  {
    icon: '📊',
    headline: 'Check my work any time.',
    worth: 'No report to wait for',
    how: 'Calls, forms, rankings and what I shipped this month — on one page, whenever you want to look.',
  },
];

export default function FeatureShowcase() {
  return (
    // A full-bleed band (same trick as the closing section) on the site's
    // second surface tone. This is the densest section on the page; framing it
    // as one block gives the eye a place to rest between the letter and the
    // proof, and the white cards read as cards again instead of floating on
    // the same paper as everything else.
    <section className="relative left-1/2 right-1/2 mt-14 -mx-[50vw] w-screen bg-surface-2 py-12 sm:mt-20 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">
        What you get
      </p>
      <h2 className="mt-3 max-w-[720px] font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[40px]">
        Everything below, every month.
      </h2>
      <p className="mt-4 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
        One flat price. No setup fee, no add-ons, no contract. Here is exactly
        what lands.
      </p>

      {/* Phones: a divided list — icon in the gutter, benefit and the one-line
          "how" beside it — because seven boxed cards stacked into 2.8 screens
          and the boxes were the height, not the words. Tablet and up: the
          same seven as cards in a grid, where there is width to spend. */}
      <div className="mt-6 grid grid-cols-1 border-t border-black/[0.07] sm:mt-9 sm:gap-4 sm:border-0 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.headline}
            className="flex gap-3.5 border-b border-black/[0.07] py-3.5 sm:block sm:rounded-xl sm:border sm:border-black/[0.08] sm:bg-surface sm:p-5 sm:transition-colors sm:hover:border-gold/30"
          >
            <div className="w-8 shrink-0 pt-0.5 text-[24px] leading-none sm:w-auto sm:pt-0 sm:text-[26px]" aria-hidden>
              {f.icon}
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
