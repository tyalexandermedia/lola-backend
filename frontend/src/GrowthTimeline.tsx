/**
 * GrowthTimeline — the fused per-client view that is Lola's differentiator:
 * WHAT WE SHIPPED · WHAT SEARCH DID · WHAT CAME IN, side by side on one weekly
 * grid. A plain CRM has the leads; nobody else puts the Search Console signal
 * next to them.
 *
 * Reads GET /api/clients/{id}/growth-timeline (admin-keyed). Renders the three
 * series with an inline SVG chart (no chart dependency). It NEVER claims the
 * work caused the leads — it lays the series side by side and lets the pattern
 * speak, and it says "not connected" / "no data yet" honestly instead of drawing
 * a flat line of zeros as if it were a measured result.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from './api';

const ADMIN_KEY_STORAGE = 'lola.adminKey';

type Mover = {
  query: string;
  from_position: number | null;
  to_position: number;
  delta: number | null;
  status: 'new' | 'up';
};

type Week = {
  period_start: string;
  period_end: string;
  impressions: number;
  clicks: number;
  leads_count: number;
  work_items: Array<{ title?: string; category?: string; url?: string }>;
};

type Timeline = {
  client_id: number;
  date_range: { start: string; end: string; weeks: number; days: number };
  weekly: Week[];
  query_movers: Mover[];
  has_gsc: boolean;
  has_leads: boolean;
  gsc_state: 'not_connected' | 'no_data_yet' | 'ok';
};

const GOLD = '#D4AF37';
const LEAD = '#4ADE80';
const WORK = '#7DA9F0';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GrowthTimeline({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName?: string;
}) {
  const [weeks, setWeeks] = useState(12);
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      let key = '';
      try {
        key = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
      } catch {
        key = '';
      }
      setLoading(true);
      setError(null);
      try {
        const url = `${API_URL}/api/clients/${clientId}/growth-timeline?weeks=${weeks}${
          opts?.refresh ? '&refresh=1' : ''
        }`;
        const r = await fetch(url, { headers: { 'X-Admin-Key': key } });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${r.status})`);
        }
        setData((await r.json()) as Timeline);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [clientId, weeks],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const w = data?.weekly ?? [];
    return {
      impressions: w.reduce((s, x) => s + (x.impressions || 0), 0),
      clicks: w.reduce((s, x) => s + (x.clicks || 0), 0),
      leads: w.reduce((s, x) => s + (x.leads_count || 0), 0),
      work: w.reduce((s, x) => s + (x.work_items?.length || 0), 0),
    };
  }, [data]);

  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-white">
            Growth Timeline{clientName ? ` — ${clientName}` : ''}
          </h3>
          {data && (
            <p className="mt-0.5 text-[12px] text-[#8A8F98]">
              {fmtDate(data.date_range.start)} – {fmtDate(data.date_range.end)} · {data.date_range.weeks} weeks
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {[12, 26, 52].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={`rounded-[7px] px-2 py-1 text-[12px] font-semibold transition ${
                weeks === w
                  ? 'bg-[#D4AF37] text-black'
                  : 'border border-white/[0.1] text-[#9CA3AF] hover:text-white'
              }`}
            >
              {w}w
            </button>
          ))}
          <button
            onClick={() => load({ refresh: true })}
            disabled={loading}
            className="rounded-[7px] border border-white/[0.1] px-2 py-1 text-[12px] font-semibold text-[#9CA3AF] hover:text-white disabled:opacity-40"
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-[8px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">
          {error}
        </p>
      )}

      {/* Honest connection states */}
      {data && data.gsc_state === 'not_connected' && (
        <StateBanner
          title="Search Console isn't connected for this client yet"
          body="Leads and work are shown below; the search-visibility layer turns on once the property is wired to the service account."
        />
      )}
      {data && data.gsc_state === 'no_data_yet' && (
        <StateBanner
          title="No search impressions yet"
          body="The property is connected but Google hasn't reported impressions for this window. It fills in as data accrues."
        />
      )}

      {data && (
        <>
          {/* Summary tiles */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Impressions" value={totals.impressions} dot={GOLD} />
            <Tile label="Clicks" value={totals.clicks} dot={GOLD} muted />
            <Tile label="Leads" value={totals.leads} dot={LEAD} />
            <Tile label="Work shipped" value={totals.work} dot={WORK} />
          </div>

          <Chart weekly={data.weekly} hover={hover} setHover={setHover} />

          {/* Hovered / latest week detail */}
          <WeekDetail weekly={data.weekly} index={hover} />

          {/* Query movers */}
          {data.query_movers.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A8F98]">
                Queries on the move
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {data.query_movers.slice(0, 12).map((m) => (
                  <span
                    key={m.query}
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[12px] text-white"
                    title={
                      m.status === 'new'
                        ? `New in the top set at position ${m.to_position}`
                        : `Moved up ${m.delta} places to ${m.to_position}`
                    }
                  >
                    <span className={m.status === 'new' ? 'text-[#4ADE80]' : 'text-[#D4AF37]'}>
                      {m.status === 'new' ? '✦ new' : `▲ ${m.delta}`}
                    </span>
                    <span className="text-[#C9CDD4]">{m.query}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-[#6B7280]">
            What we shipped, what search did, and what came in — on one grid, in order. A timeline, not
            a cause-and-effect claim. Search data ends {fmtDate(data.date_range.end)} (Google reports a
            few days behind).
          </p>
        </>
      )}

      {!data && !error && (
        <p className="mt-3 text-[12px] text-[#8A8F98]">{loading ? 'Loading timeline…' : ' '}</p>
      )}
    </div>
  );
}

function StateBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3 rounded-[8px] border border-white/[0.08] bg-white/[0.02] px-3 py-2">
      <p className="text-[12px] font-semibold text-[#C9CDD4]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#8A8F98]">{body}</p>
    </div>
  );
}

function Tile({
  label,
  value,
  dot,
  muted,
}: {
  label: string;
  value: number;
  dot: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-[9px] border border-white/[0.06] bg-white/[0.015] px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-[#8A8F98]">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot, opacity: muted ? 0.5 : 1 }} />
        {label}
      </span>
      <span className="mt-0.5 block text-[18px] font-bold text-white">{value.toLocaleString()}</span>
    </div>
  );
}

/** Inline SVG: impressions area (gold) + leads bars (green) + work markers (blue dots). */
function Chart({
  weekly,
  hover,
  setHover,
}: {
  weekly: Week[];
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  const W = 720;
  const H = 190;
  const padL = 4;
  const padR = 4;
  const padT = 16;
  const padB = 22;
  const n = weekly.length;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxImp = Math.max(1, ...weekly.map((w) => w.impressions));
  const maxLeads = Math.max(1, ...weekly.map((w) => w.leads_count));

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yImp = (v: number) => padT + innerH - (v / maxImp) * innerH;

  const linePts = weekly.map((w, i) => `${x(i)},${yImp(w.impressions)}`).join(' ');
  const areaPts = `${padL},${padT + innerH} ${linePts} ${padL + innerW},${padT + innerH}`;

  const bandW = n > 0 ? innerW / n : innerW;
  const barW = Math.max(3, Math.min(14, bandW * 0.36));

  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Growth timeline chart">
        <defs>
          <linearGradient id="gt-imp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* impressions area + line */}
        <polygon points={areaPts} fill="url(#gt-imp)" />
        <polyline points={linePts} fill="none" stroke={GOLD} strokeWidth="2" />

        {weekly.map((w, i) => {
          const cx = x(i);
          const leadH = (w.leads_count / maxLeads) * (innerH * 0.55);
          const active = hover === i;
          return (
            <g key={w.period_start}>
              {/* leads bar */}
              {w.leads_count > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={padT + innerH - leadH}
                  width={barW}
                  height={leadH}
                  rx={2}
                  fill={LEAD}
                  opacity={active ? 1 : 0.85}
                />
              )}
              {/* impressions node */}
              <circle cx={cx} cy={yImp(w.impressions)} r={active ? 3.5 : 2} fill={GOLD} />
              {/* work marker */}
              {w.work_items.length > 0 && (
                <g>
                  <circle cx={cx} cy={padT - 6} r={3.5} fill={WORK}>
                    <title>{w.work_items.map((it) => `• ${it.title || it.category}`).join('\n')}</title>
                  </circle>
                  {w.work_items.length > 1 && (
                    <text x={cx + 5} y={padT - 3} fontSize="8" fill={WORK}>
                      {w.work_items.length}
                    </text>
                  )}
                </g>
              )}
              {/* hover capture */}
              <rect
                x={cx - bandW / 2}
                y={0}
                width={bandW}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {/* sparse x labels */}
              {(i === 0 || i === n - 1 || (n > 4 && i === Math.floor(n / 2))) && (
                <text x={cx} y={H - 6} fontSize="9" fill="#6B7280" textAnchor="middle">
                  {fmtDate(w.period_start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function WeekDetail({ weekly, index }: { weekly: Week[]; index: number | null }) {
  const i = index ?? weekly.length - 1;
  const w = weekly[i];
  if (!w) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#C9CDD4]">
      <span className="font-semibold text-white">Week of {fmtDate(w.period_start)}</span>
      <span><b className="text-[#D4AF37]">{w.impressions.toLocaleString()}</b> impressions</span>
      <span><b className="text-[#D4AF37]">{w.clicks.toLocaleString()}</b> clicks</span>
      <span><b className="text-[#4ADE80]">{w.leads_count}</b> leads</span>
      {w.work_items.length > 0 && (
        <span className="text-[#7DA9F0]">
          {w.work_items.map((it) => it.title || it.category).filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}
