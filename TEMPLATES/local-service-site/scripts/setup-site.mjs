#!/usr/bin/env node
/**
 * setup-site.mjs — turn the master template into ONE client's site.
 *
 *   npm run setup-site            # interactive
 *   npm run setup-site -- --force # overwrite a config that is no longer the example
 *
 * Asks only for facts that change between clients, writes config/*.json,
 * creates one service file per service (with TODO markers the validator
 * refuses to ship), copies the logo, deletes the EXAMPLE placeholders, then
 * runs the validator so you see exactly what is still missing.
 *
 * It never invents copy. Anything you skip is stored as "unavailable" or
 * left as a TODO for a human to write.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONFIG = join(ROOT, 'config');
const SERVICES = join(ROOT, 'src', 'content', 'services');
const CLIENT_DIR = join(ROOT, 'public', 'client');
const FORCE = process.argv.includes('--force');

// readline drops lines that arrive before a question is pending, which breaks
// piped input (tests, future intake files). Buffer every line instead.
const rl = createInterface({ input, output, terminal: false });
const pending = [];
const waiting = [];
let closed = false;
rl.on('line', (line) => { const w = waiting.shift(); if (w) w(line); else pending.push(line); });
rl.on('close', () => { closed = true; while (waiting.length) waiting.shift()(null); });
const readLine = () => {
  if (pending.length) return Promise.resolve(pending.shift());
  if (closed) return Promise.resolve(null);
  return new Promise((r) => waiting.push(r));
};
const ask = async (q, { def = '', required = false, validate } = {}) => {
  for (;;) {
    output.write(`${q}${def ? ` [${def}]` : ''}: `);
    const line = await readLine();
    if (line === null) {
      if (required && !def) { console.error('\nInput ended before a required answer. Nothing was written.'); process.exit(1); }
      return def;
    }
    const raw = line.trim();
    const v = raw || def;
    if (!v && required) { console.log('  This one is required.'); continue; }
    if (v && validate && !validate(v)) { console.log('  That does not look right, try again.'); continue; }
    return v;
  }
};
const askOptional = async (q) => (await ask(`${q} (blank = unavailable)`)) || 'unavailable';
const yes = async (q, def = true) => /^y/i.test(await ask(`${q} (y/n)`, { def: def ? 'y' : 'n' }));
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isE164 = (v) => /^\+[1-9]\d{7,14}$/.test(v);
const isHttps = (v) => /^https:\/\/[^\s/]+$/.test(v);
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const current = JSON.parse(readFileSync(join(CONFIG, 'site.json'), 'utf8'));
const isExample = /example-exterior\.com/.test(current.domain || '');
if (!isExample && !FORCE) {
  console.error(`config/site.json already describes "${current.publicName}". Re-run with --force to overwrite.`);
  process.exit(1);
}

console.log('\nLola Local Service Site — new client setup');
console.log('Answer with the client\'s real, approved facts. Skip what they do not have.\n');

const legalName = await ask('Legal business name', { required: true });
const publicName = await ask('Public business name (as shown on the site)', { def: legalName.replace(/,?\s*(LLC|Inc\.?|Corp\.?)$/i, '').trim(), required: true });
const domain = await ask('Production domain (https://www.example.com, no trailing slash)', { required: true, validate: isHttps });
const phone = await ask('Primary phone in E.164 (+17275550123)', { required: true, validate: isE164 });
const allowSms = await yes('Can customers text this number?');
const email = (await ask('Public email (blank = unavailable)', { validate: isEmail })) || 'unavailable';
const primaryCustomer = await ask('Primary customer, one line (e.g. "Homeowners in Pinellas County who want their roof and driveway cleaned")', { required: true });
const summary = await ask('Service area summary (e.g. "Dunedin and Pinellas County")', { required: true });
const region = await ask('State code', { def: 'FL', required: true, validate: (v) => /^[A-Z]{2}$/.test(v) });
const cities = list(await ask('Approved service-area cities, comma separated, most important first', { required: true }));

console.log('\nBusiness hours. Enter one line per block, blank days to finish.');
const hours = [];
for (;;) {
  const days = list(await ask(hours.length ? 'Days (comma separated, blank to finish)' : 'Days (e.g. Monday,Tuesday,Wednesday,Thursday,Friday)', { required: hours.length === 0 }));
  if (!days.length) break;
  const opens = await ask('  Opens (24h HH:MM)', { def: '08:00', validate: (v) => /^\d{2}:\d{2}$/.test(v) });
  const closes = await ask('  Closes (24h HH:MM)', { def: '18:00', validate: (v) => /^\d{2}:\d{2}$/.test(v) });
  hours.push({ days, opens, closes });
}

const ctaLabel = await ask('Primary CTA label', { def: 'Get My Free Estimate', required: true });
const ctaPath = await ask('CTA page URL segment (estimate | consultation | contact)', { def: 'estimate', required: true, validate: (v) => /^[a-z0-9-]+$/.test(v) });
const responsePromise = await ask('Response-time promise the owner will actually keep (e.g. "We reply within one business day.")', { required: true });
const tagline = await askOptional('Tagline');
const foundingYear = await askOptional('Founding year');
const licenseNumber = await askOptional('License number');
const about = await askOptional('About paragraph in the owner\'s words');
const hasAddress = await yes('Publish a street address? (service-area businesses usually say no)', false);
const address = hasAddress
  ? {
      street: await ask('  Street', { required: true }),
      city: await ask('  City', { required: true }),
      region: await ask('  State', { def: region, required: true }),
      postalCode: await ask('  ZIP', { required: true }),
      country: 'US',
    }
  : 'unavailable';
const gbp = await askOptional('Google Business Profile URL');
const facebook = await askOptional('Facebook URL');
const instagram = await askOptional('Instagram URL');

console.log('\nBrand.');
const primary = await ask('Primary color (hex)', { def: '#0b2233', validate: isHex });
const accent = await ask('Accent color (hex)', { def: '#c99a2e', validate: isHex });
const logoPath = await ask('Path to the logo file to copy into public/client (blank to add later)');

console.log('\nServices, in priority order. One page is created per service.');
const serviceNames = list(await ask('Services, comma separated, most important first', { required: true }));

console.log('\nIntegrations (names only, secrets go in Vercel).');
const ga4 = await askOptional('GA4 measurement id (G-XXXXXXXX)');
const notifyEmails = list(await ask('Lead notification email(s), comma separated (blank to rely on GHL only)'));
const from = notifyEmails.length ? await ask('Resend "from" on a verified domain (e.g. "Website Leads <leads@clientdomain.com>")', { required: true }) : 'unavailable';

rl.close();

// ── write config ─────────────────────────────────────────────────────────
mkdirSync(CLIENT_DIR, { recursive: true });
let logo = '/client/logo.svg';
if (logoPath) {
  const src = resolve(logoPath);
  if (!existsSync(src)) { console.error(`Logo not found: ${src}`); process.exit(1); }
  logo = `/client/logo${extname(src).toLowerCase()}`;
  copyFileSync(src, join(ROOT, 'public', logo));
} else {
  console.log(`  ⚠ No logo copied. Put it at public${logo} (validator will fail until it exists).`);
}
for (const f of readdirSync(CLIENT_DIR)) if (/example/i.test(f)) rmSync(join(CLIENT_DIR, f));

const site = {
  legalName, publicName, domain, phone, allowSms, email, primaryCustomer, tagline,
  serviceArea: { summary, region, cities },
  address, hours,
  cta: { label: ctaLabel, responsePromise, path: ctaPath },
  schemaType: 'LocalBusiness',
  foundingYear, licenseNumber, about,
  process: 'unavailable',
  faqs: 'unavailable',
  legalNotice: 'unavailable',
  homeDescription: 'unavailable',
  social: { googleBusinessProfile: gbp, facebook, instagram },
};
const brand = {
  colors: { primary, accent, ink: '#152430', background: '#faf7f0' },
  fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  logo, logoAlt: `${publicName} logo`, favicon: logo,
  heroImage: 'unavailable', heroImageAlt: 'unavailable', ogImage: 'unavailable',
};
const proof = { yearsInBusiness: 'unavailable', googleRating: 'unavailable', reviewPlatformUrl: 'unavailable', reviews: [], certifications: [], guarantees: [], beforeAfter: [] };
const integrations = {
  ghl: { webhookEnvVar: 'GHL_WEBHOOK_URL', source: 'website', tags: ['website-lead'] },
  notifications: { resendEnvVar: 'RESEND_API_KEY', from, emails: notifyEmails },
  ga4MeasurementId: ga4,
};
const write = (name, obj) => writeFileSync(join(CONFIG, name), JSON.stringify(obj, null, 2) + '\n');
write('site.json', site);
write('brand.json', brand);
write('proof.json', proof);
write('integrations.json', integrations);

// ── services ─────────────────────────────────────────────────────────────
mkdirSync(SERVICES, { recursive: true });
for (const f of readdirSync(SERVICES)) if (/^example/.test(f)) rmSync(join(SERVICES, f));
serviceNames.forEach((name, i) => {
  const file = join(SERVICES, `${slugify(name)}.md`);
  if (existsSync(file)) return;
  writeFileSync(
    file,
    `---
name: "${name.replace(/"/g, '\\"')}"
priority: ${i + 1}
summary: "TODO: one or two plain sentences on what ${name.toLowerCase()} does for the customer."
heroSub: "TODO: the outcome in one line."
faqs:
  - q: "TODO: a real question customers ask about ${name.toLowerCase()}?"
    a: "TODO: the owner's answer."
---

TODO: write the ${name.toLowerCase()} page the way the owner explains it on the phone.

## TODO: heading

TODO: paragraph.
`,
  );
});

console.log(`\nWrote config for ${publicName} and ${serviceNames.length} service file(s).`);
console.log('TODO markers block the build on purpose. Replace every one with approved copy.\n');
console.log('Next:');
console.log('  1. Fill src/content/services/*.md and config/proof.json with verified facts.');
console.log('  2. npm run validate');
console.log('  3. npm run dev');
console.log('  4. Vercel: import the repo, set GHL_WEBHOOK_URL (and RESEND_API_KEY if used).');
console.log('  5. Send the preview URL to the owner.\n');

const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate.mjs')], { stdio: 'inherit' });
process.exit(result.status ?? 0);
