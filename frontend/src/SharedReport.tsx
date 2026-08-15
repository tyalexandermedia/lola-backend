import { useEffect, useState } from 'react';
import type { AuditResult } from './types';
import { API_URL } from './api';
import { ResultsStage } from './AuditFlow';
import { useSeo } from './lib/seo';

export default function SharedReport({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * These are private deliverables, not marketing pages, and they were fully
   * indexable: robots.txt allows everything and this route set no SEO at all,
   * so every report inherited the homepage's title and description.
   *
   * Two problems that fixes. Search quality: one thin, near-identical page per
   * audit, all sharing a title, competing with the pages we actually want
   * ranked. And privacy: each one names a real business alongside its phone,
   * its weak spots and an estimate of the money it's losing — a competitor
   * could have searched that up.
   *
   * The title still reads properly when someone pastes the link into a text
   * or a DM; noindex only governs search engines.
   */
  useSeo({
    title: audit ? `Growth Score — ${audit.business_name}` : 'Growth Score report',
    description: audit
      ? `Google and AI search visibility report for ${audit.business_name}.`
      : 'A Lola Growth Score report.',
    robots: 'noindex',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_URL}/audits/${encodeURIComponent(auditId)}`);
        if (resp.status === 404) {
          throw new Error('That Growth Score has wandered off. Check the link.');
        }
        if (!resp.ok) {
          throw new Error('Could not load this Growth Score.');
        }
        const data: AuditResult = await resp.json();
        if (!cancelled) setAudit(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something broke.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '0ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '180ms' }} />
          <span className="h-3 w-3 animate-sniff rounded-full bg-[#FFD166]" style={{ animationDelay: '360ms' }} />
        </div>
        <p className="mt-6 text-sm text-slate-400">Fetching this audit…</p>
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold text-white">Lola lost the scent.</h2>
        <p className="mt-3 max-w-md text-base text-slate-400">{error ?? 'Growth Score not available.'}</p>
        <a
          href="/"
          className="mt-8 rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#F4B942] to-[#E09E23] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(255,193,7,0.24)] transition duration-150 hover:brightness-110 active:scale-[0.98] active:duration-75 focus:outline-none focus:ring-4 focus:ring-[#FFD166]/25"
        >
          Run your own Growth Score
        </a>
      </main>
    );
  }

  // This page has two very different readers, and they need different asks.
  //
  //   • The owner, arriving straight from the tool (?from=growth-score). Telling
  //     them to "Run your own Growth Score" is a dead end — they just ran it.
  //     Their next step is fixing what it found.
  //   • Someone the report was shared with, who hasn't been scored yet. For
  //     them "run your own" is exactly right.
  //
  // AiVisibility is no longer rendered here: it now lives inside ResultsStage,
  // so the /audit results get the real thing too instead of a "coming soon"
  // card. Rendering it here as well would show it twice.
  const justScored =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('from') === 'growth-score';

  return (
    <ResultsStage
      audit={audit}
      cta={
        justScored
          ? { label: 'Fix this for me — see the Full Build', href: '/pricing' }
          : { label: 'Run your own Growth Score', href: '/growth-score' }
      }
    />
  );
}
