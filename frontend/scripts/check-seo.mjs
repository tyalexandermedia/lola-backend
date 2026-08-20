/**
 * SEO contract checker — runs after the build, fails loudly on regression.
 *
 * The metadata problem this guards against was invisible for months because
 * nothing measured it: `useSeo` looked correct in the source, and Lighthouse
 * scored SEO 100 on every page, because Lighthouse checks that *a* title and
 * *a* description exist — not that fourteen pages share one of each.
 *
 * So this reads the built HTML, the way a crawler does, and asserts the things
 * that actually matter:
 *
 *   • every prerendered route has a UNIQUE title and description
 *   • title <= 60 chars, description <= 155 chars
 *   • exactly one self-referencing https canonical per page
 *   • exactly one <h1>
 *   • og:url matches the canonical (it used to be the homepage everywhere)
 *   • every JSON-LD block parses
 *   • FAQPage appears only on routes whose questions are in the visible HTML
 *   • no /lp/* file is inspected or touched — that tree is owned elsewhere
 *
 * Exits non-zero with a list of failures, so a bad build is loud rather than
 * silently shipped.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const TITLE_MAX = 60;
const DESC_MAX = 155;

const first = (s, re) => {
  const m = s.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};
const countOf = (s, re) => (s.match(re) || []).length;

// Decode the handful of entities that show up in prerendered attribute values,
// so a title measured here is the length a human/search engine sees.
/**
 * Text a human actually reads.
 *
 * <script> and <style> CONTENT has to be dropped, not just their tags — the
 * first version of this stripped tags only, so every FAQPage question matched
 * itself inside its own JSON-LD and the visibility check passed unconditionally.
 * A check that can't fail is worse than no check: it reports safety it never
 * verified.
 */
const visibleText = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

async function main() {
  if (!existsSync(DIST)) {
    console.error('[check-seo] dist/ missing — run the build first.');
    process.exit(1);
  }

  const { ROUTES } = await import('./routes.mjs');
  const failures = [];
  const titles = new Map();
  const descs = new Map();
  const rows = [];

  for (const route of ROUTES) {
    const file =
      route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.slice(1), 'index.html');
    if (!existsSync(file)) {
      failures.push(`${route}: not prerendered (${path.relative(ROOT, file)} missing)`);
      continue;
    }
    const html = await readFile(file, 'utf8');

    const title = decode(first(html, /<title>([\s\S]*?)<\/title>/i));
    const desc = decode(first(html, /<meta\s+name="description"\s+content="([\s\S]*?)"/i));
    const canon = first(html, /<link\s+rel="canonical"\s+href="([\s\S]*?)"/i);
    const ogUrl = first(html, /<meta\s+property="og:url"\s+content="([\s\S]*?)"/i);
    const h1 = countOf(html, /<h1[\s>]/gi);
    const nCanon = countOf(html, /rel="canonical"/gi);
    const expected = `https://lola.tyalexandermedia.com${route === '/' ? '/' : route}`;

    if (!title) failures.push(`${route}: no <title>`);
    if (title.length > TITLE_MAX) failures.push(`${route}: title ${title.length} > ${TITLE_MAX} — "${title}"`);
    if (!desc) failures.push(`${route}: no meta description`);
    if (desc.length > DESC_MAX) failures.push(`${route}: description ${desc.length} > ${DESC_MAX}`);
    if (nCanon !== 1) failures.push(`${route}: ${nCanon} canonical tags (want exactly 1)`);
    if (canon !== expected) failures.push(`${route}: canonical "${canon}" != "${expected}"`);
    if (ogUrl !== expected) failures.push(`${route}: og:url "${ogUrl}" != canonical "${expected}"`);
    if (h1 !== 1) failures.push(`${route}: ${h1} <h1> tags (want exactly 1)`);

    if (title && titles.has(title)) failures.push(`${route}: duplicate title, also on ${titles.get(title)}`);
    else if (title) titles.set(title, route);
    if (desc && descs.has(desc)) failures.push(`${route}: duplicate description, also on ${descs.get(desc)}`);
    else if (desc) descs.set(desc, route);

    // JSON-LD: must parse, and a FAQPage must describe questions that are
    // really rendered on this page.
    const types = [];
    for (const block of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
      const body = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (err) {
        failures.push(`${route}: invalid JSON-LD (${err.message})`);
        continue;
      }
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        const t = node['@type'];
        types.push(...(Array.isArray(t) ? t : [t]));
        if (t === 'FAQPage' || (Array.isArray(t) && t.includes('FAQPage'))) {
          for (const q of node.mainEntity || []) {
            const probe = decode(q.name).slice(0, 40).replace(/\s+/g, ' ');
            if (!visibleText(html).includes(probe)) {
              failures.push(`${route}: FAQPage claims a question not visible on the page — "${probe}…"`);
            }
          }
        }
      }
    }
    for (const required of ['Organization', 'Person', 'WebSite', 'Service']) {
      if (!types.includes(required)) failures.push(`${route}: missing ${required} schema`);
    }

    rows.push({ route, t: title.length, d: desc.length, h1, schema: [...new Set(types)].length });
  }

  // ── sitemap cross-check ────────────────────────────────────────────────
  // Three real bugs shipped here before this existed: /grader stayed listed
  // after it became a 301, /case-studies was listed twice, and
  // /vs/local-service-ads — one of the highest-intent pages on the site — was
  // never listed at all. Search Console reports the first as "Page with
  // redirect" instead of coverage, and simply never discovers the third.
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  if (existsSync(sitemapPath)) {
    const xml = await readFile(sitemapPath, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const paths = locs.map((u) => u.replace('https://lola.tyalexandermedia.com', '') || '/');

    const dupes = paths.filter((v, i) => paths.indexOf(v) !== i);
    for (const d of [...new Set(dupes)]) failures.push(`sitemap: ${d} listed more than once`);

    const redirected = new Set();
    const vercelPath = path.join(ROOT, 'vercel.json');
    if (existsSync(vercelPath)) {
      const vercel = JSON.parse(await readFile(vercelPath, 'utf8'));
      for (const r of vercel.redirects || []) redirected.add(r.source);
    }
    for (const p2 of paths) {
      if (redirected.has(p2)) failures.push(`sitemap: ${p2} is a redirect source — submitting it reports as "Page with redirect"`);
    }

    // Every prerendered marketing route should be discoverable.
    const listed = new Set(paths.map((p2) => p2.replace(/\/$/, '') || '/'));
    for (const r of ROUTES) {
      if (!listed.has(r)) failures.push(`sitemap: ${r} is prerendered but not listed`);
    }
    console.log(`[check-seo] sitemap: ${paths.length} URLs (${paths.filter((p2) => !p2.startsWith('/lp/')).length} app + ${paths.filter((p2) => p2.startsWith('/lp/')).length} /lp)`);
  }

  const pad = (s, n) => String(s).padEnd(n);
  const w = Math.max(...rows.map((r) => r.route.length)) + 2;
  console.log(`\n[check-seo] ${rows.length} prerendered routes`);
  console.log(pad('route', w) + pad('title', 7) + pad('desc', 6) + pad('h1', 4) + 'schema nodes');
  for (const r of rows) {
    console.log(pad(r.route, w) + pad(r.t, 7) + pad(r.d, 6) + pad(r.h1, 4) + r.schema);
  }
  console.log(
    `[check-seo] unique titles ${titles.size}/${rows.length} · unique descriptions ${descs.size}/${rows.length}`,
  );

  if (failures.length) {
    console.error(`\n[check-seo] ✗ ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  • ${f}`);
    process.exit(1);
  }
  console.log('[check-seo] ✓ all checks passed\n');
}

main().catch((err) => {
  console.error('[check-seo] failed:', err);
  process.exit(1);
});
