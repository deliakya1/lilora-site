import { readFileSync } from 'node:fs';

// Localized copy for the existing tools and downloadable promotional material.
// Additional locales remain independent so translation work does not share files.
export const expandedLanguages = ['ja', 'ko', 'it', 'zh-Hant'];
const extras = Object.fromEntries(expandedLanguages.map((language) => [language,
  JSON.parse(readFileSync(new URL(`../locales/${language}.extras.json`, import.meta.url), 'utf8')),
]));
export const extraCopies = (key) => Object.fromEntries(expandedLanguages.map((language) => {
  if (!extras[language][key]) throw new Error(`${language}: missing ${key} translation`);
  return [language, extras[language][key]];
}));
