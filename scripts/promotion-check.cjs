const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('playwright-core')); }
const jsQR = require('jsqr');
const { PNG } = require('pngjs');

const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4173';
const siteOrigin = new URL(base).origin;
const { languages, prefix, htmlLang, languageOfPath: langOf } = require('./locale-registry.cjs');
const routes = JSON.parse(fs.readFileSync('editorial/routes.json', 'utf8'));
const homeCopy = JSON.parse(fs.readFileSync('pages/home/copy.json', 'utf8'));
const plants = JSON.parse(fs.readFileSync('editorial/plants.json', 'utf8'));
const locales = Object.fromEntries(languages.map((lang) => [lang, JSON.parse(fs.readFileSync(`locales/${lang}.json`, 'utf8'))]));
const credits = fs.readFileSync('assets/images/CREDITS.md', 'utf8');
const output = '.test-results/promotion';
fs.mkdirSync(output, { recursive: true });

// Existing comparisons may cite competitors' public store pages. Lilora itself
// must not advertise an unverified public listing during this prelaunch work.
const forbidden = /apps\.apple\.com[^\s"'<>]*6818604360|Download_on_the_App_Store_Badge|download-on-the-app-store|apple-itunes-app/i;
const errors = [];
const external = new Set();
const generatedUsed = new Set();
let routeChecks = 0, layoutChecks = 0, qrChecks = 0, screenshots = 0;

function watch(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && new URL(url).origin !== siteOrigin) external.add(url);
  });
}

function checkPng(file, width, height) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${file}: PNG signature`);
  assert.equal(bytes.readUInt32BE(16), width, `${file}: width`);
  assert.equal(bytes.readUInt32BE(20), height, `${file}: height`);
}

async function open(page, route) {
  const response = await page.goto(base + route);
  assert.equal(response.status(), 200, route);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${page.viewportSize().width}px overflow: ${route}`);
}

async function allImages(page, route) {
  const issues = await page.locator('img').evaluateAll((images) => images.flatMap((image) => {
    const reasons = [];
    if (!(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0)) reasons.push('missing dimensions');
    if (!image.hasAttribute('alt')) reasons.push('missing alt');
    return reasons.map((reason) => `${image.getAttribute('src')}: ${reason}`);
  }));
  assert.deepEqual(issues, [], route);
  for (const src of await page.locator('main img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))) {
    if (!src?.startsWith('/assets/images/home/') || src.includes('/app-')) continue;
    const stem = path.basename(src).replace(/-\d+\.(webp|avif|png)$/, '');
    generatedUsed.add(stem);
    assert.ok(credits.includes(stem), `${stem}: generated illustration missing from CREDITS.md`);
  }
}

async function loadLazyImages(page, route) {
  for (const image of await page.locator('main img').all()) {
    if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
  }
  await page.locator('img').evaluateAll((images) => images.forEach((image) => { image.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 15000 });
  assert.deepEqual(await page.locator('img').evaluateAll((images) => images.filter((image) => image.naturalWidth === 0).map((image) => image.src)), [], `${route}: broken image`);
  await page.evaluate(() => scrollTo(0, 0));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    // No saved consent is installed: this covers the actual first visit, before opt-in.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-GB', reducedMotion: 'reduce' });
    const page = await context.newPage();
    watch(page);
    for (const route of routes) {
      const lang = langOf(route);
      await open(page, route);
      assert.equal(await page.locator('html').getAttribute('lang'), htmlLang(lang), route);
      assert.equal(await page.locator('h1').count(), 1, route);
      assert.ok(await page.locator(`header.header a[data-analytics-cta][href="${prefix(lang)}download/"]`).count() >= 1, `${route}: local header download CTA`);
      assert.ok(!forbidden.test(await page.content()), `${route}: prelaunch badge, store link or Smart App Banner`);
      assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image', route);
      const og = await page.locator('meta[property="og:image"]').getAttribute('content');
      assert.equal(new URL(og).origin, 'https://lilora.app', route);
      assert.ok(new URL(og).pathname.startsWith('/assets/brand/share/'), route);
      assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'), og, route);
      assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1200', route);
      assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '630', route);
      checkPng('.' + new URL(og).pathname, 1200, 630);
      await allImages(page, route);
      routeChecks++;
    }
    await open(page, '/404.html');
    await allImages(page, '/404.html');
    await context.close();

    for (const width of [390, 1440]) {
      for (const lang of languages) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: htmlLang(lang), reducedMotion: 'reduce' });
        // Dismiss the consent layer for unobstructed visual and lazy-image inspection.
        await context.addInitScript(() => localStorage.setItem('lilora.cookie-preferences.v2', JSON.stringify({ version: 2, analytics: false, savedAt: Date.now() })));
        const page = await context.newPage();
        watch(page);
        for (const kind of ['home', 'download', 'press']) {
          const route = prefix(lang) + (kind === 'home' ? '' : `${kind}/`);
          await open(page, route);
          await allImages(page, route);
          const emptyContentAlts = await page.locator('main img').evaluateAll((images) => images.filter((image) => !image.getAttribute('alt')?.trim() && image.getAttribute('aria-hidden') !== 'true' && image.getAttribute('role') !== 'presentation').map((image) => image.getAttribute('src')));
          assert.deepEqual(emptyContentAlts, [], `${route}: content images need explicit localized alternatives`);
          const appImages = await page.locator('main img').evaluateAll((images) => images.filter((image) => /\/app-|\/lilora-iphone-/.test(image.getAttribute('src') || '')).map((image) => image.getAttribute('src')));
          assert.ok(appImages.length > 0, `${route}: genuine app artwork`);
          assert.ok(appImages.every((src) => src.includes(lang === 'tr' ? '-tr-' : '-en-')), `${route}: artwork language`);
          if (!['tr', 'en'].includes(lang)) {
            const disclosure = page.locator('main .app-language-note, main .promo-language, main [data-app-language-disclosure]').filter({ visible: true }).first();
            assert.ok(await disclosure.isVisible(), `${route}: visible app-language disclosure`);
            assert.ok((await disclosure.innerText()).trim().length > 0, `${route}: app-language disclosure text`);
          }
          if (kind === 'home') {
            assert.equal(await page.locator('h1').innerText(), homeCopy[lang].title, `${route}: own-language title`);
            assert.equal(await page.locator('.promo-features .promo-feature').count(), 6, `${route}: six product features`);
            assert.equal(await page.locator('.home-editorial .story-card, .home-editorial .post-card').count(), 3, `${route}: latest three guides`);
            const englishCards = await page.locator('.home-editorial .story-card[lang="en"]').count();
            if (englishCards && lang !== 'en') assert.ok((await page.locator('.home-editorial .also-english').innerText()).includes(locales[lang].alsoEnglish), `${route}: marked English fallback`);
            const hasPlants = plants.some((plant) => plant[lang]);
            assert.equal(await page.locator('.home-plants').count(), hasPlants ? 1 : 0, `${route}: no empty plant teaser`);
            const faqCount = await page.locator('.promo-faq details').count();
            assert.ok(faqCount >= 4 && faqCount <= 6, `${route}: FAQ size`);
            assert.ok(!(await page.locator('script[type="application/ld+json"]').allTextContents()).join('').includes('FAQPage'), `${route}: no FAQ rich-result schema`);
            assert.ok((await page.locator('main').innerText()).includes(homeCopy[lang].artCaptionEN), `${route}: localized artwork caption`);
          }
          if (kind !== 'press') {
            const qr = page.locator('.promo-qr');
            assert.equal(await qr.count(), 1, `${route}: QR block`);
            assert.equal(await qr.isVisible(), width >= 900, `${route}: QR visible only on wide screens`);
            if (width === 390) assert.ok(await page.locator('main a[data-analytics-cta]:visible').count() > 0, `${route}: visible mobile/action button`);
            if (kind === 'download' && width === 390) assert.equal(await page.locator('.promo-mobile-cta').isVisible(), true, `${route}: phone download-status button`);
          }
          await loadLazyImages(page, route);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: loaded-image overflow`);
          if (kind !== 'press') {
            await page.screenshot({ path: `${output}/${lang}-${kind}-${width}.png`, fullPage: true });
            screenshots++;
          }
          layoutChecks++;
        }
        await context.close();
      }
    }

    const qrContext = await browser.newContext({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
    const qrPage = await qrContext.newPage();
    watch(qrPage);
    for (const qr of JSON.parse(fs.readFileSync('assets/brand/qr/manifest.json', 'utf8'))) {
      const expected = `https://lilora.app${prefix(qr.lang)}download/?utm_source=qr&utm_medium=${qr.context}&utm_campaign=prelaunch`;
      await qrPage.setContent(`<img src="${base}${qr.file}" width="512" height="512" alt="QR test">`);
      const image = qrPage.locator('img');
      await image.evaluate((element) => element.decode());
      const png = PNG.sync.read(await image.screenshot());
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      assert.ok(decoded, `${qr.file}: QR did not decode`);
      assert.equal(decoded.data, expected, `${qr.file}: encoded destination`);
      // Inspect the rendered outer quiet zone, not just the manifest's declaration.
      const margin = Math.floor(png.width * 4 / (qr.modules + 8)) - 1;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        if (x >= margin && x < png.width - margin && y >= margin && y < png.height - margin) continue;
        const index = (y * png.width + x) * 4;
        assert.ok(Math.abs(png.data[index] - 247) <= 2 && Math.abs(png.data[index + 1] - 243) <= 2 && Math.abs(png.data[index + 2] - 236) <= 2, `${qr.file}: four-module Paper quiet zone`);
      }
      qrChecks++;
    }
    assert.equal(qrChecks, languages.length * 4, 'Every language × four QR contexts');
    await qrContext.close();

    const failureContext = await browser.newContext({ viewport: { width: 390, height: 1000 } });
    const failurePage = await failureContext.newPage();
    watch(failurePage);
    await failurePage.route('**/assets/images/home/**', (route) => route.request().url().includes('/app-') ? route.continue() : route.abort());
    await open(failurePage, prefix('en'));
    assert.equal(await failurePage.locator('h1').innerText(), homeCopy.en.title);
    assert.equal(await failurePage.locator('a[data-analytics-cta="home-hero"]').isVisible(), true, 'Illustration failures must not hide the download CTA');
    assert.equal(await failurePage.locator('a[data-analytics-cta="home-hero"]').getAttribute('href'), prefix('en') + 'download/');
    await failureContext.close();

    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    assert.deepEqual([...external], [], 'No third-party requests before analytics consent');
    checkPng('assets/apple-touch-icon.png', 180, 180);
    const report = { indexRoutes: routeChecks, promotionLayouts: layoutChecks, widths: [390, 1440], screenshots, decodedQrCodes: qrChecks, generatedIllustrationsWithCredits: [...generatedUsed].sort(), javascriptErrors: errors.length, thirdPartyRequestsBeforeConsent: external.size, illustrationFailureFallback: 'passed', imageAltReview: 'Presence, locale source and artwork locale checked; semantic translation accuracy requires editorial review.' };
    fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
