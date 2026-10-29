'use strict';

// Browser checks use the same route and language definitions as the ESM build.
const fs = require('node:fs');
const path = require('node:path');
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/languages.json'), 'utf8'));
const defaultLanguage = registry.defaultLanguage;
const options = registry.languages;
const languages = options.map(({ code }) => code);
const definitions = Object.fromEntries(options.map(option => [option.code, option]));
const prefix = language => definitions[language].path;
const htmlLang = language => definitions[language].tag;
const languageOfPath = pathname => options.find(option => option.path !== '/' && pathname.startsWith(option.path))?.code || defaultLanguage;
const isCJK = language => ['ja', 'ko', 'zh-Hant'].includes(language);
const descRange = language => isCJK(language) ? [30, 110] : [120, 155];

module.exports = {
  defaultLanguage,
  options,
  languageOptions: options,
  languages,
  prefix,
  htmlLang,
  languageOfPath,
  isCJK,
  descRange,
  descriptionRange: descRange,
};
