/**
 * LOLA — pricing & offer, single frontend source of truth.
 *
 * Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
 * then this file, then db/pricing.py and frontend/scripts/gen_lp.py (regenerate LPs).
 *
 * Model: a simple two-tier offer.
 *   - DIY         $197 one-time   "See your score. Fix it yourself."
 *   - Full Build  $997 one-time   "We build it. We rank it — everywhere people search now."
 *
 * Replaces the retired Foundation → Growth → Scale roadmap ($297 / $497 / $697 / $997+).
 * The Growth Score stays the free, branded, top-of-funnel lead magnet.
 *
 * The $299/mo optional retainer is intentionally NOT modeled here: it is introduced
 * ONLY in the final follow-up email, never on any page.
 */

export interface OfferTier {
  id: 'diy' | 'build';
  name: string;
  /** Display price, e.g. "$197" */
  price: string;
  /** Period suffix — both tiers are one-time. */
  period: string;
  /** The one-line positioning promise. */
  tagline: string;
  /** Who it's for / what the tier delivers, one plain sentence. */
  positioning: string;
  includes: string[];
  featured?: boolean;
  badge?: string;
  /** Only the Full Build carries the Half-Back Guarantee. */
  guaranteed?: boolean;
  cta: string;
}

export const TIERS: ReadonlyArray<OfferTier> = [
  {
    id: 'diy',
    name: 'DIY',
    price: '$197',
    period: 'one-time',
    tagline: 'See your score. Fix it yourself.',
    positioning:
      'For owners who want the map and are happy to do the driving. You get your Growth Score plus the exact steps to lift it — no waiting on anyone.',
    includes: [
      'Your full Growth Score',
      'A simple 5-step fix-it checklist',
      'Self-service — fix it on your own time',
    ],
    cta: 'Get the DIY guide',
  },
  {
    id: 'build',
    name: 'Full Build',
    price: '$997',
    period: 'one-time',
    featured: true,
    badge: 'Done for you',
    guaranteed: true,
    tagline: 'We build it. We rank it — everywhere people search now.',
    positioning:
      'For owners who want it handled. We build the site and get you found — on Google and when people ask ChatGPT, Perplexity, or Gemini for a company like yours.',
    includes: [
      'Custom website build',
      '30 days of visibility work across Google and AI answer engines (ChatGPT, Perplexity, Gemini)',
      'Google Business Profile optimization',
      'Direct access to Ty during the build',
    ],
    cta: 'Start my build',
  },
];

// Convenience lookups for the two tiers.
export const DIY = TIERS.find((t) => t.id === 'diy')!;
export const BUILD = TIERS.find((t) => t.id === 'build')!;

export interface LeadMagnet {
  name: string;
  blurb: string;
  href: string;
}

/** The free, branded top-of-funnel lead magnet. Never called a "free audit". */
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

/**
 * "What's included, explained" — plain-English detail for each Full Build
 * deliverable. Powers the expandable clarity accordion on /pricing + /retainer.
 * Contractors buy what they understand; each line answers "what does that
 * actually mean for me?".
 */
export interface PackageDetail {
  icon: string;
  title: string;
  detail: string;
}

export const BUILD_INCLUDED: ReadonlyArray<PackageDetail> = [
  {
    icon: '🌐',
    title: 'A custom website built to get you calls',
    detail:
      'Not a template you have to wrestle with — a fast, clean, mobile-first site built around the jobs you actually want, with click-to-call and quote forms front and center. You review it before it goes live.',
  },
  {
    icon: '🔎',
    title: '30 days of getting you found — Google + AI',
    detail:
      "We don't build and bounce. For 30 days we work to get you found where buyers look now: Google's map pack and search results, and the AI answers people trust when they ask ChatGPT, Perplexity, or Gemini for a company like yours.",
  },
  {
    icon: '📍',
    title: 'Google Business Profile, dialed in',
    detail:
      'Your Google Business Profile is half your local leads. We set the right primary category, services, service areas, hours, photos, and posts so you show up in the map pack when neighbors search for your work.',
  },
  {
    icon: '🤝',
    title: 'Direct access to Ty during the build',
    detail:
      "You're not routed through a support desk or an account manager. You text Ty directly during the build — real answers, real fast, from the person doing the work.",
  },
  {
    icon: '🛡️',
    title: 'The Half-Back Guarantee',
    detail:
      'We pick 5 money keywords for your business together in week 1. If we don’t get at least 1 of them ranking on page 1 or in the map pack within 30 days, you get half your investment back. No fine print.',
  },
];

/** Plain-text price range for schema.org / meta tags. */
export const PRICE_RANGE = '$197–$997';

/**
 * The single guarantee — attached to the $997 Full Build. Exact approved copy.
 * (The old "First Win Promise" has been retired.)
 */
export const HALF_BACK_GUARANTEE = {
  emoji: '🛡️',
  title: 'Half-Back Guarantee',
  body:
    'We pick 5 money keywords for your business together in week 1. If we don’t get at least 1 of them ranking on page 1 or in the map pack within 30 days, you get half your investment back. No fine print.',
} as const;

/** Back-compat: some surfaces map over a GUARANTEES list. */
export const GUARANTEES = [HALF_BACK_GUARANTEE] as const;
