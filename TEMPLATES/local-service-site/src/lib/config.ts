import siteJson from '../../config/site.json';
import brandJson from '../../config/brand.json';
import proofJson from '../../config/proof.json';
import integrationsJson from '../../config/integrations.json';
import type { BrandConfig, IntegrationsConfig, ProofConfig, SiteConfig } from './types';

export const SITE = siteJson as unknown as SiteConfig;
export const BRAND = brandJson as unknown as BrandConfig;
export const PROOF = proofJson as unknown as ProofConfig;
export const INTEGRATIONS = integrationsJson as unknown as IntegrationsConfig;

/** Treat "unavailable", empty strings and empty arrays as absent. */
export function val<T>(v: T | 'unavailable' | undefined | null): T | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' && (v === 'unavailable' || v.trim() === '')) return undefined;
  if (Array.isArray(v) && v.length === 0) return undefined;
  return v as T;
}

export const ORIGIN = SITE.domain.replace(/\/$/, '');
export const absoluteUrl = (path: string): string => new URL(path, ORIGIN + '/').href;

export const CTA_PATH = `/${(SITE.cta.path || 'estimate').replace(/^\/+|\/+$/g, '')}`;
/** Short CTA wording for tight spots (sticky bar, nav). Falls back to the full label. */
export const CTA_SHORT = SITE.cta.shortLabel || SITE.cta.label;
export const PHONE_HREF = `tel:${SITE.phone}`;
export const SMS_HREF = `sms:${SITE.phone}`;

/** +17275550123 → (727) 555-0123. Non-US numbers fall back to the raw E.164. */
export function phoneDisplay(e164: string = SITE.phone): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = ((h + 11) % 12) + 1;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** "Mon–Fri: 8 AM – 6 PM" style lines for the footer. */
export function hoursDisplay(): string[] {
  return SITE.hours.map((h) => {
    const days =
      h.days.length > 1
        ? `${DAY_SHORT[h.days[0]] ?? h.days[0]}–${DAY_SHORT[h.days[h.days.length - 1]] ?? h.days[h.days.length - 1]}`
        : DAY_SHORT[h.days[0]] ?? h.days[0];
    return `${days}: ${to12h(h.opens)} – ${to12h(h.closes)}`;
  });
}

export const hasProof = {
  reviews: PROOF.reviews.length > 0,
  certifications: PROOF.certifications.length > 0,
  guarantees: PROOF.guarantees.length > 0,
  beforeAfter: PROOF.beforeAfter.length > 0,
  rating: !!val(PROOF.googleRating),
  years: !!val(PROOF.yearsInBusiness),
};
export const hasAnyTrust =
  hasProof.certifications || hasProof.guarantees || hasProof.rating || hasProof.years;

/** Cut to `max` characters at a word boundary, for titles and descriptions. */
export function clip(text: string, max: number): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  // Prefer ending on a full sentence, then on a word.
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'));
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:\-–]$/, '');
}
