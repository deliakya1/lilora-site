// The download action must remain usable on small screens, with and without JS.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {languages,prefix,htmlLang}=require('./locale-registry.cjs');
const store=JSON.parse(fs.readFileSync('config/app-store.json')).url;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let checks=0;
 try{
  for(const lang of languages)for(const javaScriptEnabled of [true,false]){
   const context=await browser.newContext({viewport:{width:320,height:667},locale:htmlLang(lang),javaScriptEnabled,reducedMotion:'reduce'});
   const page=await context.newPage();
   for(const slug of ['', 'download/', 'support/', 'guides/watering-houseplants/']){
    await page.goto('http://127.0.0.1:4173'+prefix(lang)+slug);
    await page.evaluate(()=>document.fonts.ready);
    const cta=page.locator('[data-analytics-cta="mobile-bar"]');
    assert.equal(await cta.getAttribute('href'),store);
    assert.ok(await cta.isVisible());
    const box=await cta.boundingBox();
    assert.ok(box.y>=0&&box.y+box.height<300&&box.width>=44&&box.height>=44,'download visible on arrival');
    await page.evaluate(()=>scrollTo(0,1200));
    const sticky=await cta.boundingBox();
    assert.ok(sticky.y>=0&&sticky.y+sticky.height<130,'download stays within the viewport');
    assert.ok(await cta.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'CTA unobstructed');
    await cta.focus();
    assert.equal(await cta.evaluate(e=>e===document.activeElement),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    checks++;
   }
   await context.close();
  }
  console.log(`${checks} mobile download checks passed across ten languages, with and without JavaScript.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
