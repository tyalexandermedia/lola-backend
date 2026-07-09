/**
 * WatchExplainer — a "See how it works" button that opens a short demo video
 * in a modal (the pattern from the Stone Systems "See Short Demo" button).
 *
 * The video URL comes from VITE_EXPLAINER_VIDEO_URL (or a `videoUrl` prop, so
 * individual features can have their own demo later). Supports YouTube, Loom,
 * and direct .mp4/.webm files. If no URL is set the button renders nothing —
 * so it's invisible until you drop in a Loom/YouTube link, never a dead button.
 */

import { useEffect, useState } from 'react';
import { track } from './analytics';

const ENV_VIDEO =
  (import.meta.env.VITE_EXPLAINER_VIDEO_URL as string | undefined)?.trim() || '';

/** Convert a share URL to an embeddable one; null → treat as a direct video file. */
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith('loom.com')) {
      const id = u.pathname.split('/').pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    /* fall through */
  }
  return null; // direct file (.mp4/.webm) — play in a <video>
}

export default function WatchExplainer({
  videoUrl,
  label = 'See how it works',
  seconds,
  className = '',
}: {
  videoUrl?: string;
  label?: string;
  seconds?: number;
  className?: string;
}) {
  const url = (videoUrl ?? ENV_VIDEO).trim();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!url) return null; // no video set yet → render nothing

  const embed = toEmbed(url);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track('watch_explainer_open', { label });
        }}
        className={`inline-flex items-center gap-2.5 rounded-full border border-[#D4AF37]/40 bg-white/[0.03] px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#D4AF37] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.08] ${className}`}
      >
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] text-[#0A0A0B]"
        >
          ▶
        </span>
        {label}
        {seconds ? <span className="text-[#9CA3AF]">· {seconds}s</span> : null}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0A0A0B]/92 p-4 backdrop-blur-[6px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Demo video"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-[900px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close video"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.15] bg-white/[0.03] text-[18px] text-[#C5C5C8] transition hover:border-[#D4AF37]/40 hover:text-white"
            >
              ✕
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-[14px] border border-white/[0.12] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {embed ? (
                <iframe
                  src={`${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`}
                  title="How Lola works"
                  className="h-full w-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={url} controls autoPlay playsInline className="h-full w-full">
                  Your browser can’t play this video.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
