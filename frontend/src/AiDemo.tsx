/**
 * AiDemo — the signature "agentic" homepage moment.
 *
 * On scroll-in it types out a ChatGPT-style answer that names a business, and
 * ticks a Growth Score ring from 0 → 84. It shows — not tells — the thing Lola
 * sells: being the name the AI tools give when someone asks. Fully
 * prefers-reduced-motion-safe (renders the finished state instantly).
 */

import { useEffect, useRef, useState } from 'react';

const LEAD = "For HVAC in Tampa, I'd go with ";
const NAME = 'Bay Area Air';
const TAIL = ' — strong reviews and they show up the moment you search.';
const FULL = LEAD + NAME + TAIL;
const TARGET = 84;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return reduced;
}

export default function AiDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState(0);
  const [score, setScore] = useState(0);

  // Kick off when the card scrolls into view (or immediately if reduced-motion).
  useEffect(() => {
    if (reduced) {
      setStarted(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!started) return;
    if (reduced) {
      setTyped(FULL.length);
      setScore(TARGET);
      return;
    }
    const typer = setInterval(() => {
      setTyped((n) => {
        if (n >= FULL.length) {
          clearInterval(typer);
          return n;
        }
        return n + 1;
      });
    }, 26);
    const counter = setInterval(() => {
      setScore((s) => {
        if (s >= TARGET) {
          clearInterval(counter);
          return TARGET;
        }
        return Math.min(TARGET, s + 2);
      });
    }, 22);
    return () => {
      clearInterval(typer);
      clearInterval(counter);
    };
  }, [started, reduced]);

  // Typed substring, with the business name highlighted once it's reached.
  const shown = FULL.slice(0, typed);
  const nameStart = LEAD.length;
  const nameEnd = LEAD.length + NAME.length;
  const before = shown.slice(0, Math.min(typed, nameStart));
  const namePart = shown.slice(nameStart, Math.min(typed, nameEnd));
  const after = shown.slice(nameEnd);
  const typing = typed < FULL.length && !reduced;

  // Ring geometry.
  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <section ref={ref} className="mt-16 sm:mt-20">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
        See it work
      </p>
      <h2
        className="mx-auto mt-3 max-w-[680px] text-center font-bold leading-[1.1] tracking-[-0.02em] text-white"
        style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
      >
        When someone asks AI, are you the answer?
      </h2>

      <div className="mx-auto mt-8 grid max-w-[860px] grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-stretch sm:gap-5">
        {/* Chat card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-[#D4AF37]/[0.12] px-4 py-2 text-right text-[14px] text-[#E8E4D8]">
            best HVAC in Tampa?
          </div>
          <div className="mt-4 flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] text-[14px]"
            >
              🐾
            </span>
            <p className="min-h-[3.5em] text-[15px] leading-[1.55] text-white">
              {before}
              <span className="font-bold text-[#D4AF37]">{namePart}</span>
              {after}
              {typing && <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-[#D4AF37] align-middle" />}
            </p>
          </div>
        </div>

        {/* Score ring */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-6 text-center sm:w-[200px]">
          <div className="relative h-[92px] w-[92px]">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="#D4AF37"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{ transition: reduced ? undefined : 'stroke-dashoffset 120ms linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[26px] font-extrabold text-white tabular-nums">{score}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
            Growth Score
          </p>
          <p className="mt-1 text-[12px] leading-[1.5] text-[#9CA3AF]">Your number, live in 60 seconds.</p>
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-[560px] text-center text-[13px] leading-[1.6] text-[#8A8F98]">
        That&apos;s the whole game now — showing up on Google <em>and</em> being the name ChatGPT,
        Perplexity, and Gemini hand your next customer. Your free Growth Score shows where you stand.
      </p>
    </section>
  );
}
