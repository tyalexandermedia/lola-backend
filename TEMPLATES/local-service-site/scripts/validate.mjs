#!/usr/bin/env node
/**
 * validate.mjs — the gate between "config exists" and "site ships".
 *
 * Runs before every `astro build` (npm prebuild) and on `npm run validate`.
 * Zero dependencies, so it runs anywhere Node runs, including Vercel's build.
 *
 * Every client fact is one of three things:
 *   required     → missing = build fails with the field name
 *   optional     → missing = warning; the literal string "unavailable" = silent
 *   unavailable  → the client confirmed they do not have it; sections hide
 *
 * It also refuses to build with placeholder content (EXAMPLE / TODO markers,
 * the example domain, the 555 phone) unless ALLOW_EXAMPLE_CONFIG=1, and
 * refuses secrets or webhook URLs inside config files.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONFIG = join(ROOT, 'config');
const PUBLIC = join(ROOT, 'public');
const SERVICES = join(ROOT, 'src', 'content', 'services');
const ALLOW_EXAMPLE = process.env.ALLOW_EXAMPLE_CONFIG === '1';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const UNAVAILABLE = 'unavailable';
const isUnavailable = (v) => v === UNAVAILABLE;
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isHttps = (v) => isStr(v) && /^https:\/\/[^\s/]+(\/\S*)?$/.test(v);
const isEmail = (v) => isStr(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isHex = (v) => isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v);
const isE164 = (v) => isStr(v) && /^\+[1-9]\d{7,14}$/.test(v);
const isTime = (v) => isStr(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isStrList = (v) => Array.isArray(v) && v.length > 0 && v.every(isStr);
const publicExists = (p) => isStr(p) && p.startsWith('/') && existsSync(join(PUBLIC, p));

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function required(file, obj, path, test = isStr, hint = '') {
  const v = get(obj, path);
  const label = `${file} → ${path}`;
  if (v === undefined || v === null || v === '') return err(`${label}: required, missing${hint ? ` (${hint})` : ''}`);
  if (isUnavailable(v)) return err(`${label}: required, cannot be "unavailable"`);
  if (!test(v)) err(`${label}: invalid${hint ? ` (${hint})` : ''}`);
}

function optional(file, obj, path, test = isStr, hint = '') {
  const v = get(obj, path);
  const label = `${file} → ${path}`;
  if (v === undefined || v === null || v === '') return warn(`${label}: not set. Add a value, or "unavailable" to confirm the client does not have it.`);
  if (isUnavailable(v)) return;
  if (!test(v)) err(`${label}: invalid${hint ? ` (${hint})` : ''}`);
}

function loadJson(name) {
  const p = join(CONFIG, name);
  if (!existsSync(p)) { err(`config/${name}: missing`); return null; }
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { err(`config/${name}: invalid JSON (${e.message})`); return null; }
}

// ── site.json ────────────────────────────────────────────────────────────
const site = loadJson('site.json');
if (site) {
  const f = 'site.json';
  required(f, site, 'legalName');
  required(f, site, 'publicName');
  required(f, site, 'domain', (v) => isHttps(v) && !v.endsWith('/') && !v.includes('/', 8), 'https://www.example.com with no trailing slash');
  required(f, site, 'phone', isE164, 'E.164 like +17275550123');
  required(f, site, 'email', isEmail);
  required(f, site, 'primaryCustomer');
  required(f, site, 'serviceArea.summary');
  required(f, site, 'serviceArea.region', (v) => isStr(v) && /^[A-Z]{2}$/.test(v), 'two-letter state code');
  required(f, site, 'serviceArea.cities', isStrList, 'at least one city');
  required(f, site, 'hours', (v) => Array.isArray(v) && v.length > 0 && v.every((h) => isStrList(h.days) && isTime(h.opens) && isTime(h.closes)), 'array of { days[], opens "08:00", closes "18:00" }');
  required(f, site, 'cta.label');
  required(f, site, 'cta.responsePromise');
  optional(f, site, 'tagline');
  optional(f, site, 'address', (v) => v && typeof v === 'object' && ['street', 'city', 'region', 'postalCode', 'country'].every((k) => isStr(v[k])), 'object with street, city, region, postalCode, country');
  optional(f, site, 'foundingYear', (v) => /^\d{4}$/.test(String(v)), 'four-digit year');
  optional(f, site, 'licenseNumber');
  optional(f, site, 'about');
  optional(f, site, 'process', (v) => Array.isArray(v) && v.length > 0 && v.every((s) => isStr(s.title) && isStr(s.text)), 'array of { title, text }');
  optional(f, site, 'faqs', (v) => Array.isArray(v) && v.length > 0 && v.every((q) => isStr(q.q) && isStr(q.a)), 'array of { q, a }');
  if (site.schemaType !== undefined && !isStr(site.schemaType)) err(`${f} → schemaType: invalid`);
  if (site.allowSms !== undefined && typeof site.allowSms !== 'boolean') err(`${f} → allowSms: must be true or false`);
  for (const [k, v] of Object.entries(site.social || {})) optional(f, site, `social.${k}`, isHttps, 'https URL');
}

// ── brand.json ───────────────────────────────────────────────────────────
const brand = loadJson('brand.json');
if (brand) {
  const f = 'brand.json';
  for (const c of ['primary', 'accent', 'ink', 'background']) required(f, brand, `colors.${c}`, isHex, '#rrggbb');
  required(f, brand, 'logo', publicExists, 'path under /public that exists, e.g. /client/logo.svg');
  optional(f, brand, 'logoAlt');
  optional(f, brand, 'favicon', publicExists, 'path under /public that exists');
  optional(f, brand, 'heroImage', publicExists, 'path under /public that exists');
  if (isStr(brand.heroImage) && !isUnavailable(brand.heroImage) && !isStr(brand.heroImageAlt)) err(`${f} → heroImageAlt: required when heroImage is set`);
  optional(f, brand, 'ogImage', publicExists, 'path under /public that exists');
  if (brand.fontStack !== undefined && !isStr(brand.fontStack)) err(`${f} → fontStack: invalid`);
}

// ── proof.json ───────────────────────────────────────────────────────────
const proof = loadJson('proof.json');
if (proof) {
  const f = 'proof.json';
  for (const k of ['reviews', 'certifications', 'guarantees', 'beforeAfter']) {
    if (!Array.isArray(proof[k])) err(`${f} → ${k}: must be an array (empty is fine)`);
  }
  (proof.reviews || []).forEach((r, i) => {
    if (!isStr(r.quote) || !isStr(r.author) || !isStr(r.source)) err(`${f} → reviews[${i}]: needs quote, author, source`);
    if (!isHttps(r.sourceUrl)) err(`${f} → reviews[${i}].sourceUrl: https URL to where the review lives is required (verifiability)`);
    if (r.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) err(`${f} → reviews[${i}].date: YYYY-MM-DD`);
  });
  (proof.beforeAfter || []).forEach((p, i) => {
    if (!publicExists(p.before)) err(`${f} → beforeAfter[${i}].before: image not found under /public`);
    if (!publicExists(p.after)) err(`${f} → beforeAfter[${i}].after: image not found under /public`);
    if (!isStr(p.label) || !isStr(p.alt)) err(`${f} → beforeAfter[${i}]: needs label and alt`);
  });
  (proof.certifications || []).concat(proof.guarantees || []).forEach((s, i) => { if (!isStr(s)) err(`${f} → certifications/guarantees[${i}]: must be text`); });
  optional(f, proof, 'yearsInBusiness', (v) => /^\d{1,3}$/.test(String(v)), 'whole number of years');
  optional(f, proof, 'googleRating', (v) => v && typeof v === 'object' && v.rating >= 1 && v.rating <= 5 && Number.isInteger(v.count) && v.count > 0 && isHttps(v.url), '{ rating, count, url } from the live GBP');
  optional(f, proof, 'reviewPlatformUrl', isHttps, 'https URL');
  const anyProof = (proof.reviews || []).length || (proof.certifications || []).length || (proof.guarantees || []).length || (proof.beforeAfter || []).length || (isStr(proof.yearsInBusiness) && !isUnavailable(proof.yearsInBusiness)) || (proof.googleRating && !isUnavailable(proof.googleRating));
  if (!anyProof) warn(`${f}: no proof configured. Trust bar, reviews and before/after sections will be hidden. That is correct until verified proof exists.`);
}

// ── integrations.json ────────────────────────────────────────────────────
const integrations = loadJson('integrations.json');
if (integrations) {
  const f = 'integrations.json';
  required(f, integrations, 'ghl.webhookEnvVar', (v) => /^[A-Z][A-Z0-9_]+$/.test(v), 'an ENV VAR NAME, never the URL');
  required(f, integrations, 'ghl.source');
  required(f, integrations, 'ghl.tags', isStrList);
  required(f, integrations, 'notifications.resendEnvVar', (v) => /^[A-Z][A-Z0-9_]+$/.test(v), 'an ENV VAR NAME');
  if (!Array.isArray(integrations.notifications?.emails)) err(`${f} → notifications.emails: must be an array (empty is fine)`);
  else {
    integrations.notifications.emails.forEach((e, i) => { if (!isEmail(e)) err(`${f} → notifications.emails[${i}]: invalid email`); });
    if (integrations.notifications.emails.length) required(f, integrations, 'notifications.from', (v) => /<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(v) || isEmail(v), '"Name <leads@verified-domain.com>" on a Resend-verified domain');
    else optional(f, integrations, 'notifications.from');
  }
  optional(f, integrations, 'ga4MeasurementId', (v) => /^G-[A-Z0-9]{6,}$/.test(v), 'G-XXXXXXXXXX');
}

// ── services ─────────────────────────────────────────────────────────────
const serviceFiles = existsSync(SERVICES) ? readdirSync(SERVICES).filter((n) => n.endsWith('.md')) : [];
if (!serviceFiles.length) err('src/content/services: at least one service .md file is required');
for (const name of serviceFiles) {
  const slug = name.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) err(`services/${name}: file name must be kebab-case (it becomes the URL)`);
  const text = readFileSync(join(SERVICES, name), 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { err(`services/${name}: missing frontmatter block`); continue; }
  for (const key of ['name', 'priority', 'summary', 'faqs']) {
    if (!new RegExp(`^${key}:`, 'm').test(fm[1])) err(`services/${name}: frontmatter needs "${key}:"`);
  }
  if (text.slice(fm[0].length).trim().length < 200) warn(`services/${name}: body copy is under 200 characters. Thin service pages do not rank.`);
}

// ── placeholder + secret sweep ───────────────────────────────────────────
const PLACEHOLDER = [
  [/\bEXAMPLE\b/, 'EXAMPLE marker'],
  [/\bTODO\b/, 'TODO marker'],
  [/example-exterior\.com/i, 'example domain'],
  [/\+1555555\d{4}/, '555 example phone'],
];
const SECRETS = [
  [/services\.leadconnectorhq\.com\/hooks\//i, 'GoHighLevel webhook URL (belongs in an env var)'],
  [/hooks\.zapier\.com|hook\.(eu|us)\d*\.make\.com/i, 'automation webhook URL (belongs in an env var)'],
  [/\bre_[0-9A-Za-z]{16,}\b/, 'Resend API key'],
  [/\bpit-[0-9a-f]{8}-[0-9a-f]{4}/, 'GoHighLevel token'],
  [/\bsk_live_[0-9A-Za-z]{20,}/, 'Stripe secret'],
  [/\bAIza[0-9A-Za-z_\-]{35}\b/, 'Google API key'],
];
const scanTargets = [
  ...['site.json', 'brand.json', 'proof.json', 'integrations.json'].map((n) => join(CONFIG, n)),
  ...serviceFiles.map((n) => join(SERVICES, n)),
];
let placeholderHits = 0;
for (const p of scanTargets) {
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  const rel = p.replace(ROOT + '/', '');
  for (const [re, what] of SECRETS) if (re.test(text)) err(`${rel}: contains a ${what}. Remove it; secrets live only in Vercel environment variables.`);
  for (const [re, what] of PLACEHOLDER) {
    if (re.test(text)) {
      placeholderHits++;
      if (!ALLOW_EXAMPLE) err(`${rel}: contains ${what}. Placeholder content never ships. Replace it with the client's real, approved facts.`);
    }
  }
}
if (ALLOW_EXAMPLE && placeholderHits) warn(`ALLOW_EXAMPLE_CONFIG=1: ${placeholderHits} placeholder hit(s) tolerated. Never set this for a client build.`);

// ── report ───────────────────────────────────────────────────────────────
const ok = errors.length === 0;
console.log(`\nLola site validation — ${ok ? 'PASS' : 'FAIL'}`);
if (site) console.log(`  client: ${site.publicName || '?'}  domain: ${site.domain || '?'}  services: ${serviceFiles.length}`);
if (proof) console.log(`  proof: ${(proof.reviews || []).length} reviews · ${(proof.beforeAfter || []).length} before/after · ${(proof.certifications || []).length} certifications · ${(proof.guarantees || []).length} guarantees`);
if (errors.length) { console.log(`\n${errors.length} error(s):`); for (const e of errors) console.log(`  ✖ ${e}`); }
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); for (const w of warnings) console.log(`  ⚠ ${w}`); }
console.log('');
process.exit(ok ? 0 : 1);
