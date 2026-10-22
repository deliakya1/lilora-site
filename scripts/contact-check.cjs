// Contact form in a real browser. The Supabase endpoint is intercepted; no message is sent.
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const endpoint='https://mpswscvxcoixnlltahqn.supabase.co/functions/v1/website-contact';
(async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  let file=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(file.endsWith(path.sep))file+='index.html';
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let count=0;
 try{
  for(const [lang,prefix] of [['tr','/'],['en','/en/'],['es','/es/'],['de','/de/'],['pt','/pt/'],['fr','/fr/']])for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900}});
   await context.addInitScript(()=>localStorage.setItem('lilora.cookie-preferences.v2',JSON.stringify({version:2,analytics:false,savedAt:Date.now()})));
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const external=[];page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
   const posts=[];let reply={status:200,body:{ok:true,code:'sent'}};
   await page.route(endpoint,route=>{posts.push(route.request().postDataJSON());route.fulfill({status:reply.status,contentType:'application/json',headers:{'access-control-allow-origin':origin},body:JSON.stringify(reply.body)});});
   await page.goto(origin+prefix+'contact/');
   assert.deepEqual(external,[],'no third-party request on load');
   const form=page.locator('form.contact-form');
   assert.equal(await form.getAttribute('action'),endpoint);
   assert.equal(await form.getAttribute('method'),'post');
   for(const id of ['contact-topic','contact-name','contact-email','contact-message','contact-consent'])assert.equal(await page.locator(`label[for="${id}"]`).count(),1,id);
   assert.equal(await page.locator('#contact-topic option').count(),5);
   assert.ok(await page.locator('.contact-trap input[name="website"]').count());
   assert.ok(!(await page.locator('.contact-trap').isVisible())||(await page.locator('.contact-trap').boundingBox()).x<0,'honeypot off-screen');
   assert.ok(await page.locator(`.contact-consent a[href="${prefix}privacy/#website-contact"]`).count());
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'no horizontal scroll');
   // Native validation blocks an empty submission.
   await page.locator('.contact-form button[type="submit"]').click();
   assert.equal(posts.length,0);
   await page.selectOption('#contact-topic','business');
   await page.fill('#contact-name','Ada');await page.fill('#contact-email','ada@example.com');
   await page.fill('#contact-message','A question about Lilora for our shop.');await page.check('#contact-consent');
   await page.waitForTimeout(50);
   await page.locator('.contact-form button[type="submit"]').click();
   await page.locator('.contact-status[data-state="sent"]').waitFor();
   assert.equal(posts.length,1);
   assert.deepEqual({topic:posts[0].topic,language:posts[0].language,page:posts[0].page,consent:posts[0].consent,website:posts[0].website},{topic:'business',language:lang,page:prefix+'contact/',consent:'yes',website:''});
   assert.ok(Number(posts[0].started)>0);
   assert.equal(await page.inputValue('#contact-message'),'','form resets after sending');
   // Rate limit and server errors show a localized message and keep the text.
   reply={status:429,body:{ok:false,code:'limited'}};
   await page.fill('#contact-name','Ada');await page.fill('#contact-email','ada@example.com');
   await page.fill('#contact-message','A second message for the limit.');await page.check('#contact-consent');
   await page.locator('.contact-form button[type="submit"]').click();
   await page.locator('.contact-status[data-state="limited"]').waitFor();
   assert.equal(await page.inputValue('#contact-message'),'A second message for the limit.');
   // A no-JS redirect lands with ?form=sent and the status is shown.
   await page.goto(origin+prefix+'contact/?form=sent#contact-form');
   assert.equal(await page.locator('.contact-status[data-state="sent"]').isVisible(),true);
   // Support links to the form.
   await page.goto(origin+prefix+'support/');
   assert.ok(await page.locator(`a[href="${prefix}contact/#contact-form"]`).count());
   if(width===390)await page.goto(origin+prefix+'contact/#contact-form').then(()=>page.screenshot({path:process.env.SHOTS?`${process.env.SHOTS}/contact-${lang}-${width}.png`:undefined,fullPage:true}).catch(()=>{}));
   assert.deepEqual(errors,[]);
   await context.close();count++;
  }
  // Without JavaScript the form still posts natively to the endpoint.
  const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'});const page=await context.newPage();
  let posted=null;await page.route(endpoint,route=>{posted=route.request().postData();route.fulfill({status:303,headers:{location:origin+'/en/contact/?form=sent#contact-form'}});});
  await page.goto(origin+'/en/contact/');
  await page.fill('#contact-name','Ada');await page.fill('#contact-email','ada@example.com');
  await page.fill('#contact-message','A question without JavaScript.');await page.check('#contact-consent');
  await Promise.all([page.waitForURL(/form=sent/),page.locator('.contact-form button[type="submit"]').click()]);
  assert.match(posted,/consent=yes/);assert.match(posted,/language=en/);
  await context.close();count++;
 }finally{await browser.close();server.close();}
 console.log(`${count} contact form checks passed: six languages, two widths, validation, sending, rate limit, redirect status and no-JS post.`);
})().catch(e=>{console.error(e);process.exit(1);});
