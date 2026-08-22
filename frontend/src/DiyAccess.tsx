/// <reference types="vite/client" />
/**
 * /diy — access page for the RETIRED self-serve fix kit.
 *
 * The kit is no longer sold. This route survives only so anyone who already
 * paid keeps their access: their Stripe success link carries ?session_id=...,
 * the backend confirms it was paid, and the checklist unlocks. Deleting or
 * redirecting the route would strand a paying customer.
 *
 * Without that param the page shows a locked state that says so plainly and
 * points at the one plan that exists. It is noindexed and out of the sitemap so
 * it never ranks against /pricing.
 */

import { useEffect, useState } from 'react';
import { useReveal } from './lib/useReveal';
import { track } from './analytics';
import { API_URL } from './api';
import {
  generateGbpDescription,
  generateGbpPost,
  generateSchemaFallback,
  generateTitleTag,
} from './AuditFlow';
import type { AuditResult } from './types';
import { useSeo } from './lib/seo';
import { startHref } from './lib/checkout';
import { GUARANTEE, PLAN } from './lib/pricing';

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
  // The DIY tier is retired. This route stays alive so anyone who already paid
  // keeps their access via their Stripe success link — deleting or redirecting
  // it would strand a paying customer. But it must not rank or compete with
  // /pricing, so it is out of the sitemap and noindexed.
  useSeo({
    title: 'Your fix kit — Lola',
    description: 'Access page for a previously purchased Lola fix kit.',
    robots: 'noindex',
  });
  useReveal();
  const [gate, setGate] = useState<Gate>('checking');

  // A second useSeo() used to sit here selling "the $397/month kit", which ran
  // after the noindex call above and silently overwrote it — so the page meant
  // to be hidden was indexable and advertising a retired product. Its companion
  // Product/Offer JSON-LD published a rich-result price for that same retired
  // product. Both are gone; the noindex above is now the only SEO call.

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

  /**
   * The four fixes this tier actually sells, rebuilt for the buyer's own
   * business. The free report shows fix #1 finished and names the other three;
   * this is where those three are delivered. Without it a buyer would pay $397/month
   * and receive generic advice — worse than the free page they came from.
   *
   * The audit id is remembered when they click unlock on their report. If it's
   * missing (different device, cleared storage), the checklist below still
   * stands on its own, so nobody is left with nothing.
   */
  const [paidAudit, setPaidAudit] = useState<AuditResult | null>(null);
  useEffect(() => {
    if (!unlocked || typeof window === 'undefined') return;
    let auditId = '';
    try {
      auditId = window.localStorage.getItem('lolaLastAuditId') || '';
    } catch { /* ignore */ }
    if (!auditId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/audits/${encodeURIComponent(auditId)}`);
        if (!r.ok) return;
        const data: AuditResult = await r.json();
        if (!cancelled) setPaidAudit(data);
      } catch { /* fall back to the checklist */ }
    })();
    return () => { cancelled = true; };
  }, [unlocked]);

  if (gate === 'checking') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-sniff rounded-full bg-gold"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
        <p className="mt-6 text-[14px] text-ink-3">Confirming your purchase…</p>
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
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
          {unlocked ? '✓ Payment confirmed' : 'Retired · access page'}
        </p>
        <h1
          className="mx-auto mt-4 max-w-[760px] font-bold leading-[1.1] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3rem)' }}
        >
          {unlocked ? (
            <>Your fix kit is ready.</>
          ) : (
            <>This kit is retired.</>
          )}
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
          {unlocked
            ? "Do these five in order. Each one is a move you can make this week — no agency, no jargon. We also texted and emailed you a copy so you have it on the truck."
            : "If you bought the fix kit, open the access link we texted and emailed you and it unlocks here. Otherwise there's one plan now, and I run all five of these steps for you."}
        </p>
      </section>

      {unlocked ? (
        <>
          {paidAudit && (
            <section className="mx-auto mt-12 w-full max-w-[760px] sm:mt-16">
              <h2 className="text-[20px] font-bold text-white sm:text-[24px]">
                Your four fixes, written for {paidAudit.business_name}.
              </h2>
              <p className="mt-2 text-[14px] leading-[1.6] text-ink-3">
                Paste each one where it says. Nothing to rewrite.
              </p>
              <div className="mt-6 flex flex-col gap-4">
                {[
                  { n: '1', label: 'Title tag', where: 'Page Settings → SEO → Title', body: generateTitleTag(paidAudit) },
                  { n: '2', label: 'Google Business Profile description', where: 'GBP → Edit profile → Business description', body: generateGbpDescription(paidAudit) },
                  { n: '3', label: 'Your first GBP post', where: 'GBP → Add update → Post', body: generateGbpPost(paidAudit) },
                  { n: '4', label: 'LocalBusiness schema', where: 'Site <head> → Structured Data', body: generateSchemaFallback(paidAudit) },
                ].map((d) => (
                  <div key={d.n} className="rounded-[14px] border border-gold/25 bg-white/[0.02] p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                      {d.n} · {d.label}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-3">Paste into: {d.where}</p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-[10px] bg-on-gold p-4 text-[13px] leading-[1.55] text-ink-2">
{d.body}
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mx-auto mt-12 flex w-full max-w-[760px] flex-col gap-4 sm:mt-16">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] font-bold text-gold/70">{s.n}</span>
                  <h3 className="text-[18px] font-bold text-white sm:text-[20px]">{s.title}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-[1.6] text-ink-2 sm:text-[15px]">{s.do_}</p>
                <p className="mt-2 text-[13px] leading-[1.55] text-ink-3">
                  <span className="font-semibold text-gold">Why it works: </span>
                  {s.win}
                </p>
              </div>
            ))}
          </section>

          <section className="mx-auto mt-14 w-full max-w-[640px] rounded-2xl border border-gold/30 bg-gold/[0.05] p-7 text-center sm:mt-16 sm:p-9">
            <h2 className="text-[20px] font-bold text-white sm:text-[24px]">
              Rather we just handle it?
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-[1.6] text-ink-2 sm:text-[15px]">
              {PLAN.price}{PLAN.period}, done for you — your website designed and built (included
              free), your Google Business Profile managed, and your keywords picked with Ty in
              week 1. Backed by {GUARANTEE.title}.
            </p>
            <a
              href={startHref()}
              onClick={() => track('diy_to_plan_cta')}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-gold via-gold-bright to-gold px-6 text-[13px] font-bold uppercase tracking-[0.05em] text-on-gold transition hover:scale-[1.02]"
            >
              {PLAN.cta} — {PLAN.price}{PLAN.period} →
            </a>
          </section>
        </>
      ) : (
        /* Locked. This used to sell "Unlock the guide — $397/month →" under the
           label "One-time" — the retired DIY kit, repriced by the pricing sweep
           into a self-contradicting button. Nobody can buy this product, so the
           locked state stops selling it and points at the plan that exists. */
        <section className="mx-auto mt-12 w-full max-w-[560px] rounded-2xl border border-gold/30 bg-white/[0.02] p-7 text-center sm:mt-16 sm:p-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
            Nothing to unlock here
          </p>
          <h2 className="mt-4 text-[20px] font-bold leading-[1.2] text-white sm:text-[24px]">
            The self-serve kit isn&apos;t sold anymore.
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[14px] leading-[1.6] text-ink-2 sm:text-[15px]">
            If you bought it, your access link came by text and email — open that link and this
            page unlocks. If you&apos;re here looking for help, there&apos;s one plan now:{' '}
            {PLAN.price}{PLAN.period}, and I do all of it for you.
          </p>
          <a
            href={startHref()}
            onClick={() => track('diy_locked_to_plan_cta')}
            className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-gold via-gold-bright to-gold px-7 text-[14px] font-bold uppercase tracking-[0.05em] text-on-gold shadow-[0_6px_20px_rgba(212,175,55,0.32)] transition hover:scale-[1.02]"
          >
            {PLAN.cta} — {PLAN.price}{PLAN.period} →
          </a>
          <p className="mt-4 text-[12px] text-ink-4">
            Website design included free ·{' '}
            <a href="/pricing" className="text-gold underline-offset-2 hover:underline">
              see what&apos;s included
            </a>
          </p>
        </section>
      )}

      <div className="mt-16 pb-10 text-center text-[12px] leading-[1.6] text-ink-4 sm:mt-24">
        <p>Ty Alexander Media · Tampa Bay</p>
        <p className="mt-1">© 2026 · Built with Lola 🐾</p>
      </div>
    </main>
  );
}
