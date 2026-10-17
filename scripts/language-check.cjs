const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:4173';
const key='lilora.language.v1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let cases=0;
 async function context(language,saved,blocked=false,js=true){
  const c=await browser.newContext({javaScriptEnabled:js});
  await c.route(/https:\/\/.*google.*/,r=>r.fulfill({body:''}));
  await c.addInitScript(({language,saved,blocked,key})=>{
   Object.defineProperty(navigator,'language',{get:()=>language});
   Object.defineProperty(navigator,'languages',{get:()=>language?[language]:[]});
   if(saved&&!localStorage.getItem(key))localStorage.setItem(key,saved);
   if(blocked){Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};}
  },{language,saved,blocked,key});return c;
 }
 for(const [language,saved,expected] of [['tr-TR',null,'tr'],['tr',null,'tr'],['en-US',null,'en'],['de-DE',null,'en'],['',null,'en'],['tr-TR','en','en'],['en-US','tr','tr'],['tr-TR','invalid','tr']]){
  const c=await context(language,saved);const p=await c.newPage();
  await p.goto(base+'/?campaign=care#main');await p.waitForURL(base+(expected==='en'?'/en/':'/')+'?campaign=care#main');
  assert.equal(await p.locator('html').getAttribute('lang'),expected);
  const initial=p.url();await p.reload();assert.equal(p.url(),initial);
  await p.locator('a.language').click();await p.waitForURL(base+(expected==='en'?'/':'/en/')+'?campaign=care#main');
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),expected==='en'?'tr':'en');
  await p.goBack();assert.equal(p.url(),initial);await p.reload();assert.equal(p.url(),initial);
  // A fresh tab entering root uses the remembered manual choice.
  const q=await c.newPage();await q.goto(base+'/');await q.waitForURL(base+(expected==='en'?'/':'/en/'));
  await c.close();cases++;
 }
 for(const path of ['/en/','/guides/','/en/guides/','/privacy/','/en/privacy/']){
  const c=await context('en-US','tr');const p=await c.newPage();await p.goto(base+path);assert.equal(new URL(p.url()).pathname,path);await c.close();cases++;
 }
 const fs=require('node:fs');const urls=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/lilora.app(.*?)<\/loc>/g)].map(x=>x[1]);
 for(const path of urls.filter(p=>p!=='/')){
  const c=await context('en-US');const p=await c.newPage();await p.goto(base+path+'?utm_source=test#main');const target=new URL(await p.locator('a.language').getAttribute('href'));target.searchParams.delete('lilora_lang');
  await p.locator('a.language').click();await p.waitForURL(target.href);assert.equal(new URL(p.url()).search,'?utm_source=test');assert.equal(new URL(p.url()).hash,'#main');await c.close();cases++;
 }
 for(const language of ['tr-TR','en-US']){
  const c=await context(language,null,true);const p=await c.newPage();await p.goto(base+'/');await p.waitForURL(base+(language==='tr-TR'?'/':'/en/'));
  await p.locator('a.language').click();await p.waitForURL(base+(language==='tr-TR'?'/en/':'/'));const switched=p.url();await p.reload();assert.equal(p.url(),switched);
  await p.locator('a.language').click();await p.waitForURL(base+(language==='tr-TR'?'/':'/en/'));await p.goBack();assert.equal(p.url(),switched);await c.close();cases++;
 }
 for(const path of ['/','/en/','/guides/']){
  const c=await context('en-US',null,false,false);const p=await c.newPage();await p.goto(base+path);assert.equal(new URL(p.url()).pathname,path);assert.ok(await p.locator('h1').isVisible());assert.ok(await p.locator('a.language').getAttribute('href'));await c.close();cases++;
 }
 // A negotiated entry with existing analytics consent must load Google only on its destination.
 {
  const c=await context('en-US');let tags=0;
  await c.route(/https:\/\/.*google.*/,r=>{tags++;return r.fulfill({body:''});});
  await c.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:true,savedAt:Date.now()})));
  const p=await c.newPage();await p.goto(base+'/');await p.waitForURL(base+'/en/');await p.waitForFunction(()=>window.dataLayer?.some(x=>x[0]==='event'&&x[1]==='page_view'));
  assert.equal(tags,1);await c.close();cases++;
 }
 await browser.close();console.log(`${cases} language scenarios passed: browser/saved choice, paired paths, query/hash, manual switches, reload/back, blocked storage and no-JS.`);
})().catch(e=>{console.error(e);process.exit(1)});
