const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { languages, prefix, htmlLang, defaultLanguage } = require('./locale-registry.cjs');
const base = 'http://127.0.0.1:4173';
const key = 'lilora.language.v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  let cases = 0;

  async function context(browserLanguages, { saved, blocked = false, js = true, userAgent } = {}) {
    const c = await browser.newContext({ javaScriptEnabled: js, ...(userAgent ? { userAgent } : {}) });
    await c.route(/https:\/\/.*google.*/, r => r.fulfill({ body: '' }));
    await c.addInitScript(({ browserLanguages, saved, blocked, key }) => {
      Object.defineProperty(navigator, 'languages', { get: () => browserLanguages });
      Object.defineProperty(navigator, 'language', { get: () => browserLanguages[0] || '' });
      if (saved) localStorage.setItem(key, saved);
      if (blocked) {
        Storage.prototype.getItem = () => { throw Error('blocked'); };
        Storage.prototype.setItem = () => { throw Error('blocked'); };
      }
    }, { browserLanguages, saved, blocked, key });
    return c;
  }

  try {
    // The requested URL always wins, for humans and crawlers, in every supported locale.
    for (const language of languages) {
      for (const userAgent of [undefined, 'Googlebot', 'Bingbot']) {
        const c = await context(['pt-PT', 'en-US'], { userAgent });
        const p = await c.newPage();
        const path = prefix(language) + 'support/';
        await p.goto(base + path + '?campaign=care#main');
        assert.equal(p.url(), base + path + '?campaign=care#main');
        assert.equal(await p.locator('html').getAttribute('lang'), htmlLang(language));
        await c.close();
        cases++;
      }
    }

    // Regional aliases retain preference order. Explicit Simplified Chinese never selects Traditional Chinese.
    const preferenceCases = [
      [['en-US'], 'en'],
      [['es-MX'], 'es'],
      [['pt-PT'], 'pt'],
      [['pt-BR'], 'pt'],
      [['zh-CN', 'fr-CA', 'de-DE'], 'fr'],
      [['de-AT'], 'de'],
      [['tr-TR'], 'tr'],
      [['ja-JP'], 'ja'],
      [['ko-KR'], 'ko'],
      [['it-CH'], 'it'],
      [['zh-Hant'], 'zh-Hant'],
      [['zh-Hant-TW'], 'zh-Hant'],
      [['zh-TW'], 'zh-Hant'],
      [['zh-HK'], 'zh-Hant'],
      [['zh-MO'], 'zh-Hant'],
      [['ZH-hAnT-HK'], 'zh-Hant'],
      [['zh-Hans'], defaultLanguage],
      [['zh-Hans-CN'], defaultLanguage],
      [['zh-Hans-HK'], defaultLanguage],
      [['zh-Hans', 'fr-CA'], 'fr'],
      [['zh-CN'], defaultLanguage],
      [[], defaultLanguage],
    ];
    for (const [prefs, expected] of preferenceCases) {
      const c = await context(prefs);
      const p = await c.newPage();
      await p.goto(base + prefix(defaultLanguage));
      assert.equal(new URL(p.url()).pathname, prefix(defaultLanguage));
      const bar = p.locator('.language-suggestion');
      if (expected === defaultLanguage) {
        assert.equal(await bar.count(), 0);
      } else {
        assert.equal(await bar.getAttribute('lang'), htmlLang(expected));
        assert.equal(new URL(await bar.locator('a').getAttribute('href'), base).pathname, prefix(expected));
        await bar.locator('button').click();
        await p.reload();
        assert.equal(await bar.count(), 0);
      }
      await c.close();
      cases++;
    }

    for (const language of languages) {
      for (const blocked of [false, true]) {
        const c = await context(['fr-FR'], { blocked });
        const p = await c.newPage();
        await p.goto(base + prefix(defaultLanguage) + '?campaign=care#main');
        const hrefs = await p.locator('.language-picker a[hreflang]').evaluateAll(as => as.map(a => a.href));
        assert.equal(hrefs.length, languages.length);
        assert.ok(hrefs.every(href => !new URL(href).searchParams.has('lilora_lang')), 'rendered language links stay clean');
        await p.locator('.language-picker summary').click();
        await p.locator(`.language-picker a[hreflang="${htmlLang(language)}"]`).click();
        await p.waitForURL(u => u.pathname === prefix(language));
        assert.equal(new URL(p.url()).search, '?campaign=care');
        assert.equal(new URL(p.url()).hash, '#main');
        await p.reload();
        assert.equal(new URL(p.url()).pathname, prefix(language));
        if (!blocked) {
          assert.equal(await p.evaluate(k => localStorage.getItem(k), key), language);
          await p.goto(base + prefix(defaultLanguage));
          assert.equal(new URL(p.url()).pathname, prefix(defaultLanguage));
          assert.equal(await p.locator('.language-suggestion').count(), 0);
        }
        await c.close();
        cases++;
      }
    }

    {
      const c = await context(['de-DE']);
      const p = await c.newPage();
      await p.goto(base + prefix('en') + 'guides/watering-houseplants/');
      const a = p.locator('.language-suggestion a');
      assert.equal(new URL(await a.getAttribute('href'), base).pathname, prefix('de') + 'guides/watering-houseplants/');
      assert.equal(await a.textContent(), require('../locales/de.json').suggestion);
      await c.close();
      cases++;
    }

    for (const js of [true, false]) {
      const c = await context(['en-US'], { js });
      const p = await c.newPage();
      await p.goto(base + prefix('de') + 'support/');
      await p.locator('.language-picker summary').click();
      await p.locator('.language-picker a[hreflang="tr"]').click();
      await p.waitForURL(u => u.pathname === prefix('tr') + 'support/');
      assert.ok(await p.locator('h1').isVisible());
      await c.close();
      cases++;
    }
    console.log(`${cases} language scenarios passed: ${languages.length} routes, crawler UAs, ordered browser preferences, regional and script variants, no redirect, manual persistence, blocked storage, translated counterpart and no JavaScript.`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
