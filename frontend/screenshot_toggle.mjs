import { chromium } from 'playwright';

const MOCK_AUDIT = { audit_id: 'demo', business_name: 'Sandbar Soft Wash',
  website: 'https://sandbarsoftwash.com', city: 'Palm Harbor, FL',
  business_type: 'soft wash', email: 'team@sandbarsoftwash.com',
  total_score: 68, grade: 'C', grade_label: 'Needs Work', percentile: 52, segment: 'education',
  lola_message: 'Sandbar Soft Wash has solid bones.',
  revenue_leak: { monthly_leak: 12500, annual_leak: 150000, missed_calls_per_month: 25,
                  avg_job_value: 500, recovery_potential: 8500, recovery_calls: 17, payback_months: 3 },
  page_speed: { performance: 64, accessibility: 78, seo: 82, ok: true },
  safety: { is_safe: true, ok: true },
  business_info: { ok: true, name: 'Sandbar Soft Wash', address: '1234 Main', phone: '(727) 555-0123',
                   website: 'https://sandbarsoftwash.com', rating: 4.2, review_count: 14,
                   verification_confidence: 'medium' },
  competitors: [],
  categories: { gbp_completeness: { score: 65 }, reviews: { score: 53 }, mobile_speed: { score: 64 },
                seo_basics: { score: 82 }, accessibility: { score: 78 }, local_trust: { score: 100 },
                safety: { score: 100 } },
  signals: { gbp_completeness: { weight: 25, value: 65, available: true },
             reviews: { weight: 20, value: 53, available: true },
             mobile_speed: { weight: 20, value: 64, available: true },
             seo_basics: { weight: 10, value: 82, available: true },
             accessibility: { weight: 10, value: 78, available: true },
             local_trust: { weight: 10, value: 100, available: true },
             safety: { weight: 5, value: 100, available: true } },
  recommendations: [] };
const MOCK_HEALTH = { status: 'ok', has_keys: { google_pagespeed: true, google_places: true, google_safe_browsing: true, google_custom_search: true, brevo: true, resend: true },
  api_status: { pagespeed: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                places: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                safe_browsing: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                custom_search: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null } },
  audit_api_budget: 6 };
const MOCK_PRICING = { founding_active: true, founding_slots_remaining: 7, founding_cap: 10,
  tiers: { diy: { one_time: 197 }, standard: { monthly: 497, monthly_original: 697 },
           pro: { monthly: 997, monthly_original: 1297 } } };

const BASE = 'http://127.0.0.1:4173';

async function setup(page) {
  await page.route('**/audits/demo*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT) }));
  await page.route('**/health*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HEALTH) }));
  await page.route('**/pricing*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRICING) }));
}

async function runDesktop() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto(`${BASE}/r/demo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Pick Your Path');
  await page.waitForTimeout(700);

  const cta = page.locator('section:has-text("Pick Your Path")').last();

  // Monthly (default)
  await cta.scrollIntoViewIfNeeded();
  await cta.screenshot({ path: '/tmp/pricing-desktop-monthly.png' });

  // Click Annual toggle
  await page.click('button[role="radio"]:has-text("Annual")');
  await page.waitForTimeout(350);
  await cta.screenshot({ path: '/tmp/pricing-desktop-annual.png' });
  console.log('  desktop monthly + annual captured');
  await browser.close();
}

async function runMobile() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto(`${BASE}/r/demo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Pick Your Path');
  await page.waitForTimeout(700);

  // Scroll the pricing into view, capture (no sticky yet)
  const cta = page.locator('section:has-text("Pick Your Path")').last();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/sticky-mobile-before.png' });

  // Click Annual
  await page.click('button[role="radio"]:has-text("Annual")');
  await page.waitForTimeout(350);
  await cta.screenshot({ path: '/tmp/pricing-mobile-annual.png' });

  // Scroll all the way down past pricing to trigger sticky CTA
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/sticky-mobile-visible.png' });
  console.log('  mobile annual + sticky-CTA captured');
  await browser.close();
}

(async () => {
  await runDesktop();
  await runMobile();
  console.log('done');
})();
