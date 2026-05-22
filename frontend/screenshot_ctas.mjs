import { chromium } from 'playwright';
const MOCK_AUDIT={audit_id:'demo',business_name:'X',website:'https://x.com',city:'X',business_type:'soft wash',email:'a@b.com',total_score:68,grade:'C',grade_label:'X',percentile:52,segment:'education',lola_message:'',revenue_leak:{monthly_leak:12500,annual_leak:150000,missed_calls_per_month:25,avg_job_value:500,recovery_potential:8500,recovery_calls:17,payback_months:3},page_speed:{performance:64,accessibility:78,seo:82,ok:true},safety:{is_safe:true,ok:true},business_info:{ok:true,name:'X',address:'X',phone:'X',website:'X',rating:4.2,review_count:14,verification_confidence:'medium'},competitors:[],categories:{gbp_completeness:{score:65},reviews:{score:53},mobile_speed:{score:64},seo_basics:{score:82},accessibility:{score:78},local_trust:{score:100},safety:{score:100}},signals:{gbp_completeness:{weight:25,value:65,available:true},reviews:{weight:20,value:53,available:true},mobile_speed:{weight:20,value:64,available:true},seo_basics:{weight:10,value:82,available:true},accessibility:{weight:10,value:78,available:true},local_trust:{weight:10,value:100,available:true},safety:{weight:5,value:100,available:true}},recommendations:[]};
const MOCK_HEALTH={status:'ok',has_keys:{},api_status:{pagespeed:{last_ok_at:new Date().toISOString(),last_error:null,last_error_at:null},places:{last_ok_at:new Date().toISOString(),last_error:null,last_error_at:null},safe_browsing:{last_ok_at:new Date().toISOString(),last_error:null,last_error_at:null},custom_search:{last_ok_at:new Date().toISOString(),last_error:null,last_error_at:null}},audit_api_budget:6};
const MOCK_PRICING={founding_active:true,founding_slots_remaining:7,founding_cap:10,tiers:{diy:{one_time:197},standard:{monthly:497,monthly_original:697},pro:{monthly:997,monthly_original:1297}}};
const BASE='http://127.0.0.1:4173';

async function setup(p){
  await p.route('**/audits/demo*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK_AUDIT)}));
  await p.route('**/health*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK_HEALTH)}));
  await p.route('**/pricing*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK_PRICING)}));
}

(async () => {
  const browser = await chromium.launch();

  // Desktop full pricing section
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 1500 }, deviceScaleFactor: 2 });
  const dp = await ctxD.newPage();
  await setup(dp);
  await dp.goto(`${BASE}/r/demo`,{waitUntil:'networkidle'});
  await dp.waitForSelector('text=Pick Your Path');
  await dp.waitForTimeout(800);

  const cta = dp.locator('section:has-text("Pick Your Path")').last();
  await cta.scrollIntoViewIfNeeded();
  await dp.waitForTimeout(200);
  await cta.screenshot({ path: '/tmp/ctas-desktop.png' });

  // Force hover on Standard button to capture shimmer state
  const standardBtn = dp.locator('a:has-text("Start with Lola")').first();
  await standardBtn.evaluate((el) => {
    // Force :hover styles via CDP doesn't work in screenshot; just dispatch mouseover events.
    el.classList.add('force-hover');
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await dp.hover('a:has-text("Start with Lola")');
  await dp.waitForTimeout(450); // let gradient shift animation complete
  await cta.screenshot({ path: '/tmp/ctas-desktop-hover.png' });
  console.log('  desktop default + hover captured');

  await ctxD.close();

  // Mobile stack
  const ctxM = await browser.newContext({ viewport: { width: 375, height: 2700 }, deviceScaleFactor: 2 });
  const mp = await ctxM.newPage();
  await setup(mp);
  await mp.goto(`${BASE}/r/demo`,{waitUntil:'networkidle'});
  await mp.waitForSelector('text=Pick Your Path');
  await mp.waitForTimeout(700);

  const ctaM = mp.locator('section:has-text("Pick Your Path")').last();
  await ctaM.scrollIntoViewIfNeeded();
  await mp.waitForTimeout(250);
  await ctaM.screenshot({ path: '/tmp/ctas-mobile.png' });
  console.log('  mobile stack captured');

  // Measure card heights for spec verification (within 20px of each other?)
  const heights = await mp.locator('section:has-text("Pick Your Path") > div.grid > div').evaluateAll(els =>
    els.map(el => ({ label: el.querySelector('p')?.textContent?.trim().slice(0, 40), h: el.offsetHeight })),
  );
  console.log('mobile heights:', heights);

  // Also desktop heights
  const ctxD2 = await browser.newContext({ viewport: { width: 1440, height: 1500 }, deviceScaleFactor: 2 });
  const dp2 = await ctxD2.newPage();
  await setup(dp2);
  await dp2.goto(`${BASE}/r/demo`,{waitUntil:'networkidle'});
  await dp2.waitForSelector('text=Pick Your Path');
  await dp2.waitForTimeout(500);
  const heightsD = await dp2.locator('section:has-text("Pick Your Path") > div.grid > div').evaluateAll(els =>
    els.map(el => ({ label: el.querySelector('p')?.textContent?.trim().slice(0, 40), h: el.offsetHeight })),
  );
  console.log('desktop heights:', heightsD);
  await ctxD2.close();

  await browser.close();
  console.log('done');
})();
