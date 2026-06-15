/// <reference types="vite/client" />
/**
 * Lola Local AI Visibility Grader — /grader
 *
 * A re-packaging of the /audit pipeline as a single-page, 60-second lead
 * magnet. Pattern lifted from LocalIQ's Website Grader (their #1 organic
 * lead source). Key differences vs theirs:
 *   - Single page, all fields on screen — no 5-step gate.
 *   - AI-search-first framing (their gap — they don't own the AI angle).
 *   - Public pricing right on the landing — Lola's competitive moat.
 *   - Submits to the existing POST /audit endpoint, then routes the user
 *     to /r/{audit_id} (the existing SharedReport) so we don't fork
 *     results-page UX.
 *
 * Critical: do NOT change the funnel logic, only the marketing wrapper.
 */

import { useEffect, useState } from 'react';
import type { BusinessAuditRequest, AuditResult } from './types';
import { API_URL } from './AuditFlow';
import { track } from './analytics';

const TRADE_TO_SERVICE: Record<string, string> = {
  // Mirrors AuditFlow's map. Kept here so this component is self-contained.
  'Soft Wash / Pressure Wash': 'soft wash',
  Plumber: 'plumbing',
  HVAC: 'hvac',
  Roofer: 'roofing',
  'Pool Services': 'pool service',
};

const BUSINESS_TYPES = [
  { value: 'soft wash', label: '🌊 Pressure Washing' },
  { value: 'plumbing', label: '🔧 Plumbing' },
  { value: 'hvac', label: '❄️ HVAC' },
  { value: 'roofing', label: '🏠 Roofing' },
  { value: 'pool service', label: '🏊 Pool Service' },
  { value: 'other', label: '🛠️ Other local service business' },
] as const;

type Phase = 'idle' | 'scoring' | 'error';
type LookupState = 'idle' | 'searching' | 'found' | 'no_match';

interface Errors {
  business_name?: string;
  city?: string;
  website?: string;
  email?: string;
}

const SCORING_LINES = [
  "Pulling your Google Business Profile…",
  "Sweeping citations across the top 10 directories…",
  "Asking ChatGPT, Perplexity, and Gemini what they say about you…",
  "Auditing on-page signals + schema…",
  "Comparing you against the top 3 competitors in your city…",
];

export default function Grader() {
  const [form, setForm] = useState<BusinessAuditRequest>({
    business_name: '',
    city: '',
    business_type: 'other',
    website: '',
    email: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const [scoringLine, setScoringLine] = useState(SCORING_LINES[0]);
  const [lookup, setLookup] = useState<LookupState>('idle');

  // Pre-fill from URL params and localStorage. Homepage routes here with
  // ?biz=<name> so the visitor lands mid-form (perceived progress + lower
  // drop-off). ?trade=<trade> threads from the legacy dropdown too.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const biz = params.get('biz');
      const urlTrade = params.get('trade');
      const ls = window.localStorage.getItem('lolaTrade');
      const t = urlTrade || ls || '';
      setForm((p) => ({
        ...p,
        business_name: biz?.trim() || p.business_name,
        business_type: t && TRADE_TO_SERVICE[t] ? TRADE_TO_SERVICE[t] : p.business_type,
      }));

      // Auto-lookup ONLY when ?biz= is present (deep-link from Homepage).
      // Drops Grader friction from 5 fields to 2 when Places returns a match.
      if (biz && biz.trim().length >= 2) {
        runLookup(biz.trim());
      }
    } catch { /* ignore */ }
  }, []);

  // Places lookup helper — public endpoint, no auth. Soft-fills website +
  // city when matched; never clobbers a value the user has already typed.
  const runLookup = async (bizName: string) => {
    if (lookup === 'searching') return;
    setLookup('searching');
    try {
      const r = await fetch(`${API_URL}/grader/lookup?name=${encodeURIComponent(bizName)}`);
      if (!r.ok) { setLookup('no_match'); return; }
      const data = await r.json();
      if (data?.ok && data?.matched) {
        setForm((p) => ({
          ...p,
          website: p.website.trim() ? p.website : (data.website || p.website),
          city: p.city.trim() ? p.city : extractCity(data.address || ''),
        }));
        setLookup('found');
        track('grader_autofill_hit');
      } else {
        setLookup('no_match');
      }
    } catch {
      setLookup('no_match');
    }
  };

  // Inject SoftwareApplication + HowTo JSON-LD on mount; cleaned on unmount.
  // SoftwareApplication makes the page eligible for the "free tool" rich
  // result; HowTo describes the 4-step grade so AI Overviews can quote it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const blocks = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Lola Local AI Visibility Grader',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://lola.tyalexandermedia.com/grader',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        aggregateRating: undefined, // omit until we have real reviews
        provider: { '@id': 'https://lola.tyalexandermedia.com/#business' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How the Lola Local AI Visibility Grader works',
        description: 'Get a 0-100 AI Visibility Score for your local business in 60 seconds across 5 categories.',
        totalTime: 'PT1M',
        step: [
          { '@type': 'HowToStep', name: 'Enter your business', text: 'Business name, city, and website. No signup required.' },
          { '@type': 'HowToStep', name: 'Lola scores you', text: 'We check Google Business Profile, citations, reviews, on-page SEO, and AI search presence (ChatGPT, Perplexity, Gemini, Google AI).' },
          { '@type': 'HowToStep', name: 'See your top fixes', text: 'Ranked by impact and effort — the 5 moves that lift your visibility fastest.' },
          { '@type': 'HowToStep', name: 'Get the report', text: 'Shareable scorecard link emailed to you, plus a copy-paste fix kit.' },
        ],
      },
    ];
    const tags = blocks.map((b) => {
      const tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.dataset.lola = 'grader';
      tag.textContent = JSON.stringify(b);
      document.head.appendChild(tag);
      return tag;
    });
    return () => { tags.forEach((t) => t.parentNode?.removeChild(t)); };
  }, []);

  // Rotating progress copy while the audit pipeline runs (~10-20s).
  useEffect(() => {
    if (phase !== 'scoring') return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % SCORING_LINES.length;
      setScoringLine(SCORING_LINES[i]);
    }, 2400);
    return () => clearInterval(id);
  }, [phase]);

  const update = (k: keyof BusinessAuditRequest, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (form.business_name.trim().length < 2) e.business_name = 'Real business name, please.';
    if (form.city.trim().length < 2) e.city = 'City + state works best.';
    const w = form.website.trim();
    if (w.length < 4 || !/\./.test(w)) e.website = "That doesn't look like a URL.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Real email, please.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const grade = async () => {
    if (!validate()) return;
    setPhase('scoring');
    setApiError(null);
    track('grader_submit', { business_type: form.business_type });
    try {
      const r = await fetch(`${API_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.detail || `Failed (HTTP ${r.status})`);
      }
      const data: AuditResult = await r.json();
      track('grader_success', { score: data.total_score, grade: data.grade });
      // Route into the existing SharedReport — single source of results UX.
      const auditId = data.audit_id || '';
      if (auditId) {
        window.location.assign(`/r/${encodeURIComponent(auditId)}?from=grader`);
      } else {
        setApiError('No audit ID returned. Try again or book a call.');
        setPhase('error');
      }
    } catch (err) {
      track('grader_error');
      setApiError(err instanceof Error ? err.message : 'Unable to grade right now.');
      setPhase('error');
    }
  };

  if (phase === 'scoring') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#D4AF37]" style={{ animationDelay: '0ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#D4AF37]" style={{ animationDelay: '180ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#D4AF37]" style={{ animationDelay: '360ms' }} />
        </div>
        <h2 className="mt-8 text-[26px] font-bold text-white sm:text-[32px]">Scoring your local AI visibility…</h2>
        <p key={scoringLine} className="mt-4 max-w-md animate-fade-in text-[15px] text-[#9AA0A6] sm:text-[16px]">
          {scoringLine}
        </p>
        <p className="mt-10 text-[11px] uppercase tracking-[0.28em] text-[#5A5F68]">
          Usually 10–20 seconds
        </p>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h2 className="text-[26px] font-bold text-white">Lola lost the scent.</h2>
        <p className="mt-3 max-w-md text-[15px] text-[#9AA0A6]">{apiError}</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => { setPhase('idle'); setApiError(null); }}
            className="inline-flex h-12 items-center justify-center rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* ── HERO + FORM (above the fold) ──────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Free Tool · 60 Seconds · No Signup
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          Get your{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            AI Visibility Score
          </span>{' '}
          in 60 seconds.
        </h1>

        <p className="mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          Lola grades your local business 0–100 across 5 categories — including whether
          ChatGPT, Perplexity, and Gemini actually recommend you when buyers ask.
        </p>

        {/* The form — single page, all fields visible. */}
        <form
          onSubmit={(e) => { e.preventDefault(); grade(); }}
          className="mt-8 rounded-[16px] border border-[#D4AF37]/25 bg-white/[0.02] p-5 sm:p-7"
        >
          {/* Auto-fill status — only renders when the user came in via
              ?biz= (Homepage deep-link) so they see Lola "doing something"
              while Places resolves the website + city. Subtle, gold-themed. */}
          {lookup === 'searching' && (
            <p className="mb-4 flex items-center gap-2 text-[12px] text-[#D4AF37]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37]" />
              Looking up your business on Google…
            </p>
          )}
          {lookup === 'found' && (
            <p className="mb-4 flex items-center gap-2 text-[12px] text-emerald-300">
              <span aria-hidden>✓</span>
              Found you on Google — website + city pre-filled below.
            </p>
          )}
          {lookup === 'no_match' && (
            <p className="mb-4 text-[12px] text-[#7A7F8A]">
              No Google match — fill the fields manually and we&apos;ll still score you.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business name" error={errors.business_name}>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                placeholder="Sandbar Soft Wash"
                autoComplete="organization"
                className={inputCls(!!errors.business_name)}
              />
            </Field>

            <Field label="City / market" error={errors.city}>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Tampa, FL"
                autoComplete="address-level2"
                className={inputCls(!!errors.city)}
              />
            </Field>

            <Field label="Business type">
              <select
                value={form.business_type}
                onChange={(e) => update('business_type', e.target.value)}
                className={`${inputCls(false)} appearance-none pr-10`}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23D4AF37' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Website" error={errors.website}>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://yourbusiness.com"
                autoComplete="url"
                className={inputCls(!!errors.website)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Where should we send the report?" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@business.com"
                autoComplete="email"
                className={inputCls(!!errors.email)}
              />
            </Field>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
          >
            Get my AI Visibility Score →
          </button>

          <p className="mt-4 text-center text-[12px] text-[#7A7F8A]">
            No credit card · No spam · Free shareable scorecard
          </p>
        </form>
      </section>

      {/* ── WHAT GETS SCORED ─────────────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          What gets scored
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          5 categories. 1 score. Real fixes.
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { n: '01', h: 'Google Business Profile', body: 'Categories, services, hours, photos, posts — every signal Google scores you on.' },
            { n: '02', h: 'Citations + NAP', body: 'Name, address, phone consistency across the top 10 local directories.' },
            { n: '03', h: 'Reviews + velocity', body: 'Star rating, count, and how fast new reviews are landing in the last 90 days.' },
            { n: '04', h: 'On-page + schema', body: 'Page speed, titles, meta, headers, and the JSON-LD AI agents read to understand you.' },
            { n: '05', h: 'AI Search presence', body: 'Whether ChatGPT, Perplexity, and Gemini actually recommend you — and who they recommend instead when they don\'t.' },
            { n: '★', h: 'Top 3 competitor compare', body: 'Who Google\'s putting in front of buyers before you. The gap is the playbook.' },
          ].map((c) => (
            <div key={c.n} className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">{c.n}</p>
              <p className="mt-2 text-[18px] font-bold text-white sm:text-[20px]">{c.h}</p>
              <p className="mt-2 text-[14px] leading-[1.55] text-[#C5C5C8]">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO USES IT ─────────────────────────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Built for
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Local service businesses of every flavor.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Home services, cleaning, salons, med spas, auto detailing, lawn care, fitness
          studios — any local business buyers find on Google or ask AI to recommend.
        </p>
      </section>

      {/* ── PRICING TEASE ────────────────────────────────────────── */}
      <section className="mt-16 rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          After your score
        </p>
        <h2 className="mt-3 text-[22px] font-bold leading-[1.15] text-white sm:text-[28px]">
          Want Lola to do the work for you?
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Done-for-you plans start at <span className="font-semibold text-white">$297/mo</span>.
          Three monthly tiers, no contracts, 30-day half-back guarantee.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12]"
          >
            See pricing →
          </a>
          <a
            href="https://calendar.app.google/J7idjUDitd2Hziuc7"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-5 text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition hover:border-white/[0.3]"
          >
            Book a free call
          </a>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/85">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-[12px] text-[#E5A95B]">{error}</p>}
    </div>
  );
}

/**
 * Pull a "{City}, {ST}" pair out of a Google Places formatted_address.
 * Address shapes vary: "123 Main St, Tampa, FL 33602, USA" → "Tampa, FL"
 * Returns "" when the shape doesn't parse cleanly — caller falls back.
 */
function extractCity(address: string): string {
  if (!address) return '';
  // Split on commas, drop trailing "USA" / country if present.
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return '';
  // From the end: country, "STATE ZIP", "City"
  const countryDrop = /usa|united states/i.test(parts[parts.length - 1]) ? 1 : 0;
  const stateZipPart = parts[parts.length - 1 - countryDrop] || '';
  const cityPart = parts[parts.length - 2 - countryDrop] || '';
  const stateMatch = stateZipPart.match(/^([A-Z]{2})\b/i);
  if (cityPart && stateMatch) return `${cityPart}, ${stateMatch[1].toUpperCase()}`;
  return cityPart || '';
}

function inputCls(hasError: boolean): string {
  return [
    'block w-full rounded-[12px] border bg-[#0F0F12] px-4 py-3 text-[15px] font-medium text-white outline-none transition',
    hasError
      ? 'border-[#E5A95B] focus:border-[#E5A95B] focus:shadow-[0_0_0_3px_rgba(229,169,91,0.12)]'
      : 'border-[#D4AF37]/25 focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]',
  ].join(' ');
}
