/**
 * Portfolio of real sites Lola built — the single source of truth.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  TO ADD A SITE: paste its live URL below. That's the whole job.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Each entry renders a card in the <Portfolio /> section. Clicking "Live
 * preview" opens a scrollable in-page preview of the real site (with a
 * desktop/phone toggle), plus an "Open live ↗" button that always works —
 * even for sites whose host blocks being embedded in a frame.
 *
 * The section auto-hides when this list is empty, so nothing fake ever ships.
 * Only add sites that are genuinely live and genuinely ours — this is proof,
 * and one dead link kills the trust the whole section is meant to build.
 */

export interface PortfolioSite {
  /** Business name shown on the card. */
  name: string;
  /** Live site URL — the one thing you have to paste. */
  url: string;
  /** Industry / trade, e.g. "Soft Wash / Pressure Washing". */
  vertical: string;
  /** Optional city + state, e.g. "Palm Harbor, FL". */
  location?: string;
  /** Optional one-liner: what Lola did / the result. */
  blurb?: string;
  /**
   * Optional path to a screenshot under /public (e.g. "/images/work/foo.jpg").
   * When present it's used as the card thumbnail; otherwise the card shows a
   * branded browser-frame placeholder. Purely cosmetic — the live preview
   * works either way.
   */
  thumb?: string;
}

export const PORTFOLIO: PortfolioSite[] = [
  {
    name: 'Sandbar Soft Wash',
    url: 'https://www.sandbarsoftwash.com',
    vertical: 'Soft Wash / Pressure Washing',
    location: 'Palm Harbor, FL',
    // D-014: verifiable facts only (15+ years, 20+ cities, the public
    // dashboard). No ranking claim until the tracker has day-0 → day-30
    // receipts.
    blurb: 'A 15+ year business serving 20+ Tampa Bay cities — the founding proof story, rebuilt in the open on a live public dashboard.',
  },
  // NOTE: the Dunedin exterior-cleaning build (formerly listed here as "Tampa
  // Bay Power Clean") is intentionally NOT a portfolio entry. It isn't a Lola
  // client — it's a family business Ty edits directly, routing to Sandbar. It
  // was never on Lola's backend, so it doesn't belong in proof-of-work.
  {
    name: 'Travels by Val',
    url: 'https://www.travelsbyval.com',
    vertical: 'Travel & Vacations',
    blurb: 'Proof Lola works beyond home services — a full travel brand, built and launched.',
  },
  // ── Add the next build here ──────────────────────────────────────────────
  // { name: 'Business Name', url: 'https://theirsite.com', vertical: 'HVAC', location: 'Tampa, FL', blurb: 'What we did.' },
];

/** Bare hostname for browser-chrome display (drops protocol + www + trailing /). */
export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
}
