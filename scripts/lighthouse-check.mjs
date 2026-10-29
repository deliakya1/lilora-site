// Local mobile release checks. Installs, production visits and uploads belong to the caller.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultLanguage, prefix } from './locale-registry.mjs';

const origin = 'http://127.0.0.1:4173';
const executable = process.env.LIGHTHOUSE_BIN;
const expectedVersion = process.env.LIGHTHOUSE_VERSION || '13.4.1';
if (!executable || !existsSync(executable)) throw new Error('Set LIGHTHOUSE_BIN to the installed, pinned Lighthouse CLI');
if (!process.env.CHROME_PATH || !existsSync(process.env.CHROME_PATH)) throw new Error('Set CHROME_PATH to the runner-installed Chrome executable');
const output = resolve('.test-results/lighthouse');
mkdirSync(output, { recursive: true });
const thresholds = { performance: 0.90, accessibility: 0.95, 'best-practices': 0.95, seo: 1 };
const pages = [
  { name: 'home', path: prefix(defaultLanguage) },
  { name: 'guide', path: prefix(defaultLanguage) + 'guides/watering-houseplants/' },
  { name: 'support', path: prefix(defaultLanguage) + 'support/' },
];
const results = [];

for (const page of pages) {
  const url = origin + page.path;
  const destination = resolve(output, page.name);
  const result = { name: page.name, url, scores: {}, failures: [] };
  // GNU timeout bounds the whole CLI/Chrome process group, including cleanup.
  const run = spawnSync('timeout', [
    '--kill-after=10s', '180s', executable, url,
    '--form-factor=mobile',
    '--throttling-method=simulate',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage --disable-background-networking',
    '--blocked-url-patterns=https://*',
    '--no-enable-error-reporting',
    '--max-wait-for-load=45000',
    '--output=json', '--output=html', `--output-path=${destination}`,
  ], { stdio: 'inherit', env: process.env });
  if (run.error || run.status !== 0) {
    result.failures.push(run.error?.message || `Lighthouse exited ${run.status ?? run.signal}`);
  } else {
    try {
      const report = JSON.parse(readFileSync(destination + '.report.json', 'utf8'));
      if (report.runtimeError) result.failures.push(`Runtime error: ${report.runtimeError.message || report.runtimeError.code}`);
      if (report.lighthouseVersion !== expectedVersion) result.failures.push(`Expected Lighthouse ${expectedVersion}, received ${report.lighthouseVersion}`);
      if (report.configSettings?.formFactor !== 'mobile' || report.configSettings?.throttlingMethod !== 'simulate') {
        result.failures.push('Expected mobile form factor and simulated throttling');
      }
      if ((report.finalDisplayedUrl || report.finalUrl) !== url) result.failures.push('Audit did not remain on the expected local page');
      for (const [category, minimum] of Object.entries(thresholds)) {
        const score = report.categories?.[category]?.score;
        result.scores[category] = score ?? null;
        if (!Number.isFinite(score) || score < minimum || score > 1) {
          result.failures.push(`${category}: ${score ?? 'missing'}; requires at least ${minimum}`);
        }
      }
    } catch (error) {
      result.failures.push(`Unreadable Lighthouse report: ${error.message}`);
    }
  }
  results.push(result);
  console.log(JSON.stringify(result));
}

writeFileSync(resolve(output, 'summary.json'), JSON.stringify({ origin, version: expectedVersion, thresholds, results }, null, 2) + '\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  const columns = Object.keys(thresholds);
  const rows = results.map(result => `| ${result.name} | ${columns.map(key => Number.isFinite(result.scores[key]) ? Math.round(result.scores[key] * 100) : 'missing').join(' | ')} | ${result.failures.length ? 'FAIL' : 'PASS'} |`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    '## Local mobile Lighthouse', '',
    'Required scores: performance 90, accessibility 95, best practices 95, SEO 100.', '',
    '| Page | Performance | Accessibility | Best practices | SEO | Result |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...rows, '',
    'These are local lab reports for committed pages, not production or field measurements.', '',
  ].join('\n'));
}
if (results.some(result => result.failures.length)) process.exitCode = 1;
