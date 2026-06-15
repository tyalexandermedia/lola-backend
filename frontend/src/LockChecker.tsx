/// <reference types="vite/client" />
/**
 * LockChecker — live Local Lock availability widget.
 *
 * Reads the PUBLIC GET /locks/check endpoint (no admin gate). User enters
 * niche + city; widget shows real availability from the local_locks table.
 * This turns the structural moat (DB-level lock uniqueness) into a visible
 * conversion lever — true urgency from true data, never fabricated.
 *
 * Designed as a drop-in. Reused on Pricing (between tier cards and FAQ)
 * and Homepage (after the industries grid). Variant prop swaps headings
 * for context.
 */

import { useState } from 'react';
import { API_URL } from './api';
import { track } from './analytics';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const NICHES = [
  { v: 'soft wash', l: 'Pressure Washing' },
  { v: 'plumbing', l: 'Plumbing' },
  { v: 'hvac', l: 'HVAC' },
  { v: 'roofing', l: 'Roofing' },
  { v: 'pool service', l: 'Pool Service' },
  { v: 'electrical', l: 'Electrical' },
  { v: 'lawn care', l: 'Lawn Care' },
  { v: 'cleaning', l: 'Cleaning' },
  { v: 'med spa', l: 'Med Spa' },
  { v: 'salon', l: 'Salon / Barber' },
  { v: 'auto detailing', l: 'Auto Detailing' },
  { v: 'other', l: 'Other local service' },
] as const;

type Status = 'idle' | 'checking' | 'available' | 'locked' | 'error';

interface LockCheckResponse {
  niche: string;
  city: string;
  available: boolean;
  tier: string | null;
}

export interface LockCheckerProps {
  variant?: 'full' | 'compact';   // 'compact' = no headline, no description
  defaultCity?: string;
  defaultNiche?: string;
}

export default function LockChecker({ variant = 'full', defaultCity = '', defaultNiche = '' }: LockCheckerProps) {
  const [niche, setNiche] = useState(defaultNiche);
  const [city, setCity] = useState(defaultCity);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<LockCheckResponse | null>(null);

  const check = async () => {
    if (!niche || city.trim().length < 2) return;
    setStatus('checking');
    setResult(null);
    track('lock_check_submitted', { niche, city: city.trim() });
    try {
      const q = new URLSearchParams({ niche, city: city.trim() });
      const r = await fetch(`${API_URL}/locks/check?${q.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: LockCheckResponse = await r.json();
      setResult(data);
      setStatus(data.available ? 'available' : 'locked');
      track('lock_check_result', { niche, city: city.trim(), available: data.available ? 1 : 0 });
    } catch {
      setStatus('error');
    }
  };

  const callHref = (() => {
    const utm = new URLSearchParams({
      utm_source: 'lock_checker',
      utm_medium: 'widget',
      utm_campaign: status === 'available' ? 'claim' : 'adjacent',
      utm_content: `${niche || 'unset'}_${(city || 'unset').replace(/\s+/g, '_')}`,
    });
    return `${CALENDAR_URL}${CALENDAR_URL.includes('?') ? '&' : '?'}${utm.toString()}`;
  })();

  const isFull = variant === 'full';

  return (
    <section
      className={
        isFull
          ? 'mt-16 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.06] via-transparent to-transparent p-6 sm:mt-20 sm:p-8'
          : 'rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-5 sm:p-6'
      }
    >
      {isFull && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            🔒 Live availability
          </p>
          <h2
            className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
          >
            Is your Local Lock still open?
          </h2>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
            Pick your niche and city — we&apos;ll check the live Lock database. If your
            market is open, you can claim it. If a direct competitor already locked
            it, we&apos;ll help you find the next-best adjacent market.
          </p>
        </>
      )}

      <div className={isFull ? 'mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]' : 'grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]'}>
        <div>
          <label htmlFor="lc-niche" className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
            Niche
          </label>
          <select
            id="lc-niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="mt-2 h-12 w-full appearance-none rounded-[10px] border border-[#D4AF37]/30 bg-[#0F0F12] px-3 text-[14px] font-medium text-white outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23D4AF37' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '34px',
            }}
          >
            <option value="">Pick a niche…</option>
            {NICHES.map((n) => (
              <option key={n.v} value={n.v}>{n.l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lc-city" className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
            City / market
          </label>
          <input
            id="lc-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Tampa, FL"
            autoComplete="address-level2"
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            className="mt-2 h-12 w-full rounded-[10px] border border-[#D4AF37]/30 bg-[#0F0F12] px-3 text-[14px] font-medium text-white outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={check}
            disabled={!niche || city.trim().length < 2 || status === 'checking'}
            className="h-12 w-full whitespace-nowrap rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.32)] transition-all hover:bg-right disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto"
          >
            {status === 'checking' ? 'Checking…' : 'Check Lock'}
          </button>
        </div>
      </div>

      {/* Result panel */}
      {status === 'available' && result && (
        <div className="mt-5 flex flex-col gap-3 rounded-[12px] border border-emerald-500/40 bg-emerald-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              🔓 Available
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">
              The <span className="text-emerald-300">{niche}</span> Lock for{' '}
              <span className="text-emerald-300">{city}</span> is open.
            </p>
            <p className="mt-1 text-[12px] text-[#C5C5C8]">
              Book the call and we&apos;ll claim it for you — same-day reservation.
            </p>
          </div>
          <a
            href={callHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('lock_check_cta_clicked', { niche, city, kind: 'claim' })}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.32)] transition-all hover:scale-[1.02]"
          >
            Claim this Lock →
          </a>
        </div>
      )}

      {status === 'locked' && result && (
        <div className="mt-5 flex flex-col gap-3 rounded-[12px] border border-[#F59E0B]/40 bg-[#F59E0B]/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F59E0B]">
              🔒 Already locked
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">
              The <span className="text-[#F4D47C]">{niche}</span> Lock for{' '}
              <span className="text-[#F4D47C]">{city}</span> is claimed.
            </p>
            <p className="mt-1 text-[12px] text-[#C5C5C8]">
              Book a call and we&apos;ll point you to the closest open market — or notice-list
              you for when this Lock opens.
            </p>
          </div>
          <a
            href={callHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('lock_check_cta_clicked', { niche, city, kind: 'adjacent' })}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#D4AF37]/40 bg-white/[0.02] px-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition-all hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.08]"
          >
            Find an adjacent market →
          </a>
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 text-[12px] text-[#E5A95B]">
          Couldn&apos;t reach the lock service. Try again, or just book a call and Coach Ty will check it live.
        </p>
      )}
    </section>
  );
}
