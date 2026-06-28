import { useEffect } from 'react';

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
export function useSeo({ title, description }: SeoMeta): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
  }, [title, description]);
}
