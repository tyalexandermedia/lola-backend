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

const MOCK_HEALTH = { status: 'ok',
  has_keys: { google_pagespeed: true, google_places: true, google_safe_browsing: true,
              google_custom_search: true, brevo: true, resend: true },
  api_status: { pagespeed: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                places: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                safe_browsing: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null },
                custom_search: { last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null } },
  audit_api_budget: 6 };

const MOCK_PRICING = { founding_active: true, founding_slots_remaining: 7, founding_cap: 10,
  tiers: { diy: { one_time: 197 }, standard: { monthly: 497, monthly_original: 697 },
           pro: { monthly: 997, monthly_original: 1297 } } };

const BASE = 'http://127.0.0.1:4173';

async function shoot(width, height, suffix) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/audits/demo*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT) }));
  await page.route('**/health*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HEALTH) }));
  await page.route('**/pricing*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRICING) }));

  await page.goto(`${BASE}/r/demo`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Pick Your Path', { timeout: 15000 });
  await page.waitForTimeout(800);

  const cta = page.locator('section:has-text("Pick Your Path")').last();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await cta.screenshot({ path: `/tmp/pricing-${suffix}.png` });

  // Also measure card widths to verify no horizontal overflow
  const cardWidths = await page.locator('section:has-text("Pick Your Path") > div > div').evaluateAll((els) =>
    els.map((el) => ({
      headerLabel: el.querySelector('p')?.textContent?.trim().slice(0, 40),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflow: el.scrollWidth - el.clientWidth,
    })),
  );

  await browser.close();
  console.log(`  ${suffix}: ${width}×${height}`);
  for (const c of cardWidths) {
    const flag = c.overflow > 0 ? `  ⚠ OVERFLOW +${c.overflow}px` : '';
    console.log(`    └─ ${c.headerLabel}: clientW=${c.clientWidth} scrollW=${c.scrollWidth}${flag}`);
  }
}

(async () => {
  await shoot(320, 2800, '320-iphone-se-narrow');
  await shoot(375, 2400, '375-iphone-se');
  await shoot(393, 2400, '393-iphone14');
  await shoot(768, 2200, '768-tablet');
  await shoot(1024, 1600, '1024-desktop-sm');
  await shoot(1440, 1400, '1440-desktop');
  await shoot(1920, 1400, '1920-4k');
  console.log('\ndone');
})();
