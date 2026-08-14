/**
 * Draggable before/after image comparison slider.
 *
 * Pointer + touch + keyboard driven (the handle is a slider role with arrow
 * keys), no animation loops so it's reduced-motion safe by construction, and
 * both images are lazy-loaded. The "after" image sits on top and is revealed
 * by clipping — the images never reflow, so dragging causes zero CLS.
 */

import { useCallback, useRef, useState } from 'react';

type Props = {
  before: string;
  after: string;
  /** Accessible description of the scene shared by both frames. */
  alt: string;
};

export default function BeforeAfterSlider({ before, after, alt }: Props) {
  const [pct, setPct] = useState(50);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next = ((clientX - r.left) / r.width) * 100;
    setPct(Math.min(100, Math.max(0, next)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPct((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPct((p) => Math.min(100, p + 5));
  };

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[4/3] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[12px] border border-white/[0.08]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={before}
        alt={`Before: ${alt}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* After frame, revealed left-of-handle via clip so nothing reflows. */}
      <img
        src={after}
        alt={`After: ${alt}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        draggable={false}
      />

      {/* Divider + grab handle (44px hit target for touch). */}
      <div
        role="slider"
        aria-label={`Reveal after photo: ${alt}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute top-0 h-full w-11 -translate-x-1/2 outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70"
        style={{ left: `${pct}%` }}
      >
        <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#D4AF37]" />
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/60 bg-[#0A0A0B]/85 text-[13px] font-bold text-[#D4AF37] shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          ⇔
        </div>
      </div>

      <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-[#0A0A0B]/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
        Before
      </span>
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[#0A0A0B]/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
        After
      </span>
    </div>
  );
}
