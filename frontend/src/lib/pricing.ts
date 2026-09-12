/**
 * Coach Ty Leads — pricing & offer (frontend source of truth for React surfaces).
 *
 * MIRROR, NOT ORIGIN. `docs/PRICING.md` is canonical. On any change, sync in
 * this order: docs/PRICING.md → this file → db/pricing.py → frontend/scripts/gen_lp.py.
 *
 * 2026-09-12 — migrated from the single $397 all-inclusive plan to a free
 * diagnostic + TWO genuinely different paid plans + a custom Expansion route:
 *   • Free Growth Score — $0, the diagnostic and primary low-friction entry.
 *   • Local Visibility — $397/mo + $397 activation. For a business that already
 *     has a usable website and needs stronger visibility, reviews and lead response.
 *   • Local Growth System — $797/mo + $997 launch (RECOMMENDED). Adds the
 *     conversion-focused website and the full foundation.
 *   • Expansion — custom, from $1,497/mo. Multi-location / multi-territory.
 *
 * Brand: Coach Ty Leads (company). Product/system: The Lola Local Growth System.
 * Founder: Ty Alexander. Legal entity "Ty Alexander Media LLC" — footer/legal only.
 * "Lola watches. Ty does the work." — supporting personality copy, used once.
 *
 * The old ranking guarantee ("page one / map pack in 90 days or 2 months free")
 * is retired: it promised a search-placement outcome we don't control. GUARANTEE
 * below now carries an implementation commitment — the thing we DO control.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FREE — the diagnostic and primary CTA
// ─────────────────────────────────────────────────────────────────────────────

export const FREE_GROWTH_SCORE = {
  name: 'Free Growth Score',
  price: '$0',
  idealFor:
    'A local business owner who wants to see what’s stopping the business from being found and chosen — before paying to fix anything.',
  includes: [
    'Local visibility snapshot',
    'Website and on-page review',
    'Google Business Profile review',
    'Review and reputation snapshot',
    'Lead-response gap check',
    'Your single highest-priority fix',
  ],
  supporting: 'See where leads are leaking before you pay to fix anything.',
  clarify: 'A 60-second diagnostic — not a guarantee, and not a complete SEO campaign.',
  cta: 'Run My Free Growth Score',
  href: '/growth-score',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TWO PAID PLANS
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanTier {
  id: 'visibility' | 'growth';
  name: string;
  /** Display monthly price, e.g. "$397". */
  monthly: string;
  period: string;
  /** One-time fee charged at start. */
  oneTime: { label: string; amount: string };
  /** Cost framed per day — shrinks the number next to a job. */
  perDay: string;
  term: string;
  recommended: boolean;
  idealFor: string;
  /** For the Growth card: the "everything in Visibility, plus" preface line. */
  inheritsLabel?: string;
  /** Plain-language inclusions — every line answers "what I get". */
  includes: string[];
  /** Plain-language exclusions — never hidden. */
  excludes: string[];
  cta: string;
  /** CTA target. Both plans route to /apply so territory + scope are confirmed
   *  before any charge, and so attribution/UTMs are captured. */
  ctaHref: string;
}

export const PLAN_VISIBILITY: PlanTier = {
  id: 'visibility',
  name: 'Local Visibility',
  monthly: '$397',
  period: '/month',
  oneTime: { label: 'activation', amount: '$397' },
  perDay: 'About $13/day + a one-time $397 to set it up.',
  term: '90-day initial term, then month-to-month.',
  recommended: false,
  idealFor:
    'A service business that already has a usable website but needs stronger Google visibility, more reviews, and faster lead response.',
  includes: [
    'Google Business Profile optimization and monthly management',
    'Service and category alignment',
    'Review-request system',
    'Missed-call text-back',
    'Basic lead follow-up',
    'Local citation / NAP review',
    'Call and form tracking',
    'Monthly Lola dashboard',
    'Direct access to Ty',
  ],
  excludes: [
    'A new custom website',
    'Paid advertising or ad spend',
    'Unlimited content',
    'Unlimited service-area pages',
    'Logo or full brand design',
    'Photography, drone or 360° media',
    'Multiple locations',
  ],
  cta: 'Improve My Visibility',
  ctaHref: '/apply?plan=visibility',
};

export const PLAN_GROWTH: PlanTier = {
  id: 'growth',
  name: 'Local Growth System',
  monthly: '$797',
  period: '/month',
  oneTime: { label: 'launch', amount: '$997' },
  perDay: 'About $27/day + a one-time $997 to build and launch.',
  term: '90-day initial term, then month-to-month.',
  recommended: true,
  idealFor:
    'A contractor who needs the complete foundation: a conversion-focused website, local visibility, reviews, tracking and lead follow-up — in one system.',
  inheritsLabel: 'Everything in Local Visibility, plus:',
  includes: [
    'Conversion-focused website build or strategic rebuild',
    'Up to five essential launch pages',
    'Technical SEO foundation',
    'LocalBusiness / service structured data where accurate',
    'Service and primary-market optimization',
    'Quote / estimate conversion path',
    'Automated text and email follow-up',
    'Lead-source and UTM attribution',
    'Estimate pipeline connection',
    'Monthly conversion and ranking review',
    'Ongoing website updates within a clearly defined reasonable scope',
  ],
  excludes: [
    'Paid-media budget',
    'Unlimited pages or redesign requests',
    'Custom software development',
    'Multiple businesses, locations or territories',
    'Drone / 360° production',
    'Guaranteed leads, revenue or rankings',
  ],
  cta: 'Build My Growth System',
  ctaHref: '/apply?plan=growth',
};

/** The two paid plans, in display order. Never a third equal card. */
export const PLAN_TIERS: readonly PlanTier[] = [PLAN_VISIBILITY, PLAN_GROWTH];

/**
 * Complete deliverables comparison — the accessible table under the two cards.
 * Derived by hand (not from includes[]) so the table stays readable and the two
 * plans line up row-for-row. `true` = included, `false` = not in that plan.
 */
export interface DeliverableRow {
  label: string;
  visibility: boolean;
  growth: boolean;
}
export const DELIVERABLES: readonly DeliverableRow[] = [
  { label: 'Google Business Profile optimization + monthly management', visibility: true, growth: true },
  { label: 'Service & category alignment', visibility: true, growth: true },
  { label: 'Review-request system', visibility: true, growth: true },
  { label: 'Missed-call text-back', visibility: true, growth: true },
  { label: 'Lead follow-up', visibility: true, growth: true },
  { label: 'Local citation / NAP review', visibility: true, growth: true },
  { label: 'Call & form tracking', visibility: true, growth: true },
  { label: 'Monthly Lola dashboard', visibility: true, growth: true },
  { label: 'Direct access to Ty', visibility: true, growth: true },
  { label: 'Conversion-focused website build or rebuild', visibility: false, growth: true },
  { label: 'Up to five essential launch pages', visibility: false, growth: true },
  { label: 'Technical SEO foundation', visibility: false, growth: true },
  { label: 'LocalBusiness / service structured data (where accurate)', visibility: false, growth: true },
  { label: 'Quote / estimate conversion path', visibility: false, growth: true },
  { label: 'Automated text + email follow-up', visibility: false, growth: true },
  { label: 'Lead-source & UTM attribution', visibility: false, growth: true },
  { label: 'Estimate pipeline connection', visibility: false, growth: true },
  { label: 'Monthly conversion & ranking review', visibility: false, growth: true },
  { label: 'Ongoing website updates (defined scope)', visibility: false, growth: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPANSION — custom route, shown below the two cards (not an equal third tier)
// ─────────────────────────────────────────────────────────────────────────────

export const EXPANSION = {
  name: 'Expansion',
  from: '$1,497',
  period: '/month',
  /** "starting at" — every custom engagement is scoped and priced to the work. */
  fromLabel: 'Custom, starting at',
  forWho: [
    'Multiple locations',
    'Multiple territories',
    'Advanced content and service-area expansion',
    'Advanced revenue attribution',
    'Custom integrations',
    'Higher-volume implementation',
    'Original drone or 360° content, coordinated through Ty Alexander Media',
  ],
  note: 'Priced to the scope of the work — not every custom engagement costs the same.',
  cta: 'Discuss Expansion',
  ctaHref: '/apply?plan=expansion',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMMITMENT — replaces the retired ranking guarantee (used site-wide via GUARANTEE)
// ─────────────────────────────────────────────────────────────────────────────

export const COMMITMENT = {
  title: 'Our launch commitment',
  short: 'We finish the agreed launch scope — or keep working at no extra management charge until it’s done.',
  body:
    'We agree on the launch scope and the tracked search terms before work begins. If the agreed foundation deliverables aren’t completed within the documented launch window for reasons under our control, we continue the unfinished implementation work without an additional management charge until it is complete.',
  qualification:
    'Results still depend on competition, proximity, business history, reviews, how quickly you respond to leads, and market conditions. We commit to the work — not to a specific ranking, lead count, or AI recommendation.',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TERRITORY — one client per trade, per agreed territory
// ─────────────────────────────────────────────────────────────────────────────

export const TERRITORY = {
  short: 'One active Coach Ty Leads client per primary trade, per agreed local territory.',
  points: [
    'Your territory is defined in writing before work begins.',
    'Exclusivity applies only while your account is active and current.',
    'Nearby territories and different trades may still be available.',
  ],
  why:
    'I can’t rank two soft-wash companies in the same town against each other — so I don’t take the second one. It’s a real constraint, not a countdown.',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Break-even calculator copy (logic lives in the component; no inputs stored)
// ─────────────────────────────────────────────────────────────────────────────

export const BREAK_EVEN = {
  title: 'How many jobs cover it?',
  inputLabel: 'Average profit from one completed job',
  helper: 'Use your profit on a job, not the total ticket.',
  disclaimer: 'This is cost math — not a lead or revenue promise. Nothing you type is stored or sent.',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// After you start (kept)
// ─────────────────────────────────────────────────────────────────────────────

export const AFTER_YOU_START: ReadonlyArray<{ step: string; detail: string }> = [
  { step: 'Run your Growth Score', detail: 'Free, 60 seconds, no card. See where leads are leaking.' },
  { step: 'Confirm scope + territory', detail: 'We agree the launch scope and tracked terms in writing before any charge.' },
  { step: 'Build and go live', detail: 'Work starts. Progress shows on your Lola dashboard as it lands.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// The free lead magnet (kept — Growth Score)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadMagnet {
  name: string;
  blurb: string;
  href: string;
}
export const LEAD_MAGNET: LeadMagnet = {
  name: 'Free Growth Score',
  blurb: FREE_GROWTH_SCORE.supporting,
  href: FREE_GROWTH_SCORE.href,
};

/** The six Growth Score dimensions shown on the client dashboard. */
export const GROWTH_SCORE_DIMENSIONS: ReadonlyArray<string> = [
  'Foundation',
  'Growth',
  'Authority',
  'AI Visibility',
  'Reputation',
  'Revenue Tracking',
];

// ═════════════════════════════════════════════════════════════════════════════
// BACK-COMPAT LAYER
// ~20 surfaces still import PLAN / GUARANTEE / PLAN_INCLUDED etc. They now resolve
// to the Local Growth System (the tier that carries the website-included story
// the rest of the site is built on) and the implementation commitment, so every
// legacy surface stays truthful under the new model until it is migrated. Remove
// as surfaces move to PLAN_TIERS.
// ═════════════════════════════════════════════════════════════════════════════

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  perDay: string;
  tagline: string;
  positioning: string;
  includes: string[];
  terms: string;
  cta: string;
}

export const PLAN: Plan = {
  id: 'growth',
  name: PLAN_GROWTH.name,
  price: PLAN_GROWTH.monthly,
  period: PLAN_GROWTH.period,
  perDay: PLAN_GROWTH.perDay,
  tagline: 'Get found. Get called. Get booked.',
  positioning:
    'The complete local growth system contractors own: a conversion-focused website, Google visibility, reviews, tracking and lead follow-up — built so more searches turn into calls, estimates and booked jobs.',
  includes: [
    'Conversion-focused website — designed, built and kept current',
    'Google Business Profile managed every month',
    'Review engine + missed-call text-back',
    'Automated text + email lead follow-up',
    'Call, form and UTM tracking on your Lola dashboard',
    'A direct line to Ty — not an account manager',
  ],
  terms: 'From $797/month + a one-time $997 launch. 90-day initial term, then month-to-month.',
  cta: PLAN_GROWTH.cta,
};

export interface PackageDetail {
  icon: string;
  title: string;
  detail: string;
  demo?: string;
}

/** The Growth System deliverables, expanded (homepage IncludedAccordion, etc.). */
export const PLAN_INCLUDED: ReadonlyArray<PackageDetail> = [
  {
    icon: '🌐',
    demo: 'website',
    title: 'A conversion-focused website — built and kept current',
    detail:
      'A fast, mobile-first site built around the jobs you actually want, with click-to-call and quote forms front and centre. You review it before it goes live, and it keeps getting updated within a defined scope — it never goes stale.',
  },
  {
    icon: '📍',
    demo: 'gbp',
    title: 'Google Business Profile, managed every month',
    detail:
      'Your profile is the map pin people tap and half your local leads. Right primary category, services, service areas, hours, photos and regular posts — so you turn up in the map pack when a neighbour searches for your work.',
  },
  {
    icon: '📲',
    demo: 'missed-call',
    title: 'Missed-call text-back',
    detail:
      "Miss a call while you're on a roof? The caller gets an instant text from your number, so the lead doesn't ring out and go to whoever answers next.",
  },
  {
    icon: '⭐',
    demo: 'reviews',
    title: 'A review engine that runs on its own',
    detail:
      'Your happy customers keep getting asked for a Google review without you remembering to. Review count is one of the biggest levers in the map pack and in closing quotes.',
  },
  {
    icon: '🔁',
    demo: 'follow-up',
    title: 'Automated lead follow-up',
    detail:
      "Every new lead gets followed up by text and email so nothing goes cold while you're in the field. Most jobs are lost to silence, not to price.",
  },
  {
    icon: '📊',
    demo: 'dashboard',
    title: 'A Lola dashboard you can open any time',
    detail:
      'Calls, forms, rankings and what shipped this month — on one page, with lead-source and UTM attribution so you see what’s actually producing work.',
  },
  {
    icon: '🤝',
    demo: 'direct',
    title: 'A direct line to Ty',
    detail:
      "You're not routed through a support desk or account manager. You reach Ty directly — real answers, from the person doing the work. Lola watches. Ty does the work.",
  },
];

export const MONTHLY_AT_A_GLANCE: ReadonlyArray<string> = [
  'Website that converts',
  'Google Business managed',
  'Missed-call text-back',
  'Review engine',
  'Text + email follow-up',
  'Your live dashboard',
];

/** GUARANTEE now carries the implementation commitment (see COMMITMENT). The old
 *  sub-fields are preserved so existing consumers render the honest version. */
export const GUARANTEE = {
  emoji: '🤝',
  title: COMMITMENT.title,
  short: COMMITMENT.short,
  body: COMMITMENT.body,
  name: COMMITMENT.title,
  full: COMMITMENT.body,
  faqAnswer:
    'No — we don’t guarantee a ranking, a lead count, or an AI recommendation; anyone who does is guessing. ' +
    COMMITMENT.short,
} as const;

export const GUARANTEES = [GUARANTEE] as const;
export const HALF_BACK_GUARANTEE = GUARANTEE;

/** Retired-tier aliases — resolve to the Growth System so a missed import can’t
 *  ship a dead price. Migrate callers to PLAN_TIERS, then delete. */
export const DIY = PLAN;
export const BUILD = PLAN;
export const TIERS = [PLAN] as const;
export const BUILD_INCLUDED = PLAN_INCLUDED;

/** Plain-text price range for schema / meta. */
export const PRICE_RANGE = '$397–$797/month';

/** Territory (legacy name EXCLUSIVITY, kept for existing surfaces). */
export const EXCLUSIVITY = {
  short: 'One client per trade, per agreed territory',
  why: TERRITORY.why,
} as const;

/**
 * Free-trial length in days. 0 = OFF. Before raising above 0 the Stripe link must
 * have a matching trial configured (see docs/PRICING.md).
 */
export const TRIAL_DAYS = 0;
export function trialLine(): string | null {
  return TRIAL_DAYS > 0
    ? `First ${TRIAL_DAYS} days free — cancel before you're charged.`
    : null;
}
