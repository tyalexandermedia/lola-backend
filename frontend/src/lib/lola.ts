/**
 * Lola — the dog the company is named after — and the founder's identity
 * strings, in one place so the bio can't drift between surfaces.
 *
 * Her age is derived rather than hardcoded: the homepage and the retainer page
 * both say "turns N this February 16", and a hardcoded N silently goes wrong
 * every February. Note this is evaluated when the module loads, so prerendered
 * HTML carries the BUILD-time value; visitors with JS see the current one.
 * Any deploy after 16 Feb refreshes the static copy.
 */

const LOLA_BORN_YEAR = 2018;
const LOLA_BORN_MONTH = 1; // 0-indexed → February
const LOLA_BORN_DAY = 16;

/** The age Lola turns on her NEXT birthday. */
export function lolaNextAge(now: Date): number {
  const year = now.getFullYear();
  const birthdayThisYear = new Date(year, LOLA_BORN_MONTH, LOLA_BORN_DAY);
  // Before her birthday she still turns that age this year; after it, next year.
  const nextBirthdayYear = now.getTime() > birthdayThisYear.getTime() ? year + 1 : year;
  return nextBirthdayYear - LOLA_BORN_YEAR;
}

export const LOLA_TURNS = lolaNextAge(new Date());

/** Founder identity — full legal name, what people call him, and the line
 *  that signs off every founder story. Single source so "Coach Ty" never
 *  appears without the real name behind it. */
export const FOUNDER = {
  /** Full legal name — used wherever the sign-off carries authority. */
  fullName: 'Ty Alexander Traufield',
  /** What Tampa Bay actually calls him. */
  knownAs: 'Coach Ty',
  title: 'Founder, Lola Leads',
  company: 'Ty Alexander Media',
  location: 'St. Pete · serving all of Tampa Bay, FL',
  /** Direct line. Mirrors the telephone/email in index.html's JSON-LD —
   *  "you text Ty directly" is the offer, so the number has to be on the
   *  surfaces where a client would reach for it. */
  phone: '+1-727-300-6573',
  phoneDisplay: '(727) 300-6573',
  email: 'ty@tyalexandermedia.com',
  // No `calendar` field on purpose. Ty doesn't sell on calls, and a booking URL
  // sitting in the founder record is how one keeps reappearing in new CTAs.
} as const;
