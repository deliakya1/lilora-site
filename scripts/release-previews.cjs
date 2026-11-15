// Capture representative released layouts after the automated browser gates.
const { chromium } = require('playwright-core');
const { mkdirSync } = require('node:fs');
(async () => {
  mkdirSync('.test-results/previews', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  try {
    for (const [lang, path] of [['en', '/'], ['tr', '/tr/']]) {
      for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, locale: lang, reducedMotion: 'reduce' });
        await page.goto('http://127.0.0.1:4173' + path);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => {
          const images = [...document.images];
          images.forEach(image => { image.loading = 'eager'; });
          await Promise.all(images.map(image => image.decode()));
        });
        await page.screenshot({ path: `.test-results/previews/${lang}-${width}.png`, fullPage: true });
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
