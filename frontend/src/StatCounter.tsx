/**
 * StatCounter — animates a number from 0 → target when it scrolls into view.
 *
 * Design notes:
 * - Initial rendered text is the FINAL value, so prerender / no-JS / crawlers
 *   always see the real number (never a frozen "0").
 * - On the client, the first time the element enters the viewport it counts up.
 *   The brief target→0 reset is masked by the parent `.reveal` opacity fade, so
 *   the eye only ever sees the count-up.
 * - Reduced-motion users skip the animation entirely and keep the final value.
 * - The number sits in a fixed-height `tabular-nums` span, so counting never
 *   shifts layout (CLS-safe).
 */

import { useEffect, useRef, useState } from 'react';

function fmt(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function StatCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1100,
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState<number>(value); // final value by default
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // keep final value, no animation

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();

        let start: number | null = null;
        setDisplay(0);
        const tick = (t: number) => {
          if (start === null) start = t;
          const p = Math.min(1, (t - start) / durationMs);
          // easeOutCubic — fast then settle
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
          else setDisplay(value);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {fmt(display, decimals)}
      {suffix}
    </span>
  );
}
