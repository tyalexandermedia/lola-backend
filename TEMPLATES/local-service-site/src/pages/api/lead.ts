/**
 * POST /api/lead — the only server route in the site.
 *
 * Accepts the estimate form as JSON (progressive enhancement) or as a plain
 * form POST (JavaScript off). Validates, drops obvious bots silently, then
 * forwards the lead to the client's GoHighLevel inbound webhook and, when
 * configured, sends a plain-text notification through Resend.
 *
 * Safety rules:
 *  - Secrets come from environment variables named in config/integrations.json.
 *  - If NO destination is configured the request fails loudly ("unconfigured")
 *    rather than pretending the lead was delivered.
 *  - Nothing about the lead is logged except the outcome and the service.
 */
import type { APIRoute } from 'astro';
import { CTA_PATH, INTEGRATIONS, SITE, phoneDisplay } from '../../lib/config';

export const prerender = false;

const MIN_FILL_MS = 2500;
const THANK_YOU = '/thank-you';

type Lead = Record<string, string | string[]>;

function clean(v: unknown, max: number): string {
  // Strip ASCII control characters, trim, cap length.
  return typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max) : '';
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length >= 7 ? `+${digits}` : '';
}

function env(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return (fromProcess ?? (import.meta.env as Record<string, string | undefined>)[name] ?? '').trim();
}

type Redirect = (to: string, status?: 301 | 302 | 303 | 307 | 308) => Response;

function respond(wantsJson: boolean, redirect: Redirect, ok: boolean, code?: string): Response {
  if (wantsJson) {
    return new Response(JSON.stringify(ok ? { ok: true, redirect: THANK_YOU } : { ok: false, error: code }), {
      status: ok ? 200 : code === 'missing' ? 400 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return redirect(ok ? THANK_YOU : `${CTA_PATH}?error=${code}#estimate-form`, 303);
}

async function forwardToGhl(lead: Lead): Promise<boolean> {
  const url = env(INTEGRATIONS.ghl.webhookEnvVar);
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      signal: controller.signal,
    });
    if (!res.ok) console.warn(`[lead] GHL responded ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn(`[lead] GHL request failed: ${(e as Error).message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function notifyByEmail(lead: Lead): Promise<boolean> {
  const key = env(INTEGRATIONS.notifications.resendEnvVar);
  const { from, emails } = INTEGRATIONS.notifications;
  if (!key || !emails.length || !from || from === 'unavailable') return false;
  const lines = Object.entries(lead)
    .filter(([k]) => k !== 'tags')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: emails,
        subject: `New estimate request: ${lead.service} (${SITE.publicName})`,
        text: `New estimate request from the website.\n\n${lines}\n\nCall back: ${lead.phone}\n`,
      }),
    });
    if (!res.ok) console.warn(`[lead] Resend responded ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn(`[lead] Resend request failed: ${(e as Error).message}`);
    return false;
  }
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const contentType = request.headers.get('content-type') || '';
  const wantsJson = contentType.includes('application/json') || (request.headers.get('accept') || '').includes('application/json');

  let data: Record<string, unknown> = {};
  try {
    if (contentType.includes('application/json')) {
      data = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      form.forEach((v, k) => { data[k] = String(v); });
    }
  } catch {
    return respond(wantsJson, redirect, false, 'missing');
  }

  // Bots: honeypot filled, or the form was submitted faster than a human types.
  const startedAt = Number(data._t || 0);
  if (clean(data.company, 10) || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    return respond(wantsJson, redirect, true);
  }

  const name = clean(data.name, 80);
  const phone = normalizePhone(clean(data.phone, 30));
  const service = clean(data.service, 80);
  if (!name || !phone || !service) return respond(wantsJson, redirect, false, 'missing');

  const lead: Lead = {
    name,
    phone,
    email: clean(data.email, 120),
    city: clean(data.city, 80),
    service,
    notes: clean(data.notes, 1000),
    source: INTEGRATIONS.ghl.source,
    tags: INTEGRATIONS.ghl.tags,
    site: SITE.domain,
    page_url: clean(data.page_url, 500),
    referrer: clean(data.referrer, 300) || clean(request.headers.get('referer'), 300),
    landing_page: clean(data.landing_page, 500),
    first_seen: clean(data.first_seen, 40),
    utm_source: clean(data.utm_source, 200),
    utm_medium: clean(data.utm_medium, 200),
    utm_campaign: clean(data.utm_campaign, 200),
    utm_term: clean(data.utm_term, 200),
    utm_content: clean(data.utm_content, 200),
    gclid: clean(data.gclid, 200),
    fbclid: clean(data.fbclid, 200),
    msclkid: clean(data.msclkid, 200),
    submitted_at: new Date().toISOString(),
  };

  const ghlConfigured = !!env(INTEGRATIONS.ghl.webhookEnvVar);
  const emailConfigured = !!env(INTEGRATIONS.notifications.resendEnvVar) && INTEGRATIONS.notifications.emails.length > 0;
  if (!ghlConfigured && !emailConfigured) {
    console.error('[lead] no destination configured: set the GHL webhook env var, or Resend plus notification emails');
    return respond(wantsJson, redirect, false, 'unconfigured');
  }

  const [ghl, email] = await Promise.all([forwardToGhl(lead), notifyByEmail(lead)]);
  console.log(`[lead] service=${JSON.stringify(service)} ghl=${ghl} email=${email}`);
  if (!ghl && !email) return respond(wantsJson, redirect, false, 'send_failed');
  return respond(wantsJson, redirect, true);
};

export const GET: APIRoute = () =>
  new Response(`Use the estimate form or call ${phoneDisplay()}.`, { status: 405, headers: { Allow: 'POST' } });
