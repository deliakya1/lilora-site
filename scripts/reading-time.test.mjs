import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { languages } from "./locale-registry.mjs";
import { readingMinutes } from "./reading-time.mjs";

const content = (answerHtml, sections = []) => ({ answerHtml, sections });

test("long Japanese and Traditional Chinese guides do not collapse to one minute", () => {
  const articles = JSON.parse(readFileSync(new URL("../editorial/articles.json", import.meta.url), "utf8"));
  for (const slug of ["houseplant-pests", "root-rot"]) {
    const article = articles.find((item) => item.slug === slug);
    for (const language of ["ja", "zh-Hant"]) {
      assert.ok(readingMinutes(article[language], language) > 1, `${slug}/${language}`);
    }
  }
});

test("other locales retain the established whitespace count and rounding boundaries", () => {
  for (const language of languages.filter((code) => !["ja", "zh-Hant"].includes(code))) {
    for (const [words, minutes] of [[0, 1], [219, 1], [329, 1], [330, 2], [549, 2], [550, 3]]) {
      const article = content("<p>" + Array(words).fill("word").join(" ") + "</p>");
      assert.equal(readingMinutes(article, language), minutes, `${language}/${words} words`);
    }
  }
});

test("reading estimates ignore tag attributes and link destinations", () => {
  for (const [language, sentence] of [["ja", "植物の根と土を確認します。"], ["zh-Hant", "檢查植物的根部與土壤。"]]) {
    const prose = sentence.repeat(200);
    const plain = content("<p>" + prose + "</p>");
    const linked = content('<p><a href="https://example.invalid/' + "long-path/".repeat(200) + '" title="' + "attribute ".repeat(200) + '">' + prose + "</a></p>");
    assert.equal(readingMinutes(linked, language), readingMinutes(plain, language), language);
  }
});

test("all locales retain a one-minute minimum for empty or short content", () => {
  for (const language of languages) {
    assert.equal(readingMinutes(content("<p></p>", [{ html: "<div> </div>" }]), language), 1, language);
    assert.equal(readingMinutes(content("<p>植物を確認。檢查植物。</p>"), language), 1, language);
  }
});
