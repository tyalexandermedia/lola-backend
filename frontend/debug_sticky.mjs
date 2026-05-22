import { chromium } from 'playwright';

const MOCK_AUDIT = { audit_id: 'demo', business_name: 'Sandbar Soft Wash',
  website: 'https://x.com', city: 'Palm Harbor, FL',
  business_type: 'soft wash', email: 'a@b.com', total_score: 68, grade: 'C', grade_label: 'X',
  percentile: 52, segment: 'education', lola_message: 'hi',
  revenue_leak: { monthly_leak: 12500, annual_leak: 150000, missed_calls_per_month: 25,
                  avg_job_value: 500, recovery_potential: 8500, recovery_calls: 17, payback_months: 3 },
  page_speed: { performance: 64, accessibility: 78, seo: 82, ok: true },
  safety: { is_safe: true, ok: true },
  business_info: { ok: true, name: 'X', address: 'X', phone: 'X', website: 'X',
                   rating: 4.2, review_count: 14, verification_confidence: 'medium' },
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
const MOCK_HEALTH = { status: 'ok', has_keys: {}, api_status: {}, audit_api_budget: 6 };
const MOCK_PRICING = { founding_active: true, founding_slots_remaining: 7, founding_cap: 10,
  tiers: { diy: { one_time: 197 }, standard: { monthly: 497, monthly_original: 697 },
           pro: { monthly: 997, monthly_original: 1297 } } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/audits/demo*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT) }));
  await page.route('**/health*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HEALTH) }));
  await page.route('**/pricing*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRICING) }));

  await page.goto('http://127.0.0.1:4173/r/demo', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Pick Your Path');
  await page.waitForTimeout(500);

  // Walk scroll position incrementally so IntersectionObserver fires.
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('scrollHeight:', scrollHeight);
  for (let y = 0; y <= scrollHeight; y += 400) {
    await page.evaluate((sy) => window.scrollTo(0, sy), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);

  // Check: did the sticky element become visible?
  const stickyState = await page.evaluate(() => {
    const el = document.querySelector('[aria-hidden="false"] a[href*="book"]');
    if (!el) return { found: false, hidden: true };
    const rect = el.getBoundingClientRect();
    return { found: true, top: rect.top, opacity: getComputedStyle(el).opacity };
  });
  console.log('sticky CTA state:', stickyState);

  await page.screenshot({ path: '/tmp/sticky-mobile-visible2.png' });
  await browser.close();
})();
