/**
 * Lola SEO — marketing homepage at `/`.
 *
 * Sections (top to bottom):
 *   1. Hero — eyebrow, H1, subhead, primary + secondary CTAs, trust line
 *   2. Execution-first framing line
 *   3. Scrolling stats marquee
 *   4. Outcome stats (4 numbers)
 *   5. Personal story (Coach Ty)
 *   6. 4-step process block
 *   7. Final CTA → /audit
 *
 * Routing:
 *   "Start Free Audit" → /audit (the questionnaire, was at /)
 *   "See Pricing"      → /pricing (new dedicated route)
 */

import Marquee from './Marquee';

export default function Homepage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section className="animate-slide-up relative pt-2 sm:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10)_0%,transparent_60%)] blur-2xl"
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          AI Visibility for Local Contractors
        </p>

        <h1
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)' }}
        >
          I build AI visibility systems that
          {' '}
          <span className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-transparent">
            recommend your business
          </span>
          {' '}— without you touching a thing.
        </h1>

        <p className="mt-6 max-w-[680px] text-[16px] leading-[1.55] text-[#C5C5C8] sm:text-[18px]">
          Lola makes sure Google AI, ChatGPT, Perplexity, Gemini, and the next
          generation of AI search agents recommend your business. Done for you.
          Transparent pricing. No long-term contracts.
        </p>

        {/* AI search positioning — the single line that frames why "AI visibility"
            is different from "SEO." Sits between subhead and CTA so it's the last
            thing read before clicking. */}
        <p className="mt-5 max-w-[680px] rounded-[10px] border-l-2 border-[#D4AF37]/60 bg-[#D4AF37]/[0.04] py-3 pl-4 pr-3 text-[14px] leading-[1.55] text-white sm:text-[15px]">
          Lola checks where your business shows up in <span className="font-semibold text-[#D4AF37]">Google</span> AND in{' '}
          <span className="font-semibold text-[#D4AF37]">ChatGPT/AI search</span> — because that's where your next customer is searching.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/audit"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
          >
            Start free audit →
          </a>
          <a
            href="/pricing"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[12px] border border-white/[0.15] bg-white/[0.02] px-7 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#D4AF37] transition-all duration-200 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] sm:h-16 sm:text-[15px]"
          >
            See pricing
          </a>
        </div>

        <p className="mt-5 text-[12px] text-[#7A7F8A] sm:text-[13px]">
          20-second audit · No signup · No spam
        </p>
      </section>

      {/* ── 2. EXECUTION-FIRST FRAMING LINE ─────────────────────────── */}
      <p className="mt-10 max-w-[820px] text-[15px] leading-[1.6] text-white sm:mt-14 sm:text-[17px]">
        <span className="font-bold text-[#D4AF37]">SEO tools tell you what's broken.</span>
        {' '}Premium agencies charge $2,500/mo to fix it.
        {' '}
        <span className="font-bold text-[#D4AF37]">Lola does the work for $697/mo</span>
        {' '}— with a guarantee.
        {' '}<span className="font-bold text-white">Real work or you walk.</span>
      </p>

      {/* ── 3. SCROLLING STATS MARQUEE ──────────────────────────────── */}
      {/* Break out of the page max-width so the marquee spans full viewport */}
      <div className="relative left-1/2 right-1/2 mt-12 -mx-[50vw] w-screen sm:mt-16">
        <Marquee />
      </div>

      {/* ── 4. OUTCOME STATS BLOCK (4 numbers) ──────────────────────── */}
      <section className="mt-14 sm:mt-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { num: '20 sec', label: 'Audit completion time' },
            { num: '$1,800/mo', label: 'Saved vs premium agencies' },
            { num: '5 keywords', label: 'Ranked in 3 weeks (Sandbar)' },
            { num: '60 days', label: 'To first guaranteed win' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[#D4AF37]/20 bg-white/[0.02] p-5 sm:p-6"
            >
              <p className="bg-gradient-to-br from-[#FFD166] via-[#F4D47C] to-[#D4AF37] bg-clip-text text-[28px] font-extrabold leading-none tracking-[-0.02em] text-transparent sm:text-[34px]">
                {s.num}
              </p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.18em] text-[#C5C5C8] sm:text-[13px]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. PERSONAL STORY (Coach Ty) ─────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          // My Story
        </p>
        <blockquote
          className="mt-5 font-bold leading-[1.18] tracking-[-0.01em] text-white"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          "I was tired of watching Florida contractors pay $2,500/mo to agencies
          that promised rankings and delivered nothing."
        </blockquote>

        <div className="mt-7 space-y-4 text-[15px] leading-[1.65] text-[#C5C5C8] sm:text-[16px]">
          <p>
            I built Lola because the SEO industry has been ripping off the same
            contractors I grew up around in Tampa Bay. Long contracts. Hidden
            pricing. Cookie-cutter strategies that don't work for soft wash,
            roof cleaning, or any service that depends on local AI recommendations.
          </p>
          <p>
            I tested everything on Sandbar Soft Wash — 5 keywords ranked in 3 weeks.
            Now I'm helping more Florida contractors get the AI agent visibility
            their competitors can't even see.
          </p>
          <p className="text-white">
            <span className="font-bold text-[#D4AF37]">Faith-driven. Purpose-built. Real work or you walk.</span>
          </p>
        </div>

        <p className="mt-6 text-[14px] text-[#D4AF37]">
          — Coach Ty
          <span className="block text-[12px] text-[#8A8F98] sm:inline sm:before:content-['_·_']">
            Founder, Lola SEO · Tampa Bay, FL
          </span>
        </p>
      </section>

      {/* ── 6. 4-STEP PROCESS BLOCK ─────────────────────────────────── */}
      <section className="mt-16 sm:mt-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Our Process
        </p>
        <h2
          className="mt-4 font-bold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
        >
          We don't just diagnose. We execute.
        </h2>
        <p className="mt-4 max-w-[680px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          I'm not an SEO consultant who learned about contractors. I'm a
          contractor's strategist who built AI visibility from the trenches.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: '01',
              h: 'Audit',
              body: 'We baseline how AI agents see your business.',
              get: 'Total clarity on your visibility gaps',
              pro: false,
            },
            {
              n: '02',
              h: 'Build',
              body: 'We fix the gaps. GMB, citations, reviews, schema.',
              get: 'AI-ready foundation in 30 days',
              pro: false,
            },
            {
              n: '03',
              h: 'Reinforce',
              body: 'Monthly content, citations, reviews. Visibility compounds.',
              get: 'AI agent recommendations on autopilot',
              pro: false,
            },
            {
              n: '04',
              h: 'Dominate',
              body: 'Auto-Fix snippet pushes changes directly. White-glove support.',
              get: 'Competitors wonder how you did it',
              pro: true,
            },
          ].map((step) => (
            <div
              key={step.n}
              className={`group relative flex flex-col rounded-[12px] border bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 sm:p-6 ${
                step.pro
                  ? 'border-[#D4AF37]/40 hover:border-[#D4AF37]/65 hover:shadow-[0_0_28px_rgba(212,175,55,0.20)]'
                  : 'border-white/[0.08] hover:border-white/[0.18]'
              }`}
            >
              {step.pro && (
                <span className="absolute right-4 top-4 rounded-full bg-[#D4AF37]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Pro
                </span>
              )}
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">
                {step.n}
              </p>
              <h3 className="mt-2 text-[22px] font-bold text-white sm:text-[24px]">
                {step.h}
              </h3>
              <p className="mt-3 flex-1 text-[14px] leading-[1.55] text-[#C5C5C8]">
                {step.body}
              </p>
              <p className="mt-5 border-t border-white/[0.06] pt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]/70">
                You get:
              </p>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.45] text-white">
                {step.get}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[760px] text-[14px] italic leading-[1.6] text-[#9AA0A6] sm:text-[15px]">
          This is the same process that took Sandbar Soft Wash from invisible to
          5 keywords ranked in 3 weeks. Now we run it for more Florida contractors.
        </p>
      </section>

      {/* ── 7. FINAL CTA ─────────────────────────────────────────────── */}
      <section className="mt-16 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#F4B942]/[0.05] to-[#0A0A0B] p-7 text-center shadow-[0_0_44px_rgba(212,175,55,0.15)] sm:mt-24 sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          Start Here
        </p>
        <h2
          className="mt-4 font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
        >
          See exactly how AI agents see your business — in 20 seconds.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.55] text-[#C5C5C8] sm:text-[16px]">
          Free audit. No signup. No spam. Just clarity on what's leaking and
          what to fix first.
        </p>
        <a
          href="/audit"
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] bg-[length:200%_100%] bg-left px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(212,175,55,0.32)] transition-all duration-[400ms] ease-out hover:bg-right hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_rgba(212,175,55,0.55)] active:scale-[0.98] sm:h-16 sm:text-[15px]"
        >
          Start the audit →
        </a>
      </section>

      {/* Minimal footer */}
      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
