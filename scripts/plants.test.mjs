import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import { languages, prefix, htmlLang, languageOptions, descriptionRange, isCJK } from './locale-registry.mjs';

const plants=JSON.parse(readFileSync('editorial/plants.json'));
const articles=JSON.parse(readFileSync('editorial/articles.json'));
const credits=readFileSync('assets/images/plants/CREDITS.md','utf8');
const text=(item)=>[item.answer,...item.sections.map(s=>s.html)].join(' ').replace(/<[^>]+>/g,' ');
// Share of common English function words; translated bodies stay far below an English page.
const english=(s)=>{const words=s.toLowerCase().match(/[a-z’']+/g)||[];return words.filter(w=>['the','and','with','your','when','water','plant','leaves','check','before','light','this','that','from','not','it','is','are','or','of','to'].includes(w)).length/Math.max(words.length,1);};
test('twelve plant profiles exist in all supported languages with botanical name, family and three or more institutional sources',()=>{
 assert.equal(plants.length,12);
 for(const p of plants){
  assert.match(p.botanicalName,/^[A-Z][a-z]+( [a-z-]+)?$/,p.slug);assert.ok(p.family.endsWith('aceae'),p.slug);
  assert.ok(p.sources.length>=3,p.slug);assert.ok(p.sources.some(s=>s.url==='https://www.aspca.org/'),p.slug);
  for(const lang of languages){assert.ok(p[lang],`${p.slug}/${lang}`);assert.ok(p[lang].sections.length>=9,`${p.slug}/${lang}`);assert.ok(p[lang].sections.at(-1).html.split('<h3>').length-1>=3,`${p.slug}/${lang}: FAQ`);}
 }
});
test('every profile states an ASPCA listing or says it is not listed, cites the ASPCA homepage only and never claims a plant is pet-safe',()=>{
 for(const p of plants)for(const lang of languages){
  const glance=p[lang].atAGlance;assert.equal(glance.petSafetySource,'https://www.aspca.org/');assert.match(glance.petSafety,/ASPCA/,`${p.slug}/${lang}`);
  const body=text(p[lang]);assert.match(body,/ASPCA(?: Animal Poison Control Center|動物中毒管理センター| 동물독극물관리센터)/,`${p.slug}/${lang}`);
  for(const [,url] of p[lang].sections.map(s=>s.html).join(' ').matchAll(/href="([^"]+)"/g))if(url.includes('aspca.org'))assert.equal(url,'https://www.aspca.org/',`${p.slug}/${lang}`);
  assert.doesNotMatch(body,/\b(?:is|are)\s+(?:completely\s+)?(?:pet[- ]safe|safe for pets)\b/i,`${p.slug}/${lang}`);
 }
});
test('every profile has a credited photo with localized alt text and a visible licence caption',()=>{
 for(const p of plants){
  assert.ok(existsSync('.'+p.image),p.image);assert.ok(p.imageWidth>0&&p.imageHeight>0);assert.ok(credits.includes('`'+p.image.split('/').pop()+'`'),`${p.slug}: CREDITS.md`);
  const alts=new Set(languages.map(lang=>p[lang].imageAlt));assert.equal(alts.size,languages.length,`${p.slug}: alt text per language`);
  for(const lang of languages){
   assert.match(p[lang].caption,/creativecommons\.org/,`${p.slug}/${lang}`);assert.match(p[lang].caption,/inaturalist\.org\/observations\/\d+/,`${p.slug}/${lang}`);
   const page=readFileSync(`.${prefix(lang)}plants/${p.slug}/index.html`,'utf8');
   assert.ok(page.includes(`<em>${p.botanicalName}</em>`),`${p.slug}/${lang}: italic botanical name`);
   assert.match(page,new RegExp(`<img src="${p.image}"[^>]+alt="[^"]{12,}"`),`${p.slug}/${lang}: image alt`);
   assert.match(page,/<figcaption>[^<]*<a href="https:\/\/www\.inaturalist\.org/,`${p.slug}/${lang}: visible credit`);
  }
 }
});
test('translated profiles and articles are not English bodies under another language',()=>{
 const items=[...plants,...articles];
 for(const item of items){
  if(!item.en)continue;const baseline=english(text(item.en));assert.ok(baseline>0.12,`${item.slug}: English baseline`);
  for(const lang of languages.filter(l=>l!=='en'))if(item[lang]){const translated=text(item[lang]); const share=isCJK(lang)?((translated.match(/\b(the|and|your|when|water|plant|leaves|before|light|this|that|from|not|are)\b/gi)||[]).join('').length/Math.max(translated.replace(/[^\p{L}]/gu,'').length,1)):english(translated);assert.ok(share<0.05,`${item.slug}/${lang}: ${share.toFixed(3)} English function words`);assert.notEqual(item[lang].title,item.en.title,`${item.slug}/${lang}: untranslated title`);}
 }
 // Every article type, including the blog, has complete locale coverage.
 for(const a of articles)for(const lang of languages)assert.ok(a[lang],`${a.slug}/${lang}: missing translation`);
});
test('the plant hub offers no-JS filter anchors and the pet guide links every profile in every language',()=>{
 const guide=articles.find(a=>a.slug==='pet-safe-houseplants');assert.ok(guide);
 for(const lang of languages){
  const hub=readFileSync(`.${prefix(lang)}plants/index.html`,'utf8');
  for(const tag of ['petNonToxic','lowLight','beginner']){assert.ok(hub.includes(`href="#${tag}"`),`${lang}: chip ${tag}`);assert.ok(hub.includes(`id="${tag}"`),`${lang}: section ${tag}`);}
  const html=guide[lang].sections.map(s=>s.html).join(' ');
  for(const p of plants)assert.ok(html.includes(`href="${prefix(lang)}plants/${p.slug}/"`),`${lang}: guide links ${p.slug}`);
 }
 const listed=plants.filter(p=>p.tags.includes('petNonToxic')).map(p=>p.slug).sort();
 assert.deepEqual(listed,['chlorophytum-comosum','goeppertia','phalaenopsis']);
 for(const p of plants)if(p.tags.includes('petNonToxic'))assert.match(p.en.atAGlance.petSafety,/non-toxic/i,p.slug);
});
test('Turkish 114 UZEM line appears only in Turkish and English pet text and never as a pet service',()=>{
 for(const item of [...plants,...articles])for(const lang of languages){
  if(!item[lang])continue;const body=text(item[lang]);
  if(!['tr','en'].includes(lang))assert.doesNotMatch(body,/\b114\b/,`${item.slug}/${lang}`);
  for(const sentence of body.split(/(?<=[.;])\s/).filter(x=>/\b114\b/.test(x)))if(/\b(?:pets?|animals?|hayvan\w*|kedi\w*|köpek\w*)\b/i.test(sentence))assert.match(sentence,/\bnot\b|değil/,`${item.slug}/${lang}: ${sentence}`);
 }
});
