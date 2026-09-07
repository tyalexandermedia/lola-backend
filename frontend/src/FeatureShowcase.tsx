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

/** Order is the argument: the two things no competitor sells lead. Plain
 *  benefit + the one reason it matters, straight talk, no jargon. */
const FEATURES: ReadonlyArray<{ icon: string; headline: string; worth: string }> = [
  { icon: '🤖', headline: 'Named when they ask AI.', worth: 'Nobody else does this' },
  { icon: '🌐', headline: 'A $3,000 website, included.', worth: 'No setup fee' },
  { icon: '📍', headline: 'First in the Google map.', worth: 'Half your local leads' },
  { icon: '📲', headline: 'Miss a call? It texts them back.', worth: 'Can cover the month' },
  { icon: '⭐', headline: 'Reviews, without you asking.', worth: 'What closes quotes' },
  { icon: '🔁', headline: 'No lead ever goes cold.', worth: 'Most jobs die in silence' },
  { icon: '📊', headline: 'Check my work any time.', worth: 'No report to wait for' },
];

export default function FeatureShowcase() {
  return (
    <section className="mt-14 sm:mt-20">
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

      <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.headline}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-gold/30"
          >
            <div className="text-[26px] leading-none" aria-hidden>
              {f.icon}
            </div>
            <h3 className="mt-3 font-display text-[18px] font-bold leading-[1.25] text-ink">
              {f.headline}
            </h3>
            <p className="mt-1.5 text-[13px] font-semibold text-gold">{f.worth}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
