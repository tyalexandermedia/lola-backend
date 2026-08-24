/**
 * Per-route SEO metadata and structured data — ONE source, read by two consumers.
 *
 * ── The problem this exists to fix ───────────────────────────────────────
 * `useSeo` sets the title/description from inside `useEffect`. Effects don't
 * run during SSR, so the prerenderer (scripts/prerender.mjs) wrote the SAME
 * `index.html` <head> into all 14 route files. Measured before this change:
 *
 *     14 prerendered routes
 *       distinct <title>       : 1   (65 chars — over the 60 limit)
 *       distinct description   : 1   (303 chars — ~2x the 155 limit)
 *       distinct og:url        : 1   (the homepage, on every page)
 *       canonical tags         : 0 / 14
 *       distinct schema        : 1   (the homepage FAQ, claimed by every route)
 *
 * A JS-executing crawler eventually saw the right tags. The AI answer crawlers
 * this site is meant to be cited by — GPTBot, ClaudeBot, PerplexityBot,
 * Google-Extended — largely do not execute JS, so to every one of them all 14
 * pages were the same page. That is the opposite of the pitch.
 *
 * The FAQPage claim was the riskiest part: schema must describe content that is
 * actually on the page, and /work and /vs/hibu never rendered that FAQ.
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
 */

import { FOUNDER } from './lola';
import { PLAN, GUARANTEE } from './pricing';

/**
 * Canonical origin — ONE definition for the whole frontend.
 *
 * 2026-08-20: migrated from lola.tyalexandermedia.com to www.coachtyalexander.com.
 *
 * Env-overridable rather than a hardcoded literal, deliberately. A domain move
 * is the change most likely to need reverting under time pressure, and a
 * find-replace across 28 files is not something you want to be doing while the
 * site is serving the wrong canonical. Set VITE_SITE_ORIGIN in Vercel to point
 * everything — canonicals, og:url, every schema @id, the sitemap — somewhere
 * else in one variable, then redeploy.
 *
 * NOTE the www. It is canonical, and the apex must 301 to it. Serving both is
 * duplicate content; picking one and redirecting the other is the whole job.
 */
export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined)?.trim() ||
  'https://www.coachtyalexander.com'
).replace(/\/$/, '');
export const SITE_NAME = 'Lola Leads';
export const LEGAL_NAME = 'Ty Alexander Media';

/** Share image. 1200x630, shipped in public/. */
export const OG_IMAGE = `${SITE_ORIGIN}/og.png`;
export const OG_IMAGE_ALT =
  'Lola Leads — done-for-you local SEO for Tampa Bay service businesses. Website design included, then $397/month.';

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
 * FAQPage question is not in the page's visible text, because marking up
 * questions a visitor cannot see is what earns a structured-data manual action.
 */
export const AI_QA: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'How do I get my business found on Google and AI search?',
    a:
      'Four things decide it: a website written so machines can read it, a complete and active Google Business Profile, consistent business details everywhere you are listed, and recent reviews. Google reads all four to rank you in the map pack, and ChatGPT, Perplexity and Gemini read the same signals to decide which business to name when someone asks for a recommendation. Lola does all four for local service businesses in Tampa Bay for ' +
      `${PLAN.price}${PLAN.period}, with the website design included.`,
  },
  {
    q: 'What is a Growth Score?',
    a:
      "A Growth Score is a free 60-second check of how visible your business is right now, on Google and inside AI answers. It scores five areas: your Google Business Profile, how readable your website is to search engines and AI, your reviews, how consistent your business details are across the web, and whether AI tools name you when someone asks for a business like yours. You get a number out of 100 and the specific fixes behind it. No payment and no call required.",
  },
  {
    q: 'How much does local SEO cost for a contractor?',
    a:
      `Lola is ${PLAN.price}${PLAN.period}, all-inclusive, and your website design is included free — no setup fee and no separate build charge. Most done-for-you providers charge several times that, quote only after a sales call, and ask for a 6- or 12-month contract plus a few thousand up front for the site — the /vs pages break down what each named competitor actually charges. Lola has no long contract: cancel anytime after the first 3 months. ` +
      GUARANTEE.short,
  },
  {
    q: 'How long does local SEO take to work?',
    a:
      'Expect the first movement in 30 to 90 days. Google Business Profile fixes and review activity move fastest, often inside a few weeks, while ranking for competitive service-and-city searches usually takes two to three months of consistent work. That is why the guarantee is measured at 90 days: ' +
      GUARANTEE.short.toLowerCase(),
  },
  {
    q: 'What areas does Lola serve?',
    a:
      'Tampa Bay and the surrounding Florida markets — Tampa, St. Petersburg, Clearwater, Brandon, Palm Harbor and Sarasota, plus the service areas around them. Lola takes one client per trade per city, so a business and its direct local competitor are never both clients.',
  },
];

/**
 * Homepage questions about the business itself.
 *
 * The "Can you actually guarantee leads?" answer used to end by spelling out
 * the RETIRED Half-Back terms — "at least 1 to page 1 or the map pack within
 * 30 days, you get half back" — two entries after the next answer promised the
 * 90-Day Promise. Same page, same accordion, two different guarantees, and
 * both were in the FAQPage schema. It survived the earlier sweep because it
 * never uses the hyphenated "Half-Back" token that sweep searched for.
 */
export const BRAND_QA: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What kinds of businesses does Lola work with?',
    a: 'Local service businesses of all kinds — pressure washing, plumbing, HVAC, roofing, pool care, cleaning, and other local trades. If your next customer is searching Google or asking ChatGPT for a business near them, Lola helps them find you.',
  },
  {
    q: 'Is there a guarantee?',
    a: `Yes — ${GUARANTEE.title}. We pick your money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free. No fine print.`,
  },
  {
    q: 'Can you actually guarantee leads?',
    a: `No — and we won't pretend to. We guarantee visibility: that you're found and clickable on Google and in AI answers. Whether a click becomes a job also depends on your pricing and follow-through. ${GUARANTEE.title} covers the ranking we control — ${GUARANTEE.short.toLowerCase()}`,
  },
  {
    q: 'Does Lola help me show up in ChatGPT and AI search, not just Google?',
    a: "Yes — that's the whole point. Lola optimizes for both traditional Google local results and AI search (ChatGPT, Perplexity, Gemini, Google AI Overviews), because that's increasingly where buyers ask for a recommendation.",
  },
  {
    q: 'Why is it $397/month when agencies quote $5,000 a month?',
    a: `Because you're not paying for an office, an account manager, or a sales team — Ty does the work himself. A $5,000/month retainer is $60,000 in year one and usually a 12-month contract. The monthly is ${PLAN.price}${PLAN.period}, no long contract, and if I don't get you ranking in 90 days your next 2 months are free. Same job, without the overhead you were funding.`,
  },
  {
    q: 'Who is behind Lola?',
    a: `${FOUNDER.fullName} — "${FOUNDER.knownAs}" — based in St. Petersburg and serving all of Tampa Bay. He's a group strength & conditioning coach and a full-time GM who trains for HYROX, and he built Lola to fix the local visibility of his father's real business, Sandbar Soft Wash. He now runs that same system for other local service businesses, does the work himself, and answers his own phone.`,
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
 * Pricing-page questions. The two demand queries lead — those are what an
 * answer engine is resolving when it picks a page to cite for "how much does
 * local SEO cost" — then the specifics a buyer needs before a card comes out.
 *
 * Lives here rather than in PricingPage.tsx so the FAQPage the prerenderer
 * writes covers every question the page actually shows. When the list lived in
 * the component, pageMeta could only claim the two it knew about.
 */
export const PRICING_QA: ReadonlyArray<{ q: string; a: string }> = [
  ...pick(AI_QA, [
    'How much does local SEO cost for a contractor?',
    'How long does local SEO take to work?',
  ]),
  { q: 'What if you don’t rank me?', a: GUARANTEE.faqAnswer },
  {
    q: 'Is the website really included?',
    a: "Yes — designed, built, and kept current, with no setup fee and no build charge. Most shops bill $3,000 or more for the build and then charge you monthly on top. Here it's part of the monthly, and you review it before it goes live.",
  },
  {
    q: 'What makes it an “AI website”?',
    a: "Your customers have stopped scrolling ten blue links — they ask ChatGPT or Google's AI for a company like yours and take the answer. Those tools can only recommend a business they can actually read, and most websites are invisible to them. Yours is written so they can read it, and name you.",
  },
  {
    q: 'Am I locked in?',
    a: 'Cancel anytime after the first 3 months. I ask for three because that’s honestly how long this takes to land — anything shorter can’t be judged fairly, in either direction.',
  },
  {
    q: 'What do I have to do?',
    a: 'A 2-minute intake after checkout, and pick your money keywords with me in week 1. After that you run your business — everything else is mine.',
  },
  {
    q: 'Do I have to get on a call?',
    a: "No. Start from this page in one tap — no call, no sales pitch, no waiting on my calendar. If you want to ask something first, text me and I'll answer myself.",
  },
];

/**
 * Route -> metadata. Keys match scripts/prerender.mjs ROUTES exactly; the
 * checker fails the build if they drift apart.
 *
 * Titles lead with what someone types into a search box ("local SEO for
 * contractors", "AI search visibility", "local SEO pricing") rather than with
 * the brand, because the brand is not what anyone is searching for yet.
 */
export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Local SEO for Contractors — Found on Google & AI',
    description:
      'Done-for-you local SEO for Tampa Bay service businesses. Get found on Google and in ChatGPT, Perplexity and Gemini. Free Growth Score, then $397/month.',
    path: '/',
    faq: HOME_QA,
  },
  '/pricing': {
    title: 'Local SEO Pricing — $397/mo, Website Included',
    description:
      'One all-inclusive plan for local service businesses: $397/month, website design included free, Google Business Profile managed, AI search visibility.',
    path: '/pricing',
    breadcrumb: [{ name: 'Pricing', path: '/pricing' }],
    faq: PRICING_QA,
  },
  '/growth-score': {
    title: 'Free Growth Score — Google & AI Visibility Check',
    description:
      'See how visible your business is on Google and in AI answers in 60 seconds. Free Growth Score for local service businesses — no call, no card, no signup.',
    path: '/growth-score',
    breadcrumb: [{ name: 'Growth Score', path: '/growth-score' }],
    faq: SCORE_QA,
  },
  '/lolaleads': {
    title: 'Lola Leads — Local SEO & AI Visibility, $397/mo',
    description:
      'Done-for-you local SEO and AI search visibility for home-service contractors. Free Growth Score, then $397/month with your website design included.',
    path: '/lolaleads',
    breadcrumb: [{ name: 'Lola Leads', path: '/lolaleads' }],
  },
  '/work': {
    title: 'Local Business Websites We Built & Rank',
    description:
      'Real websites Lola designed and ranked for Tampa Bay service businesses. Scroll the live sites, then start your own — $397/month, design included free.',
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
      'Tell Coach Ty about your business and he takes it from there. Done-for-you local SEO and AI search visibility for Tampa Bay service businesses, $397/month.',
    path: '/apply',
    breadcrumb: [{ name: 'Get Started', path: '/apply' }],
  },
  '/start': {
    title: 'Start Local SEO — $397/mo, Website Included',
    description:
      'Start done-for-you local SEO for your service business: $397/month, website design included free, no setup fee. One tap, no sales call. 90-Day Promise.',
    path: '/start',
    breadcrumb: [{ name: 'Start', path: '/start' }],
  },
  '/case-studies/sandbar': {
    title: 'Sandbar Soft Wash — Local SEO Case Study',
    description:
      'How Lola rebuilt local visibility for a 15-year Palm Harbor pressure-washing business, tracked in the open on a live public dashboard anyone can check.',
    path: '/case-studies/sandbar',
    breadcrumb: [
      { name: 'Case Studies', path: '/case-studies' },
      { name: 'Sandbar Soft Wash', path: '/case-studies/sandbar' },
    ],
  },
  '/case-studies': {
    title: 'Local SEO Case Studies — Tampa Bay Contractors',
    description:
      'How Lola rebuilt local visibility for real Tampa Bay service businesses, tracked in the open on live public dashboards rather than in a sales deck.',
    path: '/case-studies',
    breadcrumb: [{ name: 'Case Studies', path: '/case-studies' }],
  },
  '/vs': {
    title: 'Lola vs Local SEO Agencies & Tools — Compared',
    description:
      'Honest comparisons of Lola against LocalIQ, BrightLocal, Scorpion, Podium, Yext, Hibu and Local Service Ads — real pricing, and where each one wins.',
    path: '/vs',
    breadcrumb: [{ name: 'Comparisons', path: '/vs' }],
  },
};

/** The /vs/<slug> pages, generated so every competitor gets its own metadata. */
const VS: ReadonlyArray<[slug: string, name: string, hook: string]> = [
  ['localiq', 'LocalIQ', 'quote-only enterprise pricing vs a published $397/month'],
  ['brightlocal', 'BrightLocal', 'a DIY toolset you run yourself vs done-for-you local SEO'],
  ['scorpion', 'Scorpion', 'a $3K+/month agency vs a published $397/month, no contract'],
  ['podium', 'Podium', 'review and messaging software vs done-for-you local SEO'],
  ['yext', 'Yext', 'listings sync you rent vs local SEO and AI visibility you own'],
  ['hibu', 'Hibu', 'a bundled ad-agency contract vs a published $397/month'],
  ['local-service-ads', 'Local Service Ads', 'paid leads per call vs organic and AI visibility you keep'],
];

for (const [slug, name, hook] of VS) {
  PAGE_META[`/vs/${slug}`] = {
    // Kept short on purpose: "Lola vs <name>" is the query, everything after it
    // is for the human. Longest of these is 58 characters.
    title: `Lola vs ${name} — Local SEO Compared`,
    description: `${name} vs Lola for local service businesses: ${hook}. An honest look at where each one wins.`,
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
// Kept as "#business" rather than the more obvious "#organization": four
// components (Grader, GrowthScore, Methodology, SandbarCaseStudy) already point
// their provider/publisher at this exact @id. Renaming the node would leave
// every one of those references dangling at a node that no longer exists.
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
 * business cannot yet substantiate — Sandbar has no public reviews at the time
 * of writing. Marking up a rating that doesn't exist is the kind of thing that
 * costs a domain its rich results permanently.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness', 'ProfessionalService'],
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/og.png`,
    image: `${SITE_ORIGIN}/og.png`,
    description:
      'Done-for-you local SEO and AI search visibility for local service businesses in Tampa Bay, Florida.',
    telephone: FOUNDER.phone,
    email: FOUNDER.email,
    priceRange: `${PLAN.price}${PLAN.period}`,
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
 * If that param is ever removed, delete this action rather than leaving
 * markup that promises an entry point that no longer works.
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

/** The paid offer, priced as the recurring subscription it is. */
export function serviceSchema() {
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
    offers: {
      '@type': 'Offer',
      name: PLAN.name,
      price: PLAN.price.replace(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_ORIGIN}/pricing`,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: PLAN.price.replace(/[^0-9.]/g, ''),
        priceCurrency: 'USD',
        unitCode: 'MON',
        billingIncrement: 1,
      },
    },
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
 *
 * Organization / Person / WebSite / Service carry stable @ids and are emitted
 * on every page so a crawler landing on any single URL can resolve the entity
 * without having to fetch the homepage first — which is exactly the situation
 * an AI answer engine is in when it cites one page.
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
