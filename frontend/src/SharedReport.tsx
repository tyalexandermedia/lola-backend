import { useEffect, useState } from 'react';
import type { AuditResult } from './types';
import { API_URL, ResultsStage } from './AuditFlow';

export default function SharedReport({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_URL}/audits/${encodeURIComponent(auditId)}`);
        if (resp.status === 404) {
          throw new Error('That audit has wandered off. Check the link.');
        }
        if (!resp.ok) {
          throw new Error('Could not load this audit.');
        }
        const data: AuditResult = await resp.json();
        if (!cancelled) setAudit(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something broke.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '0ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '180ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '360ms' }} />
        </div>
        <p className="mt-6 text-sm text-slate-400">Fetching this audit…</p>
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold text-white">Lola lost the scent.</h2>
        <p className="mt-3 max-w-md text-base text-slate-400">{error ?? 'Audit not available.'}</p>
        <a
          href="/"
          className="mt-8 rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#F4B942] to-[#E09E23] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(255,193,7,0.24)] transition duration-150 hover:brightness-110 active:scale-[0.98] active:duration-75 focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25"
        >
          Run your own audit
        </a>
      </main>
    );
  }

  return (
    <ResultsStage audit={audit} cta={{ label: 'Run your own audit', href: '/' }} />
  );
}
