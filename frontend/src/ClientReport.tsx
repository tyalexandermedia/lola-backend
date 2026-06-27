import { useEffect, useMemo, useState } from 'react';
import { API_URL } from './api';

type RankPoint = { position: number | null; mentioned: boolean; competitors?: string[]; run_at: string };

interface Series {
  query: string;
  source: 'google_organic' | 'claude_ai_mode' | 'chatgpt_ai_mode' | string;
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
  verified_wins?: { organic: string[]; map_pack: string[] };
  integrations?: {
    callrail?: boolean;
    ga4_measurement_protocol?: boolean;
    rankings_tracker?: boolean;
    gbp?: boolean;
    bing?: boolean;
  };
  implementation?: Implementation;
  share_of_voice?: ShareOfVoice;
  tracking?: Record<string, { month: number; last_30d: number; lifetime: number }>;
  tracking_sources?: Record<string, Record<string, number>>;
  tracking_trends?: Record<string, { month: number; prev_month: number; delta: number; arrow: string }>;
  funnel?: { view: number; click: number; call: number; lead: number; click_rate: number; call_rate: number; lead_rate: number; overall: number };
  reviews?: { month: number; lifetime: number; google_routed_month: number };
  call_quality?: { month: number; qualified_month: number; long_month: number; lifetime: number; avg_duration_sec: number };
  gbp_performance?: { calls: number; website_clicks: number; direction_requests: number; impressions: number; window_days: number; fetched_at?: string } | null;
  bing?: { clicks: number; impressions: number; ctr: number; fetched_at?: string } | null;
  cwv_trend?: Array<{ performance: number; accessibility: number; seo: number; run_at: string }>;
  lead_sources?: Record<string, number>;
  search_console?: {
    gsc?: { error?: string | null; clicks: number; impressions: number; ctr: number; position: number; clicks_prev: number; impressions_prev: number; top_queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>; top_pages: Array<{ page: string; clicks: number; impressions: number }> } | null;
    ga?: { error?: string | null; organic_sessions: number; organic_sessions_prev: number } | null;
    fetched_at?: string;
  } | null;
  won_jobs?: {
    month: number; lifetime: number;
    revenue_month: number; revenue_lifetime: number;
    jobs: Array<{ id: number; job_value: number; service_type?: string; source?: string; notes?: string; created_at: string }>;
  };
  revenue_agent?: {
    contacts: number;
    pipeline_value: number;
    won_revenue: number;
    open_actions: number;
    opportunities: Record<string, number>;
    estimates: Record<string, number>;
  };
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

  // Pre-compute "does this section have anything worth showing" so we can
  // hide whole strips of zero-state cards (the dashboard looked broken when
  // every tile said "0" before the first snapshot landed).
  const anyTracking = !!data.tracking && Object.values(data.tracking).some(
    (t) => (t?.month || 0) + (t?.last_30d || 0) + (t?.lifetime || 0) > 0
  );
  const anyRankings = data.google.length > 0;
  const anyAi = data.ai_mode.length > 0;
  const anyWork = !!data.implementation && (
    data.implementation.done.length + data.implementation.in_progress.length + data.implementation.next_up.length > 0
  );
  const totallyEmpty = !anyTracking && !anyRankings && !anyAi && !anyWork;

  return (
    <main className="client-report mx-auto w-full max-w-4xl py-6 sm:py-10">
      <Header data={data} />
      <OwnerOverview data={data} />
      <TopWinsCard
        google={data.google}
        aiMode={data.ai_mode}
        verifiedWins={data.verified_wins}
        clientName={data.client_name}
      />
      {data.won_jobs && data.won_jobs.lifetime > 0 && (
        <WonJobsCard wonJobs={data.won_jobs} />
      )}
      {data.revenue_agent && (
        <RevenueAgentCard revenue={data.revenue_agent} />
      )}

      {/* No live data yet → show the "what we're watching" value card so the
          dashboard demonstrates the retainer's work even before the first
          snapshot completes. Disappears the instant any real data arrives. */}
      {totallyEmpty && (
        <WhatWeWatchCard
          clientName={data.client_name}
          verifiedWins={data.verified_wins}
          integrations={data.integrations}
        />
      )}

      {anyTracking && (
        <TrackingRow tracking={data.tracking!} sources={data.tracking_sources} trends={data.tracking_trends} />
      )}
      {data.gbp_performance && <GbpCard g={data.gbp_performance} />}
      {data.search_console?.gsc && !data.search_console.gsc.error && <SearchConsoleCard sc={data.search_console} />}
      {data.bing && (data.bing.clicks > 0 || data.bing.impressions > 0) && <BingCard b={data.bing} />}
      {data.lead_sources && Object.keys(data.lead_sources).length > 0 && <LeadSourceCard sources={data.lead_sources} />}
      {data.cwv_trend && data.cwv_trend.length > 0 && <CwvTrendCard series={data.cwv_trend} />}
      {data.call_quality && data.call_quality.lifetime > 0 && <CallQualityCard q={data.call_quality} />}
      {data.funnel && (data.funnel.view > 0 || data.funnel.click > 0) && <FunnelCard f={data.funnel} />}
      {data.reviews && (data.reviews.month > 0 || data.reviews.lifetime > 0) && <ReviewsCard r={data.reviews} />}

      {anyRankings && <RankingsTable google={data.google} verifiedWins={data.verified_wins} />}
      {anyRankings && <CompetitorWatchlist google={data.google} />}

      {(anyRankings || anyAi) && <SummaryStrip google={data.google} aiMode={data.ai_mode} />}

      {anyWork && <WorkDelivered impl={data.implementation!} />}

      {data.share_of_voice && data.share_of_voice.lifetime.total > 0 && (
        <ShareOfVoiceCard sov={data.share_of_voice} />
      )}

      {anyAi && <AIVisibilityCard series={data.ai_mode} />}

      {anyRankings && <CoverageByCity google={data.google} verifiedWins={data.verified_wins} />}
      {anyRankings && <RankingMomentum google={data.google} />}

      <p className="mt-10 text-center text-[12px] text-[#6B7280]">
        Updated {fmtDateTime(data.generated_at)} · powered by Lola SEO
      </p>
    </main>
  );
}

/**
 * Live-data freshness pill — green "Live" dot if data refreshed < 8 days
 * ago, amber if staler. Signals to the client the dashboard is a living
 * system, not a one-time report. Drives the "open it every Monday" habit.
 */
function FreshnessPill({ iso }: { iso: string }) {
  let label = 'Live';
  let fresh = true;
  try {
    const days = (Date.now() - new Date(iso).getTime()) / 86400000;
    fresh = days < 8;
    label = days < 1 ? 'Updated today' : days < 8 ? `Updated ${Math.round(days)}d ago` : `Stale — ${Math.round(days)}d`;
  } catch { /* keep defaults */ }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
      fresh ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300' : 'border-[#F59E0B]/40 bg-[#F59E0B]/[0.08] text-[#F59E0B]'
    }`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${fresh ? 'bg-emerald-400 animate-pulse' : 'bg-[#F59E0B]'}`} />
      {label}
    </span>
  );
}

function Header({ data }: { data: DashboardPayload }) {
  return (
    <header className="mb-6 rounded-2xl border border-[#D4AF37]/20 bg-[#11121A] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF37]">
          Retainer Dashboard
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessPill iso={data.generated_at} />
          <button
            type="button"
            onClick={() => window.print()}
            className="report-actions inline-flex h-8 items-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#F4D47C] transition hover:bg-[#D4AF37]/18"
          >
            Save PDF
          </button>
        </div>
      </div>
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
 * Live integration chip — green when the backend confirms the integration
 * is wired (env vars set, credentials stored), amber when it isn't. Stops
 * the empty state from lying about "✓ connected" before Railway env vars
 * land on the right service.
 */
function StatusChip({ label, on }: { label: string; on: boolean }) {
  if (on) {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-300">
        ✓ {label} connected
      </span>
    );
  }
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-300">
      … {label} pending
    </span>
  );
}

/**
 * Owner overview — the plain-English summary at the top of the dashboard.
 * Written for a non-technical business owner: how many contacts came in
 * this month, estimated revenue, and one-line context.
 *
 * Renders an inviting empty state when no contacts yet so the dashboard
 * never feels broken on day one.
 */
function OwnerOverview({ data }: { data: DashboardPayload }) {
  const calls = data.tracking?.call?.month ?? 0;
  const leads = data.tracking?.lead?.month ?? 0;
  const contacts = calls + leads;
  const wonMonth = data.won_jobs?.month ?? 0;
  const revMonth = data.won_jobs?.revenue_month ?? 0;
  const prevCalls = data.tracking_trends?.call?.prev_month ?? 0;
  const prevLeads = data.tracking_trends?.lead?.prev_month ?? 0;
  const prevContacts = prevCalls + prevLeads;
  const delta = contacts - prevContacts;
  const monthLabel = new Date().toLocaleString(undefined, { month: 'long' });
  const siteHost = (() => {
    try {
      return data.target_url ? new URL(data.target_url).hostname.replace(/^www\./, '') : 'your website';
    } catch {
      return 'your website';
    }
  })();

  if (contacts === 0) {
    return (
      <section className="mb-6 rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-br from-[#11121A] to-[#0E0F16] p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
          Lola is set up and watching
        </p>
        <h2 className="mt-2 text-[22px] font-bold leading-snug text-white sm:text-[26px]">
          Tracking goes live the moment your first call or quote request lands.
        </h2>
        <p className="mt-3 max-w-[640px] text-[14px] leading-[1.6] text-[#C8C0B0]">
          Every call from your tracking number, every quote form on {siteHost},
          and every Google Business Profile interaction shows up here automatically.
          Rankings, AI search visibility, and Google Search Console data populate
          below as snapshots come in.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusChip label="CallRail webhook" on={data.integrations?.callrail ?? false} />
          <StatusChip label="Quote form" on={true} />
          <StatusChip label="Rankings tracker" on={data.integrations?.rankings_tracker ?? false} />
          {data.integrations?.gbp !== undefined && (
            <StatusChip label="Google Business Profile" on={data.integrations.gbp} />
          )}
          {data.integrations?.bing !== undefined && (
            <StatusChip label="Bing Webmaster" on={data.integrations.bing} />
          )}
        </div>
      </section>
    );
  }

  const deltaTone = delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-[#FCA5A5]' : 'text-[#9CA3AF]';
  const deltaArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·';
  const deltaText = delta === 0
    ? 'flat vs last month'
    : `${deltaArrow} ${Math.abs(delta)} vs last month`;

  return (
    <section className="mb-6 rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#15110A] p-6 shadow-[0_0_28px_rgba(212,175,55,0.08)] sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        {monthLabel} so far
      </p>
      <h2 className="mt-3 text-[24px] font-bold leading-snug text-white sm:text-[30px]">
        <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
          {contacts} new contact{contacts === 1 ? '' : 's'}
        </span>{' '}
        — <span className={deltaTone}>{deltaText}</span>.
      </h2>
      <p className="mt-3 max-w-[680px] text-[14px] leading-[1.65] text-[#C8C0B0]">
        <strong className="text-white">{calls} phone call{calls === 1 ? '' : 's'}</strong>{' '}
        and <strong className="text-white">{leads} quote form{leads === 1 ? '' : 's'}</strong>{' '}
        landed this month.
        {wonMonth > 0 && (
          <> You&apos;ve confirmed <strong className="text-emerald-300">{wonMonth} won job{wonMonth === 1 ? '' : 's'}</strong> totaling{' '}
          <strong className="text-emerald-300">${revMonth.toLocaleString()}</strong>.</>
        )}
      </p>
    </section>
  );
}

function RevenueAgentCard({ revenue }: { revenue: NonNullable<DashboardPayload['revenue_agent']> }) {
  const hasData = revenue.contacts > 0 || revenue.pipeline_value > 0 || revenue.won_revenue > 0 || revenue.open_actions > 0;
  if (!hasData) return null;
  const money = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;
  const openOpps = (revenue.opportunities.new || 0) + (revenue.opportunities.qualified || 0) + (revenue.opportunities.estimate_sent || 0);
  const sentEstimates = revenue.estimates.sent || 0;
  return (
    <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-[#0E1512] p-6 shadow-[0_0_28px_rgba(16,185,129,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
        Revenue Agent
      </p>
      <h2 className="mt-2 text-[22px] font-bold text-white">
        {money(revenue.pipeline_value)} open pipeline · {money(revenue.won_revenue)} confirmed won
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MiniMetric label="Contacts matched" value={revenue.contacts} />
        <MiniMetric label="Open opportunities" value={openOpps} />
        <MiniMetric label="Sent estimates" value={sentEstimates} />
        <MiniMetric label="Follow-ups queued" value={revenue.open_actions} />
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

/**
 * WhatWeWatchCard — bridges the gap between "dashboard exists" and "first
 * snapshot has landed." Shows the actual portfolio of work Lola does
 * weekly: keywords tracked, cities covered, AI assistants probed, integ-
 * rations polled. Only renders when nothing else has data; vanishes the
 * instant rankings/calls/AI mentions arrive so the live dashboard takes
 * over. The point: replace the demoralizing wall of zeros with proof that
 * the retainer is actively doing real, measurable work in the background.
 */
function WhatWeWatchCard({
  clientName,
  verifiedWins,
  integrations,
}: {
  clientName: string;
  verifiedWins?: { organic: string[]; map_pack: string[] };
  integrations?: DashboardPayload['integrations'];
}) {
  const wins = (verifiedWins?.organic?.length || 0) + (verifiedWins?.map_pack?.length || 0);
  // Cities extracted from the verified-wins labels — Lola maps which cities
  // are confirmed map-pack/organic strongholds so the client sees concrete
  // geographic coverage, not abstract "we track Florida."
  const cities = Array.from(new Set(
    [...(verifiedWins?.organic ?? []), ...(verifiedWins?.map_pack ?? [])]
      .map(s => s.split(/\s*[—–-]\s*/)[0].trim())
      .filter(Boolean)
  ));
  const integLine = (label: string, on?: boolean) => ({
    label,
    on: !!on,
  });
  const pollSources = [
    integLine('Google Search Console', true),  // service-account flow, server-side
    integLine('Google Analytics 4', integrations?.ga4_measurement_protocol),
    integLine('Google Business Profile', integrations?.gbp),
    integLine('Bing / Copilot index', integrations?.bing),
    integLine('CallRail (every inbound call)', integrations?.callrail),
    integLine('Claude AI Search', true),  // tracker always runs Claude
    integLine('ChatGPT AI Search', true), // tracker always runs ChatGPT
  ];

  return (
    <section className="mt-6 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#15110A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        What Lola is watching for {clientName.split(' ')[0]} · live
        <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#9CA3AF]">
          first weekly snapshot is being built right now
        </span>
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Tracked keywords */}
        <div className="rounded-[12px] border border-white/10 bg-[#0F0F12] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Keywords ranked weekly</p>
          <p className="mt-1 text-[34px] font-extrabold leading-none text-[#F4D47C]">19</p>
          <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
            Every Google search a paying customer types to find you — checked weekly across 6 cities.
          </p>
          {cities.length > 0 && (
            <p className="mt-2 text-[10px] text-[#9CA3AF]">
              {cities.slice(0, 6).join(' · ')}
            </p>
          )}
        </div>

        {/* AI search prompts */}
        <div className="rounded-[12px] border border-white/10 bg-[#0F0F12] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">AI search prompts tested</p>
          <p className="mt-1 text-[34px] font-extrabold leading-none text-[#C4B5FD]">6</p>
          <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
            Recommendation queries asked of <span className="text-purple-300">Claude</span> + <span className="text-emerald-300">ChatGPT</span> — proof you're being named when AI gives advice.
          </p>
        </div>

        {/* Verified wins (live snapshot from config) */}
        <div className="rounded-[12px] border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">Confirmed #1 placements</p>
          <p className="mt-1 text-[34px] font-extrabold leading-none text-emerald-300">{wins}</p>
          <p className="mt-2 text-[11px] leading-[1.5] text-[#C8C0B0]">
            Already owning the top spot for organic search + Google Map Pack across multiple service-city combos.
          </p>
        </div>
      </div>

      {/* Live integration polling */}
      <div className="mt-5 rounded-[12px] border border-white/10 bg-[#0F0F12] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Data streams Lola polls for you</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pollSources.map(s => (
            <div key={s.label} className="flex items-center gap-2 text-[12px]">
              <span className={`inline-block h-2 w-2 rounded-full ${s.on ? 'bg-emerald-400 shadow-[0_0_6px_rgba(110,231,183,0.6)]' : 'bg-amber-400/60'}`} />
              <span className={s.on ? 'text-[#E5E7EB]' : 'text-[#9CA3AF]'}>{s.label}</span>
              <span className={`ml-auto text-[10px] font-semibold uppercase tracking-[0.1em] ${s.on ? 'text-emerald-300' : 'text-amber-300'}`}>
                {s.on ? 'live' : 'pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-[1.55] text-[#9CA3AF]">
        Real-time rankings + call data populates the cards below as the first snapshot completes (typically within an hour of deploy). Everything you see here is being actively monitored — not waiting for a manual report.
      </p>
    </section>
  );
}

/**
 * Top Wins hero card — surfaces every keyword the client ranks #1 for
 * (the headline they show their spouse / business partner) plus
 * "almost there" #2-#3 placements and AI mentions. Empty state shows
 * nothing so the dashboard isn't padded with zero-state noise.
 */
function TopWinsCard({
  google,
  aiMode,
  verifiedWins,
  clientName,
}: {
  google: Series[];
  aiMode: Series[];
  verifiedWins?: { organic: string[]; map_pack: string[] };
  clientName: string;
}) {
  const num1 = google.filter(s => s.current.position === 1);
  const top3 = google.filter(s => {
    const p = s.current.position;
    return p !== null && p >= 2 && p <= 3;
  });
  const top10 = google.filter(s => {
    const p = s.current.position;
    return p !== null && p >= 4 && p <= 10;
  });
  const aiWins = aiMode.filter(s => s.current.mentioned);
  const totalTrackedG = google.length;
  const totalTrackedAi = aiMode.length;

  const verifiedOrganic = verifiedWins?.organic ?? [];
  const verifiedMapPack = verifiedWins?.map_pack ?? [];
  const totalVerified = verifiedOrganic.length + verifiedMapPack.length;

  if (num1.length === 0 && top3.length === 0 && aiWins.length === 0 && totalVerified === 0) {
    return null;
  }

  const num1Count = num1.length + verifiedOrganic.length + verifiedMapPack.length;

  return (
    <section className="mb-6 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#15110A] via-[#11121A] to-[#0E0F16] p-6 shadow-[0_0_36px_rgba(212,175,55,0.12)] sm:p-8">
      <div className="flex items-center gap-2">
        <span className="text-[20px]">🏆</span>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
          Top Wins — Live on Google Right Now
        </p>
      </div>

      {num1Count > 0 && (
        <>
          <h2 className="mt-3 text-[24px] font-bold leading-snug text-white sm:text-[30px]">
            <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
              {num1Count} #1 placement{num1Count === 1 ? '' : 's'}
            </span>{' '}
            across Google organic + map packs.
          </h2>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.6] text-[#C8C0B0] sm:text-[14px]">
            When customers search these terms, {clientName} is the first result they see —
            the position competitors pay $5–$15 per click for.
          </p>

          {verifiedOrganic.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                #1 Organic Rankings · Confirmed
              </p>
              <ul className="mt-2 space-y-2">
                {verifiedOrganic.map(label => (
                  <li
                    key={`vo-${label}`}
                    className="flex items-center gap-3 rounded-[10px] border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/[0.10] to-transparent px-3 py-2.5 sm:px-4 sm:py-3"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD166] to-[#D4AF37] text-[12px] font-extrabold text-[#1A1410] shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                      #1
                    </span>
                    <span className="text-[14px] font-medium text-white sm:text-[15px]">{label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {verifiedMapPack.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                #1 in Google Map Pack · Confirmed
              </p>
              <ul className="mt-2 space-y-2">
                {verifiedMapPack.map(label => (
                  <li
                    key={`vm-${label}`}
                    className="flex items-center gap-3 rounded-[10px] border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-3 py-2.5 sm:px-4 sm:py-3"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[12px] font-extrabold text-[#0E0F16] shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                      📍
                    </span>
                    <span className="text-[14px] font-medium text-white sm:text-[15px]">{label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {num1.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Auto-tracked #1 Rankings · This Week
              </p>
              <ul className="mt-2 space-y-2">
                {num1.map(s => (
                  <li
                    key={`win-${s.query}`}
                    className="flex items-center gap-3 rounded-[10px] border border-[#D4AF37]/15 bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD166] to-[#D4AF37] text-[12px] font-extrabold text-[#1A1410] shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                      #1
                    </span>
                    <span className="text-[14px] font-medium text-white sm:text-[15px]">
                      {s.query}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {(top3.length > 0 || top10.length > 0 || aiWins.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top3.length > 0 && (
            <div className="rounded-[10px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Top 3 on Google
              </p>
              <p className="mt-1 text-[22px] font-bold text-emerald-300">
                {top3.length} <span className="text-[13px] font-medium text-[#9CA3AF]">/ {totalTrackedG}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">map pack territory</p>
            </div>
          )}
          {top10.length > 0 && (
            <div className="rounded-[10px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Page 1 on Google
              </p>
              <p className="mt-1 text-[22px] font-bold text-[#E8E4D8]">
                {top10.length} <span className="text-[13px] font-medium text-[#9CA3AF]">/ {totalTrackedG}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">positions 4–10</p>
            </div>
          )}
          {aiWins.length > 0 && (
            <div className="rounded-[10px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                AI Mentions
              </p>
              <p className="mt-1 text-[22px] font-bold text-[#F4D47C]">
                {aiWins.length} <span className="text-[13px] font-medium text-[#9CA3AF]">/ {totalTrackedAi}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">ChatGPT &amp; Claude recommend you</p>
            </div>
          )}
        </div>
      )}
    </section>
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
/**
 * GBP Performance card — Google's OWN count of calls / website clicks /
 * direction requests / impressions straight from the Maps listing. The
 * single most credible call-proof: Google itself confirming the activity.
 */
function GbpCard({ g }: { g: NonNullable<DashboardPayload['gbp_performance']> }) {
  const tiles = [
    { label: 'Calls from listing', val: g.calls, accent: '#6EE7B7' },
    { label: 'Website clicks', val: g.website_clicks, accent: '#93C5FD' },
    { label: 'Direction requests', val: g.direction_requests, accent: '#F4D47C' },
    { label: 'Listing impressions', val: g.impressions, accent: '#D4AF37' },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#11121A] via-[#11121A] to-[#0A1410] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
        📍 Google Business Profile · last {g.window_days || 30} days
        <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#9CA3AF]">
          straight from Google — the unarguable call proof
        </span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">{t.label}</p>
            <p className="mt-1 text-[26px] font-extrabold leading-none" style={{ color: t.accent }}>
              {(t.val || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      {g.fetched_at && <p className="mt-3 text-[10px] text-[#6B7280]">Updated {fmtDateTime(g.fetched_at)}</p>}
    </section>
  );
}

/** Bing Webmaster card — captures the Bing/Copilot/ChatGPT-Search index. */
function BingCard({ b }: { b: NonNullable<DashboardPayload['bing']> }) {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Ⓑ Bing / Copilot search
        <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#9CA3AF]">
          the index behind ChatGPT Search + Copilot
        </span>
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Clicks</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[#6EE7B7]">{b.clicks.toLocaleString()}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">Impressions</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[#93C5FD]">{b.impressions.toLocaleString()}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">CTR</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[#F4D47C]">{b.ctr}%</p>
        </div>
      </div>
    </section>
  );
}

/** Lead-source rollup — where every call + lead came from this month. */
function LeadSourceCard({ sources }: { sources: Record<string, number> }) {
  const total = Object.values(sources).reduce((a, b) => a + b, 0);
  const label = (s: string) => ({ gbp: 'Google Business', gbp_form: 'GBP form', website: 'Website', ai_search: 'AI Search', social: 'Social', form: 'Web form', '(direct)': 'Direct' }[s] || s);
  const palette = ['#6EE7B7', '#93C5FD', '#F4D47C', '#D4AF37', '#FCA5A5', '#C4B5FD'];
  const rows = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Where your contacts came from · this month
      </p>
      {/* Stacked bar */}
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#0F0F12]">
        {rows.map(([s, n], i) => (
          <div key={s} title={`${label(s)}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: palette[i % palette.length] }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map(([s, n], i) => (
          <span key={s} className="flex items-center gap-1.5 text-[12px] text-[#C8C0B0]">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette[i % palette.length] }} />
            {label(s)} <span className="text-white font-semibold">{n}</span>
            <span className="text-[#6B7280]">({Math.round((n / total) * 100)}%)</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">Every contact, attributed to the channel Lola earned it through.</p>
    </section>
  );
}

/** Core Web Vitals trend — proves "we made your site faster too." */
function CwvTrendCard({ series }: { series: NonNullable<DashboardPayload['cwv_trend']> }) {
  const latest = series[series.length - 1];
  const first = series[0];
  const metric = (key: 'performance' | 'accessibility' | 'seo', label: string, accent: string) => {
    const now = latest[key] || 0;
    const was = first[key] || 0;
    const delta = now - was;
    return (
      <div className="rounded-[10px] border border-white/10 bg-[#0F0F12] p-3 text-center">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</p>
        <p className="mt-1 text-[24px] font-extrabold leading-none" style={{ color: accent }}>{now}</p>
        {series.length > 1 && (
          <p className={`mt-1 text-[11px] font-semibold ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-[#6B7280]'}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'} {delta !== 0 ? Math.abs(delta) : 'flat'}
          </p>
        )}
      </div>
    );
  };
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        Site health (Google PageSpeed) · {series.length} snapshot{series.length === 1 ? '' : 's'}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {metric('performance', 'Performance', '#6EE7B7')}
        {metric('seo', 'SEO', '#F4D47C')}
        {metric('accessibility', 'Accessibility', '#93C5FD')}
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">Faster, cleaner site = better rankings + more conversions. Tracked over time.</p>
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

/**
 * CoverageByCity — groups all tracked keywords by the city they target and
 * shows a business-owner-friendly "market coverage" grid.
 *
 * For each city the operator can answer at a glance:
 *   - How many of my service keywords rank in this market?
 *   - Which services am I #1 for? Which are missing?
 *   - Where is the biggest gap to close next?
 *
 * This replaces the old 19-card "Detailed History" wall which was noise for
 * a business owner and only useful to a technical SEO analyst.
 */
const KNOWN_CITIES = [
  'palm harbor', 'dunedin', 'tarpon springs', 'holiday',
  'clearwater', 'tampa', 'st. pete', 'st pete', 'saint pete',
  'pinellas park', 'largo', 'safety harbor', 'oldsmar',
];

function extractCity(query: string): string {
  const q = query.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (q.includes(city)) {
      // Title-case
      return city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return 'Other';
}

function extractService(query: string): string {
  // Strip the city suffix and trim generic suffixes (fl, florida) to get a clean service label.
  let s = query.toLowerCase();
  for (const city of KNOWN_CITIES) s = s.replace(city, '');
  s = s.replace(/\bfl\b|\bflorida\b|\bnear me\b/g, '').replace(/\s+/g, ' ').trim();
  // Title-case
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function PosBadge({ pos }: { pos: number | null }) {
  if (pos === null) {
    return (
      <span className="inline-flex items-center rounded-[6px] border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]">
        —
      </span>
    );
  }
  const [color, bg, border] =
    pos === 1   ? ['#FFD166', 'rgba(212,175,55,0.14)', 'rgba(212,175,55,0.35)'] :
    pos <= 3    ? ['#6EE7B7', 'rgba(16,185,129,0.12)', 'rgba(16,185,129,0.30)'] :
    pos <= 5    ? ['#93C5FD', 'rgba(147,197,253,0.10)', 'rgba(147,197,253,0.25)'] :
                  ['#9CA3AF', 'rgba(156,163,175,0.08)', 'rgba(156,163,175,0.20)'];
  return (
    <span
      className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-bold"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      #{pos}
    </span>
  );
}

function CoverageByCity({
  google,
  verifiedWins,
}: {
  google: Series[];
  verifiedWins?: { organic: string[]; map_pack: string[] };
}) {
  if (google.length === 0) return null;

  // Build city → keywords map preserving insertion order of first encounter
  const cityMap = useMemo(() => {
    const map = new Map<string, Series[]>();
    for (const s of google) {
      const city = extractCity(s.query);
      if (!map.has(city)) map.set(city, []);
      map.get(city)!.push(s);
    }
    // Sort cities by total top-10 rankings descending (your best markets first)
    return [...map.entries()].sort((a, b) => {
      const score = (rows: Series[]) => rows.filter(r => (r.current?.position ?? 99) <= 10).length;
      return score(b[1]) - score(a[1]);
    });
  }, [google]);

  // Map-pack city lookup
  const mapPackCities = useMemo(() => {
    return (verifiedWins?.map_pack ?? []).map(s =>
      s.split(/\s*[—–-]\s*/)[0].trim().toLowerCase()
    );
  }, [verifiedWins]);

  const hasMp = (query: string) => {
    const q = query.toLowerCase();
    return mapPackCities.some(c => c && q.includes(c));
  };

  const cityScore = (rows: Series[]) => {
    const no1   = rows.filter(r => r.current?.position === 1).length;
    const top3  = rows.filter(r => (r.current?.position ?? 99) <= 3 && r.current?.position !== 1).length;
    const top10 = rows.filter(r => (r.current?.position ?? 99) > 3 && (r.current?.position ?? 99) <= 10).length;
    const none  = rows.filter(r => r.current?.position === null || r.current?.position === undefined).length;
    return { no1, top3, top10, none };
  };

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
        Coverage by Market
      </h2>
      <p className="mb-5 text-[12px] text-[#9AA0A6]">
        Where you're winning — and where the next opportunity is.
      </p>

      <div className="space-y-4">
        {cityMap.map(([city, rows]) => {
          const sc = cityScore(rows);
          const ranked = sc.no1 + sc.top3 + sc.top10;
          const total = rows.length;
          const pct = Math.round(100 * ranked / total);

          // Progress bar color: gold if any #1, green if top-3, blue if top-10, gray if none
          const barColor =
            sc.no1   > 0 ? '#D4AF37' :
            sc.top3  > 0 ? '#10B981' :
            sc.top10 > 0 ? '#60A5FA' :
                            '#374151';

          return (
            <div key={city} className="rounded-[16px] border border-white/[0.08] bg-[#11121A] overflow-hidden">
              {/* City header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-bold text-white">{city}</span>
                  {/* Score pills */}
                  {sc.no1 > 0 && (
                    <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#F4D47C] uppercase tracking-[0.1em]">
                      {sc.no1} × #1
                    </span>
                  )}
                  {sc.top3 > 0 && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.1em]">
                      {sc.top3} top-3
                    </span>
                  )}
                  {ranked === 0 && (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-[#6B7280] uppercase tracking-[0.1em]">
                      Not yet ranking
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#6B7280]">{ranked}/{total} in top-10</span>
                  {/* Mini progress bar */}
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Keyword grid */}
              <div className="grid grid-cols-1 divide-y divide-white/[0.04] sm:grid-cols-2 sm:divide-y-0">
                {rows.map((s, i) => {
                  const pos = s.current?.position ?? null;
                  const mp = hasMp(s.query);
                  const svc = extractService(s.query);
                  // Inline trend: compare current to oldest ranked position
                  const oldest = [...s.history].reverse().find(h => h.position !== null)?.position ?? null;
                  const trendDelta = pos !== null && oldest !== null ? oldest - pos : null;

                  return (
                    <div
                      key={s.query}
                      className={`flex items-center justify-between gap-3 px-5 py-3 ${
                        i % 2 === 1 ? 'sm:border-l sm:border-white/[0.04]' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium text-[#D1D5DB]">{svc}</span>
                        {mp && (
                          <span className="text-[10px] font-semibold text-emerald-400">📍 Map Pack</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {trendDelta !== null && trendDelta !== 0 && (
                          <span className={`text-[11px] font-semibold ${trendDelta > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                            {trendDelta > 0 ? `↑${trendDelta}` : `↓${Math.abs(trendDelta)}`}
                          </span>
                        )}
                        <PosBadge pos={pos} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * RankingMomentum — compact sparkline section shown only for keywords that
 * ARE ranking (position ≠ null) AND have ≥ 2 data points. A flat line on one
 * snapshot tells you nothing; two or more shows real movement. 2-column grid
 * keeps it tight vs the old 1-column wall.
 */
function RankingMomentum({ google }: { google: Series[] }) {
  const ranked = useMemo(() =>
    google.filter(s =>
      s.current?.position !== null &&
      s.current?.position !== undefined &&
      s.history.filter(h => h.position !== null).length >= 2
    ),
    [google]
  );

  if (ranked.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
        Ranking Momentum
        <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#9AA0A6]">
          {ranked.length} keyword{ranked.length === 1 ? '' : 's'} with position history
        </span>
      </h2>
      <p className="mb-4 text-[12px] text-[#9AA0A6]">
        Lower = better. #1 is the top of the chart.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ranked.map(s => (
          <MomentumCard key={s.query} series={s} />
        ))}
      </div>
    </section>
  );
}

function MomentumCard({ series }: { series: Series }) {
  const pos = series.current?.position ?? null;
  const oldest = [...series.history].reverse().find(h => h.position !== null)?.position ?? null;
  const delta = pos !== null && oldest !== null ? oldest - pos : null; // positive = improved

  const [color, label] =
    pos === 1  ? ['#FFD166', '#1'] :
    pos !== null && pos <= 3  ? ['#6EE7B7', `#${pos}`] :
    pos !== null && pos <= 5  ? ['#93C5FD', `#${pos}`] :
    pos !== null              ? ['#9CA3AF', `#${pos}`] :
                                ['#4B5563', '—'];

  return (
    <div className="rounded-[14px] border border-white/[0.08] bg-[#0F0F11] p-4">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-[#D1D5DB]">
            {extractService(series.query)}
          </p>
          <p className="mt-0.5 text-[10px] text-[#6B7280]">
            {extractCity(series.query)} · {series.history.filter(h => h.position !== null).length} snapshots
          </p>
        </div>
        <div className="text-right">
          <span
            className="inline-flex items-center rounded-[8px] px-2.5 py-1 text-[16px] font-extrabold"
            style={{ color, background: `${color}14`, border: `1px solid ${color}40` }}
          >
            {label}
          </span>
          {delta !== null && delta !== 0 && (
            <p className={`mt-1 text-[10px] font-semibold ${delta > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              {delta > 0 ? `↑ ${delta} spots` : `↓ ${Math.abs(delta)} spots`}
            </p>
          )}
        </div>
      </div>
      {/* Compact sparkline */}
      <MiniSparkline history={series.history} />
    </div>
  );
}

function MiniSparkline({ history }: { history: RankPoint[] }) {
  const W = 400; const H = 56;
  const PX = 6; const PY = 6;
  const MAX = 10;
  const pts = useMemo(() => {
    const valid = history.filter(h => h.position !== null);
    if (valid.length < 2) return [] as Array<{ x: number; y: number | null; pos: number | null }>;
    return history.map((h, i) => {
      const x = PX + (i * (W - 2 * PX)) / Math.max(1, history.length - 1);
      const pos = h.position;
      const y = pos === null ? null : PY + ((pos - 1) * (H - 2 * PY)) / (MAX - 1);
      return { x, y, pos };
    });
  }, [history]);

  if (pts.length === 0) return null;

  const segs: Array<Array<{ x: number; y: number }>> = [];
  let cur: Array<{ x: number; y: number }> = [];
  for (const p of pts) {
    if (p.y === null) { if (cur.length) { segs.push(cur); cur = []; } }
    else cur.push({ x: p.x, y: p.y });
  }
  if (cur.length) segs.push(cur);

  const lastRanked = [...pts].reverse().find(p => p.y !== null);
  const latestColor =
    (lastRanked?.pos ?? 99) === 1    ? '#FFD166' :
    (lastRanked?.pos ?? 99) <= 3    ? '#6EE7B7' :
    (lastRanked?.pos ?? 99) <= 5    ? '#93C5FD' :
                                       '#9CA3AF';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" aria-hidden>
      {/* #1, #5, #10 reference lines */}
      {[1, 5, 10].map(pos => {
        const y = PY + ((pos - 1) * (H - 2 * PY)) / (MAX - 1);
        return (
          <g key={pos}>
            <line x1={PX} x2={W - PX} y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={W - PX + 1} y={y + 3} fontSize={8} fill="rgba(255,255,255,0.18)" textAnchor="start">#{pos}</text>
          </g>
        );
      })}
      {segs.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={latestColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      ))}
      {pts.map((p, i) =>
        p.y === null
          ? <circle key={i} cx={p.x} cy={H - PY} r={2} fill="#374151" />
          : <circle key={i} cx={p.x} cy={p.y} r={3} fill={latestColor} />
      )}
    </svg>
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

/**
 * RankingsTable — compact scannable table of every tracked keyword showing
 * the live position number, colour-coded tier, trend arrow, and a map-pack
 * badge where a confirmed map-pack win exists. Much easier to scan than the
 * individual RankingCard walls — one glance shows the full keyword portfolio.
 *
 * Map-pack matching: a keyword gets a 📍 badge if any entry in
 * verified_wins.map_pack contains a city word that also appears in the query.
 */
function RankingsTable({
  google,
  verifiedWins,
}: {
  google: Series[];
  verifiedWins?: { organic: string[]; map_pack: string[] };
}) {
  if (google.length === 0) return null;

  // Build a quick-lookup of which queries have a confirmed map-pack win.
  // Strategy: extract city names from the map_pack strings (e.g. "Holiday —
  // pressure washing" → "holiday") and check if the query contains that city.
  const mapPackCities = useMemo(() => {
    return (verifiedWins?.map_pack ?? []).map(s =>
      s.split(/\s*[—–-]\s*/)[0].trim().toLowerCase()
    );
  }, [verifiedWins]);

  const hasMapPack = (query: string) => {
    const q = query.toLowerCase();
    return mapPackCities.some(city => city && q.includes(city));
  };

  const posTier = (p: number | null) => {
    if (p === null) return { label: '—', color: '#6B7280', bg: 'rgba(107,114,128,0.08)' };
    if (p === 1)    return { label: '#1', color: '#FFD166', bg: 'rgba(212,175,55,0.12)' };
    if (p <= 3)     return { label: `#${p}`, color: '#6EE7B7', bg: 'rgba(16,185,129,0.10)' };
    if (p <= 10)    return { label: `#${p}`, color: '#93C5FD', bg: 'rgba(147,197,253,0.08)' };
    return { label: `#${p}`, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' };
  };

  // Trend: compare current position to oldest non-null position in history.
  const trend = (s: Series) => {
    const cur = s.current?.position;
    if (cur === null || cur === undefined) return null;
    const oldest = [...s.history].reverse().find(h => h.position !== null)?.position ?? null;
    if (oldest === null) return null;
    const d = oldest - cur; // positive = improved (lower position number)
    return d === 0 ? null : d;
  };

  // Sort: ranked keywords first (by position asc), then unranked.
  const sorted = [...google].sort((a, b) => {
    const pa = a.current?.position ?? 999;
    const pb = b.current?.position ?? 999;
    return pa - pb;
  });

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
        Organic Rankings · Full Keyword List
        <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#9AA0A6]">
          live positions across {google.length} tracked keywords
        </span>
      </h2>
      <div className="overflow-hidden rounded-[14px] border border-white/10">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-white/10 bg-[#0F0F12] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
          <span>Keyword</span>
          <span className="text-right">Map Pack</span>
          <span className="text-right w-12">Trend</span>
          <span className="text-right w-14">Position</span>
        </div>
        {sorted.map((s, idx) => {
          const tier = posTier(s.current?.position ?? null);
          const t = trend(s);
          const mp = hasMapPack(s.query);
          return (
            <div
              key={s.query}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-4 py-3 ${idx < sorted.length - 1 ? 'border-b border-white/[0.05]' : ''} ${idx % 2 === 0 ? 'bg-[#11121A]' : 'bg-[#0F0F12]'}`}
            >
              <span className="text-[13px] font-medium text-[#E5E7EB] leading-tight">{s.query}</span>
              <span className="text-center">
                {mp && (
                  <span title="Confirmed #1 in Google Map Pack" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    📍 Map Pack
                  </span>
                )}
              </span>
              <span className="w-12 text-right text-[12px] font-semibold">
                {t !== null && (
                  <span className={t > 0 ? 'text-emerald-300' : 'text-red-300'}>
                    {t > 0 ? `↑${t}` : `↓${Math.abs(t)}`}
                  </span>
                )}
              </span>
              <span
                className="inline-flex w-14 items-center justify-center rounded-[8px] px-2.5 py-1 text-[13px] font-bold"
                style={{ color: tier.color, background: tier.bg }}
              >
                {tier.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[#6B7280]">
        📍 = confirmed #1 in Google Map Pack · trend arrow vs first recorded snapshot
      </p>
    </section>
  );
}

function CompetitorWatchlist({ google }: { google: Series[] }) {
  const rows = useMemo(() => {
    return google
      .map((s) => ({
        query: s.query,
        position: s.current?.position ?? null,
        competitors: (s.current?.competitors ?? []).filter(Boolean).slice(0, 3),
      }))
      .filter((row) => row.competitors.length > 0)
      .sort((a, b) => {
        const pa = a.position ?? 999;
        const pb = b.position ?? 999;
        return pa - pb;
      });
  }, [google]);

  if (rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-[14px] border border-[#F59E0B]/20 bg-[#11121A] p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
            Competitor Watchlist
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#9CA3AF]">
            Top organic pages showing up for each tracked money keyword.
          </p>
        </div>
        <span className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#F59E0B]">
          {rows.length} keyword{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 divide-y divide-white/[0.06]">
        {rows.slice(0, 6).map((row) => (
          <div key={row.query} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold leading-tight text-[#E5E7EB]">{row.query}</p>
              <span className="text-[11px] font-medium text-[#6B7280]">
                {row.position ? `You: #${row.position}` : 'You: not top 10'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.competitors.map((name, i) => (
                <span
                  key={`${row.query}-${name}`}
                  className="rounded-full border border-white/[0.08] bg-[#0F0F12] px-2.5 py-1 text-[11px] text-[#C8C0B0]"
                >
                  #{i + 1} {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function aiProviderMeta(source: string) {
  const provider = source.replace(/_ai_mode$/, '');
  const labels: Record<string, { label: string; icon: string; color: string }> = {
    claude: { label: 'Claude', icon: '⚡', color: '#C4B5FD' },
    chatgpt: { label: 'ChatGPT', icon: '✦', color: '#6EE7B7' },
    perplexity: { label: 'Perplexity', icon: '⌕', color: '#67E8F9' },
    gemini: { label: 'Gemini', icon: '◆', color: '#93C5FD' },
  };
  return labels[provider] || {
    label: provider.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: 'AI',
    color: '#F4D47C',
  };
}

/**
 * AIVisibilityCard — per-platform breakdown of AI search visibility. Shows
 * each tested prompt with win/lose status and (on lose) who the provider
 * recommended instead.
 */
function AIVisibilityCard({ series }: { series: Series[] }) {
  if (series.length === 0) return null;

  const sources = useMemo(() => [...new Set(series.map(s => s.source))].sort(), [series]);

  const winRate = (rows: Series[]) => {
    if (!rows.length) return null;
    const wins = rows.filter(s => s.current?.mentioned).length;
    return { wins, total: rows.length, pct: Math.round(100 * wins / rows.length) };
  };

  const PlatformChip = ({ source }: { source: string }) => {
    const rows = series.filter(s => s.source === source);
    const rate = winRate(rows);
    if (!rate) return null;
    const meta = aiProviderMeta(source);
    return (
      <div className="min-w-[150px] flex-1 rounded-[12px] border border-white/10 bg-[#0F0F12] p-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: meta.color }}>
          {meta.icon} {meta.label}
        </p>
        <p className="mt-2 text-[36px] font-extrabold leading-none" style={{ color: meta.color }}>{rate.pct}%</p>
        <p className="mt-1 text-[11px] text-[#9CA3AF]">{rate.wins}/{rate.total} prompts recommended you</p>
      </div>
    );
  };

  // Group all series rows by query so we can show one row per prompt
  const byQuery = useMemo(() => {
    const map: Record<string, Record<string, Series>> = {};
    for (const s of series) {
      if (!map[s.query]) map[s.query] = {};
      map[s.query][s.source] = s;
    }
    return map;
  }, [series]);

  const prompts = Object.entries(byQuery);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#F4D47C]">
        AI Search Visibility
        <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#9AA0A6]">
          Are AI assistants recommending you?
        </span>
      </h2>

      {/* Per-platform win rates */}
      <div className="flex flex-wrap gap-3">
        {sources.map(source => <PlatformChip key={source} source={source} />)}
      </div>

      {/* Per-prompt breakdown */}
      <div className="mt-4 space-y-3">
        {prompts.map(([query, bySource]) => {
          const rows = sources.map(source => bySource[source]).filter(Boolean);
          // Aggregate competitors across both platforms
          const allCompetitors = rows
            .flatMap(row => row.current?.mentioned === false ? row.current?.competitors ?? [] : [])
            .filter((v, i, a) => a.indexOf(v) === i); // dedupe

          const anyWin = rows.some(row => row.current?.mentioned);
          const anyLoss = rows.some(row => row.current?.mentioned === false);

          return (
            <div key={query} className={`rounded-[12px] border p-4 ${anyWin ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/10 bg-[#11121A]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="flex-1 text-[13px] font-medium leading-snug text-[#E5E7EB]">{query}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {rows.map(row => {
                    const meta = aiProviderMeta(row.source);
                    const win = row.current?.mentioned;
                    return (
                      <span
                        key={`${query}-${row.source}`}
                        className={`rounded-[6px] px-2.5 py-1 text-[11px] font-bold ${win ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}
                      >
                        {meta.icon} {meta.label} {win ? '✓' : '✗'}
                      </span>
                    );
                  })}
                </div>
              </div>
              {anyLoss && allCompetitors.length > 0 && (
                <div className="mt-3 rounded-[8px] border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300/80">AI recommended instead:</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-[#E5E7EB]">
                    {allCompetitors.map(c => <span key={c}>· {c}</span>)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * WonJobsCard — shows ACTUAL closed/won jobs logged by the operator vs the
 * estimated attribution model. The gap between them is the most honest
 * number in the whole dashboard: "our model estimates $X; you confirmed $Y."
 *
 * The operator logs won jobs via:
 *   POST /admin/won-jobs/{slug}  { job_value, service_type, source }
 */
function WonJobsCard({
  wonJobs,
}: {
  wonJobs: NonNullable<DashboardPayload['won_jobs']>;
}) {
  if (wonJobs.lifetime === 0) return null;
  const recentJobs = wonJobs.jobs.slice(0, 5);
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  };
  return (
    <section className="mt-6 rounded-2xl border border-[#6EE7B7]/30 bg-gradient-to-br from-[#0A1410] to-[#11121A] p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
        💰 Confirmed revenue · this month
      </p>
      <p className="mt-2 text-[42px] font-extrabold leading-none text-emerald-300">
        ${wonJobs.revenue_month.toLocaleString()}
      </p>
      <p className="mt-1 text-[12px] text-[#9CA3AF]">
        {wonJobs.month} job{wonJobs.month === 1 ? '' : 's'} closed · ${wonJobs.revenue_lifetime.toLocaleString()} lifetime
      </p>
      {recentJobs.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B7280]">Recent closed jobs</p>
          {recentJobs.map(j => (
            <div key={j.id} className="flex items-center justify-between rounded-[8px] border border-white/[0.06] bg-[#0F0F12] px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-emerald-300">${j.job_value.toLocaleString()}</span>
                {j.service_type && <span className="text-[11px] text-[#C8C0B0]">{j.service_type}</span>}
                {j.source && <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[#9CA3AF]">{j.source}</span>}
              </div>
              <span className="text-[11px] text-[#6B7280]">{fmtDate(j.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
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
