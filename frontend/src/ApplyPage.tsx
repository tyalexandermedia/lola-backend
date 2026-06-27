/// <reference types="vite/client" />
/**
 * Lola SEO — /apply — roadmap pre-qualification form.
 *
 * Posts to backend POST /applications. Backend:
 *   - Saves to SQLite (applications table)
 *   - Emails ty@tyalexandermedia.com with all submission details (Resend)
 *   - Emails the applicant a confirmation
 *
 * Single column form, mobile-first, no signup required.
 */

import { useState } from 'react';
import { API_URL } from './api';
import { track } from './analytics';

type RevenueBand = 'under_20k' | '20k_50k' | '50k_100k' | '100k_plus';
type TierInterest = 'foundation' | 'growth' | 'scale' | 'both';

const TRADES = [
  'HVAC', 'Plumber', 'Roofer', 'Soft Wash', 'Electrician', 'Landscaper',
  'Painter', 'Pool Services', 'General Contractor', 'Handyman', 'Concrete',
  'Flooring', 'Pest Control', 'Carpet Cleaning', 'Cleaning Services',
  'Lawn Care', 'Auto Detailing', 'Garage Doors', 'Moving', 'Med Spa',
  'Salon / Barber', 'Locksmith', 'Masonry', 'Windows', 'Gutters',
  'Duct Cleaning', 'Fencing', 'Home Remodeling', 'Carpenter', 'Arborist',
  'Other',
] as const;

const REVENUE_BANDS: ReadonlyArray<{ value: RevenueBand; label: string }> = [
  { value: 'under_20k', label: 'Under $20K' },
  { value: '20k_50k', label: '$20K–$50K' },
  { value: '50k_100k', label: '$50K–$100K' },
  { value: '100k_plus', label: '$100K+' },
];

// Roadmap stages (Foundation → Growth → Scale). Values map to the phased
// growth-roadmap model in docs/PRICING.md; the applicant picks where they want
// to start and Coach Ty confirms the fit on the roadmap call.
const TIER_OPTIONS: ReadonlyArray<{ value: TierInterest; label: string }> = [
  { value: 'foundation', label: 'Foundation Sprint — $297 one-time' },
  { value: 'growth', label: 'Growth Roadmap — $497/mo' },
  { value: 'scale', label: 'Scale System — $697/mo ($997+ competitive)' },
  { value: 'both', label: 'Help me pick the right stage' },
];

export default function ApplyPage() {
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [business_name, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [monthly_revenue, setMonthlyRevenue] = useState<RevenueBand | ''>('');
  const [trade, setTrade] = useState('');
  const [frustration, setFrustration] = useState('');
  const [tier, setTier] = useState<TierInterest | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Match a host with at least one dot + a real TLD (>=2 alpha). Accepts
  // "mybiz.com", "mybiz.com/path", "https://mybiz.com". Rejects "mybiz" alone.
  const websiteLooksReal = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(website.trim());

  const valid =
    first_name.trim() &&
    last_name.trim() &&
    /\S+@\S+\.\S+/.test(email) &&
    business_name.trim() &&
    websiteLooksReal &&
    monthly_revenue &&
    trade &&
    tier;

  // Auto-prepend https:// on blur so the backend receives a parseable URL.
  const normalizeWebsite = () => {
    const v = website.trim();
    if (v && !/^https?:\/\//i.test(v)) {
      setWebsite(`https://${v}`);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: email.trim(),
          business_name: business_name.trim(),
          website: website.trim(),
          monthly_revenue,
          trade,
          frustration: frustration.trim(),
          tier,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || 'Submission failed — please try again or email ty@tyalexandermedia.com directly.');
      }
      track(tier === 'scale' ? 'scale_application_completed' : 'roadmap_application_completed', { tier });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something broke.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="text-[44px]">🐾</div>
        <h1 className="mt-6 text-[28px] font-bold text-white sm:text-[34px]">
          Got it. Coach Ty's on it.
        </h1>
        <p className="mt-4 max-w-[520px] text-[15px] leading-[1.65] text-[#C5C5C8] sm:text-[16px]">
          Your application's in. I review every single one personally and will reach out within
          24 hours via email (or text, if you've replied to Lola before).
        </p>
        <a
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-[10px] border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-6 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] hover:bg-[#D4AF37]/[0.12]"
        >
          Back to home →
        </a>
      </main>
    );
  }

  return (
    <main className="animate-slide-up relative flex flex-1 flex-col pt-2 sm:pt-6">
      {/* Ambient aurora — shared premium glow across the funnel heroes. */}
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[560px] w-[min(980px,124vw)] -translate-x-1/2 blur-[64px]"
        style={{
          background:
            'radial-gradient(38% 50% at 22% 12%, rgba(111,155,255,0.12), transparent 70%), radial-gradient(46% 56% at 82% 6%, rgba(212,175,55,0.20), transparent 70%), radial-gradient(42% 46% at 56% 36%, rgba(165,96,231,0.10), transparent 70%)',
        }}
      />

      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Apply</p>
      <h1
        className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
        style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
      >
        Tell me about your business.
      </h1>
      <p className="mt-5 max-w-[640px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[17px]">
        Coach Ty reviews every application personally and reaches out within 24 hours.{' '}
        <span className="font-semibold text-white">No payment required to apply.</span>
      </p>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6 sm:gap-7">
        {/* Names */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <FieldText
            label="First name"
            value={first_name}
            onChange={setFirstName}
            autoComplete="given-name"
            required
          />
          <FieldText
            label="Last name"
            value={last_name}
            onChange={setLastName}
            autoComplete="family-name"
            required
          />
        </div>

        <FieldText
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />

        <FieldText
          label="Business name"
          value={business_name}
          onChange={setBusinessName}
          autoComplete="organization"
          required
        />

        <FieldText
          label="Business website"
          type="url"
          placeholder="https://"
          value={website}
          onChange={setWebsite}
          onBlur={normalizeWebsite}
          autoComplete="url"
          required
        />

        {/* Revenue band */}
        <fieldset>
          <legend className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
            Monthly revenue
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {REVENUE_BANDS.map((b) => (
              <label
                key={b.value}
                className={`flex min-h-[52px] cursor-pointer items-center justify-center rounded-[10px] border px-3 text-[13px] font-semibold transition ${
                  monthly_revenue === b.value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/[0.12] text-white'
                    : 'border-white/[0.10] bg-white/[0.02] text-[#C5C5C8] hover:border-white/[0.25]'
                }`}
              >
                <input
                  type="radio"
                  name="monthly_revenue"
                  value={b.value}
                  checked={monthly_revenue === b.value}
                  onChange={() => setMonthlyRevenue(b.value)}
                  className="sr-only"
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Business type (visible label kept friendly; `trade` is the internal key). */}
        <div>
          <label
            htmlFor="apply-trade"
            className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85"
          >
            Business type
          </label>
          <select
            id="apply-trade"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="mt-3 block w-full appearance-none rounded-[12px] border border-white/[0.10] bg-[#0F0F12] px-4 py-3.5 text-[15px] font-medium text-white outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23D4AF37' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '38px',
            }}
            required
          >
            <option value="">Pick your business type…</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Frustration (optional) */}
        <div>
          <label
            htmlFor="apply-frustration"
            className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85"
          >
            What's your biggest SEO frustration right now?{' '}
            <span className="text-[10px] font-medium text-[#7A7F8A]">(optional)</span>
          </label>
          <textarea
            id="apply-frustration"
            value={frustration}
            onChange={(e) => setFrustration(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. We rank #3 for our main keyword but the top 2 are taking all the calls…"
            className="mt-3 block w-full resize-y rounded-[12px] border border-white/[0.10] bg-[#0F0F12] px-4 py-3 text-[14px] text-white outline-none transition placeholder:text-[#5A5F68] focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
          />
        </div>

        {/* Tier */}
        <fieldset>
          <legend className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
            Where do you want to start?
          </legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
            {TIER_OPTIONS.map((t) => (
              <label
                key={t.value}
                className={`flex flex-1 min-h-[52px] cursor-pointer items-center justify-center rounded-[10px] border px-4 text-[13px] font-semibold transition ${
                  tier === t.value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/[0.12] text-white'
                    : 'border-white/[0.10] bg-white/[0.02] text-[#C5C5C8] hover:border-white/[0.25]'
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={t.value}
                  checked={tier === t.value}
                  onChange={() => setTier(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="mt-2 flex min-h-[60px] w-full items-center justify-center rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-6 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition hover:bg-right disabled:cursor-not-allowed disabled:opacity-50 sm:text-[15px]"
        >
          {submitting ? 'Submitting…' : 'Submit my application'}
        </button>

        <p className="text-center text-[12px] leading-[1.5] text-[#7A7F8A]">
          Coach Ty reviews every application personally and reaches out within 24 hours.
          No payment required to apply.
        </p>
      </form>

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68]">
        <p>Ty Alexander Media · Tampa Bay</p>
      </div>
    </main>
  );
}

function FieldText({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `apply-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/85">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-3 block h-12 w-full rounded-[12px] border border-white/[0.10] bg-[#0F0F12] px-4 text-[15px] text-white outline-none transition placeholder:text-[#5A5F68] focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
      />
    </div>
  );
}
