import { chromium } from 'playwright';

const MOCK_AUDIT = {
  audit_id: 'demo',
  business_name: 'Sandbar Soft Wash',
  website: 'https://sandbarsoftwash.com',
  city: 'Palm Harbor, FL',
  business_type: 'soft wash',
  email: 'team@sandbarsoftwash.com',
  total_score: 68,
  grade: 'C',
  grade_label: 'Needs Work',
  percentile: 52,
  segment: 'education',
  lola_message:
    "Sandbar Soft Wash has solid bones. A few targeted moves turn this into a lead machine.",
  revenue_leak: {
    monthly_leak: 12500, annual_leak: 150000, missed_calls_per_month: 25,
    avg_job_value: 500, recovery_potential: 8500, recovery_calls: 17, payback_months: 3,
  },
  page_speed: { performance: 64, accessibility: 78, seo: 82, ok: true },
  safety: { is_safe: true, ok: true },
  business_info: {
    ok: true, name: 'Sandbar Soft Wash', address: '1234 Main St, Palm Harbor, FL',
    phone: '(727) 555-0123', website: 'https://sandbarsoftwash.com',
    rating: 4.2, review_count: 14, verification_confidence: 'medium',
  },
  competitors: [],
  categories: {
    gbp_completeness: { score: 65 }, reviews: { score: 53 }, mobile_speed: { score: 64 },
    seo_basics: { score: 82 }, accessibility: { score: 78 }, local_trust: { score: 100 },
    safety: { score: 100 },
  },
  signals: {
    gbp_completeness: { weight: 25, value: 65, available: true },
    reviews: { weight: 20, value: 53, available: true },
    mobile_speed: { weight: 20, value: 64, available: true },
    seo_basics: { weight: 10, value: 82, available: true },
    accessibility: { weight: 10, value: 78, available: true },
    local_trust: { weight: 10, value: 100, available: true },
    safety: { weight: 5, value: 100, available: true },
  },
  recommendations: [
    { title: 'Push past 20 reviews (you have 14)',
      detail: '20+ is the credibility cliff most homeowners scan for. Ask after every paid job — text + email + a card with a QR.',
      impact: 'high', effort: 'low', category: 'reviews' },
    { title: 'Complete your Google Business Profile',
      detail: 'Fill every field — photos, hours, services list, description, and attributes.',
      impact: 'high', effort: 'low', category: 'gbp' },
    { title: 'Tune up mobile speed (64/100 → aim for 80+)',
      detail: 'Audit your largest two images and your slowest third-party script. Two changes usually move this 15+ points.',
      impact: 'medium', effort: 'low', category: 'mobile_speed' },
  ],
};

const MOCK_HEALTH = {
  status: 'ok',
  has_keys: { google_pagespeed: true, google_places: true, google_safe_browsing: true,
              google_custom_search: true, brevo: true, resend: true },
  api_status: {
    pagespeed: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
    places: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
    safe_browsing: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
    custom_search: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
  },
  audit_api_budget: 6,
};

const BASE = 'http://127.0.0.1:4173';

const MOCK_PRICING = {
  founding_active: true,
  founding_slots_remaining: 7,
  founding_cap: 10,
  tiers: {
    diy:      { one_time: 197 },
    standard: { monthly: 497, monthly_original: 697 },
    pro:      { monthly: 997, monthly_original: 1297 },
  },
};

async function setupRoutes(page) {
  await page.route('**/audits/demo*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT) }),
  );
  await page.route('**/health*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HEALTH) }),
  );
  await page.route('**/pricing*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRICING) }),
  );
}

async function shootReport(viewport, suffix) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await setupRoutes(page);

  await page.goto(`${BASE}/r/demo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Pick Your Path', { timeout: 15000 });
  await page.waitForTimeout(700);

  const cta = page.locator('section:has-text("Pick Your Path")').last();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await cta.screenshot({ path: `/tmp/lola-cta-${suffix}.png` });

  const footer = page.locator('footer').last();
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await footer.screenshot({ path: `/tmp/lola-footer-${suffix}.png` });

  await browser.close();
}

async function shootFlow(viewport, suffix) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await setupRoutes(page);

  // ── Step 1 ───────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/Step 1 of/', { timeout: 10000 });
  await page.waitForTimeout(450); // slide-up settles
  await page.screenshot({ path: `/tmp/lola-step1-${suffix}.png`, fullPage: false });

  // ── Step 3 (city) ────────────────────────────────────────
  // Step 1 has prefilled name → click Next to go to step 2
  await page.click('button[aria-label="Next"]');
  await page.waitForSelector('text=/Step 2 of/', { timeout: 5000 });
  // Step 2 is options — the default prefilled value is "soft wash", which
  // matches the "Pressure washing / Soft wash" label button. Just click Next.
  await page.click('button[aria-label="Next"]');
  await page.waitForSelector('text=/Step 3 of/', { timeout: 5000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `/tmp/lola-step3-${suffix}.png`, fullPage: false });

  // ── Validation state ─────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/Step 1 of/', { timeout: 10000 });
  // Clear the prefilled value
  await page.fill('input', '');
  await page.click('button[aria-label="Next"]');
  await page.waitForSelector('[role="alert"]', { timeout: 3000 });
  await page.waitForTimeout(300); // let shake finish so screenshot is calm
  await page.screenshot({ path: `/tmp/lola-validation-${suffix}.png`, fullPage: false });

  await browser.close();
}

(async () => {
  await shootReport({ width: 1440, height: 2400 }, 'desktop');
  await shootReport({ width: 390, height: 1900 }, 'mobile');
  await shootFlow({ width: 1440, height: 900 }, 'desktop');
  await shootFlow({ width: 390, height: 844 }, 'mobile');
  console.log('done');
})();
