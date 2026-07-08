/// <reference types="vite/client" />
import { useEffect, useState, lazy, Suspense } from 'react';
import { SITE_ORIGIN } from './lib/seo';
// Homepage stays eager — primary entry, must paint immediately. Everything
// else is lazy-loaded so the initial bundle stays lean for first-paint /
// Core Web Vitals (LCP). Each lazy import becomes its own JS chunk under
// dist/assets that Vite will only fetch when the route is hit.
import Homepage from './Homepage';
const AuditFlow = lazy(() => import('./AuditFlow'));
const SharedReport = lazy(() => import('./SharedReport'));
const AdminLeads = lazy(() => import('./AdminLeads'));
const AdminCalls = lazy(() => import('./AdminCalls'));
const AdminRevenue = lazy(() => import('./AdminRevenue'));
const PricingPage = lazy(() => import('./PricingPage'));
const RetainerPage = lazy(() => import('./RetainerPage'));
const ApplyPage = lazy(() => import('./ApplyPage'));
const LeadGenGenerator = lazy(() => import('./LeadGenGenerator'));
const SwarmWorkflow = lazy(() => import('./SwarmWorkflow'));
const ClientReport = lazy(() => import('./ClientReport'));
const Grader = lazy(() => import('./Grader'));
const GrowthScore = lazy(() => import('./GrowthScore'));
const Start = lazy(() => import('./Start'));
const VsPage = lazy(() => import('./VsPage'));
const VsHub = lazy(() => import('./VsHub'));
const Methodology = lazy(() => import('./Methodology'));
const SandbarCaseStudy = lazy(() => import('./SandbarCaseStudy'));
const CaseStudiesIndex = lazy(() => import('./CaseStudiesIndex'));
const LolaOS = lazy(() => import('./LolaOS'));
const DiyAccess = lazy(() => import('./DiyAccess'));
const BuildOnboarding = lazy(() => import('./BuildOnboarding'));
const WorkPage = lazy(() => import('./WorkPage'));

type Route =
  | { name: 'home' }
  | { name: 'audit' }
  | { name: 'grader' }
  | { name: 'growth-score' }
  | { name: 'start' }
  | { name: 'methodology' }
  | { name: 'lola-os' }
  | { name: 'case-studies-index' }
  | { name: 'case-study'; slug: string }
  | { name: 'vs-hub' }
  | { name: 'vs'; slug: string }
  | { name: 'pricing' }
  | { name: 'retainer' }
  | { name: 'work' }
  | { name: 'diy' }
  | { name: 'build-onboarding' }
  | { name: 'apply' }
  | { name: 'lead-gen' }
  | { name: 'swarm' }
  | { name: 'report'; auditId: string }
  | { name: 'client-report'; slug: string }
  | { name: 'admin' }
  | { name: 'admin-calls'; slug: string }
  | { name: 'admin-revenue'; slug: string }
  | { name: 'unknown' };

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' };
  if (pathname === '/audit' || pathname === '/audit/') return { name: 'audit' };
  if (pathname === '/grader' || pathname === '/grader/') return { name: 'grader' };
  if (pathname === '/growth-score' || pathname === '/growth-score/') return { name: 'growth-score' };
  if (pathname === '/start' || pathname === '/start/') return { name: 'start' };
  if (pathname === '/methodology' || pathname === '/methodology/') return { name: 'methodology' };
  if (pathname === '/os' || pathname === '/os/' || pathname === '/client-status' || pathname === '/client-status/') return { name: 'lola-os' };
  if (pathname === '/case-studies' || pathname === '/case-studies/') return { name: 'case-studies-index' };
  const caseMatch = pathname.match(/^\/case-studies\/([^/]+)\/?$/);
  if (caseMatch) return { name: 'case-study', slug: decodeURIComponent(caseMatch[1]) };
  if (pathname === '/pricing' || pathname === '/pricing/') return { name: 'pricing' };
  if (pathname === '/retainer' || pathname === '/retainer/') return { name: 'retainer' };
  if (pathname === '/work' || pathname === '/work/') return { name: 'work' };
  if (pathname === '/diy' || pathname === '/diy/') return { name: 'diy' };
  if (pathname === '/build' || pathname === '/build/' || pathname === '/build/start' || pathname === '/build/start/') return { name: 'build-onboarding' };
  if (pathname === '/apply' || pathname === '/apply/') return { name: 'apply' };
  if (pathname === '/lead-gen' || pathname === '/lead-gen/') return { name: 'lead-gen' };
  if (pathname === '/swarm' || pathname === '/swarm/') return { name: 'swarm' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  const adminCallsMatch = pathname.match(/^\/admin\/calls\/([^/]+)\/?$/);
  if (adminCallsMatch) return { name: 'admin-calls', slug: decodeURIComponent(adminCallsMatch[1]) };
  const adminRevenueMatch = pathname.match(/^\/admin\/revenue\/([^/]+)\/?$/);
  if (adminRevenueMatch) return { name: 'admin-revenue', slug: decodeURIComponent(adminRevenueMatch[1]) };
  if (pathname === '/vs' || pathname === '/vs/') return { name: 'vs-hub' };
  const vsMatch = pathname.match(/^\/vs\/([^/]+)\/?$/);
  if (vsMatch) return { name: 'vs', slug: decodeURIComponent(vsMatch[1]) };
  const clientReportMatch = pathname.match(/^\/r\/client\/([^/]+)\/?$/);
  if (clientReportMatch) return { name: 'client-report', slug: decodeURIComponent(clientReportMatch[1]) };
  const reportMatch = pathname.match(/^\/r\/([^/]+)\/?$/);
  if (reportMatch) return { name: 'report', auditId: decodeURIComponent(reportMatch[1]) };
  return { name: 'unknown' };
}

/**
 * Canonical path for a route, or null for non-indexable tool/dashboard routes
 * (we drop the canonical on those so Google never indexes a private URL).
 */
function canonicalPathForRoute(route: Route): string | null {
  switch (route.name) {
    case 'home': return '/';
    case 'pricing': return '/pricing';
    case 'retainer': return '/retainer';
    case 'work': return '/work';
    case 'diy': return '/diy';
    case 'build-onboarding': return '/build/start';
    case 'apply': return '/apply';
    case 'grader': return '/grader';
    case 'growth-score': return '/growth-score';
    case 'start': return '/start';
    case 'methodology': return '/methodology';
    case 'lola-os': return '/os';
    case 'case-studies-index': return '/case-studies';
    case 'case-study': return `/case-studies/${route.slug}`;
    case 'vs-hub': return '/vs';
    case 'vs': return `/vs/${route.slug}`;
    case 'audit': return '/audit';
    default: return null; // lead-gen, swarm, report, client-report, admin*, unknown
  }
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

  // ── Per-route canonical + og:url ─────────────────────────────
  // One static index.html serves every path, so without this every route would
  // share the homepage's canonical/og:url. Derived from the route (not the
  // document title), so it's correct even before a lazy route chunk mounts.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const head = document.head;
    const path = canonicalPathForRoute(route);
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogUrl = head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (path) {
      const url = SITE_ORIGIN + (path === '/' ? '' : path);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        head.appendChild(link);
      }
      link.href = url;
      ogUrl?.setAttribute('content', url);
    } else if (link) {
      link.remove(); // non-indexable route — don't advertise a private URL
    }
  }, [route]);

  // Tighter top padding on /audit — Step 5 CTA must be above the fold at 375x667.
  // Other routes keep generous breathing room.
  const containerCls =
    route.name === 'report' || route.name === 'admin' || route.name === 'admin-calls' || route.name === 'admin-revenue'
      ? 'max-w-[1280px] pt-8 sm:pt-12'
      : route.name === 'home' || route.name === 'pricing' || route.name === 'retainer' || route.name === 'work'
      ? 'max-w-[1120px] pt-8 sm:pt-12'
      : route.name === 'audit'
      ? 'max-w-[640px] pt-3 sm:pt-6'
      : route.name === 'grader' || route.name === 'growth-score'
      ? 'max-w-[820px] pt-6 sm:pt-10'
      : route.name === 'start'
      ? 'max-w-[820px] pt-2 sm:pt-6'
      : route.name === 'methodology'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'lola-os'
      ? 'max-w-[1120px] pt-6 sm:pt-10'
      : route.name === 'case-study' || route.name === 'case-studies-index'
      ? 'max-w-[920px] pt-6 sm:pt-10'
      : route.name === 'vs' || route.name === 'vs-hub'
      ? 'max-w-[960px] pt-6 sm:pt-10'
      : route.name === 'diy' || route.name === 'build-onboarding'
      ? 'max-w-[820px] pt-6 sm:pt-10'
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
          {route.name === 'growth-score' && <GrowthScore />}
          {route.name === 'start' && <Start />}
          {route.name === 'methodology' && <Methodology />}
          {route.name === 'lola-os' && <LolaOS />}
          {route.name === 'case-studies-index' && <CaseStudiesIndex />}
          {route.name === 'case-study' && route.slug === 'sandbar' && <SandbarCaseStudy />}
          {route.name === 'case-study' && route.slug !== 'sandbar' && <NotFound />}
          {route.name === 'vs' && <VsPage slug={route.slug} />}
          {route.name === 'vs-hub' && <VsHub />}
          {route.name === 'pricing' && <PricingPage />}
          {route.name === 'retainer' && <RetainerPage />}
          {route.name === 'work' && <WorkPage />}
          {route.name === 'diy' && <DiyAccess />}
          {route.name === 'build-onboarding' && <BuildOnboarding />}
          {route.name === 'apply' && <ApplyPage />}
          {route.name === 'lead-gen' && <LeadGenGenerator />}
          {route.name === 'swarm' && <SwarmWorkflow />}
          {route.name === 'report' && <SharedReport auditId={route.auditId} />}
          {route.name === 'client-report' && <ClientReport slug={route.slug} />}
          {route.name === 'admin' && <AdminLeads />}
          {route.name === 'admin-calls' && <AdminCalls slug={route.slug} />}
          {route.name === 'admin-revenue' && <AdminRevenue slug={route.slug} />}
          {route.name === 'unknown' && <NotFound />}
        </Suspense>
      </div>
      <SiteFooter route={route} />
      <MobileStickyCTA route={route} />
      <BackToTop route={route} />
    </div>
  );
}

/**
 * Back-to-top button — appears after the visitor scrolls a screen down, and
 * smooth-scrolls to the top. Sits above the mobile sticky CTA so they never
 * overlap. Hidden on the routes that own their own chrome.
 */
function BackToTop({ route }: { route: Route }) {
  const [show, setShow] = useState(false);
  const HIDE = new Set(['audit', 'report', 'admin', 'admin-calls', 'admin-revenue']);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (HIDE.has(route.name) || !show) return null;
  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
      className="no-print fixed bottom-20 right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#0A0A0B]/90 text-[#D4AF37] shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-[10px] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12] sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
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
  const HIDE = new Set(['admin', 'admin-calls', 'admin-revenue', 'report', 'client-report', 'audit', 'lead-gen', 'swarm', 'start']);
  if (HIDE.has(route.name)) return null;

  return (
    <footer className="no-print mt-12 border-t border-[#D4AF37]/15 bg-[#0A0A0B] pb-24 pt-12 sm:pb-12">
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
          <FooterLink href="/growth-score">Free Growth Score</FooterLink>
          <FooterLink href="/pricing">Pricing — DIY or Full Build</FooterLink>
          <FooterLink href="/retainer">The $997 Full Build</FooterLink>
          <FooterLink href="/work">See sites we've built</FooterLink>
          <FooterLink href="/case-studies">Case studies</FooterLink>
          <FooterLink href="/case-studies/sandbar">Sandbar Soft Wash case study</FooterLink>
          <FooterLink href="/r/client/sandbar">Live Sandbar dashboard ↗</FooterLink>
          <FooterLink href="/grader">Free AI Visibility Grader</FooterLink>
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
          <FooterLink href="/apply">Apply for a slot</FooterLink>
        </FooterCol>
      </div>

      <div className="mx-auto mt-10 max-w-[1120px] border-t border-white/[0.04] px-5 pt-6 text-center text-[11px] leading-[1.6] text-[#5A5F68] sm:px-6">
        <p>© 2026 Ty Alexander Media · Built with Lola 🐾</p>
        <p className="mt-1">
          Get found on Google and in AI answers — DIY $197 or Full Build $997. <a href="/pricing" className="text-[#D4AF37] underline-offset-2 hover:underline">See pricing</a>.
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
  const primaryLabel = route.name === 'pricing' ? 'Lock my market →' : 'Book Free Call →';

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/30 bg-[#0A0A0B]/95 px-3 py-2.5 backdrop-blur-[14px] sm:hidden">
      <div className="mx-auto flex max-w-[640px] gap-2">
        <a
          href="/growth-score"
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
          {primaryLabel}
        </a>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-[#D4AF37]/20 bg-[#0A0A0B]/85 backdrop-blur-[14px]">
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
        <nav className="flex items-center gap-1 text-[12px] font-medium uppercase tracking-[0.1em] sm:gap-2 sm:text-[13px] sm:tracking-[0.12em]">
          <a
            href="/retainer"
            className="flex min-h-[44px] items-center px-2.5 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37] sm:px-3"
          >
            Full Build
          </a>
          <a
            href="/growth-score"
            className="flex min-h-[44px] items-center px-2.5 py-3 text-[#C5C5C8] transition hover:text-[#D4AF37] sm:px-3"
          >
            Free Score
          </a>
          <a
            href="/pricing"
            className="flex min-h-[44px] items-center rounded-[8px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-3 py-3 font-bold text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12]"
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
