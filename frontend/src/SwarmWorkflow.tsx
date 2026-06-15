import { useState } from 'react';
import { API_URL } from './api';
import { track } from './analytics';

interface WorkflowData {
  workflow_id: string;
  status: string;
  execution_time_seconds: number;
  cost_estimate?: string;
  data?: {
    audit?: {
      gaps?: string[];
      revenue_leak?: number;
      quick_wins?: string[];
      scores?: {
        page_seo?: number;
        tech_seo?: number;
        content?: number;
        local_seo?: number;
        authority?: number;
      };
    };
    report?: {
      summary?: string;
      actions?: string[];
      plan_30day?: string;
    };
    lead_gen?: {
      landing_headline?: string;
      benefits?: string[];
      testimonials?: string[];
      email_subjects?: string[];
      ad_hooks?: string[];
    };
    outreach?: {
      subject?: string;
      body?: string;
    };
    learning?: {
      patterns?: string[];
      next_recommendation?: string;
    };
  };
}

const ADMIN_KEY_STORAGE = 'lola.adminKey';

export default function SwarmWorkflow() {
  const [adminKey, setAdminKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
  });
  const [draftKey, setDraftKey] = useState('');
  const [businessUrl, setBusinessUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveKey = () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    window.sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setDraftKey('');
  };

  const clearKey = () => {
    window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setResult(null);
    setError(null);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track('swarm_execute_submit');

    try {
      const response = await fetch(`${API_URL}/swarm/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({
          business_url: businessUrl,
          business_name: businessName,
        }),
      });
      if (response.status === 401) {
        throw new Error('Admin key rejected. Clear it and re-enter.');
      }
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail.slice(0, 200)}`);
      }
      const data: WorkflowData = await response.json();
      setResult(data);
      track('swarm_execute_success', { workflow_id: data.workflow_id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      track('swarm_execute_error', { error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Lola SEO Swarm</h1>
            <p className="mt-2 text-[15px] text-[#C5C5C8]">
              Unified workflow: <span className="text-[#F4D47C]">Audit → Report → Lead Gen → Outreach → Learning</span>.
              One Claude Opus call. <span className="text-emerald-300">~$0.10 per execute</span> — admin-gated.
            </p>
          </div>
          {adminKey && (
            <button
              onClick={clearKey}
              className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-medium text-[#9AA0A6] transition hover:border-white/20 hover:text-white"
            >
              Sign out admin
            </button>
          )}
        </div>
      </header>

      {!adminKey ? (
        <AdminKeyPrompt draftKey={draftKey} setDraftKey={setDraftKey} saveKey={saveKey} />
      ) : !result ? (
        <form
          onSubmit={handleExecute}
          className="rounded-2xl border border-[#D4AF37]/20 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C5C5C8]">
                Business URL <span className="text-[#D4AF37]">*</span>
              </span>
              <input
                type="text"
                placeholder="e.g., sandbarsoftwash.com"
                value={businessUrl}
                onChange={(e) => setBusinessUrl(e.target.value)}
                required
                className="w-full rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C5C5C8]">
                Business Name <span className="text-[#6B7280]">(optional)</span>
              </span>
              <input
                type="text"
                placeholder="e.g., Sandbar Soft Wash"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <><Spinner /> Running unified workflow… (~10s)</>
              ) : (
                <><PlayIcon /> Execute Workflow</>
              )}
            </button>
            {error && (
              <p className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                {error}
              </p>
            )}
          </div>
        </form>
      ) : (
        <ResultView result={result} onReset={() => { setResult(null); setError(null); }} />
      )}
    </main>
  );
}

function AdminKeyPrompt({
  draftKey, setDraftKey, saveKey,
}: { draftKey: string; setDraftKey: (v: string) => void; saveKey: () => void }) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8">
      <h2 className="mb-2 text-xl font-bold text-white">Admin key required</h2>
      <p className="mb-5 text-[14px] text-[#C5C5C8]">
        This endpoint costs real money per call (~$0.10). Enter your <span className="font-mono text-[#F4D47C]">LOLA_SECRET_ADMIN_KEY</span> to unlock. Stored in this browser session only.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          placeholder="Admin key"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
          className="flex-1 rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 font-mono text-[14px] text-white placeholder-[#6B7280] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        />
        <button
          onClick={saveKey}
          disabled={!draftKey.trim()}
          className="rounded-[10px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] px-6 py-3 text-[14px] font-bold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}

function ResultView({ result, onReset }: { result: WorkflowData; onReset: () => void }) {
  const d = result.data || {};
  const audit = d.audit || {};
  const report = d.report || {};
  const leadGen = d.lead_gen || {};
  const outreach = d.outreach || {};
  const learning = d.learning || {};
  const scores = audit.scores || {};

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-emerald-100">Workflow completed</h2>
            <p className="text-[13px] text-emerald-200/80">
              {result.execution_time_seconds?.toFixed(1)}s · {result.cost_estimate || '~$0.10'} · <span className="font-mono">{result.workflow_id}</span>
            </p>
          </div>
        </div>
      </div>

      <Card title="SEO Audit" accent="#D4AF37">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Critical Gaps</Label>
            <BulletList items={audit.gaps} />
          </div>
          <div>
            <Label>Quick Wins</Label>
            <BulletList items={audit.quick_wins} />
          </div>
        </div>
        {audit.revenue_leak !== undefined && (
          <div className="mt-4 rounded-[10px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-[14px] text-red-200">
            <span className="font-semibold">Revenue leak:</span> ${audit.revenue_leak?.toLocaleString()} / month
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ScorePill label="Page" value={scores.page_seo} />
          <ScorePill label="Tech" value={scores.tech_seo} />
          <ScorePill label="Content" value={scores.content} />
          <ScorePill label="Local" value={scores.local_seo} />
          <ScorePill label="Authority" value={scores.authority} />
        </div>
      </Card>

      <Card title="Report Summary" accent="#10B981">
        {report.summary && <p className="text-[14px] leading-[1.6] text-[#E5E7EB]">{report.summary}</p>}
        {report.actions && report.actions.length > 0 && (
          <div className="mt-4">
            <Label>Top Actions</Label>
            <BulletList items={report.actions} />
          </div>
        )}
        {report.plan_30day && (
          <div className="mt-4">
            <Label>30-Day Plan</Label>
            <p className="text-[14px] leading-[1.6] text-[#E5E7EB]">{report.plan_30day}</p>
          </div>
        )}
      </Card>

      <Card title="Lead-Gen System" accent="#F59E0B">
        {leadGen.landing_headline && (
          <div className="mb-4">
            <Label>Landing Headline</Label>
            <p className="rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 text-[15px] font-semibold text-white">
              {leadGen.landing_headline}
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Benefits</Label>
            <BulletList items={leadGen.benefits} />
          </div>
          <div>
            <Label>Email Subject Lines</Label>
            <BulletList items={leadGen.email_subjects} mono />
          </div>
          <div>
            <Label>Ad Hooks</Label>
            <BulletList items={leadGen.ad_hooks} />
          </div>
          <div>
            <Label>Testimonial Placeholders</Label>
            <BulletList items={leadGen.testimonials} mono />
            <p className="mt-2 text-[12px] italic text-[#9AA0A6]">Fill these in with real customer quotes — never publish placeholders.</p>
          </div>
        </div>
      </Card>

      <Card title="Cold Outreach Email" accent="#8B5CF6">
        {outreach.subject && (
          <div className="mb-3">
            <Label>Subject</Label>
            <p className="rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3 font-mono text-[14px] text-white">{outreach.subject}</p>
          </div>
        )}
        {outreach.body && (
          <div>
            <Label>Body</Label>
            <pre className="whitespace-pre-wrap break-words rounded-[10px] border border-white/10 bg-[#0A0A0B] p-4 font-mono text-[13px] leading-[1.6] text-[#E5E7EB]">
              {outreach.body}
            </pre>
          </div>
        )}
      </Card>

      <Card title="Learning" accent="#EC4899">
        {learning.patterns && learning.patterns.length > 0 && (
          <div>
            <Label>Patterns Surfaced</Label>
            <BulletList items={learning.patterns} />
          </div>
        )}
        {learning.next_recommendation && (
          <div className="mt-4">
            <Label>Next Recommendation</Label>
            <p className="text-[14px] leading-[1.6] text-[#E5E7EB]">{learning.next_recommendation}</p>
          </div>
        )}
      </Card>

      <button
        onClick={onReset}
        className="w-full rounded-[12px] border border-white/10 bg-[#11121A] py-3 text-[14px] font-semibold text-[#C5C5C8] transition hover:border-[#D4AF37]/40 hover:text-white"
      >
        Run Another
      </button>
    </div>
  );
}

function Card({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl border bg-[#11121A] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.25)] sm:p-8"
      style={{ borderColor: `${accent}33` }}
    >
      <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9AA0A6]">{children}</p>
  );
}

function BulletList({ items, mono }: { items?: string[]; mono?: boolean }) {
  if (!items || items.length === 0) {
    return <p className="text-[13px] italic text-[#6B7280]">—</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className={`flex gap-2 text-[14px] leading-[1.55] text-[#E5E7EB] ${mono ? 'font-mono text-[13px]' : ''}`}>
          <span className="text-[#D4AF37]">→</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ScorePill({ label, value }: { label: string; value?: number }) {
  const v = typeof value === 'number' ? value : null;
  const color = v === null ? '#6B7280' : v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="rounded-[10px] border border-white/10 bg-[#0A0A0B] px-3 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9AA0A6]">{label}</p>
      <p className="mt-1 text-[18px] font-bold" style={{ color }}>{v ?? '—'}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7 5v14l11-7z" />
    </svg>
  );
}
