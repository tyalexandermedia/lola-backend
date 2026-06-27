/// <reference types="vite/client" />
/**
 * Growth Score — /growth-score
 *
 * The signature lead magnet for the roadmap model. Same proven pipeline as
 * /grader (POST /audit → route to /r/{audit_id}, the existing SharedReport),
 * re-framed as the LOLA OS **Growth Score**: a 0–100 score across the six
 * roadmap dimensions (Foundation, Growth, Authority, AI Visibility,
 * Reputation, Revenue Tracking).
 *
 * Why it exists: it's the front door of the funnel. The score creates the gap
 * ("you're at 42 — here's the path to 70"), and the recommended first step is
 * always the $297 Foundation Sprint. Free tool → Foundation → Growth → Scale.
 *
 * Critical: reuse the audit funnel logic verbatim — only the framing changes.
 */

import { useEffect, useState } from 'react';
import type { BusinessAuditRequest, AuditResult } from './types';
import { API_URL } from './api';
import { track } from './analytics';
import { GROWTH_SCORE_DIMENSIONS, ROADMAP } from './lib/pricing';

const TRADE_TO_SERVICE: Record<string, string> = {
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
  'Pulling your Google Business Profile…',
  'Sweeping citations across the top 10 directories…',
  'Asking ChatGPT, Perplexity, and Gemini what they say about you…',
  'Auditing on-page signals + schema…',
  'Scoring your six growth dimensions…',
];

// Maps each roadmap dimension to what we actually measure + which stage owns it.
// Keeps the marketing honest: the score is built from the same audit signals
// the report already returns.
const DIMENSION_DETAIL: Record<string, { measures: string; stage: string }> = {
  Foundation: { measures: 'Website, indexing, on-page SEO, tracking', stage: 'Foundation Sprint' },
  Growth: { measures: 'Content, service-area pages, GBP posting cadence', stage: 'Growth Roadmap' },
  Authority: { measures: 'Citations, links, local relevance', stage: 'Scale System' },
  'AI Visibility': { measures: 'ChatGPT, Perplexity, Gemini, Google AI answers', stage: 'Scale System' },
  Reputation: { measures: 'Review rating, count, and recent velocity', stage: 'Growth Roadmap' },
  'Revenue Tracking': { measures: 'Calls, forms, and lead attribution wired up', stage: 'Growth Roadmap' },
};

export default function GrowthScore() {
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

  // Pre-fill from URL (?biz=, ?trade=) + localStorage, mirroring /grader so
  // deep-links from the homepage land mid-form with lower drop-off.
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
      if (biz && biz.trim().length >= 2) runLookup(biz.trim());
    } catch { /* ignore */ }
  }, []);

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
        track('growth_score_autofill_hit');
      } else {
        setLookup('no_match');
      }
    } catch {
      setLookup('no_match');
    }
  };

  // SoftwareApplication + HowTo JSON-LD — free-tool rich result + AI-quotable
  // steps. Cleaned on unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const blocks = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'LOLA OS Growth Score',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://lola.tyalexandermedia.com/growth-score',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        provider: { '@id': 'https://lola.tyalexandermedia.com/#business' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How the LOLA OS Growth Score works',
        description: 'Get a 0–100 Growth Score for your local business in 60 seconds across six dimensions, plus your next step on the roadmap.',
        totalTime: 'PT1M',
        step: [
          { '@type': 'HowToStep', name: 'Enter your business', text: 'Business name, city, and website. No signup required.' },
          { '@type': 'HowToStep', name: 'Lola scores you', text: 'We measure Foundation, Growth, Authority, AI Visibility, Reputation, and Revenue Tracking.' },
          { '@type': 'HowToStep', name: 'See your starting stage', text: 'Your score maps to where you are on the roadmap and what to fix first.' },
          { '@type': 'HowToStep', name: 'Get the report', text: 'A shareable scorecard link emailed to you, with your priority fixes.' },
        ],
      },
    ];
    const tags = blocks.map((b) => {
      const tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.dataset.lola = 'growth-score';
      tag.textContent = JSON.stringify(b);
      document.head.appendChild(tag);
      return tag;
    });
    return () => { tags.forEach((t) => t.parentNode?.removeChild(t)); };
  }, []);

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

  const score = async () => {
    if (!validate()) return;
    setPhase('scoring');
    setApiError(null);
    track('growth_score_submit', { business_type: form.business_type });
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
      track('growth_score_success', { score: data.total_score, grade: data.grade });
      const auditId = data.audit_id || '';
      if (auditId) {
        window.location.assign(`/r/${encodeURIComponent(auditId)}?from=growth-score`);
      } else {
        setApiError('No score returned. Try again or book a call.');
        setPhase('error');
      }
    } catch (err) {
      track('growth_score_error');
      setApiError(err instanceof Error ? err.message : 'Unable to score right now.');
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
        <h2 className="mt-8 text-[26px] font-bold text-white sm:text-[32px]">Calculating your Growth Score…</h2>
        <p key={scoringLine} className="mt-4 max-w-md animate-fade-in text-[15px] text-[#9AA0A6] sm:text-[16px]">
          {scoringLine}
        </p>
        <p className="mt-10 text-[11px] uppercase tracking-[0.28em] text-[#5A5F68]">Usually 10–20 seconds</p>
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
      {/* ── HERO + FORM ───────────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        {/* Ambient aurora — premium multi-tone glow shared with the homepage
            and pricing heroes so the funnel feels like one system. */}
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[600px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(38% 50% at 22% 12%, rgba(111,155,255,0.12), transparent 70%), radial-gradient(46% 56% at 82% 6%, rgba(212,175,55,0.20), transparent 70%), radial-gradient(42% 46% at 56% 36%, rgba(165,96,231,0.10), transparent 70%)',
          }}
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Free Tool · 60 Seconds · No Signup
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          What&apos;s your{' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            Growth Score
          </span>
          ?
        </h1>

        <p className="mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          One number, 0–100, across the six things that actually grow a local business —
          and the one move that lifts it fastest. You&apos;re not behind. You just haven&apos;t
          seen the map yet.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); score(); }}
          className="mt-8 rounded-[16px] border border-[#D4AF37]/25 bg-white/[0.02] p-5 sm:p-7"
        >
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
            <Field label="Where should we send your scorecard?" error={errors.email}>
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
            Get my Growth Score →
          </button>

          <p className="mt-4 text-center text-[12px] text-[#7A7F8A]">
            No credit card · No spam · Free shareable scorecard
          </p>
        </form>
      </section>

      {/* ── THE SIX DIMENSIONS — the signature visual ─────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          What the score measures
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Six dimensions. One number. A clear next step.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Your Growth Score rolls these six up into a single 0–100. Each one maps to a
          stage of the roadmap — so the score doesn&apos;t just grade you, it tells you what to do next.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROWTH_SCORE_DIMENSIONS.map((dim, i) => {
            const d = DIMENSION_DETAIL[dim];
            return (
              <div key={dim} className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 text-[18px] font-bold text-white sm:text-[20px]">{dim}</p>
                <p className="mt-2 text-[14px] leading-[1.55] text-[#C5C5C8]">{d?.measures}</p>
                {d?.stage && (
                  <p className="mt-3 inline-block rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1 text-[11px] font-semibold text-[#D4AF37]">
                    {d.stage}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ROADMAP TIE-IN — score → starting stage ───────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Your score → your starting stage
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          We&apos;re getting you from where you are to where you want to be.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Pricing isn&apos;t &quot;$497/month&quot; — it&apos;s &quot;42 to 70.&quot; Your score sets the
          starting line. Most businesses begin with the Foundation Sprint, then advance as the data compounds.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROADMAP.map((s, i) => (
            <div
              key={s.id}
              className={`rounded-[14px] border p-5 sm:p-6 ${
                s.featured ? 'border-[#D4AF37] bg-[#D4AF37]/[0.05]' : 'border-white/[0.10] bg-white/[0.02]'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{s.phase}</p>
              <p className="mt-2 text-[18px] font-bold text-white">{s.name}</p>
              <p className="mt-1 text-[15px] font-extrabold text-[#D4AF37]">
                {s.price}<span className="text-[12px] font-medium text-[#9CA3AF]"> {s.period}</span>
              </p>
              <p className="mt-3 text-[13px] leading-[1.5] text-[#C5C5C8]">
                {i === 0 ? 'Where most scores start — build the base.' : i === 1 ? 'Build momentum, watch the score climb.' : 'Compete + compound across markets.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="mt-16 rounded-2xl border border-[#D4AF37]/25 bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <h2 className="text-[22px] font-bold leading-[1.15] text-white sm:text-[28px]">
          Get your number first. The roadmap follows.
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          Run your free Growth Score above, then start with the{' '}
          <span className="font-semibold text-white">$297 Foundation Sprint</span> — you walk away
          with a real foundation and a 90-day roadmap even if you stop there. No contracts, 30-day half-back.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12]"
          >
            See the roadmap →
          </a>
          <a
            href="https://calendar.app.google/J7idjUDitd2Hziuc7"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-5 text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition hover:border-white/[0.3]"
          >
            Book a free roadmap call
          </a>
        </div>
      </section>

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

function extractCity(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return '';
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
