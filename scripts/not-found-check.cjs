// Model GitHub Pages' custom 404 handling locally; this is not a production probe.
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  let file=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(file.endsWith(path.sep))file+='index.html';
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync('404.html'));return;
  }
  const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.woff':'font/woff'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let count=0;
 try{
  for(const javaScriptEnabled of [true,false])for(const width of [320,390,768,1440]){
   const context=await browser.newContext({javaScriptEnabled,viewport:{width,height:900}});
   if(javaScriptEnabled)await context.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:false,savedAt:Date.now()})));
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const missing of ['/missing-guide/','/en/missing-guide/']){
    const response=await page.goto(origin+missing);assert.equal(response.status(),404);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow');
    assert.equal(await page.locator('link[rel="canonical"],link[rel="alternate"]').count(),0);
    assert.equal(await page.locator('h1').count(),1);
    for(const l of ['tr','en','es','de','pt','fr'])assert.equal(await page.locator('#'+l).getAttribute('lang'),l==='pt'?'pt-BR':l);
    const links=await page.locator('.error-languages a').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));
    assert.equal(links.length,18);
    for(const link of links)assert.equal((await context.request.get(origin+link)).status(),200,link);
    if(javaScriptEnabled)await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(javaScriptEnabled){
    await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('href'),'#main');
    await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
    }
    assert.equal(await page.locator('#lilora-google-tag').count(),0);
    count++;
   }
   if(javaScriptEnabled&&width===320){fs.mkdirSync('.test-results',{recursive:true});await page.screenshot({path:'.test-results/404-recovery-320.png',fullPage:true});}
   assert.equal(errors.length,0);await context.close();
  }
  console.log(JSON.stringify({passed:true,local404Scenarios:count,widths:[320,390,768,1440],javascript:['enabled','disabled'],recoveryLinks:18,checks:['true404 in local Pages model','deep-path absolute assets and destinations','six language annotations','keyboard skip','noindex; no false canonical/hreflang','no overflow or JS errors'],production:'Not asserted by this local test'},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
