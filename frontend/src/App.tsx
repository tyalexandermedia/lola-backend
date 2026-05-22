/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import AuditFlow, { API_URL } from './AuditFlow';
import SharedReport from './SharedReport';
import AdminLeads from './AdminLeads';
import type { HealthResponse } from './types';

type Route =
  | { name: 'audit' }
  | { name: 'report'; auditId: string }
  | { name: 'admin' }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'audit' };
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
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Header />
      <div
        className={`mx-auto flex flex-col px-5 pt-10 pb-20 sm:px-6 ${
          route.name === 'report' || route.name === 'admin'
            ? 'max-w-[1280px]'
            : 'max-w-[640px]'
        }`}
      >
        {degraded.length > 0 && <ApiDegradedBanner />}

        {route.name === 'audit' && <AuditFlow />}
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
    <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0A0A0B]/80 backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[640px] items-center justify-between px-5 py-6 sm:px-6">
        <a
          href="/"
          className="text-[14px] font-bold uppercase tracking-[0.15em] text-[#D4AF37]"
        >
          LOLA SEO
        </a>
        <span className="hidden text-[12px] font-medium uppercase tracking-[0.18em] text-[#8A8F98] sm:inline">
          Home services audit
        </span>
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
