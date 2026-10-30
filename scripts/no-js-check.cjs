// SEO-03: every page template is complete in its initial HTML. Needs the README server on 127.0.0.1:4173.
// JavaScript off: source metadata, headings, answers, citations, navigation, language links and CTAs.
// JavaScript on: the same main text with and without a consent choice, and no client-side API request.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const {languages,prefix,htmlLang,languageOfPath,isCJK,descRange,defaultLanguage}=require('./locale-registry.cjs');
const origin='http://127.0.0.1:4173';
const templates={home:'',guidesHub:'guides/',guide:'guides/watering-houseplants/',plantsHub:'plants/',plant:'plants/monstera-deliciosa/',journalHub:'blog/',post:'blog/check-before-you-water/',compareHub:'compare/',comparison:'compare/lilora-vs-planta/',support:'support/',privacy:'privacy/',contact:'contact/',about:'about/',legal:'legal/',download:'download/',editorial:'editorial/',press:'press/'};
const articles=['guide','post','comparison'],hubs=['guidesHub','plantsHub','journalHub','compareHub'];
const pages=languages.flatMap(lang=>Object.keys(templates).map(name=>({lang,name,path:prefix(lang)+templates[name]})));
const consent=analytics=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics,savedAt:Date.now()}));
// Visible main text, one trimmed line per entry; closed <details> bodies stay in the HTML but are not counted here.
// The share control is a JavaScript-only enhancement (hidden without JS), so it is left out of the comparison.
const mainLines=page=>page.locator('main').evaluate(main=>{for(const el of main.querySelectorAll('.share-tools'))el.hidden=true;return main.innerText.split('\n').map(line=>line.trim()).filter(Boolean);});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let checks=0;
 try{
  const off=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});
  await off.route(url=>!url.href.startsWith(origin),route=>route.abort());
  const page=await off.newPage();const offText={};
  for(const {lang,name,path} of pages){
   const label=`${path} (${name}, JS off)`,response=await page.goto(origin+path);assert.equal(response.status(),200,label);
   const html=await response.text();
   // Source HTML: metadata and structured data are present before any script runs.
   assert.match(html,/<title>[^<]+<\/title>/,label+' title in source');
   assert.equal(await page.locator('head title').count(),1,label+' unique title element');
   const titleLength=Array.from((await page.title()).trim()).length;
   assert.ok(titleLength>=(isCJK(lang)?2:10)&&titleLength<=60,label+' localized title length');
   assert.match(html,/<meta name="description" content="[^"]+">/,label+' description in source');
   const description=await page.locator('head meta[name="description"]').getAttribute('content');
   const [descriptionMin,descriptionMax]=descRange(lang),descriptionLength=Array.from(description||'').length;
   assert.ok(descriptionLength>=descriptionMin&&descriptionLength<=descriptionMax,label+' localized description length');
   assert.ok(html.includes(`<link rel="canonical" href="https://lilora.app${path}">`),label+' canonical');
   assert.ok(html.includes(`hreflang="${htmlLang(lang)}" href="https://lilora.app${path}"`),label+' self hreflang');
   assert.equal(await page.locator('head link[hreflang="x-default"]').getAttribute('href'),'https://lilora.app'+prefix(defaultLanguage)+templates[name],label+' default-language counterpart');
   const schema=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
   if(name!=='home')assert.ok(schema.some(s=>s['@type']==='BreadcrumbList'),label+' BreadcrumbList');
   if(name==='home')assert.ok(['Organization','WebSite'].every(type=>schema.some(s=>s['@type']===type)),label+' home schema');
   if(articles.includes(name)||name==='plant')assert.ok(schema.some(s=>/Article|BlogPosting/.test(s['@type'])),label+' article schema');
   assert.doesNotMatch(html,/<a\b(?![^>]*\bhref=)[^>]*>|\bonclick=/i,label+' links need a native href');
   // Rendered without JavaScript: one visible H1 that is in the source, and substantive main text.
   const h1=page.locator('main h1');assert.equal(await h1.count(),1,label);assert.ok(await h1.isVisible(),label+' h1 visible');
   const lines=await mainLines(page);offText[path]=lines;
   // CJK conveys the same content in fewer characters; structural and JS-parity checks remain identical.
   const minimumText=name==='legal'?(isCJK(lang)?100:200):(isCJK(lang)?200:400);
   assert.ok(lines.join(' ').length>=minimumText,label+' main text');
   // Navigation: same-language header links, every registered native language link and a cookie-preferences fallback.
   const nav=await page.locator('.desktop-nav a[href]:visible').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
   assert.ok(nav.length>=4&&nav.every(href=>href.startsWith(prefix(lang))&&languageOfPath(new URL(href,origin).pathname)===lang),label+' header nav');
   const languageLinks=await page.locator('.language-picker a.language[hreflang]').evaluateAll(as=>as.map(a=>({href:a.getAttribute('href'),tag:a.getAttribute('hreflang')})));
   assert.equal(languageLinks.length,languages.length,label+' language links');
   assert.deepEqual(languageLinks.map(link=>link.tag).sort(),languages.map(htmlLang).sort(),label+' language tags');
   for(const language of languages){
    const link=languageLinks.find(link=>link.tag===htmlLang(language));
    assert.equal(link.href,prefix(language)+templates[name],label+' clean translated counterpart '+language);
   }
   assert.equal(await page.locator('.footer a.cookie-settings').getAttribute('href'),prefix(lang)+'privacy/#website-analytics',label+' cookie link');
   const internal=await page.locator('main a[href^="/"]:visible').count();assert.ok(internal>=(articles.includes(name)?2:1),label+' contextual internal links');
   // Template content: answers, citations, care summaries, hub listings and an honest app CTA.
   if(articles.includes(name)){
    const answer=page.locator('main .short-answer');assert.ok(await answer.isVisible(),label+' short answer');
    assert.ok((await answer.innerText()).length>=(isCJK(lang)?40:80),label+' short answer text');
   }
   if(articles.includes(name)||name==='plant'){
    const sources=page.locator(name==='plant'?'main':'main .sources');assert.ok(await sources.isVisible(),label+' sources');
    assert.ok(await sources.locator('a[href^="https://"]:visible').count()>=3,label+' cited sources');
   }
   if(name==='plant'){
    const glance=page.locator('main .at-a-glance');assert.ok(await glance.isVisible(),label+' at a glance');
    assert.ok((await glance.innerText()).split('\n').filter(Boolean).length>=6,label+' care summary rows');
   }
   if(hubs.includes(name))assert.ok(await page.locator(`main a[href^="${prefix(lang)}${templates[name]}"]:visible`).count()>=2,label+' hub items');
   // Live: the App Store action works without JavaScript and always uses the canonical listing URL.
   if(['home','download','guide','plant'].includes(name))assert.ok(await page.locator('a[data-analytics-cta][href="https://apps.apple.com/app/id6818604360"]:visible').count()>=1,label+' App Store CTA');
   assert.deepEqual([...new Set(await page.locator('a[href*="id6818604360"]').evaluateAll(links=>links.map(a=>a.href)))],['https://apps.apple.com/app/id6818604360'],label+' canonical store link');
   checks++;
  }
  // Native disclosures still open the phone menu and the language list without JavaScript.
  await page.setViewportSize({width:390,height:900});
  for(const lang of languages)for(const name of ['home','guide']){
   const path=prefix(lang)+templates[name];await page.goto(origin+path);
   await page.locator('.mobile-menu summary').click();
   assert.ok(await page.locator('.mobile-nav a[href]:visible').count()>=4,path+' mobile nav');
   assert.equal(await page.locator('.mobile-languages a.language[hreflang]:visible').count(),languages.length,path+' mobile languages');
   await page.locator('.mobile-menu summary').click();checks++;
  }
  await off.close();
  // JavaScript on: main text matches the static render whether or not a consent choice exists.
  for(const choice of [null,false]){
   const on=await browser.newContext({viewport:{width:1440,height:900}});
   await on.route(url=>!url.href.startsWith(origin),route=>route.abort());
   if(choice!==null)await on.addInitScript(consent,choice);
   const live=await on.newPage();const errors=[];live.on('pageerror',e=>errors.push(e.message));
   for(const {name,path} of pages){
    const requests=[];const track=request=>{if(['fetch','xhr'].includes(request.resourceType()))requests.push(request.url());};
    live.on('request',track);await live.goto(origin+path,{waitUntil:'networkidle'});live.off('request',track);
    const label=`${path} (${name}, JS on, ${choice===null?'no consent choice':'analytics declined'})`;
    assert.deepEqual(requests,[],label+' client-side API request');
    const lines=await mainLines(live);
    // The plant hub hides its static filter lists once the chips filter in place; everything else is identical.
    if(name==='plantsHub')assert.deepEqual(lines.filter(line=>!offText[path].includes(line)),[],label);
    else assert.deepEqual(lines,offText[path],label);
    assert.equal(await live.locator('.footer button.cookie-settings').count(),1,label+' cookie button upgrade');
    checks++;
   }
   assert.deepEqual(errors,[]);await on.close();
  }
 }finally{await browser.close();}
 console.log(`${checks} no-JavaScript checks passed: ${pages.length} pages (${Object.keys(templates).length} templates in all ${languages.length} languages), source metadata, rendered content, mobile disclosures and JS-on parity.`);
})().catch(e=>{console.error(e);process.exit(1);});
