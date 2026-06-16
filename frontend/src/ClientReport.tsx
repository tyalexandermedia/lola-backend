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
  tracking_sources?: Record<string, Record<string, number>>;
  tracking_trends?: Record<string, { month: number; prev_month: number; delta: number; arrow: string }>;
  funnel?: { view: number; click: number; call: number; lead: number; click_rate: number; call_rate: number; lead_rate: number; overall: number };
  reviews?: { month: number; lifetime: number; google_routed_month: number };
  call_quality?: { month: number; qualified_month: number; long_month: number; lifetime: number; avg_duration_sec: number };
  search_console?: {
    gsc?: { error?: string | null; clicks: number; impressions: number; ctr: number; position: number; clicks_prev: number; impressions_prev: number; top_queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>; top_pages: Array<{ page: string; clicks: number; impressions: number }> } | null;
    ga?: { error?: string | null; organic_sessions: number; organic_sessions_prev: number } | null;
    fetched_at?: string;
  } | null;
  attributed_value?: {
    value: number; contacts: number; calls: number; leads: number;
    close_rate: number; avg_job_value: number;
  };
  annualized?: { yearly_run_rate: number; monthly: number };
  cost_per_lead?: { cpl: number | null; contacts: number; retainer: number };
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
      {data.attributed_value && data.attributed_value.contacts > 0 && (
        <BillingProofRow a={data.attributed_value} ann={data.annualized} cpl={data.cost_per_lead} />
      )}
      {data.tracking && (
        <TrackingRow tracking={data.tracking} sources={data.tracking_sources} trends={data.tracking_trends} />
      )}
      {data.search_console?.gsc && !data.search_console.gsc.error && <SearchConsoleCard sc={data.search_console} />}
      {data.call_quality && data.call_quality.lifetime > 0 && <CallQualityCard q={data.call_quality} />}
      {data.funnel && (data.funnel.view > 0 || data.funnel.click > 0) && <FunnelCard f={data.funnel} />}
      {data.reviews && (data.reviews.month > 0 || data.reviews.lifetime > 0) && <ReviewsCard r={data.reviews} />}
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
 * Billing-proof row — three cards across the top of the dashboard:
 *   1. Value Lola drove this month ($ — the headline number)
 *   2. Cost per Lead (vs paid ads — the negotiation wedge)
 *   3. Annualized run-rate (frames the retainer in yearly terms)
 *
 * Together: this is what justifies the retainer at renewal + raises.
 */
function BillingProofRow({
  a, ann, cpl,
}: {
  a: NonNullable<DashboardPayload['attributed_value']>;
  ann?: DashboardPayload['annualized'];
  cpl?: DashboardPayload['cost_per_lead'];
}) {
  const pct = Math.round(a.close_rate * 100);
  const cplStr = cpl && cpl.cpl !== null ? `$${cpl.cpl.toLocaleString()}` : '—';
  return (
    <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {/* Headline $ value */}
      <div className="rounded-2xl border-2 border-[#D4AF37]/45 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-transparent p-5 shadow-[0_0_28px_rgba(212,175,55,0.12)] sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          Revenue Lola drove · this month
        </p>
        <p className="mt-2 bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[40px] font-extrabold leading-none tracking-[-0.025em] text-transparent sm:text-[48px]">
          ${a.value.toLocaleString()}
        </p>
        <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
          {a.contacts} contact{a.contacts === 1 ? '' : 's'} × {pct}% close × ${a.avg_job_value.toLocaleString()} avg job
        </p>
      </div>

      {/* CPL — the comparison wedge */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
          Cost per contact
        </p>
        <p className="mt-2 text-[40px] font-extrabold leading-none tracking-[-0.025em] text-emerald-300 sm:text-[48px]">
          {cplStr}
        </p>
        <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
          ${cpl?.retainer || 697}/mo retainer ÷ {cpl?.contacts || 0} contacts ·{' '}
          <span className="text-emerald-300/85">Paid ads CPL: $50–$200</span>
        </p>
      </div>

      {/* Annualized */}
      <div className="rounded-2xl border border-[#93C5FD]/30 bg-[#93C5FD]/[0.03] p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#93C5FD]">
          Tracking to · per year
        </p>
        <p className="mt-2 text-[40px] font-extrabold leading-none tracking-[-0.025em] text-[#93C5FD] sm:text-[48px]">
          ${(ann?.yearly_run_rate || 0).toLocaleString()}
        </p>
        <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
          At this month&apos;s pace × 12 mo · conservative no-growth projection
        </p>
      </div>
    </section>
  );
}

/**
 * Search Console + Analytics card — the client's REAL Google performance,
 * free data they rarely see clean. 28-day clicks / impressions / CTR / avg
 * position with month-over-month deltas, top queries, + GA organic sessions.
 * This is the 'free metrics to sell' layer — pure value, costs nothing.
 */
function SearchConsoleCard({ sc }: { sc: NonNullable<DashboardPayload['search_console']> }) {
  const g = sc.gsc!;
  const ga = sc.ga;
  const delta = (now: number, prev: number) => {
    if (!prev) return null;
    const d = Math.round(((now - prev) / prev) * 100);
    return d;
  };
  const cd = delta(g.clicks, g.clicks_prev);
  const idl = delta(g.impressions, g.impressions_prev);
  const tiles = [
    { label: 'Clicks', val: g.clicks.toLocaleString(), d: cd, accent: '#6EE7B7' },
    { label: 'Impressions', val: g.impressions.toLocaleString(), d: idl, accent: '#93C5FD' },
    { label: 'CTR', val: `${g.ctr}%`, d: null, accent: '#F4D47C' },
    { label: 'Avg position', val: g.position ? g.position.toFixed(1) : '—', d: null, accent: '#D4AF37', lowerBetter: true },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-[#93C5FD]/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#0A1018] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#93C5FD]">
        🔎 Google Search Console · last 28 days
        <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#9CA3AF]">
          your real Google performance
        </span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">{t.label}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none" style={{ color: t.accent }}>{t.val}</p>
            {t.d !== null && t.d !== undefined && (
              <p className={`mt-1 text-[11px] font-semibold ${t.d > 0 ? 'text-emerald-300' : t.d < 0 ? 'text-red-300' : 'text-[#6B7280]'}`}>
                {t.d > 0 ? '↑' : t.d < 0 ? '↓' : '·'} {Math.abs(t.d)}% vs prev 28d
              </p>
            )}
          </div>
        ))}
      </div>
      {ga && !ga.error && ga.organic_sessions > 0 && (
        <p className="mt-3 text-[12px] text-[#C8C0B0]">
          📊 Google Analytics: <span className="font-bold text-white">{ga.organic_sessions.toLocaleString()}</span> organic sessions
          {ga.organic_sessions_prev ? <span className="text-[#9CA3AF]"> (prev period {ga.organic_sessions_prev.toLocaleString()})</span> : null}
        </p>
      )}
      {g.top_queries && g.top_queries.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Top queries bringing you traffic</p>
          <div className="mt-2 space-y-1.5">
            {g.top_queries.slice(0, 5).map((q) => (
              <div key={q.query} className="flex items-center justify-between gap-3 rounded-[8px] border border-white/[0.06] bg-[#0F0F12] px-3 py-2">
                <span className="truncate text-[13px] text-white">{q.query}</span>
                <span className="shrink-0 text-[11px] text-[#9CA3AF]">{q.clicks} clicks · #{q.position}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {sc.fetched_at && (
        <p className="mt-3 text-[10px] text-[#6B7280]">Updated {fmtDateTime(sc.fetched_at)}</p>
      )}
    </section>
  );
}

/**
 * Call quality card — REAL tracked calls (via the Lola call-tracking
 * number), counted by quality. No caller numbers here (PII → admin-only +
 * private client report). 'Qualified' = answered & ≥30s; 'long' = ≥2min
 * (almost always a real job conversation). avg duration in m:ss.
 */
function CallQualityCard({ q }: { q: NonNullable<DashboardPayload['call_quality']> }) {
  const mins = Math.floor(q.avg_duration_sec / 60);
  const secs = q.avg_duration_sec % 60;
  return (
    <section className="mt-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#0A1410] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
        📞 Tracked calls · this month
        <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#9CA3AF]">
          real calls through your Lola tracking number
        </span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Total calls</p>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-white">{q.month}</p>
        </div>
        <div className="rounded-[10px] border border-emerald-500/20 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Qualified ≥30s</p>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-emerald-300">{q.qualified_month}</p>
        </div>
        <div className="rounded-[10px] border border-emerald-500/20 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Long ≥2 min</p>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-[#6EE7B7]">{q.long_month}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Avg length</p>
          <p className="mt-1 text-[26px] font-extrabold leading-none text-[#F4D47C]">{mins}:{String(secs).padStart(2, '0')}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">
        Qualified + long calls are the ones most likely to be real jobs. Full caller log (with numbers) is in your private weekly report.
      </p>
    </section>
  );
}

/**
 * Funnel card — View → Click → Call → Lead with drop-off %. Proves the
 * system works at every stage of the customer journey, not just the
 * end number. Worth its weight in renewal conversations.
 */
function FunnelCard({ f }: { f: NonNullable<DashboardPayload['funnel']> }) {
  const steps = [
    { k: 'view', n: f.view, label: 'Views', accent: '#9CA3AF', rate: null as number | null },
    { k: 'click', n: f.click, label: 'Clicks', accent: '#93C5FD', rate: f.click_rate },
    { k: 'call', n: f.call, label: 'Calls', accent: '#6EE7B7', rate: f.call_rate },
    { k: 'lead', n: f.lead, label: 'Leads', accent: '#F4D47C', rate: f.lead_rate },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Conversion funnel · this month
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {steps.map((s) => (
          <div key={s.k} className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">{s.label}</p>
            <p className="mt-1 text-[24px] font-extrabold leading-none" style={{ color: s.accent }}>{s.n}</p>
            {s.rate !== null && s.rate !== undefined && (
              <p className="mt-1 text-[10px] text-[#6B7280]">{s.rate}% from prev</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">
        Overall view → contact: <span className="text-white">{f.overall}%</span>. Lola optimizes every step.
      </p>
    </section>
  );
}

/**
 * Reviews card — surfaces the existing reviews module's data per client
 * (matched by business name). Reviews are the #2 ranking signal in
 * local search after GBP completeness — counting them here proves we're
 * actively building the asset.
 */
function ReviewsCard({ r }: { r: NonNullable<DashboardPayload['reviews']> }) {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Reviews collected
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">This month</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[#F4D47C]">{r.month}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Lifetime</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-white">{r.lifetime}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">→ Google</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-emerald-300">{r.google_routed_month}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">
        Star rating is the #1 conversion lever in local search. Lola routes 4–5★ to Google, 1–3★ to private feedback.
      </p>
    </section>
  );
}

/**
 * Calls / Leads / Clicks billing row — the ROI proof at the top of the
 * dashboard. Shows "this month" big with last-30d + lifetime context.
 * Source breakdown below each metric so the client can see WHERE Lola
 * earned the call (GBP, website, AI search, etc.) — the attribution
 * proof that "yes, this lead came from our system."
 */
function TrackingRow({
  tracking, sources, trends,
}: {
  tracking: Record<string, { month: number; last_30d: number; lifetime: number }>;
  sources?: Record<string, Record<string, number>>;
  trends?: Record<string, { month: number; prev_month: number; delta: number; arrow: string }>;
}) {
  const cells = [
    { key: 'call', label: 'Calls', emoji: '📞', accent: '#6EE7B7' },
    { key: 'lead', label: 'Leads', emoji: '📝', accent: '#F4D47C' },
    { key: 'click', label: 'Clicks', emoji: '👆', accent: '#93C5FD' },
  ];
  const anyData = cells.some((c) => (tracking[c.key]?.lifetime || 0) > 0);

  const sourceLabel = (s: string): string => ({
    gbp: 'GBP', website: 'Website', ai_search: 'AI Search',
    social: 'Social', form: 'Form', '(direct)': 'Direct',
  }[s] || s);

  return (
    <section className="mb-6 rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#15110A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Results this month — calls · leads · clicks
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {cells.map((c) => {
          const t = tracking[c.key] || { month: 0, last_30d: 0, lifetime: 0 };
          const src = (sources && sources[c.key]) || {};
          const srcEntries = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const tr = trends?.[c.key];
          const arrowColor = tr && tr.delta > 0 ? 'text-emerald-300' : tr && tr.delta < 0 ? 'text-red-300' : 'text-[#6B7280]';
          return (
            <div key={c.key} className="rounded-[12px] border border-white/10 bg-[#0F0F12] p-4 text-center">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">{c.emoji} {c.label}</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none" style={{ color: c.accent }}>{t.month}</p>
              {tr && (
                <p className={`mt-1 text-[11px] font-semibold ${arrowColor}`}>
                  {tr.arrow} {tr.delta !== 0 ? `${tr.delta > 0 ? '+' : ''}${tr.delta}` : 'flat'} vs last mo
                </p>
              )}
              <p className="mt-2 text-[11px] text-[#6B7280]">30d: {t.last_30d} · all: {t.lifetime}</p>
              {srcEntries.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  {srcEntries.map(([s, n]) => (
                    <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#C8C0B0]">
                      {sourceLabel(s)} {n}
                    </span>
                  ))}
                </div>
              )}
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
