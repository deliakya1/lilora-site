import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { languages, languageOptions, prefix, htmlLang, languageOfPath } from './locale-registry.mjs';

const read = path => readFileSync(path, 'utf8');
const routes = JSON.parse(read('editorial/routes.json'));
const redirects = JSON.parse(read('content/redirects.json'));
const origin = 'https://lilora.app';
const added = ['ja', 'ko', 'it', 'zh-Hant'];

test('English is the root default and all ten locales have the complete same set of pages', () => {
  assert.deepEqual(languages, ['en', 'tr', 'es', 'de', 'pt', 'fr', 'ja', 'ko', 'it', 'zh-Hant']);
  assert.equal(prefix('en'), '/');
  assert.equal(prefix('tr'), '/tr/');
  assert.equal(prefix('zh-Hant'), '/zh-hant/');
  assert.equal(htmlLang('zh-Hant'), 'zh-Hant');
  const en = routes.filter(path => languageOfPath(path) === 'en').map(path => path.slice(1)).sort();
  assert.equal(en.length, 56);
  for (const language of languages) {
    const own = routes.filter(path => languageOfPath(path) === language);
    assert.deepEqual(own.map(path => path.slice(prefix(language).length)).sort(), en, language);
    for (const path of own) {
      const html = read('.' + path + 'index.html');
      const alternate = [...html.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
      assert.equal(alternate.length, languages.length + 1, path);
      assert.equal(alternate.find(x => x[1] === 'x-default')[2], origin + '/' + path.slice(prefix(language).length));
      assert.ok(html.includes(`<html lang="${htmlLang(language)}">`), path);
      assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`), path);
      const config = JSON.parse(html.match(/id="site-locale">(.*?)<\/script>/s)[1]);
      assert.equal(config.defaultLanguage, 'en', path);
      assert.deepEqual(config.languageOptions, languageOptions, path);
      assert.equal(config.basePath, prefix(language), path);
    }
  }
});

test('every former English page redirects directly to its canonical root counterpart', () => {
  const canonical = new Set(routes);
  for (const target of routes.filter(path => languageOfPath(path) === 'en')) {
    const from = '/en' + target;
    assert.equal(redirects[from], target, from);
  }
  for (const [from, target] of Object.entries(redirects)) {
    assert.ok(!canonical.has(from), `Redirect overwrites ${from}`);
    assert.ok(canonical.has(target), `${from}: missing destination`);
    assert.ok(!redirects[target], `${from}: redirect chain`);
    const html = read('.' + from + 'index.html');
    assert.ok(html.includes(`http-equiv="refresh" content="0; url=${target}"`));
    assert.ok(html.includes('src="/assets/redirect.js"'));
    assert.ok(!read('sitemap.xml').includes(origin + from + '</loc>'));
  }
  assert.equal(read('en/feed.xml'), read('feed.xml'), 'Old feed subscriptions retain English entries');
});

test('static migration keeps query parameters and fragments without permitting another origin', () => {
  const source = read('assets/redirect.js');
  for (const target of ['/guides/watering-houseplants/', '/tr/blog/check-before-you-water/']) {
    const navigations = [];
    const location = new URL('/en/guides/watering-houseplants/?utm_source=qr&form=sent#care', origin);
    location.replace = value => navigations.push(String(value));
    runInNewContext(source, { URL, location, document: { querySelector: () => ({ href: origin + target }) } });
    assert.deepEqual(navigations, [origin + target + '?utm_source=qr&form=sent#care']);
  }
  const location = new URL('/en/', origin);
  location.replace = () => assert.fail('Cross-origin navigation');
  runInNewContext(source, { URL, location, document: { querySelector: () => ({ href: 'https://example.org/' }) } });
});

test('all four translations retain article sections, institutional citations and localized form languages', () => {
  const external = source => [...new Set([...source.matchAll(/(?:href="|\]\()(https?:\/\/[^"\s)<>]+)/g)].map(x => x[1]).filter(url => !url.startsWith(origin + "/")))].sort();
  for (const folder of ['content/articles', 'content/plants']) for (const slug of readdirSync(folder)) {
    if (!statSync(folder + '/' + slug).isDirectory()) continue;
    const english = read(`${folder}/${slug}/en.md`);
    const headingLevels = source => [...source.matchAll(/^(#{2,3}) /gm)].map(x => x[1]);
    for (const language of added) {
      const source = read(`${folder}/${slug}/${language}.md`);
      assert.deepEqual(headingLevels(source), headingLevels(english), `${slug}/${language}: omitted section`);
      assert.deepEqual(external(source), external(english), `${slug}/${language}: omitted citation`);
      assert.notEqual(source, english, `${slug}/${language}: untranslated body`);
    }
  }
  for (const language of languages) {
    for (const page of ['contact/', 'blog/check-before-you-water/']) {
      const html = read('.' + prefix(language) + page + 'index.html');
      assert.ok(html.includes(`name="language" value="${language}"`), `${language}/${page}: server language`);
    }
  }
});
