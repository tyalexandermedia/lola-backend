/// <reference types="vite/client" />
import { useEffect, useState, lazy, Suspense } from 'react';
import PawMark from './PawMark';
import { startHref, startSmsHref } from './lib/checkout';
import { FOUNDER } from './lib/lola';
import { PLAN } from './lib/pricing';
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
const OwnerDashboard = lazy(() => import('./OwnerDashboard'));
const PricingPage = lazy(() => import('./PricingPage'));
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
// D-014: Sandbar case-study page held (404) until verified ranking receipts
// exist. Flip VITE_SHOW_SANDBAR_CASE_STUDY=true in Vercel to republish.
const SHOW_SANDBAR_CASE_STUDY =
  (import.meta.env.VITE_SHOW_SANDBAR_CASE_STUDY as string | undefined) === 'true';
const CaseStudiesIndex = lazy(() => import('./CaseStudiesIndex'));
const LolaOS = lazy(() => import('./LolaOS'));
const DiyAccess = lazy(() => import('./DiyAccess'));
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
  | { name: 'work' }
  | { name: 'diy' }
  | { name: 'apply' }
  | { name: 'lead-gen' }
  | { name: 'swarm' }
  | { name: 'report'; auditId: string }
  | { name: 'client-report'; slug: string }
  | { name: 'admin' }
  | { name: 'admin-hq' }
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
  // /retainer and /managed both resolve to the pricing page, mirroring the 301s
  // already published in vercel.json — production redirects before the SPA ever
  // loads, so these arms only fire on client-side navigation and local dev.
  //
  // RetainerPage.tsx and ManagedPage.tsx are no longer imported at all. Both
  // were survivors of the retired model — RetainerPage sold "The Full Build"
  // behind calendar CTAs, ManagedPage published a $297/mo price that exists
  // nowhere in docs/PRICING.md — and while their route arms were already
  // unreachable, Vite kept emitting their chunks, so retired pricing shipped to
  // the CDN as fetchable JS. The files stay in the repo for reference.
  if (pathname === '/retainer' || pathname === '/retainer/') return { name: 'pricing' };
  if (pathname === '/managed' || pathname === '/managed/') return { name: 'pricing' };
  if (pathname === '/work' || pathname === '/work/') return { name: 'work' };
  if (pathname === '/diy' || pathname === '/diy/') return { name: 'diy' };
  // /build was the old post-purchase page, and it is now a third onboarding
  // story competing with /start (the Stripe success URL) and /apply (intake).
  // Its step 01 is "Book your kickoff call" — the call path Ty removed — so a
  // buyer who lands here is told to schedule something that isn't offered.
  // Both paths resolve to /start, which branches on session_id, so an old
  // /build/start?session_id=… bookmark still shows the right screen.
  if (pathname === '/build' || pathname === '/build/' || pathname === '/build/start' || pathname === '/build/start/') return { name: 'start' };
  if (pathname === '/apply' || pathname === '/apply/') return { name: 'apply' };
  if (pathname === '/lead-gen' || pathname === '/lead-gen/') return { name: 'lead-gen' };
  if (pathname === '/swarm' || pathname === '/swarm/') return { name: 'swarm' };
  if (pathname === '/admin/leads') return { name: 'admin' };
  if (pathname === '/admin/hq' || pathname === '/admin/hq/') return { name: 'admin-hq' };
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
    case 'work': return '/work';
    // No canonical for /diy: DiyAccess sets robots:noindex (it is an access
    // page for the retired fix kit), and publishing a canonical on a page
    // you are also telling Google not to index is two contradictory
    // instructions about the same URL.
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

function App({ ssrPath }: { ssrPath?: string } = {}) {
  // `ssrPath` is only passed by the build-time prerender (entry-server.tsx),
  // where there is no `window`. In the browser we always read the real URL.
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window !== 'undefined' ? window.location.pathname : ssrPath ?? '/')
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
    route.name === 'report' || route.name === 'admin' || route.name === 'admin-hq' || route.name === 'admin-calls' || route.name === 'admin-revenue'
      ? 'max-w-[1280px] pt-8 sm:pt-12'
      : route.name === 'home' || route.name === 'pricing' || route.name === 'work'
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
      : route.name === 'diy'
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
    <div className="min-h-screen scroll-smooth overflow-x-clip bg-on-gold text-white">
      <Header bare={route.name === 'start'} />
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
          {route.name === 'case-study' && route.slug === 'sandbar' && (SHOW_SANDBAR_CASE_STUDY ? <SandbarCaseStudy /> : <NotFound />)}
          {route.name === 'case-study' && route.slug !== 'sandbar' && <NotFound />}
          {route.name === 'vs' && <VsPage slug={route.slug} />}
          {route.name === 'vs-hub' && <VsHub />}
          {route.name === 'pricing' && <PricingPage />}
          {route.name === 'work' && <WorkPage />}
          {route.name === 'diy' && <DiyAccess />}
          {route.name === 'apply' && <ApplyPage />}
          {route.name === 'lead-gen' && <LeadGenGenerator />}
          {route.name === 'swarm' && <SwarmWorkflow />}
          {route.name === 'report' && <SharedReport auditId={route.auditId} />}
          {route.name === 'client-report' && <ClientReport slug={route.slug} />}
          {route.name === 'admin' && <AdminLeads />}
          {route.name === 'admin-hq' && <OwnerDashboard />}
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
  const HIDE = new Set(['audit', 'report', 'admin', 'admin-hq', 'admin-calls', 'admin-revenue']);
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
      className="no-print fixed bottom-20 right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-on-gold/90 text-gold shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-[10px] transition hover:border-gold/70 hover:bg-gold/[0.12] sm:bottom-6"
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
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" style={{ animationDelay: '120ms' }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" style={{ animationDelay: '240ms' }} />
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
  const HIDE = new Set(['admin', 'admin-hq', 'admin-calls', 'admin-revenue', 'report', 'client-report', 'audit', 'lead-gen', 'swarm', 'start']);
  if (HIDE.has(route.name)) return null;

  return (
    <footer className="no-print mt-12 border-t border-gold/15 bg-on-gold pb-24 pt-12 sm:pb-12">
      <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-8 px-5 sm:grid-cols-4 sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          {/* min-h-[44px]: measured 27px tall on a 390px viewport. */}
          <a href="/" className="-mx-2 inline-flex min-h-[44px] items-center gap-2 px-2">
            <PawMark size={18} className="text-gold" />
            <span className="bg-gradient-to-r from-gold via-gold-bright to-gold bg-clip-text text-[13px] font-bold uppercase tracking-[0.18em] text-transparent">
              LOLA LEADS
            </span>
          </a>
          <p className="mt-3 max-w-[260px] text-[12px] leading-[1.55] text-ink-3">
            Done-for-you AI Leads + Local SEO for service businesses. Recommended on
            Google AND ChatGPT, Perplexity, and Gemini.
          </p>
          {/* #5A5F68 on #0A0A0B is 3.08:1 — below the 4.5:1 AA minimum for
              11px text. #8A8F98 is 6.09:1. Breaks are unconditional: hiding
              them on mobile only ran the three clauses together. */}
          <p className="mt-3 text-[11px] leading-[1.6] text-ink-3">
            Built and run by <span className="text-ink-2">Ty Alexander Traufield</span> — “Coach Ty.”
            <br /> Founder, Lola Leads · Ty Alexander Media
            <br /> St. Pete · serving all of Tampa Bay, FL
          </p>
        </div>

        <FooterCol title="Get found">
          <FooterLink href="/growth-score">Free Growth Score</FooterLink>
          <FooterLink href="/pricing">Pricing — $397/month</FooterLink>
          <FooterLink href="/pricing">The $397/month plan</FooterLink>
          <FooterLink href="/work">See sites we've built</FooterLink>
          <FooterLink href="/case-studies">Case studies</FooterLink>
          {SHOW_SANDBAR_CASE_STUDY && (
            <FooterLink href="/r/client/sandbar">Sandbar Soft Wash — live dashboard</FooterLink>
          )}
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

      <div className="mx-auto mt-10 max-w-[1120px] border-t border-white/[0.04] px-5 pt-6 text-center text-[11px] leading-[1.6] text-ink-4 sm:px-6">
        <p>© 2026 Ty Alexander Traufield · Ty Alexander Media · Built with Lola 🐾</p>
        <p className="mt-1">
          Get found on Google and in AI answers — $397/month, website design included. <a href="/pricing" className="text-gold underline-offset-2 hover:underline">See pricing</a>.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      {/* inline-flex + min-h-[44px] rather than a bare inline <a>: measured on a
          390px viewport these were 15px tall, so a whole column of navigation
          sat well under the 44px touch minimum and the rows were close enough
          to mis-tap. The negative margin keeps the text optically aligned with
          the column heading despite the added padding. */}
      <a
        href={href}
        className="-mx-2 inline-flex min-h-[44px] items-center px-2 text-[13px] text-ink-2 underline-offset-2 transition hover:text-gold hover:underline"
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
  const STICKY_ROUTES = new Set(['home', 'pricing', 'vs', 'vs-hub', 'methodology', 'case-study', 'case-studies-index']);
  if (!STICKY_ROUTES.has(route.name)) return null;

  // Self-serve, not scheduled. The gold button used to open a calendar — the
  // most-tapped element on a phone pointing away from the sale.
  //
  // It used to fall back to '/pricing' unconditionally, which made the biggest
  // button on the screen link to the page you were already standing on: on
  // /pricing, the primary buy control did nothing. startHref(atOffer) sends
  // readers still in the pitch to /pricing and readers already on the offer to
  // the pre-filled text, so the button always advances the sale.
  const buyHref = startHref(route.name === 'pricing');

  return (
    // pb uses env(safe-area-inset-bottom): on an iPhone the home indicator sits
    // in the bottom ~34px, and a bar pinned to bottom-0 without this puts the
    // most-tapped controls on the site underneath it. Falls back to the plain
    // padding everywhere the env() var resolves to 0.
    <div
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-on-gold/95 px-3 pt-2.5 backdrop-blur-[14px] sm:hidden"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-[640px] items-stretch gap-2">
        <a
          href="/growth-score"
          className="flex h-12 flex-1 items-center justify-center rounded-md border border-gold/40 bg-white/[0.02] px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-gold transition-transform duration-150 ease-press active:scale-[0.97]"
        >
          Free Score
        </a>
        <a
          href={buyHref}
          className="flex h-12 flex-[1.35] items-center justify-center rounded-md bg-gradient-to-r from-gold via-gold-bright to-gold px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-on-gold shadow-glow transition-transform duration-150 ease-press active:scale-[0.97]"
        >
          {/* The full "Start — $397/month" wrapped to two lines at 390px and
              looked cramped beside the other two controls. Abbreviated so the
              primary control stays on one line on the narrowest phone. */}
          Start · {PLAN.price}/mo →
        </a>
        {/* Reaching a human is the offer ("you text Ty directly"), so it earns
            a permanent control rather than living only in the footer. Icon-only
            to protect the two selling buttons' width, but it is a full 48px
            square — above the 44px minimum — and carries a real label for
            screen readers, since an emoji alone announces as "envelope". */}
        <a
          href={startSmsHref()}
          aria-label={`Text ${FOUNDER.knownAs} directly at ${FOUNDER.phoneDisplay}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-gold/40 bg-white/[0.02] text-gold transition-transform duration-150 ease-press active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

/**
 * `bare` drops the nav links on one-decision pages — /start, which is the
 * destination for a video CTA or a texted link. Every nav link there is an
 * escape route off a page whose entire job is a single yes.
 *
 * The wordmark stays and stays clickable: on a page reached from an IG bio it
 * is the only thing telling a stranger whose site they are on, and removing it
 * costs more trust than the link leaks.
 */
function Header({ bare = false }: { bare?: boolean } = {}) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-gold/20 bg-on-gold/85 backdrop-blur-[14px]">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-5 sm:h-16 sm:px-6">
        {/* Logo — gold gradient wordmark + paw */}
        <a
          href="/"
          className="group -mx-2 flex min-h-[44px] items-center gap-2 px-2"
          // WCAG 2.5.3 (Label in Name): the accessible name has to CONTAIN the
          // visible text. The visible wordmark is "LOLA LEADS"; the old label
          // read "Lola — AI Leads Expert — home", which doesn't contain it — so
          // a voice-control user saying "click Lola Leads" got nothing.
          aria-label="Lola Leads — home"
        >
          <PawMark size={16} className="shrink-0 text-gold" />
          {/* One wordmark at every breakpoint — "Lola Leads" is the brand name.
              (The descriptor "AI Leads Expert" lives in the hero kicker and
              meta copy, where it works as positioning rather than as a name.) */}
          <span className="bg-gradient-to-r from-gold via-gold-bright to-gold bg-clip-text text-[14px] font-bold uppercase tracking-[0.18em] text-transparent">
            LOLA LEADS
          </span>
        </a>

        {/* Right nav — min-h-[44px] + py-3 ensures WCAG 2.5.5 touch target on mobile */}
        {bare ? null : (
        <nav className="flex items-center gap-1 text-[12px] font-medium uppercase tracking-[0.1em] sm:gap-2 sm:text-[13px] sm:tracking-[0.12em]">
          {/* Work — desktop only, so the mobile header stays uncluttered
              (mobile reaches /work via the footer + homepage section). */}
          <a
            href="/work"
            className="hidden min-h-[44px] items-center px-2.5 py-3 text-ink-2 transition hover:text-gold sm:flex sm:px-3"
          >
            Work
          </a>
          <a
            href="/growth-score"
            className="flex min-h-[44px] items-center px-2.5 py-3 text-ink-2 transition hover:text-gold sm:px-3"
          >
            Free Score
          </a>
          <a
            href="/pricing"
            className="flex min-h-[44px] items-center rounded-[8px] border border-gold/40 bg-gold/[0.06] px-3 py-3 font-bold text-gold transition hover:border-gold/70 hover:bg-gold/[0.12]"
          >
            Pricing
          </a>
        </nav>
        )}
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
      <h2 className="text-2xl font-semibold text-white">No trail here.</h2>
      <p className="mt-3 max-w-md text-base text-ink-3">Lola couldn't find a page at this URL.</p>
      <a
        href="/"
        className="mt-8 inline-flex h-14 items-center justify-center rounded-[12px] bg-gradient-to-br from-gold-hi via-gold-deep to-gold-deep px-8 text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-gold-hi/25"
      >
        Back to the Growth Score
      </a>
    </main>
  );
}

export default App;
