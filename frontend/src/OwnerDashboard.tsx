/**
 * /admin/hq — "Lola HQ", the owner dashboard.
 *
 * One screen with the whole funnel + automation health, so Ty can see what's
 * working and where leads leak. Admin-key gated (same key as /leads), stored in
 * localStorage. Reads a single aggregated snapshot from GET /admin/hq.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from './api';

const STORAGE_KEY = 'lola.adminKey';

interface Hq {
  scores_run: number;
  leads: { total: number; hot: number; warm: number; cool: number; cold: number };
  nurture: { total: number; active: number; purchased: number; done: number };
  mctb: { texts_sent: number; clients_enabled: number };
  clients: { active: number; list: Array<{ slug: string; name: string; site: string }> };
  recent_leads: Array<{
    id: string; business_name: string; city: string; total_score: number;
    grade: string; created_at: string;
  }>;
  automation: { email: boolean; sms: boolean; followups_on: boolean; mctb_on: boolean };
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-[#D4AF37]/20 bg-white/[0.02] p-5">
      <p className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[30px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[36px]">
        {value}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#C5C5C8]">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-[#8A8F98]">{sub}</p>}
    </div>
  );
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
        on
          ? 'border-[#28C840]/40 bg-[#28C840]/[0.08] text-[#28C840]'
          : 'border-white/[0.1] bg-white/[0.02] text-[#8A8F98]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-[#28C840]' : 'bg-[#5A5F68]'}`} />
      {label} {on ? 'on' : 'off'}
    </span>
  );
}

export default function OwnerDashboard() {
  const [key, setKey] = useState<string>(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [draft, setDraft] = useState('');
  const [data, setData] = useState<Hq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/admin/hq`, { headers: { 'X-Admin-Key': key } });
      if (r.status === 403) throw new Error('That admin key is no good.');
      if (!r.ok) throw new Error('Could not load HQ.');
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something broke.');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { void load(); }, [load]);

  const saveKey = () => {
    const k = draft.trim();
    if (!k) return;
    try { window.localStorage.setItem(STORAGE_KEY, k); } catch { /* ignore */ }
    setKey(k);
  };

  if (!key) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Lola HQ</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Enter your admin key.</p>
        <div className="mt-6 flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
            placeholder="admin key"
            className="h-11 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-white outline-none focus:border-[#D4AF37]/50"
          />
          <button
            onClick={saveKey}
            className="h-11 rounded-[10px] bg-[#D4AF37] px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B]"
          >
            Enter
          </button>
        </div>
      </main>
    );
  }

  const leadPct = data && data.scores_run > 0
    ? Math.round((data.leads.total / data.scores_run) * 100) : 0;
  const convPct = data && data.leads.total > 0
    ? Math.round((data.nurture.purchased / data.leads.total) * 100) : 0;

  return (
    <main className="flex flex-1 flex-col py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">Lola HQ</p>
          <h1 className="mt-1 text-[26px] font-bold text-white sm:text-[32px]">Your whole funnel, one screen.</h1>
        </div>
        <button
          onClick={() => void load()}
          className="h-10 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:border-[#D4AF37]/40"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="mt-6 rounded-[10px] border border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-300">{error}</p>}

      {data && (
        <>
          {/* Automation health */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill on={data.automation.email} label="Email" />
            <Pill on={data.automation.sms} label="SMS" />
            <Pill on={data.automation.followups_on} label="Nurture" />
            <Pill on={data.automation.mctb_on} label="Missed-call" />
          </div>

          {/* KPI grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Growth Scores run" value={data.scores_run} />
            <Stat label="Leads scored" value={data.leads.total} sub={`${data.leads.hot} hot · ${data.leads.warm} warm`} />
            <Stat label="In nurture" value={data.nurture.active} />
            <Stat label="Converted" value={data.nurture.purchased} />
            <Stat label="Missed-call texts" value={data.mctb.texts_sent} sub={`${data.mctb.clients_enabled} clients on`} />
            <Stat label="Active clients" value={data.clients.active} />
          </div>

          {/* Funnel */}
          <div className="mt-4 rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Funnel</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#C5C5C8]">
              <span className="font-semibold text-white">{data.scores_run}</span> scores
              <span className="text-[#5A5F68]">→</span>
              <span className="font-semibold text-white">{data.leads.total}</span> leads
              <span className="text-[#8A8F98]">({leadPct}%)</span>
              <span className="text-[#5A5F68]">→</span>
              <span className="font-semibold text-white">{data.nurture.purchased}</span> converted
              <span className="text-[#8A8F98]">({convPct}% of leads)</span>
            </div>
          </div>

          {/* Clients */}
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Clients</p>
            {data.clients.list.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#8A8F98]">No active clients yet.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.clients.list.map((c) => (
                  <div key={c.slug} className="flex items-center justify-between rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                    <span className="text-[14px] font-semibold text-white">{c.name || c.slug}</span>
                    <span className="flex gap-3 text-[12px]">
                      <a href={`/r/client/${c.slug}`} className="text-[#D4AF37] hover:underline">dashboard ↗</a>
                      <a href={`/admin/revenue/${c.slug}`} className="text-[#9CA3AF] hover:text-[#D4AF37]">revenue</a>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent leads */}
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Recent Growth Scores</p>
            <div className="mt-3 overflow-x-auto rounded-[12px] border border-white/[0.08]">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.12em] text-[#8A8F98]">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.recent_leads.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3 font-medium text-white">{l.business_name || '—'}</td>
                      <td className="px-4 py-3 text-[#C5C5C8]">{l.city || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#D4AF37]">{l.total_score ?? '—'}</td>
                      <td className="px-4 py-3 text-[#8A8F98]">{(l.created_at || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                  {data.recent_leads.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-[#8A8F98]">No scores run yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#5A5F68]">
            Revenue truth lives in Stripe · deeper client data on each dashboard ↗
          </p>
        </>
      )}
    </main>
  );
}
