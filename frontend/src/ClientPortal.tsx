import { useEffect, useState } from 'react';
import { API_URL } from './api';

type RoiSnapshot = {
  calls: number;
  leads: number;
  jobs_won: number;
  revenue_influenced: number;
  monthly_fee: number;
  roi_multiple: number;
  confidence: string;
  period_start: string;
  period_end: string;
} | null;

type AivCheck = {
  engine: string;
  query: string;
  cited: number;
  cited_url: string | null;
};

type Opportunity = {
  title: string;
  type: string;
  est_revenue: number;
  recommended_action: string;
};

type PortalPayload = {
  slug: string;
  client_name: string;
  roi: RoiSnapshot;
  ai_visibility: { index: { index_score: number } | null; checks: AivCheck[] };
  opportunities: Opportunity[];
  monthly_fee: number;
};

const money = (n: number) => `$${(n || 0).toLocaleString()}`;

export default function ClientPortal({ slug }: { slug: string }) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = new URLSearchParams(window.location.search).get('token') || '';
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_URL}/portal/${slug}?token=${encodeURIComponent(token)}`);
        if (resp.status === 403) throw new Error('This portal link is invalid or expired.');
        if (!resp.ok) throw new Error(`Could not load portal (HTTP ${resp.status}).`);
        const payload = (await resp.json()) as PortalPayload;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading your dashboard…</p>;
  if (error)
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-red-500/40 bg-red-950/30 p-5 text-sm text-red-300">
        {error}
      </div>
    );
  if (!data) return null;

  const roi = data.roi;
  const hasRoi = roi && roi.revenue_influenced > 0;

  return (
    <main className="flex-1 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{data.client_name}</h1>
        <p className="mt-1 text-sm text-slate-400">Your live LOLA performance dashboard.</p>
      </header>

      {/* ROI strip — the headline */}
      {hasRoi ? (
        <div className="mb-6 rounded-2xl border border-[#FF9500]/30 bg-gradient-to-br from-amber-950/30 to-slate-900/40 p-6">
          <p className="text-xs uppercase tracking-wide text-amber-300/80">
            This period ({roi!.period_start} → {roi!.period_end})
          </p>
          <p className="mt-2 text-lg text-white">
            LOLA helped generate an estimated{' '}
            <span className="font-bold text-[#FF9500]">{money(roi!.revenue_influenced)}</span> in
            revenue on a {money(roi!.monthly_fee)}/mo investment —{' '}
            <span className="font-bold text-[#FF9500]">{roi!.roi_multiple.toFixed(1)}× return</span>.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Metric label="Calls" value={String(roi!.calls)} />
            <Metric label="Leads" value={String(roi!.leads)} />
            <Metric label="Jobs won" value={String(roi!.jobs_won)} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Attribution confidence: {roi!.confidence}</p>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Your ROI numbers will appear here once tracking data starts flowing (first full period).
        </div>
      )}

      {/* AI visibility */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">AI Search Visibility</h2>
          {data.ai_visibility.index && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-[#FF9500]">
              Index {Math.round(data.ai_visibility.index.index_score)}/100
            </span>
          )}
        </div>
        {data.ai_visibility.checks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">AI visibility tracking starts after your first scan.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.ai_visibility.checks.map((c, i) => (
              <li key={i} className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm">
                <span className="text-slate-300">
                  <span className="text-slate-500">{c.engine}</span> · {c.query}
                </span>
                <span className={c.cited ? 'text-emerald-400' : 'text-slate-600'}>
                  {c.cited ? '✓ cited' : 'not cited'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Opportunities */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">What we're working on next</h2>
        {data.opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Your opportunity backlog will appear here after the next scan.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.opportunities.map((o, i) => (
              <li key={i} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-white">{o.title}</p>
                  {o.est_revenue > 0 && (
                    <span className="shrink-0 text-sm font-bold text-[#FF9500]">
                      ~{money(o.est_revenue)}/mo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{o.recommended_action}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/50 p-3 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
