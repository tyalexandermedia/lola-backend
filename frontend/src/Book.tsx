/// <reference types="vite/client" />
/**
 * /book — the single conversion endpoint for the "free Growth Call".
 *
 * REUSES the existing GoHighLevel calendar (per docs: prefer existing GHL over
 * custom scheduling). The embed URL is env-driven so Ty can point it at the
 * right calendar without a code change:
 *
 *   VITE_GHL_BOOKING_URL = the public GHL booking-widget URL.
 *
 * Default below is the Ty Alexander Media "20-Min Discovery Call" classic widget
 * (calendar id 5MAMMvBVsluA7U0h5jCn, slug tam-discovery-call). If the account
 * serves the newer "neo" widget, switch the env to the slug form:
 *   https://api.leadconnectorhq.com/widget/bookings/tam-discovery-call
 *
 * Safe-by-default: if the env is blank the iframe is not rendered and the page
 * degrades to a "text/call Ty to grab a slot" card — it never shows a broken
 * embed. A text fallback sits under the calendar either way, so there is always
 * a path to a human.
 */
import { useEffect } from 'react';
import { FOUNDER } from './lib/lola';
import { startSmsHref } from './lib/checkout';

const DEFAULT_BOOKING_URL =
  'https://api.leadconnectorhq.com/widget/booking/5MAMMvBVsluA7U0h5jCn';

const BOOKING_URL =
  (import.meta.env.VITE_GHL_BOOKING_URL as string | undefined)?.trim() || DEFAULT_BOOKING_URL;

export default function Book() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Book a free Growth Call — Coach Ty Leads';
    // GHL's embed script auto-resizes the booking iframe to its content height.
    // Best-effort: if it's blocked or fails, the iframe keeps its min-height and
    // still works. Appended once; guarded so React StrictMode double-mount or a
    // re-render doesn't stack copies.
    const SRC = 'https://link.msgsndr.com/js/embed.js';
    let added = false;
    if (BOOKING_URL && !document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      document.body.appendChild(s);
      added = true;
    }
    return () => {
      document.title = prev;
      if (added) document.querySelector(`script[src="${SRC}"]`)?.remove();
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          Free Growth Call · 1-on-1 with Ty
        </p>
        <h1
          className="mx-auto mt-4 max-w-[640px] text-balance font-display font-bold leading-[1.05] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3rem)' }}
        >
          Book a free call. Leave with your next two moves.
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
          A quick, no-pitch call with Ty — we'll walk through what your Growth Score
          means for your business and the two highest-priority things to fix. Come with
          questions; leave with a plan, whether or not you ever hire me.
        </p>
      </section>

      {/* Calendar */}
      <section className="mt-10">
        {BOOKING_URL ? (
          <div className="mx-auto max-w-[760px] overflow-hidden rounded-2xl border border-ink/12 bg-surface shadow-lift">
            <iframe
              src={BOOKING_URL}
              title="Book a free Growth Call with Coach Ty"
              loading="lazy"
              className="w-full"
              style={{ minHeight: '760px', border: 'none', display: 'block', background: 'transparent' }}
              scrolling="no"
            />
          </div>
        ) : (
          <BookingFallback />
        )}

        {/* A path to a human always sits under the calendar. */}
        <p className="mx-auto mt-6 max-w-[560px] text-center text-[13.5px] leading-[1.6] text-ink-3">
          Calendar not loading, or want to pick a time by text?{' '}
          <a
            href={startSmsHref(`Hi ${FOUNDER.knownAs} — I'd like to book a free Growth Call.`)}
            className="font-semibold text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
          >
            Text {FOUNDER.knownAs} at {FOUNDER.phoneDisplay}
          </a>{' '}
          and we'll grab a slot.
        </p>
      </section>

      {/* Reassurance */}
      <section className="mx-auto mt-12 max-w-[640px]">
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['No pitch', 'A working call, not a sales ambush.'],
            ['You talk to Ty', 'The person who does the work — not a setter.'],
            ['One trade per area', 'If I take your competitor, I can’t take you.'],
          ].map(([h, d]) => (
            <li key={h} className="rounded-xl border border-ink/10 bg-surface-2 p-4 text-left">
              <p className="text-[13px] font-bold text-ink">{h}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-3">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-[12px] font-bold uppercase tracking-[0.22em] text-ink-4">
          Get found. Get called. Get booked.
        </p>
      </section>
    </main>
  );
}

function BookingFallback() {
  return (
    <div className="mx-auto max-w-[560px] rounded-2xl border border-gold/30 bg-surface p-7 text-center shadow-lift">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Grab a slot</p>
      <h2 className="mt-3 font-display text-[22px] font-bold text-ink">Text Ty to book your call</h2>
      <p className="mx-auto mt-3 max-w-[420px] text-[14.5px] leading-[1.6] text-ink-2">
        Send a text with your business name and the days that work for you, and Ty will
        lock in a time.
      </p>
      <a
        href={startSmsHref(`Hi ${FOUNDER.knownAs} — I'd like to book a free Growth Call.`)}
        className="group mt-6 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-7 py-3 text-[15px] font-bold text-on-gold shadow-glow transition-all duration-200 hover:bg-right active:scale-[0.99]"
      >
        Text {FOUNDER.knownAs} at {FOUNDER.phoneDisplay}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    </div>
  );
}
