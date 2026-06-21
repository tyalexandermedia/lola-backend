import { useEffect, useState } from 'react';
import { API_URL } from './api';

const STORAGE_KEY = 'lola.adminKey';

type ClientRow = {
  slug: string;
  client_name: string;
  fee_monthly: number;
  roi_multiple: number;
  revenue_influenced: number;
  confidence: string;
  last_revenue_run: string;
  alert: string | null;
};

type ExecSummary = {
  mrr: number;
  active_clients: number;
  clients: ClientRow[];
  health: {
    overall: 'healthy' | 'degraded' | 'critical';
    keys: Record<string, string>;
    missing_keys: string[];
  };
  alerts: string[];
};

const money = (n: number) => `$${(n || 0).toLocaleString()}`;

const healthColor: Record<string, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-amber-400',
  critical: 'text-red-400',
};

const keyDot: Record<string, string> = {
  ok: 'bg-emerald-400',
  placeholder: 'bg-amber-400',
  missing: 'bg-red-500',
};

export default function ExecDashboard() {
  const [key, setKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  });
  const [draftKey, setDraftKey] = useState('');
  const [data, setData] = useState<ExecSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_URL}/admin/exec/summary`, {
          headers: { 'X-Admin-Key': key },
        });
        if (resp.status === 401 || resp.status === 403) {
          throw new Error('Admin key rejected. Check LOLA_SECRET_ADMIN_KEY.');
        }
        if (!resp.ok) throw new Error(`Could not load dashboard (HTTP ${resp.status}).`);
        const payload = (await resp.json()) as ExecSummary;
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
  }, [key]);

  const saveKey = () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
    setKey(trimmed);
  };

  const clearKey = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setKey('');
    setData(null);
    setDraftKey('');
  };

  if (!key) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
          <h2 className="text-2xl font-semibold text-white">Executive Dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">
            Paste the LOLA_SECRET_ADMIN_KEY to see MRR, per-client ROI, and system health.
          </p>
          <input
            type="password"
            value={draftKey}
            placeholder="admin key"
            onChange={(e) => setDraftKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveKey();
            }}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={saveKey}
            className="mt-3 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
          >
            Load dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Business health at a glance.</p>
        </div>
        <button
          onClick={clearKey}
          className="self-start rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
        >
          Sign out
        </button>
      </header>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          {/* KPI strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="MRR" value={money(data.mrr)} accent />
            <Kpi label="Active retainers" value={String(data.active_clients)} />
            <Kpi
              label="System health"
              value={data.health.overall}
              valueClass={healthColor[data.health.overall] || 'text-white'}
            />
          </div>

          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
              <h3 className="text-sm font-semibold text-amber-300">Alerts ({data.alerts.length})</h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-200/90">
                {data.alerts.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-client ROI table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">$ Influenced</th>
                  <th className="px-4 py-3">ROI</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No active clients yet. Onboard one via /admin/reporting/clients.
                    </td>
                  </tr>
                )}
                {data.clients.map((c) => (
                  <tr key={c.slug} className="bg-slate-950/40">
                    <td className="px-4 py-3 font-medium text-white">{c.client_name}</td>
                    <td className="px-4 py-3 text-slate-300">{money(c.fee_monthly)}</td>
                    <td className="px-4 py-3 text-slate-300">{money(c.revenue_influenced)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.roi_multiple >= 1
                            ? 'font-bold text-[#FF9500]'
                            : 'text-slate-400'
                        }
                      >
                        {c.roi_multiple ? `${c.roi_multiple.toFixed(1)}×` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.confidence}</td>
                    <td className="px-4 py-3">
                      {c.alert ? (
                        <span className="rounded bg-red-950/50 px-2 py-1 text-xs text-red-300">
                          {c.alert}
                        </span>
                      ) : (
                        <span className="text-emerald-500">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Health key strip */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Integration health</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(data.health.keys).map(([k, status]) => {
                const s = String(status);
                return (
                  <div key={k} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${keyDot[s] || 'bg-slate-600'}`} />
                    <span className="truncate">{k.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          valueClass || (accent ? 'text-[#FF9500]' : 'text-white')
        }`}
      >
        {value}
      </p>
    </div>
  );
}
