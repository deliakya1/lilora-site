const { languages, prefix: localePrefix } = require('./locale-registry.cjs');
// Malformed URL fragments must not disable unrelated page controls.
// All requests outside the local fixture are blocked; no forms are submitted.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

(async () => {
  const root = process.cwd();
  const server = http.createServer((req, res) => {
    let file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (file.endsWith(path.sep)) file += 'index.html';
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
      res.writeHead(404); res.end(); return;
    }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const errors = [], external = [];
  let checks = 0;
  try {
    for (const lang of languages) {
      const prefix = localePrefix(lang);
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => {
          if (route.request().url().startsWith(origin + '/')) return route.continue();
          external.push(route.request().url());
          return route.abort();
        });
        await context.addInitScript(() => localStorage.setItem('lilora.cookie-preferences.v2', JSON.stringify({ version: 2, analytics: false, savedAt: Date.now() })));
        const page = await context.newPage();
        page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
        for (const fragment of ['%', '%E0%A4%A', '%FF']) {
          await page.goto(`${origin}${prefix}contact/?form=sent#${fragment}`);
          assert.deepEqual(errors, [], 'a malformed fragment must not throw');
          assert.equal(new URL(page.url()).hash, '#' + fragment, 'do not rewrite the visitor URL');
          assert.ok(Number(await page.locator('.contact-form input[name="started"]').inputValue()) > 0, 'form enhancement initializes');
          assert.ok(await page.locator('.contact-status[data-state="sent"]').isVisible(), 'redirect status initializes');
          const picker = page.locator('.footer-language');
          await picker.locator('summary').click();
          assert.notEqual(await picker.getAttribute('open'), null);
          await page.keyboard.press('Escape');
          assert.equal(await picker.getAttribute('open'), null, 'dropdown Escape handler initializes');
          checks++;
        }
        await page.goto(`${origin}${prefix}plants/#%`);
        const cards = page.locator('.plant-card');
        const total = await cards.count();
        await page.locator('.plant-chip[data-filter="petNonToxic"]').click();
        const filtered = await page.locator('.plant-card:visible').count();
        assert.ok(filtered > 0 && filtered < total, 'plant filtering initializes');
        assert.ok(await page.locator('.plant-card:visible').evaluateAll(items => items.every(item => item.dataset.tags.split(' ').includes('petNonToxic'))));
        await page.locator('.plant-chip[data-filter="all"]').click();
        assert.equal(await page.locator('.plant-card:visible').count(), total);
        checks++;

        await page.goto(`${origin}${prefix}guides/watering-houseplants/#%`);
        assert.ok(await page.locator('.share-tools').isVisible(), 'later share-control script initializes');
        checks++;

        await page.goto(`${origin}${prefix}support/#%72eminders`);
        const faq = page.locator('details#reminders');
        assert.notEqual(await faq.getAttribute('open'), null, 'valid encoded FAQ fragment still opens');
        await faq.evaluate(item => item.open = false);
        await page.evaluate(() => location.hash = '%E0%A4%A');
        await page.waitForFunction(() => location.hash === '#%E0%A4%A');
        await page.evaluate(() => location.hash = 'reminders');
        await page.waitForFunction(() => document.querySelector('details#reminders').open);
        for (const fragment of ['', 'unknown-section']) {
          await page.evaluate(value => location.hash = value, fragment);
          await page.waitForFunction(value => location.hash === (value ? '#' + value : ''), fragment);
        }
        assert.deepEqual(errors, [], 'valid, invalid and unknown hash changes remain harmless');
        checks++;
        await context.close();
      }
    }
    assert.deepEqual(external, [], 'no third-party requests or form submissions');
    const report = { checks, languages, widths: [390, 1440], javascriptErrors: errors.length, externalRequests: external.length, formSubmissions: 0, production: 'Not asserted by this local test' };
    fs.mkdirSync('.test-results/fragment-recovery', { recursive: true });
    fs.writeFileSync('.test-results/fragment-recovery/report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
