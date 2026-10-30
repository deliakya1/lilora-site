import { existsSync, readFileSync, writeFileSync } from "node:fs";

// The six reviewed copy records are the source for these page bodies.
const copy = JSON.parse(readFileSync("pages/home/copy.json", "utf8"));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
import { prefix } from './locale-registry.mjs';
import { appStore, appStoreBadge, appStoreQr } from "./app-store.mjs";
const locales = Object.fromEntries(Object.keys(copy).map((l) => [l, JSON.parse(readFileSync(`locales/${l}.json`, "utf8"))]));
const illustration = (name, alt, caption, eager = false) => {
  const path = `/assets/images/home/${name}-640.webp`;
  if (!existsSync(`.${path}`)) return "";
  const sizes = eager ? "(min-width: 900px) 305px, (min-width: 600px) 360px, 50vw" : "(min-width: 900px) 430px, 90vw";
  return `<figure class="promo-atmosphere"><img src="${path}" srcset="/assets/images/home/${name}-320.webp 320w, ${path} 640w, /assets/images/home/${name}-960.webp 960w" sizes="${sizes}" width="640" height="427" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${esc(caption)}</figcaption></figure>`;
};
const artwork = (lang, feature, alt, caption, eager = false, sizes = "(min-width: 900px) 260px, (min-width: 600px) 240px, 56vw") => {
  const locale = lang === "tr" ? "tr" : "en";
  const name = feature === "guest" ? "collection" : feature;
  const stem = `/assets/images/home/app-${locale}-${name}`;
  const original = `/assets/brand/artwork/lilora-iphone-${locale}-${name}.png`;
  if (!existsSync(`.${stem}-480.webp`)) return "";
  return `<figure class="promo-app"><picture><source type="image/webp" srcset="${stem}-320.webp 320w, ${stem}-480.webp 480w, ${stem}-720.webp 720w" sizes="${sizes}"><img src="${original}" width="1320" height="2868" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture><figcaption>${esc(caption)}</figcaption></figure>`;
};
const heroMedia = (lang, t) => {
  const locale = lang === "tr" ? "tr" : "en";
  const stem = `/assets/images/home/app-${locale}-collection`;
  return `<figure class="promo-hero-media"><div class="promo-hero-frames"><div class="promo-hero-scene"><img src="/assets/images/home/window-hero-v1-640.webp" srcset="/assets/images/home/window-hero-v1-640.webp 640w, /assets/images/home/window-hero-v1-960.webp 960w, /assets/images/home/window-hero-v1-1280.webp 1280w" sizes="(min-width: 1100px) 340px, 55vw" width="640" height="427" alt="${esc(t.imageAlts.hero)}" fetchpriority="high" decoding="async"></div><div class="promo-hero-app"><picture><source type="image/webp" srcset="${stem}-320.webp 320w, ${stem}-480.webp 480w, ${stem}-720.webp 720w" sizes="(min-width: 1100px) 250px, 40vw"><img src="/assets/brand/artwork/lilora-iphone-${locale}-collection.png" width="1320" height="2868" alt="${esc(t.features[0].imageAlt)}" fetchpriority="high" decoding="async"></picture></div></div><figcaption class="promo-hero-caption">${esc(t.heroCaption)}</figcaption></figure>`;
};
const metadata = {};
for (const [lang, t] of Object.entries(copy)) {
  const home = prefix(lang);
  const note = `<small class="promo-language">${esc(t.appLanguages)}</small>`;
  const cta = (place) => `<div class="promo-cta"><a class="button" href="${appStore.url}" data-analytics-cta="home-${place}">${esc(t.getApp)}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>${note}</div>`;
  const caption = `${t.artCaptionEN} ${t.sampleCaption}`;
  const art = (id, alt, eager, sizes) => artwork(lang, id, alt,
    ["identify", "shared-care"].includes(id) ? `${t.artCaptionEN} ${t.introCaption}` : caption, eager, sizes);
  // Two phone screens share one row on narrow screens, so each is about half the width.
  const pairSizes = "(min-width: 900px) 260px, (min-width: 600px) 240px, 44vw";
  const atmosphere = (id, alt) => illustration(id, alt, t.illustrationCaption);
  const extras = {
    collection: ["plant-shelf-v1", t.imageAlts.shelf],
    reminders: ["care-corner-v1", t.imageAlts.careCorner],
    history: ["leaf-study-v1", t.imageAlts.leafStudy],
    "shared-care": ["shared-table-v1", t.imageAlts.sharedTable],
  };
  const featureRows = t.features.map((f, i) => `<article class="promo-feature">
    <div class="promo-feature-copy"><p class="promo-index">${String(i + 1).padStart(2, "0")}</p><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>${extras[f.id] ? atmosphere(...extras[f.id]) : ""}</div>
    ${art(f.id, f.imageAlt)}
  </article>`).join("");
  const howImages = [t.features.find(f => f.id === "reminders"), t.features.find(f => f.id === "history")];
  const body = `<div class="promo-home">
  <section class="promo-hero wrap">
    <div class="promo-hero-copy"><p class="eyebrow">${esc(t.eyebrow)}</p><h1>${esc(t.title)}</h1><p class="promo-dek">${esc(t.dek)}</p>
    <div class="promo-actions">${cta("hero")}<a class="text-link" href="#how-it-works">${esc(t.seeHow)} <span aria-hidden="true">↓</span></a></div>
    <p class="promo-status"><span class="promo-status-dot" aria-hidden="true"></span>${esc(t.status)}<span class="promo-status-sep" aria-hidden="true">·</span>${esc(t.devices)}</p></div>
    ${heroMedia(lang, t)}
  </section>
  <section class="promo-how" id="how-it-works"><div class="wrap promo-how-inner">
    <div class="promo-section-heading"><p class="eyebrow">${esc(t.howEyebrow)}</p><h2>${esc(t.howTitle)}</h2><p>${esc(t.howIntro)}</p>
    <ol class="promo-steps">${t.steps.map((s, i) => `<li><span class="promo-step-number" aria-hidden="true">${i + 1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join("")}</ol></div>
    <div class="promo-screen-pair">${art("care", t.todayImageAlt, false, pairSizes)}${art("history", howImages[1].imageAlt, false, pairSizes)}</div>
  </div></section>
  <section class="wrap promo-features" id="features"><header class="promo-section-heading"><p class="eyebrow">Lilora</p><h2>${esc(t.featuresTitle)}</h2></header>${featureRows}</section>
  <section class="promo-free"><div class="wrap promo-free-inner"><header class="promo-section-heading"><h2>${esc(t.freeTitle)}</h2><p>${esc(t.freeIntro)}</p></header><div><dl class="promo-plan-list">${t.plans.map(p => `<div><dt>${esc(p.title)}</dt><dd>${esc(p.text)}</dd></div>`).join("")}</dl><p class="promo-pricing-note">${esc(t.pricingNote)}</p></div></div></section>
  {{HOME_EDITORIAL}}
  <section class="wrap promo-faq"><h2>${esc(t.faqTitle)}</h2><div>${t.faq.map(f => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join("")}<a class="text-link" href="${home}support/">${esc(t.supportLink)} <span aria-hidden="true">→</span></a></div></section>
  <section class="promo-band"><div class="wrap promo-band-inner"><div><h2>${esc(t.closingTitle)}</h2><p>${esc(t.closingText)}</p>${appStoreBadge(lang, locales[lang], "home-closing")}${note}<p class="promo-status">${esc(t.status)}</p></div><figure class="promo-qr">${appStoreQr(locales[lang])}<figcaption>${esc(t.qrCaption)}</figcaption></figure></div></section>
  </div>`;
  writeFileSync(`pages/home/${lang}.md`, body + "\n");
  metadata[lang] = { title: t.title, seoTitle: t.seoTitle, description: t.dek };
}
writeFileSync("pages/home/meta.json", JSON.stringify(metadata, null, 2) + "\n");
console.log(`Prepared ${Object.keys(copy).length} localized home pages.`);
