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

import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ── motion helpers ────────────────────────────────────────────────────── */

/** True once the element has scrolled into view. Fires once, then disconnects. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

/** A number that climbs when it scrolls into view. */
function CountUp({ to, prefix = '' }: { to: number; prefix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!seen || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setN(0);
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {n}
    </span>
  );
}

/** A bar that grows to its width when scrolled into view. */
function GrowBar({ pct }: { pct: number }) {
  const { ref, seen } = useInView<HTMLSpanElement>();
  return (
    <span ref={ref} className="block h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
      <span
        className="block h-full rounded-full bg-[#4ADE80] transition-[width] duration-[900ms] ease-out motion-reduce:transition-none"
        style={{ width: seen ? `${pct}%` : '0%' }}
      />
    </span>
  );
}

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

function Bubble({ side, children }: { side: 'them' | 'you'; children: ReactNode }) {
  return (
    <div className={`flex ${side === 'you' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          side === 'you'
            ? 'max-w-[88%] rounded-2xl rounded-br-sm bg-[#2C6BED] px-3 py-2 text-[12px] leading-[1.45] text-white'
            : 'max-w-[88%] rounded-2xl rounded-bl-sm border border-white/[0.09] bg-[#17181C] px-3 py-2 text-[12px] leading-[1.5] text-[#E8E4D8]'
        }
      >
        {children}
      </div>
    </div>
  );
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} className="text-[11px] tracking-[0.06em] text-[#F4D47C]">
      {'★'.repeat(n)}
      <span className="text-white/20">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/* ── the grid ──────────────────────────────────────────────────────────── */

export default function FeatureShowcase() {
  return (
    <section className="mt-14 sm:mt-20">
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#D4AF37]">What lands</p>
      <h2 className="mt-3 max-w-[760px] text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        Not a list of features. Here&apos;s what actually lands.
      </h2>

      {/* Six columns so cells can be 4 / 3 / 2 wide; one column on a phone. */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* AI ANSWERS — biggest cell. The one thing no competitor sells. */}
        <Card
          span="sm:col-span-2 lg:col-span-4"
          headline="Named when they ask ChatGPT."
          worth="Nobody else does this"
        >
          <div className="space-y-2">
            <Bubble side="you">who&apos;s the best soft wash company in Dunedin?</Bubble>
            <Bubble side="them">
              <span aria-hidden className="mr-1.5 text-[#4ADE80]">✦</span>
              I&apos;d start with <span className="font-semibold text-white">[Your Company]</span> —
              strong reviews and they cover Dunedin.
            </Bubble>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { e: 'ChatGPT', on: true },
              { e: 'Claude', on: true },
              { e: 'Google AI', on: false },
            ].map((x) => (
              <div
                key={x.e}
                className="rounded-lg border border-white/[0.08] bg-[#17181C] px-2.5 py-2 text-center"
              >
                <p className="text-[11px] text-[#C5C5C8]">{x.e}</p>
                <p
                  className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                    x.on ? 'text-[#4ADE80]' : 'text-[#F4D47C]'
                  }`}
                >
                  {x.on ? 'Names you' : 'In progress'}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* WEBSITE — the biggest dollar figure on the page. */}
        <Card
          span="lg:col-span-2"
          headline="A $3,000 website. Included."
          worth="No setup fee"
        >
          <div className="overflow-hidden rounded-lg border border-white/[0.1] bg-[#0B0B0D]">
            <div className="flex items-center gap-1.5 border-b border-white/[0.08] bg-[#17181C] px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
              <span className="ml-1 truncate text-[9px] text-[#8A8F98]">yourcompany.com</span>
            </div>
            <div className="px-3 py-3">
              <p className="text-[12.5px] font-bold leading-[1.2] text-white">
                Soft Washing in Dunedin, FL
              </p>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded bg-[#D4AF37] px-2 py-1 text-[9px] font-bold text-[#0A0A0B]">
                  Call now
                </span>
                <span className="rounded border border-white/15 px-2 py-1 text-[9px] text-[#C5C5C8]">
                  Get a quote
                </span>
              </div>
              <p className="mt-2.5 border-t border-white/[0.07] pt-2 font-mono text-[9px] leading-[1.4] text-[#8A8F98]">
                <span className="text-[#4ADE80]">✓</span> LocalBusiness · Dunedin · Soft Washing
              </p>
            </div>
          </div>
        </Card>

        {/* MAP PACK */}
        <Card span="lg:col-span-3" headline="First in the map pack." worth="Half your local leads">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">
            ⌕ soft wash near me
          </p>
          <ol className="space-y-1.5">
            {[
              { r: 1, n: '[Your Company]', s: 5, c: 47, you: true },
              { r: 2, n: 'Competitor Exteriors', s: 4, c: 22, you: false },
              { r: 3, n: 'Bay Area Wash Co.', s: 4, c: 11, you: false },
            ].map((b) => (
              <li
                key={b.r}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                  b.you ? 'border border-[#4ADE80]/25 bg-[#4ADE80]/[0.07]' : 'bg-white/[0.02]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    b.you ? 'bg-[#4ADE80] text-[#0A0A0B]' : 'bg-white/10 text-[#8A8F98]'
                  }`}
                >
                  {b.r}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12px] ${
                      b.you ? 'font-semibold text-white' : 'text-[#9AA0A6]'
                    }`}
                  >
                    {b.n}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Stars n={b.s} />
                    <span className="text-[9px] text-[#8A8F98]">({b.c})</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {/* MISSED CALL */}
        <Card span="lg:col-span-3" headline="You can't answer. It answers." worth="Covers the month">
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-[#E5534B]/25 bg-[#E5534B]/[0.07] px-3 py-2">
              <span aria-hidden className="text-[12px]">📞</span>
              <span className="text-[12px] text-[#E8E4D8]">Missed call · 9:14 am</span>
            </div>
            <Bubble side="you">
              Sorry we missed your call — this is [Your Company]. What can we quote for you?
            </Bubble>
            <Bubble side="them">Need my driveway and patio done. How soon can you look?</Bubble>
          </div>
        </Card>

        {/* REVIEWS */}
        <Card span="lg:col-span-2" headline="Reviews, without you asking." worth="What closes quotes">
          <div className="rounded-lg border border-white/[0.09] bg-[#17181C] px-3 py-2.5">
            <Stars n={5} />
            <p className="mt-1 text-[11.5px] leading-[1.45] text-[#E8E4D8]">
              “Showed up when they said. House looks new again.”
            </p>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between rounded-lg border border-[#4ADE80]/20 bg-[#4ADE80]/[0.06] px-3 py-2.5">
            <span className="text-[11.5px] text-[#C5C5C8]">This month</span>
            <span className="text-[20px] font-bold leading-none text-[#4ADE80]">
              <CountUp to={4} prefix="+" />
            </span>
          </div>
        </Card>

        {/* FOLLOW-UP */}
        <Card span="lg:col-span-2" headline="No lead goes cold." worth="Most jobs die in silence">
          <ol className="space-y-2">
            {[
              { w: 'Right away', t: 'Text — “Got your request”', done: true },
              { w: 'Day 2', t: 'Email — the job and your pricing', done: true },
              { w: 'Day 5', t: 'Text — “Still want that quote?”', done: false },
            ].map((s) => (
              <li key={s.w} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                    s.done ? 'bg-[#4ADE80] text-[#0A0A0B]' : 'border border-white/25 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] uppercase tracking-[0.08em] text-[#D4AF37]">
                    {s.w}
                  </span>
                  <span className="block text-[11.5px] leading-[1.4] text-[#E8E4D8]">{s.t}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {/* DASHBOARD */}
        <Card span="lg:col-span-2" headline="Check my work any time." worth="No report to wait for">
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'Calls', v: 18 },
              { k: 'Forms', v: 7 },
              { k: 'Won', v: 4 },
            ].map((m) => (
              <div
                key={m.k}
                className="rounded-lg border border-white/[0.08] bg-[#17181C] px-2 py-2.5 text-center"
              >
                <p className="text-[19px] font-bold leading-none text-white">
                  <CountUp to={m.v} />
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.06em] text-[#8A8F98]">{m.k}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 space-y-1.5">
            {[
              { l: 'Foundation', v: 99 },
              { l: 'AI visibility', v: 99 },
            ].map((d) => (
              <div key={d.l} className="flex items-center gap-2">
                <span className="w-[74px] shrink-0 text-[9px] uppercase tracking-[0.06em] text-[#8A8F98]">
                  {d.l}
                </span>
                <GrowBar pct={d.v} />
                <span className="font-mono text-[10px] text-[#4ADE80]">{d.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
