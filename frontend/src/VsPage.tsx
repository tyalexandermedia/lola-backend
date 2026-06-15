/// <reference types="vite/client" />
/**
 * Lola vs <Competitor> comparison pages — /vs/:slug.
 *
 * Single templated component, one config per competitor. Adding /vs/podium
 * later = append one entry to COMPETITORS, no new component needed.
 *
 * Design principles (Coach Ty voice: direct, faith-driven, no agency BS):
 *   1. Honest framing. "Pick them if X, pick Lola if Y" — never "they suck".
 *   2. Acknowledge what they do well — credibility beats shilling.
 *   3. Specifics over adjectives. Real prices, real models, real fit cases.
 *   4. Pricing transparency = the moat. Lola's $297/$697/$997 visible vs
 *      every competitor's "request a demo" gate.
 *   5. Two CTAs: book a call (warm leads) + run the free Grader (cold).
 *
 * Each page emits a FAQPage JSON-LD with switching/comparison questions —
 * targets high-intent organic ("lola vs localiq", "is brightlocal worth it",
 * "alternatives to scorpion", etc.).
 */

import { useEffect } from 'react';
import { track } from './analytics';

const CALENDAR_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

// ── Config types ─────────────────────────────────────────────

interface CompareRow {
  label: string;
  lola: string;
  them: string;
  lolaWin: boolean;   // visual highlight on the Lola cell
}

interface FaqEntry {
  q: string;
  a: string;
}

interface Competitor {
  slug: string;                  // URL slug: /vs/:slug
  name: string;                  // "LocalIQ"
  url: string;                   // canonical homepage for the citation link
  category: string;              // "Local Marketing Platform"
  oneLine: string;               // honest one-line description
  priceRange: string;            // displayed for the at-a-glance table
  metaTitle: string;
  metaDescription: string;
  tldr: {
    pickThemIf: string[];
    pickLolaIf: string[];
  };
  whereTheyWin: string[];        // honest list — what they're great at
  whereLolaWins: string[];       // specifics, not adjectives
  table: CompareRow[];
  faqs: FaqEntry[];
}

// ── COMPETITOR CONFIGS ───────────────────────────────────────
// Source of truth. Add new competitors by appending here.

const LOLA_PRICE = '$297 – $997/mo';
const LOLA_MODEL = 'Done-for-you, transparent monthly';

const LOCALIQ: Competitor = {
  slug: 'localiq',
  name: 'LocalIQ',
  url: 'https://localiq.com',
  category: 'Enterprise local marketing platform (Gannett-owned)',
  oneLine: 'A large-scale digital marketing service used by 1,000s of multi-location franchises and ad-spend-heavy local businesses.',
  priceRange: 'Quote-only (hidden)',
  metaTitle: 'Lola SEO vs LocalIQ — Which Local SEO is Right for You? | Lola',
  metaDescription: 'Honest comparison: LocalIQ\'s quote-only enterprise model vs Lola\'s transparent $297-$997/mo done-for-you local SEO. AI search visibility, real pricing, 30-day guarantee.',
  tldr: {
    pickThemIf: [
      'You manage 10+ locations and want a full ad-spend partner',
      'Your monthly marketing budget is $5K+ and you want a sales rep on call',
      'You\'re comfortable with a discovery call to learn pricing',
    ],
    pickLolaIf: [
      'You\'re a single-location or small-multi local business',
      'You want to know exactly what you\'ll pay before any call',
      'You want done-for-you local SEO + AI search visibility, not paid ads management',
    ],
  },
  whereTheyWin: [
    'Enormous breadth — SEO, paid search, social, display, and CRM in one vendor',
    'Industry-specific dashboards across legal, healthcare, automotive',
    'Sales + account-manager support layer for ad-spend optimization',
  ],
  whereLolaWins: [
    'Published pricing on the homepage — no demo gate to see what it costs',
    'AI search visibility is the core product, not an add-on (ChatGPT, Perplexity, Gemini, Google AI Overviews)',
    'You text Coach Ty directly — no account-manager telephone game',
    '30-Day Half-Back guarantee in writing — most enterprise vendors won\'t put a refund clause on paper',
  ],
  table: [
    { label: 'Pricing',                lola: '$297 / $697 / $997 /mo (public)', them: 'Request a quote',          lolaWin: true  },
    { label: 'Done-for-you?',          lola: 'Yes — every tier',                them: 'Yes (enterprise tiers)',   lolaWin: false },
    { label: 'Contract',               lola: 'Month-to-month, cancel anytime',  them: 'Typical annual term',      lolaWin: true  },
    { label: 'AI search visibility',   lola: 'Core product (ChatGPT / Perplexity / Gemini / Google AI)', them: 'Not a primary offering', lolaWin: true },
    { label: 'Free tool',              lola: '60-second AI Visibility Grader',  them: 'Website Grader (email-gated, 2 layers)', lolaWin: true },
    { label: 'Guarantee',              lola: '30-Day Half-Back + First Win',    them: 'Not published',            lolaWin: true  },
    { label: 'Founder access',         lola: 'Direct text / Slack with Coach Ty', them: 'Account manager',        lolaWin: true  },
    { label: 'Best for',               lola: '$200K–$2M/yr local service biz',  them: 'Multi-location / enterprise', lolaWin: false },
  ],
  faqs: [
    {
      q: 'Is Lola SEO a real alternative to LocalIQ for a single-location local business?',
      a: 'Yes — and arguably the better fit. LocalIQ\'s strength is multi-location scale and ad-spend management. If you\'re one location running on word-of-mouth + Google Maps, Lola\'s $297–$997/mo done-for-you local SEO is built for exactly that.',
    },
    {
      q: 'How does Lola\'s pricing compare to LocalIQ\'s?',
      a: 'LocalIQ does not publish pricing — every plan is quote-only behind a sales call. Lola publishes $297 (Starter), $697 (Growth, most popular), and $997 (Pro) monthly, no contracts, no setup fees. You can see exactly what you\'ll pay before any conversation.',
    },
    {
      q: 'Can I switch from LocalIQ to Lola?',
      a: 'Yes. Most LocalIQ contracts run annually — we\'ll help you run Lola in parallel during your remaining term so you have full data continuity, then transition cleanly. Book a free call and we\'ll map the handoff.',
    },
    {
      q: 'Does Lola handle paid ads like LocalIQ?',
      a: 'No — Lola is organic + AI search visibility. If you need paid Google Local Service Ads, paid social, or display ads managed in the same vendor, LocalIQ is the broader pick. Many Lola clients run paid ads separately and have us focus on the organic + AI side.',
    },
    {
      q: 'What about AI search (ChatGPT, Perplexity, Gemini)?',
      a: 'Lola was built around AI search visibility — it\'s the core product. We track which AI agents recommend you (and which competitor they recommend instead) and optimize for the queries buyers actually run. LocalIQ\'s search SEO is solid but AI-search isn\'t a primary offering today.',
    },
  ],
};

const BRIGHTLOCAL: Competitor = {
  slug: 'brightlocal',
  name: 'BrightLocal',
  url: 'https://www.brightlocal.com',
  category: 'Local SEO software platform (DIY)',
  oneLine: 'A respected local-SEO toolset used by 15,000+ businesses and SEO agencies — you do the work yourself.',
  priceRange: '$39 – $59/mo (software only)',
  metaTitle: 'Lola SEO vs BrightLocal — DIY Tool or Done-for-You? | Lola',
  metaDescription: 'BrightLocal is a great DIY tool ($39–$59/mo). Lola is done-for-you ($297–$997/mo). Which is right for your local business? Honest comparison from Coach Ty.',
  tldr: {
    pickThemIf: [
      'You have an in-house marketer or SEO agency doing the work',
      'You want rank tracking, citation tools, and review monitoring software',
      'You enjoy SEO and have 4–6 hours a week to manage it',
    ],
    pickLolaIf: [
      'You\'d rather run your business than learn SEO',
      'You want the work done, not a dashboard',
      'You also want AI search visibility built in, not just classic SEO',
    ],
  },
  whereTheyWin: [
    'Best-in-class local rank tracker and citation builder tooling',
    'Affordable software pricing ($39/$49/$59) — cheapest entry point in the category',
    'Trusted by SEO agencies for white-label local SEO audits',
  ],
  whereLolaWins: [
    'We do the work. BrightLocal hands you a tool — Lola hands you results.',
    'AI search visibility is built in — citations + ChatGPT/Perplexity/Gemini tracking, not just Google',
    'Coach Ty + AI agents execute weekly. No 4-hour-a-week DIY commitment.',
    '30-Day Half-Back guarantee. BrightLocal\'s a tool — there\'s no result to guarantee.',
  ],
  table: [
    { label: 'Pricing',           lola: '$297 / $697 / $997 /mo',         them: '$39 / $49 / $59 /mo (software)',  lolaWin: false },
    { label: 'Work done for you?', lola: 'Yes — full execution',          them: 'No — you DIY',                    lolaWin: true  },
    { label: 'Setup time',        lola: '48-hour onboarding',             them: 'Hours of setup + ongoing weekly', lolaWin: true  },
    { label: 'AI search included?', lola: 'Yes — core product',            them: 'Not a primary feature',           lolaWin: true  },
    { label: 'Guarantee',         lola: '30-Day Half-Back + First Win',   them: 'Free-trial only',                 lolaWin: true  },
    { label: 'Direct founder access', lola: 'Yes — Coach Ty',              them: 'Customer support',                lolaWin: true  },
    { label: 'Best for',          lola: 'Owners who\'d rather operate',    them: 'In-house marketers + agencies',   lolaWin: false },
  ],
  faqs: [
    {
      q: 'Should I use BrightLocal or Lola SEO?',
      a: 'They serve different needs. BrightLocal ($39–$59/mo) is a software tool — you do the SEO work, it gives you the dashboard. Lola ($297–$997/mo) is done-for-you — we run the playbook for you. If your time is worth more than the price gap, Lola pays back. If you have an in-house SEO already, BrightLocal is the better tool.',
    },
    {
      q: 'Is BrightLocal worth it for a small business owner?',
      a: 'Honest answer: only if you\'re going to actually use it. Most small-business owners buy SEO software and abandon the dashboard within 60 days because running local SEO weekly takes hours. If that\'s likely you, save the time and go done-for-you.',
    },
    {
      q: 'Can I use BrightLocal alongside Lola?',
      a: 'Yes. Some Lola clients keep BrightLocal as their reporting dashboard while we execute the work. We\'re happy to feed data wherever you track it.',
    },
    {
      q: 'Does BrightLocal track AI search like ChatGPT and Perplexity?',
      a: 'Not as a primary feature today. BrightLocal\'s strength is Google rank tracking, citation building, and review monitoring. Lola tracks AI search visibility (ChatGPT, Perplexity, Gemini, Google AI Overviews) as a core part of the monthly playbook.',
    },
    {
      q: 'Does Lola use tools like BrightLocal under the hood?',
      a: 'We use a mix of our own AI agents and selected best-of-breed APIs. The client doesn\'t see the toolchain — they see the work done and the score moving.',
    },
  ],
};

const SCORPION: Competitor = {
  slug: 'scorpion',
  name: 'Scorpion',
  url: 'https://www.scorpion.co',
  category: 'Enterprise local-services digital agency',
  oneLine: 'A large local-services marketing agency serving home services, legal, and franchise brands at the higher end of the spend curve.',
  priceRange: 'Quote-only (hidden)',
  metaTitle: 'Lola SEO vs Scorpion — Local SEO for Service Businesses | Lola',
  metaDescription: 'Scorpion is a full-stack agency for $3K+/mo accounts. Lola is transparent, founder-led local SEO + AI search at $297–$997/mo. Which fits your business?',
  tldr: {
    pickThemIf: [
      'Your monthly marketing budget is $3K+ and you want one vendor handling everything',
      'You\'re a large multi-location operator or franchise',
      'You want a full stack: website, paid ads, SEO, CRM, intake software',
    ],
    pickLolaIf: [
      'You want to know your price before booking a call',
      'You want focused local SEO + AI search visibility, not a media-buying agency',
      'You want a founder on the work, not an account manager',
    ],
  },
  whereTheyWin: [
    'Broad service stack — site builds, paid ads, CRM, intake software in one vendor',
    'Industry-specific tooling for home services / legal / franchise verticals',
    'Long client tenure on multi-year retainers',
  ],
  whereLolaWins: [
    'Public pricing — see exactly what you\'ll pay before scheduling a call',
    'Month-to-month, cancel anytime — Scorpion typically runs annual contracts',
    'AI search visibility as the core product, not a bolt-on',
    '30-Day Half-Back guarantee in writing',
    'You text Coach Ty directly — no agency layer between you and the work',
  ],
  table: [
    { label: 'Pricing',                 lola: '$297 / $697 / $997 /mo (public)', them: 'Quote-only, typically $3K+/mo',   lolaWin: true  },
    { label: 'Contract',                lola: 'Month-to-month',                   them: 'Typically annual',                lolaWin: true  },
    { label: 'Done-for-you?',           lola: 'Yes',                              them: 'Yes',                             lolaWin: false },
    { label: 'AI search visibility',    lola: 'Core product',                     them: 'Not a primary offering',          lolaWin: true  },
    { label: 'Service scope',           lola: 'Local SEO + AI search (focused)',  them: 'Full stack (site, ads, CRM, intake)', lolaWin: false },
    { label: 'Founder access',          lola: 'Direct — Coach Ty',                them: 'Account manager',                 lolaWin: true  },
    { label: 'Guarantee',               lola: '30-Day Half-Back + First Win',     them: 'Not published',                   lolaWin: true  },
    { label: 'Best for',                lola: '$200K–$2M/yr local service biz',   them: 'Multi-location, large operators', lolaWin: false },
  ],
  faqs: [
    {
      q: 'Is Lola SEO a real alternative to Scorpion?',
      a: 'For most independent local service businesses, yes. Scorpion is built for larger operators with $3K+/mo budgets who want a full-stack media buying + SEO + CRM partner. Lola is focused: done-for-you local SEO + AI search visibility at $297–$997/mo, no contract, founder-led.',
    },
    {
      q: 'Is Scorpion really $3K+ per month?',
      a: 'Their pricing isn\'t published, but reported engagements consistently run in that range for full-service work. Lola publishes prices ($297 / $697 / $997 monthly) so you can decide before any call.',
    },
    {
      q: 'Can I move from Scorpion to Lola mid-contract?',
      a: 'Most Scorpion contracts are annual — we\'ll help you run Lola in parallel for the remaining term so you keep data continuity, then transition cleanly. Book a free call and we\'ll map the handoff.',
    },
    {
      q: 'Does Lola do website builds or paid ads like Scorpion?',
      a: 'No. Lola optimizes the site you have for local + AI search; we don\'t rebuild sites or manage paid ads. If you need a full stack in one vendor, Scorpion fits better. Many Lola clients run paid ads through a specialist and have us own the organic + AI side.',
    },
    {
      q: 'What\'s the difference in AI search?',
      a: 'Lola was built around AI search visibility. We track whether ChatGPT, Perplexity, Gemini, and Google AI Overviews recommend you (and who they recommend instead) and tune the playbook accordingly. Scorpion\'s SEO is solid but AI-search isn\'t a primary offering today.',
    },
  ],
};

const COMPETITORS: Record<string, Competitor> = {
  localiq: LOCALIQ,
  brightlocal: BRIGHTLOCAL,
  scorpion: SCORPION,
};

export function getCompetitorSlugs(): string[] {
  return Object.keys(COMPETITORS);
}

// ── Component ────────────────────────────────────────────────

export default function VsPage({ slug }: { slug: string }) {
  const c = COMPETITORS[slug.toLowerCase()];

  // Inject route-specific FAQPage + BreadcrumbList JSON-LD on mount.
  // Cleaned up on unmount so navigating away doesn't leave stale schema.
  useEffect(() => {
    if (typeof document === 'undefined' || !c) return;
    const url = `https://lola.tyalexandermedia.com/vs/${c.slug}`;
    const blocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: c.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lola.tyalexandermedia.com/' },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://lola.tyalexandermedia.com/vs' },
          { '@type': 'ListItem', position: 3, name: `Lola vs ${c.name}`, item: url },
        ],
      },
    ];
    const tags = blocks.map((b) => {
      const t = document.createElement('script');
      t.type = 'application/ld+json';
      t.dataset.lola = 'vs';
      t.textContent = JSON.stringify(b);
      document.head.appendChild(t);
      return t;
    });
    // Also patch <title> + meta description for this route. The SPA shell
    // gives us the homepage's static title otherwise.
    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    document.title = c.metaTitle;
    if (desc) desc.setAttribute('content', c.metaDescription);

    track('vs_page_viewed', { competitor: c.slug });

    return () => {
      tags.forEach((t) => t.parentNode?.removeChild(t));
      document.title = prevTitle;
      if (desc) desc.setAttribute('content', prevDesc);
    };
  }, [c]);

  if (!c) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-semibold text-white">Comparison not found.</h2>
        <p className="mt-3 max-w-md text-base text-[#9AA0A6]">
          We compare Lola to a short list of direct competitors. See the homepage to find Lola.
        </p>
        <a href="/" className="mt-8 text-[#D4AF37] underline-offset-2 hover:underline">
          Back to home →
        </a>
      </main>
    );
  }

  const callHref = `${CALENDAR_URL}${CALENDAR_URL.includes('?') ? '&' : '?'}utm_source=vs&utm_medium=vs_page&utm_campaign=${c.slug}`;

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Honest Comparison
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          Lola SEO{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            vs {c.name}
          </span>
        </h1>

        <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          {c.oneLine} Here&apos;s an honest look at where {c.name} is the right pick — and where
          Lola is the better fit.
        </p>

        <p className="mt-3 text-[12px] text-[#7A7F8A]">
          No affiliate links · No bashing · Citations below
        </p>
      </section>

      {/* ── 60-SECOND ANSWER (TL;DR) ──────────────────────── */}
      <section className="mt-10 sm:mt-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The 60-second answer
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0A6]">
              Pick {c.name} if…
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {c.tldr.pickThemIf.map((row) => (
                <li key={row} className="flex items-start gap-2 text-[14px] leading-[1.5] text-[#C5C5C8] sm:text-[15px]">
                  <span aria-hidden className="mt-1 text-[#9AA0A6]">→</span>
                  <span>{row}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[14px] border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-transparent to-transparent p-5 shadow-[0_0_24px_rgba(212,175,55,0.10)] sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
              Pick Lola if…
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {c.tldr.pickLolaIf.map((row) => (
                <li key={row} className="flex items-start gap-2 text-[14px] leading-[1.5] text-white sm:text-[15px]">
                  <span aria-hidden className="mt-1 text-[#D4AF37]">✓</span>
                  <span>{row}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── AT-A-GLANCE TABLE ─────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          At a glance
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          The honest feature compare.
        </h2>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[600px] text-left text-[13px] sm:text-[14px]">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="px-4 py-3 text-[#8A8F98] sm:px-5 sm:py-4"></th>
                <th className="border-l-2 border-[#D4AF37]/50 bg-[#D4AF37]/[0.06] px-4 py-3 text-[#D4AF37] sm:px-5 sm:py-4">
                  Lola
                  <span className="block text-[10px] font-normal text-[#D4AF37]/85">{LOLA_PRICE}</span>
                  <span className="block text-[10px] font-normal text-[#D4AF37]/70">{LOLA_MODEL}</span>
                </th>
                <th className="px-4 py-3 text-[#C5C5C8] sm:px-5 sm:py-4">
                  {c.name}
                  <span className="block text-[10px] font-normal text-[#8A8F98]">{c.priceRange}</span>
                  <span className="block text-[10px] font-normal text-[#8A8F98]">{c.category}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {c.table.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 text-[#C5C5C8] sm:px-5 sm:py-4">{row.label}</td>
                  <td className={`border-l-2 ${row.lolaWin ? 'border-[#D4AF37]/50 bg-[#D4AF37]/[0.06] text-white' : 'border-white/[0.06] text-[#C5C5C8]'} px-4 py-3 sm:px-5 sm:py-4`}>
                    {row.lola}
                  </td>
                  <td className="px-4 py-3 text-[#C5C5C8] sm:px-5 sm:py-4">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── WHERE THEY WIN (honest) ───────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Where {c.name} wins
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          Credit where it&apos;s due.
        </h2>
        <ul className="mt-6 flex flex-col gap-3">
          {c.whereTheyWin.map((row) => (
            <li
              key={row}
              className="flex items-start gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[14px] leading-[1.55] text-[#C5C5C8] sm:text-[15px]"
            >
              <span aria-hidden className="mt-0.5 text-[#9AA0A6]">→</span>
              <span>{row}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── WHERE LOLA WINS ───────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Where Lola wins
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          The specifics — not adjectives.
        </h2>
        <ul className="mt-6 flex flex-col gap-3">
          {c.whereLolaWins.map((row) => (
            <li
              key={row}
              className="flex items-start gap-3 rounded-[12px] border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] px-5 py-3 text-[14px] leading-[1.55] text-white sm:text-[15px]"
            >
              <span aria-hidden className="mt-0.5 text-[#D4AF37]">✓</span>
              <span>{row}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Switch + compare FAQ
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)' }}
        >
          Straight answers.
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          {c.faqs.map((f, i) => (
            <details
              key={i}
              className="group rounded-[12px] border border-white/[0.08] bg-white/[0.02] open:border-[#D4AF37]/30 open:bg-white/[0.04]"
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  track('vs_faq_opened', { competitor: c.slug, question: f.q.slice(0, 40) });
                }
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[15px] font-semibold text-white sm:p-6 sm:text-[16px] [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <span aria-hidden className="shrink-0 text-[18px] text-[#D4AF37] transition group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-[14px] leading-[1.65] text-[#C5C5C8] sm:px-6 sm:pb-6 sm:text-[15px]">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── DUAL CTA ──────────────────────────────────────── */}
      <section className="mt-14 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-20 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          The honest move
        </p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          See where you actually stand.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          Run the free 60-second AI Visibility Grader — or book a 15-minute call with Coach Ty.
          We&apos;ll tell you straight whether Lola or {c.name} is the right fit.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={callHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('vs_cta_clicked', { competitor: c.slug, kind: 'call' })}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] sm:h-16 sm:text-[15px]"
          >
            Book a free strategy call →
          </a>
          <a
            href="/grader"
            onClick={() => track('vs_cta_clicked', { competitor: c.slug, kind: 'grader' })}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            Get your free score
          </a>
        </div>
      </section>

      {/* ── DISCLOSURE ────────────────────────────────────── */}
      <section className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-[13px] leading-[1.6] text-[#9AA0A6] sm:p-6 sm:text-[14px]">
        <p className="font-semibold text-white">Honest disclosure.</p>
        <p className="mt-2">
          We don&apos;t take affiliate revenue from {c.name} or anyone in this category. We compete
          with them, which is exactly why we want to be fair about where they win.
          {' '}<a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline-offset-2 hover:underline">
            Visit {c.name} ↗
          </a>{' '}— if they&apos;re the better fit, go win with them. If Lola is, we&apos;ll know in 15 minutes.
        </p>
      </section>

      {/* Footer */}
      <div className="mt-12 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-16">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
