const { languages, prefix, htmlLang } = require('./locale-registry.cjs');
// Selected library filters must remain identifiable to assistive technology.
// Local static fixture only: no production requests, analytics hits or submissions.
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
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
  const widths = [390, 1440];
  try {
    for (const lang of languages) for (const width of widths) for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: htmlLang(lang), reducedMotion: 'reduce', javaScriptEnabled });
      await context.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
      await context.addInitScript(() => {
        if (location.protocol === 'http:') localStorage.setItem('lilora.cookie-preferences.v2', JSON.stringify({ version: 2, analytics: false, savedAt: Date.now() }));
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const url = `${origin}${prefix(lang)}plants/`;
      await page.goto(url);
      const chips = page.locator('.plant-chip');
      const filters = await chips.evaluateAll(items => items.map(item => item.dataset.filter));
      const cards = await page.locator('.plant-card').evaluateAll(items => items.map(item => ({ href: item.querySelector('a').getAttribute('href'), tags: item.dataset.tags.split(' ') })));
      const current = async filter => {
        const active = page.locator('.plant-chip[aria-current="true"]');
        assert.equal(await active.count(), 1, `${lang} @${width}: exactly one accessible current filter`);
        assert.equal(await active.getAttribute('data-filter'), filter);
        assert.equal(await page.locator('.plant-chip[aria-current]').count(), 1, 'inactive chips have no current marker');
        const expected = cards.filter(card => filter === 'all' || card.tags.includes(filter)).map(card => card.href);
        assert.deepEqual(await page.locator('.plant-card:visible a').evaluateAll(items => items.map(item => item.getAttribute('href'))), expected, 'visible results match the current filter');
        const template = await page.locator('.plant-browser').getAttribute('data-count-template');
        assert.equal(await page.locator('.plant-count').innerText(), template.replace('{n}', expected.length), 'localized live count agrees with results');
        assert.equal(await page.locator('.plant-count').getAttribute('aria-live'), 'polite');
        checks++;
      };
      if (javaScriptEnabled) {
        await current('all');
        for (const filter of [...filters.filter(value => value !== 'all'), 'all']) {
          const chip = page.locator(`.plant-chip[data-filter="${filter}"]`);
          if (width === 390) { await chip.focus(); await page.keyboard.press('Enter'); }
          else await chip.click();
          await current(filter);
          assert.equal(await chip.evaluate(item => item === document.activeElement), true, 'activation retains focus on the selected filter');
          assert.equal(new URL(page.url()).hash, filter === 'all' ? '' : '#' + filter);
        }
        for (const filter of filters.filter(value => value !== 'all')) {
          await page.goto('about:blank');
          await page.goto(url + '#' + filter);
          await current(filter);
        }
      } else {
        assert.equal(await page.locator('.plant-card:visible').count(), cards.length);
        for (const filter of filters.filter(value => value !== 'all')) {
          await page.locator(`.plant-chip[data-filter="${filter}"]`).click();
          assert.equal(new URL(page.url()).hash, '#' + filter);
          const section = page.locator(`.plant-filter[id="${filter}"]`);
          assert.ok(await section.isVisible(), 'without JavaScript, the category links reach a static list');
          assert.deepEqual(await section.locator('a').evaluateAll(items => items.map(item => item.getAttribute('href'))), cards.filter(card => card.tags.includes(filter)).map(card => card.href));
          checks++;
        }
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    const report = { checks, languages, widths, javascriptErrors: errors.length, externalRequests: external.length, production: 'Not asserted by this local test' };
    fs.mkdirSync('.test-results/filter-current', { recursive: true });
    fs.writeFileSync('.test-results/filter-current/report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
