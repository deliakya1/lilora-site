// Comment loading must preserve keyboard focus through success, errors and retry.
// All endpoint calls are mocked; no comments are submitted or fetched from production.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

(async () => {
  const root = process.cwd();
  const endpoint = JSON.parse(fs.readFileSync('content/comments.json', 'utf8')).endpoint;
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
  const errors = [], unexpected = [];
  let checks = 0, mockedRequests = 0, accessibilityChecks = 0;
  const languages = ['tr', 'en', 'es', 'de', 'pt', 'fr'], widths = [390, 1440];
  try {
    for (const lang of languages) for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: lang, reducedMotion: 'reduce' });
      await context.addInitScript(() => localStorage.setItem('lilora.cookie-preferences.v2', JSON.stringify({ version: 2, analytics: false, savedAt: Date.now() })));
      let onRequest, requestCount = 0;
      await context.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        if (route.request().url().startsWith(endpoint + '?') && route.request().method() === 'GET' && onRequest) {
          requestCount++; mockedRequests++;
          const resolve = onRequest; onRequest = null; resolve(route); return;
        }
        unexpected.push(route.request().url()); return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const url = `${origin}${lang === 'tr' ? '/' : `/${lang}/`}blog/check-before-you-water/`;
      const button = page.locator('.comments-load'), list = page.locator('.comments-list');
      const focusIs = selector => page.evaluate(value => document.activeElement === document.querySelector(value), selector);
      const pending = () => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Expected mocked comments request')), 10000);
        onRequest = route => { clearTimeout(timer); resolve(route); };
      });
      const load = async () => {
        const requested = pending();
        await button.focus(); await page.keyboard.press('Enter');
        const route = await requested;
        assert.ok(await focusIs('.comments-load'), 'loading keeps focus on the trigger');
        assert.equal(await button.getAttribute('aria-disabled'), 'true');
        const count = requestCount;
        await page.keyboard.press('Enter'); await page.keyboard.press('Space');
        await button.dispatchEvent('click');
        assert.equal(requestCount, count, 'repeated activation does not start another request');
        assert.deepEqual(unexpected, []);
        return route;
      };
      const reply = async (route, kind) => {
        if (kind === 'network') return route.abort('failed');
        const comments = kind === 'comments' ? [{ name: 'Test reader', message: 'Local test comment.', created_at: '2026-10-01T12:00:00Z' }] : [];
        await route.fulfill({ status: kind === 'error' ? 503 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': origin }, body: kind === 'invalid-json' ? 'not json' : JSON.stringify({ comments }) });
      };
      for (const kind of ['comments', 'empty', 'error', 'network', 'invalid-json']) {
        const before = requestCount;
        await page.goto(url);
        assert.ok(await button.isVisible());
        assert.equal(requestCount, before, 'comments are not loaded on page entry');
        const route = await load();
        await reply(route, kind);
        await page.waitForFunction(() => document.activeElement === document.querySelector('.comments-list'));
        assert.equal(await list.getAttribute('tabindex'), '-1', 'result focus does not add a permanent Tab stop');
        assert.equal(await list.getAttribute('aria-label'), await page.locator('.comments > h2').innerText());
        assert.ok(await list.isVisible());
        assert.ok(await list.evaluate(item => { const s = getComputedStyle(item); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }), 'keyboard focus has a visible outline');
        if (['comments', 'empty', 'error'].includes(kind)) {
          await page.addScriptTag({ content: axeSource });
          const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.comments'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations);
          assert.deepEqual(violations, [], 'loaded comment states pass automated accessibility checks');
          accessibilityChecks++;
        }
        if (['error', 'network', 'invalid-json'].includes(kind)) {
          assert.equal(await list.innerText(), await button.getAttribute('data-error'));
          assert.equal(await button.getAttribute('aria-disabled'), null);
          await page.keyboard.press('Shift+Tab');
          assert.ok(await focusIs('.comments-load'), 'error can be retried by keyboard');
          await reply(await load(), 'empty');
          await page.waitForFunction(() => !document.querySelector('.comments-load'));
          assert.ok(await focusIs('.comments-list'));
        } else {
          assert.equal(await button.count(), 0);
          if (kind === 'comments') assert.equal(await list.locator('.comment-body').innerText(), 'Local test comment.');
          else assert.equal(await list.locator('li').count(), 1);
        }
        await page.keyboard.press('Tab');
        assert.ok(await focusIs('#comment-name'), 'Tab continues into the form after the result');
        checks++;
      }
      // A delayed response must not pull the reader away from the form.
      for (const kind of ['comments', 'error']) {
        await page.goto(url);
        const route = await load();
        await page.keyboard.press('Tab');
        assert.ok(await focusIs('#comment-name'));
        await reply(route, kind);
        await list.waitFor({ state: 'visible' });
        assert.ok(await focusIs('#comment-name'), 'response preserves the reader\'s new focus');
        checks++;
      }
      // Model the existing refresh event only; never submit a comment.
      await page.goto(url);
      await reply(await load(), 'empty');
      await page.waitForFunction(() => !document.querySelector('.comments-load'));
      await page.locator('#comment-message').focus();
      const refreshed = pending();
      await page.locator('.comment-form').dispatchEvent('comment-published', { bubbles: true });
      await reply(await refreshed, 'comments');
      await list.locator('.comment-body').waitFor();
      assert.ok(await focusIs('#comment-message'), 'automatic refresh does not move form focus');
      checks++;
      await context.close();
    }
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    const report = { checks, accessibilityChecks, languages, widths, mockedRequests, javascriptErrors: errors.length, unexpectedRequests: unexpected.length, actualSubmissions: 0, production: 'Not asserted by this local test' };
    fs.mkdirSync('.test-results/comment-focus', { recursive: true });
    fs.writeFileSync('.test-results/comment-focus/report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
