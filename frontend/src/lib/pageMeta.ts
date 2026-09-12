/**
 * Per-route SEO metadata and structured data — ONE source, read by two consumers.
 *
 * ── The problem this exists to fix ───────────────────────────────────────
 * `useSeo` sets the title/description from inside `useEffect`. Effects don't
 * run during SSR, so the prerenderer (scripts/prerender.mjs) wrote the SAME
 * `index.html` <head> into all route files. A JS-executing crawler eventually
 * saw the right tags; the AI answer crawlers this site is meant to be cited by
 * — GPTBot, ClaudeBot, PerplexityBot, Google-Extended — largely do not execute
 * JS, so to every one of them all pages were the same page.
 *
 * ── How it's fixed ───────────────────────────────────────────────────────
 * Everything lives here as plain data. The prerenderer imports this module
 * through Vite's SSR loader and writes real per-route tags into the static
 * HTML; `useSeo` reads the same table at runtime so client-side navigation
 * stays correct. The two can no longer disagree, because there is one table.
 *
 * ── Rules enforced by scripts/check-seo.mjs (run in `npm run build`) ──────
 *   • title       <= 60 characters
 *   • description <= 155 characters
 *   • every prerendered route has an entry
 *   • FAQPage is only claimed by routes that actually render those questions
 *
 * ── Real data only ───────────────────────────────────────────────────────
 * No ratings, no review counts, no client totals, no "trusted by N" figures.
 * Every value below is either a verifiable fact (name, phone, service area,
 * published price) or copy that appears on the page it describes.
 *
 * 2026-09-12: migrated from the single $397 all-inclusive plan (website
 * included free, 90-Day Promise) to two plans — Local Visibility ($397/mo) and
 * Local Growth System ($797/mo, website built in) — plus a custom Expansion
 * route. The old ranking guarantee is retired in favour of an implementation
 * commitment (see lib/pricing.ts COMMITMENT / GUARANTEE).
 */

import { FOUNDER } from './lola';
import { PLAN_VISIBILITY, PLAN_GROWTH, PRICE_RANGE } from './pricing';

/**
 * Canonical origin — ONE definition for the whole frontend.
 *
 * 2026-08-20: migrated from lola.tyalexandermedia.com to www.coachtyalexander.com.
 * 2026-09-11: migrated to www.coachtyleads.com (Coach Ty Leads). coachtyalexander.com
 * is being freed up to become a separate personal-training / athletics site later,
 * so the marketing brand now lives on its own domain.
 *
 * Env-overridable rather than a hardcoded literal, deliberately. A domain move
 * is the change most likely to need reverting under time pressure. Set
 * VITE_SITE_ORIGIN in Vercel to point everything — canonicals, og:url, every
 * schema @id, the sitemap — somewhere else in one variable, then redeploy.
 *
 * NOTE the www. It is canonical, and the apex must 301 to it.
 */
export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined)?.trim() ||
  'https://www.coachtyleads.com'
).replace(/\/$/, '');
export const SITE_NAME = 'Coach Ty Leads';
export const LEGAL_NAME = 'Ty Alexander Media LLC';

/** Share image. 1200x630, shipped in public/. */
export const OG_IMAGE = `${SITE_ORIGIN}/og.png`;
export const OG_IMAGE_ALT =
  'Coach Ty Leads — done-for-you local SEO and lead systems for Tampa Bay home-service contractors. Start with a free Growth Score.';

export interface PageMeta {
  /** <= 60 chars. Leads with the demand term, not the brand. */
  title: string;
  /** <= 155 chars. */
  description: string;
  /** Path only; the canonical is built as SITE_ORIGIN + path. */
  path: string;
  /** Breadcrumb trail after Home. Empty on the homepage. */
  breadcrumb?: ReadonlyArray<{ name: string; path: string }>;
  /** Set when the route renders a visible FAQ that schema may describe. */
  faq?: ReadonlyArray<{ q: string; a: string }>;
}

/**
 * The demand questions this site is trying to be the cited answer to.
 *
 * Written as plain question-and-answer because that is the shape an answer
 * engine can lift verbatim. Each targets a real query with commercial intent,
 * and each answer is self-contained — an engine quoting one sentence still
 * quotes something true and complete, including the price.
 *
 * CRITICAL: these are rendered as visible copy by the pages that claim them in
 * schema (see AnswerBlock.tsx). scripts/check-seo.mjs fails the build if a
 * FAQPage question is not in the page's visible text.
 */
export const AI_QA: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'How do I get my business found on Google and AI search?',
    a:
      "Four things decide it: a website written so machines can read it, a complete and active Google Business Profile, consistent business details everywhere you're listed, and recent reviews. Google reads all four to rank you in the map pack, and ChatGPT, Perplexity and Gemini read the same signals to decide which business to name when someone asks for a recommendation. Coach Ty Leads handles this for home-service contractors in Tampa Bay — from " +
      `${PLAN_VISIBILITY.monthly}/month for visibility, reviews and lead response, or ${PLAN_GROWTH.monthly}/month for the complete system with a conversion-focused website built in.`,
  },
  {
    q: 'How much does local SEO cost for a contractor?',
    a:
      `Coach Ty Leads publishes two plans. Local Visibility is ${PLAN_VISIBILITY.monthly}/month plus a one-time ${PLAN_VISIBILITY.oneTime.amount} activation — Google Business Profile management, a review system, missed-call text-back and call tracking for a business that already has a usable website. Local Growth System is ${PLAN_GROWTH.monthly}/month plus a one-time ${PLAN_GROWTH.oneTime.amount} launch, and adds a conversion-focused website, technical SEO and automated lead follow-up. Both run a 90-day initial term, then month-to-month. Multi-location work is custom, starting at $1,497/month. Start with a free Growth Score to see which one fits.`,
  },
  {
    q: 'How long does local SEO take to work?',
    a:
      "Expect the first movement in 30 to 90 days. Google Business Profile fixes and review activity move fastest, often inside a few weeks, while ranking for competitive service-and-city searches usually takes two to three months of consistent work. That's why every plan runs a 90-day initial term before it goes month-to-month — it's the honest window to judge the work, in either direction.",
  },
  {
    q: 'What is a Growth Score?',
    a:
      "A Growth Score is a free, fast diagnostic of why your business isn't being found and chosen — before you pay to fix anything. It reviews your local visibility, your website and on-page setup, your Google Business Profile, your reviews and reputation, and your lead-response gap, then hands you the single highest-priority fix. No payment and no call required. It's a diagnostic, not a guarantee and not a full campaign.",
  },
  {
    q: 'What areas does Lola serve?',
    a:
      'Tampa Bay and the surrounding Florida markets — Tampa, St. Petersburg, Clearwater, Brandon, Palm Harbor and Sarasota, plus the service areas around them. Coach Ty Leads takes one client per trade, per agreed territory, so a business and its direct local competitor are never both clients.',
  },
];

/**
 * Homepage questions about the business itself.
 */
export const BRAND_QA: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What kinds of businesses does Lola work with?',
    a: 'Local service businesses of all kinds — pressure washing, plumbing, HVAC, roofing, pool care, cleaning, and other local trades. If your next customer is searching Google or asking ChatGPT for a business near them, Coach Ty Leads helps them find you.',
  },
  {
    q: 'Is there a guarantee?',
    a: "Not a ranking or lead guarantee — anyone who promises those is guessing. What we do commit to, in writing: we agree the launch scope and the tracked search terms before work begins, and if the agreed foundation deliverables aren't finished within the documented launch window for reasons under our control, we keep working at no extra management charge until they are.",
  },
  {
    q: 'Can you actually guarantee leads?',
    a: "No — and we won't pretend to. Whether a click becomes a job depends on your competition, your reviews, how fast you answer, and market conditions. We guarantee the implementation, not the outcome: the agreed launch scope gets completed, or we keep working at no extra management charge until it's done.",
  },
  {
    q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. Coach Ty Leads optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews), because that's increasingly where buyers ask for a recommendation.",
  },
  {
    q: 'Why does it cost so much less than a $5,000/month agency?',
    a: `Because you're not paying for an office, an account manager, or a sales team — Ty does the work himself. Plans are ${PLAN_VISIBILITY.monthly}/month for visibility or ${PLAN_GROWTH.monthly}/month for the complete system with a website built in. A $5,000/month agency retainer is $60,000 in year one, usually on a 12-month contract. Same work, without the overhead you were funding.`,
  },
  {
    q: 'Who is behind Lola?',
    a: `${FOUNDER.fullName} — "${FOUNDER.knownAs}" — based in St. Petersburg and serving all of Tampa Bay. He's a group strength & conditioning coach and a full-time GM who trains for HYROX, and he built the Lola Local Growth System to fix the local visibility of his father's real business, Sandbar Soft Wash. He now runs that same system for other local service businesses, does the work himself, and answers his own phone.`,
  },
  {
    q: 'Why is it called Lola?',
    a: "Lola is Ty's dog — born in 2018, and the reason the whole thing exists. The goal behind the business is simple: help enough local businesses win to buy her the backyard she deserves. When you win, so does she.",
  },
];

const pick = (src: ReadonlyArray<{ q: string; a: string }>, qs: string[]) =>
  qs.map((q) => {
    const hit = src.find((x) => x.q === q);
    if (!hit) throw new Error(`pageMeta: no Q&A entry for "${q}"`);
    return hit;
  });

/** Homepage: the demand questions first, then the ones about the business. */
export const HOME_QA = [
  ...pick(AI_QA, [
    'How do I get my business found on Google and AI search?',
    'How much does local SEO cost for a contractor?',
    'How long does local SEO take to work?',
  ]),
  ...BRAND_QA,
];

/** The three a Growth Score visitor is actually asking. */
export const SCORE_QA = pick(AI_QA, [
  'What is a Growth Score?',
  'How do I get my business found on Google and AI search?',
  'What areas does Lola serve?',
]);

/**
 * Pricing-page questions — the ten a contractor actually asks before choosing a
 * plan. Each is answered honestly, including the ones where the answer is "no."
 *
 * These are rendered verbatim by PricingPage.tsx and written into the route's
 * FAQPage by the prerenderer, so the schema always describes visible copy.
 * When the list here changes, the page's FAQ section changes with it — one
 * array, no drift.
 */
export const PRICING_QA: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What’s included in local SEO with Coach Ty Leads?',
    a: `Every plan manages your Google Business Profile, builds a review-request system, turns missed calls into text-backs, and tracks your calls and forms on a monthly Lola dashboard — with direct access to Ty. The Local Growth System (${PLAN_GROWTH.monthly}/month) adds a conversion-focused website, technical SEO, a quote/estimate path and automated text-and-email follow-up on top.`,
  },
  {
    q: 'Why is there a launch or activation fee?',
    a: `The one-time fee covers the up-front build — setting up the profile, tracking and review systems in Local Visibility (${PLAN_VISIBILITY.oneTime.amount} activation), or building the full website and technical foundation in the Local Growth System (${PLAN_GROWTH.oneTime.amount} launch). It pays for the work that happens before monthly management even starts, so month one isn't spent billing you for setup.`,
  },
  {
    q: 'Is a new website included in the $397 plan?',
    a: `No. Local Visibility (${PLAN_VISIBILITY.monthly}/month) is for a business that already has a usable website — it strengthens visibility, reviews and lead response around the site you have. A new conversion-focused website is part of the Local Growth System (${PLAN_GROWTH.monthly}/month plus a one-time ${PLAN_GROWTH.oneTime.amount} launch).`,
  },
  {
    q: 'How long does it take to see results?',
    a: "Expect first movement in 30 to 90 days — Google Business Profile and review activity move fastest, while competitive rankings take two to three months of consistent work. Every plan runs a 90-day initial term before month-to-month, because that's the honest window to judge it.",
  },
  {
    q: 'Do you guarantee leads or first-page rankings?',
    a: "No — and anyone who does is guessing. Results depend on competition, proximity, your reviews, how fast you answer, and market conditions. What we commit to: we agree the launch scope and tracked terms in writing first, and if the agreed foundation isn't finished in the documented launch window for reasons under our control, we keep working at no extra management charge until it is.",
  },
  {
    q: 'What happens after the first 90 days?',
    a: "The plan goes month-to-month — no long contract. The 90-day initial term exists because that's roughly how long the work takes to land and be judged fairly. After that you continue month to month for as long as it's working for you.",
  },
  {
    q: 'Do I own my website and my assets?',
    a: "Yes. The website, content and profile we build are yours. Your Google Business Profile, reviews and domain stay in your name — we manage them, we don't hold them hostage. If you ever leave, you keep what was built.",
  },
  {
    q: 'Are Google Ads or Local Service Ads included?',
    a: "No. These plans are organic — Google Business Profile, local SEO, reviews and follow-up — not paid advertising, and there's no ad budget bundled in. If you want paid media added, that's an Expansion conversation, and any ad spend is separate and paid directly to the platform.",
  },
  {
    q: 'Can two contractors in the same city both sign up?',
    a: "No. It's one active client per primary trade, per agreed territory — I can't rank two soft-wash companies against each other in the same town, so I don't take the second one. Your territory is defined in writing and holds while your account is active; nearby areas and different trades may still be open.",
  },
  {
    q: 'Can I add drone or 360° content later?',
    a: "Yes — as an add-on. Original drone and 360° production isn't part of the standard plans, but it's available through Ty Alexander Media and can be coordinated as part of an Expansion engagement when it's the right fit.",
  },
];

/**
 * Route -> metadata. Keys match scripts/prerender.mjs ROUTES exactly; the
 * checker fails the build if they drift apart.
 *
 * Titles lead with what someone types into a search box ("local SEO for
 * contractors", "local SEO pricing") rather than with the brand.
 */
export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Local SEO for Contractors — Found on Google & AI',
    description:
      'Done-for-you local SEO for Tampa Bay home-service contractors — found on Google and in ChatGPT, Perplexity and Gemini. Start with a free Growth Score.',
    path: '/',
    faq: HOME_QA,
  },
  '/pricing': {
    title: 'Local SEO Pricing for Contractors | Coach Ty Leads',
    description:
      'Compare local SEO, Google Business Profile, website and lead-follow-up plans for home-service contractors. Start with a free Growth Score.',
    path: '/pricing',
    breadcrumb: [{ name: 'Pricing', path: '/pricing' }],
    faq: PRICING_QA,
  },
  '/growth-score': {
    title: 'Free Growth Score — Google & AI Visibility Check',
    description:
      'See where your leads are leaking in 60 seconds. A free Growth Score for local service businesses — Google, reviews and lead response. No call, no card.',
    path: '/growth-score',
    breadcrumb: [{ name: 'Growth Score', path: '/growth-score' }],
    faq: SCORE_QA,
  },
  '/work': {
    title: 'Local Business Websites We Built & Rank',
    description:
      'Real websites we designed and ranked for Tampa Bay home-service contractors. Scroll the live sites, then start with a free Growth Score.',
    path: '/work',
    breadcrumb: [{ name: 'Our Work', path: '/work' }],
  },
  '/methodology': {
    title: 'How We Get Contractors Found on Google & AI',
    description:
      'The exact method behind done-for-you local SEO: Google Business Profile, machine-readable pages, review velocity and AI answer visibility. No jargon.',
    path: '/methodology',
    breadcrumb: [{ name: 'Methodology', path: '/methodology' }],
  },
  '/apply': {
    title: 'Start Done-for-You Local SEO — Tampa Bay',
    description:
      'Tell Coach Ty about your business and he takes it from there — done-for-you local SEO and lead systems for Tampa Bay home-service contractors.',
    path: '/apply',
    breadcrumb: [{ name: 'Get Started', path: '/apply' }],
  },
  '/start': {
    title: 'Start Local SEO for Contractors — Tampa Bay',
    description:
      'Start done-for-you local SEO for your Tampa Bay home-service business. Choose the plan that fits, or start free with a Growth Score. No long contract.',
    path: '/start',
    breadcrumb: [{ name: 'Start', path: '/start' }],
  },
  '/case-studies/sandbar': {
    title: 'Sandbar Soft Wash — Local SEO Case Study',
    description:
      'How the Lola Local Growth System rebuilt local visibility for a Palm Harbor pressure-washing business, tracked in the open on a live public dashboard.',
    path: '/case-studies/sandbar',
    breadcrumb: [
      { name: 'Case Studies', path: '/case-studies' },
      { name: 'Sandbar Soft Wash', path: '/case-studies/sandbar' },
    ],
  },
  '/case-studies': {
    title: 'Local SEO Case Studies — Tampa Bay Contractors',
    description:
      'How Coach Ty Leads rebuilt local visibility for Tampa Bay service businesses, tracked in the open on live public dashboards, not in a sales deck.',
    path: '/case-studies',
    breadcrumb: [{ name: 'Case Studies', path: '/case-studies' }],
  },
  '/vs': {
    title: 'Coach Ty Leads vs Agencies & Tools — Compared',
    description:
      'Honest comparisons against LocalIQ, BrightLocal, Scorpion, Podium, Yext, Hibu and Local Service Ads — real pricing, and where each one wins.',
    path: '/vs',
    breadcrumb: [{ name: 'Comparisons', path: '/vs' }],
  },
};

/** The /vs/<slug> pages, generated so every competitor gets its own metadata. */
const VS: ReadonlyArray<[slug: string, name: string, hook: string]> = [
  ['localiq', 'LocalIQ', 'quote-only pricing vs published plans from $397/mo'],
  ['brightlocal', 'BrightLocal', 'a DIY toolset you run yourself vs done-for-you local SEO'],
  ['scorpion', 'Scorpion', 'a $3K+/month agency vs published plans from $397/mo'],
  ['podium', 'Podium', 'review and messaging software vs done-for-you local SEO'],
  ['yext', 'Yext', 'listings sync you rent vs local SEO and AI visibility you own'],
  ['hibu', 'Hibu', 'a bundled ad contract vs published plans from $397/mo'],
  ['local-service-ads', 'Local Service Ads', 'paid leads per call vs organic and AI visibility you keep'],
];

for (const [slug, name, hook] of VS) {
  PAGE_META[`/vs/${slug}`] = {
    title: `Coach Ty Leads vs ${name} — Compared`,
    description: `${name} vs Coach Ty Leads: ${hook}. An honest look at where each wins.`,
    path: `/vs/${slug}`,
    breadcrumb: [
      { name: 'Comparisons', path: '/vs' },
      { name: `vs ${name}`, path: `/vs/${slug}` },
    ],
  };
}

/** Absolute canonical URL for a route path. */
export function canonicalFor(path: string): string {
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

// ── Structured data ────────────────────────────────────────────────────────
// Stable @ids so every node in the graph points at one entity rather than
// re-declaring the business on each page.
export const ORG_ID = `${SITE_ORIGIN}/#business`;
const SITE_ID = `${SITE_ORIGIN}/#website`;
const PERSON_ID = `${SITE_ORIGIN}/#coach-ty`;

const POSTAL = {
  '@type': 'PostalAddress',
  addressLocality: 'St. Petersburg',
  addressRegion: 'FL',
  addressCountry: 'US',
} as const;

const AREA_SERVED = [
  { '@type': 'City', name: 'Tampa' },
  { '@type': 'City', name: 'St. Petersburg' },
  { '@type': 'City', name: 'Clearwater' },
  { '@type': 'City', name: 'Brandon' },
  { '@type': 'City', name: 'Palm Harbor' },
  { '@type': 'City', name: 'Sarasota' },
  { '@type': 'State', name: 'Florida' },
] as const;

/**
 * Organization + LocalBusiness as one node.
 *
 * Deliberately no aggregateRating and no review array. Those are the two
 * properties that most improve a rich result and they are also the two this
 * business cannot yet substantiate. Marking up a rating that doesn't exist is
 * the kind of thing that costs a domain its rich results permanently.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness', 'ProfessionalService'],
    '@id': ORG_ID,
    name: SITE_NAME,
    alternateName: ['The Lola Local Growth System', 'Lola'],
    legalName: LEGAL_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/og.png`,
    image: `${SITE_ORIGIN}/og.png`,
    description:
      'Done-for-you local SEO and AI search visibility for local service businesses in Tampa Bay, Florida.',
    telephone: FOUNDER.phone,
    email: FOUNDER.email,
    priceRange: PRICE_RANGE,
    address: POSTAL,
    areaServed: AREA_SERVED,
    founder: { '@id': PERSON_ID },
    knowsAbout: [
      'Local SEO',
      'Google Business Profile optimization',
      'AI search visibility',
      'Answer engine optimization',
      'Local service business marketing',
    ],
    sameAs: ['https://tyalexandermedia.com', 'https://www.instagram.com/tyalexandermedia'],
  };
}

/** Coach Ty. Real name, real role, real contact. */
export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: FOUNDER.fullName,
    alternateName: FOUNDER.knownAs,
    jobTitle: FOUNDER.title,
    worksFor: { '@id': ORG_ID },
    url: `${SITE_ORIGIN}/`,
    email: FOUNDER.email,
    telephone: FOUNDER.phone,
    address: POSTAL,
    knowsAbout: ['Local SEO', 'Google Business Profile optimization', 'AI search visibility'],
    sameAs: ['https://www.instagram.com/tyalexandermedia'],
  };
}

/**
 * WebSite + SearchAction.
 *
 * The SearchAction is real: /growth-score?biz=<name> already prefills the
 * Growth Score form with that business (GrowthScore.tsx reads the `biz`
 * param), so the URL template describes something the site actually does.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: SITE_NAME,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/growth-score?biz={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * The paid offer, priced as the two recurring subscriptions it is.
 *
 * Two Offer nodes — Local Visibility and Local Growth System — each priced as a
 * monthly subscription. Real, published prices only; the custom Expansion route
 * has no fixed price and so is not marked up as an Offer.
 */
export function serviceSchema() {
  const offer = (name: string, monthly: string) => ({
    '@type': 'Offer',
    name,
    price: monthly.replace(/[^0-9.]/g, ''),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: `${SITE_ORIGIN}/pricing`,
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: monthly.replace(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
      unitCode: 'MON',
      billingIncrement: 1,
    },
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_ORIGIN}/#service`,
    name: 'Done-for-you local SEO and AI search visibility',
    serviceType: 'Local SEO',
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    audience: {
      '@type': 'Audience',
      audienceType: 'Local service businesses and home-service contractors',
    },
    offers: [
      offer(PLAN_VISIBILITY.name, PLAN_VISIBILITY.monthly),
      offer(PLAN_GROWTH.name, PLAN_GROWTH.monthly),
    ],
  };
}

export function breadcrumbSchema(meta: PageMeta) {
  if (!meta.breadcrumb?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      ...meta.breadcrumb.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: b.name,
        item: `${SITE_ORIGIN}${b.path}`,
      })),
    ],
  };
}

export function faqSchema(meta: PageMeta) {
  if (!meta.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${canonicalFor(meta.path)}#faq`,
    mainEntity: meta.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Every JSON-LD block for a route, in the order they should appear.
 */
export function schemaFor(path: string): object[] {
  const meta = PAGE_META[path];
  if (!meta) return [];
  const blocks: (object | null)[] = [
    organizationSchema(),
    personSchema(),
    websiteSchema(),
    serviceSchema(),
    breadcrumbSchema(meta),
    faqSchema(meta),
  ];
  return blocks.filter((b): b is object => b !== null);
}
