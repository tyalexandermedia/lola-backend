/**
 * Portfolio — "the work" proof section.
 *
 * Renders a grid of real sites Lola built (from lib/portfolio.ts). Each card's
 * "Live preview" opens a modal that embeds the actual live site in a browser
 * frame the visitor can scroll through, with a desktop/phone toggle. Every
 * card and the modal also carry an "Open live ↗" link, so a host that blocks
 * framing (X-Frame-Options / CSP frame-ancestors) degrades gracefully to the
 * real site in a new tab instead of a blank box.
 *
 * Reusable: drop <Portfolio /> on any page. Auto-hides when the list is empty.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PORTFOLIO, displayHost, type PortfolioSite } from './lib/portfolio';
import { track } from './analytics';

const DOTS = ['#FF5F57', '#FEBC2E', '#28C840'] as const;

function BrowserBar({ host, compact = false }: { host: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 border-b border-white/[0.08] bg-[#141416] ${
        compact ? 'px-3 py-2' : 'px-4 py-2.5'
      }`}
    >
      <div className="flex gap-1.5">
        {DOTS.map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
        ))}
      </div>
      <div className="ml-1 flex-1 truncate rounded-md bg-[#0A0A0B] px-3 py-1 text-center text-[11px] text-[#8A8F98]">
        {host}
      </div>
    </div>
  );
}

/**
 * LivePreviewThumb — an auto-generated preview of the real site: a desktop
 * render (1280px wide) scaled down to fill the card, mounted only when the
 * card nears the viewport so it never costs first-paint. Non-interactive
 * (pointer-events off, no scroll) — clicking the card opens the full modal.
 *
 * Sits on top of the branded placeholder and fades in on load, so a slow or
 * embed-blocked site simply shows the branded tile instead of a broken box.
 * Skipped entirely during prerender (navigator.webdriver) so the static HTML
 * stays clean and fast.
 */
function LivePreviewThumb({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [width, setWidth] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const isBot =
    typeof navigator !== 'undefined' && (navigator as unknown as { webdriver?: boolean }).webdriver;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const RENDER_W = 1280;
  const RENDER_H = Math.round((RENDER_W * 10) / 16); // match card's 16/10
  const scale = width ? width / RENDER_W : 0;

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      {inView && !isBot && width > 0 && (
        <iframe
          src={url}
          title=""
          tabIndex={-1}
          scrolling="no"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setLoaded(true)}
          style={{
            width: RENDER_W,
            height: RENDER_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 0,
            pointerEvents: 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
      )}
    </div>
  );
}

function Card({ site, onOpen }: { site: PortfolioSite; onOpen: (s: PortfolioSite) => void }) {
  const host = displayHost(site.url);
  return (
    <div className="group flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 hover:shadow-[0_10px_32px_rgba(0,0,0,0.4)]">
      <BrowserBar host={host} />

      {/* Preview well. Layered: a branded placeholder is always the base (so a
          card never looks empty), then either a screenshot (if `thumb` is set)
          or an auto live preview — the real site, scaled, straight from the
          URL — renders on top. */}
      <button
        type="button"
        onClick={() => onOpen(site)}
        aria-label={`Open live preview of ${site.name}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#101014] to-[#17171b] text-left"
      >
        {/* Base placeholder (fallback for slow / blocked / no-JS) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
          <span aria-hidden className="text-[26px]">🐾</span>
          <span className="bg-gradient-to-br from-[#FFD166] to-[#D4AF37] bg-clip-text text-[18px] font-bold text-transparent">
            {site.name}
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#8A8F98]">{host}</span>
        </div>

        {site.thumb ? (
          <img
            src={site.thumb}
            alt={`${site.name} website preview`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <LivePreviewThumb url={site.url} />
        )}

        {/* LIVE badge */}
        <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-[#0A0A0B]/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#D4AF37] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" /> Live
        </span>

        {/* Hover affordance */}
        <span className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 bg-gradient-to-t from-[#0A0A0B]/90 to-transparent py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#D4AF37] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          ▶ Scroll through it
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#D4AF37]">
            {site.vertical}
          </span>
          {site.location && (
            <span className="text-[11px] text-[#8A8F98]">{site.location}</span>
          )}
        </div>
        <p className="mt-2 text-[16px] font-bold text-white">{site.name}</p>
        {site.blurb && (
          <p className="mt-1 text-[13px] leading-[1.5] text-[#C5C5C8]">{site.blurb}</p>
        )}
        <div className="mt-4 flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => onOpen(site)}
            className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:text-[#F4D47C]"
          >
            Live preview →
          </button>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('portfolio_open_live', { site: site.name, where: 'card' })}
            className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#8A8F98] underline-offset-2 transition hover:text-[#D4AF37] hover:underline"
          >
            Open live ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ site, onClose }: { site: PortfolioSite; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const host = displayHost(site.url);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Esc to close + lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // If the frame hasn't reported load in a few seconds, surface the "open
  // live" hint — the host is likely blocking embedding.
  useEffect(() => {
    timer.current = setTimeout(() => setSlow(true), 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#0A0A0B]/92 p-3 backdrop-blur-[6px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Live preview of ${site.name}`}
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{site.name}</p>
          <p className="truncate text-[12px] text-[#8A8F98]">{host}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Device toggle */}
          <div className="hidden items-center rounded-[10px] border border-white/[0.1] bg-white/[0.03] p-0.5 sm:flex">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`rounded-[8px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
                  device === d ? 'bg-[#D4AF37]/[0.14] text-[#D4AF37]' : 'text-[#8A8F98] hover:text-white'
                }`}
              >
                {d === 'desktop' ? '🖥 Desktop' : '📱 Phone'}
              </button>
            ))}
          </div>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('portfolio_open_live', { site: site.name, where: 'modal' })}
            className="inline-flex h-9 items-center rounded-[10px] bg-gradient-to-r from-[#D4AF37] to-[#F4D47C] px-4 text-[12px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B]"
          >
            Open live ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.1] bg-white/[0.03] text-[18px] text-[#C5C5C8] transition hover:border-[#D4AF37]/40 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Framed live preview */}
      <div
        className="mx-auto flex w-full flex-1 justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex w-full flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300 ${
            device === 'mobile' ? 'max-w-[390px]' : 'max-w-[1100px]'
          }`}
        >
          <BrowserBar host={host} compact />
          <div className="relative flex-1 bg-white">
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0F0F12] text-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" style={{ animationDelay: '120ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" style={{ animationDelay: '240ms' }} />
                </div>
                <p className="text-[12px] text-[#8A8F98]">Loading {host}…</p>
                {slow && (
                  <p className="max-w-[280px] px-6 text-[11px] leading-[1.5] text-[#6A6F78]">
                    Taking a while? Some sites block embedding.{' '}
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4AF37] underline-offset-2 hover:underline"
                    >
                      Open it live ↗
                    </a>
                  </p>
                )}
              </div>
            )}
            <iframe
              src={site.url}
              title={`${site.name} — live site`}
              onLoad={() => setLoaded(true)}
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              className="h-full min-h-[60vh] w-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({
  title = 'Real sites. Real businesses. Built by Lola.',
  eyebrow = 'The work',
  subhead = 'Not mockups — live sites, ranking for the searches that bring their owners real jobs. Tap any one to scroll through it.',
  items = PORTFOLIO,
  showHeader = true,
}: {
  title?: string;
  eyebrow?: string;
  subhead?: string;
  items?: PortfolioSite[];
  showHeader?: boolean;
}) {
  const [active, setActive] = useState<PortfolioSite | null>(null);

  const open = useCallback((s: PortfolioSite) => {
    setActive(s);
    track('portfolio_preview_open', { site: s.name });
  }, []);

  if (!items.length) return null;

  return (
    <section id="work" className={`scroll-mt-24 ${showHeader ? 'mt-16 sm:mt-24' : 'mt-8'}`}>
      {showHeader && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">{eyebrow}</p>
          <h2
            className="mt-3 max-w-[760px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
          >
            {title}
          </h2>
          <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">{subhead}</p>
        </>
      )}

      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${showHeader ? 'mt-8' : ''}`}>
        {items.map((s) => (
          <Card key={s.url} site={s} onOpen={open} />
        ))}
      </div>

      {active && <PreviewModal site={active} onClose={() => setActive(null)} />}
    </section>
  );
}
