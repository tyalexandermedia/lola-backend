/**
 * IncludedAccordion — expandable "what's included, explained" list.
 *
 * The drop-down clarity pattern: each deliverable is a row you can tap to
 * expand a plain-English explanation of what it actually means for the owner.
 * Data-driven from lib/pricing.ts (BUILD_INCLUDED), reusable on /pricing and
 * /retainer. Uses native <details> so it works with zero JS and is keyboard-
 * and screen-reader friendly.
 */

import type { PackageDetail } from './lib/pricing';
import WatchExplainer from './WatchExplainer';

export default function IncludedAccordion({
  items,
  eyebrow = "What's included",
  title = 'Everything in the Full Build — in plain English',
}: {
  items: ReadonlyArray<PackageDetail & { video?: string }>;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mt-16 sm:mt-20">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">{eyebrow}</p>
      <h2
        className="mt-3 max-w-[720px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
        style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}
      >
        {title}
      </h2>
      <p className="mt-4 max-w-[620px] text-[14px] leading-[1.6] text-[#9CA3AF] sm:text-[15px]">
        Tap any line to see exactly what you get. No jargon, no surprises.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {items.map((item) => (
          <details
            key={item.title}
            className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-[20px] leading-none">{item.icon}</span>
              <span className="flex-1">{item.title}</span>
              <span
                aria-hidden
                className="shrink-0 text-[20px] text-[#D4AF37] transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-[14px] leading-[1.65] text-[#C5C5C8] sm:px-6 sm:pb-6 sm:text-[15px]">
              {item.detail}
              {item.video && (
                <div className="mt-4">
                  <WatchExplainer videoUrl={item.video} label="See a 60-sec demo" seconds={60} />
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
