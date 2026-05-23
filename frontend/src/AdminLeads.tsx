import { useEffect, useMemo, useState } from 'react';
import { API_URL, formatNumber } from './AuditFlow';

type Filter = 'all' | 'warm' | 'hot';

interface Lead {
  id: string;
  email: string;
  business_name: string;
  website: string;
  city: string;
  business_type: string;
  total_score: number;
  grade: string;
  revenue_leak: number;
  segment: string;
  created_at: string;
  lead_score?: number | null;
  temperature?: string | null;
}

const STORAGE_KEY = 'lola.adminKey';

export default function AdminLeads() {
  const [key, setKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  });
  const [draftKey, setDraftKey] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (filter !== 'all') params.set('temperature', filter);
        const resp = await fetch(`${API_URL}/leads?${params.toString()}`, {
          headers: { 'X-Admin-Key': key },
        });
        if (resp.status === 401) {
          throw new Error('That admin key is no good.');
        }
        if (!resp.ok) {
          throw new Error('Could not load leads.');
        }
        const data = (await resp.json()) as { leads: Lead[] };
        if (!cancelled) setLeads(data.leads);
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
  }, [key, filter]);

  const totals = useMemo(() => {
    return {
      count: leads.length,
      leak: leads.reduce((acc, l) => acc + (l.revenue_leak || 0), 0),
    };
  }, [leads]);

  const saveKey = () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
    setKey(trimmed);
  };

  const clearKey = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setKey('');
    setLeads([]);
    setDraftKey('');
  };

  if (!key) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
          <h2 className="text-2xl font-semibold text-white">Admin sign-in</h2>
          <p className="mt-2 text-sm text-slate-400">Paste the LOLA_SECRET_ADMIN_KEY to load the lead pipeline.</p>
          <input
            type="password"
            value={draftKey}
            placeholder="admin key"
            onChange={(e) => setDraftKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveKey();
            }}
            className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-base text-white outline-none focus:border-gold-400"
          />
          <button
            type="button"
            onClick={saveKey}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#F4B942] to-[#E09E23] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(255,193,7,0.24)] transition duration-150 hover:brightness-110 active:scale-[0.98] active:duration-75 focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25"
          >
            Unlock
          </button>
          <p className="mt-3 text-xs text-slate-500">Stored in sessionStorage. Closes with the tab.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-300">Admin · lead pipeline</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {totals.count} {filter === 'all' ? 'leads' : `${filter} leads`}
          </h2>
          <p className="mt-1 text-sm text-slate-400">${formatNumber(totals.leak)} total monthly leak across this view</p>
        </div>
        <button
          type="button"
          onClick={clearKey}
          className="self-start rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
        >
          Sign out
        </button>
      </div>

      <div className="mt-5 inline-flex gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1 text-sm">
        {(['all', 'warm', 'hot'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 font-medium capitalize transition ${
              filter === f ? 'bg-slate-100 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            No leads in this view yet.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Leak/mo</th>
                <th className="px-4 py-3">Temp</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-800/60 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{lead.business_name}</p>
                    <a
                      href={`/r/${lead.id}`}
                      className="text-xs text-slate-400 hover:text-gold-300"
                    >
                      View report →
                    </a>
                    <p className="mt-0.5 text-xs text-slate-500">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{lead.city}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.business_type}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-white">{lead.total_score}</span>
                    <span className="ml-1 text-xs text-slate-500">{lead.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-200">${formatNumber(lead.revenue_leak)}</td>
                  <td className="px-4 py-3">
                    <TemperatureBadge value={lead.temperature} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function TemperatureBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-slate-500">—</span>;
  const color =
    value === 'hot'
      ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
      : value === 'warm'
      ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
      : value === 'cool'
      ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
      : 'bg-slate-500/15 text-slate-400 ring-slate-500/30';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${color}`}>
      {value}
    </span>
  );
}

function formatDate(s: string) {
  try {
    const d = new Date(s.replace(' ', 'T'));
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return s;
  }
}
