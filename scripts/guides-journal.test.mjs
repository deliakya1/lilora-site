import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { articlePath } from "./layout.mjs";

// Prompt 06: eight care guides and four journal posts in all six languages.
const languages = ["tr", "en", "es", "de", "pt", "fr"];
const pieces = {
  "overwatering-vs-underwatering": "guide",
  "root-rot": "guide",
  "houseplant-pests": "guide",
  "houseplant-humidity": "guide",
  "fertilizing-houseplants": "guide",
  "propagating-cuttings": "guide",
  "winter-houseplant-care": "guide",
  "potting-mix-and-drainage": "guide",
  "check-before-you-water": "post",
  "autumn-plant-reset": "post",
  "moving-house-with-plants": "post",
  "keeping-a-plant-care-journal": "post",
};
const institutional =
  /(extension|\.edu\/|\.edu$|rhs\.org\.uk|missouribotanicalgarden\.org|efsa\.europa\.eu|ucanr\.edu|uconn\.edu|unl\.edu)/;
const articles = JSON.parse(readFileSync("editorial/articles.json", "utf8"));
const source = (slug, lang) =>
  readFileSync(`content/articles/${slug}/${lang}.md`, "utf8");
const built = (article, lang) =>
  readFileSync("." + articlePath(article, lang) + "index.html", "utf8");
const words = (text) => text.split(/\s+/).filter(Boolean).length;

test("all twelve pieces exist in six languages with the right type", () => {
  for (const [slug, type] of Object.entries(pieces)) {
    const article = articles.find((a) => a.slug === slug);
    assert.ok(article, slug);
    assert.equal(article.type, type, slug);
    for (const lang of languages) {
      assert.ok(article[lang], `${slug}/${lang}`);
      assert.ok(article[lang].description.length <= 165, `${slug}/${lang} description length`);
      assert.ok(article[lang].sections.length >= 6, `${slug}/${lang} sections`);
      assert.ok(article[lang].answer.length > 100, `${slug}/${lang} short answer`);
      assert.ok(
        words(article[lang].sections.map((s) => s.html.replace(/<[^>]+>/g, " ")).join(" ")) >= 400,
        `${slug}/${lang} body length`,
      );
      assert.ok(
        article[lang].sections.some((s) => /<h3>/.test(s.html) && s.html.match(/<h3>/g).length >= 3),
        `${slug}/${lang} FAQ with at least three questions`,
      );
    }
  }
});

test("each piece cites at least three institutional sources inline in every language", () => {
  for (const slug of Object.keys(pieces)) {
    const article = articles.find((a) => a.slug === slug);
    const listed = article.sources.map((s) => s.url);
    assert.ok(listed.length >= 3, slug);
    for (const url of listed) assert.match(url, institutional, `${slug}: ${url}`);
    for (const lang of languages) {
      const cited = new Set(
        [...source(slug, lang).matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map((m) => m[1]),
      );
      assert.ok(cited.size >= 3, `${slug}/${lang} inline citations`);
      for (const url of cited) assert.ok(listed.includes(url), `${slug}/${lang}: unlisted source ${url}`);
    }
  }
});

test("internal links resolve, stay in language where possible, and reach at least three guides", () => {
  for (const slug of Object.keys(pieces)) {
    for (const lang of languages) {
      const links = [...source(slug, lang).matchAll(/\]\((\/[^\s)]*)\)/g)].map((m) => m[1]);
      const guides = new Set(links.filter((l) => /\/(guides|blog)\/[a-z-]+\/$/.test(l)));
      assert.ok(guides.size >= 3, `${slug}/${lang}: ${guides.size} internal article links`);
      for (const link of links) {
        assert.ok(existsSync("." + link.split("#")[0] + (link.endsWith("/") ? "index.html" : "")), `${slug}/${lang}: ${link}`);
        const prefix = lang === "tr" ? "/" : `/${lang}/`;
        if (!link.startsWith(prefix) && /\/(guides|blog)\//.test(link)) {
          // Cross-language links are only allowed as labelled English fallbacks.
          assert.ok(link.startsWith("/en/"), `${slug}/${lang}: ${link}`);
          const target = link.replace(/^\/en\//, prefix);
          assert.ok(!existsSync("." + target + "index.html"), `${slug}/${lang}: ${link} has a ${lang} version`);
        }
      }
    }
  }
});

test("no English body under another language", () => {
  const english = /\b(the|and|with|your|water|plant|leaves|before|should|when)\b/gi;
  for (const slug of Object.keys(pieces)) {
    for (const lang of languages.filter((l) => l !== "en")) {
      const text = source(slug, lang)
        .replace(/<span lang="en">[^<]*<\/span>/g, "")
        .replace(/<strong lang="en">[^<]*<\/strong>/g, "")
        .replace(/\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/<[^>]+>/g, " ");
      const hits = (text.match(english) || []).length;
      assert.ok(hits / words(text) < 0.01, `${slug}/${lang}: ${hits} English function words`);
      const page = built(articles.find((a) => a.slug === slug), lang);
      assert.match(page, new RegExp(`<html lang="${lang === "pt" ? "pt-BR" : lang}"`));
    }
  }
});

test("every article image has alt text, size, a visible credit and a CREDITS.md record", () => {
  const credits = readFileSync("assets/images/articles/CREDITS.md", "utf8");
  for (const slug of Object.keys(pieces)) {
    for (const lang of languages) {
      const md = source(slug, lang);
      for (const [figure] of md.matchAll(/<figure[^>]*><img[^>]+>[\s\S]*?<\/figure>/g)) {
        const img = figure.match(/<img[^>]+>/)[0];
        const src = img.match(/src="([^"]+)"/)[1];
        assert.match(img, /alt="[^"]{20,}"/, `${slug}/${lang} alt`);
        assert.match(img, /width="\d+" height="\d+"/, `${slug}/${lang} size`);
        assert.ok(existsSync("." + src), src);
        assert.ok(credits.includes(src), `${src} missing from CREDITS.md`);
        assert.ok(credits.includes(slug), `${slug} missing from CREDITS.md`);
        assert.match(figure, /<figcaption[^>]*>[^<]+<a href="\/(?:[a-z]{2}\/)?editorial\/#imagery">/, `${slug}/${lang} credit`);
      }
    }
  }
});

test("new pieces avoid banned brand words and filler conclusions", () => {
  const banned = /\b(unlock|seamless|effortless|elevate|empower|supercharge|revolutioni[sz]e|journey|magic|game-changer|let's dive in|in today's busy world|ai-powered|in conclusion)\b/i;
  for (const slug of Object.keys(pieces)) assert.doesNotMatch(source(slug, "en"), banned, slug);
});

test("hubs and sitemap include every new page", () => {
  const sitemap = ["tr", "en", "es", "de", "pt", "fr"].map((l) => readFileSync(`sitemap-${l}.xml`, "utf8")).join("\n");
  for (const slug of Object.keys(pieces)) {
    const article = articles.find((a) => a.slug === slug);
    for (const lang of languages) {
      const path = articlePath(article, lang);
      assert.ok(sitemap.includes(`<loc>https://lilora.app${path}</loc>`), path);
      const hub = (lang === "tr" ? "" : lang + "/") + (article.type === "post" ? "blog" : "guides") + "/index.html";
      assert.ok(readFileSync(hub, "utf8").includes(`href="${path}"`), `${hub}: ${path}`);
    }
  }
});
