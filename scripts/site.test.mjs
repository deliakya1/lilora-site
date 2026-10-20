import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const root=process.cwd();
const crawl=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.name.startsWith('.')||['node_modules','scripts','pages'].includes(x.name)?[]:x.isDirectory()?crawl(dir+'/'+x.name):x.name.endsWith('.html')?[dir+'/'+x.name]:[]);
const files=crawl(root);
const content=JSON.parse(readFileSync('editorial/articles.json'));
test('published substantial source-backed articles have complete English and Turkish counterparts',()=>{
 assert.equal(content.length,readdirSync('content/articles').filter(x=>existsSync('content/articles/'+x+'/meta.json')).length);
 for(const a of content){assert.ok(a.sources.length>=3);for(const lang of ['en','tr']){assert.ok(a[lang].sections.length>=6);assert.ok(a[lang].sections.map(s=>s.html).join(' ').split(/\s+/).length>=300);assert.ok(a[lang].answer.length>100);}}
});
test('all pages have one h1, declared language, description and local links/assets resolve',()=>{
 for(const file of files){const s=readFileSync(file,'utf8');assert.equal((s.match(/<h1[ >]/g)||[]).length,1,file);assert.match(s,/<html lang="(?:en|tr|es|de|pt-BR|fr)"/);assert.match(s,/<meta name="description" content="[^"]+"/);
 for(let [,url] of s.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(url.startsWith('https://lilora.app/')){const local=new URL(url);url=local.pathname+local.hash;}
  if(/^(https?:|mailto:|data:)/.test(url))continue;
  const [path,fragment]=url.split('#');const target=path?resolve(path.startsWith('/')?root:dirname(file),'.'+(path.startsWith('/')?path:'/'+path)):file;
  let targetFile=target;if(path.endsWith('/'))targetFile+='/index.html';
  assert.ok(existsSync(targetFile),`${file}: missing ${url}`);
  if(fragment&&targetFile.endsWith('.html'))assert.ok(readFileSync(targetFile,'utf8').includes(`id="${fragment}"`),`${file}: missing fragment ${url}`);
 }
 for(const img of s.matchAll(/<img\b[^>]+>/g)){assert.match(img[0],/alt="[^"]*"/);assert.match(img[0],/width="\d+"/);assert.match(img[0],/height="\d+"/);}
 }
});
test('canonical, reciprocal hreflang, truthful JSON-LD and sitemap',()=>{
 const sitemap=readFileSync('sitemap.xml','utf8');const locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);assert.equal(new Set(locations).size,JSON.parse(readFileSync('editorial/routes.json')).length);
 for(const file of files){const s=readFileSync(file,'utf8');if(file.endsWith('/404.html')){assert.match(s,/noindex/);assert.doesNotMatch(s,/rel="canonical"/);continue;}
 const canonical=s.match(/rel="canonical" href="([^"]+)"/)[1];assert.ok(locations.includes(canonical),canonical);const alternates=[...s.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];assert.equal(alternates.find(x=>x[1]==='x-default')?.[2],alternates.find(x=>x[1]==='en')?.[2],canonical);
 for(const [,lang,href] of s.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)){if(lang==='x-default')continue;const target=root+new URL(href).pathname+'index.html';assert.ok(readFileSync(target,'utf8').includes(`href="${canonical}"`));}
 for(const [,raw] of s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)){const schema=JSON.parse(raw);assert.equal(schema['@context'],'https://schema.org');assert.ok(!['Review','AggregateRating','Product','FAQPage'].includes(schema['@type']));if(schema['@type']==='Article'){assert.equal(schema.mainEntityOfPage,canonical);assert.ok(s.includes(schema.headline.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))));const article=content.find(a=>canonical.endsWith('/'+a.slug+'/'));assert.equal(schema.dateModified,article.reviewed);assert.equal(schema.datePublished,article.published);}}
 }
});
test('availability and owner-supplied consent-gated analytics are explicit',()=>{
 assert.match(readFileSync('assets/analytics-config.js','utf8'),/LILORA_ANALYTICS_ID = 'G-2CYS6B75ET'/);
 for(const lang of ['en','tr']){const home=lang==='en'?'en/':'';assert.match(readFileSync(home+'index.html','utf8'),lang==='en'?/awaiting App Store review/:/App Store incelemesini bekliyor/);}
 assert.doesNotMatch(files.map(f=>readFileSync(f,'utf8')).join(''),/Download on the App Store|AggregateRating|gtag\/js\?id=/);
});

test('published short answers retain Markdown source links as usable citations',()=>{
 const manifest=content;
 let citations=0;
 for(const a of manifest)for(const lang of ['en','tr']){
  const draft=readFileSync('content/articles/'+a.slug+'/'+lang+'.md','utf8');
  const intro=draft.split('\n').slice(1).join('\n').split(/^## /m)[0];
  const path=(lang==='en'?'en/':'')+(a.type==='comparison'?'compare/':'guides/')+a.slug+'/index.html';
  const html=readFileSync(path,'utf8');
  const answer=html.match(/<div class="short-answer">([\s\S]*?)<\/div>/)[1];
  for(const [,label,url] of intro.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g)){
   assert.ok(answer.includes(`href="${url.replaceAll('&','&amp;')}"`),`${path}: missing answer citation ${label}`);citations++;
  }
  assert.doesNotMatch(answer,/\[[^\]]+\]\(https?:/,'raw Markdown must not reach the answer');
 }
 assert.ok(citations>=2,'both watering translations contain source citations');
});

test('related reading follows editorial priority with valid distinct destinations',()=>{
 const slugs=new Set(content.map(a=>a.slug));
 for(const article of content){
  const priority=article.related||[];
  assert.equal(new Set(priority).size,priority.length,'duplicate recommendation');
  for(const slug of priority){assert.ok(slugs.has(slug),`unknown recommendation ${slug}`);assert.notEqual(slug,article.slug);}
  for(const lang of ['tr','en']){
   const prefix=lang==='en'?'en/':'';
   const path=prefix+(article.type==='comparison'?'compare/':'guides/')+article.slug+'/index.html';
   const related=readFileSync(path,'utf8').split('<section class="related">')[1];
   const links=[...related.matchAll(/<article class="story-card"[^>]*><a href="([^"]+)"/g)].map(x=>x[1]);
   const expected=priority.slice(0,3).map(slug=>{const a=content.find(x=>x.slug===slug);return '/'+prefix+(a.type==='comparison'?'compare/':'guides/')+slug+'/';});
   assert.deepEqual(links.slice(0,expected.length),expected,path);
   assert.equal(new Set(links).size,links.length);assert.equal(links.length,Math.min(3,content.length-1));
  }
 }
});

test('titles and descriptions are unique, source routes complete, and locale dictionaries agree',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const f of files){const s=readFileSync(f,'utf8');const title=s.match(/<title>(.*?)<\/title>/)[1],description=s.match(/<meta name="description" content="([^"]+)"/)[1];assert.ok(!titles.has(title),f+': duplicate title');assert.ok(!descriptions.has(description),f+': duplicate description');titles.add(title);descriptions.add(description);}
 const dictionaries=['tr','en','es','de','pt','fr'].map(l=>JSON.parse(readFileSync('locales/'+l+'.json')));
 for(const d of dictionaries)assert.deepEqual(Object.keys(d).sort(),Object.keys(dictionaries[0]).sort());
 for(const l of ['tr','en','es','de','pt','fr'])for(const slug of ['','support/','privacy/','contact/','about/','legal/','download/','editorial/','guides/','plants/','journal/','compare/'])assert.ok(existsSync((l==='tr'?'':l+'/')+slug+'index.html'));
});
