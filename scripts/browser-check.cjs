const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const urls=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/lilora.app(.*?)<\/loc>/g)].map(x=>x[1]);
 fs.mkdirSync('.test-results',{recursive:true});
 let count=0;let requests=[];let errors=[];
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({locale:'tr-TR',viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:false,savedAt:Date.now()})));
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
   assert.equal(await page.locator('.cookie-banner').isVisible(),false,'saved rejection hides banner');
   if(['/en/','/en/journal/','/en/guides/watering-houseplants/','/en/compare/lilora-vs-planta/','/','/de/','/de/support/','/de/privacy/'].includes(path))await page.screenshot({path:'.test-results/'+width+'-'+(path.replaceAll('/','_')||'home')+'.png',fullPage:true});
   count++;
  }
  await context.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(requests.filter(u=>/google-analytics|googletagmanager/.test(u)).length,0);
 await browser.close();
 const report={pages:urls.length,responsiveChecks:count,widths:[320,390,768,1440],consoleErrors:errors.length,googleRequestsWithoutConsent:0,consentTests:'Run scripts/consent-check.cjs for the consent lifecycle'};
 fs.writeFileSync('.test-results/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
