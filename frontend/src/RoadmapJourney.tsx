/**
 * RoadmapJourney — the signature visual roadmap.
 *
 * Renders the customer journey as a connected path:
 *   Free Growth Score → Foundation → Growth → Scale
 *
 * Two purpose-built layouts (no awkward reflow): a horizontal stepped path on
 * sm+ and a vertical timeline on mobile. Prices come from the canonical
 * ROADMAP (lib/pricing) so the visual never drifts from docs/PRICING.md.
 *
 * Used on /roadmap (the dedicated page), /pricing, and the homepage.
 */

import { ROADMAP } from './lib/pricing';

const f = ROADMAP.find((s) => s.id === 'foundation')!;
const g = ROADMAP.find((s) => s.id === 'growth')!;
const sc = ROADMAP.find((s) => s.id === 'scale')!;

interface Step {
  icon: string;
  kicker: string;
  name: string;
  price: string;
  period: string;
  blurb: string;
  href: string;
  free?: boolean;
}

const STEPS: Step[] = [
  {
    icon: '📊',
    kicker: 'Step 1 · Free',
    name: 'Growth Score',
    price: 'Free',
    period: '60-second tool',
    blurb: 'See your 0–100 starting number across all six dimensions.',
    href: '/growth-score',
    free: true,
  },
  {
    icon: '🧱',
    kicker: 'Step 2 · One-time',
    name: f.name,
    price: f.price,
    period: f.period,
    blurb: 'Build a searchable, trackable base — plus your 90-day roadmap.',
    href: '/pricing',
  },
  {
    icon: '📈',
    kicker: 'Step 3 · Monthly',
    name: g.name,
    price: g.price,
    period: g.period,
    blurb: 'Momentum: content, posting, reviews — the score starts climbing.',
    href: '/pricing',
  },
  {
    icon: '🚀',
    kicker: 'Step 4 · Monthly',
    name: sc.name,
    price: sc.price,
    period: sc.period,
    blurb: 'Compete + compound across services, cities, and AI search.',
    href: '/pricing',
  },
];

export default function RoadmapJourney({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      {/* ── Desktop / tablet: horizontal stepped path ─────────────── */}
      <div className="relative hidden sm:block">
        {/* connector line behind the nodes */}
        <div
          aria-hidden
          className="absolute left-[12.5%] right-[12.5%] top-[26px] h-[2px] bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/60 to-[#D4AF37]/20"
        />
        <ol className="relative grid grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.name} className="flex flex-col items-center text-center">
              <span
                className={`relative z-10 flex h-[54px] w-[54px] items-center justify-center rounded-full border text-[22px] ${
                  s.free
                    ? 'border-[#D4AF37]/50 bg-[#0F0F12]'
                    : 'border-[#D4AF37] bg-gradient-to-br from-[#1A1408] to-[#0F0F12] shadow-[0_0_24px_rgba(212,175,55,0.25)]'
                }`}
              >
                {s.icon}
              </span>
              <div className="mt-4 flex h-full w-full flex-col rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/80">{s.kicker}</p>
                <p className="mt-2 text-[17px] font-bold text-white">{s.name}</p>
                <p className="mt-1 text-[20px] font-extrabold text-[#D4AF37]">
                  {s.price}
                  {!s.free && <span className="text-[11px] font-medium text-[#9CA3AF]"> {s.period}</span>}
                </p>
                <p className="mt-3 flex-1 text-[13px] leading-[1.55] text-[#C5C5C8]">{s.blurb}</p>
                <a
                  href={s.href}
                  className="mt-4 inline-flex items-center justify-center gap-1 text-[12px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:text-[#F4D47C]"
                >
                  {s.free ? 'Get my score' : 'Learn more'} →
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Mobile: vertical timeline ─────────────────────────────── */}
      <ol className="relative sm:hidden">
        {/* vertical rail */}
        <div
          aria-hidden
          className="absolute bottom-6 left-[26px] top-6 w-[2px] bg-gradient-to-b from-[#D4AF37]/20 via-[#D4AF37]/60 to-[#D4AF37]/20"
        />
        {STEPS.map((s) => (
          <li key={s.name} className="relative flex gap-4 pb-5 last:pb-0">
            <span
              className={`relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border text-[20px] ${
                s.free
                  ? 'border-[#D4AF37]/50 bg-[#0F0F12]'
                  : 'border-[#D4AF37] bg-gradient-to-br from-[#1A1408] to-[#0F0F12] shadow-[0_0_20px_rgba(212,175,55,0.22)]'
              }`}
            >
              {s.icon}
            </span>
            <div className="flex-1 rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]/80">{s.kicker}</p>
                <p className="text-[16px] font-extrabold text-[#D4AF37]">
                  {s.price}
                  {!s.free && <span className="text-[10px] font-medium text-[#9CA3AF]"> {s.period}</span>}
                </p>
              </div>
              <p className="mt-1 text-[16px] font-bold text-white">{s.name}</p>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[#C5C5C8]">{s.blurb}</p>
              <a
                href={s.href}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.05em] text-[#D4AF37]"
              >
                {s.free ? 'Get my score' : 'Learn more'} →
              </a>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
