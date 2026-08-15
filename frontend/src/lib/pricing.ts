/**
 * Lola pricing — the single frontend constant every React surface imports.
 *
 * MIRROR, NOT SOURCE. `docs/PRICING.md` is canonical: change the price there
 * first, then sync this file, `db/pricing.py` and `frontend/scripts/gen_lp.py`.
 *
 * 2026-08-15 — collapsed from the two-tier one-time model (DIY $197, Full Build
 * $997) to ONE all-inclusive monthly. The Half-Back Guarantee retired with the
 * build it was attached to: it promised half your money back on a one-time
 * charge, which is meaningless against a subscription. The 90-Day Promise
 * replaces it, and pays out in work rather than a partial refund.
 *
 * Deliberately exports a single PLAN object rather than a TIERS array. There is
 * no second option to compare against, and leaving an array here invites a
 * comparison grid to grow back.
 */

export interface Plan {
  id: 'monthly';
  name: string;
  /** Display price, e.g. "$397" */
  price: string;
  /** Period suffix. */
  period: string;
  /** Cost framed per day — sits under the price to shrink the number. */
  perDay: string;
  /** The one-line positioning promise. */
  tagline: string;
  /** Who it's for / what it delivers, one plain sentence. */
  positioning: string;
  includes: string[];
  /** Cancellation terms, stated plainly next to the button. */
  terms: string;
  cta: string;
}

export const PLAN: Plan = {
  id: 'monthly',
  name: 'The monthly',
  price: '$397',
  period: '/month',
  perDay: 'About $13/day — one new client covers months.',
  tagline: 'Website design included free. Then I get you found.',
  positioning:
    "Most shops charge $3,000+ to build the site, then bill you monthly on top. Your website design is included — and it's built to be read by Google and by ChatGPT, so it brings work in instead of just sitting there looking nice.",
  // Each line answers "what does this get me", per the voice rules in
  // docs/PRICING.md. The website leads because it's the most concrete thing
  // included and the one an owner already knows he'd pay thousands for.
  includes: [
    'Your website designed and built — included free, no setup fee',
    'Written so AI can read it, so ChatGPT and Google name YOU when someone asks',
    'Google Business Profile managed and posted to — that’s the map pin people actually tap',
    'Every fix written for your business, not pulled off a template',
    'A direct line to Ty, not an account manager',
  ],
  terms: 'No setup fee. Cancel anytime after the first 3 months.',
  cta: 'Start my monthly',
};

/** What happens immediately after checkout — shown next to the button. */
export const AFTER_YOU_START: ReadonlyArray<{ step: string; detail: string }> = [
  { step: 'Checkout', detail: 'One tap — Apple Pay or card.' },
  { step: 'A 2-minute intake', detail: 'No call required unless you want one.' },
  { step: 'First wins in 7 days', detail: 'They show up on your dashboard as they land.' },
];

/**
 * The only guarantee. Replaces the Half-Back Guarantee, which promised half of a
 * one-time payment back and cannot be stated against a monthly plan.
 */
export const GUARANTEE = {
  emoji: '🛡️',
  title: 'The 90-Day Promise',
  body: "We pick your money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free.",
  name: 'The 90-Day Promise',
  short: 'Ranking in 90 days or your next 2 months are free.',
  full: "We pick your money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free.",
  faqAnswer: 'Your next 2 months are free. I only make money if the work lands.',
} as const;

/** Back-compat: some surfaces map over a GUARANTEES list. */
export const GUARANTEES = [GUARANTEE] as const;

/**
 * Back-compat aliases for the retired tiers. Both now resolve to the single
 * plan so a surface that hasn't been rewritten yet quotes the LIVE price
 * instead of a dead one. Every one of these should disappear as surfaces are
 * migrated — they exist so a missed import can't ship $997 to a customer.
 */
export const HALF_BACK_GUARANTEE = GUARANTEE;
export const DIY = PLAN;
export const BUILD = PLAN;
export const TIERS = [PLAN] as const;

export interface PackageDetail {
  icon: string;
  title: string;
  detail: string;
}

/**
 * What the monthly actually gets you, expanded. Every entry answers "what does
 * this get me" — never "what does this do". No schema or backlink lectures.
 *
 * The website leads deliberately: an owner already knows a site costs thousands,
 * so "included, no setup fee" is the most legible value here. The second entry
 * exists because "AI website" means nothing on its own — it has to be said in
 * terms of a customer asking ChatGPT and hearing your name.
 */
export const PLAN_INCLUDED: ReadonlyArray<PackageDetail> = [
  {
    icon: '🌐',
    title: 'Your website — designed and built, included free',
    detail:
      'Most shops charge $3,000 or more just to build it, then bill you monthly on top. Yours is included: a fast, mobile-first site built around the jobs you actually want, with click-to-call and quote forms front and centre. You review it before it goes live, and it keeps getting updated — it never goes stale.',
  },
  {
    icon: '🤖',
    title: "Built so AI can read it — that's the part nobody else does",
    detail:
      "Your customers have stopped scrolling ten blue links. They ask ChatGPT, Gemini or Google's AI for a company like yours and take the answer. Those tools can only recommend a business they can actually read — most sites are invisible to them. Yours is written so they can read it, and name you.",
  },
  {
    icon: '📍',
    title: 'Google Business Profile, managed every month',
    detail:
      'Your profile is half your local leads and the pin people actually tap. Right primary category, services, service areas, hours, photos, and regular posts — so you turn up in the map pack when a neighbour searches for your work, not three pages down.',
  },
  {
    icon: '✍️',
    title: 'Every fix written for your business',
    detail:
      "Not a checklist you have to interpret. The actual words — your page titles, your profile description, your posts — written for your trade, your town, and the jobs you want more of, then put live for you.",
  },
  {
    icon: '📊',
    title: 'A dashboard you can open any time',
    detail:
      "Calls, forms, rankings, and what I shipped this month — on one page, no login gymnastics, no waiting for a report. You can check my work whenever you like, and you should.",
  },
  {
    icon: '🤝',
    title: 'A direct line to Ty',
    detail:
      "You're not routed through a support desk or an account manager. You text Ty directly — real answers, fast, from the person doing the work.",
  },
  {
    icon: '🛡️',
    title: 'The 90-Day Promise',
    detail:
      "We pick your money keywords together in week 1. If I don't get you ranking on page one or in the map pack within 90 days, your next 2 months are free. I only make money if the work lands.",
  },
];

/** Back-compat alias — older surfaces import BUILD_INCLUDED. */
export const BUILD_INCLUDED = PLAN_INCLUDED;

/** Plain-text price for schema.org / meta tags. */
export const PRICE_RANGE = '$397/month';

export interface LeadMagnet {
  name: string;
  blurb: string;
  href: string;
}

/**
 * The free, branded top-of-funnel lead magnet. Never called a "free audit" —
 * see the voice rules in docs/PRICING.md.
 */
export const LEAD_MAGNET: LeadMagnet = {
  name: 'Free Growth Score',
  blurb:
    'A 60-second scan of how you show up on Google and in AI answers — with the one move that lifts you fastest.',
  href: '/growth-score',
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
