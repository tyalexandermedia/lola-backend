import { useEffect } from 'react';
import { track } from './analytics';

type StatusState = 'done' | 'pending';

type StatusItem = {
  label: string;
  state: StatusState;
};

type Client = {
  name: string;
  slug: string;
  role: string;
  summary: string;
  links: { label: string; href: string }[];
  status: StatusItem[];
};

const clients: Client[] = [
  {
    name: 'Sandbar Soft Wash',
    slug: 'sandbar',
    role: 'Flagship proof client',
    summary:
      'The production case study for proving the full LOLA loop: visibility, calls, leads, opportunities, won jobs, and revenue.',
    links: [
      { label: 'Public Dashboard', href: '/r/client/sandbar' },
      { label: 'Revenue Control Room', href: '/admin/revenue/sandbar' },
      { label: 'Case Study', href: '/case-studies/sandbar' },
    ],
    status: [
      { label: 'Live', state: 'done' },
      { label: 'Revenue Dashboard', state: 'done' },
      { label: 'SEO Tracking', state: 'done' },
      { label: 'Call Tracking', state: 'done' },
    ],
  },
  {
    name: 'Tampa Bay Power Clean',
    slug: 'tampa-bay-power-clean',
    role: 'Secondary lead-gen brand',
    summary:
      'A separate brand asset using proven LOLA routing while dedicated tracking, domain, and visibility integrations come online.',
    links: [
      { label: 'Sandbar-hosted Landing Page', href: 'https://www.sandbarsoftwash.com/tampa-bay-power-clean' },
      { label: 'LOLA Landing Page', href: '/tampa-bay-power-clean' },
      { label: 'Public Dashboard', href: '/r/client/tampa-bay-power-clean' },
    ],
    status: [
      { label: 'Landing Page', state: 'done' },
      { label: 'Call Tracking', state: 'done' },
      { label: 'SEO Targets', state: 'done' },
      { label: 'Domain Transfer', state: 'pending' },
      { label: 'GBP Access', state: 'pending' },
      { label: 'Search Console', state: 'pending' },
      { label: 'GA4', state: 'pending' },
    ],
  },
];

const ecosystem = [
  {
    step: '01',
    title: 'Client Registry',
    body: 'Every client starts as non-secret config: slug, market, services, SEO targets, and tracking prompts.',
  },
  {
    step: '02',
    title: 'Conversion Assets',
    body: 'Landing pages and dashboard routes come online without copying Sandbar data or changing production Sandbar behavior.',
  },
  {
    step: '03',
    title: 'Tracking Layer',
    body: 'Calls, forms, SEO snapshots, and AI visibility signals flow into client-specific tables by slug.',
  },
  {
    step: '04',
    title: 'Revenue Agent',
    body: 'Calls and leads become opportunities, estimates, won jobs, follow-up actions, and revenue summaries.',
  },
  {
    step: '05',
    title: 'Reporting Loop',
    body: 'Public dashboards and weekly reporting show what is live, what is missing, and what changed.',
  },
];

export default function LolaOS() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute('content') || '';

    document.title = 'LOLA OS Client Status | Growth Operating System';
    desc?.setAttribute(
      'content',
      'LOLA OS client status dashboard showing Sandbar, Tampa Bay Power Clean, and the interactive growth operating system behind tracking, revenue, SEO, and reporting.',
    );

    track('lola_os_viewed');

    return () => {
      document.title = prevTitle;
      desc?.setAttribute('content', prevDesc);
    };
  }, []);

  const completed = clients.flatMap((client) => client.status).filter((item) => item.state === 'done').length;
  const pending = clients.flatMap((client) => client.status).filter((item) => item.state === 'pending').length;

  return (
    <main className="flex flex-1 flex-col">
      <section className="pt-2 sm:pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          LOLA OS · Client Status
        </p>
        <h1
          className="mt-4 max-w-[860px] font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
        >
          The operating system behind local growth.
        </h1>
        <p className="mt-5 max-w-[760px] text-[16px] leading-[1.6] text-[#C5C5C8] sm:text-[18px]">
          A client does not become a LOLA client because a page exists. It becomes
          real when brand, tracking, SEO, calls, opportunities, revenue, and reporting
          are connected in one slug-based system.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:max-w-[460px]">
          <Metric label="Live / Connected" value={completed} tone="gold" />
          <Metric label="Setup Remaining" value={pending} tone="muted" />
        </div>
      </section>

      <section className="mt-12 sm:mt-16">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              Client Status
            </p>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.01em] text-white sm:text-[36px]">
              What is live right now.
            </h2>
          </div>
          <a
            href="/r/client/tampa-bay-power-clean"
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#D4AF37]/35 px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.06]"
          >
            Open Tampa Dashboard
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clients.map((client) => (
            <ClientStatus key={client.slug} client={client} />
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-[18px] border border-white/[0.08] bg-white/[0.02] p-5 sm:mt-20 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Interactive Ecosystem
        </p>
        <h2 className="mt-3 text-[28px] font-bold tracking-[-0.01em] text-white sm:text-[36px]">
          One client slug, five connected systems.
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          {ecosystem.map((item) => (
            <article
              key={item.step}
              className="rounded-[14px] border border-white/[0.07] bg-[#0F0F12] p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                {item.step}
              </p>
              <h3 className="mt-3 text-[17px] font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#AEB4BE]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="rounded-[18px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/[0.08] via-white/[0.02] to-transparent p-5 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Next Highest ROI
          </p>
          <h2 className="mt-3 text-[26px] font-bold tracking-[-0.01em] text-white sm:text-[34px]">
            Finish attribution before adding more pages.
          </h2>
          <p className="mt-3 text-[15px] leading-[1.65] text-[#C5C5C8]">
            Tampa Bay Power Clean already has a live page, temporary shared call routing,
            and SEO targets. The next compounding work is dedicated tracking: domain,
            CallRail, Search Console, GA4, and GBP access.
          </p>
        </div>

        <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9CA3AF]">
            Guardrails
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-[14px] leading-[1.6] text-[#C5C5C8]">
            <li>No fake GBP, ranking, review, or revenue claims.</li>
            <li>No secrets in client config.</li>
            <li>Sandbar stays the flagship production case study.</li>
            <li>Tampa stays a separate brand with separate status.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'gold' | 'muted' }) {
  return (
    <div
      className={`rounded-[14px] border p-4 ${
        tone === 'gold'
          ? 'border-[#D4AF37]/30 bg-[#D4AF37]/[0.08]'
          : 'border-white/[0.08] bg-white/[0.02]'
      }`}
    >
      <p className="text-[28px] font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9CA3AF]">
        {label}
      </p>
    </div>
  );
}

function ClientStatus({ client }: { client: Client }) {
  return (
    <article className="rounded-[18px] border border-white/[0.08] bg-[#0F0F12] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
        {client.role}
      </p>
      <h3 className="mt-3 text-[24px] font-bold tracking-[-0.01em] text-white">
        {client.name}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#C5C5C8]">{client.summary}</p>

      <div className="mt-5 grid grid-cols-1 gap-2">
        {client.status.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3 ${
              item.state === 'done'
                ? 'border-emerald-400/20 bg-emerald-400/[0.06]'
                : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-black ${
                  item.state === 'done'
                    ? 'bg-emerald-400 text-[#08110D]'
                    : 'border border-white/20 text-[#9CA3AF]'
                }`}
                aria-hidden="true"
              >
                {item.state === 'done' ? '✓' : '□'}
              </span>
              <span className="min-w-0 text-[14px] font-semibold text-white">{item.label}</span>
            </div>
            <span
              className={`text-[12px] font-bold uppercase tracking-[0.14em] ${
                item.state === 'done' ? 'text-emerald-300' : 'text-[#9CA3AF]'
              }`}
            >
              {item.state === 'done' ? 'Done' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {client.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex h-10 items-center rounded-[10px] border border-white/[0.10] bg-white/[0.02] px-3 text-[12px] font-bold text-[#D4AF37] transition hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.06]"
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}
