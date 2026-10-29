import { htmlLang } from "./locale-registry.mjs";

const segmenters = new Map();

// An editorial estimate, using word boundaries for prose without spaces.
// Other locales retain the existing whitespace count and rounding.
export const readingMinutes = (content, language) => {
  const text = [content.answerHtml, ...content.sections.map((section) => section.html)]
    .join(" ")
    .replace(/<[^>]+>/g, " ");
  let units;
  if (language === "ja" || language === "zh-Hant") {
    if (!segmenters.has(language)) {
      segmenters.set(language, new Intl.Segmenter(htmlLang(language), { granularity: "word" }));
    }
    units = [...segmenters.get(language).segment(text)].filter((segment) => segment.isWordLike).length;
  } else {
    units = text.split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(units / 220));
};
