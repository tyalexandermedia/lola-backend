/**
 * LOLA OS — pricing & roadmap, single frontend source of truth.
 *
 * Mirror of docs/PRICING.md. When pricing changes: update docs/PRICING.md first,
 * then this file, then db/pricing.py and frontend/scripts/gen_lp.py (regenerate LPs).
 *
 * Model: a phased growth roadmap (Foundation → Growth → Scale), NOT a generic
 * monthly SEO package. Replaces the retired "Local Lock" 3-tier model.
 */

export interface RoadmapStage {
  id: 'foundation' | 'growth' | 'scale';
  phase: string;
  name: string;
  /** Display price, e.g. "$297" */
  price: string;
  /** Period suffix, e.g. "one-time" or "/month" */
  period: string;
  /** Optional secondary price note, e.g. "$997+ competitive markets" */
  priceNote?: string;
  featured?: boolean;
  badge?: string;
  /** Who it's for. */
  positioning: string;
  /** What the stage delivers. */
  outcome: string;
  includes: string[];
  cta: string;
}

export const ROADMAP: ReadonlyArray<RoadmapStage> = [
  {
    id: 'foundation',
    phase: 'Phase 1',
    name: 'Foundation Sprint',
    price: '$297',
    period: 'one-time',
    positioning:
      'For businesses that need their online foundation created, cleaned up, or rebuilt. The goal isn’t market dominance — it’s a usable base, and the moment you think “they actually know my business.”',
    outcome: 'A searchable, trackable, presentable foundation — your start line.',
    includes: [
      'Landing page / website foundation',
      'Core SEO setup + Google indexing basics',
      'Technical cleanup where possible',
      'Basic on-page SEO + primary service positioning',
      'Local service-area targeting',
      'Contact / call CTA setup',
      'Analytics + tracking check',
      'Dashboard access (where available)',
      'Baseline audit + visibility score',
      'First 90-day roadmap snapshot + next priority',
    ],
    cta: 'Start with the Foundation Sprint',
  },
  {
    id: 'growth',
    phase: 'Phase 2',
    name: 'Growth Roadmap',
    price: '$497',
    period: '/month',
    featured: true,
    badge: 'Most Popular',
    positioning:
      'For businesses ready to build momentum once the foundation is in place. This is where rankings, impressions, calls, and lead signals start becoming visible.',
    outcome: 'Consistent visibility signals and the first real movement on the dashboard.',
    includes: [
      'Everything in Foundation, ongoing',
      'Ongoing SEO improvements',
      'Landing page enhancements',
      'Service / service-area content expansion',
      'Google Business posting + updates (where access exists)',
      'Call / form / message tracking review',
      'Monthly roadmap update',
      'Dashboard progress tracking',
      'Basic local competitor monitoring',
      'Review strategy support',
      'Early evidence capture',
    ],
    cta: 'Continue into Growth',
  },
  {
    id: 'scale',
    phase: 'Phase 3',
    name: 'Scale System',
    price: '$697',
    period: '/month',
    priceNote: '$997+/mo for competitive markets, multi-location, or heavier execution',
    badge: 'For competitive markets',
    positioning:
      'For businesses ready to compete across multiple services, service areas, and channels. Turns the foundation and growth work into a repeatable lead-generation system.',
    outcome: 'An ongoing growth operating system — not just a website. 90+ days compounds.',
    includes: [
      'Everything in Growth',
      'Multi-service SEO expansion',
      'Multi-city / service-area strategy',
      'Content strategy',
      'Review growth system',
      'Advanced dashboard reporting',
      'Revenue / call / lead attribution',
      'Conversion optimization',
      'Competitor monitoring',
      'Monthly strategy review + opportunity recommendations',
      'Evidence Engine entries + blueprint feedback loop',
      'AI Visibility add-on eligible',
    ],
    cta: 'Scale with LOLA OS',
  },
];

export interface AddOn {
  name: string;
  emoji: string;
  price: string;
  blurb: string;
  note?: string;
}

export const ADD_ONS: ReadonlyArray<AddOn> = [
  {
    name: 'Social Posting System',
    emoji: '📣',
    price: '$200–$500/mo',
    blurb:
      'We post for you — Google Business, Facebook, and Instagram. Short-form repurposing + a content calendar. Posting only, no editing.',
    note: 'Priced by volume. YouTube + TikTok on request.',
  },
  {
    name: 'Video / Shorts System',
    emoji: '🎬',
    price: 'from $200/mo',
    blurb:
      'Short-form video planning + Shorts/TikTok/Reels repurposing workflow, caption + title suggestions, posting support where integration exists.',
  },
  {
    name: 'Email / SMS Follow-Up',
    emoji: '✉️',
    price: '$99–$300/mo',
    blurb:
      'Follow-up campaigns, lead nurture messages, offer reminders, and seasonal promotions so leads don’t go cold.',
  },
  {
    name: 'SEO Sprint',
    emoji: '⚡',
    price: '$197–$497 one-time',
    blurb:
      'Targeted page optimization, technical cleanup, internal-linking pass, metadata updates, and local keyword improvements.',
  },
  {
    name: 'AI Visibility',
    emoji: '🤖',
    price: 'Premium add-on',
    blurb:
      'Track + improve how you appear in ChatGPT, Perplexity, Gemini, and Google AI answers.',
    note: 'Paid tier only — API costs + manual review may apply.',
  },
];

export interface LeadMagnet {
  name: string;
  blurb: string;
  href: string;
}

export const LEAD_MAGNETS: ReadonlyArray<LeadMagnet> = [
  {
    name: 'Free Landing Page',
    blurb: 'See what a high-converting online foundation could look like for your business.',
    href: '/apply',
  },
  {
    name: 'Free Lola Audit',
    blurb: 'Website, SEO visibility, Google Business, and a local competitor snapshot — with a roadmap recommendation.',
    href: '/grade',
  },
  {
    name: 'Free 90-Day Roadmap',
    blurb: 'Why 30 days is only the foundation — and where compounding visibility actually begins.',
    href: '/apply',
  },
];

/** The six Growth Score dimensions shown on the client dashboard. */
export const GROWTH_SCORE_DIMENSIONS: ReadonlyArray<string> = [
  'Foundation',
  'Growth',
  'Authority',
  'AI Visibility',
  'Reputation',
  'Revenue Tracking',
];

/** Plain-text price range for schema.org / meta tags. */
export const PRICE_RANGE = '$297–$997';

/** Guarantees — real, existing. Never fabricate results beyond these. */
export const GUARANTEES = [
  {
    emoji: '🛡️',
    title: '30-Day Half-Back Guarantee',
    body:
      'If Lola doesn’t move your ranking in your first 30 days, your next month is half off — Coach Ty refunds 50%.',
  },
  {
    emoji: '📊',
    title: 'First Win Promise',
    body:
      'At least one measurable win — a new ranking, a new lead, or a Google Business improvement — in your first 60 days, or your next month is on us.',
  },
] as const;
