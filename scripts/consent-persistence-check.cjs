const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const key='lilora.cookie-preferences.v2';
const base='http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let cases=0;
 for(const lang of ['en','tr'])for(const failure of ['throw','silent']){
  const context=await browser.newContext({locale:'tr-TR'});const requests=[];const errors=[];
  await context.route(/https:\/\/.*google.*/,r=>{requests.push(r.request().url());return r.fulfill({body:''});});
  await context.addInitScript(({key,failure})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:2,analytics:true,savedAt:Date.now()}));
   const set=Storage.prototype.setItem;
   window.restoreConsentWrites=()=>Storage.prototype.setItem=set;
   Storage.prototype.setItem=function(k,v){if(k.startsWith(key)){if(failure==='throw')throw new Error('read-only');return;}return set.call(this,k,v);};
   window.documentNonce=Math.random();
  },{key,failure});
  const a=await context.newPage();a.on('pageerror',e=>errors.push(e.message));await a.goto(base+(lang==='en'?'/en/':'/'));
  const b=await context.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base+(lang==='en'?'/':'/en/'));
  await a.waitForFunction(()=>!!document.getElementById('lilora-google-tag'));await b.waitForFunction(()=>!!document.getElementById('lilora-google-tag'));
  const nonceA=await a.evaluate(()=>window.documentNonce),nonceB=await b.evaluate(()=>window.documentNonce);
  const before=requests.length;
  await a.locator('.cookie-settings').click();await a.locator('[data-action="withdraw"]').click();
  await b.waitForFunction(()=>window['ga-disable-G-2CYS6B75ET']===true);
  await a.waitForTimeout(150);
  for(const [page,nonce] of [[a,nonceA],[b,nonceB]]){
   assert.equal(await page.evaluate(()=>window.documentNonce),nonce,'no reload into stale saved grant');
   assert.equal(await page.locator('#lilora-google-tag').count(),0);
   assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).analytics,key),true,'regression keeps the stale grant readable');
   assert.equal(await page.evaluate(()=>window['ga-disable-G-2CYS6B75ET']),true);
   await page.locator('.cookie-settings').click();assert.equal(await page.locator('#cookie-analytics-choice').isChecked(),false,'reopened preference must show authoritative denial');
   assert.ok((await page.locator('.cookie-storage-message').innerText()).length>40);
   await page.keyboard.press('Escape');
   // Simulate another tab announcing a grant: it cannot erase this rejection.
   await page.evaluate(key=>window.dispatchEvent(new StorageEvent('storage',{key,newValue:localStorage.getItem(key),storageArea:localStorage})),key);
   await page.locator('a[data-analytics-cta]').first().evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));
   await page.locator('a[data-analytics-cta]').first().click();
   assert.equal(await page.evaluate(()=>window.dataLayer.length),0);
  }
  assert.equal(requests.length,before,'no new tag request after rejection in either tab');
  // A later explicit grant can resume only after persistence recovers and a clean load.
  await a.evaluate(()=>window.restoreConsentWrites());await a.locator('.cookie-settings').click();
  await Promise.all([a.waitForEvent('load'),a.locator('.cookie-dialog [data-action="accept"]').click()]);
  assert.equal(await a.locator('#lilora-google-tag').count(),1);
  assert.equal(await a.evaluate(()=>window.dataLayer.filter(x=>x[1]==='page_view').length),1);
  assert.equal(errors.length,0);await context.close();cases++;
 }
 // When only localStorage writes fail, a verified tab denial makes reload/navigation safe.
 const context=await browser.newContext({locale:'tr-TR'});let calls=0;
 await context.route(/https:\/\/.*google.*/,r=>{calls++;return r.fulfill({body:''});});
 await context.addInitScript(key=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:2,analytics:true,savedAt:Date.now()}));
  const set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key)throw new Error('read-only');return set.call(this,k,v);};
 },key);
 const p=await context.newPage();await p.goto(base+'/en/');const before=calls;
 await p.locator('.cookie-settings').click();await Promise.all([p.waitForEvent('load'),p.locator('[data-action="withdraw"]').click()]);
 assert.equal(await p.locator('#lilora-google-tag').count(),0);
 assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).analytics,key),true);
 assert.equal(await p.evaluate(k=>JSON.parse(sessionStorage.getItem(k+'.denied')).analytics,key),false);
 await p.goto(base+'/');assert.equal(await p.locator('#lilora-google-tag').count(),0);
 await p.locator('.cookie-settings').click();assert.equal(await p.locator('#cookie-analytics-choice').isChecked(),false);
 assert.equal(calls,before);await context.close();await browser.close();
 console.log(JSON.stringify({passed:true,staleGrantFailureCases:cases,locales:['en','tr'],failures:['throwing writes','silently ignored writes'],checks:['authoritative denial','no unsafe reload','reopen unchecked','cross-tab broadcast denial','later storage grant cannot undo denial','no post-rejection events','explicit regrant after persistence recovery','session denial protects reload and cross-locale navigation']},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
