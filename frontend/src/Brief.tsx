/**
 * /brief (also /hq) — Lola Daily Command Center.
 *
 * The personal, cross-business "what should I do next?" view. Mobile-first: open
 * on a phone and in ~10 seconds see the one most important step, where money is
 * waiting, and what's blocked. Admin-key gated (same key as /admin/hq), stored
 * in localStorage. Reads GET /brief; the priority engine is server-side and
 * deterministic — this view only renders and moves items.
 *
 * See docs/LOLA-COMMAND-CENTER-AUDIT.md.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from './api';

const STORAGE_KEY = 'lola.adminKey';

interface Item {
  id: number;
  workspace: string;
  workspace_label: string;
  type: string;
  title: string;
  detail: string;
  status: string;
  source: string;
  revenue_estimate: number;
  revenue_recurring: boolean;
  waiting_on: string;
  priority_score: number;
  why: string;
}

interface Scoreboard {
  total_monthly: number;
  target: number;
  gap: number;
  pct_to_target: number;
  by_workspace: Array<{ workspace: string; label: string; amount: number; period: string; note: string }>;
}

interface Brief {
  generated_at: string;
  most_important_next_step: Item | null;
  today: Item[];
  revenue_opportunities: Item[];
  waiting_blocked: Item[];
  active: Item[];
  inbox: Item[];
  completed: Item[];
  scoreboard: Scoreboard;
  counts: Record<string, number>;
  workspaces: Array<{ slug: string; label: string }>;
}

const money = (n: number, recurring: boolean) =>
  n > 0 ? `$${Math.round(n).toLocaleString()}${recurring ? '/mo' : ''}` : '';

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gold">
      {label}
    </span>
  );
}

function ItemCard({
  item,
  onStatus,
  hero = false,
}: {
  item: Item;
  onStatus: (id: number, status: string) => void;
  hero?: boolean;
}) {
  const m = money(item.revenue_estimate, item.revenue_recurring);
  return (
    <div
      className={`rounded-[14px] border bg-white/[0.02] p-4 sm:p-5 ${
        hero ? 'border-gold/50 bg-gold/[0.04]' : 'border-gold/20'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={item.workspace_label} />
        {m && (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#28C840]">{m}</span>
        )}
      </div>
      <h3 className={`mt-2 font-bold text-white ${hero ? 'text-[19px] sm:text-[22px]' : 'text-[15px]'}`}>
        {item.title}
      </h3>
      <p className={`mt-1 ${hero ? 'text-sm text-ink-2' : 'text-[13px] text-ink-3'}`}>
        {hero ? 'Why now: ' : ''}
        {item.why}
      </p>
      {item.detail && hero && <p className="mt-2 text-[13px] text-ink-3">{item.detail}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onStatus(item.id, 'done')}
          className="h-9 rounded-[9px] bg-gold px-3.5 text-[12px] font-bold uppercase tracking-[0.05em] text-on-gold"
        >
          Done
        </button>
        {item.status !== 'today' && (
          <button
            onClick={() => onStatus(item.id, 'today')}
            className="h-9 rounded-[9px] border border-white/15 bg-white/[0.03] px-3.5 text-[12px] font-bold uppercase tracking-[0.05em] text-gold"
          >
            Today
          </button>
        )}
        {item.status !== 'waiting' && (
          <button
            onClick={() => onStatus(item.id, 'waiting')}
            className="h-9 rounded-[9px] border border-white/15 bg-white/[0.03] px-3.5 text-[12px] font-bold uppercase tracking-[0.05em] text-ink-2"
          >
            Waiting
          </button>
        )}
        <button
          onClick={() => onStatus(item.id, 'ignored')}
          className="h-9 rounded-[9px] border border-white/10 bg-transparent px-3.5 text-[12px] font-bold uppercase tracking-[0.05em] text-ink-4"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.22em] text-ink-2">
        {title}
        {typeof count === 'number' && <span className="ml-2 text-ink-4">{count}</span>}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function Brief() {
  const [key, setKey] = useState<string>(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [draft, setDraft] = useState('');
  const [data, setData] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // capture form
  const [capTitle, setCapTitle] = useState('');
  const [capWs, setCapWs] = useState('lola-leads');

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/brief`, { headers: { 'X-Admin-Key': key } });
      if (r.status === 503) throw new Error('No admin key set on the server yet. Add LOLA_SECRET_ADMIN_KEY in Railway, then reload.');
      if (r.status === 403) throw new Error('That admin key doesn’t match the one set in Railway.');
      if (!r.ok) throw new Error('Could not load the brief.');
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

  const onStatus = async (id: number, status: string) => {
    setBusy(true);
    try {
      await fetch(`${API_URL}/brief/items/${id}/status`, {
        method: 'POST',
        headers: { 'X-Admin-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally { setBusy(false); }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      await fetch(`${API_URL}/brief/refresh`, { method: 'POST', headers: { 'X-Admin-Key': key } });
      await load();
    } finally { setBusy(false); }
  };

  const capture = async () => {
    const title = capTitle.trim();
    if (!title) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/brief/capture`, {
        method: 'POST',
        headers: { 'X-Admin-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: capWs, title, type: 'task', status: 'inbox' }),
      });
      setCapTitle('');
      await load();
    } finally { setBusy(false); }
  };

  if (!key) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold text-white">Lola</h1>
        <p className="mt-2 text-sm text-ink-3">Enter your admin key.</p>
        <div className="mt-6 flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
            placeholder="admin key"
            className="h-11 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-white outline-none focus:border-gold/50"
          />
          <button onClick={saveKey} className="h-11 rounded-[10px] bg-gold px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-on-gold">
            Enter
          </button>
        </div>
      </main>
    );
  }

  const sb = data?.scoreboard;

  return (
    <main className="flex flex-1 flex-col py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">Lola</p>
          <h1 className="mt-1 text-[24px] font-bold text-white sm:text-[30px]">What needs you next.</h1>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={busy || loading}
          className="h-10 shrink-0 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-gold transition hover:border-gold/40 disabled:opacity-50"
        >
          {busy || loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="mt-5 rounded-[10px] border border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-300">{error}</p>}

      {/* Scoreboard — predictable monthly revenue toward the target */}
      {sb && (
        <div className="mt-5 rounded-[14px] border border-gold/25 bg-white/[0.02] p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">Predictable / mo</p>
              <p className="bg-gradient-to-br from-gold-hi via-gold-bright to-gold bg-clip-text text-[28px] font-extrabold leading-none text-transparent">
                ${Math.round(sb.total_monthly).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">Gap to ${Math.round(sb.target).toLocaleString()}</p>
              <p className="text-[20px] font-bold text-white">${Math.round(sb.gap).toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright" style={{ width: `${sb.pct_to_target}%` }} />
          </div>
        </div>
      )}

      {/* Inbox capture */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={capTitle}
          onChange={(e) => setCapTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void capture(); }}
          placeholder="Capture anything — idea, task, opportunity…"
          className="h-11 flex-1 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-gold/50"
        />
        <select
          value={capWs}
          onChange={(e) => setCapWs(e.target.value)}
          className="h-11 rounded-[10px] border border-white/[0.15] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-gold/50"
        >
          {(data?.workspaces || []).map((w) => (
            <option key={w.slug} value={w.slug} className="bg-on-gold">{w.label}</option>
          ))}
        </select>
        <button onClick={() => void capture()} disabled={busy} className="h-11 rounded-[10px] bg-gold px-5 text-[13px] font-bold uppercase tracking-[0.05em] text-on-gold disabled:opacity-50">
          Capture
        </button>
      </div>

      {data && (
        <>
          {/* THE one thing */}
          <Section title="Most important next step">
            {data.most_important_next_step ? (
              <ItemCard item={data.most_important_next_step} onStatus={onStatus} hero />
            ) : (
              <p className="rounded-[14px] border border-gold/20 bg-white/[0.02] p-5 text-sm text-ink-3">
                Nothing queued. Capture something above, or hit Refresh to pull in revenue signals.
              </p>
            )}
          </Section>

          {data.today.length > 0 && (
            <Section title="Today" count={data.today.length}>
              {data.today.map((i) => <ItemCard key={i.id} item={i} onStatus={onStatus} />)}
            </Section>
          )}

          {data.revenue_opportunities.length > 0 && (
            <Section title="Revenue — money waiting" count={data.counts.revenue}>
              {data.revenue_opportunities.map((i) => <ItemCard key={i.id} item={i} onStatus={onStatus} />)}
            </Section>
          )}

          {data.waiting_blocked.length > 0 && (
            <Section title="Waiting / blocked" count={data.counts.waiting}>
              {data.waiting_blocked.map((i) => <ItemCard key={i.id} item={i} onStatus={onStatus} />)}
            </Section>
          )}

          {data.active.length > 0 && (
            <Section title="Active" count={data.counts.active}>
              {data.active.map((i) => <ItemCard key={i.id} item={i} onStatus={onStatus} />)}
            </Section>
          )}

          {data.inbox.length > 0 && (
            <Section title="Inbox" count={data.counts.inbox}>
              {data.inbox.map((i) => <ItemCard key={i.id} item={i} onStatus={onStatus} />)}
            </Section>
          )}

          {data.completed.length > 0 && (
            <Section title="Recently done" count={data.completed.length}>
              <div className="flex flex-col gap-1.5">
                {data.completed.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.01] px-3 py-2">
                    <span className="text-[#28C840]">✓</span>
                    <span className="text-[13px] text-ink-3 line-through">{i.title}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-ink-4">{i.workspace_label}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </main>
  );
}
