// Search and launch-readiness rules from prompt 07. Each check reads the built site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { languages, prefix, htmlLang, languageOptions, descriptionRange, isCJK, languageOfPath, ogLocale } from './locale-registry.mjs';

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    // Source and generated-data folders exist only at the root; /{lang}/editorial/ pages are real routes.
    if (dir === "." && [".git", "node_modules", "assets", "content", "pages", "scripts", "locales", ".test-results"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    // Redirect pages for moved URLs (content/redirects.json) are not indexable routes.
    else if (name === "index.html" && !readFileSync(full, "utf8").includes('http-equiv="refresh"')) pages.push(full.replace(/^\.\//, ""));
  }
};
walk(".");
const read = (f) => readFileSync(f, "utf8");
const unescape = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const pathOf = (file) => "/" + file.replace(/index\.html$/, "");
const sitemaps = Object.fromEntries(languages.map((l) => [l, read(`sitemap-${l}.xml`)]));

test("titles are unique and at most 60 characters; descriptions are unique and fit their writing system", () => {
  const titles = new Set(), descriptions = new Set();
  for (const f of pages) {
    const s = read(f);
    const title = unescape(s.match(/<title>(.*?)<\/title>/)[1]);
    const description = unescape(s.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.ok(title.length <= 60, `${f}: title ${title.length} > 60: ${title}`);
    const language = languageOptions.find(option => option.tag === s.match(/<html lang="([^"]+)"/)[1]).code;
    const [minimum, maximum] = descriptionRange(language);
    assert.ok(description.length >= minimum && description.length <= maximum, `${f}: description ${description.length}: ${description}`);
    assert.ok(!titles.has(title), `${f}: duplicate title`);
    assert.ok(!descriptions.has(description), `${f}: duplicate description`);
    titles.add(title);
    descriptions.add(description);
  }
});

test("one H1 and no skipped heading levels inside main", () => {
  for (const f of pages) {
    const s = read(f);
    const main = s.slice(s.indexOf("<main"), s.indexOf("</main>"));
    const levels = [...main.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    assert.equal(levels.filter((x) => x === 1).length, 1, f);
    assert.equal(levels[0], 1, `${f}: first heading is not the H1`);
    levels.reduce((prev, level) => {
      assert.ok(level <= prev + 1, `${f}: h${prev} followed by h${level}`);
      return level;
    }, 0);
  }
});

test("sitemap index lists one sitemap per language with real lastmod dates and image entries", () => {
  const index = read("sitemap.xml");
  assert.match(index, /<sitemapindex /);
  for (const l of languages) assert.ok(index.includes(`<loc>https://lilora.app/sitemap-${l}.xml</loc>`), l);
  assert.match(read("robots.txt"), /^Sitemap: https:\/\/lilora\.app\/sitemap\.xml$/m);
  const listed = [];
  for (const l of languages) {
    const xml = sitemaps[l];
    for (const [, loc] of xml.matchAll(/<loc>https:\/\/lilora\.app(.*?)<\/loc>/g)) {
      assert.equal(languageOfPath(loc), l, `${loc} in sitemap-${l}`);
      listed.push(loc);
    }
    for (const [, date] of xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal((xml.match(/<lastmod>/g) || []).length, (xml.match(/<url>/g) || []).length, `every URL in sitemap-${l} has a lastmod`);
  }
  assert.ok(sitemaps.en.includes("<image:image><image:loc>https://lilora.app/assets/images/plants/"), "plant images listed");
  assert.deepEqual([...listed].sort(), JSON.parse(read("editorial/routes.json")).sort());
});

test("canonical URLs are self-referencing, slash-terminated and free of index.html or query strings", () => {
  for (const f of pages) {
    const s = read(f);
    assert.equal(s.match(/rel="canonical" href="([^"]+)"/)[1], "https://lilora.app" + pathOf(f), f);
    assert.doesNotMatch(s, /href="\/[^"]*index\.html/, `${f}: internal link to index.html`);
    assert.doesNotMatch(s, /href="\/[^"#]*\?/, `${f}: internal link with a query string`);
  }
});

test("structured data stays within the allowed types and matches the page", () => {
  const allowed = new Set(["Organization", "WebSite", "Article", "BlogPosting", "BreadcrumbList"]);
  for (const f of pages) {
    const s = read(f);
    const blocks = [...s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
    assert.ok(blocks.length, `${f}: no structured data`);
    for (const b of blocks) {
      assert.ok(allowed.has(b["@type"]), `${f}: ${b["@type"]}`);
      assert.ok(!("potentialAction" in b), `${f}: SearchAction without site search`);
      if (b["@type"] === "BreadcrumbList") assert.equal(b.itemListElement.at(-1).item, "https://lilora.app" + pathOf(f), f);
      if (b["@type"] === "Article" || b["@type"] === "BlogPosting") {
        assert.equal(b.author["@type"], "Organization");
        assert.ok(b.publisher.logo.width >= 112);
        assert.ok(b.image.length >= 1);
      }
    }
  }
  for (const l of languages) {
    const types = [...read(`.${prefix(l)}index.html`).matchAll(/"@type":"(\w+)"/g)].map((m) => m[1]);
    assert.ok(types.includes("Organization") && types.includes("WebSite"), `home ${l}`);
  }
  const logo = readFileSync("assets/icon.png");
  assert.ok(logo.readUInt32BE(16) >= 112 && logo.readUInt32BE(20) >= 112, "organisation logo is at least 112 px");
});

test("every guide links to at least three related pages and its hub; no page is an orphan", () => {
  const inbound = new Map();
  for (const f of pages) {
    const s = read(f), self = pathOf(f);
    for (const [, href] of s.matchAll(/href="(\/[^"#?]*)"/g)) if (href !== self) inbound.set(href, (inbound.get(href) || 0) + 1);
    if (/\/(guides|blog|compare)\/[^/]+\/index\.html$/.test(f)) {
      const hub = self.replace(/[^/]+\/$/, "");
      assert.ok(s.includes(`href="${hub}"`), `${f}: no link to ${hub}`);
      const related = s.slice(s.indexOf('class="related"'));
      assert.ok((related.match(/<article class="(?:story|post)-card/g) || []).length >= 3, `${f}: fewer than three related pages`);
    }
  }
  for (const f of pages) assert.ok(inbound.get(pathOf(f)), `${pathOf(f)} has no inbound link`);
});

test("one Atom feed per language for guides and blog posts, linked from every page", () => {
  const articles = JSON.parse(read("editorial/articles.json"));
  for (const l of languages) {
    const feed = read(`.${prefix(l)}feed.xml`);
    assert.match(feed, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/);
    const expected = articles.filter((a) => a[l] && a.type !== "comparison").length;
    assert.equal((feed.match(/<entry>/g) || []).length, expected, `feed ${l}`);
    for (const [, href] of feed.matchAll(/<link rel="alternate" type="text\/html" href="https:\/\/lilora\.app([^"]+)"/g))
      assert.ok(existsSync(`.${href}index.html`), href);
  }
  for (const f of pages) {
    const l = languageOptions.find(option => option.tag === read(f).match(/<html lang="([^"]+)"/)[1]).code;
    assert.ok(read(f).includes(`type="application/atom+xml" title="`) && read(f).includes(`href="https://lilora.app${prefix(l)}feed.xml"`), f);
  }
});

test("security.txt names the support contact and a future expiry", () => {
  const txt = read(".well-known/security.txt");
  assert.match(txt, /^Contact: mailto:support@lilora\.app$/m);
  const expires = new Date(txt.match(/^Expires: (.+)$/m)[1]);
  assert.ok(expires > new Date() && expires - new Date() < 366 * 864e5, "expires within a year");
  assert.ok(existsSync(".nojekyll"), ".well-known is served only without Jekyll");
});

test("lang attributes are valid language tags", () => {
  for (const f of pages)
    for (const [, value] of read(f).matchAll(/\slang="([^"]*)"/g))
      assert.match(value, /^[a-z]{2}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2})?$/, `${f}: lang="${value}"`);
});

test("images over 250 KB are only fallbacks behind a WebP source or press downloads", () => {
  for (const f of pages) {
    const s = read(f);
    for (const m of s.matchAll(/<img\b[^>]*\bsrc="(\/[^"]+)"[^>]*>/g)) {
      const file = "." + m[1];
      if (!existsSync(file) || statSync(file).size <= 250 * 1024) continue;
      const before = s.slice(Math.max(0, m.index - 400), m.index);
      assert.match(before, /<picture><source type="image\/webp"[^<]*$/, `${f}: ${m[1]} is ${statSync(file).size} bytes without a WebP source`);
    }
  }
});

test("search engine ownership files stay byte-exact", () => {
  for (const name of readdirSync(".").filter((n) => /^google[0-9a-f]+\.html$/.test(n)))
    assert.equal(read(name), `google-site-verification: ${name}`, name);
});

test("Bing ownership file names one user token", () => {
  assert.match(read("BingSiteAuth.xml"), /<users>\s*<user>[0-9A-F]{32}<\/user>\s*<\/users>/);
});

test("home pages carry the Bing ownership meta tag", () => {
  for (const page of ["index.html", "tr/index.html"])
    assert.match(read(page), /<meta name="msvalidate\.01" content="1EC0BF8EFE417B237473AF8FD803D81B">/, page);
});

test("Yandex ownership file names its own code", () => {
  assert.match(read("yandex_3a062d6cf4f7c29f.html"), /<body>Verification: 3a062d6cf4f7c29f<\/body>/);
});

test("IndexNow key file holds exactly its own name", () => {
  const files = readdirSync(".").filter((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  assert.equal(files.length, 1);
  assert.equal(read(files[0]), files[0].replace(/\.txt$/, ""));
});

// Minimal Google/Bing robots.txt matching: longest matching rule wins, Allow wins ties.
const robotsRules = (txt) => {
  const groups = [];
  for (const line of txt.split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)) {
    const [, key, value] = line.match(/^([^:]+):\s*(.*)$/);
    const k = key.toLowerCase();
    if (k === "user-agent") {
      if (!groups.length || groups.at(-1).rules.length) groups.push({ agents: [], rules: [] });
      groups.at(-1).agents.push(value.toLowerCase());
    } else if (k === "allow" || k === "disallow") groups.at(-1).rules.push({ allow: k === "allow", value });
  }
  return groups;
};
const robotsAllows = (rules, path) => {
  let best = { allow: true, length: -1 };
  for (const r of rules) {
    if (!r.value) continue;
    const pattern = new RegExp("^" + r.value.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$|\$$/, "$"));
    if (pattern.test(path) && (r.value.length > best.length || (r.value.length === best.length && r.allow)))
      best = { allow: r.allow, length: r.value.length };
  }
  return best.allow;
};

test("robots.txt keeps one all-crawler group that allows public pages, assets and ownership files", () => {
  const groups = robotsRules(read("robots.txt"));
  // The owner-approved AI training policy is "allow": no crawler gets its own group.
  assert.deepEqual(groups.map((g) => g.agents), [["*"]]);
  const rules = groups[0].rules;
  const paths = new Set();
  for (const l of languages)
    for (const [, url] of sitemaps[l].matchAll(/<(?:loc|image:loc)>https:\/\/lilora\.app([^<]*)<\//g)) paths.add(url);
  for (const f of pages)
    for (const [, url] of read(f).matchAll(/(?:href|src|srcset)="(\/[^"#? ,]*)/g)) paths.add(url);
  for (const name of readdirSync(".").filter((n) => /^(google[0-9a-f]+\.html|yandex_[0-9a-f]+\.html|pinterest-[0-9a-f]+\.html|[0-9a-f]{32}\.txt|BingSiteAuth\.xml|sitemap.*\.xml|feed\.xml|site\.webmanifest)$/.test(n)))
    paths.add("/" + name);
  for (const l of languages) paths.add(`${prefix(l)}feed.xml`);
  paths.add("/.well-known/security.txt");
  paths.add("/editorial/");
  assert.ok(paths.size > 300, `only ${paths.size} paths collected`);
  for (const p of paths) assert.ok(robotsAllows(rules, p), `robots.txt blocks ${p}`);
});

test("robots.txt excludes repository source files that GitHub Pages also serves", () => {
  const rules = robotsRules(read("robots.txt"))[0].rules;
  for (const p of ["/pages/compare/en.html", "/content/articles/check-before-you-water/en.md", "/scripts/build.mjs", "/locales/en.json", "/editorial/articles.json", "/README.md", "/package.json", "/package-lock.json"])
    assert.ok(!robotsAllows(rules, p), `robots.txt allows ${p}`);
});

test("only the 404 page carries a robots directive", () => {
  for (const f of [...pages, "404.html"]) {
    const s = read(f);
    const directives = [...s.matchAll(/<meta name="(?:robots|googlebot|bingbot)[^"]*" content="([^"]*)"/gi)].map((m) => m[1]);
    if (f === "404.html") assert.deepEqual(directives, ["noindex, follow"]);
    else assert.deepEqual(directives, [], f);
    assert.doesNotMatch(s, /data-nosnippet/, f);
  }
});

test("titles stay distinct after ignoring punctuation and the brand suffix, so no two pages target the same query", () => {
  const seen = new Map();
  for (const f of pages) {
    const title = unescape(read(f).match(/<title>(.*?)<\/title>/)[1]);
    const key = title.replace(/ — Lilora$/, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    assert.ok(!seen.has(key), `${f} and ${seen.get(key)} share the title "${title}"`);
    seen.set(key, f);
  }
});

test("each translation canonicalises to itself in its own language, never to another language", () => {
  for (const f of pages) {
    const s = read(f);
    const path = pathOf(f);
    const lang = languageOfPath(path);
    const canonical = s.match(/rel="canonical" href="([^"]+)"/)[1];
    assert.equal(s.match(/<html lang="([^"]+)"/)[1], htmlLang(lang), f);
    assert.equal(canonical, "https://lilora.app" + path, f);
    for (const [, hreflang, href] of s.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g))
      if (href === canonical && hreflang !== "x-default") assert.equal(hreflang, htmlLang(lang), `${f}: self hreflang`);
    assert.equal(s.match(/property="og:locale" content="([^"]+)"/)?.[1], ogLocale[lang], `${f}: og:locale`);
  }
});

test("Open Graph and Twitter metadata match the page: real URL, own description and an existing share card", () => {
  for (const f of pages) {
    const s = read(f);
    const meta = (key) => s.match(new RegExp(`(?:property|name)="${key}" content="([^"]*)"`))?.[1];
    assert.equal(meta("og:url"), s.match(/rel="canonical" href="([^"]+)"/)[1], `${f}: og:url`);
    assert.equal(meta("og:site_name"), "Lilora", f);
    assert.equal(meta("og:description"), meta("description"), `${f}: og:description`);
    assert.equal(meta("twitter:description"), meta("description"), `${f}: twitter:description`);
    assert.equal(meta("twitter:title"), meta("og:title"), `${f}: twitter:title`);
    assert.ok(meta("og:title"), `${f}: og:title`);
    for (const key of ["og:image", "twitter:image"]) {
      const url = new URL(meta(key));
      assert.equal(url.origin, "https://lilora.app", `${f}: ${key} host`);
      assert.ok(existsSync("." + url.pathname), `${f}: ${key} ${url.pathname} is missing`);
    }
  }
});
