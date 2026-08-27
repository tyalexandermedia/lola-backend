/// <reference types="vite/client" />
/**
 * /about — the entity page for Coach Ty Alexander.
 *
 * Part of the personal-brand restructure. The homepage founder block
 * (Homepage.tsx #founder) always noted "a standalone /about page would be
 * better still"; this is it. Every word here is Ty's own copy, lifted from that
 * block and lib/lola — nothing invented. This page carries the Person entity
 * (personSchema in pageMeta now resolves its url here), so search + AI engines
 * have one canonical answer to "who is Coach Ty Alexander."
 *
 * It branches to the two things Ty does: Lola Leads (ready → /lolaleads) and,
 * later, training (/train, pending real content). No broken links: the Train
 * door is only added once that page exists.
 */

import PawMark from './PawMark';
import { FOUNDER, LOLA_TURNS } from './lib/lola';
import { GUARANTEE, LEAD_MAGNET } from './lib/pricing';
import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

const GBP_URL = (import.meta.env.VITE_GBP_URL as string | undefined)?.trim() || '';

const CHIPS = [
  'Hybrid athlete · trains HYROX',
  'Faith and family first',
  'Started with my dad’s crew',
  GUARANTEE.title,
];

export default function About() {
  usePageMeta('/about');
  useReveal();

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative pt-2 sm:pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[440px] w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_62%)] blur-2xl"
        />
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          About · {FOUNDER.knownAs}
        </span>
        <h1 className="mt-4 max-w-[720px] text-balance font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[52px]">
          The coach behind Lola Leads
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-[minmax(260px,340px)_1fr] sm:items-start sm:gap-x-14 sm:gap-y-5">
          {/* portrait */}
          <figure className="order-1 sm:col-start-1 sm:row-start-1">
            <div className="overflow-hidden rounded-xl border border-gold/25">
              <img
                src="/images/ty-lola-beach.jpg"
                alt="Ty Alexander Traufield — Coach Ty — with his dog Lola, the namesake of Lola Leads, on a Tampa Bay beach at sunset"
                loading="eager"
                width={600}
                height={800}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <figcaption className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Ty &amp; Lola · St. Pete, FL
            </figcaption>
          </figure>

          {/* the letter — Ty's own words */}
          <div className="order-2 sm:col-start-2 sm:row-start-1 sm:row-span-2">
            <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[40px]">
              Hey — I'm Ty.
            </h2>
            <div className="mt-6 max-w-[58ch] space-y-4 text-[16px] leading-[1.7] text-ink-2 sm:text-[17px]">
              <p>
                Lola's my dog —{' '}
                <span className="font-semibold text-ink">half basset hound, half shepherd</span>,{' '}
                {LOLA_TURNS} this February. The basset never loses a scent. The shepherd never
                leaves the flock. Turns out that's the whole job.
              </p>
              <p>
                So that's how we work. Lola watches — your rankings, your reviews, your calls.
                Around the clock, never bored, never off.{' '}
                <span className="font-semibold text-ink">I do the work she turns up.</span>
              </p>
              <p>
                I coach strength and conditioning. Same job either way: show up, do the work, keep
                showing up on the days nothing's happening yet. That's what moves you up Google.
                It's the part most agencies quietly skip.
              </p>
              <p>
                It started with one crew —{' '}
                <a
                  href="/r/client/sandbar"
                  className="font-semibold text-ink underline decoration-gold/40 underline-offset-4 transition hover:decoration-gold"
                >
                  Sandbar Soft Wash
                </a>
                , right here in the bay. Got them found on Google and in the AI answers. The phone
                started ringing. So I built the system to do it again.
              </p>
              <p className="border-l-2 border-gold pl-4 text-ink">
                What I'm not: a $5K-a-month agency hiding behind a dashboard. I answer my own phone.
                I do the work myself.{' '}
                <span className="font-bold text-gold">{GUARANTEE.short}</span> In writing.
              </p>
              <p>
                A local business that finally gets found changes what a family can say yes to.
                That's the whole point. Enough of you win,{' '}
                <span className="font-semibold text-ink">and Lola gets the backyard she deserves.</span>
              </p>
              <p className="text-[17px] font-semibold text-ink sm:text-[18px]">
                Let's get your phone ringing.
              </p>
            </div>
          </div>

          {/* signature + credentials */}
          <div className="order-3 sm:col-start-1 sm:row-start-2 sm:-mt-1">
            <p className="font-display text-[20px] text-gold">— {FOUNDER.knownAs}</p>
            <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-2">
              <span className="font-semibold text-ink">{FOUNDER.fullName}</span>
              <br />
              {FOUNDER.title} · {FOUNDER.company}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-3">{FOUNDER.location}</p>
            <a
              href={GBP_URL || 'https://www.google.com/maps/search/?api=1&query=Ty+Alexander+Media+Tampa+FL'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-2.5 text-[11px] uppercase leading-[1.2] tracking-[0.12em] text-gold transition hover:border-gold/60 hover:bg-gold/[0.12]"
            >
              {GBP_URL ? '✓ Verified Google Business' : 'Find us on Google Maps'} <span aria-hidden>↗</span>
            </a>
            <ul className="mt-5 flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-[11.5px] leading-none text-ink-3"
                >
                  <PawMark className="shrink-0 text-gold/70" />
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* the door that's ready today */}
      <section className="reveal mt-14 sm:mt-20">
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-[#16161A] to-[#0B0B0D] p-6 sm:p-8">
          <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-gold">Work with me</div>
          <h2 className="mt-2 font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[30px]">
            Lola Leads — get your business found and chosen
          </h2>
          <p className="mt-3 max-w-[600px] text-[15px] leading-[1.6] text-ink-2">
            Done-for-you local SEO and AI visibility for home-service contractors. {LEAD_MAGNET.blurb}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/lolaleads"
              className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold via-gold-bright to-gold bg-[length:200%_100%] bg-left px-6 py-3 text-[14px] font-bold uppercase tracking-[0.04em] text-on-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_rgba(212,175,55,0.28)] transition-all duration-200 hover:bg-right active:scale-[0.99]"
            >
              Explore Lola Leads
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href={LEAD_MAGNET.href}
              className="inline-flex min-h-[56px] items-center justify-center rounded-lg border border-gold/35 px-5 py-3 text-[14px] font-semibold text-gold transition-colors hover:border-gold/70 hover:bg-gold/[0.08]"
            >
              Run my free Growth Score
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
