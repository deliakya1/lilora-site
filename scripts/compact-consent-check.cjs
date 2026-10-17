const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let cases=0;
for(const lang of ['tr','en'])for(const width of [320,375,390,430,768,1440])for(const stress of ['normal','200%-text','long-copy']){
const p=await b.newPage({locale:lang==='tr'?'tr-TR':'en-US',viewport:{width,height:844}});await p.route(/https:\/\/.*google.*/,r=>r.fulfill({body:''}));await p.goto('http://127.0.0.1:4173/'+(lang==='en'?'en/':''));
if(stress==='200%-text')await p.addStyleTag({content:'.cookie-banner p,.cookie-banner button{font-size:28px!important}'});
if(stress==='long-copy')await p.locator('.cookie-banner p').evaluate(e=>e.textContent+=' '+e.textContent+' '+e.textContent);
const result=await p.locator('.cookie-banner').evaluate(e=>{const r=e.getBoundingClientRect();return {height:r.height,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,noOverflow:e.scrollWidth<=e.clientWidth,buttons:[...e.querySelectorAll('button')].map(b=>({w:b.offsetWidth,h:b.offsetHeight,overflow:b.scrollWidth>b.clientWidth}))}});
assert.ok(result.inViewport&&result.noOverflow,JSON.stringify({lang,width,stress,result}));assert.ok(result.buttons.every(b=>b.w>=44&&b.h>=44&&!b.overflow));assert.equal(result.buttons[0].w,result.buttons[1].w);
if(stress==='normal')assert.ok(result.height<=121);
await p.locator('[data-action="preferences"]').first().focus();await p.keyboard.press('Enter');assert.ok(await p.locator('.cookie-dialog').isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator(':focus').getAttribute('data-action'),'preferences');
await p.locator('.cookie-banner [data-action="accept"]').click();assert.equal(await p.locator('.cookie-banner').isVisible(),false);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('lilora.cookie-preferences.v2')).analytics),true);
await p.close();cases++;
}await b.close();console.log(cases+' compact layout, enlarged text, long copy, keyboard and direct opt-in checks passed');})().catch(e=>{console.error(e);process.exit(1)});
