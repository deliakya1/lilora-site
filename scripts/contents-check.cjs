const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 const {articlePath}=await import('./layout.mjs');
 const articles=JSON.parse(fs.readFileSync('editorial/articles.json','utf8'));
 for(const javaScriptEnabled of [true,false])for(const width of [320,390,1440]){
  const context=await browser.newContext({reducedMotion:'reduce',javaScriptEnabled,viewport:{width,height:900}});
  await context.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:false,savedAt:Date.now()})));
  const page=await context.newPage();
  for(const article of articles)for(const lang of ['tr','en','es','de','pt','fr'].filter(l=>article[l])){
   const path=articlePath(article,lang);
   await page.goto('http://127.0.0.1:4173'+path);
   const details=page.locator('.toc'),summary=details.locator('summary');
   assert.equal(await details.getAttribute('open'),null);assert.ok((await summary.boundingBox()).height>=44);
   assert.ok(await page.locator('.short-answer').isVisible());assert.equal(await details.locator('a').first().isVisible(),false);
   await summary.focus();await page.keyboard.press('Space');assert.notEqual(await details.getAttribute('open'),null);
   const links=details.locator('a');assert.equal(await links.count(),article[lang].sections.length+1+(article.handoverFormAfter?1:0));
   for(const link of await links.all())assert.ok((await link.boundingBox()).height>=44);
   if(javaScriptEnabled){await links.last().click({noWaitAfter:true});}
   else{
    // Use native pointer input: Playwright's injected stability polling can stall with JS disabled.
    await links.last().evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));
    const box=await links.last().boundingBox();
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   }
   await page.waitForURL('**/#sources');assert.ok(await page.locator('#sources').isVisible());
   await summary.focus();await page.keyboard.press('Space');assert.equal(await details.getAttribute('open'),null);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  }
  console.log(`Passed ${width}px, JavaScript ${javaScriptEnabled}: 14 article pages`);
  await context.close();
 }
 await browser.close();console.log(`${checks} contents checks passed: 14 articles, three widths, JS on/off, keyboard, section navigation and touch targets.`);
})().catch(e=>{console.error(e);process.exit(1)});
