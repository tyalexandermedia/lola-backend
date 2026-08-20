import { useEffect } from 'react';

import { PAGE_META, canonicalFor } from './pageMeta';

/** Canonical production origin — single source for canonical + OG URLs. */
export const SITE_ORIGIN = 'https://lola.tyalexandermedia.com';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export interface SeoMeta {
  title: string;
  description: string;
  /**
   * Set `noindex` on pages that are private deliverables rather than marketing
   * — a customer's audit report, a client dashboard. Deliberately NOT paired
   * with a robots.txt Disallow: a disallowed page can't be crawled, so the
   * noindex is never seen and an already-indexed URL stays in the index.
   * Letting the crawler in to read the tag is what actually removes it.
   */
  robots?: 'index' | 'noindex';
  /** Absolute https canonical for this route. Also written to og:url. */
  canonical?: string;
}

/**
 * Per-route title + description + social (OG/Twitter) tags.
 *
 * The SPA ships one static index.html for every path, so without this each
 * route would inherit the homepage's title/description/OG copy. Canonical +
 * og:url are set centrally in App (route-derived, so they're correct even
 * before a lazy chunk mounts); this hook owns the per-route *copy*. Upserts
 * update the existing index.html tags in place — no duplicates.
 */
export function useSeo({ title, description, robots, canonical }: SeoMeta): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    // Canonical + og:url move with the route. The prerendered HTML already has
    // the right ones; this keeps them right after a client-side navigation,
    // which is what a crawler that DOES run JS ends up seeing.
    if (canonical) {
      upsertMeta('property', 'og:url', canonical);
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    if (robots !== 'noindex') return;
    upsertMeta('name', 'robots', 'noindex, nofollow');
    // Critical for an SPA: without this, navigating from a noindexed report to
    // a marketing page would leave the tag in the head and quietly deindex the
    // page we most want ranked.
    return () => {
      document.head.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, robots, canonical]);
}

/**
 * Per-route SEO from the shared PAGE_META table.
 *
 * Prefer this over calling useSeo with inline strings: the prerenderer reads
 * the same table, so a page using this hook is guaranteed to show a crawler
 * the same title/description/canonical whether or not JavaScript ran. Pages
 * that pass their own strings (private dashboards, the report view) are the
 * exception and keep using useSeo directly.
 */
export function usePageMeta(path: string): void {
  // No `document` fallback here: this module is imported during SSR, where
  // `document` is not merely undefined but undeclared, so `document?.title`
  // throws a ReferenceError rather than short-circuiting. An unknown path
  // yields empty strings, and useSeo's effect never runs on the server anyway.
  const meta = PAGE_META[path];
  useSeo({
    title: meta?.title ?? '',
    description: meta?.description ?? '',
    canonical: meta ? canonicalFor(meta.path) : undefined,
  });
}
