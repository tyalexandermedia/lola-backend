/**
 * AiVisibility — "what AI actually says about you", shown under the Growth
 * Score results at peak intent.
 *
 * Calls GET /ai-visibility, which asks Claude whether an AI assistant would
 * currently recommend this business for its trade + city. When AI doesn't name
 * them, that's the gap the Full Build closes — so this block becomes live proof
 * with a direct CTA. Renders nothing if the backend has no Anthropic key
 * (available:false) or there isn't enough info to ask.
 */

import { useEffect, useState } from 'react';
import { API_URL } from './api';

interface Result {
  available: boolean;
  names_you?: boolean;
  summary?: string;
  skipped?: boolean;
}

export default function AiVisibility({
  business,
  city,
  trade,
}: {
  business: string;
  city: string;
  trade: string;
}) {
  const [phase, setPhase] = useState<'loading' | 'hidden' | 'done'>('loading');
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!business?.trim() || !city?.trim()) {
      setPhase('hidden');
      return;
    }
    (async () => {
      try {
        const q = new URLSearchParams({ business, city, trade: trade || '' });
        const r = await fetch(`${API_URL}/ai-visibility?${q.toString()}`);
        const data: Result = await r.json();
        if (cancelled) return;
        if (!data.available || data.skipped) {
          setPhase('hidden');
          return;
        }
        setRes(data);
        setPhase('done');
      } catch {
        if (!cancelled) setPhase('hidden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [business, city, trade]);

  if (phase === 'hidden') return null;

  const named = !!res?.names_you;
  const q = `best ${trade || 'local business'} in ${city}?`;

  return (
    <section className="mx-auto mt-12 w-full max-w-[760px] px-1 sm:mt-16">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
        What AI says about you
      </p>
      <h2
        className="mx-auto mt-3 max-w-[620px] text-center font-bold leading-[1.15] tracking-[-0.01em] text-white"
        style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}
      >
        We just asked ChatGPT &amp; Claude about you.
      </h2>

      <div className="mx-auto mt-7 max-w-[600px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        {/* The question */}
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#D4AF37]/[0.12] px-4 py-2 text-right text-[14px] text-[#E8E4D8]">
          {q}
        </div>

        {/* The answer */}
        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D47C] text-[14px]"
          >
            🐾
          </span>
          {phase === 'loading' ? (
            <p className="flex items-center gap-2 text-[14px] text-[#9AA0A6]">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 animate-sniff rounded-full bg-[#D4AF37]"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
              Asking ChatGPT and Claude what they say about you…
            </p>
          ) : (
            <p className="text-[15px] leading-[1.55] text-white">
              {res?.summary ||
                (named
                  ? `Good news — an AI assistant would point people toward ${business}.`
                  : `Right now an AI assistant wouldn't reliably recommend ${business} for "${q}".`)}
            </p>
          )}
        </div>
      </div>

      {phase === 'done' && (
        <div
          className={`mx-auto mt-5 max-w-[600px] rounded-2xl border p-5 text-center sm:p-6 ${
            named
              ? 'border-emerald-400/30 bg-emerald-400/[0.05]'
              : 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]'
          }`}
        >
          {named ? (
            <>
              <p className="text-[15px] font-semibold text-emerald-300">
                ✓ You&apos;re already on AI&apos;s radar.
              </p>
              <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-[1.6] text-[#C5C5C8]">
                Now let&apos;s make sure you&apos;re the <em>top</em> pick — and that Google agrees.
                The $997 Full Build locks it in.
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-white">
                That&apos;s the gap — and it&apos;s costing you jobs.
              </p>
              <p className="mx-auto mt-2 max-w-[480px] text-[13px] leading-[1.6] text-[#C5C5C8]">
                When your next customer asks AI for a {trade || 'business'} in {city}, you want to be
                the name it gives. The <span className="font-semibold text-[#D4AF37]">$997 Full
                Build</span> gets you found — on Google and in AI answers — backed by our Half-Back
                Guarantee.
              </p>
            </>
          )}
          <a
            href="/retainer"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_4px_16px_rgba(212,175,55,0.28)] transition hover:scale-[1.02]"
          >
            See the Full Build →
          </a>
        </div>
      )}

      <p className="mx-auto mt-3 max-w-[520px] text-center text-[11px] leading-[1.5] text-[#5A5F68]">
        Live check via ChatGPT/Claude-class models. AI answers change over time — that&apos;s exactly
        why staying visible is ongoing work.
      </p>
    </section>
  );
}
