import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from './api';

const ADMIN_KEY_STORAGE = 'lola.adminKey';

type Summary = {
  contacts: number;
  pipeline_value: number;
  won_revenue: number;
  open_actions: number;
  opportunities: Record<string, { count: number; estimated_value: number; won_value: number }>;
  estimates: Record<string, { count: number; amount: number }>;
};

type Opportunity = {
  id: number;
  title: string;
  status: string;
  estimated_value: number;
  won_value: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type Estimate = {
  id: number;
  opportunity_id?: number | null;
  amount: number;
  status: string;
  description?: string | null;
  sent_at: string;
};

type Action = {
  id: number;
  title: string;
  detail?: string | null;
  status: string;
  opportunity_id?: number | null;
  estimate_id?: number | null;
  created_at: string;
};

const OPP_QUICK = ['qualified', 'estimate_sent', 'won', 'lost'];
const EST_QUICK = ['accepted', 'declined', 'expired'];

export default function AdminRevenue({ slug }: { slug: string }) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oppForm, setOppForm] = useState({ title: '', estimated_value: '', notes: '' });
  const [estForm, setEstForm] = useState({ opportunity_id: '', amount: '', description: '' });

  const keyReady = adminKey.trim().length > 0;
  const money = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), []);

  const headers = useCallback(() => ({
    'X-Admin-Key': adminKey.trim(),
    'Content-Type': 'application/json',
  }), [adminKey]);

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  }, [headers]);

  const load = useCallback(async () => {
    if (!keyReady) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, oppData, estimateData, actionData] = await Promise.all([
        request(`/admin/revenue/${encodeURIComponent(slug)}/summary`),
        request(`/admin/opportunities/${encodeURIComponent(slug)}`),
        request(`/admin/estimates/${encodeURIComponent(slug)}`),
        request(`/admin/revenue/${encodeURIComponent(slug)}/actions?include_done=true`),
      ]);
      setSummary(summaryData);
      setOpportunities(oppData.opportunities || []);
      setEstimates(estimateData.estimates || []);
      setActions(actionData.actions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load revenue data.');
    } finally {
      setLoading(false);
    }
  }, [keyReady, request, slug]);

  useEffect(() => { load(); }, [load]);

  function saveKey() {
    const trimmed = adminKey.trim();
    if (!trimmed) {
      setError('Enter the admin key first.');
      return;
    }
    sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setNotice('Admin key saved for this browser session.');
  }

  async function mutate(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(null);
    }
  }

  function runAgent() {
    mutate('run-agent', async () => {
      const out = await request(`/admin/revenue/${encodeURIComponent(slug)}/run`, { method: 'POST' });
      setNotice(`Revenue Agent synced ${out.contacts_synced || 0} contacts and opened ${out.actions_created || 0} action${out.actions_created === 1 ? '' : 's'}.`);
    });
  }

  function createOpportunity(e: FormEvent) {
    e.preventDefault();
    const title = oppForm.title.trim();
    const estimated = Number(oppForm.estimated_value || 0);
    if (!title) return setError('Opportunity title is required.');
    if (!Number.isFinite(estimated) || estimated < 0) return setError('Estimated value must be zero or higher.');
    mutate('create-opportunity', async () => {
      await request(`/admin/opportunities/${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          estimated_value: Math.round(estimated),
          notes: oppForm.notes.trim() || null,
        }),
      });
      setOppForm({ title: '', estimated_value: '', notes: '' });
      setNotice('Opportunity created.');
    });
  }

  function createEstimate(e: FormEvent) {
    e.preventDefault();
    const amount = Number(estForm.amount);
    const opportunityId = estForm.opportunity_id ? Number(estForm.opportunity_id) : null;
    if (!Number.isFinite(amount) || amount < 0) return setError('Estimate amount must be zero or higher.');
    if (estForm.opportunity_id && (!Number.isInteger(opportunityId) || !opportunityId)) return setError('Choose a valid opportunity.');
    mutate('create-estimate', async () => {
      await request(`/admin/estimates/${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: JSON.stringify({
          opportunity_id: opportunityId,
          amount: Math.round(amount),
          status: 'sent',
          description: estForm.description.trim() || null,
        }),
      });
      setEstForm({ opportunity_id: '', amount: '', description: '' });
      setNotice('Estimate logged.');
    });
  }

  const updateOpportunity = (id: number, status: string, wonValue?: number) => mutate(`opp-${id}-${status}`, async () => {
    await request(`/admin/opportunities/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, won_value: wonValue }),
    });
    setNotice(`Opportunity marked ${status.replace('_', ' ')}.`);
  });

  const updateEstimate = (id: number, status: string) => mutate(`est-${id}-${status}`, async () => {
    await request(`/admin/estimates/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    setNotice(`Estimate marked ${status}.`);
  });

  const finishAction = (id: number, status: 'completed' | 'dismissed') => mutate(`action-${id}-${status}`, async () => {
    await request(`/admin/revenue/actions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    setNotice(status === 'completed' ? 'Action completed.' : 'Action dismissed.');
  });

  return (
    <main className="mx-auto w-full max-w-6xl py-6 sm:py-10">
      <header className="mb-6 border-b border-[#D4AF37]/20 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">Revenue Agent</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Revenue control room: {slug}</h1>
            <p className="mt-2 text-sm text-[#9CA3AF]">Calls and leads become opportunities, estimates, won jobs, and follow-up actions.</p>
          </div>
          <button onClick={runAgent} disabled={!keyReady || !!busy || loading} className="h-11 rounded-md bg-[#D4AF37] px-5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50">
            {busy === 'run-agent' ? 'Running…' : 'Run agent'}
          </button>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-white/10 bg-[#11121A] p-4">
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Admin key</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} className="min-h-11 flex-1 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#D4AF37]" />
          <button onClick={saveKey} disabled={!adminKey.trim()} className="h-11 rounded-md border border-[#D4AF37]/50 px-4 text-sm font-semibold text-[#F4D47C] disabled:opacity-50">Save for session</button>
          <button onClick={load} disabled={!keyReady || loading} className="h-11 rounded-md border border-white/15 px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Metric label="Contacts" value={summary?.contacts ?? 0} />
        <Metric label="Open pipeline" value={money.format(summary?.pipeline_value ?? 0)} />
        <Metric label="Won revenue" value={money.format(summary?.won_revenue ?? 0)} />
        <Metric label="Open actions" value={summary?.open_actions ?? 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="New opportunity">
          <form onSubmit={createOpportunity} className="space-y-3">
            <Field label="Title" value={oppForm.title} onChange={(v) => setOppForm({ ...oppForm, title: v })} required />
            <Field label="Estimated value" type="number" value={oppForm.estimated_value} onChange={(v) => setOppForm({ ...oppForm, estimated_value: v })} />
            <Field label="Notes" value={oppForm.notes} onChange={(v) => setOppForm({ ...oppForm, notes: v })} />
            <button disabled={!!busy || !keyReady} className="h-10 rounded-md bg-white px-4 text-sm font-bold text-black disabled:opacity-50">{busy === 'create-opportunity' ? 'Saving…' : 'Add opportunity'}</button>
          </form>
        </Panel>

        <Panel title="New estimate">
          <form onSubmit={createEstimate} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Opportunity</label>
            <select value={estForm.opportunity_id} onChange={(e) => setEstForm({ ...estForm, opportunity_id: e.target.value })} className="min-h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white">
              <option value="">Unlinked</option>
              {opportunities.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
            <Field label="Amount" type="number" value={estForm.amount} onChange={(v) => setEstForm({ ...estForm, amount: v })} required />
            <Field label="Description" value={estForm.description} onChange={(v) => setEstForm({ ...estForm, description: v })} />
            <button disabled={!!busy || !keyReady} className="h-10 rounded-md bg-white px-4 text-sm font-bold text-black disabled:opacity-50">{busy === 'create-estimate' ? 'Saving…' : 'Log sent estimate'}</button>
          </form>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Opportunities">
          {opportunities.length === 0 ? <Empty text="No opportunities yet. Run the agent or add one manually." /> : opportunities.map((o) => (
            <Item key={o.id} title={o.title} meta={`${o.status} · ${money.format(o.estimated_value || o.won_value || 0)}`}>
              <QuickActions options={OPP_QUICK} busy={busy} prefix={`opp-${o.id}`} onClick={(s) => updateOpportunity(o.id, s, s === 'won' ? (o.estimated_value || o.won_value || 0) : undefined)} />
            </Item>
          ))}
        </Panel>

        <Panel title="Estimates">
          {estimates.length === 0 ? <Empty text="No estimates logged yet." /> : estimates.map((e) => (
            <Item key={e.id} title={money.format(e.amount)} meta={`${e.status} · ${new Date(e.sent_at).toLocaleDateString()}`}>
              <QuickActions options={EST_QUICK} busy={busy} prefix={`est-${e.id}`} onClick={(s) => updateEstimate(e.id, s)} />
            </Item>
          ))}
        </Panel>

        <Panel title="Actions">
          {actions.length === 0 ? <Empty text="No Revenue Agent actions yet." /> : actions.map((a) => (
            <Item key={a.id} title={a.title} meta={a.status} detail={a.detail || undefined}>
              {a.status === 'open' && (
                <div className="mt-3 flex gap-2">
                  <button disabled={!!busy} onClick={() => finishAction(a.id, 'completed')} className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-bold text-black disabled:opacity-50">Done</button>
                  <button disabled={!!busy} onClick={() => finishAction(a.id, 'dismissed')} className="h-9 rounded-md border border-white/15 px-3 text-xs font-bold text-white disabled:opacity-50">Dismiss</button>
                </div>
              )}
            </Item>
          ))}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-white/10 bg-[#11121A] p-4"><p className="text-xs uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-white/10 bg-[#11121A] p-4"><h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-[#D4AF37]">{title}</h2>{children}</section>;
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#D4AF37]" /></label>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-[#9CA3AF]">{text}</p>;
}

function Item({ title, meta, detail, children }: { title: string; meta: string; detail?: string; children?: ReactNode }) {
  return <div className="mb-3 rounded-md border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-[#9CA3AF]">{meta}</p></div></div>{detail && <p className="mt-2 text-xs leading-5 text-[#C8C0B0]">{detail}</p>}{children}</div>;
}

function QuickActions({ options, busy, prefix, onClick }: { options: string[]; busy: string | null; prefix: string; onClick: (status: string) => void }) {
  return <div className="mt-3 flex flex-wrap gap-2">{options.map((s) => <button key={s} disabled={!!busy} onClick={() => onClick(s)} className="h-8 rounded-md border border-white/15 px-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy === `${prefix}-${s}` ? '…' : s.replace('_', ' ')}</button>)}</div>;
}
