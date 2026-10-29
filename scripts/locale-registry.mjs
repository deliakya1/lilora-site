import { readFileSync } from 'node:fs';

// One registry for source imports, generated URLs, metadata, clients and checks.
const registry = JSON.parse(readFileSync(new URL('../config/languages.json', import.meta.url), 'utf8'));
export const defaultLanguage = registry.defaultLanguage;
export const languageOptions = registry.languages;
export const languages = languageOptions.map(({ code }) => code);
const definitions = Object.fromEntries(languageOptions.map((item) => [item.code, item]));
export const names = Object.fromEntries(languageOptions.map(({ code, name }) => [code, name]));
export const ogLocale = Object.fromEntries(languageOptions.map(({ code, ogLocale }) => [code, ogLocale]));
export const htmlLang = (language) => definitions[language].tag;
export const prefix = (language) => definitions[language].path;
export const languageOfPath = (path) => languageOptions.find((item) => item.path !== '/' && path.startsWith(item.path))?.code || defaultLanguage;
export const isCJK = (language) => ['ja', 'ko', 'zh-Hant'].includes(language);
export const descriptionRange = (language) => isCJK(language) ? [30, 110] : [120, 155];
