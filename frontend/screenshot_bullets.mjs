import { chromium } from 'playwright';
const MOCK_AUDIT={audit_id:'demo',business_name:'Sandbar Soft Wash',website:'https://x.com',city:'Palm Harbor, FL',business_type:'soft wash',email:'a@b.com',total_score:68,grade:'C',grade_label:'X',percentile:52,segment:'education',lola_message:'hi',revenue_leak:{monthly_leak:12500,annual_leak:150000,missed_calls_per_month:25,avg_job_value:500,recovery_potential:8500,recovery_calls:17,payback_months:3},page_speed:{performance:64,accessibility:78,seo:82,ok:true},safety:{is_safe:true,ok:true},business_info:{ok:true,name:'X',address:'X',phone:'X',website:'X',rating:4.2,review_count:14,verification_confidence:'medium'},competitors:[],categories:{gbp_completeness:{score:65},reviews:{score:53},mobile_speed:{score:64},seo_basics:{score:82},accessibility:{score:78},local_trust:{score:100},safety:{score:100}},signals:{gbp_completeness:{weight:25,value:65,available:true},reviews:{weight:20,value:53,available:true},mobile_speed:{weight:20,value:64,available:true},seo_basics:{weight:10,value:82,available:true},accessibility:{weight:10,value:78,available:true},local_trust:{weight:10,value:100,available:true},safety:{weight:5,value:100,available:true}},recommendations:[]};
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
  // Desktop — capture each card individually
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
  const dp = await ctxD.newPage();
  await setup(dp);
  await dp.goto(`${BASE}/r/demo`,{waitUntil:'networkidle'});
  await dp.waitForSelector('text=Pick Your Path');
  await dp.waitForTimeout(700);

  const cards = await dp.locator('section:has-text("Pick Your Path") > div.grid > div').elementHandles();
  // DOM order: Pro, Standard, DIY
  const labels = ['pro','standard','diy'];
  for (let i = 0; i < cards.length; i++) {
    await cards[i].scrollIntoViewIfNeeded();
    await dp.waitForTimeout(150);
    const box = await cards[i].boundingBox();
    await dp.screenshot({
      path: `/tmp/bullets-${labels[i]}.png`,
      clip: { x: box.x - 4, y: box.y - 24, width: box.width + 8, height: box.height + 48 },
    });
  }

  // Tooltip open — hover over the "Keyword guarantee" tooltip ⓘ on Standard card
  const tooltipBtn = dp.locator('button[aria-label*="3 keywords in 60 days"]').first();
  await tooltipBtn.scrollIntoViewIfNeeded();
  await tooltipBtn.hover();
  await dp.waitForTimeout(400);
  const box = await cards[1].boundingBox();
  await dp.screenshot({
    path: `/tmp/bullets-tooltip-open.png`,
    clip: { x: box.x - 4, y: box.y - 60, width: box.width + 8, height: box.height + 80 },
  });
  console.log('  desktop cards + tooltip captured');
  await ctxD.close();

  // Mobile — full stack at 375px
  const ctxM = await browser.newContext({ viewport: { width: 375, height: 2600 }, deviceScaleFactor: 2 });
  const mp = await ctxM.newPage();
  await setup(mp);
  await mp.goto(`${BASE}/r/demo`,{waitUntil:'networkidle'});
  await mp.waitForSelector('text=Pick Your Path');
  await mp.waitForTimeout(700);
  const stack = mp.locator('section:has-text("Pick Your Path")').last();
  await stack.scrollIntoViewIfNeeded();
  await mp.waitForTimeout(250);
  await stack.screenshot({ path: '/tmp/bullets-mobile-stack.png' });
  console.log('  mobile stack captured');
  await ctxM.close();

  await browser.close();
  console.log('done');
})();
