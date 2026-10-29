import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import { languages, prefix, htmlLang, languageOptions, descriptionRange, isCJK } from './locale-registry.mjs';
const preferenceKey = 'lilora.language.v1';
const origin = 'https://lilora.app';

// The override permits reproducing the regression against an archived script.
const source = readFileSync(process.env.LILORA_LANGUAGE_SCRIPT_UNDER_TEST ||
  new URL('../assets/language.js', import.meta.url), 'utf8');

function storage(mode = 'ok', initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      if (mode === 'throw' || mode === 'read-throw') throw new Error('Storage unavailable');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (mode === 'throw' || mode === 'write-throw') throw new Error('Storage unavailable');
      if (mode !== 'ignore') values.set(key, String(value));
    },
  };
}

// This models the DOM surface used by the real script, not its decision logic.
// It records native-link destinations; browser navigation is covered separately
// by language-check.cjs. Fixtures come from the actual generated page HTML.
function page({ language = 'en', route = 'support/', search = '', hash = '',
  browser = ['en-US'], local = 'ok', session = 'ok', initial = {},
  historyBlocked = false, missingTranslation } = {}) {
  const path = prefix(language) + route;
  const html = readFileSync(new URL(`..${path}index.html`, import.meta.url), 'utf8');
  const config = JSON.parse(html.match(/<script[^>]*id="site-locale"[^>]*>([\s\S]*?)<\/script>/)[1]);
  if (missingTranslation) delete config.alternates[missingTranslation];
  let current = new URL(path + search + hash, origin);
  const initialURL = current.href, navigation = [], bars = [], timers = new Map();
  let timerID = 0;
  const localStorage = storage(local, initial), sessionStorage = storage(session, initial);
  const schedule = (callback) => { timers.set(++timerID, callback); return timerID; };
  class Element {
    constructor(tagName) { this.tagName = tagName.toUpperCase(); this.attributes = {}; this.children = []; this.listeners = new Map(); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    hasAttribute(name) { return name in this.attributes; }
    get href() { return new URL(this.attributes.href || '', current).href; }
    set href(value) { this.setAttribute('href', value); }
    get hreflang() { return this.getAttribute('hreflang') || ''; }
    set hreflang(value) { this.setAttribute('hreflang', value); }
    get target() { return this.getAttribute('target') || ''; }
    set target(value) { this.setAttribute('target', value); }
    addEventListener(type, callback) { const entries = this.listeners.get(type) || []; entries.push(callback); this.listeners.set(type, entries); }
    append(...children) { this.children.push(...children); }
    after(element) { bars.push(element); }
    remove() { this.removed = true; }
  }
  const links = [...html.matchAll(/<a\b[^>]*class="language"[^>]*>/g)].map(([tag]) => {
    const link = new Element('a');
    for (const [, name, value] of tag.matchAll(/([\w-]+)="([^"]*)"/g)) link.setAttribute(name, value.replaceAll('&amp;', '&'));
    if (languageOptions.find(option => option.tag === link.hreflang)?.code === missingTranslation) link.href = prefix(missingTranslation);
    return link;
  });
  assert.ok(links.length >= languages.length, 'Generated fixture contains native language links');
  const header = new Element('header');
  const location = {
    get href() { return current.href; },
    set href(value) { navigation.push(String(value)); current = new URL(value, current); },
    get origin() { return current.origin; }, get pathname() { return current.pathname; },
    get search() { return current.search; }, get hash() { return current.hash; },
    assign(value) { navigation.push(String(value)); }, replace(value) { navigation.push(String(value)); },
  };
  const history = {
    state: null,
    replaceState(state, unused, target) {
      if (historyBlocked) throw new Error('History unavailable');
      current = new URL(target, current);
    },
  };
  const document = {
    getElementById: (id) => id === 'site-locale' ? { textContent: JSON.stringify(config) } : null,
    querySelectorAll: (selector) => selector === 'a.language[hreflang]' ? links : [],
    querySelector: (selector) => selector === '.header' ? header : null,
    createElement: (tagName) => new Element(tagName),
  };
  const window = { localStorage, sessionStorage, location, history, setTimeout: schedule,
    clearTimeout: (id) => timers.delete(id) };
  runInNewContext(source, { window, document, location, history, localStorage, sessionStorage,
    navigator: { languages: browser, language: browser[0] || '' }, URL,
    setTimeout: schedule, clearTimeout: window.clearTimeout }, { filename: 'assets/language.js' });
  return {
    links, navigation, initialURL, localStorage, sessionStorage, config,
    get url() { return new URL(current); },
    get suggestion() { return bars.find((bar) => !bar.removed)?.children.find((child) => child.tagName === 'A'); },
    link(language) { return links.find((link) => languageOptions.find(option => option.tag === link.hreflang)?.code === language); },
    activate(link, options = {}) {
      const event = { type: 'click', button: 0, detail: 1, ctrlKey: false, metaKey: false,
        shiftKey: false, altKey: false, defaultPrevented: false, ...options,
        target: link, currentTarget: link,
        preventDefault() { this.defaultPrevented = true; } };
      for (const callback of link.listeners.get(event.type) || []) callback.call(link, event);
      return { destination: new URL(link.href), defaultPrevented: event.defaultPrevented };
    },
    flushTimers() { for (const [id, callback] of timers) { timers.delete(id); callback(); } },
  };
}

function cleanLinks(fixture) {
  for (const link of [...fixture.links, ...(fixture.suggestion ? [fixture.suggestion] : [])]) {
    assert.equal(new URL(link.href).searchParams.has('lilora_lang'), false,
      `Rendered link must not advertise a language-query duplicate: ${link.href}`);
  }
}

for (const language of languages) test(`${language}: rendered language links stay clean and the URL remains authoritative`, () => {
  const fixture = page({ language, search: '?campaign=care', hash: '#main', browser: ['de-DE'] });
  cleanLinks(fixture);
  assert.equal(fixture.url.href, fixture.initialURL);
  assert.deepEqual(fixture.navigation, []);
  for (const target of languages) {
    const destination = new URL(fixture.link(target).href);
    assert.equal(destination.pathname, prefix(target) + 'support/');
    assert.equal(destination.search, '?campaign=care');
    assert.equal(destination.hash, '#main');
  }
});

test('a suggested translation exposes a clean counterpart URL and records a deliberate choice', () => {
  const fixture = page({ route: 'guides/watering-houseplants/', browser: ['de-DE'], search: '?campaign=care', hash: '#main' });
  assert.ok(fixture.suggestion);
  const result = fixture.activate(fixture.suggestion);
  assert.equal(result.destination.href, `${origin}/de/guides/watering-houseplants/?campaign=care#main`);
  assert.equal(fixture.localStorage.values.get(preferenceKey), 'de');
  assert.equal(fixture.sessionStorage.values.get(preferenceKey), 'de');
  assert.equal(result.defaultPrevented, false);
  cleanLinks(fixture);
});

for (const detail of [1, 0]) test(`${detail ? 'pointer' : 'keyboard-equivalent'} activation preserves native navigation when preference storage works`, () => {
  const fixture = page({ search: '?campaign=care', hash: '#main' });
  const result = fixture.activate(fixture.link('fr'), { detail });
  assert.equal(result.destination.href, `${origin}/fr/support/?campaign=care#main`);
  assert.equal(result.defaultPrevented, false);
  assert.equal(fixture.localStorage.values.get(preferenceKey), 'fr');
  assert.equal(fixture.sessionStorage.values.get(preferenceKey), 'fr');
  assert.deepEqual(fixture.navigation, []);
  fixture.flushTimers();
  cleanLinks(fixture);
});

for (const mode of ['throw', 'write-throw', 'ignore', 'read-throw']) test(`${mode} storage: fallback appears only during deliberate activation and is then removed`, () => {
  const fixture = page({ local: mode, session: mode, initial: { [preferenceKey]: 'fr' },
    search: '?campaign=care', hash: '#main' });
  cleanLinks(fixture);
  const result = fixture.activate(fixture.link('de'));
  assert.equal(result.destination.pathname, '/de/support/');
  assert.equal(result.destination.searchParams.get('campaign'), 'care');
  assert.equal(result.destination.searchParams.get('lilora_lang'), 'de');
  assert.equal(result.destination.hash, '#main');
  assert.equal(result.defaultPrevented, false);
  assert.deepEqual(fixture.navigation, []);
  fixture.flushTimers();
  cleanLinks(fixture);
});

test('session-only persistence is enough for ordinary navigation in the same tab', () => {
  const fixture = page({ local: 'write-throw' });
  const result = fixture.activate(fixture.link('de'));
  assert.equal(result.destination.searchParams.has('lilora_lang'), false);
  assert.equal(fixture.sessionStorage.values.get(preferenceKey), 'de');
});

const newContexts = [
  ['control click', { ctrlKey: true }], ['command click', { metaKey: true }],
  ['shift click', { shiftKey: true }], ['middle click', { type: 'auxclick', button: 1 }],
  ['blank target', {}],
];
for (const [name, options] of newContexts) test(`${name}: another context retains the choice even when only session storage works`, () => {
  const fixture = page({ local: 'write-throw', search: '?campaign=care', hash: '#main' });
  const link = fixture.link('de');
  if (name === 'blank target') link.target = '_blank';
  cleanLinks(fixture);
  const result = fixture.activate(link, options);
  assert.equal(result.destination.searchParams.get('lilora_lang'), 'de');
  assert.equal(result.destination.searchParams.get('campaign'), 'care');
  assert.equal(result.destination.hash, '#main');
  assert.equal(result.defaultPrevented, false);
  fixture.flushTimers();
  cleanLinks(fixture);
});

test('durable local storage keeps modified and middle-click destinations clean', () => {
  for (const [name, options] of newContexts) {
    const fixture = page({ session: 'write-throw' });
    const link = fixture.link('de');
    if (name === 'blank target') link.target = '_blank';
    const result = fixture.activate(link, options);
    assert.equal(result.destination.searchParams.has('lilora_lang'), false, name);
    assert.equal(fixture.localStorage.values.get(preferenceKey), 'de', name);
    assert.equal(result.defaultPrevented, false, name);
  }
});

test('opening a context menu does not select a language or mutate its URL', () => {
  const fixture = page({ local: 'write-throw', session: 'write-throw' });
  const link = fixture.link('de'), before = link.href;
  const result = fixture.activate(link, { type: 'auxclick', button: 2 });
  assert.equal(result.destination.href, before);
  assert.equal(fixture.localStorage.values.has(preferenceKey), false);
  assert.equal(fixture.sessionStorage.values.has(preferenceKey), false);
  cleanLinks(fixture);
});

test('a canceled activation restores its clean link and does not prevent a later stored choice', () => {
  const fixture = page({ local: 'write-throw', session: 'write-throw' });
  const link = fixture.link('de');
  link.addEventListener('click', (event) => event.preventDefault());
  const canceled = fixture.activate(link);
  assert.equal(canceled.defaultPrevented, true);
  assert.equal(canceled.destination.searchParams.get('lilora_lang'), 'de');
  // Storage can recover before the cleanup timer executes.
  fixture.localStorage.setItem = (key, value) => fixture.localStorage.values.set(key, value);
  const recovered = fixture.activate(link);
  assert.equal(recovered.destination.searchParams.has('lilora_lang'), false);
  fixture.flushTimers();
  cleanLinks(fixture);
});

test('repeated legacy marker parameters are all removed from the current URL and outgoing links', () => {
  const fixture = page({ search: '?lilora_lang=en&campaign=care&lilora_lang=fr', hash: '#main' });
  assert.equal(fixture.url.href, `${origin}/support/?campaign=care#main`);
  assert.equal(fixture.localStorage.values.get(preferenceKey), 'en');
  cleanLinks(fixture);
});

test('a legacy matching marker is consumed without leaking into links or showing a contrary suggestion', () => {
  const fixture = page({ search: '?lilora_lang=en&campaign=care', hash: '#main',
    browser: ['de-DE'], local: 'throw', session: 'throw' });
  assert.equal(fixture.url.href, `${origin}/support/?campaign=care#main`);
  assert.equal(fixture.suggestion, undefined);
  assert.deepEqual(fixture.navigation, []);
  cleanLinks(fixture);
});

for (const marker of ['fr', 'invalid']) test(`a ${marker === 'fr' ? 'mismatched' : 'malformed'} legacy marker is cleaned without being remembered`, () => {
  const fixture = page({ search: `?lilora_lang=${marker}&campaign=care`, hash: '#main', browser: ['de-DE'] });
  assert.equal(fixture.url.href, `${origin}/support/?campaign=care#main`);
  assert.equal(fixture.localStorage.values.has(preferenceKey), false);
  assert.equal(fixture.sessionStorage.values.has(preferenceKey), false);
  assert.ok(fixture.suggestion, 'Invalid incoming choice must not suppress a relevant language suggestion');
  cleanLinks(fixture);
});

test('blocked history cleanup does not stop language controls or propagate a legacy marker', () => {
  const fixture = page({ search: '?lilora_lang=en&campaign=care', hash: '#main',
    browser: ['de-DE'], historyBlocked: true });
  assert.equal(fixture.url.searchParams.get('lilora_lang'), 'en');
  assert.equal(fixture.suggestion, undefined);
  cleanLinks(fixture);
  const result = fixture.activate(fixture.link('fr'));
  assert.equal(result.destination.href, `${origin}/fr/support/?campaign=care#main`);
  assert.equal(result.defaultPrevented, false);
  assert.deepEqual(fixture.navigation, []);
});

test('a missing translation links to its language home without carrying an unrelated article fragment', () => {
  const fixture = page({ route: 'guides/watering-houseplants/', missingTranslation: 'de',
    browser: ['de-DE'], search: '?campaign=care', hash: '#care-section' });
  for (const link of [fixture.link('de'), fixture.suggestion]) {
    assert.ok(link);
    assert.equal(link.href, `${origin}/de/?campaign=care`);
  }
  assert.equal(fixture.suggestion.textContent, fixture.config.suggestions.de.suggestionHome);
  cleanLinks(fixture);
});
