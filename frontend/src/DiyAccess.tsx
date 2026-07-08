/// <reference types="vite/client" />
/**
 * /diy — the $197 DIY deliverable: the 5-step fix-it checklist.
 *
 * Pay-now → instant access. The DIY Stripe Payment Link redirects here with
 * ?session_id=... after payment, which unlocks the checklist. Without that
 * param the page shows a locked "unlock for $197" state with the buy button.
 *
 * MVP gating is the redirect param (the customer only gets it post-payment).
 * Hardening step (later): verify the session server-side via Stripe before
 * unlocking, and the webhook emails/texts a copy so access survives a refresh.
 */

import { useEffect, useState } from 'react';
import { useReveal } from './lib/useReveal';
import { track } from './analytics';
import { API_URL } from './api';
import { useSeo } from './lib/seo';
import { checkoutUrl } from './lib/checkout';
import { DIY, BUILD } from './lib/pricing';

const STEPS: ReadonlyArray<{ n: string; title: string; do_: string; win: string }> = [
  {
    n: '01',
    title: 'Own your Google profile',
    do_: 'Claim your Google Business Profile, then fill in every field — hours, services, service area, 10+ photos, and the exact category that matches what you do.',
    win: 'This is the #1 thing that decides whether you show up on the Map.',
  },
  {
    n: '02',
    title: 'Make your name match everywhere',
    do_: 'Write your business name, address, and phone number exactly the same on your website, Google, Facebook, Yelp, and every directory. Same spelling, same format.',
    win: 'Google trusts you more when the details line up — and ranks you higher.',
  },
  {
    n: '03',
    title: 'Turn happy jobs into reviews',
    do_: 'Text every happy customer this: "Thanks again! Would you mind leaving us a quick Google review? Here\'s the link: [your link]." Ask within 24 hours of the job.',
    win: 'More recent 5-star reviews = more calls. It\'s the fastest needle-mover you own.',
  },
  {
    n: '04',
    title: 'Put your city + service where it counts',
    do_: 'Your homepage title and top heading should say what you do and where — e.g. "HVAC Repair in Tampa, FL." Add a short page for each main service you offer.',
    win: 'This is how you show up when someone searches "[what you do] near me."',
  },
  {
    n: '05',
    title: 'Answer the questions AI tools ask',
    do_: 'Add a plain FAQ to your site: what you do, where you work, pricing ballpark, how fast you respond. Write it the way a customer would ask it.',
    win: 'It\'s what ChatGPT, Perplexity, and Google read to decide whether to name you.',
  },
];

type Gate = 'checking' | 'locked' | 'unlocked';

export default function DiyAccess() {
  useReveal();
  const [gate, setGate] = useState<Gate>('checking');

  useSeo({
    title: 'Your DIY Fix-It Guide | Lola',
    description:
      'The $197 DIY guide: your Growth Score plus a simple 5-step fix-it checklist to get found on Google and in AI answers — fix it yourself, on your own time.',
  });

  // Unlock ONLY when the backend confirms the Stripe Checkout Session was paid —
  // never trust a bare URL param (a guessed ?session_id must not reveal the guide).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
    if (!sessionId) {
      setGate('locked');
      track('diy_access_locked_view');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await r.json();
        if (cancelled) return;
        if (data?.paid) {
          setGate('unlocked');
          track('diy_access_unlocked');
        } else {
          setGate('locked');
          track('diy_access_verify_failed');
        }
      } catch {
        if (!cancelled) setGate('locked');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlocked = gate === 'unlocked';
  const buyHref = checkoutUrl('diy') || '/pricing';

  if (gate === 'checking') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-sniff rounded-full bg-[#D4AF37]"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
        <p className="mt-6 text-[14px] text-[#9AA0A6]">Confirming your purchase…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="animate-slide-up relative pt-2 text-center sm:pt-6">
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute left-1/2 top-[-12%] -z-10 h-[560px] w-[min(1000px,124vw)] -translate-x-1/2 blur-[64px]"
          style={{
            background:
              'radial-gradient(40% 52% at 24% 12%, rgba(111,155,255,0.10), transparent 70%), radial-gradient(46% 56% at 80% 6%, rgba(212,175,55,0.18), transparent 70%)',
          }}
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
          {unlocked ? '✓ Payment confirmed' : 'The DIY Guide · $197'}
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3rem)' }}
        >
          {unlocked ? (
            <>Your 5-step fix-it checklist.</>
          ) : (
            <>See your score. Fix it yourself.</>
          )}
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.6] text-[#C5C5C8] sm:text-[16px]">
          {unlocked
            ? "Do these five in order. Each one is a move you can make this week — no agency, no jargon. We also texted and emailed you a copy so you have it on the truck."
            : "Your Growth Score shows where you stand. This guide is the exact 5 steps to lift it — the same moves we run for paying clients, written so you can do them yourself."}
        </p>
      </section>

      {unlocked ? (
        <>
          <section className="mx-auto mt-12 flex w-full max-w-[760px] flex-col gap-4 sm:mt-16">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] font-bold text-[#D4AF37]/70">{s.n}</span>
                  <h3 className="text-[18px] font-bold text-white sm:text-[20px]">{s.title}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#E8E4D8] sm:text-[15px]">{s.do_}</p>
                <p className="mt-2 text-[13px] leading-[1.55] text-[#9CA3AF]">
                  <span className="font-semibold text-[#D4AF37]">Why it works: </span>
                  {s.win}
                </p>
              </div>
            ))}
          </section>

          <section className="mx-auto mt-14 w-full max-w-[640px] rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-7 text-center sm:mt-16 sm:p-9">
            <h2 className="text-[20px] font-bold text-white sm:text-[24px]">
              Rather we just handle it?
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-[1.6] text-[#C5C5C8] sm:text-[15px]">
              The {BUILD.price} Full Build is done-for-you — new site, 30 days of visibility work
              across Google and the AI tools, and your keywords picked with Ty in week 1. Backed by
              the Half-Back Guarantee.
            </p>
            <a
              href={checkoutUrl('build') || '/retainer'}
              onClick={() => track('diy_to_build_cta')}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] transition hover:scale-[1.02]"
            >
              See the Full Build →
            </a>
          </section>
        </>
      ) : (
        <section className="mx-auto mt-12 w-full max-w-[560px] rounded-2xl border border-[#D4AF37]/30 bg-white/[0.02] p-7 text-center sm:mt-16 sm:p-9">
          <ul className="flex flex-col gap-3 text-left">
            {['Your full Growth Score', 'A simple 5-step fix-it checklist', 'Do it on your own time — no calls, no contract'].map(
              (b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-white">
                  <span aria-hidden className="mt-0.5 text-[#D4AF37]">✓</span>
                  {b}
                </li>
              ),
            )}
          </ul>
          <a
            href={buyHref}
            onClick={() => track('diy_unlock_cta')}
            className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#D4AF37] via-[#F4D47C] to-[#D4AF37] px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-[#0A0A0B] shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02]"
          >
            Unlock the guide — {DIY.price} →
          </a>
          <p className="mt-4 text-[12px] text-[#7A7F8A]">
            One-time. Instant access. Already paid? Check your text or email for the link.
          </p>
        </section>
      )}

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-[#5A5F68] sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
