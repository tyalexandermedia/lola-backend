/**
 * WHAT IT LOOKS LIKE — one visual demo per feature, tabbed.
 *
 * The monthly deliverables were a column of ticked labels. "Automatic review
 * requests" as a line of text is indistinguishable from filler; the same claim
 * as a picture of the text your customer receives is a product. Every feature
 * here gets the treatment the missed-call bubble got in the hero.
 *
 * Two deliberate implementation choices:
 *
 *   1. EVERY PANEL IS IN THE DOM. Inactive ones carry the `hidden` attribute
 *      rather than being unmounted, so all seven features' copy is in the
 *      prerendered HTML and readable by Google and by the AI crawlers this
 *      business sells visibility into. Rendering only the active tab would put
 *      six sevenths of the page's most concrete selling copy behind a click no
 *      crawler performs.
 *
 *   2. REAL TABS, NOT DIVS. role=tablist/tab/tabpanel with arrow-key roving
 *      focus, so this works on a keyboard and announces correctly. A contractor
 *      on a phone taps; someone comparing vendors at a desk may not.
 *
 * Every demo is labelled "Example". These are illustrations of what the
 * feature produces, not screenshots of a client's account, and the badge means
 * nobody can mistake one for a testimonial or a real result.
 */

import { useRef, useState, type ReactNode } from 'react';

interface Feature {
  id: string;
  tab: string;
  icon: string;
  /** The payoff, in one short line. Never a description of the mechanism. */
  headline: string;
  /** Two-to-four words naming what it's worth. Sits in a gold pill. */
  worth: string;
  demo: ReactNode;
}

/* ── shared demo furniture ─────────────────────────────────────────────── */

function Bubble({ side, children }: { side: 'them' | 'you'; children: ReactNode }) {
  return (
    <div className={`flex ${side === 'you' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          side === 'you'
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#2C6BED] px-3.5 py-2.5 text-[12.5px] leading-[1.45] text-white'
            : 'max-w-[88%] rounded-2xl rounded-bl-sm border border-white/[0.09] bg-[#17181C] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-[#E8E4D8]'
        }
      >
        {children}
      </div>
    </div>
  );
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} className="text-[12px] tracking-[0.08em] text-[#F4D47C]">
      {'★'.repeat(n)}
      <span className="text-white/20">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/* ── the seven ─────────────────────────────────────────────────────────── */

const FEATURES: ReadonlyArray<Feature> = [
  {
    id: 'website',
    tab: 'Your website',
    icon: '🌐',
    headline: 'A $3,000 website. Included.',
    worth: 'No setup fee',
    demo: (
      <div className="overflow-hidden rounded-lg border border-white/[0.1] bg-[#0B0B0D]">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] bg-[#17181C] px-3 py-2">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          </span>
          <span className="ml-1 truncate rounded bg-[#0B0B0D] px-2 py-0.5 text-[10px] text-[#8A8F98]">
            yourcompany.com
          </span>
        </div>
        <div className="px-4 py-4">
          <p className="text-[15px] font-bold leading-[1.2] text-white">
            Soft Washing in Dunedin, FL
          </p>
          <p className="mt-1 text-[11.5px] text-[#9AA0A6]">Licensed &amp; insured · Free quotes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-[#D4AF37] px-3 py-1.5 text-[11px] font-bold text-[#0A0A0B]">
              Call now
            </span>
            <span className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-[#C5C5C8]">
              Get a quote
            </span>
          </div>
          <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#4ADE80]">
              ✓ Readable by machines
            </p>
            <p className="font-mono text-[10px] leading-[1.5] text-[#8A8F98]">
              LocalBusiness · areaServed: Dunedin · service: Soft Washing
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ai',
    tab: 'AI answers',
    icon: '✦',
    headline: 'Named when they ask ChatGPT.',
    worth: 'Nobody else does this',
    demo: (
      <div className="space-y-2.5">
        {[
          { engine: 'ChatGPT', dot: '#4ADE80', named: true },
          { engine: 'Claude', dot: '#4ADE80', named: true },
          { engine: "Google AI", dot: '#F4D47C', named: false },
        ].map((r) => (
          <div
            key={r.engine}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.09] bg-[#17181C] px-3.5 py-2.5"
          >
            <span className="flex items-center gap-2 text-[12.5px] text-[#E8E4D8]">
              <span aria-hidden style={{ color: r.dot }}>✦</span>
              {r.engine}
            </span>
            <span
              className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                r.named ? 'text-[#4ADE80]' : 'text-[#F4D47C]'
              }`}
            >
              {r.named ? 'Names you' : 'Working on it'}
            </span>
          </div>
        ))}
        <p className="pt-1 text-[11.5px] leading-[1.5] text-[#8A8F98]">
          Re-checked every month. You see the same board I do.
        </p>
      </div>
    ),
  },
  {
    id: 'gbp',
    tab: 'Google Business',
    icon: '📍',
    headline: 'First in the map pack.',
    worth: 'Half your local leads',
    demo: (
      <div className="overflow-hidden rounded-lg border border-white/[0.1] bg-[#0B0B0D]">
        <p className="border-b border-white/[0.08] bg-[#17181C] px-3.5 py-2 text-[10px] uppercase tracking-[0.08em] text-[#8A8F98]">
          soft wash near me
        </p>
        <ol className="divide-y divide-white/[0.06]">
          {[
            { rank: 1, name: '[Your Company]', stars: 5, n: 47, you: true },
            { rank: 2, name: 'Competitor Exteriors', stars: 4, n: 22, you: false },
            { rank: 3, name: 'Bay Area Wash Co.', stars: 4, n: 11, you: false },
          ].map((b) => (
            <li
              key={b.rank}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${b.you ? 'bg-[#4ADE80]/[0.07]' : ''}`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  b.you ? 'bg-[#4ADE80] text-[#0A0A0B]' : 'bg-white/10 text-[#8A8F98]'
                }`}
              >
                {b.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[12.5px] ${b.you ? 'font-semibold text-white' : 'text-[#9AA0A6]'}`}
                >
                  {b.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Stars n={b.stars} />
                  <span className="text-[10px] text-[#8A8F98]">({b.n})</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: 'missed-call',
    tab: 'Missed-call text-back',
    icon: '📲',
    headline: "You can't answer. It answers.",
    worth: 'Covers the month',
    demo: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-[#E5534B]/25 bg-[#E5534B]/[0.07] px-3.5 py-2.5">
          <span aria-hidden className="text-[13px]">📞</span>
          <span className="text-[12.5px] text-[#E8E4D8]">Missed call · (727) 555-0142</span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.08em] text-[#E5534B]">
            9:14 am
          </span>
        </div>
        <Bubble side="you">
          Sorry we missed your call — this is [Your Company]. What can we quote for you?
        </Bubble>
        <p className="text-right text-[10px] text-[#8A8F98]">Sent 9:14 am · from your number</p>
        <Bubble side="them">Hey! Need my driveway and patio done. How soon can you look?</Bubble>
      </div>
    ),
  },
  {
    id: 'reviews',
    tab: 'Review requests',
    icon: '⭐',
    headline: 'Reviews, without you asking.',
    worth: 'What closes quotes',
    demo: (
      <div className="space-y-2.5">
        <Bubble side="you">
          Thanks again! If we did right by you, would you mind leaving a quick Google review? Takes
          30 seconds 🙏
        </Bubble>
        <div className="rounded-lg border border-white/[0.09] bg-[#17181C] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <Stars n={5} />
            <span className="text-[10px] text-[#8A8F98]">Google review</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.5] text-[#E8E4D8]">
            “Showed up when they said, house looks new again. Would use again.”
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#4ADE80]/20 bg-[#4ADE80]/[0.06] px-3.5 py-2.5">
          <span className="text-[12px] text-[#C5C5C8]">Reviews this month</span>
          <span className="text-[13px] font-bold text-[#4ADE80]">+4</span>
        </div>
      </div>
    ),
  },
  {
    id: 'follow-up',
    tab: 'Lead follow-up',
    icon: '🔁',
    headline: 'No lead goes cold.',
    worth: 'Most jobs die in silence',
    demo: (
      <ol className="space-y-2.5">
        {[
          { when: 'Right away', what: 'Text — “Got your request, when works for a look?”', done: true },
          { when: 'Day 2', what: 'Email — what the job involves, and your pricing', done: true },
          { when: 'Day 5', what: 'Text — “Still want that quote?”', done: false },
        ].map((s) => (
          <li
            key={s.when}
            className="flex items-start gap-3 rounded-lg border border-white/[0.09] bg-[#17181C] px-3.5 py-2.5"
          >
            <span
              aria-hidden
              className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                s.done ? 'bg-[#4ADE80] text-[#0A0A0B]' : 'border border-white/25 text-transparent'
              }`}
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">
                {s.when}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[#E8E4D8]">
                {s.what}
              </span>
            </span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: 'dashboard',
    tab: 'Your dashboard',
    icon: '📊',
    headline: 'Check my work any time.',
    worth: 'No report to wait for',
    demo: (
      <div className="overflow-hidden rounded-lg border border-white/[0.1] bg-[#0B0B0D]">
        <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-b border-white/[0.07]">
          {[
            { k: 'Calls', v: '18' },
            { k: 'Quote forms', v: '7' },
            { k: 'Won jobs', v: '4' },
          ].map((m) => (
            <div key={m.k} className="px-3 py-3 text-center">
              <p className="text-[20px] font-bold leading-none text-white">{m.v}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.06em] text-[#8A8F98]">{m.k}</p>
            </div>
          ))}
        </div>
        <div className="px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[#D4AF37]">Shipped this month</p>
          <ul className="mt-2 space-y-1.5">
            {['Roof-cleaning page built', 'Google Business posts ×4', 'Review engine switched on'].map(
              (w) => (
                <li key={w} className="flex items-start gap-2 text-[12px] leading-[1.4] text-[#C5C5C8]">
                  <span aria-hidden className="mt-[2px] text-[10px] text-[#4ADE80]">✓</span>
                  {w}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    ),
  },
];

export default function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving focus: ←/→ move between tabs, Home/End jump to the ends. Without
  // this a keyboard user tabs through seven controls to reach the last panel.
  function onKeyDown(e: React.KeyboardEvent) {
    const last = FEATURES.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="mt-14 sm:mt-20">
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#D4AF37]">What it looks like</p>
      <h2 className="mt-3 max-w-[720px] text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[40px]">
        Not a list of features. Here&apos;s what actually lands.
      </h2>
      <p className="mt-3 text-[14px] text-[#8A8F98]">Tap any one to see it.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] lg:gap-10">
        {/* TABS — vertical list on desktop, horizontal scroller on a phone. */}
        <div
          role="tablist"
          aria-label="What you get every month"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {FEATURES.map((f, i) => {
            const on = i === active;
            return (
              <button
                key={f.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`feat-tab-${f.id}`}
                aria-selected={on}
                aria-controls={`feat-panel-${f.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className={`relative flex min-h-[48px] shrink-0 snap-start items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg px-4 py-3 text-left text-[13.5px] font-semibold transition-all duration-200 lg:w-full lg:whitespace-normal ${
                  on
                    ? 'bg-gradient-to-r from-[#D4AF37]/[0.14] to-transparent text-white shadow-[inset_2px_0_0_#D4AF37] lg:translate-x-0.5'
                    : 'text-[#8A8F98] hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <span aria-hidden className="text-[14px]">
                  {f.icon}
                </span>
                {f.tab}
              </button>
            );
          })}
        </div>

        {/* PANELS — all seven rendered; inactive ones hidden, not unmounted, so
            every word is in the prerendered HTML for crawlers. */}
        <div>
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              role="tabpanel"
              id={`feat-panel-${f.id}`}
              aria-labelledby={`feat-tab-${f.id}`}
              hidden={i !== active}
              className="overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#131316] to-[#0B0B0D] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
            >
              {/* The payoff, then what it's worth. No explanatory paragraph —
                  the demo underneath explains it better than a sentence can,
                  and a paragraph here just delayed reaching the picture. */}
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
                <div className="min-w-0">
                  <h3 className="text-balance font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-[27px]">
                    {f.headline}
                  </h3>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#F4D47C]">
                    {f.worth}
                  </span>
                </div>
                {/* These illustrate what the feature produces — they are not a
                    client's screenshots. The badge stops any of them being
                    mistaken for a testimonial or a real result. */}
                <span className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#6B7280]">
                  Example
                </span>
              </div>
              {/* The demo is the point, so it gets the room and the light. */}
              <div className="bg-[#08080A]/60 px-5 py-6 sm:px-6">{f.demo}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
