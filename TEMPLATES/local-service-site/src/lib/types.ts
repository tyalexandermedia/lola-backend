/** A field the client confirmed they do not have. Renders as nothing, never as a placeholder. */
export type Unavailable = 'unavailable';

export interface Hours {
  days: string[];
  /** 24h, e.g. "08:00" */
  opens: string;
  closes: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface SiteConfig {
  legalName: string;
  publicName: string;
  /** https origin with no trailing slash, e.g. https://www.acmewash.com */
  domain: string;
  /** E.164, e.g. +17275550123 */
  phone: string;
  allowSms?: boolean;
  /** Optional: many call-first businesses do not publish one. */
  email?: string | Unavailable;
  primaryCustomer: string;
  tagline?: string | Unavailable;
  serviceArea: { summary: string; region: string; cities: string[] };
  address?: Address | Unavailable;
  hours: Hours[];
  /** path: URL segment for the CTA page, e.g. "estimate", "consultation", "contact". Default "estimate". */
  cta: { label: string; responsePromise: string; path?: string; shortLabel?: string };
  /** Optional hand-written homepage meta description (<= 155 chars). Beats the formula every time. */
  homeDescription?: string | Unavailable;
  /** Optional footer notice, e.g. attorney advertising or license disclaimers. */
  legalNotice?: string | Unavailable;
  schemaType?: string;
  foundingYear?: string | Unavailable;
  licenseNumber?: string | Unavailable;
  about?: string | Unavailable;
  process?: Array<{ title: string; text: string }> | Unavailable;
  faqs?: Array<{ q: string; a: string }> | Unavailable;
  social?: Record<string, string | Unavailable>;
}

export interface BrandConfig {
  colors: { primary: string; accent: string; ink: string; background: string };
  fontStack?: string;
  logo: string;
  logoAlt?: string;
  favicon?: string | Unavailable;
  heroImage?: string | Unavailable;
  heroImageAlt?: string | Unavailable;
  ogImage?: string | Unavailable;
}

export interface Review {
  quote: string;
  author: string;
  source: string;
  sourceUrl: string;
  date?: string;
}

export interface BeforeAfterPair {
  before: string;
  after: string;
  label: string;
  alt: string;
}

export interface ProofConfig {
  yearsInBusiness?: number | string | Unavailable;
  googleRating?: { rating: number; count: number; url: string } | Unavailable;
  reviewPlatformUrl?: string | Unavailable;
  reviews: Review[];
  certifications: string[];
  guarantees: string[];
  beforeAfter: BeforeAfterPair[];
}

export interface IntegrationsConfig {
  ghl: { webhookEnvVar: string; source: string; tags: string[] };
  notifications: { resendEnvVar: string; from: string | Unavailable; emails: string[] };
  ga4MeasurementId?: string | Unavailable;
}
