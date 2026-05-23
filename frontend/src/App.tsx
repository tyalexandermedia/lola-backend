/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import AuditFlow, { API_URL } from './AuditFlow';
import SharedReport from './SharedReport';
import AdminLeads from './AdminLeads';
import Homepage from './Homepage';
import PricingPage from './PricingPage';
import type { HealthResponse } from './types';

type Route =
  | { name: 'home' }
  | { name: 'audit' }
  | { name: 'pricing' }
  | { name: 'report'; auditId: string }
  | { name: 'admin' }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' };
  if (pathname === '/audit' || pathname === '/audit/') return { name: 'audit' };
  if (pathname === '/pricing' || pathname === '/pricing/') return { name: 'pricing' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  const reportMatch = pathname.match(/^\/r\/([^/]+)\/?$/);
  if (reportMatch) return { name: 'report', auditId: decodeURIComponent(reportMatch[1]) };
  return { name: 'unknown' };
}

function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {
        /* silent — banner only shows on positive signal */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const degraded = useMemo(() => detectDegradedApis(health), [health]);

  return (
    <div className="min-h-screen scroll-smooth bg-[#0A0A0B] text-white">
      <Header />
      <div
        className={`mx-auto flex flex-col px-5 pb-20 sm:px-6 ${
          route.name === 'report' || route.name === 'admin'
            ? 'max-w-[1280px] pt-8 sm:pt-12'
            : route.name === 'home' || route.name === 'pricing'
            ? 'max-w-[1120px] pt-8 sm:pt-12'
            : 'max-w-[640px] pt-8 sm:pt-10'
        }`}
      >
        {/* Banner moved OUT of the top of the page — now rendered as a
            collapsible accordion at the bottom of the results page. Keeps the
            hero clean and trustworthy. Only audit/admin/notfound routes still
            show it inline if degraded; home/pricing/report handle it locally. */}
        {degraded.length > 0 && route.name === 'audit' && <ApiDegradedBanner />}

        {route.name === 'home' && <Homepage />}
        {route.name === 'audit' && <AuditFlow />}
        {route.name === 'pricing' && <PricingPage />}
        {route.name === 'report' && <SharedReport auditId={route.auditId} />}
        {route.name === 'admin' && <AdminLeads />}
        {route.name === 'unknown' && <NotFound />}
      </div>
    </div>
  );
}

function detectDegradedApis(health: HealthResponse | null): string[] {
  if (!health || !health.api_status) return [];
  const out: string[] = [];
  for (const [name, entry] of Object.entries(health.api_status)) {
    if (!entry) continue;
    const okAt = entry.last_ok_at ? Date.parse(entry.last_ok_at) : 0;
    const errAt = entry.last_error_at ? Date.parse(entry.last_error_at) : 0;
    if (errAt && errAt >= okAt) out.push(name);
  }
  return out;
}

function ApiDegradedBanner() {
  return (
    <div className="mb-12 mt-8 flex items-start gap-3 rounded-[12px] border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-5 py-4">
      <span aria-hidden className="mt-0.5 text-[16px] leading-none text-[#FFD166]">⚠</span>
      <div className="text-[14px] leading-[1.55] text-[#C5C5C8]">
        <span className="font-bold text-[#FFD166]">Heads up:</span>{' '}
        Some external data sources are temporarily syncing. Your audit will still run — partial data
        shows as "pending" and will populate within 24 hours.
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#D4AF37]/20 bg-[#0A0A0B]/85 backdrop-blur-[14px]">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-5 sm:h-16 sm:px-6">
        {/* Logo — gold gradient wordmark + paw */}
        <a href="/" className="group flex items-center gap-2" aria-label="Lola SEO — home">
          <span aria-hidden className="text-[16px] leading-none">🐾</span>
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[14px] font-bold uppercase tracking-[0.18em] text-transparent sm:text-[15px]">
            LOLA SEO
          </span>
        </a>

        {/* Right nav */}
        <nav className="flex items-center gap-5 text-[13px] font-medium uppercase tracking-[0.12em] sm:gap-7 sm:text-[13px]">
          <a href="/" className="text-[#C5C5C8] transition hover:text-[#D4AF37]">
            Home
          </a>
          <a href="/audit" className="text-[#C5C5C8] transition hover:text-[#D4AF37]">
            Audit
          </a>
          <a href="/pricing" className="text-[#C5C5C8] transition hover:text-[#D4AF37]">
            Pricing
          </a>
        </nav>
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
      <h2 className="text-2xl font-semibold text-white">No trail here.</h2>
      <p className="mt-3 max-w-md text-base text-[#9AA0A6]">Lola couldn't find a page at this URL.</p>
      <a
        href="/"
        className="mt-8 inline-flex h-14 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] px-8 text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25"
      >
        Back to the audit
      </a>
    </main>
  );
}

export default App;
