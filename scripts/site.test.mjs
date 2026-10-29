import { languages, prefix, htmlLang, languageOptions } from './locale-registry.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {articlePath} from './layout.mjs';
const root=process.cwd();
const crawl=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.name.startsWith('.')||['node_modules','scripts','pages'].includes(x.name)?[]:x.isDirectory()?crawl(dir+'/'+x.name):x.name.endsWith('.html')&&!/^(google[0-9a-f]+|yandex_[0-9a-f]+|pinterest-[0-9a-f]+)\.html$/.test(x.name)?[dir+'/'+x.name]:[]);
// google<token>.html, yandex_<token>.html and pinterest-<token>.html are search-engine ownership files, not pages.
// Redirect pages for moved URLs (content/redirects.json) are not pages in their own right.
const files=crawl(root).filter(f=>!readFileSync(f,'utf8').includes('http-equiv="refresh"'));
const content=JSON.parse(readFileSync('editorial/articles.json'));
const datedContent=[...content,...JSON.parse(readFileSync('editorial/plants.json'))];
const allSitemaps=()=>languages.map(l=>readFileSync(`sitemap-${l}.xml`,'utf8')).join('\n');
test('published substantial source-backed articles have complete English and Turkish counterparts',()=>{
 assert.equal(content.length,readdirSync('content/articles').filter(x=>existsSync('content/articles/'+x+'/meta.json')).length);
 for(const a of content){assert.ok(a.sources.length>=3);for(const lang of ['en','tr']){assert.ok(a[lang].sections.length>=6);assert.ok(a[lang].sections.map(s=>s.html).join(' ').split(/\s+/).length>=300);assert.ok(a[lang].answer.length>100);}}
});
test('all pages have one h1, declared language, description and local links/assets resolve',()=>{
 for(const file of files){const s=readFileSync(file,'utf8');assert.equal((s.match(/<h1[ >]/g)||[]).length,1,file);assert.ok(languageOptions.some(option=>s.includes('<html lang="'+option.tag+'"')),file);assert.match(s,/<meta name="description" content="[^"]+"/);
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
 const sitemap=allSitemaps();const locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);assert.equal(new Set(locations).size,JSON.parse(readFileSync('editorial/routes.json')).length);
 for(const file of files){const s=readFileSync(file,'utf8');if(file.endsWith('/404.html')){assert.match(s,/noindex/);assert.doesNotMatch(s,/rel="canonical"/);continue;}
 const canonical=s.match(/rel="canonical" href="([^"]+)"/)[1];assert.ok(locations.includes(canonical),canonical);const alternates=[...s.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];assert.equal(alternates.find(x=>x[1]==='x-default')?.[2],alternates.find(x=>x[1]==='en')?.[2],canonical);
 for(const [,lang,href] of s.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)){if(lang==='x-default')continue;const target=root+new URL(href).pathname+'index.html';assert.ok(readFileSync(target,'utf8').includes(`href="${canonical}"`));}
 for(const [,raw] of s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)){const schema=JSON.parse(raw);assert.equal(schema['@context'],'https://schema.org');assert.ok(!['Review','AggregateRating','Product','FAQPage'].includes(schema['@type']));if(['Article','BlogPosting'].includes(schema['@type'])){assert.equal(schema.mainEntityOfPage,canonical);assert.ok(s.includes(schema.headline.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))));const article=datedContent.find(a=>canonical.endsWith('/'+a.slug+'/'));assert.equal(schema.dateModified,article.reviewed);assert.equal(schema.datePublished,article.published);}}
 }
});
test('availability and owner-supplied consent-gated analytics are explicit',()=>{
 assert.match(readFileSync('assets/analytics-config.js','utf8'),/LILORA_ANALYTICS_ID = 'G-2CYS6B75ET'/);
 for(const lang of ['en','tr']){const home=prefix(lang).slice(1);assert.match(readFileSync(home+'index.html','utf8'),lang==='en'?/(?:awaiting|in) App Store review/i:/App Store inceleme(?:sinde|sini bekliyor)/);}
 assert.doesNotMatch(files.map(f=>readFileSync(f,'utf8')).join(''),/Download on the App Store|AggregateRating|gtag\/js\?id=/);
});

test('published short answers retain Markdown source links as usable citations',()=>{
 const manifest=content;
 let citations=0;
 for(const a of manifest)for(const lang of ['en','tr']){
  const draft=readFileSync('content/articles/'+a.slug+'/'+lang+'.md','utf8');
  const intro=draft.split('\n').slice(1).join('\n').split(/^## /m)[0];
  const path='.'+articlePath(a,lang)+'index.html';
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
   const path='.'+articlePath(article,lang)+'index.html';
   const related=readFileSync(path,'utf8').split('<section class="related">')[1];
   const links=[...related.matchAll(/<article class="(?:story-card|post-card post-card-card)"[^>]*><a href="([^"]+)"/g)].map(x=>x[1]);
   const expected=priority.slice(0,3).map(slug=>{const a=content.find(x=>x.slug===slug);return articlePath(a,lang);});
   assert.deepEqual(links.slice(0,expected.length),expected,path);
   assert.equal(new Set(links).size,links.length);assert.equal(links.length,Math.min(3,content.length-1));
  }
 }
});

test('titles and descriptions are unique, source routes complete, and locale dictionaries agree',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const f of files){const s=readFileSync(f,'utf8');const title=s.match(/<title>(.*?)<\/title>/)[1],description=s.match(/<meta name="description" content="([^"]+)"/)[1];assert.ok(!titles.has(title),f+': duplicate title');assert.ok(!descriptions.has(description),f+': duplicate description');titles.add(title);descriptions.add(description);}
 const dictionaries=languages.map(l=>JSON.parse(readFileSync('locales/'+l+'.json')));
 for(const d of dictionaries)assert.deepEqual(Object.keys(d).sort(),Object.keys(dictionaries[0]).sort());
 for(const l of languages)for(const slug of ['','support/','privacy/','contact/','about/','legal/','download/','editorial/','guides/','plants/','blog/','compare/'])assert.ok(existsSync(prefix(l).slice(1)+slug+'index.html'));
});


test('content hubs list only their article type and preserve real fallback languages',()=>{
 for(const lang of languages)for(const [hub,type] of [['guides','guide'],['blog','post'],['compare','comparison']]){
  const html=readFileSync((lang==='tr'?'':lang+'/')+hub+'/index.html','utf8');
  const cards=[...html.matchAll(/<article class="(?:story-card|post-card post-card-card)" lang="([^"]+)"><a href="([^"]+)"/g)];
  for(const [,cardLang,path] of cards){const a=content.find(a=>path.endsWith('/'+a.slug+'/'));assert.equal(a?.type,type,path);assert.ok(cardLang===(lang==='pt'?'pt-BR':lang)||cardLang==='en');assert.equal(path,articlePath(a,cardLang==='pt-BR'?'pt':cardLang));}
  assert.equal(cards.filter(c=>c[1]===(lang==='pt'?'pt-BR':lang)).length,content.filter(a=>a.type===type&&a[lang]).length);
 }
});
test('every indexable page has a same-language inbound link and guide plant links resolve both ways',()=>{
 const langOf=f=>(f.slice(root.length+1).match(/^(en|es|de|pt|fr)\//)||[,'tr'])[1];const inbound=new Map(files.map(f=>[f,0]));
 for(const file of files){const s=readFileSync(file,'utf8');for(let [,url] of s.slice(s.indexOf('<body')).matchAll(/href="([^"]+)"/g)){
  if(url.startsWith('https://lilora.app/'))url=new URL(url).pathname;if(!url.startsWith('/'))continue;const t=root+url.split('#')[0]+(url.split('#')[0].endsWith('/')?'index.html':'');
  if(t!==file&&inbound.has(t)&&langOf(t)===langOf(file))inbound.set(t,inbound.get(t)+1);}}
 for(const [file,n] of inbound)if(!/name="robots" content="[^"]*noindex/.test(readFileSync(file,'utf8')))assert.ok(n>0,`${file}: no same-language inbound link`);
 const plants=JSON.parse(readFileSync('editorial/plants.json'));
 for(const a of content)for(const slug of a.plants||[]){const p=plants.find(x=>x.slug===slug);assert.ok(p,`${a.slug}: unknown plant ${slug}`);
  for(const l of languages)if(a[l]&&p[l]){const pre=l==='tr'?'':l+'/';
   assert.ok(readFileSync(articlePath(a,l).slice(1)+'index.html','utf8').includes(`href="/${pre}plants/${slug}/"`),`${a.slug}/${l}: missing plant link ${slug}`);}}
});
