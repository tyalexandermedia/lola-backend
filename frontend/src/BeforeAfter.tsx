/// <reference types="vite/client" />
/**
 * Sandbar Soft Wash — the old Wix site against the one Ty built.
 *
 * Renders NOTHING until VITE_SHOW_SANDBAR_BEFORE_AFTER=true, so it ships ahead
 * of the screenshots and appears once they're in place. Two files are needed:
 *
 *   frontend/public/images/sandbar-before-wix.jpg   the old Wix site
 *   frontend/public/images/sandbar-after-lola.jpg   the site now
 *
 * Shoot both at the same width, full-page, mobile OR desktop but not one of
 * each — a comparison where the two halves are different shapes reads as a
 * trick even when it isn't.
 *
 * ── Why a range input rather than a drag handle ───────────────────────────
 * The obvious build is a div with pointer events. A range input gets keyboard
 * control, screen-reader announcement and touch handling from the platform for
 * free, and it is the one control every assistive technology already knows how
 * to drive. It's visually hidden and drawn over, not replaced.
 *
 * ── Proof integrity ──────────────────────────────────────────────────────
 * No metric is attached to this. It shows what changed visually, which is what
 * two screenshots can honestly support; anything about traffic or rankings
 * belongs on the live dashboard where it's checkable, and that's what the link
 * underneath is for. D-014 holds invented numbers off this page.
 */

import { useState } from 'react';

const ENABLED =
  (import.meta.env.VITE_SHOW_SANDBAR_BEFORE_AFTER as string | undefined) === 'true';

const BEFORE = '/images/sandbar-before-wix.jpg';
const AFTER = '/images/sandbar-after-lola.jpg';

export default function BeforeAfter() {
  // 50 renders a fair split server-side, so the prerendered HTML shows both.
  const [pos, setPos] = useState(50);
  if (!ENABLED) return null;

  return (
    <div className="mt-9">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-[26px]">
          Same business. Same 15 years of work.
        </h3>
        <span className="text-[12px] text-[#8A8F98]">Drag to compare</span>
      </div>

      <div className="relative mt-4 select-none overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#0B0B0D] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
        {/* AFTER sits underneath at full width; BEFORE is clipped over the top,
            so dragging left reveals more of the new site. */}
        <img
          src={AFTER}
          alt="Sandbar Soft Wash's website as built by Lola Leads"
          className="block w-full"
          width={1200}
          height={900}
          loading="lazy"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
          aria-hidden
        >
          {/* Fixed to the container width so the image doesn't squash as the
              clip narrows — it has to stay pinned to the same pixels. */}
          <img
            src={BEFORE}
            alt=""
            className="block h-full max-w-none object-cover object-left"
            style={{ width: `${(100 / Math.max(pos, 0.001)) * 100}%` }}
          />
        </div>

        {/* seam */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.8)]"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37] bg-[#0A0A0B] text-[12px] text-[#D4AF37]">
            ⇄
          </span>
        </div>

        {/* labels */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#C5C5C8] backdrop-blur-sm">
          Before · Wix
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#4ADE80]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0A0A0B]">
          After · built by Ty
        </span>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Reveal more of the old Wix site or the new one"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.55] text-[#8A8F98]">
        Screenshots of the real site, before and after.{' '}
        <a
          href="/r/client/sandbar"
          className="text-[#D4AF37] underline-offset-4 hover:underline"
        >
          The numbers are on the live dashboard
        </a>{' '}
        — I&apos;m not going to type them at you here.
      </p>
    </div>
  );
}
