/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import AuditFlow from './AuditFlow';
import SharedReport from './SharedReport';
import AdminLeads from './AdminLeads';
import Homepage from './Homepage';
import PricingPage from './PricingPage';
import RetainerPage from './RetainerPage';
import ApplyPage from './ApplyPage';
import LeadGenGenerator from './LeadGenGenerator';
import SwarmWorkflow from './SwarmWorkflow';
import ClientReport from './ClientReport';
import Grader from './Grader';
import VsPage from './VsPage';
import VsHub from './VsHub';
import Methodology from './Methodology';
import SandbarCaseStudy from './SandbarCaseStudy';

type Route =
  | { name: 'home' }
  | { name: 'audit' }
  | { name: 'grader' }
  | { name: 'methodology' }
  | { name: 'case-study'; slug: string }
  | { name: 'vs-hub' }
  | { name: 'vs'; slug: string }
  | { name: 'pricing' }
  | { name: 'retainer' }
  | { name: 'apply' }
  | { name: 'lead-gen' }
  | { name: 'swarm' }
  | { name: 'report'; auditId: string }
  | { name: 'client-report'; slug: string }
  | { name: 'admin' }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' };
  if (pathname === '/audit' || pathname === '/audit/') return { name: 'audit' };
  if (pathname === '/grader' || pathname === '/grader/') return { name: 'grader' };
  if (pathname === '/methodology' || pathname === '/methodology/') return { name: 'methodology' };
  const caseMatch = pathname.match(/^\/case-studies\/([^/]+)\/?$/);
  if (caseMatch) return { name: 'case-study', slug: decodeURIComponent(caseMatch[1]) };
  if (pathname === '/pricing' || pathname === '/pricing/') return { name: 'pricing' };
  if (pathname === '/retainer' || pathname === '/retainer/') return { name: 'retainer' };
  if (pathname === '/apply' || pathname === '/apply/') return { name: 'apply' };
  if (pathname === '/lead-gen' || pathname === '/lead-gen/') return { name: 'lead-gen' };
  if (pathname === '/swarm' || pathname === '/swarm/') return { name: 'swarm' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  if (pathname === '/vs' || pathname === '/vs/') return { name: 'vs-hub' };
  const vsMatch = pathname.match(/^\/vs\/([^/]+)\/?$/);
  if (vsMatch) return { name: 'vs', slug: decodeURIComponent(vsMatch[1]) };
  const clientReportMatch = pathname.match(/^\/r\/client\/([^/]+)\/?$/);
  if (clientReportMatch) return { name: 'client-report', slug: decodeURIComponent(clientReportMatch[1]) };
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
      : route.name === 'grader'
      ? 'max-w-[820px] pt-6 sm:pt-10'
      : route.name === 'methodology'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'case-study'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'vs' || route.name === 'vs-hub'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'apply'
      ? 'max-w-[720px] pt-8 sm:pt-12'
      : route.name === 'lead-gen'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'swarm'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'client-report'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : 'max-w-[640px] pt-8 sm:pt-10';

  return (
    <div className="min-h-screen scroll-smooth bg-[#0A0A0B] text-white">
      <Header />
      <div className={`mx-auto flex flex-col px-5 pb-20 sm:px-6 ${containerCls}`}>
        {route.name === 'home' && <Homepage />}
        {route.name === 'audit' && <AuditFlow />}
        {route.name === 'grader' && <Grader />}
        {route.name === 'methodology' && <Methodology />}
        {route.name === 'case-study' && route.slug === 'sandbar' && <SandbarCaseStudy />}
        {route.name === 'case-study' && route.slug !== 'sandbar' && <NotFound />}
        {route.name === 'vs' && <VsPage slug={route.slug} />}
        {route.name === 'vs-hub' && <VsHub />}
        {route.name === 'pricing' && <PricingPage />}
        {route.name === 'retainer' && <RetainerPage />}
        {route.name === 'apply' && <ApplyPage />}
        {route.name === 'lead-gen' && <LeadGenGenerator />}
        {route.name === 'swarm' && <SwarmWorkflow />}
        {route.name === 'report' && <SharedReport auditId={route.auditId} />}
        {route.name === 'client-report' && <ClientReport slug={route.slug} />}
        {route.name === 'admin' && <AdminLeads />}
        {route.name === 'unknown' && <NotFound />}
      </div>
      <MobileStickyCTA route={route} />
    </div>
  );
}

/**
 * Mobile-only sticky bottom CTA — two-button strip pinned to the bottom
 * of the viewport on the routes where most cold traffic lands. Hidden on
 * sm+ (desktop already has clear above-fold CTAs). Routes that have their
 * own bottom-of-page submit (Grader, Audit) opt out to avoid double-CTAs.
 *
 * Conversion lift on mobile is typically 15-30% from a persistent CTA
 * vs a single hero-only CTA. Pattern from Podium / Birdeye marketing sites.
 */
function MobileStickyCTA({ route }: { route: Route }) {
  const STICKY_ROUTES = new Set(['home', 'pricing', 'vs', 'vs-hub', 'methodology', 'case-study', 'retainer']);
  if (!STICKY_ROUTES.has(route.name)) return null;

  const calendar =
    (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
    'https://calendar.app.google/J7idjUDitd2Hziuc7';
  const utm = `utm_source=sticky&utm_medium=mobile_bar&utm_campaign=${route.name}`;
  const callHref = `${calendar}${calendar.includes('?') ? '&' : '?'}${utm}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/30 bg-[#0A0A0B]/95 px-3 py-2.5 backdrop-blur-[14px] sm:hidden">
      <div className="mx-auto flex max-w-[640px] gap-2">
        <a
          href="/grader"
          className="flex h-12 flex-1 items-center justify-center rounded-[10px] border border-[#D4AF37]/40 bg-white/[0.02] px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#D4AF37]"
        >
          Free Score
        </a>
        <a
          href={callHref}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 flex-[1.4] items-center justify-center rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#0A0A0B] shadow-[0_4px_14px_rgba(212,175,55,0.35)]"
        >
          Book Free Call →
        </a>
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
          aria-label="Lola — AI Leads Expert — home"
        >
          <span aria-hidden className="text-[16px] leading-none">🐾</span>
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[13px] font-bold uppercase tracking-[0.18em] text-transparent sm:text-[14px]">
            LOLA <span aria-hidden className="text-[#D4AF37]/55">—</span> AI LEADS EXPERT
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
            href="/grader"
            className="flex min-h-[44px] items-center px-3 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37]"
          >
            Free Grader
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
