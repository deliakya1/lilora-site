const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const key='lilora.cookie-preferences.v2';
const base='http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let checks=0;
 for(const lang of ['en','tr','es','de','pt','fr']) for(const width of [320,1440]){
  const context=await browser.newContext({locale:lang==='tr'?'tr-TR':'en-US',viewport:{width,height:850}});const requests=[];const errors=[];
  await context.route(/https:\/\/.*google.*/,route=>{requests.push(route.request().url());return route.fulfill({contentType:'text/javascript',body:''});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const home=lang==='tr'?'/':'/'+lang+'/';
  await page.goto(base+home+'?email=private@example.com#secret');
  assert.equal(requests.length,0);assert.ok(await page.locator('.cookie-banner').isVisible());
  assert.equal(await page.locator('#lilora-google-tag').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Initial preference panel: optional off, necessary on, native modal focus and Escape.
  await page.locator('.cookie-banner [data-action="preferences"]').click();
  assert.equal(await page.locator('#cookie-analytics-choice').isChecked(),false);
  assert.equal(await page.locator('.cookie-dialog input:disabled').isChecked(),true);
  assert.equal(await page.locator(':focus').getAttribute('id'),'cookie-dialog-title');
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('.cookie-dialog').contains(document.activeElement)),true);}
  await page.keyboard.press('Escape');assert.equal(await page.locator('.cookie-dialog').isVisible(),false);
  assert.equal(await page.locator(':focus').getAttribute('data-action'),'preferences');
  await page.locator('.cookie-banner [data-action="reject"]').click();
  assert.equal(requests.length,0);assert.equal(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).analytics,false);
  await page.reload();assert.equal(await page.locator('.cookie-banner').isVisible(),false);assert.equal(requests.length,0);
  await page.locator('.cookie-settings').click();await page.locator('.cookie-dialog [data-action="accept"]').click();
  await page.waitForFunction(()=>!!document.getElementById('lilora-google-tag'));
  await page.waitForTimeout(50);assert.equal(requests.length,1);
  let events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
  assert.equal(events.filter(x=>x[1]==='page_view').length,1);
  assert.ok(!JSON.stringify(events).includes('private@example.com'));assert.ok(!JSON.stringify(events).includes('secret'));
  const consent=events.find(x=>x[0]==='consent')[2];assert.equal(consent.analytics_storage,'granted');assert.equal(consent.ad_storage,'denied');assert.equal(consent.ad_user_data,'denied');assert.equal(consent.ad_personalization,'denied');
  const config=events.find(x=>x[0]==='config')[2];assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);assert.equal(config.send_page_view,false);
  // Script reinsertion must not duplicate listeners or page views.
  await page.addScriptTag({path:'assets/analytics.js'});
  await page.locator('a[data-analytics-cta]:visible').first().evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));
  await page.locator('a[data-analytics-cta]:visible').first().click();
  events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
  assert.equal(events.filter(x=>x[1]==='app_info_click').length,1);assert.equal(events.filter(x=>x[1]==='app_store_click').length,0);assert.equal(events.filter(x=>x[1]==='page_view').length,1);
  await page.reload();await page.waitForFunction(()=>window.dataLayer?.length>=4);assert.equal(await page.evaluate(()=>window.dataLayer.filter(x=>x[1]==='page_view').length),1);
  await page.goto(base+home+'support/');assert.equal(await page.locator('.cookie-banner').isVisible(),false);assert.equal(await page.locator('#lilora-google-tag').count(),1);
  await page.evaluate(()=>{document.cookie='_ga=owned; path=/';document.cookie='_ga_2CYS6B75ET=owned; path=/';document.cookie='unrelated=keep; path=/';});
  await page.locator('.cookie-settings').click();
  const before=requests.length;
  await Promise.all([page.waitForEvent('load'),page.locator('[data-action="withdraw"]').click()]);
  assert.equal(await page.locator('#lilora-google-tag').count(),0);assert.equal(requests.length,before);
  assert.ok(!(await page.evaluate(()=>document.cookie)).includes('_ga'));assert.ok((await page.evaluate(()=>document.cookie)).includes('unrelated'));
  assert.equal(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).analytics,false);
  await page.locator('.cookie-settings').click();assert.equal(await page.locator('#cookie-analytics-choice').isChecked(),false);await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('class'),'cookie-settings');
  assert.equal(errors.length,0);await context.close();checks++;
 }
 // Storage-unavailable fallback remains usable, defaults off after navigation.
 const context=await browser.newContext();const calls=[];
 await context.route(/https:\/\/.*google.*/,r=>{calls.push(r.request().url());return r.fulfill({body:''});});
 await context.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};});
 const p=await context.newPage();await p.goto(base+'/en/');assert.equal(calls.length,0);
 await p.locator('.cookie-banner [data-action="preferences"]').click();assert.ok((await p.locator('.cookie-storage-message').innerText()).includes('cannot save'));
 await p.locator('.cookie-dialog [data-action="accept"]').click();assert.equal(await p.locator('#lilora-google-tag').count(),1);
 await p.reload();assert.equal(await p.locator('#lilora-google-tag').count(),0);assert.ok(await p.locator('.cookie-banner').isVisible());
 await context.close();
 // Revoke in one tab immediately stops the second tab's opted-in integration.
 const tabs=await browser.newContext();await tabs.route(/https:\/\/.*google.*/,r=>r.fulfill({body:''}));
 const a=await tabs.newPage();await a.goto(base+'/en/');await a.locator('.cookie-banner [data-action="accept"]').click();
 const b=await tabs.newPage();await b.goto(base+'/');assert.equal(await b.locator('#lilora-google-tag').count(),1);
 await a.locator('.cookie-settings').click();await Promise.all([b.waitForEvent('load'),a.locator('[data-action="withdraw"]').click()]);assert.equal(await b.locator('#lilora-google-tag').count(),0);
 await browser.close();
 const report={localeAndViewportRuns:checks,locales:['en','tr','es','de','pt','fr'],widths:[320,1440],tests:['no requests initially or after rejection','equal accept/reject paths','versioned saved preference','native dialog focus containment and Escape restoration','opt-in loads one tag','one pageview per navigation','no duplicate handlers','sanitized page URL','advertising consent denied','withdrawal and owned-cookie cleanup','cross-page persistence','storage-unavailable fallback','cross-tab revocation'],googleRequests:'Intercepted locally; no production analytics hits sent'};
 fs.mkdirSync('.test-results',{recursive:true});fs.writeFileSync('.test-results/consent-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
