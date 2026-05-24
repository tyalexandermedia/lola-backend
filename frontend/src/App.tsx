/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import AuditFlow from './AuditFlow';
import SharedReport from './SharedReport';
import AdminLeads from './AdminLeads';
import Homepage from './Homepage';
import PricingPage from './PricingPage';
import RetainerPage from './RetainerPage';
import ApplyPage from './ApplyPage';

type Route =
  | { name: 'home' }
  | { name: 'audit' }
  | { name: 'pricing' }
  | { name: 'retainer' }
  | { name: 'apply' }
  | { name: 'report'; auditId: string }
  | { name: 'admin' }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' };
  if (pathname === '/audit' || pathname === '/audit/') return { name: 'audit' };
  if (pathname === '/pricing' || pathname === '/pricing/') return { name: 'pricing' };
  if (pathname === '/retainer' || pathname === '/retainer/') return { name: 'retainer' };
  if (pathname === '/apply' || pathname === '/apply/') return { name: 'apply' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  const reportMatch = pathname.match(/^\/r\/([^/]+)\/?$/);
  if (reportMatch) return { name: 'report', auditId: decodeURIComponent(reportMatch[1]) };
  return { name: 'unknown' };
}

function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window !== 'undefined' ? window.location.pathname : '/')
  );

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Tighter top padding on /audit — Step 5 CTA must be above the fold at 375x667.
  // Other routes keep generous breathing room.
  const containerCls =
    route.name === 'report' || route.name === 'admin'
      ? 'max-w-[1280px] pt-8 sm:pt-12'
      : route.name === 'home' || route.name === 'pricing' || route.name === 'retainer'
      ? 'max-w-[1120px] pt-8 sm:pt-12'
      : route.name === 'audit'
      ? 'max-w-[640px] pt-3 sm:pt-6'
      : route.name === 'apply'
      ? 'max-w-[720px] pt-8 sm:pt-12'
      : 'max-w-[640px] pt-8 sm:pt-10';

  return (
    <div className="min-h-screen scroll-smooth bg-[#0A0A0B] text-white">
      <Header />
      <div className={`mx-auto flex flex-col px-5 pb-20 sm:px-6 ${containerCls}`}>
        {route.name === 'home' && <Homepage />}
        {route.name === 'audit' && <AuditFlow />}
        {route.name === 'pricing' && <PricingPage />}
        {route.name === 'retainer' && <RetainerPage />}
        {route.name === 'apply' && <ApplyPage />}
        {route.name === 'report' && <SharedReport auditId={route.auditId} />}
        {route.name === 'admin' && <AdminLeads />}
        {route.name === 'unknown' && <NotFound />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#D4AF37]/20 bg-[#0A0A0B]/85 backdrop-blur-[14px]">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-5 sm:h-16 sm:px-6">
        {/* Logo — gold gradient wordmark + paw */}
        <a
          href="/"
          className="group -mx-2 flex min-h-[44px] items-center gap-2 px-2"
          aria-label="Lola SEO — home"
        >
          <span aria-hidden className="text-[16px] leading-none">🐾</span>
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[14px] font-bold uppercase tracking-[0.18em] text-transparent sm:text-[15px]">
            LOLA SEO
          </span>
        </a>

        {/* Right nav — min-h-[44px] + py-3 ensures WCAG 2.5.5 touch target on mobile */}
        <nav className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] sm:gap-3 sm:text-[13px]">
          <a
            href="/"
            className="flex min-h-[44px] items-center px-3 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37]"
          >
            Home
          </a>
          <a
            href="/audit"
            className="flex min-h-[44px] items-center px-3 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37]"
          >
            Audit
          </a>
          <a
            href="/pricing"
            className="flex min-h-[44px] items-center px-3 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37]"
          >
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
