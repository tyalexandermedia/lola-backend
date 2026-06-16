import { useEffect, useMemo, useState } from 'react';
import { API_URL } from './api';

type RankPoint = { position: number | null; mentioned: boolean; competitors?: string[]; run_at: string };

interface Series {
  query: string;
  source: 'google_organic' | 'claude_ai_mode';
  current: RankPoint;
  history: RankPoint[];
  run_count: number;
}

type TaskItem = {
  title: string;
  category: string;
  detail: string | null;
  url: string | null;
  week_of: string | null;
  created_at: string;
};

interface Implementation {
  done: TaskItem[];
  in_progress: TaskItem[];
  next_up: TaskItem[];
  counts: Record<string, number>;
  total_done: number;
}

interface DashboardPayload {
  slug: string;
  client_name: string;
  target_url: string;
  google: Series[];
  ai_mode: Series[];
  implementation?: Implementation;
  share_of_voice?: ShareOfVoice;
  tracking?: Record<string, { month: number; last_30d: number; lifetime: number }>;
  generated_at: string;
}

interface ShareOfVoiceWindow {
  pct: number;
  mentions: number;
  total: number;
}

interface ShareOfVoice {
  lifetime: ShareOfVoiceWindow;
  last_30d: ShareOfVoiceWindow;
  prev_30d: ShareOfVoiceWindow;
  delta_pts: number;
  queries_tracked: number;
}

export default function ClientReport({ slug }: { slug: string }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/reporting/public/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) throw new Error('No dashboard exists for that link.');
        if (!r.ok) throw new Error(`Failed to load (HTTP ${r.status}).`);
        return r.json() as Promise<DashboardPayload>;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl py-12 text-center text-[#9AA0A6]">
        Loading client dashboard…
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-4xl py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Dashboard not found</h1>
        <p className="mt-3 text-[14px] text-[#9AA0A6]">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <Header data={data} />
      {data.tracking && <TrackingRow tracking={data.tracking} />}
      <SummaryStrip google={data.google} aiMode={data.ai_mode} />

      {data.implementation && <WorkDelivered impl={data.implementation} />}

      <section className="mt-8">
        <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
          Google Search Rankings
        </h2>
        {data.google.length === 0 ? (
          <EmptyHint label="No ranking snapshots yet — the first run lands as soon as the tracker runs." />
        ) : (
          <div className="space-y-4">
            {data.google.map((s) => (
              <RankingCard key={`g-${s.query}`} series={s} />
            ))}
          </div>
        )}
      </section>

      {data.share_of_voice && data.share_of_voice.lifetime.total > 0 && (
        <ShareOfVoiceCard sov={data.share_of_voice} />
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
          AI Search Visibility
          <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#9AA0A6]">
            Are AI assistants recommending you?
          </span>
        </h2>
        {data.ai_mode.length === 0 ? (
          <EmptyHint label="No AI Mode snapshots yet." />
        ) : (
          <AIModeTable series={data.ai_mode} />
        )}
      </section>

      <p className="mt-10 text-center text-[12px] text-[#6B7280]">
        Updated {fmtDateTime(data.generated_at)} · powered by Lola SEO
      </p>
    </main>
  );
}

function Header({ data }: { data: DashboardPayload }) {
  return (
    <header className="mb-8 rounded-2xl border border-[#D4AF37]/20 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">
        Retainer Dashboard
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{data.client_name}</h1>
      {data.target_url && (
        <a
          href={data.target_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[13px] text-[#F4D47C] underline-offset-2 hover:underline"
        >
          {data.target_url} ↗
        </a>
      )}
    </header>
  );
}

/**
 * Share-of-Voice card — the killer AI-visibility metric stolen from
 * Profound's playbook. Shows the % of tracked AI queries where the
 * client got named, with a 30-day delta vs the prior 30 days so the
 * client sees movement, not a flat number.
 */
function ShareOfVoiceCard({ sov }: { sov: ShareOfVoice }) {
  const live = sov.last_30d;
  const delta = sov.delta_pts;
  const deltaColor = delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-[#9AA0A6]';
  const deltaArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·';
  // Pick the headline tone by current value, not delta.
  const headlineColor = live.pct >= 50 ? 'text-emerald-300' : live.pct >= 20 ? '#F4D47C' : '#F59E0B';

  return (
    <section className="mt-10 rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#15110A] p-6 shadow-[0_0_36px_rgba(212,175,55,0.10)] sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
            AI Share of Voice
          </p>
          <p className="mt-2 max-w-[460px] text-[13px] leading-[1.55] text-[#9CA3AF] sm:text-[14px]">
            Of every AI query we tested across {sov.queries_tracked} tracked prompt{sov.queries_tracked === 1 ? '' : 's'} in the last 30 days,
            this is the percent where AI agents actually named you.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-3 sm:flex-col sm:items-end">
          <span
            className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[56px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[64px]"
            style={{ color: headlineColor }}
          >
            {live.pct}%
          </span>
          <span className="text-[12px] text-[#9CA3AF]">
            {live.mentions}/{live.total} runs · last 30d
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-[10px] bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">Vs prior 30d</p>
          <p className={`mt-1 text-[16px] font-bold ${deltaColor}`}>
            {deltaArrow} {Math.abs(delta)} pts
          </p>
        </div>
        <div className="rounded-[10px] bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">Prior 30d</p>
          <p className="mt-1 text-[16px] font-bold text-[#E8E4D8]">{sov.prev_30d.pct}%</p>
        </div>
        <div className="rounded-[10px] bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">Lifetime</p>
          <p className="mt-1 text-[16px] font-bold text-[#E8E4D8]">{sov.lifetime.pct}%</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Calls / Leads / Clicks billing row — the ROI proof at the top of the
 * dashboard. Shows "this month" big with last-30d + lifetime context.
 * Only the events captured via the client's tracked links populate here.
 */
function TrackingRow({ tracking }: { tracking: Record<string, { month: number; last_30d: number; lifetime: number }> }) {
  const cells = [
    { key: 'call', label: 'Calls', emoji: '📞', accent: '#6EE7B7' },
    { key: 'lead', label: 'Leads', emoji: '📝', accent: '#F4D47C' },
    { key: 'click', label: 'Clicks', emoji: '👆', accent: '#93C5FD' },
  ];
  const anyData = cells.some((c) => (tracking[c.key]?.lifetime || 0) > 0);

  return (
    <section className="mb-6 rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#15110A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Results this month — calls · leads · clicks
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {cells.map((c) => {
          const t = tracking[c.key] || { month: 0, last_30d: 0, lifetime: 0 };
          return (
            <div key={c.key} className="rounded-[12px] border border-white/10 bg-[#0F0F12] p-4 text-center">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">{c.emoji} {c.label}</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none" style={{ color: c.accent }}>{t.month}</p>
              <p className="mt-2 text-[11px] text-[#6B7280]">30d: {t.last_30d} · all: {t.lifetime}</p>
            </div>
          );
        })}
      </div>
      {!anyData && (
        <p className="mt-3 text-[11px] leading-[1.5] text-[#6B7280]">
          Tracking links not live yet — once your Call button + website link route through Lola, calls, leads, and clicks land here automatically.
        </p>
      )}
    </section>
  );
}

function SummaryStrip({ google, aiMode }: { google: Series[]; aiMode: Series[] }) {
  const ranked = google.filter((s) => s.current?.position !== null && s.current?.position !== undefined).length;
  const top3 = google.filter((s) => (s.current?.position ?? 99) <= 3).length;
  const top10 = google.filter((s) => (s.current?.position ?? 99) <= 10).length;
  const aiHits = aiMode.filter((s) => s.current?.mentioned).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatPill label="Keywords tracked" value={google.length} />
      <StatPill label="Currently ranked" value={ranked} accent={ranked > 0 ? '#10B981' : '#6B7280'} />
      <StatPill label="Top 10" value={top10} accent={top10 > 0 ? '#F4D47C' : '#6B7280'} />
      <StatPill
        label={`AI mentions (${aiMode.length})`}
        value={aiHits}
        accent={aiHits > 0 ? '#10B981' : '#6B7280'}
        sub={`Top 3: ${top3}`}
      />
    </div>
  );
}

function StatPill({
  label, value, accent = '#F4D47C', sub,
}: { label: string; value: number; accent?: string; sub?: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#11121A] px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9AA0A6]">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none" style={{ color: accent }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#9AA0A6]">{sub}</p>}
    </div>
  );
}

function RankingCard({ series }: { series: Series }) {
  const positions = series.history.map((p) => p.position);
  const first = positions.find((p) => p !== null && p !== undefined) ?? null;
  const last = [...positions].reverse().find((p) => p !== null && p !== undefined) ?? null;
  const delta = first !== null && last !== null ? first - last : null;

  return (
    <article className="rounded-[14px] border border-white/10 bg-[#11121A] p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-white">{series.query}</p>
          <p className="mt-0.5 text-[11px] text-[#9AA0A6]">{series.run_count} snapshot{series.run_count === 1 ? '' : 's'}</p>
        </div>
        <div className="text-right">
          <CurrentPositionBadge position={series.current?.position ?? null} />
          {delta !== null && delta !== 0 && (
            <p className={`mt-1 text-[12px] font-semibold ${delta > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {delta > 0 ? `↑ ${delta} since first run` : `↓ ${Math.abs(delta)} since first run`}
            </p>
          )}
        </div>
      </div>
      <RankSparkline history={series.history} />
    </article>
  );
}

function CurrentPositionBadge({ position }: { position: number | null }) {
  if (position === null || position === undefined) {
    return (
      <span className="inline-block rounded-[8px] border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] font-medium text-[#9AA0A6]">
        Not in top 10
      </span>
    );
  }
  const color = position <= 3 ? '#10B981' : position <= 5 ? '#F4D47C' : '#F59E0B';
  return (
    <span
      className="inline-block rounded-[8px] border px-3 py-1 text-[14px] font-bold"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
    >
      #{position}
    </span>
  );
}

function RankSparkline({ history }: { history: RankPoint[] }) {
  // Lower position = better, so we invert the Y axis (#1 at top).
  // Missing positions render as a gap (we skip from the polyline).
  const W = 520;
  const H = 80;
  const PADDING_X = 8;
  const PADDING_Y = 8;
  const MAX_POSITION = 10;
  const pts = useMemo(() => {
    if (history.length === 0) return [] as Array<{ x: number; y: number; pos: number | null }>;
    return history.map((h, i) => {
      const x = PADDING_X + (i * (W - 2 * PADDING_X)) / Math.max(1, history.length - 1);
      const pos = h.position;
      const y = pos === null || pos === undefined
        ? null
        : PADDING_Y + ((pos - 1) * (H - 2 * PADDING_Y)) / (MAX_POSITION - 1);
      return { x, y: y as number | null, pos };
    });
  }, [history]);

  if (pts.length === 0) return null;

  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  for (const p of pts) {
    if (p.y === null) {
      if (current.length > 0) { segments.push(current); current = []; }
    } else {
      current.push({ x: p.x, y: p.y });
    }
  }
  if (current.length > 0) segments.push(current);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" aria-hidden>
      {/* horizontal #1/#5/#10 reference lines */}
      {[1, 5, 10].map((pos) => {
        const y = PADDING_Y + ((pos - 1) * (H - 2 * PADDING_Y)) / (MAX_POSITION - 1);
        return (
          <g key={pos}>
            <line x1={PADDING_X} x2={W - PADDING_X} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={W - PADDING_X} y={y - 2} fontSize={9} fill="rgba(255,255,255,0.25)" textAnchor="end">#{pos}</text>
          </g>
        );
      })}
      {/* line segments (skips gaps when position null) */}
      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#F4D47C"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* points */}
      {pts.map((p, i) =>
        p.y === null ? (
          <circle key={i} cx={p.x} cy={H - PADDING_Y - 1} r={2.5} fill="#6B7280" />
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#F4D47C" />
        )
      )}
    </svg>
  );
}

function AIModeTable({ series }: { series: Series[] }) {
  return (
    <div className="space-y-3">
      {series.map((s) => {
        const hits = s.history.filter((h) => h.mentioned).length;
        const rate = s.history.length === 0 ? 0 : Math.round((hits / s.history.length) * 100);
        const competitors = s.current?.competitors || [];
        return (
          <div key={`ai-${s.query}`} className="rounded-[12px] border border-white/10 bg-[#11121A] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-medium text-white">{s.query}</p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9AA0A6]">{rate}% hit · {s.history.length} run{s.history.length === 1 ? '' : 's'}</span>
                {s.current?.mentioned ? (
                  <span className="rounded-[6px] bg-emerald-500/15 px-2.5 py-1 text-[12px] font-bold text-emerald-300">RECOMMENDED ✓</span>
                ) : (
                  <span className="rounded-[6px] bg-red-500/10 px-2.5 py-1 text-[12px] font-bold text-red-300">NOT MENTIONED</span>
                )}
              </div>
            </div>
            {!s.current?.mentioned && competitors.length > 0 && (
              <div className="mt-3 rounded-[8px] border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-300/90">AI recommended instead:</p>
                <p className="mt-1 text-[13px] text-[#E5E7EB]">{competitors.join(' · ')}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkDelivered({ impl }: { impl: Implementation }) {
  const c = impl.counts || {};
  const stats = [
    { label: 'Content shipped', value: c.content || 0 },
    { label: 'Citations built', value: c.citation || 0 },
    { label: 'Reviews requested', value: c.review || 0 },
    { label: 'Fixes + GBP', value: (c.fix || 0) + (c.gbp || 0) + (c.other || 0) },
  ];
  const nothingYet =
    impl.done.length === 0 && impl.in_progress.length === 0 && impl.next_up.length === 0;

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
        Work Delivered
        <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#9AA0A6]">
          What Lola did between snapshots
        </span>
      </h2>

      {nothingYet ? (
        <EmptyHint label="Your work feed updates as Lola ships fixes, content, citations, and reviews." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-[12px] border border-white/10 bg-[#11121A] px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9AA0A6]">{s.label}</p>
                <p className="mt-1 text-[28px] font-bold leading-none text-[#F4D47C]">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TaskColumn title="Done" emoji="✅" accent="#10B981" tasks={impl.done} />
            <TaskColumn title="In progress" emoji="🔧" accent="#F4D47C" tasks={impl.in_progress} />
            <TaskColumn title="Next up" emoji="⏭" accent="#9AA0A6" tasks={impl.next_up} />
          </div>
        </>
      )}
    </section>
  );
}

function TaskColumn({
  title, emoji, accent, tasks,
}: { title: string; emoji: string; accent: string; tasks: TaskItem[] }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-[#11121A] p-4">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: accent }}>
        <span aria-hidden>{emoji}</span>
        {title}
        <span className="text-[#6B7280]">({tasks.length})</span>
      </p>
      {tasks.length === 0 ? (
        <p className="text-[13px] text-[#6B7280]">—</p>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((t, i) => (
            <li key={i} className="text-[13px] leading-[1.45] text-[#E5E7EB]">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                <span>
                  {t.url ? (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-[#F4D47C] underline-offset-2 hover:underline">
                      {t.title}
                    </a>
                  ) : (
                    t.title
                  )}
                  {t.detail && <span className="block text-[11px] text-[#9AA0A6]">{t.detail}</span>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-white/10 bg-[#11121A] px-5 py-8 text-center text-[14px] text-[#9AA0A6]">
      {label}
    </div>
  );
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
