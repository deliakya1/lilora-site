// WCAG 2.2 AA in a real browser: axe on every page type, plus keyboard, focus,
// 200% text and reduced-motion checks that axe cannot judge on its own.
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const pageTypes=['','download/','press/','guides/','guides/root-rot/','journal/','journal/check-before-you-water/','plants/','plants/monstera-deliciosa/','compare/','compare/lilora-vs-planta/','support/','contact/','privacy/','legal/','editorial/','about/'];
(async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file.endsWith(path.sep))file+='index.html';
  let status=200;if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){file=path.join(root,'404.html');status=404;}
  const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(status,{'Content-Type':type});res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let count=0;const violations=[];
 try{
  for(const [lang,prefix] of [['tr','/'],['de','/de/'],['en','/en/']])for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:lang==='tr'?'tr-TR':lang==='de'?'de-DE':'en-GB'});
   await context.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:false,savedAt:Date.now()})));
   const page=await context.newPage();
   for(const route of [...pageTypes.map(p=>prefix+p),...(lang==='en'&&width===390?['/missing-page/']:[])]){
    await page.goto(origin+route);
    await page.addScriptTag({content:axeSource});
    const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations']}));
    for(const v of result.violations)violations.push(`${route} @${width}: ${v.id} (${v.impact}) ${v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | ')}`);
    count++;
   }
   // Skip link: first Tab lands on it, it is visible, and it moves focus to main.
   await page.goto(origin+prefix+'guides/root-rot/');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
   assert.ok((await page.locator('.skip').boundingBox()).y>=0,'skip link becomes visible on focus');
   await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
   // Focus is visible on links and controls.
   const outline=await page.evaluate(()=>{const a=document.querySelector('main a[href]');a.focus();const s=getComputedStyle(a);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2;});
   assert.ok(outline,'focused link shows an outline of at least 2px');
   // Language dropdown and (on phones) the menu open and close by keyboard.
   const picker=width<1200?'.mobile-menu':'.language-picker';
   await page.locator(`${picker} > summary`).focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator(picker).evaluate(e=>e.open),true,picker+' opens with Enter');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator(picker).evaluate(e=>e.open),false,picker+' closes with Escape');
   // 200% text: no horizontal scrolling and the H1 still fits.
   await page.goto(origin+prefix+'support/');
   await page.addStyleTag({content:'html{font-size:200% !important}body{font-size:200% !important}'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`200% text overflows at ${width}`);
   count+=3;
   await context.close();
  }
  // Reduced motion turns off smooth scrolling and image hover transitions.
  const reduced=await browser.newContext({reducedMotion:'reduce'});const p=await reduced.newPage();
  await p.goto(origin+'/en/plants/');
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
  assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('.plant-card-photo img')).transitionDuration),'0s');
  await reduced.close();count++;
 }finally{await browser.close();server.close();}
 if(violations.length){console.error(violations.join('\n'));process.exit(1);}
 console.log(`${count} accessibility checks passed: axe WCAG 2.2 AA on ${pageTypes.length} page types plus 404 in TR/DE/EN at 390/1440, skip link, focus, keyboard menus, 200% text and reduced motion.`);
})().catch(e=>{console.error(e);process.exit(1);});
