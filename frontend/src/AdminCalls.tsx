import { useEffect, useMemo, useState } from 'react';
import { API_URL } from './api';

interface Call {
  call_sid: string;
  created_at: string | null;
  caller_number: string | null;
  customer_name: string | null;
  caller_city: string | null;
  caller_state: string | null;
  duration_sec: number;
  answered: boolean | null;
  first_call: boolean | null;
  recording_url: string | null;
  source: string | null;
  tracking_number: string | null;
  forwarded_to: string | null;
  won_job_logged: boolean;
}

interface CallsPayload {
  slug: string;
  window_days: number;
  total: number;
  calls: Call[];
}

const STORAGE_KEY = 'lola.adminKey';

export default function AdminCalls({ slug }: { slug: string }) {
  const [key, setKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  });
  const [draftKey, setDraftKey] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CallsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_URL}/admin/calls/${slug}?days=${days}`, {
          headers: { 'X-Admin-Key': key },
        });
        if (resp.status === 401 || resp.status === 403) {
          throw new Error('Admin key rejected. Double-check LOLA_SECRET_ADMIN_KEY.');
        }
        if (!resp.ok) {
          throw new Error(`Could not load calls (HTTP ${resp.status}).`);
        }
        const payload = (await resp.json()) as CallsPayload;
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
  }, [key, slug, days]);

  const totals = useMemo(() => {
    if (!data) return { count: 0, qualified: 0, totalDuration: 0 };
    const calls = data.calls || [];
    return {
      count: calls.length,
      qualified: calls.filter((c) => (c.duration_sec || 0) >= 30).length,
      totalDuration: calls.reduce((acc, c) => acc + (c.duration_sec || 0), 0),
    };
  }, [data]);

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
          <h2 className="text-2xl font-semibold text-white">Call log — {slug}</h2>
          <p className="mt-2 text-sm text-slate-400">
            Paste the LOLA_SECRET_ADMIN_KEY to see every tracked call (name, number, city, duration).
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
            Load calls
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Call log — {slug}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Operator view. PII visible — never share this URL or screenshots publicly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Window</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
          <button
            onClick={clearKey}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <section className="mb-6 grid grid-cols-3 gap-3">
            <Stat label="Calls" value={totals.count} />
            <Stat label="Qualified (≥30s)" value={totals.qualified} />
            <Stat
              label="Total talk time"
              value={`${Math.round(totals.totalDuration / 60)}m`}
            />
          </section>

          {totals.count === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
              No calls in the last {data.window_days} days. If CallRail just got
              wired, hit{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">
                POST /lead-gen/refresh/sandbar
              </code>{' '}
              to force the backfill, then refresh this page.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Caller</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Rec.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calls.map((c) => (
                    <tr key={c.call_sid} className="border-t border-slate-800 hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-300">
                        {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        <div>{c.customer_name || c.caller_number || 'Unknown'}</div>
                        {c.customer_name && c.caller_number && (
                          <div className="text-xs text-slate-500">{c.caller_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {[c.caller_city, c.caller_state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDuration(c.duration_sec)}</td>
                      <td className="px-4 py-3 text-slate-400">{c.source || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.first_call && (
                          <span className="mr-1 rounded bg-emerald-900/60 px-2 py-0.5 text-emerald-300">
                            first
                          </span>
                        )}
                        {c.answered === false && (
                          <span className="mr-1 rounded bg-red-900/60 px-2 py-0.5 text-red-300">
                            missed
                          </span>
                        )}
                        {c.won_job_logged && (
                          <span className="rounded bg-amber-900/60 px-2 py-0.5 text-amber-300">
                            won
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.recording_url ? (
                          <a
                            href={c.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            ▶
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (!sec) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}
