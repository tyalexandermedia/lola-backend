/// <reference types="vite/client" />
/**
 * The video sales letter block — player, crawlable transcript, VideoObject schema.
 *
 * Renders NOTHING until VITE_VSL_URL is set, so it can ship ahead of the video
 * and appear the moment the upload exists. No other edit required.
 *
 * ── Env vars to set ──────────────────────────────────────────────────────
 *   VITE_VSL_URL          YouTube watch/share URL, or a direct .mp4/.webm URL
 *   VITE_VSL_POSTER       thumbnail image URL (also used as schema thumbnailUrl)
 *   VITE_VSL_UPLOAD_DATE  YYYY-MM-DD — schema uploadDate, required for the
 *                         video rich result
 *
 * Three things earn their keep here, and they are the reason this is a
 * component rather than an <iframe> pasted into Homepage:
 *
 *   1. FACADE, NOT AN EMBED. A YouTube iframe pulls ~1MB of player JS and
 *      several third-party connections on first paint — on the page whose LCP
 *      is the thing being optimised for. This paints the poster image and only
 *      swaps in the real player after a click, which is when a player is
 *      actually wanted. Autoplay on load would be worse than either: muted
 *      autoplay costs the same bandwidth and unmuted is blocked anyway.
 *
 *   2. THE TRANSCRIPT IS REAL DOM, NOT A TOGGLE'S PAYLOAD. It renders into the
 *      prerendered HTML whether or not anyone opens it, so Google, GPTBot,
 *      ClaudeBot and PerplexityBot read every word. A video is opaque to a
 *      crawler; the transcript is the only part of a VSL that can rank or be
 *      quoted back by an AI answer. `hidden` on a <details> body still ships
 *      the text — CSS-collapsed content is indexed; it is only discounted when
 *      it's a deliberate cloak, which a labelled transcript is not.
 *
 *   3. VideoObject JSON-LD renders server-side. Injecting it from an effect
 *      would miss the prerender pass, and a schema a crawler never sees buys
 *      nothing.
 */

import { useState } from 'react';

import { GUARANTEE, LEAD_MAGNET } from './lib/pricing';
import { SITE_ORIGIN } from './lib/seo';

const VSL_URL = (import.meta.env.VITE_VSL_URL as string | undefined)?.trim() || '';
const VSL_POSTER = (import.meta.env.VITE_VSL_POSTER as string | undefined)?.trim() || '';
const VSL_UPLOAD_DATE = (import.meta.env.VITE_VSL_UPLOAD_DATE as string | undefined)?.trim() || '';

const TITLE = 'Free Growth Score — Get Found on Google & AI';
const DESCRIPTION =
  'In 60 seconds, see the exact gaps keeping your local business invisible on Google and in AI search — then get your free Growth Score.';

/** YouTube video id from any of the URL shapes people paste. */
function youTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function isFileVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

/**
 * The spoken transcript, as crawlable copy.
 *
 * Deliberately written to match the live offer rather than the draft script:
 * the draft said "if I don't in 90 days, you get your money back", which is the
 * retired Half-Back Guarantee. The promise is quoted from GUARANTEE so the page
 * cannot state refund terms the business doesn't offer.
 */
const TRANSCRIPT: ReadonlyArray<{ at: string; text: string }> = [
  {
    at: '0:00',
    text: "Real quick — I'm going to show you exactly why your business is invisible online. Sixty seconds. Watch.",
  },
  {
    at: '0:05',
    text: "This is a free Growth Score. I drop in a local business — say a pressure washer here in Tampa — and it checks the exact things that decide whether you get found on Google and in AI answers like ChatGPT.",
  },
  {
    at: '0:20',
    text: "Here's what it found. Google Business Profile? Half set up. Reviews? No schema, so Google can't even read them. Mobile speed? Slow — that's clicks walking away. And AI search? Totally invisible. That's not my opinion. That's the score, in black and white.",
  },
  {
    at: '0:50',
    text: `Every one of those is a customer you're not getting. Most SEO guys hand you a fifty-page report and vanish. I don't. I fix these and I get you ranking — and ${GUARANTEE.short.toLowerCase()}`,
  },
  {
    at: '1:10',
    text: 'Your Growth Score is free. The link is right here. Sixty seconds and you will see exactly where you stand.',
  },
  { at: '1:25', text: "I'm Ty. This is Lola. Let's get your phone ringing." },
];

export default function Vsl() {
  const [playing, setPlaying] = useState(false);
  if (!VSL_URL) return null;

  const ytId = youTubeId(VSL_URL);
  // schema.org URL fields must be absolute — Google's rich-result test rejects
  // "/images/poster.jpg". A poster dropped in /public is the normal case, so
  // resolve site-relative paths against the canonical origin rather than
  // requiring whoever sets the env var to remember.
  const abs = (u: string) => (u.startsWith('/') ? `${SITE_ORIGIN}${u}` : u);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: TITLE,
    description: DESCRIPTION,
    ...(VSL_POSTER ? { thumbnailUrl: abs(VSL_POSTER) } : {}),
    ...(VSL_UPLOAD_DATE ? { uploadDate: VSL_UPLOAD_DATE } : {}),
    contentUrl: abs(VSL_URL),
    ...(ytId ? { embedUrl: `https://www.youtube.com/embed/${ytId}` } : {}),
    transcript: TRANSCRIPT.map((t) => t.text).join(' '),
    publisher: {
      '@type': 'Organization',
      name: 'Lola Leads · Ty Alexander Media',
      url: SITE_ORIGIN,
    },
  };

  return (
    <section className="mt-14 sm:mt-20">
      <div className="mx-auto max-w-[860px]">
        <p className="text-center text-[11px] uppercase tracking-[0.1em] text-gold">
          Watch first
        </p>
        <h2 className="mt-3 text-balance text-center font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-white sm:text-[38px]">
          Why your business is invisible — in 90 seconds.
        </h2>

        <div className="mt-7 overflow-hidden rounded-xl border border-gold/25 bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
          {playing ? (
            ytId ? (
              <iframe
                // nocookie + autoplay=1: the click already expressed intent, so
                // the player starting is expected rather than an ambush.
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
                title={TITLE}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={VSL_URL} poster={VSL_POSTER || undefined} controls autoPlay playsInline className="aspect-video w-full bg-black" />
            )
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play: ${TITLE}`}
              className="group relative block aspect-video w-full overflow-hidden bg-black"
            >
              {VSL_POSTER ? (
                <img
                  src={VSL_POSTER}
                  alt="Free Growth Score demo — get found on Google and AI"
                  width={1280}
                  height={720}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-[#1A1A1F] to-on-gold" />
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[22px] text-on-gold shadow-[0_8px_28px_rgba(212,175,55,0.5)] transition group-hover:scale-105 sm:h-20 sm:w-20">
                  ▶
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="mt-5 text-center">
          <a
            href={LEAD_MAGNET.href}
            className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-lg bg-gold px-7 py-3 text-[14px] font-bold uppercase tracking-[0.04em] text-on-gold transition-colors hover:bg-gold-bright"
          >
            Run my free Growth Score
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <p className="mt-2.5 text-[12.5px] text-ink-3">
            Free · 60 seconds · no signup
          </p>
        </div>

        {/* Crawlable transcript. Collapsed for readers, present in the HTML for
            Google and for the AI crawlers this whole business is aimed at. */}
        <details className="mt-8 rounded-xl border border-white/[0.08] bg-surface">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-[13px] font-semibold text-ink-2 transition hover:text-white">
            Read the transcript
          </summary>
          <div className="space-y-3 border-t border-white/[0.07] px-5 py-4">
            {TRANSCRIPT.map((t) => (
              <p key={t.at} className="text-[14px] leading-[1.65] text-ink-2">
                <span className="mr-2 font-mono text-[11px] tabular-nums text-ink-3">{t.at}</span>
                {t.text}
              </p>
            ))}
          </div>
        </details>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  );
}
