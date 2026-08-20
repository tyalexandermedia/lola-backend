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
 * ("you're at 42 — here's the fastest fix"), and from there the owner can do it
 * themselves ($397/month) or have us handle it ($397/month plan).
 *
 * Critical: reuse the audit funnel logic verbatim — only the framing changes.
 */

import { useEffect, useState } from 'react';
import { useReveal } from './lib/useReveal';
import type { BusinessAuditRequest, AuditResult } from './types';
import { API_URL } from './api';
import { track } from './analytics';
import { usePageMeta } from './lib/seo';
import { GROWTH_SCORE_DIMENSIONS, GUARANTEE, PLAN, TIERS } from './lib/pricing';
import { startHref } from './lib/checkout';
import AnswerBlock from './AnswerBlock';
import { SCORE_QA } from './lib/pageMeta';

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
  phone?: string;
  consent?: string;
}

const SCORING_LINES = [
  'Pulling your Google Business Profile…',
  'Sweeping citations across the top 10 directories…',
  'Asking ChatGPT, Perplexity, and Gemini what they say about you…',
  'Scanning on-page signals + schema…',
  'Scoring your six growth dimensions…',
];

// Maps each dimension to what we actually measure + a short plain-English tag
// for what it gets you. Keeps the marketing honest: the score is built from the
// same audit signals the report already returns.
const DIMENSION_DETAIL: Record<string, { measures: string; stage: string }> = {
  Foundation: { measures: 'Website, indexing, on-page SEO, tracking', stage: 'Gets you found' },
  Growth: { measures: 'Content, service-area pages, GBP posting cadence', stage: 'More rankings' },
  Authority: { measures: 'Citations, links, local relevance', stage: 'More trust' },
  'AI Visibility': { measures: 'ChatGPT, Perplexity, Gemini, Google AI answers', stage: 'Found in AI answers' },
  Reputation: { measures: 'Review rating, count, and recent velocity', stage: 'More calls booked' },
  'Revenue Tracking': { measures: 'Calls, forms, and lead attribution wired up', stage: 'Proof of leads' },
};

export default function GrowthScore() {
  usePageMeta('/growth-score');
  useReveal();
  const [form, setForm] = useState<BusinessAuditRequest>({
    business_name: '',
    city: '',
    business_type: 'other',
    website: '',
    email: '',
    phone: '',
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const [scoringLine, setScoringLine] = useState(SCORING_LINES[0]);
  const [lookup, setLookup] = useState<LookupState>('idle');
  /** Fields the Google lookup answered for them — safe to skip past. */
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set());

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

  const runLookup = async (bizName: string): Promise<Set<string>> => {
    if (lookup === 'searching') return new Set<string>();
    setLookup('searching');
    try {
      const r = await fetch(`${API_URL}/grader/lookup?name=${encodeURIComponent(bizName)}`);
      if (!r.ok) { setLookup('no_match'); return new Set<string>(); }
      const data = await r.json();
      if (data?.ok && data?.matched) {
        // Compute synchronously from the CURRENT form and return the result.
        // Building this inside a setForm updater looked equivalent but isn't:
        // React runs the updater later, so the set was still empty by the time
        // the caller read it — and the caller's `autofilled` closure would have
        // been a render behind regardless. Returning the value sidesteps both.
        const website = form.website.trim() ? form.website : (data.website || '').trim();
        const city = form.city.trim() ? form.city : extractCity(data.address || '');
        const filled = new Set<string>();
        // Only claim a field is answered if the value would actually pass the
        // same check the step applies — otherwise we'd skip past a bad value.
        if (!form.city.trim() && city.trim().length >= 2) filled.add('city');
        if (!form.website.trim() && website.length >= 4 && /\./.test(website)) filled.add('website');
        setForm((p) => ({ ...p, website: website || p.website, city: city || p.city }));
        setAutofilled(filled);
        setLookup('found');
        track('growth_score_autofill_hit', { filled: [...filled].join(',') });
        return filled;
      }
      setLookup('no_match');
    } catch {
      setLookup('no_match');
    }
    return new Set<string>();
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
        name: 'How the LOLA Growth Score works',
        description: 'Get a 0–100 Growth Score for your local business in 60 seconds across six dimensions, plus the one move that lifts you fastest.',
        totalTime: 'PT1M',
        step: [
          { '@type': 'HowToStep', name: 'Enter your business', text: 'Business name, city, website, and phone. No signup required.' },
          { '@type': 'HowToStep', name: 'Lola scores you', text: 'We measure Foundation, Growth, Authority, AI Visibility, Reputation, and Revenue Tracking.' },
          { '@type': 'HowToStep', name: 'See what to fix first', text: 'Your score shows exactly where you are on Google and in AI answers and what to fix first.' },
          { '@type': 'HowToStep', name: 'Get your results', text: 'Your scorecard is delivered by text and email within 24 hours, with your priority fixes.' },
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

  /**
   * ONE QUESTION AT A TIME.
   *
   * Six fields stacked on a phone give a contractor six reasons to bail before
   * he's answered one. Asking them in sequence means each screen is a single
   * decision with a thumb-sized target, and the progress bar makes the end
   * visible from the first step.
   *
   * The order is deliberate: business name first, because the Google lookup it
   * triggers pre-fills city AND website — so two of the five steps usually
   * arrive already answered, and the flow feels faster than the form it
   * replaced rather than longer.
   */
  const STEPS = ['business_name', 'city', 'business_type', 'website', 'phone'] as const;
  type StepKey = (typeof STEPS)[number];
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  /** Validate only the field on screen, so errors appear where the eye is. */
  const validateField = (k: StepKey): string | undefined => {
    if (k === 'business_name' && form.business_name.trim().length < 2)
      return 'Real business name, please.';
    if (k === 'city' && form.city.trim().length < 2) return 'City + state works best.';
    if (k === 'website') {
      const w = form.website.trim();
      if (w.length < 4 || !/\./.test(w)) return "That doesn't look like a URL.";
    }
    if (k === 'phone') {
      const phone = (form.phone ?? '').trim();
      const email = form.email.trim();
      const phoneOk = phone.replace(/\D/g, '').length >= 10;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      // Either contact method is enough. The backend already treats both as
      // optional ("keep both so a phone-only lead isn't dropped"), so demanding
      // a phone number for a free tool was UI-only friction — and a phone is
      // the single highest-refusal field on a form like this. One of the two
      // still guarantees every completed score is a reachable lead.
      if (!phoneOk && !emailOk) return 'Add a phone or an email so I can send your score.';
      if (phone && !phoneOk) return 'That phone number looks short.';
      if (email && !emailOk) return 'That email looks off.';
      if (!consent) return 'Please check the box so I can send your results.';
    }
    return undefined;
  };

  /**
   * Skip forward over anything the Google lookup already answered correctly.
   * Re-asking a contractor to confirm a city Lola just found is a screen that
   * costs completions and buys nothing — the summary on the final step still
   * shows every value, and Back still reaches them, so nothing is hidden.
   */
  const nextStepIndex = (from: number, filled: Set<string>): number => {
    let i = from + 1;
    // Only ever skips fields the lookup itself answered, and the last step is
    // never skippable — contact details are always asked for explicitly.
    while (i < STEPS.length - 1 && filled.has(STEPS[i])) i += 1;
    return Math.min(i, STEPS.length - 1);
  };

  const goNext = async () => {
    const err = validateField(current);
    if (err) {
      setErrors((e) => ({ ...e, [current]: err }));
      return;
    }
    if (isLast) {
      score();
      return;
    }

    // Fire the Google lookup when they finish the name. It previously ran ONLY
    // for ?biz= deep links, so a visitor who typed their own name never got the
    // autofill this page advertises. Awaiting it here is what lets the next two
    // steps be skipped — capped so a slow API can't stall the flow.
    let filled = autofilled;
    if (current === 'business_name' && lookup === 'idle') {
      const found = await Promise.race([
        runLookup(form.business_name.trim()),
        new Promise<Set<string>>((res) => setTimeout(() => res(new Set<string>()), 3500)),
      ]);
      filled = found;
    }

    const target = nextStepIndex(step, filled);
    // Step-level events are how "did this convert better" becomes answerable
    // instead of a hunch — each one fires with the furthest step reached.
    track('growth_score_step', { step: target + 1, field: STEPS[target], skipped: target - step - 1 });
    setStep(target);
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const validate = (): boolean => {
    const e: Errors = {};
    if (form.business_name.trim().length < 2) e.business_name = 'Real business name, please.';
    if (form.city.trim().length < 2) e.city = 'City + state works best.';
    const w = form.website.trim();
    if (w.length < 4 || !/\./.test(w)) e.website = "That doesn't look like a URL.";
    // Phone is required; email is optional but validated if provided.
    const phone = (form.phone ?? '').trim();
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Real phone number, please.';
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'That email looks off.';
    if (!consent) e.consent = 'Please check the box so we can send your results.';
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
        setApiError('No score returned. Try again — or text Ty and he’ll run it for you.');
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
          <span className="h-3 w-3 animate-sniff rounded-full bg-gold" style={{ animationDelay: '0ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-gold" style={{ animationDelay: '180ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-gold" style={{ animationDelay: '360ms' }} />
        </div>
        <h2 className="mt-8 text-[26px] font-bold text-ink sm:text-[32px]">Calculating your Growth Score…</h2>
        <p key={scoringLine} className="mt-4 max-w-md animate-fade-in text-[15px] text-ink-3 sm:text-[16px]">
          {scoringLine}
        </p>
        <p className="mt-10 text-[11px] uppercase tracking-[0.28em] text-ink-4">Usually 10–20 seconds</p>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h2 className="text-[26px] font-bold text-ink">Lola lost the scent.</h2>
        <p className="mt-3 max-w-md text-[15px] text-ink-3">{apiError}</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => { setPhase('idle'); setApiError(null); }}
            className="inline-flex h-12 items-center justify-center rounded-[12px] bg-gradient-to-r from-gold via-gold-bright to-gold px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-on-gold"
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

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
          Free Tool · 60 Seconds · No Signup
        </p>

        {/* The pitch earns the first answer; after that it's just furniture
            pushing the live question below the fold on a phone. Shrink it once
            they're moving. */}
        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-ink"
          style={{ fontSize: step === 0 ? 'clamp(2.25rem, 5vw, 4rem)' : 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          What&apos;s your{' '}
          <span className="bg-gradient-to-br from-gold-hi via-gold-bright to-gold bg-clip-text text-transparent">
            Growth Score
          </span>
          ?
        </h1>

        {step === 0 && (
          <p className="mt-6 max-w-[680px] text-[16px] leading-[1.55] text-ink-2 sm:text-[18px]">
            One number, 0–100, across the six things that actually grow a local business —
            and the one move that lifts it fastest. You&apos;re not behind. You just haven&apos;t
            seen the map yet.
          </p>
        )}

        {/* Enter advances the step rather than submitting the whole form —
            goNext() calls score() itself once the last question is answered. */}
        <form
          onSubmit={(e) => { e.preventDefault(); goNext(); }}
          className="mt-8 rounded-[16px] border border-gold/25 bg-white/[0.02] p-5 sm:p-7"
        >
          {lookup === 'searching' && (
            <p className="mb-4 flex items-center gap-2 text-[12px] text-gold">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
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
            <p className="mb-4 text-[12px] text-ink-4">
              No Google match — fill the fields manually and we&apos;ll still score you.
            </p>
          )}

          {/* Progress — makes the end visible from step one. */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] font-semibold text-gold">
                Question {step + 1} of {STEPS.length}
              </p>
              <p className="text-[12px] text-ink-3">about 60 seconds</p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {current === 'business_name' && (
            <StepShell question="What's your business called?" hint="I'll look you up on Google and fill in what I can find.">
              <input
                autoFocus
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                placeholder="Sandbar Soft Wash"
                autoComplete="organization"
                className={inputCls(!!errors.business_name)}
              />
              {errors.business_name && <StepError msg={errors.business_name} />}
            </StepShell>
          )}

          {current === 'city' && (
            <StepShell question="Which city do you work in?" hint="Where your customers actually are — city and state.">
              <input
                autoFocus
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Tampa, FL"
                autoComplete="address-level2"
                className={inputCls(!!errors.city)}
              />
              {errors.city && <StepError msg={errors.city} />}
            </StepShell>
          )}

          {/* Tap-to-answer, and it advances itself — the one step that should
              never need the keyboard. */}
          {current === 'business_type' && (
            <StepShell question="What kind of work do you do?" hint="Pick the closest one.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BUSINESS_TYPES.map((t) => {
                  const selected = form.business_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        update('business_type', t.value);
                        // Route through the same skip-aware advance as the Next
                        // button; a bare s+1 here landed people back on the
                        // website step the lookup had already answered.
                        setStep(nextStepIndex(step, autofilled));
                      }}
                      className={`inline-flex min-h-[56px] items-center gap-3 rounded-[12px] border px-4 py-3 text-left text-[15px] font-medium transition ${
                        selected
                          ? 'border-gold bg-gold/[0.12] text-ink'
                          : 'border-gold/25 bg-surface text-ink-2 hover:border-gold/60 hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {current === 'website' && (
            <StepShell question="What's your website?" hint="No site yet? Type “none” — that's part of the score.">
              <input
                autoFocus
                type="text"
                inputMode="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://yourbusiness.com"
                autoComplete="url"
                className={inputCls(!!errors.website)}
              />
              {errors.website && <StepError msg={errors.website} />}
            </StepShell>
          )}

          {current === 'phone' && (
            <StepShell question="Where do I send your score?" hint="Your number gets the result. Email is optional.">
              <input
                autoFocus
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="(727) 555-0142"
                autoComplete="tel"
                className={inputCls(!!errors.phone)}
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@business.com (optional)"
                autoComplete="email"
                className={`mt-3 ${inputCls(!!errors.email)}`}
              />
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-gold/40 bg-surface accent-gold"
                />
                <span className="text-[13px] leading-[1.5] text-ink-2">
                  OK to text and email me about my results.
                </span>
              </label>
              {errors.phone && <StepError msg={errors.phone} />}

              {/* What they've told me so far — control, and a last chance to fix. */}
              <dl className="mt-5 space-y-1.5 border-t border-white/10 pt-4">
                {[
                  ['Business', form.business_name],
                  ['City', form.city],
                  ['Website', form.website],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-ink-3">{label}</dt>
                    <dd className="truncate text-right text-[13px] text-ink-2">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </StepShell>
          )}

          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex min-h-[52px] items-center justify-center rounded-[12px] border border-white/15 px-5 text-[14px] font-semibold text-ink-2 transition hover:border-gold/50 hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-7 py-3 text-[14px] font-bold uppercase tracking-[0.05em] text-on-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right active:scale-[0.98] sm:text-[15px]"
            >
              {isLast ? 'Get my free Growth Score →' : 'Next →'}
            </button>
          </div>

          <p className="mt-4 text-center text-[12px] text-ink-4">
            Your score lands by text + email within 24 hours · No spam · Reply STOP to opt out
          </p>
        </form>
      </section>

      {/* ── THE SIX DIMENSIONS — the signature visual ─────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
          What the score measures
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          Six dimensions. One number. A clear next step.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
          Your Growth Score rolls these six up into a single 0–100 — so it doesn&apos;t just grade
          you, it tells you exactly what to fix to get more calls and leads.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROWTH_SCORE_DIMENSIONS.map((dim, i) => {
            const d = DIMENSION_DETAIL[dim];
            return (
              <div key={dim} className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-gold/70">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 text-[18px] font-bold text-ink sm:text-[20px]">{dim}</p>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink-2">{d?.measures}</p>
                {d?.stage && (
                  <p className="mt-3 inline-block rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1 text-[11px] font-semibold text-gold">
                    {d.stage}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AFTER YOUR SCORE — two ways to act ─────────────────────── */}
      <section className="mt-16 sm:mt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
          After your score
        </p>
        <h2
          className="mt-3 font-bold leading-[1.1] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
        >
          See it, then fix it — yourself or with us.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
          Your score shows exactly where you&apos;re losing calls. From there you pick one: do it
          yourself, or have us build it and rank it.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`rounded-[14px] border p-5 sm:p-6 ${
                false ? 'border-gold bg-gold/[0.05]' : 'border-white/[0.10] bg-white/[0.02]'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{t.tagline}</p>
              <p className="mt-2 text-[18px] font-bold text-ink">{t.name}</p>
              <p className="mt-1 text-[15px] font-extrabold text-gold">
                {t.price}<span className="text-[12px] font-medium text-ink-3"> {t.period}</span>
              </p>
              <p className="mt-3 text-[13px] leading-[1.5] text-ink-2">
                {false
                  ? 'Your full Growth Score plus a simple 5-step fix-it checklist. Fix it on your own time.'
                  : 'We build the site and get you found on Google and in AI answers. Backed by the 90-Day Promise.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="mt-16 rounded-2xl border border-gold/25 bg-white/[0.02] p-6 sm:mt-20 sm:p-8">
        <h2 className="text-[22px] font-bold leading-[1.15] text-ink sm:text-[28px]">
          Get your number first. Your score lands within 24 hours.
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
          Run your free Growth Score above — we send it by text and email within 24 hours. Or skip the
          wait and start now: one plan, <span className="font-semibold text-ink">{PLAN.price}{PLAN.period}</span>,
          website build included free. Backed by {GUARANTEE.title}: {GUARANTEE.short.toLowerCase()}{' '}
          <a href="/#founder" className="text-gold underline underline-offset-2 decoration-gold/50 hover:decoration-gold">
            Who&apos;s behind it →
          </a>
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={startHref()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-gold via-gold-bright to-gold px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-on-gold shadow-[0_4px_16px_rgba(212,175,55,0.3)] transition hover:scale-[1.02]"
          >
            {PLAN.cta} — {PLAN.price}{PLAN.period}
          </a>
          <a
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-5 text-[13px] font-semibold uppercase tracking-[0.05em] text-ink transition hover:border-white/[0.3]"
          >
            See what&apos;s included
          </a>
        </div>
      </section>

      {/* Visible Q&A. SCORE_QA is the same array pageMeta turns into this
          route's FAQPage — and scripts/check-seo.mjs fails the build if a
          question in the schema isn't in the page's visible text, so these
          cannot drift apart. Rendered as flow content rather than a collapsed
          accordion because the point is being quotable: "what is a Growth
          Score" is a question people genuinely type, and the answer here is
          written to be lifted whole. */}
      <AnswerBlock
        items={SCORE_QA}
        kicker="Common questions"
        heading="What a Growth Score is, and how you get found"
        // Collapsed: this page's job is the form above it, and open these were
        // the tallest section on the page — 240 words of supporting copy
        // between the reader and the footer. The answers stay in the HTML, so
        // nothing is lost for search or AI citation.
        collapsible
      />

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-ink-4 sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}

/** One question, asked the way Ty would ask it out loud. */
function StepShell({
  question,
  hint,
  children,
}: { question: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[21px] font-bold leading-[1.25] text-ink sm:text-[24px]">{question}</h2>
      <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-3">{hint}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function StepError({ msg }: { msg: string }) {
  return <p className="mt-2 text-[13px] text-[#E5A95B]">{msg}</p>;
}

function Field({
  label,
  error,
  children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-gold/85">
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
    'block w-full rounded-[12px] border bg-surface px-4 py-3 text-[15px] font-medium text-ink outline-none transition',
    hasError
      ? 'border-[#E5A95B] focus:border-[#E5A95B] focus:shadow-[0_0_0_3px_rgba(229,169,91,0.12)]'
      : 'border-gold/25 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]',
  ].join(' ');
}
