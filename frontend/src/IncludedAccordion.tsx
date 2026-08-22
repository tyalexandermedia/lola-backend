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
import { demoFor } from './lib/featureDemos';
import WatchExplainer from './WatchExplainer';

export default function IncludedAccordion({
  items,
  eyebrow = "What's included",
  title = 'Everything included — in plain English',
}: {
  items: ReadonlyArray<PackageDetail & { video?: string }>;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mt-16 sm:mt-20">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
      <h2
        className="mt-3 max-w-[720px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
        style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}
      >
        {title}
      </h2>
      <p className="mt-4 max-w-[620px] text-[14px] leading-[1.6] text-ink-3 sm:text-[15px]">
        Tap any line to see it — not a description of it.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {items.map((item) => (
          <details
            key={item.title}
            className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-gold/30 open:bg-white/[0.04]"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-[20px] leading-none">{item.icon}</span>
              <span className="flex-1">{item.title}</span>
              <span
                aria-hidden
                className="shrink-0 text-[20px] text-gold transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              {/* The picture first. Every one of these lines used to open into a
                  paragraph, on the page where a buyer decides — and a paragraph
                  about "missed-call text-back" is indistinguishable from every
                  other agency's feature list. The demo is the same node the
                  homepage renders (lib/featureDemos), so the two surfaces can't
                  show a buyer different products one click apart. */}
              {demoFor(item.demo) && (
                <div className="mb-4 rounded-lg border border-white/[0.07] bg-[#08080A]/60 p-4">
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[#4B5563]">
                    Example
                  </p>
                  {demoFor(item.demo)}
                </div>
              )}
              <p className="text-[14px] leading-[1.65] text-ink-2 sm:text-[15px]">
                {item.detail}
              </p>
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
