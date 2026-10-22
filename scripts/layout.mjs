import { readFileSync } from "node:fs";
import { shareImagePath } from "./promotion-shared.mjs";
export const languages = ["tr", "en", "es", "de", "pt", "fr"];
export const names = {
  tr: "Türkçe",
  en: "English",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  fr: "Français",
};
export const htmlLang = (l) => (l === "pt" ? "pt-BR" : l);
export const prefix = (l) => (l === "tr" ? "/" : `/${l}/`);
export const locales = Object.fromEntries(
  languages.map((l) => [
    l,
    JSON.parse(readFileSync(`locales/${l}.json`, "utf8")),
  ]),
);
export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
export const formatDate = (date, lang) =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : htmlLang(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
export const articlePath = (a, l) =>
  `${prefix(l)}${a.type === "comparison" ? "compare" : a.type === "post" ? "journal" : "guides"}/${a.slug}/`;
export const plantPath = (a, l) => `${prefix(l)}plants/${a.slug}/`;
export const origin = "https://lilora.app";
// The publishing organisation, shared by the home page and article metadata.
export const organization = {
  "@type": "Organization",
  "@id": `${origin}/#organization`,
  name: "Lilora",
  url: `${origin}/`,
  logo: { "@type": "ImageObject", url: `${origin}/assets/icon.png`, width: 1024, height: 1024 },
  email: "support@lilora.app",
};
// Browser titles stay within 60 characters: the brand suffix is added only when it fits.
const documentTitle = (title) =>
  `${title} — Lilora`.length <= 60 ? `${title} — Lilora` : title;

export function page({
  lang,
  path,
  title,
  seoTitle,
  description,
  body,
  alternates = {},
  schema = [],
  plantCount = 0,
  noindex = false,
}) {
  const t = locales[lang],
    home = prefix(lang),
    // Flags are CSS-drawn SVGs (foundation.css), decorative next to each native language name.
    flag = (l) => `<span class="flag flag-${l}" aria-hidden="true"></span>`,
    link = (route, label, attrs = "") =>
      `<a href="${home}${route}" ${attrs}>${escape(label)}</a>`;
  const languageLinks = languages
    .map(
      (l) =>
        `<a class="language" href="${alternates[l] || prefix(l)}" lang="${htmlLang(l)}" hreflang="${l}"${l === lang ? ' aria-current="page"' : ""}>${flag(l)}<span>${names[l]}</span></a>`,
    )
    .join("");
  // The current section is marked so the header and mobile menu can show where you are.
  const section = (route, label) =>
    link(route, label, path.startsWith(home + route) ? 'aria-current="true"' : "");
  const nav =
    link("", t.home, path === home ? 'aria-current="page"' : "") +
    section("guides/", t.guides) +
    (plantCount >= 3 ? section("plants/", t.plants) : "") +
    section("journal/", t.journal) +
    link("#features", t.app) +
    section("support/", t.support);
  const button = link(
    "download/",
    t.getApp,
    'class="button" data-analytics-cta="app-info"',
  );
  const languageNote = !["tr", "en"].includes(lang)
    ? `<small class="app-language-note">${escape(t.appLanguages)}</small>`
    : "";
  const appCta = `<div class="app-cta">${button}${languageNote}</div>`;
  const shareImage = origin + shareImagePath(path, lang);
  const promotionStyles = [
    home,
    `${home}download/`,
    `${home}press/`,
    "/404.html",
  ].includes(path)
    ? '<link rel="stylesheet" href="/assets/home-promotion.css">'
    : "";
  const picker = `<details class="language-picker"><summary>${flag(lang)}<span>${names[lang]}</span></summary><nav aria-label="${t.languages}">${languageLinks}</nav></details>`;
  const headAlternates =
    Object.entries(alternates)
      .map(
        ([l, p]) =>
          `<link rel="alternate" hreflang="${l}" href="${origin}${p}">`,
      )
      .join("") +
    (alternates.en
      ? `<link rel="alternate" hreflang="x-default" href="${origin}${alternates.en}">`
      : "");
  const footer = `<footer class="footer wrap"><div class="footer-column"><a class="footer-brand" href="${home}">lilora</a>${link("about/", t.about)}${link("#features", t.app)}${link("download/", t.getApp, 'data-analytics-cta="app-info"')}${languageNote}${link("press/", t.press)}</div><nav class="footer-column" aria-label="${t.learn}"><h2>${t.learn}</h2>${link("guides/", t.guides)}${link("plants/", t.plants)}${link("journal/", t.journal)}${link("compare/", t.compare)}</nav><nav class="footer-column" aria-label="${t.help}"><h2>${t.help}</h2>${link("support/", t.support)}${link("contact/", t.contact)}${link("privacy/", t.privacy)}<button class="cookie-settings" type="button">${t.cookies}</button>${link("legal/", t.legal)}${link("editorial/", t.editorial)}</nav><div class="footer-column"><h2>${t.languages}</h2><details class="footer-language"><summary>${flag(lang)}<span>${names[lang]}</span></summary><nav aria-label="${t.languages}">${languageLinks}</nav></details></div><div class="footer-bottom"><p>© 2026 Umut OREN</p><p>${t.status}</p></div></footer>`;
  return `<!doctype html><html lang="${htmlLang(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(documentTitle(seoTitle || title))}</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#33613F">${noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${origin}${path}">${headAlternates}`}<link rel="alternate" type="application/atom+xml" title="${escape(t.feedTitle)}" href="${origin}${home}feed.xml"><link rel="icon" href="/assets/icon.png"><link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/editorial.css"><link rel="stylesheet" href="/assets/foundation.css">${promotionStyles}<meta property="og:type" content="${schema.some((s) => s["@type"] === "Article") ? "article" : "website"}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:image" content="${shareImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(title)} — lilora"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${shareImage}"><meta name="twitter:image:alt" content="${escape(title)} — lilora">${schema.map((s) => `<script type="application/ld+json">${json(s)}</script>`).join("")}<script type="application/json" id="site-locale">${json({ language: lang, ...t, alternates, suggestions: Object.fromEntries(languages.map((l) => [l, { suggestion: locales[l].suggestion, suggestionHome: locales[l].suggestionHome, dismiss: locales[l].dismiss }])) })}</script><script defer src="/assets/language.js"></script><script defer src="/assets/navigation.js"></script><script defer src="/assets/analytics-config.js"></script><script defer src="/assets/analytics.js"></script></head><body><a class="skip" href="#main">${t.skip}</a><header class="header wrap"><a class="brand" href="${home}" aria-label="lilora"><img src="/assets/icon.png" width="40" height="40" alt="">lilora</a><nav class="desktop-nav" aria-label="${t.nav}">${nav}</nav><div class="header-tools">${picker}${appCta}</div><details class="mobile-menu"><summary><span class="menu-label-open">${t.menu}</span><span class="menu-label-close">${t.close}</span><span class="menu-icon" aria-hidden="true"></span></summary><div class="mobile-panel"><a class="brand mobile-panel-brand" href="${home}" aria-label="lilora"><img src="/assets/icon.png" width="32" height="32" alt="">lilora</a><nav class="mobile-nav" aria-label="${t.nav}">${nav}</nav><div class="mobile-panel-footer"><p class="mobile-panel-label">${t.languages}</p><nav class="mobile-languages" aria-label="${t.languages}">${languageLinks}</nav>${appCta}</div></div></details></header><main id="main" tabindex="-1">${body}</main>${footer}<a class="back-to-top" href="#main" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5m-6 6 6-6 6 6"/></svg><span>${t.backToTop}</span></a></body></html>`;
}
