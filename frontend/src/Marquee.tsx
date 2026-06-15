/**
 * Scrolling stats marquee — horizontal infinite loop with gold separator
 * diamonds, pause-on-hover, slow ~60s cycle. Self-contained so it can drop
 * into any page (homepage hero, future content pages).
 */

const STATS = [
  'Sandbar Soft Wash — 5 keywords ranked in 3 weeks',
  '✓ Verified Google Business — Ty Alexander Media',
  'Tracks ChatGPT · Gemini · Perplexity · Claude',
  '🔒 One business per niche per city — Local Lock',
  '30-Day Half-Back Guarantee',
  '60-second AI Visibility Score, no signup',
  'Transparent pricing — $297 to $997/mo, done-for-you',
  'Built for local service businesses',
  'Faith-driven, legacy-focused, founder-led',
];

export default function Marquee() {
  // We render the stats list twice so the loop is seamless — when the first
  // copy scrolls fully off, the second copy is already in position.
  return (
    <div className="group relative overflow-hidden border-y border-[#D4AF37]/15 bg-[#0A0A0B] py-4">
      <div
        className="flex w-max animate-marquee gap-8 whitespace-nowrap text-[12px] uppercase tracking-[0.18em] text-[#C5C5C8] sm:text-[13px] sm:tracking-[0.22em]"
        style={{ animationPlayState: 'running' }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-8">
            {STATS.map((s, i) => (
              <div key={`${copy}-${i}`} className="flex shrink-0 items-center gap-8">
                <span>{s}</span>
                <span aria-hidden className="text-[#D4AF37]">◇</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
