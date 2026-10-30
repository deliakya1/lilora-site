// One source of truth for the public App Store listing (config/app-store.json).
// Badges are Apple's original artwork, one SVG per site language; a page shows the
// text button instead until a language's file is present. Never redraw the badge.
import { existsSync, readFileSync } from "node:fs";
export const appStore = JSON.parse(readFileSync("config/app-store.json", "utf8"));
const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const badgeFile = (lang) => `${appStore.badgeDir}/${lang}.svg`;
const badgeSize = (lang) => {
  const [, , w, h] = readFileSync(badgeFile(lang), "utf8").match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  return { width: Math.round((40 * w) / h), height: 40 };
};
export const hasBadge = (lang) => existsSync(badgeFile(lang));
export const storeLink = (label, placement, cls = "button") =>
  `<a class="${cls}" href="${appStore.url}" data-analytics-cta="${placement}">${escape(label)}</a>`;
// Apple's badge, at least 40 px high, with clear space from .app-store-badge padding.
export const appStoreBadge = (lang, t, placement) => {
  if (!hasBadge(lang)) return `<div class="app-store-action">${storeLink(t.openAppStore, placement)}</div>`;
  const { width, height } = badgeSize(lang);
  return `<div class="app-store-action"><a class="app-store-badge" href="${appStore.url}" data-analytics-cta="${placement}"><img src="/${badgeFile(lang)}" width="${width}" height="${height}" alt="${escape(t.appStoreBadgeAlt)}" decoding="async"></a></div>`;
};
// Apple's QR code for the listing (apple.co short link), for desktop visitors to scan.
export const appStoreQr = (t, size = 256, cls = "") =>
  `<img${cls ? ` class="${cls}"` : ""} src="/${appStore.qr}" width="${size}" height="${size}" alt="${escape(t.appStoreQrAlt)}" loading="lazy" decoding="async">`;
export const mobileApplication = (lang, origin, description) => ({
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: appStore.names[lang] || appStore.names.default,
  operatingSystem: "iOS, iPadOS",
  applicationCategory: appStore.category,
  url: appStore.url,
  installUrl: appStore.url,
  description,
  publisher: { "@id": `${origin}/#organization` },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
});
