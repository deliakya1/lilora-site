const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const urls=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/lilora.app(.*?)<\/loc>/g)].map(x=>x[1]);
 fs.mkdirSync('.test-results',{recursive:true});
 let count=0;let requests=[];let errors=[];
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  for(const path of urls){
   const response=await page.goto('http://127.0.0.1:4173'+path);
   assert.equal(response.status(),200,path);
   await page.evaluate(()=>document.fonts.ready);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${width}: overflow on ${path}`);
   assert.equal(await page.locator('h1').count(),1);
   await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
   assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).length),0,path);
   assert.equal(await page.locator('.consent-panel').count(),0,'disabled analytics must be invisible');
   if(['/en/','/en/journal/','/en/guides/watering-houseplants/','/en/compare/lilora-vs-planta/','/'].includes(path))await page.screenshot({path:'.test-results/'+width+'-'+(path.replaceAll('/','_')||'home')+'.png',fullPage:true});
   count++;
  }
  await context.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(requests.filter(u=>/google-analytics|googletagmanager/.test(u)).length,0);
 // Verify consent behavior against a synthetic ID; all Google requests are intercepted.
 const context=await browser.newContext();const page=await context.newPage();const google=[];
 await page.route('**/assets/analytics-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.LILORA_ANALYTICS_ID="G-TEST123456";'}));
 await page.route(/https:\/\/.*google.*/,r=>{google.push(r.request().url());return r.fulfill({contentType:'text/javascript',body:''});});
 await page.goto('http://127.0.0.1:4173/en/?private=query#private');
 assert.equal(google.length,0);await page.getByRole('button',{name:'Decline',exact:true}).click();assert.equal(google.length,0);
 await page.reload();assert.equal(google.length,0);assert.equal(await page.locator('.consent-panel').isVisible(),false);
 await page.getByRole('button',{name:'Analytics preference',exact:true}).click();await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
 await page.waitForFunction(()=>window.dataLayer?.length>=3);
 const events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));assert.equal(events.filter(x=>x[1]==='page_view').length,1);assert.ok(!JSON.stringify(events).includes('private'));assert.ok(events.some(x=>x[0]==='config'&&x[2].allow_google_signals===false&&x[2].allow_ad_personalization_signals===false));
 await page.locator('a[data-analytics-cta]').first().evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));
 await page.locator('a[data-analytics-cta]').first().click();
 const clickEvents=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 assert.equal(clickEvents.filter(x=>x[1]==='app_info_click').length,1);assert.equal(clickEvents.filter(x=>x[1]==='app_store_click').length,0);
 await page.locator('a[data-analytics-cta]').first().click();await page.waitForURL('**/en/support/');
 await page.getByRole('button',{name:'Analytics preference',exact:true}).click();
 await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Withdraw consent',exact:true}).click()]);
 assert.equal(await page.evaluate(()=>localStorage.getItem('lilora.analytics-consent.v1')),'denied');assert.equal(await page.locator('#lilora-google-tag').count(),0);
 await browser.close();
 const report={pages:urls.length,responsiveChecks:count,widths:[360,768,1440],consoleErrors:errors.length,googleRequestsWithoutConsent:0,consentTests:'allow/decline/persistence/revoke, one pageview, sanitized URL, ad signals disabled; synthetic ID with blocked Google requests'};
 fs.writeFileSync('.test-results/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
