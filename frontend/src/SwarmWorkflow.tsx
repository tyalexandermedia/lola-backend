import { useState } from 'react';
import { API_URL } from './AuditFlow';
import { track } from './analytics';

interface SwarmResult {
  workflow_id: string;
  status: string;
  execution_time_seconds: number;
  agents_executed: number;
  learned_patterns: string[];
  next_recommendations: string[];
}

export default function SwarmWorkflow() {
  const [businessUrl, setBusinessUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [generateLeadSystem, setGenerateLeadSystem] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track('swarm_execute_submit', { has_lead_system: generateLeadSystem });

    try {
      const response = await fetch(`${API_URL}/swarm/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_url: businessUrl,
          business_name: businessName,
          generate_lead_system: generateLeadSystem,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`HTTP ${response.status}: ${detail.slice(0, 200)}`);
      }
      const data: SwarmResult = await response.json();
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
    <main className="mx-auto w-full max-w-3xl py-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Lola SEO Swarm
        </h1>
        <p className="mt-2 text-[15px] text-[#C5C5C8]">
          Ruflo orchestration: <span className="text-[#F4D47C]">Audit → (Report + Lead Gen) → Outreach → Learning</span>.
          5 Claude Opus calls per run. <span className="text-amber-300">Costs ~$0.50–$2 per execute</span> — use sparingly.
        </p>
      </header>

      {!result ? (
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

            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-white/10 bg-[#0A0A0B] px-4 py-3">
              <input
                type="checkbox"
                checked={generateLeadSystem}
                onChange={(e) => setGenerateLeadSystem(e.target.checked)}
                className="h-5 w-5 cursor-pointer accent-[#D4AF37]"
              />
              <span className="text-[14px] text-white">
                Include lead-gen agent <span className="text-[#9AA0A6]">(adds 1 Claude call)</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] bg-gradient-to-br from-[#FFD166] via-[#F4B942] to-[#E09E23] text-[16px] font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,193,7,0.22)] transition-all duration-200 hover:shadow-[0_22px_44px_rgba(255,193,7,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Spinner />
                  Running swarm… (~60–90s)
                </>
              ) : (
                <>
                  <PlayIcon /> Execute Workflow
                </>
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
        <div className="rounded-2xl border border-white/10 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            {result.status === 'completed' ? (
              <>
                <CheckIcon className="text-emerald-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Completed</h2>
                  <p className="text-[13px] text-[#9AA0A6]">
                    {result.execution_time_seconds.toFixed(1)}s · {result.agents_executed} agents · <span className="font-mono text-[#F4D47C]">{result.workflow_id}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertIcon className="text-red-400" />
                <h2 className="text-2xl font-bold text-white">Failed</h2>
              </>
            )}
          </div>

          {result.learned_patterns.length > 0 && (
            <div className="mb-5 rounded-[12px] border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-5">
              <h3 className="mb-2 text-[14px] font-bold uppercase tracking-[0.12em] text-[#F4D47C]">
                Learned Patterns
              </h3>
              <ul className="space-y-1.5 text-[14px] text-[#E5E7EB]">
                {result.learned_patterns.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-[#D4AF37]">→</span> {p}</li>
                ))}
              </ul>
            </div>
          )}

          {result.next_recommendations.length > 0 && (
            <div className="mb-5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="mb-2 text-[14px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                Next Steps
              </h3>
              <ul className="space-y-1.5 text-[14px] text-[#E5E7EB]">
                {result.next_recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-400">→</span> {r}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => { setResult(null); setError(null); }}
            className="w-full rounded-[12px] border border-white/10 bg-[#11121A] py-3 text-[14px] font-semibold text-[#C5C5C8] transition hover:border-[#D4AF37]/40 hover:text-white"
          >
            Run Another
          </button>
        </div>
      )}
    </main>
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}
