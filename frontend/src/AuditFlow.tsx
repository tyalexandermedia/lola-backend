/// <reference types="vite/client" />
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuditResult,
  BusinessAuditRequest,
  PricingResponse,
  Recommendation,
} from './types';
import { track } from './analytics';

import { API_URL } from './api';
// Re-export retained for any external consumer; new code should import from
// './api' directly so AuditFlow can stay lazy-loaded.
export { API_URL };

// Spec: 6 options + "Other" — soft wash is the default for direct traffic.
const SERVICE_OPTIONS = [
  { value: 'soft wash', label: '🌊 Soft Wash / Pressure Wash' },
  { value: 'hvac', label: '❄️ HVAC' },
  { value: 'roofing', label: '🏠 Roofing' },
  { value: 'plumbing', label: '🔧 Plumbing' },
  { value: 'pool service', label: '🏊 Pool Service' },
  { value: 'other', label: 'Other local service business' },
] as const;

type Stage = 'questions' | 'sniffing' | 'results' | 'error';
type FieldKey = keyof BusinessAuditRequest;

interface QuestionDef {
  key: FieldKey;
  prompt: string;
  lola: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'url';
  options?: ReadonlyArray<{ value: string; label: string }>;
  validate?: (value: string) => string | null;
}

const QUESTIONS: ReadonlyArray<QuestionDef> = [
  {
    key: 'business_name',
    prompt: 'What business are we sniffing out?',
    lola: 'First thing first. Give Lola a name to chase.',
    placeholder: 'Sandbar Soft Wash',
    validate: (v) => (v.trim().length < 2 ? 'A real name, please.' : null),
  },
  {
    key: 'business_type',
    prompt: 'What do you actually do for a living?',
    lola: 'Pick the closest match. Lola audits all local service businesses.',
    options: SERVICE_OPTIONS,
  },
  {
    key: 'city',
    prompt: 'Where do you do business?',
    lola: 'One city is enough. Lola only needs your home turf.',
    placeholder: 'Tampa, FL',
    validate: (v) => (v.trim().length < 2 ? 'City + state works best.' : null),
  },
  {
    key: 'website',
    prompt: 'Drop your site link.',
    lola: "Lola's about to crawl it. https:// is fine to include.",
    placeholder: 'https://sandbarsoftwash.com',
    type: 'url',
    validate: (v) => {
      const trimmed = v.trim();
      if (trimmed.length < 4) return 'Need a real URL.';
      if (!/\./.test(trimmed)) return 'That doesn’t look like a URL.';
      return null;
    },
  },
  {
    key: 'email',
    prompt: 'Where should the report land?',
    lola: 'Same inbox you check before coffee.',
    placeholder: 'team@sandbarsoftwash.com',
    type: 'email',
    validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Real email, please.' : null),
  },
];

const SNIFFING_LINES = [
  "Lola's nose is on the ground. Give her a few seconds.",
  'Crawling the site, scanning Google, sniffing for leaks.',
  'Checking page speed. Then reviews. Then competitors.',
  'Almost done. Pulling the receipts.',
];

const initialForm: BusinessAuditRequest = {
  business_name: 'Sandbar Soft Wash',
  website: 'https://sandbarsoftwash.com',
  city: 'Palm Harbor, FL',
  business_type: 'soft wash',
  email: 'team@sandbarsoftwash.com',
};

// Map Homepage's trade-picker labels → SERVICE_OPTIONS internal values.
// Spec: 5 supported industries (soft wash, hvac, roofing, plumbing, pool service).
// Anything else (Electrician, Painter, etc.) maps to "other" so the audit still
// runs as a general home-services audit rather than failing silently.
const TRADE_TO_SERVICE: Record<string, string> = {
  HVAC: 'hvac',
  Plumber: 'plumbing',
  Roofer: 'roofing',
  'Soft Wash / Pressure Wash': 'soft wash',
  'Soft Wash': 'soft wash', // back-compat with older localStorage values
  'Pool Services': 'pool service',
  'Pool Service': 'pool service',
};

// Spec — Phase B: smart pre-select from referrer URL path. Used when no
// ?trade= param + no localStorage. Maps each /lp/* slug → business_type.
const REFERRER_TO_SERVICE: Array<[string, string]> = [
  // New programmatic [service]-seo-[city] slugs (startsWith matches every city).
  ['/lp/pressure-washing-seo', 'soft wash'],
  ['/lp/hvac-seo', 'hvac'],
  ['/lp/roofing-seo', 'roofing'],
  ['/lp/plumber-seo', 'plumbing'],
  ['/lp/pool-service-seo', 'pool service'],
  // Legacy slugs (kept for any in-flight links / 301 sources).
  ['/lp/local-seo-pressure-washing-florida', 'soft wash'],
  ['/lp/local-seo-hvac-contractors-tampa', 'hvac'],
  ['/lp/local-seo-roofers-florida', 'roofing'],
  ['/lp/local-seo-plumbers-tampa', 'plumbing'],
  ['/lp/local-seo-pool-service-florida', 'pool service'],
];

// Spec — Phase B fallback: if no signal at all, default to soft wash
// (Coach Ty's dad's trade, real case study, most common starting point).
const DEFAULT_BUSINESS_TYPE = 'soft wash';

export function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

export default function AuditFlow() {
  const [stage, setStage] = useState<Stage>('questions');
  const [form, setForm] = useState<BusinessAuditRequest>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sniffLine, setSniffLine] = useState(SNIFFING_LINES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smart business_type pre-select. Priority order (per spec P11 Phase B):
  //   1. ?trade= URL param (highest — explicit from Homepage CTA / cold email)
  //   2. document.referrer path → REFERRER_TO_SERVICE (LP → audit nav)
  //   3. localStorage.lolaTrade (Homepage dropdown persisted)
  //   4. DEFAULT_BUSINESS_TYPE (soft wash) — never leaves the field blank
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. URL param wins
    try {
      const p = new URLSearchParams(window.location.search).get('trade');
      if (p) {
        const mapped = TRADE_TO_SERVICE[p];
        if (mapped) {
          setForm((prev) => ({ ...prev, business_type: mapped }));
          trackClick('audit_industry_preselected', { trade: mapped, source: 'url_param' });
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Referrer path match (LP → audit navigation)
    try {
      const ref = document.referrer || '';
      if (ref) {
        const refUrl = new URL(ref);
        for (const [path, value] of REFERRER_TO_SERVICE) {
          if (refUrl.pathname.startsWith(path)) {
            setForm((prev) => ({ ...prev, business_type: value }));
            trackClick('audit_industry_preselected', { trade: value, source: 'referrer' });
            return;
          }
        }
      }
    } catch {
      /* ignore — cross-origin or malformed referrer */
    }

    // 3. localStorage (Homepage dropdown previously set)
    try {
      const ls = window.localStorage.getItem('lolaTrade');
      if (ls) {
        const mapped = TRADE_TO_SERVICE[ls];
        if (mapped) {
          setForm((prev) => ({ ...prev, business_type: mapped }));
          trackClick('audit_industry_preselected', { trade: mapped, source: 'localstorage' });
          return;
        }
      }
    } catch {
      /* ignore */
    }

    // 4. Hard default — never blank
    setForm((prev) => ({ ...prev, business_type: DEFAULT_BUSINESS_TYPE }));
    trackClick('audit_industry_preselected', { trade: DEFAULT_BUSINESS_TYPE, source: 'default' });
  }, []);

  const currentQuestion = QUESTIONS[stepIndex];
  const totalSteps = QUESTIONS.length;
  const isLastStep = stepIndex === totalSteps - 1;

  useEffect(() => {
    if (stage !== 'questions') return;
    if (currentQuestion.options) return;
    inputRef.current?.focus();
  }, [stage, stepIndex, currentQuestion.options]);

  useEffect(() => {
    if (stage !== 'sniffing') return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % SNIFFING_LINES.length;
      setSniffLine(SNIFFING_LINES[i]);
    }, 2200);
    return () => clearInterval(id);
  }, [stage]);

  const updateField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const runAudit = async () => {
    setStage('sniffing');
    setSniffLine(SNIFFING_LINES[0]);
    setApiError(null);
    try {
      const response = await fetch(`${API_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || 'Audit request failed');
      }
      const data: AuditResult = await response.json();
      setAudit(data);
      setStage('results');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to run the audit');
      setStage('error');
    }
  };

  const advance = async () => {
    const value = form[currentQuestion.key] ?? '';
    if (!currentQuestion.options && currentQuestion.validate) {
      const err = currentQuestion.validate(value);
      if (err) {
        setStepError(err);
        return;
      }
    }
    setStepError(null);

    if (!isLastStep) {
      setStepIndex(stepIndex + 1);
      return;
    }
    await runAudit();
  };

  const goBack = () => {
    setStepError(null);
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const restart = () => {
    setStage('questions');
    setStepIndex(0);
    setStepError(null);
    setApiError(null);
    setAudit(null);
    setForm(initialForm);
  };

  if (stage === 'questions') {
    return (
      <QuestionStage
        question={currentQuestion}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        value={form[currentQuestion.key] ?? ''}
        onChange={(value) => updateField(currentQuestion.key, value)}
        onAdvance={advance}
        onBack={goBack}
        error={stepError}
        inputRef={inputRef}
        isLastStep={isLastStep}
      />
    );
  }

  if (stage === 'sniffing') return <SniffingStage line={sniffLine} />;
  if (stage === 'error') {
    return <ErrorStage message={apiError ?? 'Something broke.'} onRetry={runAudit} onReset={restart} />;
  }
  if (stage === 'results' && audit) {
    return (
      <ResultsStage
        audit={audit}
        cta={{ label: 'Run another audit', onClick: restart }}
      />
    );
  }
  return null;
}

function ProgressBar({ total, current }: { total: number; current: number }) {
  const pct = Math.min(100, ((current + 1) / total) * 100);
  return (
    <div
      className="h-[3px] w-full overflow-hidden rounded-[2px] bg-white/[0.06]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current + 1}
    >
      <div
        className="h-full rounded-[2px] bg-gradient-to-r from-[#FFD166] via-[#F4B942] to-[#E09E23] transition-[width] duration-[400ms] ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function QuestionStage({
  question,
  stepIndex,
  totalSteps,
  value,
  onChange,
  onAdvance,
  onBack,
  error,
  inputRef,
  isLastStep,
}: {
  question: QuestionDef;
  stepIndex: number;
  totalSteps: number;
  value: string;
  onChange: (value: string) => void;
  onAdvance: () => void;
  onBack: () => void;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  isLastStep: boolean;
}) {
  const [shaking, setShaking] = useState(false);

  // Trigger shake whenever error toggles from null → message
  useEffect(() => {
    if (error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 220);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <main className="flex flex-1 flex-col pt-2 sm:pt-6">
      <ProgressBar total={totalSteps} current={stepIndex} />

      <div key={question.key} className="animate-slide-up mt-4 sm:mt-6">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFD166] sm:text-[12px]"
          aria-live="polite"
        >
          Step {stepIndex + 1} of {totalSteps}
        </p>

        <h1 className="mt-2 text-[26px] font-bold leading-[1.15] text-white sm:mt-3 sm:text-[32px] lg:text-[40px]">
          {question.prompt}
        </h1>

        <p className="mt-2 text-[15px] leading-[1.55] text-[#9AA0A6] sm:mt-3 sm:text-[17px] sm:leading-[1.6]">{question.lola}</p>

        <div className="mt-5 sm:mt-8">
          {question.options ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((opt) => {
                const active = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`rounded-[14px] border px-5 py-4 text-left text-[16px] font-medium transition-all duration-200 ${
                      active
                        ? 'border-[#FFD166] bg-[#FFD166]/[0.12] text-white shadow-[0_0_0_3px_rgba(255,193,7,0.16)]'
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-200 hover:border-white/[0.18] hover:bg-white/[0.05]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <label className="sr-only" htmlFor={`q-${question.key}`}>
                {question.prompt}
              </label>
              <input
                id={`q-${question.key}`}
                ref={inputRef}
                value={value}
                type={question.type ?? 'text'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize={question.type === 'email' ? 'none' : 'words'}
                placeholder={question.placeholder}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAdvance();
                  }
                }}
                className={`h-16 w-full rounded-[14px] border bg-white/[0.03] px-6 text-[18px] font-medium text-white caret-[#D4AF37] outline-none transition-all duration-200 placeholder:text-[#6A6F78] sm:h-[60px] ${
                  error
                    ? 'border-[#E5A95B] focus:border-[#E5A95B] focus:shadow-[0_0_0_4px_rgba(229,169,91,0.1)]'
                    : 'border-white/[0.08] focus:border-[#D4AF37] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.1)]'
                } ${shaking ? 'animate-shake' : ''}`}
              />
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-[#E5A95B]" role="alert">
            {error}
          </p>
        )}

        {/* Heads-up note: only on the last step, below the email input.
            Informational, not action-blocking — keeps CTA above the fold. */}
        {isLastStep && (
          <p className="mt-4 text-[12px] leading-[1.5] text-[#7A7F8A]">
            Heads up: if any external data source is syncing, your audit still runs —
            partial data shows as "pending" and populates within 24 hours.
          </p>
        )}
      </div>

      {/* Mobile: Next first (top), Back below — via flex-col-reverse.
          Desktop: Back left, Next right via sm:flex-row + justify-between. */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={stepIndex === 0}
          className="inline-flex h-14 w-full items-center justify-center rounded-[12px] border border-white/[0.1] bg-transparent px-6 text-[15px] font-medium text-[#9AA0A6] transition-all duration-200 hover:border-white/[0.2] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
          aria-label="Back"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className="group inline-flex h-14 w-full items-center justify-center gap-1.5 rounded-[12px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] px-8 text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25 sm:w-auto"
          aria-label={isLastStep ? 'Run the audit' : 'Next'}
        >
          <span>{isLastStep ? 'Run the audit' : 'Next'}</span>
          <span aria-hidden className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
    </main>
  );
}

function SniffingStage({ line }: { line: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '0ms' }} />
        <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '180ms' }} />
        <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '360ms' }} />
      </div>
      <h2 className="mt-8 text-2xl font-semibold text-white">Lola is on it.</h2>
      <p key={line} className="mt-3 max-w-md animate-fade-in text-base text-slate-400">
        {line}
      </p>
      <p className="mt-10 text-xs uppercase tracking-[0.28em] text-slate-600">
        This usually takes 10–20 seconds
      </p>
    </main>
  );
}

function ErrorStage({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-semibold text-white">Lola lost the scent.</h2>
      <p className="mt-3 max-w-md text-base text-slate-400">{message}</p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#F4B942] to-[#E09E23] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(255,193,7,0.24)] transition duration-150 hover:brightness-110 active:scale-[0.98] active:duration-75 focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-3 text-sm font-semibold text-slate-100 transition duration-150 hover:border-slate-500 hover:bg-slate-800 active:scale-[0.98] active:duration-75 focus:outline-none focus:ring-4 focus:ring-slate-500/25"
        >
          Start over
        </button>
      </div>
    </main>
  );
}

export interface ResultsCta {
  label: string;
  onClick?: () => void;
  href?: string;
}

export function ResultsStage({
  audit,
  cta,
  showShareLink = true,
}: {
  audit: AuditResult;
  cta: ResultsCta;
  showShareLink?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const scoreTone = useMemo(() => {
    if (audit.total_score >= 85) return 'text-emerald-400';
    if (audit.total_score >= 70) return 'text-amber-300';
    return 'text-rose-300';
  }, [audit]);

  const categoryRows = useMemo(
    () =>
      Object.entries(audit.categories).map(([key, details]) => ({
        title: key.replace(/_/g, ' '),
        score: details.score,
        available: audit.signals?.[key]?.available ?? true,
      })),
    [audit]
  );

  const businessInfo = audit.business_info as Record<string, unknown>;
  const stringOf = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.length > 0
      ? v
      : typeof v === 'number' && v
      ? String(v)
      : fallback;

  const shareUrl =
    showShareLink && audit.audit_id ? `${window.location.origin}/r/${audit.audit_id}` : null;

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const monthlyLeak = audit.revenue_leak.monthly_leak || 0;
  const annualAtStake = monthlyLeak * 12;
  const isHighLeak = monthlyLeak >= 10000;
  const businessTypeDisplay = audit.business_type
    ? audit.business_type.replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const heroCtaHref = withUtm(STRATEGY_CALL_URL, 'hero_cta', { campaign: 'plug_leak' });

  return (
    <main className="lola-report flex flex-1 flex-col">
      {/* Print-only branded header — only renders in the saved PDF, turning a
          screenshot-y page into a clean forwardable scorecard. */}
      <div className="print-only print-header">
        <span className="print-brand">🐾 LOLA OS — Growth Score Report</span>
        <span className="print-meta">
          {businessTypeDisplay ? `${businessTypeDisplay} · ` : ''}lola.tyalexandermedia.com
        </span>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          HERO — above the fold.
          Eyebrow → H1 → city/type → custom insight → 3-stat grid
          → primary CTA → micro-benefits → scroll cue (desktop only).
          The Annual-at-Stake stat is visually dominant.
      ════════════════════════════════════════════════════════════════ */}
      <section className="animate-slide-up relative pt-0">
        {/* Radial gold glow behind the stat grid (premium feel, doesn't tint cards). */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Audit Complete
        </p>

        {/* H1: clamp scales 40→72px with viewport; nowrap on desktop so the
            business name stays single-line. Mobile can wrap (text-[40px] floor). */}
        <h1
          className="mt-3 overflow-hidden font-bold leading-[1.05] tracking-[-0.02em] text-white sm:mt-4 sm:whitespace-nowrap sm:text-ellipsis"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
        >
          {audit.business_name}
        </h1>

        <p className="mt-3 text-[15px] text-[#D4AF37]/85 sm:text-[17px]">
          {audit.city}{businessTypeDisplay ? ` · ${businessTypeDisplay}` : ''}
        </p>

        {/* 16px gap subhead → insight per spec */}
        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.55] text-white sm:text-[18px] sm:leading-[1.5]">
          {audit.lola_message}
        </p>

        {/* 3-stat grid — 32px gap from insight, 16px between cards, 24px card padding */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Score */}
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8A8F98]">Score</p>
            <p className={`mt-3 text-[44px] font-extrabold leading-none ${scoreTone}`}>
              {audit.total_score < 0 ? '—' : audit.total_score}
            </p>
            <p className="mt-2 text-[13px] text-[#A0A5AE]">
              {audit.grade} — {audit.grade_label}
            </p>
          </div>

          {/* Monthly leak — toggle between $ and missed calls */}
          <LeakCard
            monthlyLeak={monthlyLeak}
            missedCalls={audit.revenue_leak.missed_calls_per_month || 0}
            avgJobValue={audit.revenue_leak.avg_job_value || 0}
            isIncomplete={audit.segment === 'incomplete'}
          />

          {/* Annual at stake — DOMINANT */}
          <div
            className={`relative rounded-[12px] border-2 border-[#D4AF37]/55 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-transparent p-6 shadow-[inset_0_0_40px_rgba(212,175,55,0.08),0_0_28px_rgba(212,175,55,0.10)]`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
              Annual at stake
            </p>
            <p
              className={`mt-3 bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text font-extrabold leading-[0.95] tracking-[-0.025em] text-transparent ${
                isHighLeak
                  ? 'text-[56px] sm:text-[72px] lg:text-[80px]'
                  : 'text-[48px] sm:text-[64px] lg:text-[72px]'
              } drop-shadow-[0_4px_20px_rgba(212,175,55,0.25)]`}
            >
              ${formatNumber(annualAtStake)}
            </p>
            <p className="mt-2 text-[13px] text-[#D4AF37]/80">/ year at risk</p>
          </div>
        </div>

        {/* Primary CTA — full-bleed, scroll-to-pricing */}
        <a
          href={heroCtaHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            trackClick('book_call_clicked_hero', { monthly_leak: monthlyLeak, annual: annualAtStake, score: audit.total_score });
          }}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-6 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:scale-[1.02] hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#D4AF37] sm:mt-10 sm:h-16 sm:text-[16px]"
        >
          <span>Book a free call — plug the leak</span>
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </a>

        {/* Micro-benefits — single row on desktop, stacked on mobile */}
        <ul className="mt-5 flex flex-col gap-2 text-[13px] text-[#C5C5C8] sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-2">
          <li className="flex items-center gap-2">
            <CheckIcon /> See the 3 fixes worth ${formatNumber(annualAtStake)}/yr
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon /> Built with real Google data
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon /> No pitch, just clarity
          </li>
        </ul>

        {/* Scroll cue — desktop only */}
        <p className="mt-10 hidden animate-bounce-slow text-center text-[12px] uppercase tracking-[0.22em] text-[#D4AF37]/70 sm:block">
          ↓ Full breakdown below
        </p>
      </section>

      {/* Share + download — relocated below the hero, smaller, doesn't compete.
          no-print so neither button appears in the saved PDF. */}
      <div className="no-print mt-10 flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="truncate text-[12px] text-[#8A8F98]">
          {shareUrl ?? 'Your Growth Score scorecard'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { try { track('scorecard_download_clicked'); } catch { /* noop */ } window.print(); }}
            className="flex h-11 min-w-[150px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-[#0A0A0B] transition hover:brightness-105"
          >
            ⬇ Save as PDF
          </button>
          {shareUrl && (
            <button
              type="button"
              onClick={copyShareLink}
              className="flex h-11 min-w-[140px] items-center justify-center rounded-xl bg-white/[0.05] px-4 text-[12px] font-semibold text-[#C5C5C8] transition hover:bg-white/[0.10]"
            >
              {copied ? 'Copied ✓' : 'Copy share link'}
            </button>
          )}
        </div>
      </div>

      {audit.segment === 'incomplete' && (
        <section className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Audit ran with degraded data.</p>
          <p className="mt-1 text-amber-200/90">
            Google's APIs didn't return enough signal to grade fairly. The leak estimate uses a
            conservative baseline. The playbook below is the safe-bet starting point — once the data
            is flowing again, Lola can grade the real score.
          </p>
        </section>
      )}

      {audit.recommendations && audit.recommendations.length > 0 && (
        <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.24em] text-gold-300">Lola's playbook</p>
            <p className="text-xs text-slate-500">Ranked by impact × effort</p>
          </div>
          <ul className="mt-4 space-y-3">
            {audit.recommendations.map((rec, i) => (
              <RecommendationCard key={`${rec.category}-${i}`} rec={rec} order={i + 1} primary={i === 0} />
            ))}
          </ul>
        </section>
      )}

      {/* Pricing moved to standalone /pricing route. Hero CTA + header nav
          both link there. No in-results UpsellCta block anymore — keeps the
          results page focused on the diagnostic + playbook + strategy CTA. */}

      {/* ── AGENT READINESS SCORE (new metric — surfaces how prepared this
          business is for AI agent recommendations: ChatGPT, Perplexity,
          Google AI Overviews, Gemini) ─────────────────────────────────── */}
      {audit.agent_readiness && (
        <section className="mt-10 rounded-3xl border border-[#D4AF37]/25 bg-[#0F0F12] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
                Agent Readiness Score
              </p>
              <p className="mt-2 text-[13px] text-[#A0A5AE] sm:max-w-[420px]">
                How prepared your business is to be recommended by AI search
                agents (ChatGPT, Perplexity, Google AI, Gemini) for local
                "<em>{audit.business_type}</em> in {audit.city}" queries.
              </p>
            </div>
            <div className="flex shrink-0 items-baseline gap-3">
              <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[56px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[64px]">
                {audit.agent_readiness.score}
              </span>
              <span className="text-[14px] font-medium text-[#D4AF37]">
                {audit.agent_readiness.grade} — {audit.agent_readiness.grade_label}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {audit.agent_readiness.categories.map((c) => {
              const pct = c.available ? c.score : 0;
              const color =
                pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
              return (
                <div key={c.name} className="rounded-xl bg-white/[0.02] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-white">{c.name}</span>
                    <span className="text-[14px] font-bold tabular-nums text-[#D4AF37]">
                      {c.available ? c.score : '—'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {audit.agent_readiness.score < 70 && (
            <p className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-4 text-[13px] leading-[1.55] text-[#C5C5C8] sm:text-[14px]">
              AI agents can't fully understand your business yet. That means when
              ChatGPT, Perplexity, or Google AI recommends a business for
              "{audit.city} {audit.business_type}," you're getting skipped — even
              if you rank in traditional search.
            </p>
          )}
        </section>
      )}

      {/* AI Search Visibility — v1 placeholder section. Frames the upcoming
          metric (where you actually show up across ChatGPT/Perplexity/Gemini)
          and tells the reader honestly that live tracking is part of the Full Build. */}
      <section className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
            AI Search Visibility
          </p>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
            Beta
          </span>
        </div>
        <h3 className="mt-3 text-[22px] font-bold leading-tight text-white sm:text-[26px]">
          Where you show up when buyers ask AI
        </h3>
        <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          Your Agent Readiness Score above predicts <em>how well</em> AI agents can
          understand your business. The next layer — live tracking of <strong className="text-white">where you actually appear</strong> in
          ChatGPT, Perplexity, Gemini, and Google AI Overviews for the queries
          buyers run in {audit.city} — is part of the done-for-you Full Build.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'ChatGPT', status: 'Tracking — ships Q3' },
            { label: 'Perplexity', status: 'Tracking — ships Q3' },
            { label: 'Google AI Overviews', status: 'Tracking — ships Q3' },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-[12px] border border-white/[0.06] bg-[#0A0A0B]/40 p-4"
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">
                {row.label}
              </p>
              <p className="mt-1.5 text-[11px] text-[#8A8F98]">{row.status}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12px] leading-[1.5] text-[#7A7F8A]">
          Honest note: this section is a placeholder for what&apos;s coming. Today&apos;s score reflects
          AI-readability signals (entities, reviews, schema, site speed). Live citation
          tracking is part of the{' '}
          <a
            href="/pricing"
            onClick={() => trackClick('build_cta_clicked', { from: 'ai_search_visibility_note' })}
            className="font-semibold text-[#D4AF37] underline-offset-2 hover:underline"
          >
            $997 Full Build
          </a>.
        </p>

        <a
          href={withUtm(STRATEGY_CALL_URL, 'ai_search_visibility', { campaign: 'full_build' })}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackClick('book_call_clicked', { from: 'ai_search_visibility_button' })}
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition-all hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.12]"
        >
          Book a call about the Full Build →
        </a>
      </section>

      {/* Copy-paste deliverables + Lola's Take + Share — P11 Phase C */}
      <DeliverablesBlock audit={audit} />

      {/* AI Enhancement layer — service-type-matched opportunity report */}
      <EnhancementBlock audit={audit} />

      {/* Who's capturing your customers — top 3 competitors from search results */}
      {Array.isArray(audit.competitors) && audit.competitors.length > 0 && (
        <section className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
            Who's capturing your customers
          </p>
          <h3 className="mt-3 text-[22px] font-bold leading-tight text-white sm:text-[26px]">
            Top businesses Google's putting in front of {audit.city} buyers
          </h3>
          <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
            Pulled live from Google's top results for "{audit.business_type} {audit.city}".
            These are the businesses showing up before you on the queries that matter.
          </p>

          <ol className="mt-5 flex flex-col gap-2">
            {audit.competitors.slice(0, 3).map((c, i) => {
              const title = String(c.title || '').replace(/\s*[-|·].*$/, '').trim() || 'Unknown';
              const url = typeof c.url === 'string' ? c.url : '';
              const rank = i + 1;
              return (
                <li
                  key={`${title}-${i}`}
                  className="flex items-center gap-3 rounded-[12px] border border-white/[0.06] bg-[#0A0A0B]/40 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[14px] font-bold text-[#D4AF37]">
                    #{rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">
                      {title}
                    </p>
                    {url && (
                      <p className="mt-0.5 truncate text-[11px] text-[#7A7F8A]">
                        {url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </p>
                    )}
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-[#D4AF37] underline-offset-2 hover:underline"
                    >
                      Visit →
                    </a>
                  )}
                </li>
              );
            })}
            <li className="mt-1 flex items-center gap-3 rounded-[12px] border-2 border-[#D4AF37]/45 bg-[#D4AF37]/[0.06] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[12px] font-bold text-[#0A0A0B]">
                YOU
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">
                  {audit.business_name}
                </p>
                <p className="mt-0.5 text-[11px] text-[#D4AF37]/85">
                  Score {audit.total_score}/100 — currently not on page 1 for this query
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-4 text-[13px] leading-[1.6] text-[#C5C5C8] sm:text-[14px]">
            <p className="font-semibold text-white">
              From what Lola sees on local business audits: top-3 takes most of the clicks.
              The rest fight over the scraps.
            </p>
            <p className="mt-2">
              That's the gap. Lola moves you into the top-3 zone — month after month —
              so the calls land with you instead of the next business down the list.
            </p>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Category signals</p>
          <p className="text-xs text-slate-500">
            {categoryRows.filter((r) => r.available).length}/{categoryRows.length} signals available
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {categoryRows.map((row) => (
            <div
              key={row.title}
              className={`rounded-2xl bg-slate-950/70 p-4 ring-1 ${
                row.available ? 'ring-slate-800' : 'ring-slate-900 opacity-60'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{row.title}</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {row.available ? row.score : '—'}
              </p>
              {!row.available && <p className="mt-1 text-xs text-slate-500">No data</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Business profile</p>
        <div className="mt-4 grid gap-2 text-sm">
          <ProfileRow label="Website" value={audit.website} />
          <ProfileRow label="Phone" value={stringOf(businessInfo.phone, 'Not on Google')} />
          <ProfileRow label="Address" value={stringOf(businessInfo.address, 'Not on Google')} />
          <ProfileRow label="Rating" value={stringOf(businessInfo.rating, 'Unknown')} />
          <ProfileRow label="Reviews" value={stringOf(businessInfo.review_count, 'Unknown')} />
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Missed calls / mo" value={`${audit.revenue_leak.missed_calls_per_month}`} />
        <Stat label="Avg job value" value={`$${formatNumber(audit.revenue_leak.avg_job_value)}`} />
        <Stat
          label="Recovery potential"
          value={`$${formatNumber(audit.revenue_leak.recovery_potential)}`}
        />
      </section>

      <ResultsFooter audit={audit} cta={cta} />

      {/* Data-freshness notice — moved from top-of-page banner to a quiet
          accordion at the bottom of results. Default collapsed; only shows
          if at least one Google API actually reported errors recently. */}
      <DataFreshnessAccordion />
    </main>
  );
}

// Pricing destination. Default = /pricing route (standalone PricingPage).
// Override with VITE_PRICING_URL for an external Wix page later.
const PRICING_URL =
  (import.meta.env.VITE_PRICING_URL as string | undefined) ||
  '/pricing';

// Single booking destination site-wide (Google Calendar). Call CTAs → here,
// pay CTAs → Stripe. One env var so the funnel never splits across tools.
const STRATEGY_CALL_URL =
  (import.meta.env.VITE_CALENDAR_URL as string | undefined) ||
  'https://calendar.app.google/J7idjUDitd2Hziuc7';

const GUIDE_URL =
  (import.meta.env.VITE_GUIDE_URL as string | undefined) ||
  'https://tyalexandermedia.com/guide?source=lola_audit';

const CASE_STUDY_URL =
  (import.meta.env.VITE_CASE_STUDY_URL as string | undefined) ||
  '/r/client/sandbar';

function withUtm(
  url: string,
  content: string,
  overrides?: { campaign?: string; medium?: string; source?: string },
): string {
  // Don't break existing query strings (e.g. /guide?source=lola_audit).
  const params = new URLSearchParams({
    utm_source: overrides?.source ?? 'lola_audit',
    utm_medium: overrides?.medium ?? 'results_page',
    utm_campaign: overrides?.campaign ?? 'strategy_call',
    utm_content: content,
  });
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}

// Analytics shim — routes through PostHog (analytics.ts) which falls back to
// console.log when VITE_POSTHOG_KEY isn't set. Plausible/GA kept as fan-out
// so historical dashboards keep filling.
function trackClick(label: string, props?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  try {
    track(label, props);
  } catch {
    /* analytics must never break the click */
  }
  const w = window as unknown as {
    plausible?: (event: string, opts?: { props?: object }) => void;
    gtag?: (cmd: string, event: string, opts?: object) => void;
  };
  try {
    if (w.plausible) w.plausible(label, props ? { props } : undefined);
    else if (w.gtag) w.gtag('event', label, { event_category: 'cta', ...(props || {}) });
  } catch {
    /* analytics must never break the click */
  }
}

function DataFreshnessAccordion() {
  const [degraded, setDegraded] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.api_status) return;
        const bad: string[] = [];
        for (const [name, entry] of Object.entries(data.api_status) as Array<[string, { last_ok_at: string | null; last_error_at: string | null }]>) {
          if (!entry) continue;
          const okAt = entry.last_ok_at ? Date.parse(entry.last_ok_at) : 0;
          const errAt = entry.last_error_at ? Date.parse(entry.last_error_at) : 0;
          if (errAt && errAt >= okAt) bad.push(name);
        }
        setDegraded(bad);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (degraded.length === 0) return null;

  return (
    <details
      className="mx-auto mt-6 max-w-[640px] rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.10]"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) {
          trackClick('data_freshness_expanded');
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] text-[#8A8F98] [&::-webkit-details-marker]:hidden">
        <span>ⓘ About data freshness</span>
        <span aria-hidden className="text-[10px] opacity-60 transition group-open:rotate-180">▾</span>
      </summary>
      <p className="mt-3 text-[13px] leading-[1.6] text-[#A0A5AE]">
        Some external data sources are temporarily syncing. Partial data may show as "pending" and
        will populate within 24 hours. The audit score above reflects only the signals Lola could
        confirm directly with Google.
      </p>
    </details>
  );
}

function ResultsFooter({ audit, cta }: { audit: AuditResult; cta: ResultsCta }) {
  const leak = audit.revenue_leak.monthly_leak || 0;
  const score = audit.total_score;

  // Dynamic headline per spec
  const headline = (() => {
    if (score >= 80) {
      return (
        <>
          Your SEO is strong — but{' '}
          <span className="text-[#FFD166]">${formatNumber(leak)}/month</span> is still up for grabs.
        </>
      );
    }
    if (leak >= 1000) {
      return (
        <>
          You're leaving{' '}
          <span className="text-[#FFD166]">${formatNumber(leak)}/month</span> on the table.
        </>
      );
    }
    return (
      <>
        There's <span className="text-[#FFD166]">${formatNumber(leak)}/month</span> worth of fixes waiting.
      </>
    );
  })();

  const strategyHref = withUtm(STRATEGY_CALL_URL, 'primary_cta');

  const onBookClick = () => trackClick('book_call', { leak, score });
  const onGuideClick = () => trackClick('guide_download', { score });
  const onCaseStudyClick = () => trackClick('case_study_view', { score });
  const onRerunClick = () => {
    trackClick('rerun_audit', { score });
    cta.onClick?.();
  };

  return (
    <footer>
      {/* SECTION 1 — Primary CTA (biggest visual weight; fade-up on render) */}
      <section
        aria-label="Book a strategy call"
        className="animate-slide-up relative mt-12 overflow-hidden rounded-3xl border-2 border-[#D4AF37]/45 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.06] to-[#0A0A0B] p-7 shadow-[0_0_60px_rgba(212,175,55,0.12)] sm:p-12"
      >
        <h2 className="text-[28px] font-bold leading-[1.12] text-white sm:text-[44px]">
          {headline}
        </h2>
        <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[17px]">
          Most owners don't fix this — they grind harder.
          <br className="hidden sm:inline" />{' '}
          Smart ones plug the leak.
        </p>

        <a
          href={strategyHref}
          target="_blank"
          rel="noreferrer"
          onClick={onBookClick}
          className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-6 text-[15px] font-bold uppercase tracking-[0.04em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_18px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_8px_28px_rgba(212,175,55,0.5)] active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#D4AF37] sm:h-16 sm:text-[17px]"
        >
          Book your strategy call — 15 min, free
        </a>

        <ul className="mt-6 space-y-2.5 text-[14px] sm:text-[15px]">
          {[
            'The 3 biggest wins from your audit, explained',
            'A 90-day game plan to fix the leak',
            'Honest answer: should you DIY or hire it out',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mt-1 h-4 w-4 shrink-0 text-[#D4AF37]"
              >
                <polyline points="3 8 7 12 13 4" />
              </svg>
              <span className="text-[#D5D8DD]">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* SECTION 2 — Secondary CTAs for not-ready leads */}
      <section className="mt-10 sm:mt-14">
        <p className="text-center text-[14px] font-medium text-[#8A8F98]">
          Not ready to talk yet?
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3">
          <a
            href={withUtm(GUIDE_URL, 'guide_lead')}
            target="_blank"
            rel="noreferrer"
            onClick={onGuideClick}
            className="text-[14px] font-medium text-[#D4AF37]/75 transition hover:text-[#D4AF37] hover:underline"
          >
            → Get the 5-step fix-it guide
          </a>
          <a
            href={CASE_STUDY_URL}
            onClick={onCaseStudyClick}
            className="text-[14px] font-medium text-[#D4AF37]/75 transition hover:text-[#D4AF37] hover:underline"
          >
            → See the playbook running on Sandbar Soft Wash — live dashboard
          </a>
          {cta.href ? (
            <a
              href={cta.href}
              onClick={() => trackClick('rerun_audit', { score })}
              className="text-[12px] text-[#5A6068] transition hover:text-[#9AA0A6] hover:underline"
            >
              → {cta.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={onRerunClick}
              className="text-[12px] text-[#5A6068] transition hover:text-[#9AA0A6] hover:underline"
            >
              → {cta.label}
            </button>
          )}
        </div>
      </section>

      {/* SECTION 3 — Minimal footer */}
      <div className="mx-auto mt-14 max-w-[640px] pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-20 sm:pb-14">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </footer>
  );
}


// CheckIcon — used by the hero's micro-benefits row. Pricing tier card uses
// an inline SVG for the same reason but with a slightly thinner stroke.
// Stat-card with $/missed-calls toggle. Default shows monthly dollars; toggling
// to "calls" surfaces the visceral count of customers walking past — based on
// the same revenue_leak math the backend already returned (no recompute on FE).
function LeakCard({
  monthlyLeak,
  missedCalls,
  avgJobValue,
  isIncomplete,
}: {
  monthlyLeak: number;
  missedCalls: number;
  avgJobValue: number;
  isIncomplete: boolean;
}) {
  const [mode, setMode] = useState<'dollars' | 'calls'>('dollars');

  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8A8F98]">
          Monthly leak
        </p>
        <div
          role="tablist"
          aria-label="Leak display mode"
          className="inline-flex rounded-full border border-white/[0.08] bg-[#0A0A0B] p-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
        >
          <button
            role="tab"
            aria-selected={mode === 'dollars'}
            type="button"
            onClick={() => {
              setMode('dollars');
              trackClick('leak_toggle', { mode: 'dollars' });
            }}
            className={`flex h-11 min-w-[44px] items-center rounded-full px-3 transition ${
              mode === 'dollars' ? 'bg-[#D4AF37] text-[#0A0A0B]' : 'text-[#8A8F98] hover:text-white'
            }`}
          >
            💰 $
          </button>
          <button
            role="tab"
            aria-selected={mode === 'calls'}
            type="button"
            onClick={() => {
              setMode('calls');
              trackClick('leak_toggle', { mode: 'calls' });
            }}
            className={`flex h-11 min-w-[44px] items-center rounded-full px-3 transition ${
              mode === 'calls' ? 'bg-[#D4AF37] text-[#0A0A0B]' : 'text-[#8A8F98] hover:text-white'
            }`}
          >
            📞 calls
          </button>
        </div>
      </div>

      {mode === 'dollars' ? (
        <>
          <p className="mt-3 bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[48px]">
            ${formatNumber(monthlyLeak)}
          </p>
          <p className="mt-2 text-[13px] text-[#A0A5AE]">
            {isIncomplete ? 'conservative estimate' : '/ month walking out the door'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[48px]">
            ~{formatNumber(missedCalls)}
          </p>
          <p className="mt-2 text-[13px] text-[#A0A5AE]">
            missed calls / month{avgJobValue > 0 ? ` · ~$${formatNumber(avgJobValue)} avg job` : ''}
          </p>
        </>
      )}
    </div>
  );
}

// ── P11 Phase C — Copy-paste deliverables + Lola's Take + Share ──────
//
// Four ready-to-deploy artifacts pre-filled from the audit data:
//   1. Optimized <title> tag
//   2. Optimized GBP service description (~150 words)
//   3. First GBP post draft
//   4. LocalBusiness JSON-LD schema with their actual business info
//
// Plus a signed "Lola's Take" closing block (score-aware messaging) and
// a Share row (copy link + IG tag CTA). Every copy fires a PostHog event
// so we can measure which deliverable contractors actually use.

function _titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateTitleTag(audit: AuditResult): string {
  const service = _titleCase(audit.business_type || 'Local Service');
  return `${service} in ${audit.city || 'Florida'} | ${audit.business_name || 'Your Business'}`.slice(0, 60);
}

function generateGbpDescription(audit: AuditResult): string {
  const service = audit.business_type || 'local services';
  const city = (audit.city || 'Florida').split(',')[0] || 'Florida';
  const name = audit.business_name || 'We';
  return (
    `${name} delivers ${service} across ${city} and surrounding Florida service areas. ` +
    `Family-aware values, transparent pricing, and the same crew you trust every visit — ` +
    `not a rotating call-center. Free quotes by phone or text. Fully insured. ` +
    `Most jobs scheduled within the same week. ` +
    `Why ${city.split(' ')[0]} homeowners choose us: real local presence, honest ` +
    `recommendations (we'll tell you when you don't need the service), and follow-through ` +
    `after the job is done. Looking for ${service} near ${city}? Call us — we answer our own phones.`
  ).slice(0, 750);
}

function generateGbpPost(audit: AuditResult): string {
  const service = _titleCase(audit.business_type || 'Service');
  const city = (audit.city || 'Florida').split(',')[0];
  return (
    `Need ${service.toLowerCase()} in ${city}?\n\n` +
    `We're booking new ${service.toLowerCase()} jobs across ${city} and nearby Florida service areas this month.\n\n` +
    `What you get:\n` +
    `• Free quote in under 24 hours\n` +
    `• Fully insured local crew (no out-of-state subs)\n` +
    `• Honest assessment — if you don't need the service, we'll tell you\n\n` +
    `Tap "Call" or message us. We answer our own phones.\n\n` +
    `#${city.replace(/\s+/g, '')}Florida #${service.replace(/\s+/g, '')} #LocalFlorida`
  );
}

function generateSchemaFallback(audit: AuditResult): string {
  // Pull verified business_info fields when available — they're populated by
  // the backend's Google Places lookup during the audit. Only emit keys with
  // non-empty values to avoid Rich Results warnings for empty required-ish
  // fields (image, telephone).
  const bi: Record<string, unknown> =
    (audit.business_info as Record<string, unknown>) || {};
  const phone = typeof bi.phone === 'string' ? bi.phone : '';
  const image = typeof bi.logo === 'string' ? bi.logo : '';
  const city = (audit.city || '').split(',')[0] || 'Florida';

  const blob: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: audit.business_name || 'Your Business',
    description: `${audit.business_type || 'Local services'} in ${audit.city || 'Florida'}.`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: 'FL',
      addressCountry: 'US',
    },
    areaServed: { '@type': 'City', name: city },
    priceRange: '$$',
  };
  if (audit.website) blob.url = audit.website;
  if (phone) blob.telephone = phone;
  if (image) blob.image = image;

  return `<script type="application/ld+json">\n${JSON.stringify(blob, null, 2)}\n</script>`;
}

function getSuggestedSchema(audit: AuditResult): string {
  const suggestions = audit.page_seo?.suggested_schemas || [];
  const localBusiness = suggestions.find((schema) => schema.type === 'LocalBusiness');
  const firstUsable = localBusiness || suggestions[0];
  return firstUsable?.html_block || generateSchemaFallback(audit);
}

function CopyCard({
  eyebrow,
  title,
  hint,
  body,
  trackProp,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  body: string;
  trackProp: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    try {
      navigator.clipboard.writeText(body);
      setCopied(true);
      trackClick('audit_deliverable_copied', { deliverable_type: trackProp });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* graceful no-op */
    }
  };
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{eyebrow}</p>
      <h4 className="mt-2 text-[16px] font-bold text-white sm:text-[17px]">{title}</h4>
      <p className="mt-1.5 text-[12px] leading-[1.55] text-[#8A8F98]">{hint}</p>
      <pre className="mt-4 max-h-[180px] overflow-auto whitespace-pre-wrap rounded-[10px] border border-white/[0.06] bg-[#0A0A0B] p-4 font-mono text-[12px] leading-[1.6] text-[#E8E4D8]">
        {body}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 flex h-11 min-w-[140px] items-center justify-center rounded-[10px] bg-[#D4AF37]/[0.10] px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.18]"
      >
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
    </div>
  );
}

function DeliverablesBlock({ audit }: { audit: AuditResult }) {
  const score = audit.total_score;
  const monthlyLeak = audit.revenue_leak?.monthly_leak || 0;
  const businessFirst = (audit.business_name || 'your business').split(' ')[0];

  const titleTag = useMemo(() => generateTitleTag(audit), [audit]);
  const gbpDescription = useMemo(() => generateGbpDescription(audit), [audit]);
  const gbpPost = useMemo(() => generateGbpPost(audit), [audit]);
  const schema = useMemo(() => getSuggestedSchema(audit), [audit]);

  // Score-aware messaging for "Lola's Take" closing
  let assessment: string;
  let topFix: string;
  let movementHint: string;
  if (score >= 80) {
    assessment = 'solid — top tier among Florida operators';
    topFix = 'Tighten title tag + add 2 GBP posts this week';
    movementHint = '2–4 spots';
  } else if (score >= 65) {
    assessment = 'decent — but a few high-impact gaps are bleeding revenue';
    topFix = 'Fix the GBP description + add LocalBusiness schema today';
    movementHint = '4–6 spots';
  } else {
    assessment = 'rough — the foundation needs work, but the gap is your opportunity';
    topFix = 'Deploy all 4 copy-paste artifacts below this week';
    movementHint = '6–8 spots';
  }

  // Build share URL only if we have a valid audit_id — otherwise the link
  // would resolve to /r/undefined and trigger the SharedReport 404 path.
  const hasShareableId = !!(audit.audit_id && audit.audit_id.length > 8);
  const shareUrl = hasShareableId && typeof window !== 'undefined' && window.location
    ? `${window.location.origin}/r/${audit.audit_id}?utm_source=share&utm_campaign=audit-${score}`
    : '';
  const [shareCopied, setShareCopied] = useState(false);
  const onShareCopy = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      trackClick('audit_shared', { channel: 'copy_link' });
      setTimeout(() => setShareCopied(false), 2200);
    } catch {
      /* no-op */
    }
  };

  return (
    <>
      <section className="mt-5 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A1408] via-[#0F0F12] to-[#0A0A0B] p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          4 ready-to-deploy fixes
        </p>
        <h3 className="mt-3 text-[22px] font-bold leading-tight text-white sm:text-[26px]">
          Paste these in. Move up the rankings.
        </h3>
        <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
          Every line below is generated from {audit.business_name}'s actual audit data. Tap copy,
          paste it where it belongs (page title, GBP description, GBP post, site &lt;head&gt;).
          Most owners can ship all four in under 30 minutes.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CopyCard
            eyebrow="1 · Title tag"
            title="Optimized <title> for this page"
            hint="Paste into Wix → Page Settings → SEO → Title (or your CMS equivalent)."
            body={titleTag}
            trackProp="title_tag"
          />
          <CopyCard
            eyebrow="2 · GBP description"
            title="Optimized Google Business Profile description"
            hint="Paste into Google Business Profile → Edit profile → Business description."
            body={gbpDescription}
            trackProp="gbp_description"
          />
          <CopyCard
            eyebrow="3 · GBP post draft"
            title="Your first GBP post (publish today)"
            hint="Paste into GBP → Add update → Post. Repeat weekly with seasonal variations."
            body={gbpPost}
            trackProp="gbp_post"
          />
          <CopyCard
            eyebrow="4 · LocalBusiness schema"
            title="Pre-filled structured data"
            hint="Paste into the <head> of your site — Wix → Advanced SEO → Structured Data."
            body={schema}
            trackProp="schema"
          />
        </div>
      </section>

      {/* Lola's Take — signed closing block */}
      <section className="mt-5 rounded-3xl border-2 border-[#D4AF37]/45 bg-gradient-to-br from-[#D4AF37]/[0.08] via-[#F4B942]/[0.04] to-[#0A0A0B] p-6 shadow-[0_0_44px_rgba(212,175,55,0.10)] sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          🦴 Lola's quick take on {audit.business_name}
        </p>
        <div className="mt-4 space-y-3 text-[15px] leading-[1.65] text-white sm:text-[16px]">
          <p>
            Your foundation is <strong className="text-[#D4AF37]">{assessment}</strong>. (Score:{' '}
            <strong>{score}/100 — {audit.grade}</strong>)
          </p>
          <p>
            <strong className="text-white">Fastest win:</strong> {topFix}. That alone could move
            you <strong className="text-[#D4AF37]">{movementHint}</strong> in 30 days.
          </p>
          {monthlyLeak > 0 && (
            <p>
              <strong className="text-white">Biggest leak:</strong> The gap between where{' '}
              {businessFirst} ranks today and where it could rank. That's about{' '}
              <strong className="text-[#D4AF37]">${formatNumber(monthlyLeak)}/mo</strong> on the
              table.
            </p>
          )}
          <p className="pt-1 font-semibold text-white">
            Want me to do this for you instead?
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/pricing"
            onClick={() => trackClick('roadmap_cta_clicked', { from: 'lolas_take' })}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B]"
          >
            See pricing →
          </a>
          <a
            href="/apply"
            onClick={() => trackClick('roadmap_apply_clicked', { from: 'lolas_take' })}
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#D4AF37]/40 bg-white/[0.02] px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37]"
          >
            Apply (Coach Ty reviews every one)
          </a>
        </div>
        <p className="mt-5 text-[13px] text-[#D4AF37]">
          — Coach Ty
          <span className="ml-2 text-[12px] text-[#8A8F98]">
            Founder, Ty Alexander Media · Tampa Bay, FL · @tyalexandermedia
          </span>
        </p>
      </section>

      {/* Share row — only rendered when we have a real audit_id to link to */}
      {hasShareableId && (
      <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          📸 Share your audit score
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onShareCopy}
            className="flex h-11 min-w-[160px] items-center justify-center rounded-[10px] bg-white/[0.05] px-4 text-[12px] font-semibold text-[#C5C5C8] transition hover:bg-white/[0.10]"
          >
            {shareCopied ? '✓ Link copied' : 'Copy share link'}
          </button>
          <a
            href="https://www.instagram.com/tyalexandermedia"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick('audit_shared', { channel: 'instagram' })}
            className="flex h-11 min-w-[160px] items-center justify-center rounded-[10px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 text-[12px] font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.12]"
          >
            Tag @tyalexandermedia on IG
          </a>
        </div>
      </section>
      )}
    </>
  );
}

// ── AI ENHANCEMENT LAYER ─────────────────────────────────────────────
//
// Lazily fetches the Claude-generated opportunity report from
// GET /audits/<id>/enhancement. Backend auto-fires generation when an
// audit completes, so by the time the user opens this report it's
// usually cached. POSTs to /audits/<id>/enhance if it's still pending
// (rare race), gracefully degrades if Anthropic key isn't configured.

type EnhancementFinding = {
  finding?: string;
  whats_broken?: string;
  why_it_matters?: string;
  how_to_fix?: string[];
  time_to_implement?: string;
  expected_result?: string;
};

type EnhancementQuickWin = {
  title?: string;
  action?: string;
  time?: string;
};

type EnhancementPayload = {
  title?: string;
  executive_summary?: string;
  revenue_leak?: {
    monthly_dollars?: number;
    annual_dollars?: number;
    missed_calls_per_month?: number;
    explanation?: string;
  };
  service_specific_findings?: EnhancementFinding[];
  quick_wins?: EnhancementQuickWin[];
  roadmap?: {
    weeks_1_4?: string[];
    weeks_5_8?: string[];
    weeks_9_12?: string[];
  };
  ctas?: {
    diy_label?: string;
    diy_url?: string;
    dfy_label?: string;
    dfy_url?: string;
  };
};

function EnhancementBlock({ audit }: { audit: AuditResult }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'pending' | 'error'>('loading');
  const [payload, setPayload] = useState<EnhancementPayload | null>(null);

  useEffect(() => {
    if (!audit.audit_id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch(`${API_URL}/audits/${encodeURIComponent(audit.audit_id)}/enhancement`);
        if (!resp.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await resp.json();
        if (cancelled) return;
        if (data.status === 'ready' && data.payload) {
          setPayload(data.payload as EnhancementPayload);
          setStatus('ready');
        } else if (data.status === 'pending') {
          // Trigger generation, wait for result
          setStatus('pending');
          const trig = await fetch(
            `${API_URL}/audits/${encodeURIComponent(audit.audit_id)}/enhance`,
            { method: 'POST' },
          );
          if (cancelled) return;
          const tdata = await trig.json();
          if (tdata.status === 'ready' && tdata.payload) {
            setPayload(tdata.payload as EnhancementPayload);
            setStatus('ready');
          } else {
            setStatus('error');
          }
        } else {
          setStatus('error');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [audit.audit_id]);

  // If the API key isn't configured (or any error), don't render an
  // empty section — fail silently so the existing report sections stay clean.
  if (status === 'error') return null;

  if (status === 'loading' || status === 'pending') {
    return (
      <section className="mt-5 rounded-3xl border border-[#D4AF37]/20 bg-white/[0.02] p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          🦴 Lola's enhanced opportunity report
        </p>
        <p className="mt-3 text-[14px] text-[#8A8F98]">
          {status === 'pending' ? 'Generating your business-specific report…' : 'Loading deeper analysis…'}
        </p>
      </section>
    );
  }

  if (!payload) return null;

  return (
    <section className="mt-5 rounded-3xl border-2 border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-[#0F0F12] to-[#0A0A0B] p-6 shadow-[0_0_44px_rgba(212,175,55,0.10)] sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
        🦴 Lola's enhanced opportunity report
      </p>
      <h2 className="mt-3 text-[24px] font-bold leading-tight text-white sm:text-[30px]">
        {payload.title || `${audit.business_name} — Local SEO Opportunity Report`}
      </h2>

      {payload.executive_summary && (
        <p className="mt-4 text-[14px] leading-[1.65] text-[#C5C5C8] sm:text-[15px]">
          {payload.executive_summary}
        </p>
      )}

      {/* Revenue leak headline */}
      {payload.revenue_leak && typeof payload.revenue_leak.monthly_dollars === 'number' && (
        <div className="mt-6 rounded-2xl border border-[#D4AF37]/30 bg-[#0A0A0B] p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            Revenue leak — Lola's deeper read
          </p>
          <p className="mt-3">
            <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[36px] font-extrabold leading-none text-transparent sm:text-[44px]">
              ${formatNumber(payload.revenue_leak.monthly_dollars)}
            </span>
            <span className="ml-2 text-[14px] text-[#A0A5AE]">/month</span>
          </p>
          {payload.revenue_leak.annual_dollars ? (
            <p className="mt-1 text-[13px] text-[#A0A5AE]">
              ${formatNumber(payload.revenue_leak.annual_dollars)}/year at stake
            </p>
          ) : null}
          {payload.revenue_leak.explanation && (
            <p className="mt-3 text-[13px] leading-[1.6] text-[#C5C5C8] sm:text-[14px]">
              {payload.revenue_leak.explanation}
            </p>
          )}
        </div>
      )}

      {/* Service-specific findings */}
      {Array.isArray(payload.service_specific_findings) &&
        payload.service_specific_findings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[16px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
              Service-specific findings ({audit.business_type})
            </h3>
            <div className="mt-3 flex flex-col gap-3">
              {payload.service_specific_findings.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5"
                >
                  {f.finding && (
                    <p className="text-[14px] font-bold text-white sm:text-[15px]">{f.finding}</p>
                  )}
                  {f.whats_broken && (
                    <p className="mt-2 text-[13px] leading-[1.55] text-[#C5C5C8]">
                      <span className="font-semibold text-[#E5A95B]">Broken:</span> {f.whats_broken}
                    </p>
                  )}
                  {f.why_it_matters && (
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-[#C5C5C8]">
                      <span className="font-semibold text-[#4CAF80]">Why:</span> {f.why_it_matters}
                    </p>
                  )}
                  {Array.isArray(f.how_to_fix) && f.how_to_fix.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc text-[13px] leading-[1.55] text-[#C5C5C8]">
                      {f.how_to_fix.map((step, j) => (
                        <li key={j}>{step}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#8A8F98]">
                    {f.time_to_implement && (
                      <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5">
                        ⏱ {f.time_to_implement}
                      </span>
                    )}
                    {f.expected_result && (
                      <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-2 py-0.5 text-[#D4AF37]">
                        → {f.expected_result}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Quick wins */}
      {Array.isArray(payload.quick_wins) && payload.quick_wins.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[16px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
            Quick wins (under 24 hours each)
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {payload.quick_wins.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[11px] font-bold text-[#D4AF37]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  {q.title && (
                    <p className="text-[14px] font-semibold text-white sm:text-[15px]">{q.title}</p>
                  )}
                  {q.action && (
                    <p className="mt-1 text-[13px] leading-[1.55] text-[#C5C5C8]">{q.action}</p>
                  )}
                  {q.time && (
                    <p className="mt-1.5 text-[11px] text-[#8A8F98]">⏱ {q.time}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 90-Day roadmap */}
      {payload.roadmap && (
        <div className="mt-6">
          <h3 className="text-[16px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
            Your 90-day roadmap
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Weeks 1–4', items: payload.roadmap.weeks_1_4 || [] },
              { label: 'Weeks 5–8', items: payload.roadmap.weeks_5_8 || [] },
              { label: 'Weeks 9–12', items: payload.roadmap.weeks_9_12 || [] },
            ].map((col) => (
              <div
                key={col.label}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  {col.label}
                </p>
                <ul className="mt-2 ml-4 list-disc text-[12px] leading-[1.5] text-[#C5C5C8]">
                  {col.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two CTAs */}
      {payload.ctas && (
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {payload.ctas.diy_url && (
            <a
              href={payload.ctas.diy_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('enhancement_diy_cta', { from: 'enhancement_block' })}
              className="inline-flex flex-1 items-center justify-center rounded-[12px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-5 py-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[#D4AF37] transition hover:bg-[#D4AF37]/[0.12]"
            >
              {payload.ctas.diy_label || 'Book a 15-min strategy call'}
            </a>
          )}
          {payload.ctas.dfy_url && (
            <a
              href={payload.ctas.dfy_url}
              onClick={() => trackClick('enhancement_dfy_cta', { from: 'enhancement_block' })}
              className="inline-flex flex-1 items-center justify-center rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-5 py-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] transition hover:scale-[1.02]"
            >
              {payload.ctas.dfy_label || 'Start my build — $997'}
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${muted ? 'text-[#D4AF37]/60' : 'text-[#D4AF37]'}`}
    >
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function RecommendationCard({
  rec,
  order,
  primary,
}: {
  rec: Recommendation;
  order: number;
  primary: boolean;
}) {
  const impactStyle =
    rec.impact === 'critical'
      ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
      : rec.impact === 'high'
      ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
      : rec.impact === 'medium'
      ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
      : 'bg-slate-500/15 text-slate-300 ring-slate-500/30';

  return (
    <li
      className={`rounded-2xl border p-4 transition ${
        primary
          ? 'border-gold-400/50 bg-gold-500/[0.07]'
          : 'border-slate-800 bg-slate-950/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${
            primary
              ? 'bg-gold-500/20 text-gold-200 ring-gold-400/40'
              : 'bg-slate-800 text-slate-300 ring-slate-700'
          }`}
        >
          {order}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{rec.title}</h3>
            {primary && (
              <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-200">
                Start here
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">{rec.detail}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
            <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ring-1 ${impactStyle}`}>
              {rec.impact} impact
            </span>
            <span className="inline-flex rounded-full bg-slate-800/80 px-2 py-0.5 font-medium text-slate-300 ring-1 ring-slate-700">
              {rec.effort} effort
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">{children}</div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="ml-3 truncate text-right font-medium text-slate-100">{value}</span>
    </div>
  );
}
