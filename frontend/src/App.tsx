/// <reference types="vite/client" />
import { useEffect, useState, lazy, Suspense } from 'react';
// Homepage stays eager — primary entry, must paint immediately. Everything
// else is lazy-loaded so the initial bundle stays lean for first-paint /
// Core Web Vitals (LCP). Each lazy import becomes its own JS chunk under
// dist/assets that Vite will only fetch when the route is hit.
import Homepage from './Homepage';
const AuditFlow = lazy(() => import('./AuditFlow'));
const SharedReport = lazy(() => import('./SharedReport'));
const AdminLeads = lazy(() => import('./AdminLeads'));
const AdminCalls = lazy(() => import('./AdminCalls'));
const PricingPage = lazy(() => import('./PricingPage'));
const RetainerPage = lazy(() => import('./RetainerPage'));
const ApplyPage = lazy(() => import('./ApplyPage'));
const LeadGenGenerator = lazy(() => import('./LeadGenGenerator'));
const SwarmWorkflow = lazy(() => import('./SwarmWorkflow'));
const ClientReport = lazy(() => import('./ClientReport'));
const ExecDashboard = lazy(() => import('./ExecDashboard'));
const ClientPortal = lazy(() => import('./ClientPortal'));
const Grader = lazy(() => import('./Grader'));
const VsPage = lazy(() => import('./VsPage'));
const VsHub = lazy(() => import('./VsHub'));
const Methodology = lazy(() => import('./Methodology'));
const SandbarCaseStudy = lazy(() => import('./SandbarCaseStudy'));
const CaseStudiesIndex = lazy(() => import('./CaseStudiesIndex'));

type Route =
  | { name: 'home' }
  | { name: 'audit' }
  | { name: 'grader' }
  | { name: 'methodology' }
  | { name: 'case-studies-index' }
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
  | { name: 'admin-calls'; slug: string }
  | { name: 'admin-exec' }
  | { name: 'portal'; slug: string }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' };
  if (pathname === '/audit' || pathname === '/audit/') return { name: 'audit' };
  if (pathname === '/grader' || pathname === '/grader/') return { name: 'grader' };
  if (pathname === '/methodology' || pathname === '/methodology/') return { name: 'methodology' };
  if (pathname === '/case-studies' || pathname === '/case-studies/') return { name: 'case-studies-index' };
  const caseMatch = pathname.match(/^\/case-studies\/([^/]+)\/?$/);
  if (caseMatch) return { name: 'case-study', slug: decodeURIComponent(caseMatch[1]) };
  if (pathname === '/pricing' || pathname === '/pricing/') return { name: 'pricing' };
  if (pathname === '/retainer' || pathname === '/retainer/') return { name: 'retainer' };
  if (pathname === '/apply' || pathname === '/apply/') return { name: 'apply' };
  if (pathname === '/lead-gen' || pathname === '/lead-gen/') return { name: 'lead-gen' };
  if (pathname === '/swarm' || pathname === '/swarm/') return { name: 'swarm' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  if (pathname === '/admin/exec' || pathname === '/admin/exec/') return { name: 'admin-exec' };
  const adminCallsMatch = pathname.match(/^\/admin\/calls\/([^/]+)\/?$/);
  if (adminCallsMatch) return { name: 'admin-calls', slug: decodeURIComponent(adminCallsMatch[1]) };
  const portalMatch = pathname.match(/^\/portal\/([^/]+)\/?$/);
  if (portalMatch) return { name: 'portal', slug: decodeURIComponent(portalMatch[1]) };
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
    route.name === 'report' || route.name === 'admin' || route.name === 'admin-calls' || route.name === 'admin-exec'
      ? 'max-w-[1280px] pt-8 sm:pt-12'
      : route.name === 'home' || route.name === 'pricing' || route.name === 'retainer'
      ? 'max-w-[1120px] pt-8 sm:pt-12'
      : route.name === 'audit'
      ? 'max-w-[640px] pt-3 sm:pt-6'
      : route.name === 'grader'
      ? 'max-w-[820px] pt-6 sm:pt-10'
      : route.name === 'methodology'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'case-study' || route.name === 'case-studies-index'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'vs' || route.name === 'vs-hub'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'apply'
      ? 'max-w-[720px] pt-8 sm:pt-12'
      : route.name === 'lead-gen'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'swarm'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'client-report' || route.name === 'portal'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : 'max-w-[640px] pt-8 sm:pt-10';

  return (
    /* overflow-x-clip kills the mobile left-right jiggle caused by the
       oversized radial-glow elements on the hero sections. `clip` (not
       `hidden`) prevents a scroll container so the sticky header keeps
       working. Invisible on desktop — nothing overflows there. */
    <div className="min-h-screen scroll-smooth overflow-x-clip bg-[#0A0A0B] text-white">
      <Header />
      <div className={`mx-auto flex flex-col px-5 pb-20 sm:px-6 ${containerCls}`}>
        <Suspense fallback={<RouteFallback />}>
          {route.name === 'home' && <Homepage />}
          {route.name === 'audit' && <AuditFlow />}
          {route.name === 'grader' && <Grader />}
          {route.name === 'methodology' && <Methodology />}
          {route.name === 'case-studies-index' && <CaseStudiesIndex />}
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
          {route.name === 'admin-calls' && <AdminCalls slug={route.slug} />}
          {route.name === 'admin-exec' && <ExecDashboard />}
          {route.name === 'portal' && <ClientPortal slug={route.slug} />}
          {route.name === 'unknown' && <NotFound />}
        </Suspense>
      </div>
      <SiteFooter route={route} />
      <MobileStickyCTA route={route} />
    </div>
  );
}

/**
 * Suspense fallback for lazy-loaded routes — kept minimal so it doesn't
 * compete with the LCP element on first paint. Three gold dots, fades in
 * after ~120ms so fast loads never flash this (Vite's lazy modules are
 * usually < 200ms on broadband).
 */
function RouteFallback() {
  return (
    <main className="flex flex-1 items-center justify-center py-32">
      <div className="flex items-center gap-2 opacity-0 animate-fade-in" style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" style={{ animationDelay: '120ms' }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" style={{ animationDelay: '240ms' }} />
      </div>
    </main>
  );
}

/**
 * Global site footer — sitemap-grade internal linking across the dark-mode
 * surface. Renders on every public route. Hidden on dashboards / admin /
 * audit-results-style pages where the page-local footer is already custom.
 * Pure SEO + UX win — every page now seeds the site graph for crawlers and
 * gives lost mobile visitors a clean way home.
 */
function SiteFooter({ route }: { route: Route }) {
  // Routes that own their own bottom-of-page footer or shouldn't have a
  // global one (admin / report dashboards / interactive tools).
  const HIDE = new Set(['admin', 'admin-calls', 'admin-exec', 'portal', 'report', 'client-report', 'audit', 'lead-gen', 'swarm']);
  if (HIDE.has(route.name)) return null;

  return (
    <footer className="mt-12 border-t border-[#D4AF37]/15 bg-[#0A0A0B] pb-24 pt-12 sm:pb-12">
      <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-8 px-5 sm:grid-cols-4 sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <a href="/" className="inline-flex items-center gap-2">
            <span aria-hidden className="text-[18px]">🐾</span>
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[13px] font-bold uppercase tracking-[0.18em] text-transparent">
              LOLA — AI LEADS EXPERT
            </span>
          </a>
          <p className="mt-3 max-w-[260px] text-[12px] leading-[1.55] text-[#9CA3AF]">
            Done-for-you AI Leads + Local SEO for service businesses. Recommended on
            Google AND ChatGPT, Perplexity, and Gemini.
          </p>
          <p className="mt-3 text-[11px] text-[#5A5F68]">
            Ty Alexander Media · Tampa Bay, FL
          </p>
        </div>

        <FooterCol title="Get found">
          <FooterLink href="/grader">Free AI Visibility Grader</FooterLink>
          <FooterLink href="/pricing">Pricing &amp; Local Lock</FooterLink>
          <FooterLink href="/case-studies">Case studies</FooterLink>
          <FooterLink href="/r/client/sandbar">Live Sandbar dashboard ↗</FooterLink>
          <FooterLink href="/audit">Deep audit (5-step)</FooterLink>
        </FooterCol>

        <FooterCol title="Compare">
          <FooterLink href="/vs">All comparisons</FooterLink>
          <FooterLink href="/vs/localiq">Lola vs LocalIQ</FooterLink>
          <FooterLink href="/vs/brightlocal">Lola vs BrightLocal</FooterLink>
          <FooterLink href="/vs/scorpion">Lola vs Scorpion</FooterLink>
          <FooterLink href="/vs/podium">Lola vs Podium</FooterLink>
        </FooterCol>

        <FooterCol title="Trust">
          <FooterLink href="/methodology">Scoring methodology</FooterLink>
          <FooterLink href="/lp/industries">Industries we serve</FooterLink>
          <FooterLink href="/retainer">The Retainer</FooterLink>
          <FooterLink href="/apply">Apply for a slot</FooterLink>
        </FooterCol>
      </div>

      <div className="mx-auto mt-10 max-w-[1120px] border-t border-white/[0.04] px-5 pt-6 text-center text-[11px] leading-[1.6] text-[#5A5F68] sm:px-6">
        <p>© 2026 Ty Alexander Media · Built with Lola 🐾</p>
        <p className="mt-1">
          We work with one business per niche per city. <a href="/pricing" className="text-[#D4AF37] underline-offset-2 hover:underline">Claim your Local Lock</a>.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="text-[13px] text-[#C5C5C8] underline-offset-2 transition hover:text-[#D4AF37] hover:underline"
      >
        {children}
      </a>
    </li>
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
  const STICKY_ROUTES = new Set(['home', 'pricing', 'vs', 'vs-hub', 'methodology', 'case-study', 'case-studies-index', 'retainer']);
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
          {/* Mobile: short "LOLA LEADS" (no overlap/wrap). Desktop: full wordmark — unchanged. */}
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-clip-text font-bold uppercase tracking-[0.18em] text-transparent">
            <span className="text-[14px] sm:hidden">LOLA LEADS</span>
            <span className="hidden text-[14px] sm:inline">
              LOLA <span aria-hidden className="text-[#D4AF37]/55">—</span> AI LEADS EXPERT
            </span>
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
