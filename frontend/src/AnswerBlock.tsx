/**
 * Visible question-and-answer block — the counterpart to the FAQPage schema.
 *
 * ── Why this is a component and not just an accordion ────────────────────
 * The pitch is "we get you cited by AI answer engines." The site has to be an
 * example of it. Answer engines lift content that is (a) present in the served
 * HTML without JavaScript, (b) shaped as a question followed by a
 * self-contained answer, and (c) in the document outline as real headings.
 *
 * So each question is an <h3>, not a <summary> with a <span>. That single
 * choice is what puts these questions in the page outline where a crawler
 * building a passage index can find them.
 *
 * ── Open by default, on purpose ──────────────────────────────────────────
 * Google indexes content inside a collapsed <details>, but it is the answer
 * text that has to be liftable, and the safest way to guarantee that is to
 * render it as plain flow content. `collapsible` is available for long
 * secondary lists where the wall of text would hurt the page; the default is
 * open because the whole point is being quotable.
 *
 * ── The schema contract ──────────────────────────────────────────────────
 * The array passed in MUST be the same array used to build the route's
 * FAQPage in src/lib/pageMeta.ts. scripts/check-seo.mjs reads the built HTML,
 * strips <script> and <style> content, and fails the build if a question in
 * the schema is not in the visible text — so a drift between the two cannot
 * ship.
 */

interface QA {
  q: string;
  a: string;
}

interface Props {
  items: ReadonlyArray<QA>;
  /** Small uppercase label above the block. */
  kicker?: string;
  /** The section's own h2. Rendered visually unless `hideHeading`. */
  heading: string;
  hideHeading?: boolean;
  /** Render as <details> instead of flow content. Answers stay in the DOM. */
  collapsible?: boolean;
  className?: string;
}

export default function AnswerBlock({
  items,
  kicker,
  heading,
  hideHeading = false,
  collapsible = false,
  className = '',
}: Props) {
  if (!items.length) return null;

  return (
    <section className={`mt-14 sm:mt-20 ${className}`} aria-labelledby="answers-heading">
      {kicker && !hideHeading && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
          {kicker}
        </p>
      )}
      <h2
        id="answers-heading"
        className={
          hideHeading
            ? 'sr-only'
            : 'mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[34px]'
        }
      >
        {heading}
      </h2>

      <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {items.map((item) =>
          collapsible ? (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                {/* h3 inside summary: keeps the question in the document
                    outline while staying a valid disclosure control. */}
                <h3 className="text-[16px] font-semibold text-ink">{item.q}</h3>
                <span
                  aria-hidden
                  className="shrink-0 text-[20px] text-gold transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-8 text-[15px] leading-[1.65] text-ink-2">{item.a}</p>
            </details>
          ) : (
            <div key={item.q} className="py-6">
              <h3 className="text-[17px] font-semibold leading-[1.35] text-ink sm:text-[19px]">
                {item.q}
              </h3>
              <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.7] text-ink-2 sm:text-[16px]">
                {item.a}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
