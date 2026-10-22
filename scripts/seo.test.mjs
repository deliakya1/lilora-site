// Search and launch-readiness rules from prompt 07. Each check reads the built site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const languages = ["tr", "en", "es", "de", "pt", "fr"];
const prefix = (l) => (l === "tr" ? "/" : `/${l}/`);
const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", "assets", "content", "pages", "scripts", "editorial", "locales", ".test-results"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name === "index.html") pages.push(full.replace(/^\.\//, ""));
  }
};
walk(".");
const read = (f) => readFileSync(f, "utf8");
const unescape = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const pathOf = (file) => "/" + file.replace(/index\.html$/, "");
const sitemaps = Object.fromEntries(languages.map((l) => [l, read(`sitemap-${l}.xml`)]));

test("titles are unique and at most 60 characters; descriptions are unique and 120-155 characters", () => {
  const titles = new Set(), descriptions = new Set();
  for (const f of pages) {
    const s = read(f);
    const title = unescape(s.match(/<title>(.*?)<\/title>/)[1]);
    const description = unescape(s.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.ok(title.length <= 60, `${f}: title ${title.length} > 60: ${title}`);
    assert.ok(description.length >= 120 && description.length <= 155, `${f}: description ${description.length}: ${description}`);
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
      assert.ok(loc.startsWith(prefix(l)), `${loc} in sitemap-${l}`);
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
    if (/\/(guides|journal|compare)\/[^/]+\/index\.html$/.test(f)) {
      const hub = self.replace(/[^/]+\/$/, "");
      assert.ok(s.includes(`href="${hub}"`), `${f}: no link to ${hub}`);
      const related = s.slice(s.indexOf('class="related"'));
      assert.ok((related.match(/<article class="story-card"/g) || []).length >= 3, `${f}: fewer than three related pages`);
    }
  }
  for (const f of pages) assert.ok(inbound.get(pathOf(f)), `${pathOf(f)} has no inbound link`);
});

test("one Atom feed per language for guides and journal, linked from every page", () => {
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
    const l = languages.find((x) => x !== "tr" && f.startsWith(x + "/")) || "tr";
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
      assert.match(value, /^[a-z]{2}(-[A-Z]{2})?$/, `${f}: lang="${value}"`);
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
