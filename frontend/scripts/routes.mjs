/**
 * The marketing routes that get prerendered — one list, imported by both
 * scripts/prerender.mjs and scripts/check-seo.mjs so they cannot drift.
 *
 * Deliberately excludes anything private or per-user: /r/<id> reports,
 * /r/client/<slug> dashboards and the admin screens are noindex by design and
 * have no business in a static build. /diy is excluded too — it is a noindexed
 * access page for a retired product.
 *
 * The /lp/* tree is NOT here and must not be added. Those pages are generated
 * by scripts/gen_lp.py straight into public/, already ship as real static HTML
 * with their own <head> and schema, and are owned by that generator.
 */
export const ROUTES = [
  '/',
  '/pricing',
  '/work',
  '/growth-score',
  '/methodology',
  '/vs',
  '/apply',
  // The individual comparisons are the pages that actually rank — "<vendor> vs
  // Lola" and "are Local Service Ads worth it" are the high-intent queries.
  // Prerendering only the hub would leave every one of them uncrawlable.
  '/vs/local-service-ads',
  '/vs/localiq',
  '/vs/brightlocal',
  '/vs/scorpion',
  '/vs/podium',
  '/vs/yext',
  '/vs/hibu',
];
