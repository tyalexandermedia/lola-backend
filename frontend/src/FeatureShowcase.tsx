/**
 * WHAT LANDS — every feature named at once, one of them shown at a time.
 *
 * ── Two objections this layout has to satisfy at the same time ────────────
 * It started as a tab set. Tabs were wrong because they hid six of the seven
 * features behind a click: a buyer scrolling past saw one piece of value and
 * had to work to find the rest.
 *
 * It became a bento grid — all seven cards expanded simultaneously. Measured on
 * a 1440px desktop that section was 1,065px tall with 231 words and seven live
 * demos competing at equal visual weight. Nothing led, so the reader had to
 * process all seven to find out which one mattered to them. "Too much to read"
 * is the correct reaction to that.
 *
 * ── Why a spotlight is not a return to tabs ───────────────────────────────
 * The rail lists all seven headlines AND their benefit lines, permanently, on
 * every viewport. Nothing about WHAT the product does is hidden — you can read
 * the full feature set in one glance, which is exactly what tabs prevented.
 * What rotates is only the ILLUSTRATION: one demo, shown large, instead of
 * seven shown small. Less to read, not less to know.
 *
 * On desktop this also finally uses the horizontal space. The old grid stacked
 * everything vertically inside a 1120px container on a 1440px screen, so the
 * cost of seven features was paid entirely in scroll depth.
 *
 * ── Details that matter ───────────────────────────────────────────────────
 *   • Every demo stays mounted; inactive ones are `hidden`, so all of their
 *     markup is still in the served HTML for a crawler that doesn't run JS.
 *   • Hover selects on a pointer device, click/keyboard selects everywhere, and
 *     Up/Down/Home/End move through the rail — the standard tablist contract.
 *   • No auto-rotation. A panel that changes under a reader who is mid-sentence
 *     is the single most-complained-about carousel behaviour, and it would
 *     defeat the point of reducing what has to be tracked at once.
 *   • Only one demo animates at a time now instead of seven.
 *   • Every demo is labelled "Example" — these illustrate what each feature
 *     produces, not screenshots of a client's account, and the badge stops any
 *     of them being read as a testimonial or a real result.
 *
 * Reduced motion is honoured in both layers: the CSS transitions carry
 * motion-reduce variants, and CountUp checks the media query at runtime because
 * a CSS rule cannot stop a JS-driven number. Both render the final value, so
 * the figure in the HTML is always the true one.
 */

import { useCallback, useRef, useState } from 'react';

import { DEMOS } from './lib/featureDemos';

/* ── the feature table ─────────────────────────────────────────────────── */

/**
 * Order IS the argument: the two things no competitor sells lead. Every demo
 * comes from lib/featureDemos, the same nodes /pricing renders, so a buyer
 * can't be shown different products one click apart.
 */
const CELLS: ReadonlyArray<{
  id: keyof typeof DEMOS;
  headline: string;
  worth: string;
}> = [
  { id: 'ai', headline: 'Named when they ask ChatGPT.', worth: 'Nobody else does this' },
  { id: 'website', headline: 'A $3,000 website. Included.', worth: 'No setup fee' },
  { id: 'gbp', headline: 'First in the map pack.', worth: 'Half your local leads' },
  { id: 'missed-call', headline: "You can't answer. It answers.", worth: 'Covers the month' },
  { id: 'reviews', headline: 'Reviews, without you asking.', worth: 'What closes quotes' },
  { id: 'follow-up', headline: 'No lead goes cold.', worth: 'Most jobs die in silence' },
  { id: 'dashboard', headline: 'Check my work any time.', worth: 'No report to wait for' },
];

export default function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);

  /** Standard vertical-tablist keys. Moves focus with selection. */
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const last = CELLS.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    rail.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }, [active]);

  return (
    <section className="mt-14 sm:mt-20">
      <p className="text-[11px] uppercase tracking-[0.1em] text-gold">What lands</p>
      <h2 className="mt-3 max-w-[760px] text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
        Not a list of features. Here&apos;s what actually lands.
      </h2>
      <p className="mt-4 max-w-[560px] text-[15px] leading-[1.6] text-ink-3">
        All seven, every month. Pick one to see what it looks like.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
        {/* ── RAIL: all seven, always readable ─────────────────────────── */}
        <div
          ref={rail}
          role="tablist"
          aria-label="What Lola does every month"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex flex-col gap-1.5"
        >
          {CELLS.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c.id}
                role="tab"
                id={`feat-tab-${c.id}`}
                aria-selected={on}
                aria-controls={`feat-panel-${c.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                // Hover-to-select on pointer devices only. On a touch screen
                // hover fires on tap and would double-handle the click.
                onMouseEnter={() => {
                  if (window.matchMedia('(hover: hover)').matches) setActive(i);
                }}
                className={`group flex min-h-[56px] w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-200 motion-reduce:transition-none ${
                  on
                    ? 'border-gold/45 bg-gold/[0.07]'
                    : 'border-white/[0.07] bg-white/[0.015] hover:border-gold/25 hover:bg-white/[0.03]'
                }`}
              >
                {/* The active marker is a shape change, not only a colour
                    change, so the selected row is distinguishable without
                    relying on hue. */}
                <span
                  aria-hidden
                  className={`h-8 w-[3px] shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                    on ? 'bg-gold' : 'bg-white/10 group-hover:bg-gold/40'
                  }`}
                />
                <span className="min-w-0">
                  <span className={`block text-balance font-display text-[16px] font-bold leading-[1.25] tracking-[-0.01em] transition-colors ${on ? 'text-ink' : 'text-ink-2'}`}>
                    {c.headline}
                  </span>
                  <span className="mt-1 block text-[11.5px] font-semibold text-gold/85">{c.worth}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ── PANEL: one illustration, shown large ─────────────────────── */}
        {/* min-h stops the pane resizing as demos of different heights swap in,
            which would jump the rail beside it. lg:sticky keeps the demo beside
            the rail while a tall rail scrolls. */}
        {/* justify-center rather than a taller min-height: the demos differ in
            height, and letting the shortest one sit at the top dumped ~170px of
            empty panel underneath it. Centred, the leftover space splits evenly
            and reads as padding instead of as something failing to load. */}
        <div className="relative flex min-h-[320px] flex-col justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#191A1F] to-[#141519] p-5 sm:p-7 lg:sticky lg:top-24 lg:min-h-[440px]">
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-4 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-4"
          >
            Example
          </span>
          {CELLS.map((c, i) => (
            // Every panel stays mounted and only `hidden` toggles, so all seven
            // demos are still in the served HTML for a crawler that never runs
            // the JS that would reveal them.
            <div
              key={c.id}
              role="tabpanel"
              id={`feat-panel-${c.id}`}
              aria-labelledby={`feat-tab-${c.id}`}
              hidden={i !== active}
              className="animate-fade-in motion-reduce:animate-none"
            >
              {/* No headline here on desktop: the selected rail row already
                  shows it two inches to the left, and printing it twice is the
                  same word doubling the reading — the exact complaint this
                  layout exists to fix. On mobile the rail row is above the fold
                  of the panel, so it carries the label there too. */}
              {DEMOS[c.id]}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
