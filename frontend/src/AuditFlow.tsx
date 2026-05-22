/// <reference types="vite/client" />
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuditResult,
  BusinessAuditRequest,
  PricingResponse,
  Recommendation,
} from './types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const SERVICE_OPTIONS = [
  { value: 'soft wash', label: 'Pressure washing / Soft wash' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'pest', label: 'Pest control' },
  { value: 'landscaping', label: 'Landscaping' },
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
    lola: 'Pick the closest match. We only audit home services.',
    options: SERVICE_OPTIONS,
  },
  {
    key: 'city',
    prompt: 'Where are the trucks rolling?',
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
    const value = form[currentQuestion.key];
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
        value={form[currentQuestion.key]}
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
    <main className="flex flex-1 flex-col pt-12 sm:pt-16">
      <ProgressBar total={totalSteps} current={stepIndex} />

      <div key={question.key} className="animate-slide-up mt-8">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#FFD166]"
          aria-live="polite"
        >
          Step {stepIndex + 1} of {totalSteps}
        </p>

        <h1 className="mt-4 text-[32px] font-bold leading-[1.15] text-white lg:text-[44px]">
          {question.prompt}
        </h1>

        <p className="mt-4 text-[17px] leading-[1.6] text-[#9AA0A6]">{question.lola}</p>

        <div className="mt-10">
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
      </div>

      {/* Mobile: Next first (top), Back below — via flex-col-reverse.
          Desktop: Back left, Next right via sm:flex-row + justify-between. */}
      <div className="mt-16 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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

  return (
    <main className="flex flex-1 flex-col">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-gold-300">Audit complete</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{audit.business_name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {audit.city} · {audit.business_type}
        </p>
        <p className="mt-5 text-base leading-7 text-slate-200">{audit.lola_message}</p>
        {shareUrl && (
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="truncate text-xs text-slate-400">{shareUrl}</span>
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              {copied ? 'Copied ✓' : 'Copy share link'}
            </button>
          </div>
        )}
      </section>

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

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Score</p>
          <p className={`mt-3 text-5xl font-semibold ${scoreTone}`}>
            {audit.total_score < 0 ? '—' : audit.total_score}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {audit.grade} — {audit.grade_label}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monthly leak</p>
          <p className="mt-3 text-4xl font-semibold text-white">
            ${formatNumber(audit.revenue_leak.monthly_leak)}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {audit.segment === 'incomplete' ? 'conservative estimate' : '/ month opportunity'}
          </p>
        </Card>
      </section>

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

      <UpsellCta
        businessName={audit.business_name}
        incomplete={audit.segment === 'incomplete'}
      />

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

      <ResultsFooter cta={cta} />
    </main>
  );
}

function ResultsFooter({ cta }: { cta: ResultsCta }) {
  const ctaContent = (
    <>
      <span aria-hidden className="mr-1.5">←</span>
      {cta.label}
    </>
  );

  return (
    <footer className="animate-fade-in">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 px-5 pb-[40px] pt-[60px] text-center lg:pb-[60px] lg:pt-[120px]">
        {/* Row 1 — Subtle secondary action */}
        {cta.href ? (
          <a
            href={cta.href}
            className="text-[15px] font-medium text-[#D4AF37]/70 transition hover:text-[#D4AF37] hover:underline"
          >
            {ctaContent}
          </a>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="text-[15px] font-medium text-[#D4AF37]/70 transition hover:text-[#D4AF37] hover:underline"
          >
            {ctaContent}
          </button>
        )}

        {/* Hairline gold divider */}
        <span aria-hidden className="h-px w-[60px] bg-[#D4AF37]/30" />

        {/* Row 2 — Brand block */}
        <div className="space-y-2">
          <p className="text-[18px] font-semibold text-white">Ty Alexander Media</p>
          <p className="text-[14px] text-[#8A8F98]">
            Tampa Bay · Palm Harbor · St. Petersburg
          </p>
        </div>

        {/* Row 3 — Inline action links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[14px]">
          <a
            href="https://tyalexandermedia.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#D4AF37]/60 transition hover:text-[#D4AF37]"
          >
            tyalexandermedia.com
          </a>
          <span aria-hidden className="text-[#5A5F68]">·</span>
          <a
            href="https://tyalexandermedia.com/book"
            target="_blank"
            rel="noreferrer"
            className="text-[#D4AF37]/60 transition hover:text-[#D4AF37]"
          >
            Book a Call
          </a>
          <span aria-hidden className="text-[#5A5F68]">·</span>
          <a
            href="https://g.page/tyalexandermedia/review"
            target="_blank"
            rel="noreferrer"
            className="text-[#D4AF37]/60 transition hover:text-[#D4AF37]"
          >
            Leave a review
          </a>
        </nav>

        {/* Row 4 — Legal microcopy */}
        <p className="text-[12px] text-[#5A5F68]">
          © 2026 Ty Alexander Media · Built with Lola 🐾
        </p>
      </div>
    </footer>
  );
}

// CTA destinations. All three are placeholders — wire each to the real Stripe
// checkout (or Calendly intent URL) when those exist. The current backend
// doesn't run any Stripe code; these are just where the buttons point.
const PLAYBOOK_URL = 'https://tyalexandermedia.com/playbook';
const BOOK_LOLA_URL = 'https://tyalexandermedia.com/book';
const PRO_URL = 'https://tyalexandermedia.com/pro';

type BillingPeriod = 'monthly' | 'annual';

// Annual = 10 monthly payments (2 months free). Industry standard SaaS
// discount. Display as monthly-equivalent so the gut-check stays small.
function annualMonthly(monthly: number) {
  return Math.round((monthly * 10) / 12);
}

function UpsellCta({ businessName: _bn, incomplete: _inc }: { businessName: string; incomplete: boolean }) {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [pastPricing, setPastPricing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/pricing`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setPricing(data);
      })
      .catch(() => {
        /* silent — defaults are used if the call fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mobile sticky CTA: show only after the user scrolls past the pricing
  // section (so we don't compete with the cards themselves). Sentinel sits at
  // the END of the section.
  useEffect(() => {
    const sentinel = sectionRef.current?.querySelector('[data-pricing-sentinel]');
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Past the section = sentinel is above the viewport (bottom < 0).
        const above = entry.boundingClientRect.bottom < 0;
        setPastPricing(!entry.isIntersecting && above);
      },
      { threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const foundingActive = pricing?.founding_active ?? true;
  const slotsRemaining = pricing?.founding_slots_remaining ?? 10;
  const standardMonthly = pricing?.tiers.standard.monthly ?? 497;
  const standardOriginalMonthly = pricing?.tiers.standard.monthly_original ?? 697;
  const proMonthly = pricing?.tiers.pro.monthly ?? 997;
  const proOriginalMonthly = pricing?.tiers.pro.monthly_original ?? 1297;
  const diyPrice = pricing?.tiers.diy.one_time ?? 197;

  // Compute displayed prices based on billing toggle. DIY is one-time, so the
  // toggle is a no-op for it.
  const showAnnual = billing === 'annual';
  const standardPrice = showAnnual ? annualMonthly(standardMonthly) : standardMonthly;
  const standardOriginal = showAnnual ? annualMonthly(standardOriginalMonthly) : standardOriginalMonthly;
  const proPrice = showAnnual ? annualMonthly(proMonthly) : proMonthly;
  const proOriginal = showAnnual ? annualMonthly(proOriginalMonthly) : proOriginalMonthly;
  const periodSuffix = showAnnual ? '/mo annually' : '/mo';

  return (
    <section ref={sectionRef} className="mt-16">
      {/* Section header */}
      <div className="text-center">
        <h2 className="text-[36px] font-bold leading-[1.1] text-white sm:text-[42px] lg:text-[48px]">
          Pick Your Path
        </h2>
        <p className="mt-6 text-[16px] font-normal text-[#9AA0A6] sm:text-[18px]">
          Same playbook. Different driver.
        </p>

        {/* Annual / Monthly toggle */}
        <BillingToggle value={billing} onChange={setBilling} />
      </div>

      {/* Three tiers. DOM order: Pro, Standard, DIY (desktop left-to-right).
          On mobile, CSS order swaps Standard to first.
          `minmax(0,1fr)` is critical — without the 0 minimum, grid items
          can force content overflow (which is what caused the price clipping
          in the first place). */}
      <div className="mt-12 grid grid-cols-1 gap-5 sm:gap-6 lg:mt-[60px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,1fr)] lg:items-stretch xl:gap-7">
        <TierCard
          variant="pro"
          headerLabel="For multi-city"
          price={`$${proPrice}`}
          period={periodSuffix}
          originalPrice={`$${proOriginal}/mo`}
          foundingTag="Founding member"
          foundingTagShort="Founding member"
          description="Multi-city domination. Priority support."
          bullets={[
            { text: 'Everything in Standard' },
            { text: '5 service area pages', tooltip: 'Dedicated SEO-optimized pages for up to 5 cities you serve.' },
            { text: 'Citations + directories', tooltip: 'Local citations and directory submissions across 50+ platforms.' },
            { text: 'Competitor tracking' },
            { text: 'Weekly check-ins' },
            { text: 'Priority text support' },
            { text: 'Custom content calendar' },
          ]}
          ctaLabel="Go Pro"
          ctaHref={PRO_URL}
          ctaSubtext="60-day minimum · For 3+ city operations"
          mobileOrder={2}
          desktopOrder={1}
        />

        <TierCard
          variant="standard"
          recommended
          headerLabel="Most contractors"
          price={`$${standardPrice}`}
          period={periodSuffix}
          originalPrice={`$${standardOriginal}/mo`}
          foundingTag={foundingActive ? `${slotsRemaining} spots left` : 'Standard pricing'}
          foundingTagShort={foundingActive ? `${slotsRemaining} spots left` : 'Standard pricing'}
          description="We run the playbook. You run your business."
          bullets={[
            { text: 'GBP optimization + posts' },
            { text: 'Review generation system' },
            { text: 'Monthly Report Card' },
            { text: 'Bi-weekly check-ins' },
            { text: 'Keyword guarantee', tooltip: "If we don't move at least 3 keywords in 60 days, the next month is on us." },
            { text: 'Custom action plan', tooltip: 'Personalized SEO roadmap built from your audit results.' },
          ]}
          ctaLabel="Start with Lola"
          ctaHref={BOOK_LOLA_URL}
          ctaSubtext="60-day minimum · Stripe secure · Cancel anytime after"
          mobileOrder={1}
          desktopOrder={2}
        />

        <TierCard
          variant="diy"
          headerLabel="Start small"
          price={`$${diyPrice}`}
          period="one-time"
          description="Full playbook + videos. You run it."
          bullets={[
            { text: 'Custom action plan' },
            { text: 'Video walkthroughs' },
            { text: '30-day email support' },
            { text: 'Instant access · Lifetime' },
          ]}
          ctaLabel="Get the Playbook"
          ctaHref={PLAYBOOK_URL}
          ctaSubtext="Instant download · One-time payment"
          mobileOrder={3}
          desktopOrder={3}
        />
      </div>

      {/* Trust signals row */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[#8A8F98]">
        <span>🔒 Stripe secure</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span>✓ No setup fee</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span>✓ Cancel anytime after 60 days</span>
        <span aria-hidden className="text-[#3A3F48]">·</span>
        <span>✓ Money-back keyword guarantee</span>
      </div>

      {/* Single testimonial */}
      <p className="mx-auto mt-14 max-w-[480px] text-center text-[15px] italic text-[#9AA0A6]">
        "Sandbar Soft Wash: 5 keywords ranked in 3 weeks on the Standard plan."
      </p>

      {/* Sentinel for the mobile sticky CTA's IntersectionObserver. Doesn't
          render anything visible; just a 1px element at the end of the
          pricing region so we know when the user has scrolled past it. */}
      <div data-pricing-sentinel aria-hidden className="h-px w-full" />

      <MobileStickyCta
        visible={pastPricing}
        priceLabel={`$${standardPrice}${showAnnual ? '/mo annually' : '/mo'}`}
      />
    </section>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="mt-7 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1"
    >
      <ToggleButton selected={value === 'monthly'} onClick={() => onChange('monthly')}>
        Monthly
      </ToggleButton>
      <ToggleButton selected={value === 'annual'} onClick={() => onChange('annual')}>
        Annual{' '}
        <span className={`ml-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${value === 'annual' ? 'text-[#0A0A0B]/70' : 'text-[#D4AF37]'}`}>
          save 16%
        </span>
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition-all duration-200 ${
        selected
          ? 'bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
          : 'text-[#9AA0A6] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function MobileStickyCta({
  visible,
  priceLabel,
}: {
  visible: boolean;
  priceLabel: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  // Reset dismissal if the section comes back into view (e.g. user scrolls up).
  useEffect(() => {
    if (!visible) setDismissed(false);
  }, [visible]);

  const show = visible && !dismissed;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out lg:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <div className="mx-auto max-w-[640px] px-3 pb-3 pt-2">
        <div className="flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-[#0A0A0B]/95 p-2 shadow-[0_-8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <a
            href={BOOK_LOLA_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] text-[14px] font-bold text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            <span>Start with Lola — {priceLabel}</span>
            <span aria-hidden>→</span>
          </a>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl text-[20px] leading-none text-[#8A8F98] transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

type TierVariant = 'pro' | 'standard' | 'diy';

type Bullet = { text: string; tooltip?: string };

function TierCard({
  variant,
  recommended = false,
  headerLabel,
  price,
  period,
  originalPrice,
  foundingTag,
  foundingTagShort,
  description,
  bullets,
  ctaLabel,
  ctaHref,
  ctaSubtext,
  mobileOrder,
  desktopOrder,
}: {
  variant: TierVariant;
  recommended?: boolean;
  headerLabel: string;
  price: string;
  period: string;
  originalPrice?: string;
  foundingTag?: string;
  foundingTagShort?: string;
  description: string;
  bullets: Bullet[];
  ctaLabel: string;
  ctaHref: string;
  ctaSubtext: string;
  mobileOrder: 1 | 2 | 3;
  desktopOrder: 1 | 2 | 3;
}) {
  // `min-w-0` on the card and `max-w-full` keep grid children from forcing
  // overflow. Asymmetric padding gives bullets ~40-50px more horizontal room
  // without sacrificing vertical breathing.
  const cardBase =
    'group relative flex w-full min-w-0 max-w-full flex-col rounded-[20px] px-5 py-7 transition-all duration-300 ease-out sm:px-6 sm:py-9';
  // Standard card visual treatment:
  //  - mobile: 3px gold border, no scale (scale would push off-screen)
  //  - desktop: 2px border + scale-1.05 + INSET gold glow (no outer shadow that
  //    leaks into the gap between cards as a "thin gold line").
  // Pro/DIY: subtle white borders, hover lift.
  const cardByVariant =
    variant === 'standard'
      ? 'bg-[#0F0F12] border-[3px] border-[#D4AF37] shadow-[inset_0_0_40px_rgba(212,175,55,0.06)] hover:shadow-[inset_0_0_56px_rgba(212,175,55,0.1)] lg:border-2 lg:scale-[1.05]'
      : variant === 'pro'
      ? 'bg-[#0F0F12] border border-white/[0.08] hover:border-white/[0.18] hover:-translate-y-1'
      : 'bg-[#0D0D10] border border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1';
  const ORDER_CLASSES: Record<string, string> = {
    '1-1': 'order-1 lg:order-1',
    '1-2': 'order-1 lg:order-2',
    '1-3': 'order-1 lg:order-3',
    '2-1': 'order-2 lg:order-1',
    '2-2': 'order-2 lg:order-2',
    '2-3': 'order-2 lg:order-3',
    '3-1': 'order-3 lg:order-1',
    '3-2': 'order-3 lg:order-2',
    '3-3': 'order-3 lg:order-3',
  };
  const order = ORDER_CLASSES[`${mobileOrder}-${desktopOrder}`] || '';

  // CTA visual hierarchy:
  //   Standard = primary (biggest, animated triple-stop gradient + layered shadows)
  //   Pro      = secondary (slightly smaller, solid top-to-bottom gradient)
  //   DIY      = tertiary (outlined, no fill)
  const ctaClass =
    variant === 'standard'
      ? [
          'h-[60px] sm:h-16 rounded-[14px] px-6 text-[18px] sm:text-[17px] font-bold tracking-[-0.01em] text-[#0A0A0B]',
          'bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(212,175,55,0.25),0_0_0_1px_rgba(212,175,55,0.1)]',
          'transition-all duration-[400ms] ease-out',
          'hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_6px_24px_rgba(212,175,55,0.4),0_0_0_1px_rgba(212,175,55,0.2)]',
          'active:scale-[0.98]',
        ].join(' ')
      : variant === 'pro'
      ? [
          'h-[52px] sm:h-14 rounded-xl px-5 text-[17px] sm:text-[16px] font-bold tracking-[-0.01em] text-[#0A0A0B]',
          'bg-gradient-to-b from-[#D4AF37] to-[#B8941F]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_3px_12px_rgba(212,175,55,0.2)]',
          'transition-all duration-200 ease-out',
          'hover:from-[#E8C547] hover:to-[#C9A22A] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_5px_18px_rgba(212,175,55,0.3)]',
          'active:scale-[0.98]',
        ].join(' ')
      : [
          'h-[52px] sm:h-14 rounded-xl px-5 text-[17px] sm:text-[16px] font-semibold tracking-[-0.01em] text-[#D4AF37]',
          'bg-transparent border-[1.5px] border-[#D4AF37]',
          'transition-all duration-200 ease-out',
          'hover:bg-[#D4AF37]/[0.08] hover:border-[#F4D47C] hover:text-[#F4D47C]',
          'active:scale-[0.98]',
        ].join(' ');

  const ctaAriaLabel =
    variant === 'standard'
      ? `${ctaLabel} — ${price} ${period}`
      : variant === 'pro'
      ? `${ctaLabel} — ${price} ${period}`
      : `${ctaLabel} — ${price} ${period}`;

  return (
    <div className={`${cardBase} ${cardByVariant} ${order}`}>
      {recommended && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A0A0B] shadow-[0_4px_12px_rgba(212,175,55,0.3)]">
          Most Popular
        </span>
      )}

      {/* Header label — line-height 1.3, min-h reserves space so cards still
          align even when labels wrap differently. */}
      <p className="mt-2 min-h-[28px] max-w-full text-[11px] font-bold uppercase leading-[1.3] tracking-[0.15em] text-[#D4AF37]/85">
        {headerLabel}
      </p>

      {/* Strikethrough above price */}
      {originalPrice && (
        <p className="mt-7 text-[13px] text-[#6A6F78]/70">
          <span className="line-through decoration-[#D4AF37]/40 decoration-[1px]">{originalPrice}</span>
        </p>
      )}

      {/* Main price — baseline-aligned, TRULY fluid sizing via clamp().
          NO `overflow-hidden` here — clipping was hiding trailing digits
          ($99[7] / $49[7] / $19[7]). Instead, clamp scales the price down
          so it always fits inside the card content area. */}
      <div
        className={`${
          originalPrice ? 'mt-1' : 'mt-7'
        } flex w-full min-w-0 items-baseline gap-x-1.5`}
      >
        <span
          className={`whitespace-nowrap font-extrabold leading-[0.95] tracking-[-0.025em] ${
            variant === 'diy'
              ? 'text-white'
              : 'bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] bg-clip-text text-transparent'
          } text-[clamp(44px,4.5vw,64px)]`}
        >
          {price}
        </span>
        <span className="whitespace-nowrap text-[clamp(14px,1.2vw,17px)] font-normal text-[#8A8F98]">
          {period}
        </span>
      </div>

      {foundingTag && (
        /* Pill always uses the SHORT copy now — long form was wrapping to
           3 lines at every desktop width. */
        <p className="mt-4 inline-flex w-fit max-w-full items-center self-start rounded-full bg-[#D4AF37]/[0.15] px-3.5 py-1.5 text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#D4AF37]">
          {foundingTagShort || foundingTag}
        </p>
      )}

      <p className="mt-6 text-[clamp(14px,1.1vw,16px)] leading-[1.5] text-[#A0A5AE]">
        {description}
      </p>

      <ul className="mt-6 flex w-full min-w-0 flex-col gap-3">
        {bullets.map((b, i) => (
          <BulletItem
            key={`${b.text}-${i}`}
            text={b.text}
            tooltip={b.tooltip}
            muted={variant === 'diy'}
          />
        ))}
      </ul>

      {/* mt-auto pushes the CTA cluster to the bottom; combined with grid's
          align-items: stretch this makes all three CTAs bottom-align across
          cards even when bullet counts differ. */}
      <div className="mt-auto pt-7">
        {/* Trust signals row — Standard tier only. Sits right above the CTA
            to reassure at the click decision point. */}
        {variant === 'standard' && (
          <p className="mb-3 text-center text-[10px] tracking-[0.02em] text-[#7A7F8A]">
            🔒 Stripe&nbsp;&nbsp;·&nbsp;&nbsp;✓ No setup fee&nbsp;&nbsp;·&nbsp;&nbsp;✓ Cancel anytime
          </p>
        )}

        <a
          href={ctaHref}
          target="_blank"
          rel="noreferrer"
          aria-label={ctaAriaLabel}
          className={`group/btn flex w-full items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#D4AF37] ${ctaClass}`}
        >
          <span>{ctaLabel}</span>
          <span
            aria-hidden
            className="inline-block transition-transform duration-200 ease-out group-hover/btn:translate-x-1"
          >
            →
          </span>
        </a>

        <p className="mt-3.5 text-center text-[11px] leading-[1.5] tracking-[0.02em] text-[#7A7F8A] sm:text-[11px]">
          {ctaSubtext}
        </p>
      </div>
    </div>
  );
}

function CheckIcon({ muted = false }: { muted?: boolean }) {
  // Thin-stroke checkmark — 1.5px stroke, premium feel vs the heavy filled one.
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mt-[3px] h-4 w-4 shrink-0 ${muted ? 'text-[#D4AF37]/55' : 'text-[#D4AF37]'}`}
    >
      <polyline points="3 8 7 12 13 4.5" />
    </svg>
  );
}

function BulletItem({
  text,
  tooltip,
  muted = false,
}: {
  text: string;
  tooltip?: string;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Click outside to close. Only attached while the tooltip is open so we don't
  // leak a global listener.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <li className="flex w-full min-w-0 items-start gap-2">
      <CheckIcon muted={muted} />
      <span
        className={`min-w-0 flex-1 break-words text-[clamp(13px,1.05vw,15px)] font-normal leading-[1.45] tracking-[-0.005em] ${
          muted ? 'text-[#D5D8DD]/85' : 'text-[#D5D8DD]'
        }`}
        style={{ wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'none' }}
      >
        {text}
        {tooltip && (
          <span ref={wrapRef} className="relative ml-1.5 inline-block align-middle">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
              aria-label={`More info: ${tooltip}`}
              aria-expanded={open}
              className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full text-[12px] leading-none text-[#D4AF37]/60 transition hover:text-[#D4AF37] focus:outline-none focus-visible:text-[#D4AF37]"
            >
              <span aria-hidden>ⓘ</span>
            </button>
            {open && (
              // Anchor right-edge of tooltip to the icon so it grows LEFT into
              // the card body instead of out past the right card edge.
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full right-[-6px] z-30 mb-2 block w-[240px] max-w-[240px] whitespace-normal rounded-lg border border-[#D4AF37]/15 bg-[#1A1A1F] p-3 text-left text-[13px] leading-[1.5] text-white shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-fade-in"
              >
                {tooltip}
              </span>
            )}
          </span>
        )}
      </span>
    </li>
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
