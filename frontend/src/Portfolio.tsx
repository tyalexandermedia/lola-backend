/**
 * Portfolio — "the work" proof section.
 *
 * Renders a grid of real sites Lola built (from lib/portfolio.ts). Preview is
 * SCREENSHOT-first, because many client hosts block being embedded in a frame
 * (X-Frame-Options / CSP), which made live <iframe> previews render blank.
 *
 * Per card:
 *  - If a screenshot exists (site.thumb, or the build-time capture at
 *    /images/work/<host>.jpg), the card shows it and "Preview" opens a modal
 *    you can scroll through — the full-page screenshot of the real site.
 *  - If no screenshot loads, the card falls back to a clean branded tile and
 *    the click opens the real live site in a new tab. Never a blank box.
 *
 * Reusable: drop <Portfolio /> on any page. Auto-hides when the list is empty.
 */

import { useCallback, useEffect, useState } from 'react';
import { PORTFOLIO, displayHost, type PortfolioSite } from './lib/portfolio';
import { track } from './analytics';

const DOTS = ['#FF5F57', '#FEBC2E', '#28C840'] as const;

/**
 * Screenshot path for a site. Use site.thumb, or drop an image at
 * /public/images/work/<host>.jpg (host with dots → dashes, e.g.
 * sandbarsoftwash-com.jpg). Missing image → card falls back to a branded tile.
 */
function screenshotSrc(site: PortfolioSite): string {
  if (site.thumb) return site.thumb;
  const slug = displayHost(site.url).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `/images/work/${slug}.jpg`;
}

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

function BrandedTile({ name, host }: { name: string; host: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
      <span aria-hidden className="text-[26px]">🐾</span>
      <span className="bg-gradient-to-br from-[#FFD166] to-[#D4AF37] bg-clip-text text-[18px] font-bold text-transparent">
        {name}
      </span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#8A8F98]">{host}</span>
    </div>
  );
}

function Card({ site, onOpen }: { site: PortfolioSite; onOpen: (s: PortfolioSite) => void }) {
  const host = displayHost(site.url);
  const [shotOk, setShotOk] = useState(true);
  const shot = screenshotSrc(site);

  const handleClick = () => {
    if (shotOk) {
      onOpen(site);
    } else {
      track('portfolio_open_live', { site: site.name, where: 'card_fallback' });
      window.open(site.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 hover:shadow-[0_10px_32px_rgba(0,0,0,0.4)]">
      <BrowserBar host={host} />

      <button
        type="button"
        onClick={handleClick}
        aria-label={shotOk ? `Preview ${site.name}` : `Open ${site.name} live`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#101014] to-[#17171b] text-left"
      >
        {/* Branded tile is always the base — no broken/blank state possible */}
        <BrandedTile name={site.name} host={host} />

        {/* Screenshot on top; hides itself if it fails to load */}
        {shotOk && (
          <img
            src={shot}
            alt={`${site.name} website`}
            loading="lazy"
            onError={() => setShotOk(false)}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}

        <span className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 bg-gradient-to-t from-[#0A0A0B]/90 to-transparent py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#D4AF37] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {shotOk ? '▶ Scroll through it' : 'Visit live site ↗'}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#D4AF37]">
            {site.vertical}
          </span>
          {site.location && <span className="text-[11px] text-[#8A8F98]">{site.location}</span>}
        </div>
        <p className="mt-2 text-[16px] font-bold text-white">{site.name}</p>
        {site.blurb && <p className="mt-1 text-[13px] leading-[1.5] text-[#C5C5C8]">{site.blurb}</p>}
        <div className="mt-4 flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleClick}
            className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:text-[#F4D47C]"
          >
            {shotOk ? 'Preview →' : 'Visit site ↗'}
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
  const host = displayHost(site.url);
  const shot = screenshotSrc(site);

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

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#0A0A0B]/92 p-3 backdrop-blur-[6px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${site.name}`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-3 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{site.name}</p>
          <p className="truncate text-[12px] text-[#8A8F98]">{host}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Framed, scrollable full-page screenshot */}
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <BrowserBar host={host} compact />
          <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
            <img src={shot} alt={`${site.name} — full page`} className="block w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({
  title = 'Real sites. Real businesses. Built by Lola.',
  eyebrow = 'The work',
  subhead = 'Not mockups — live sites, ranking for the searches that bring their owners real jobs. Tap any one to take a look.',
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
