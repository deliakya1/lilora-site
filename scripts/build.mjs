import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { sharedCareDiagram } from "./shared-care-diagram.mjs";
import {
  promotionCopy,
  shareImagePath,
  defaultShareImagePath,
} from "./promotion-shared.mjs";
import {
  languages,
  names,
  prefix,
  locales,
  page,
  escape,
  json,
  formatDate,
  articlePath,
  plantPath,
  origin,
  htmlLang,
  organization,
} from "./layout.mjs";
import { careHandoverForm, handoverFormTitle } from "./care-handover-form.mjs";
import { plantFinder, finderCopy, finderPath, finderHubLink } from "./plant-finder.mjs";
const articles = JSON.parse(readFileSync("editorial/articles.json", "utf8"));
const plants = JSON.parse(readFileSync("editorial/plants.json", "utf8"));
// Static, no-JS filter sections for the plant hub; labels live with the plant content.
const plantFilters = existsSync("content/plants/filters.json")
  ? JSON.parse(readFileSync("content/plants/filters.json", "utf8"))
  : {};
// Plant hub: filter chips over a photo grid. Chips are anchors to static lists,
// so filtering still works without JavaScript; navigation.js filters in place.
const plantBrowser = (l) => {
  const f = plantFilters[l];
  const own = plants.filter((p) => p[l]);
  if (!f || own.length < 3) return "";
  const groups = Object.entries(f.chips)
    .map(([id, label]) => [id, label, own.filter((p) => (p.tags || []).includes(id))])
    .filter(([, , list]) => list.length);
  const count = (n) => escape(f.count.replace("{n}", n));
  const plantCard = (p) => `<li class="plant-card" data-tags="${escape((p.tags || []).join(" "))}"><a href="${plantPath(p, l)}"><span class="plant-card-photo"><img src="${p.image}" width="${p.imageWidth}" height="${p.imageHeight}" alt="${escape(p[l].imageAlt || "")}" loading="lazy" decoding="async"></span><span class="plant-card-name">${escape(p[l].title)}</span><em class="plant-card-botanical">${escape(p.botanicalName)}</em>${(p.tags || []).length ? `<span class="plant-card-tags">${p.tags.filter((t) => f.short[t]).map((t) => `<span class="plant-tag plant-tag-${t}">${escape(f.short[t])}</span>`).join("")}</span>` : ""}</a></li>`;
  return `${finderHubLink(l)}<div class="plant-browser" data-count-template="${escape(f.count)}"><nav class="plant-chips" aria-label="${escape(f.title)}"><a href="#plant-grid" class="plant-chip" data-filter="all" aria-current="true">${escape(f.all)}</a>${groups.map(([id]) => `<a href="#${id}" class="plant-chip" data-filter="${id}">${escape(f.short[id])}</a>`).join("")}</nav>${f.note ? `<p class="plant-note">${f.note}</p>` : ""}<p class="plant-count" aria-live="polite">${count(own.length)}</p><ul class="plant-grid" id="plant-grid">${own.map(plantCard).join("")}</ul>${groups.map(([id, label, list]) => `<section id="${id}" class="plant-filter"><h2>${escape(label)}</h2><ul class="plant-filter-links">${list.map((p) => `<li><a href="${plantPath(p, l)}">${escape(p[l].title)}</a> <em>${escape(p.botanicalName)}</em></li>`).join("")}</ul></section>`).join("")}</div>`;
};
// Sitemap lastmod comes from the last commit that touched a page's sources, never
// the build time. Files changed but not yet committed take today's date, which is
// the date they will be committed with.
const today = new Date().toISOString().slice(0, 10);
const gitDates = new Map();
for (const block of execFileSync("git", ["log", "--format=@%cs", "--name-only"], { encoding: "utf8" }).split("@").slice(1)) {
  const [date, ...files] = block.trim().split("\n");
  for (const file of files) if (file && !gitDates.has(file)) gitDates.set(file, date);
}
for (const line of execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).split("\n"))
  if (line.trim()) gitDates.set(line.slice(3).trim(), today);
const lastmod = (files) =>
  files.map((f) => gitDates.get(f)).filter(Boolean).sort().at(-1);
const routes = [];
const sharePages = [];
const staticSlugs = readdirSync("pages").filter((p) =>
  existsSync(`pages/${p}/meta.json`),
);
const staticPath = (slug, l) => prefix(l) + (slug === "home" ? "" : `${slug}/`);
const counterparts = (item, route) =>
  Object.fromEntries(
    languages.filter((l) => item[l]).map((l) => [l, route(item, l)]),
  );
const write = (path, html, alternates, meta = {}) => {
  const file = path === "404.html" ? path : "." + path + "index.html";
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  if (path !== "404.html") routes.push({ path, alternates, ...meta });
};
const recordShareImage = ({ path, lang, title, description }) =>
  sharePages.push({
    path,
    lang,
    title,
    description,
    image: shareImagePath(path, lang),
  });
const render = (opts) => {
  recordShareImage(opts);
  return write(
    opts.path,
    page({ ...opts, plantCount: plants.filter((p) => p[opts.lang]).length }),
    opts.alternates,
    { lang: opts.lang, lastmod: lastmod(opts.sources || []), images: opts.images || [] },
  );
};
// Lilora both writes and publishes its content: the author is the same Organization entity.
const author = {
  "@type": "Organization",
  "@id": organization["@id"],
  name: organization.name,
  url: organization.url,
};
const absolute = (src) => (src && src.startsWith("/") ? origin + src : src);
const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: origin + item,
  })),
});
const contentSources = (kind, slug, l) => [
  `content/${kind}/${slug}/meta.json`,
  `content/${kind}/${slug}/${l}.md`,
];
const card = (a, l, kind = "articles", heading = "h2") => {
  const c = a[l];
  return `<article class="story-card" lang="${l === "pt" ? "pt-BR" : l}"><a href="${kind === "plants" ? plantPath(a, l) : articlePath(a, l)}">${a.image ? `<img src="${c.image || a.image}" width="${a.imageWidth || 553}" height="${a.imageHeight || 1200}" alt="${escape(c.imageAlt || "")}" loading="lazy" decoding="async">` : ""}<${heading}>${escape(c.title)}</${heading}></a>${kind === "plants" ? `<p class="card-botanical"><em>${escape(a.botanicalName)}</em></p>` : ""}<p>${escape(c.description)}</p></article>`;
};
const related = (a, l) => {
  const all = articles.filter((x) => x.slug !== a.slug && x[l]),
    ids = a.related || [];
  return [
    ...ids.map((id) => all.find((x) => x.slug === id)).filter(Boolean),
    ...all.filter((x) => !ids.includes(x.slug)),
  ].slice(0, 3);
};
// Plant profiles point readers to the general care guides that apply to every species.
const plantGuides = (l) => {
  const picks = ["watering-houseplants", "indoor-plant-light-guide", "pet-safe-houseplants"]
    .map((slug) => articles.find((x) => x.slug === slug && x[l]))
    .filter(Boolean);
  return picks.length
    ? `<section class="related wrap"><h2>${locales[l].related}</h2><div class="story-grid">${picks.map((x) => card(x, l)).join("")}</div></section>`
    : "";
};
// Guides name the species profiles that genuinely apply (meta.json "plants"); plant pages list the same pairing in reverse.
const topicLabels = {
  tr: ["Bu konuyla ilgili bitki profilleri", "Bu bitki için bakım konuları"],
  en: ["Plant profiles for this topic", "Care topics for this plant"],
  es: ["Fichas de plantas sobre este tema", "Temas de cuidado para esta planta"],
  de: ["Pflanzenprofile zu diesem Thema", "Pflegethemen für diese Pflanze"],
  pt: ["Perfis de plantas sobre este tema", "Temas de cuidado para esta planta"],
  fr: ["Fiches plantes sur ce sujet", "Sujets d’entretien pour cette plante"],
};
const guidePlants = (a, l) => {
  const list = (a.plants || []).map((slug) => plants.find((p) => p.slug === slug && p[l])).filter(Boolean);
  return list.length
    ? `<section class="topic-links"><h2>${topicLabels[l][0]}</h2><ul class="plant-filter-links">${list.map((p) => `<li><a href="${plantPath(p, l)}">${escape(p[l].title)}</a> <em>${escape(p.botanicalName)}</em></li>`).join("")}</ul></section>`
    : "";
};
const plantTopics = (p, l) => {
  const shown = ["watering-houseplants", "indoor-plant-light-guide", "pet-safe-houseplants"];
  const list = articles.filter((a) => a[l] && !shown.includes(a.slug) && (a.plants || []).includes(p.slug));
  return list.length
    ? `<section class="topic-links wrap"><h2>${topicLabels[l][1]}</h2><ul class="plant-filter-links">${list.map((a) => `<li><a href="${articlePath(a, l)}">${escape(a[l].title)}</a></li>`).join("")}</ul></section>`
    : "";
};
const appNote = (l) =>
  `<aside class="app-note"><p class="eyebrow">lilora</p><h2>${escape(promotionCopy[l].recordTitle)}</h2><p>${escape(promotionCopy[l].recordBody)}</p><p>${locales[l].status}</p>${!["tr", "en"].includes(l) ? `<p>${locales[l].appLanguages}</p>` : ""}<a class="button" data-analytics-cta="article" href="${prefix(l)}download/">${locales[l].getApp}</a></aside>`;
const homeEditorial = (l) => {
  const t = locales[l], copy = promotionCopy[l];
  const latest = articles
    .filter((article) => article.type === "guide")
    .sort(
      (a, b) =>
        b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug),
    );
  const own = latest.filter((article) => article[l]).slice(0, 3);
  const english = l !== "en" && own.length < 3
    ? latest.filter((article) => article.en && !article[l]).slice(0, 3 - own.length)
    : [];
  const plantSelection = plants.filter((plant) => plant[l]).slice(0, 3);
  const guides = own.length || english.length
    ? `<section class="home-editorial wrap"><h2>${escape(copy.guidesTitle)}</h2>${own.length ? `<div class="post-grid">${own.map((article) => postCard(article, l)).join("")}</div>` : ""}${english.length ? `<div class="also-english"><p class="eyebrow">${escape(t.alsoEnglish)}</p><div class="story-grid">${english.map((article) => card(article, "en", "articles", "h3")).join("")}</div></div>` : ""}<a class="text-link" href="${prefix(l)}guides/">${escape(t.guides)}</a></section>`
    : "";
  const plantTeaser = plantSelection.length
    ? `<section class="home-plants wrap"><h2>${escape(copy.plantsTitle)}</h2><div class="story-grid">${plantSelection.map((plant) => card(plant, l, "plants", "h3")).join("")}</div><a class="text-link" href="${prefix(l)}plants/">${escape(t.plants)}</a></section>`
    : "";
  return guides + plantTeaser;
};
// Share control: hidden until navigation.js enables it, so the page stays clean without JS.
// It shares the clean canonical URL of this language, never the current address with query strings.
const shareTools = (path, title, t) =>
  `<div class="share-tools" data-share-url="${origin}${path}" data-share-title="${escape(title)}" data-label-share="${escape(t.share)}" data-label-copy="${escape(t.copyLink)}" data-label-copied="${escape(t.linkCopied)}" data-label-failed="${escape(t.copyFailed)}" hidden><button type="button" class="share-button">${escape(t.copyLink)}</button><span class="share-status" role="status" aria-live="polite"></span></div>`;
// Posts and guides carry a drawn herbarium cover (scripts/covers.mjs) and a topic label.
const coverOf = (a) =>
  a.type !== "comparison" && existsSync(`assets/images/covers/${a.slug}.svg`)
    ? `/assets/images/covers/${a.slug}.svg`
    : "";
const topicLabel = (a, t) => (a.type === "post" ? t.blogCategories : t.guideCategories)[a.category] || "";
const readingMinutes = (c) =>
  Math.max(1, Math.round([c.answerHtml, ...c.sections.map((x) => x.html)].join(" ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 220));
const postCard = (a, l, size = "card") => {
  const c = a[l], t = locales[l], cover = coverOf(a), h = size === "feature" ? "h2" : "h3";
  return `<article class="post-card post-card-${size}" lang="${htmlLang(l)}"><a href="${articlePath(a, l)}">${cover ? `<span class="post-cover"><img src="${cover}" width="1200" height="675" alt="" aria-hidden="true" ${size === "feature" ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></span>` : ""}<span class="post-meta">${topicLabel(a, t) ? `<span class="post-topic">${escape(topicLabel(a, t))}</span>` : ""}<span>${escape(t.minRead.replace("{n}", readingMinutes(c)))}</span></span><${h}>${escape(c.title)}</${h}>${size === "mini" ? "" : `<span class="post-excerpt">${escape(c.description)}</span>`}</a></article>`;
};
// "Summarize with" row: plain links that open each assistant with a visible prompt
// naming the canonical URL. No script, no tracking, nothing hidden in the page.
const assistants = [
  ["ChatGPT", "https://chatgpt.com/?q="],
  ["Claude", "https://claude.ai/new?q="],
  ["Perplexity", "https://www.perplexity.ai/search/new?q="],
  ["Google AI Mode", "https://www.google.com/search?udm=50&q="],
  ["Grok", "https://grok.com/?q="],
];
const summarize = (path, t) => {
  const q = encodeURIComponent(t.summarizePrompt.replace("{url}", origin + path));
  return `<div class="summarize"><p class="summarize-label">${escape(t.summarizeWith)}</p><ul class="summarize-links">${assistants.map(([name, url]) => `<li><a href="${escape(url + q)}" target="_blank" rel="noopener noreferrer nofollow">${name}</a></li>`).join("")}</ul><p class="summarize-note">${escape(t.summarizeNote)}</p></div>`;
};
// Reader comments on blog posts, stored in Lilora's own Supabase project through the
// website-comments Edge Function. Nothing renders while content/comments.json has no
// endpoint. Existing comments load only when the reader presses the button; the form
// posts only on "Send" and works without JavaScript (the function redirects back).
const commentsConfig = existsSync("content/comments.json")
  ? JSON.parse(readFileSync("content/comments.json", "utf8"))
  : {};
const comments = (a, l, path) => {
  if (a.type !== "post" || !commentsConfig.endpoint) return "";
  const t = locales[l], e = escape(commentsConfig.endpoint);
  const consent = escape(t.commentsConsent).replace("{privacy}", `<a href="${prefix(l)}privacy/#website-comments">${escape(t.commentsPrivacy)}</a>`);
  const states = ["sent", "invalid", "limited", "error", "sending"].map((k) => `data-${k}="${escape(t["comments" + k[0].toUpperCase() + k.slice(1)])}"`).join(" ");
  return `<section class="comments" id="comments"><h2>${escape(t.commentsTitle)}</h2><p class="comments-note">${escape(t.commentsNote)}</p><button type="button" class="comments-load" data-endpoint="${e}" data-page="${escape(path)}" data-lang="${htmlLang(l)}" data-empty="${escape(t.commentsEmpty)}" data-error="${escape(t.commentsLoadError)}">${escape(t.commentsLoad)}</button><ol class="comments-list" hidden></ol><form class="contact-form comment-form" method="post" action="${e}" ${states}><h3>${escape(t.commentsFormTitle)}</h3><input type="hidden" name="page" value="${escape(path)}"><input type="hidden" name="started" value=""><div class="contact-trap" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><div class="contact-field"><label for="comment-name">${escape(t.commentsName)}</label><input id="comment-name" name="name" type="text" autocomplete="nickname" maxlength="60" required></div><div class="contact-field"><label for="comment-message">${escape(t.commentsMessage)}</label><textarea id="comment-message" name="message" rows="5" minlength="2" maxlength="2000" aria-describedby="comment-message-hint" required></textarea><p class="contact-hint" id="comment-message-hint">${escape(t.commentsHint)}</p></div><div class="contact-consent"><input id="comment-consent" name="consent" type="checkbox" value="yes" required><label for="comment-consent">${consent}</label></div><p class="contact-status" role="status" aria-live="polite" hidden></p><button class="button" type="submit">${escape(t.commentsSubmit)}</button></form></section><script defer src="/assets/comments.js"></script>`;
};
for (const a of articles)
  for (const l of languages) {
    if (!a[l]) continue;
    const c = a[l],
      t = locales[l],
      path = articlePath(a, l),
      hub =
        a.type === "comparison"
          ? "compare"
          : a.type === "post"
            ? "blog"
            : "guides";
    const images = [c.image || a.image || coverOf(a)].filter(Boolean).map(absolute);
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": a.type === "post" ? "BlogPosting" : "Article",
        headline: c.title,
        description: c.description,
        inLanguage: htmlLang(l),
        datePublished: a.published,
        dateModified: a.reviewed,
        mainEntityOfPage: origin + path,
        image: [...images, origin + shareImagePath(path, l)],
        author,
        publisher: organization,
        citation: a.sources.map((s) => s.url),
      },
      breadcrumbs([
        [t.home, prefix(l)],
        [t[hub], prefix(l) + hub + "/"],
        [c.title, path],
      ]),
    ];
    render({
      lang: l,
      path,
      title: c.title,
      seoTitle: c.seoTitle,
      description: c.description,
      alternates: counterparts(a, articlePath),
      schema,
      sources: contentSources("articles", a.slug, l),
      images: images,
      body: `<div class="wrap"><nav class="breadcrumbs" aria-label="${t.home}"><a href="${prefix(l)}">lilora</a><span>/</span><a href="${prefix(l)}${hub}/">${t[hub]}</a></nav><header class="article-heading"><h1>${escape(c.title)}</h1><p class="dek">${escape(c.description)}</p><p class="byline">${t.published} <time datetime="${a.published}">${formatDate(a.published, l)}</time> · ${t.reviewed} <time datetime="${a.reviewed}">${formatDate(a.reviewed, l)}</time></p>${shareTools(path, c.title, t)}${a.type === "comparison" ? "" : summarize(path, t)}</header>${a.image ? `<figure class="article-image"><img src="${c.image || a.image}" width="${a.imageWidth || 553}" height="${a.imageHeight || 1200}" alt="${escape(c.imageAlt || "")}" fetchpriority="high"><figcaption>${c.caption || ""}</figcaption></figure>` : coverOf(a) ? `<figure class="post-hero-cover"><img src="${coverOf(a)}" width="1200" height="675" alt="" aria-hidden="true" fetchpriority="high"></figure>` : ""}<div class="article-layout"><details class="toc"><summary>${t.contents}</summary><nav aria-label="${t.contents}"><ol>${c.sections.map((s, i) => `<li><a href="#section-${i + 1}">${escape(s.title)}</a></li>${a.handoverFormAfter === i + 1 ? `<li><a href="#handover-form">${handoverFormTitle(l)}</a></li>` : ""}`).join("")}<li><a href="#sources">${t.sources}</a></li></ol></nav></details><article class="prose"><div class="short-answer"><p class="eyebrow">${t.shortAnswer}</p>${c.answerHtml}</div>${a.diagram === "shared-care" ? sharedCareDiagram(l) : ""}${c.sections.map((s, i) => `<section id="section-${i + 1}"><h2>${escape(s.title)}</h2>${s.html}</section>${a.handoverFormAfter === i + 1 ? careHandoverForm(l) : ""}`).join("")}<section id="sources" class="sources"><h2>${t.sources}</h2><ol>${a.sources.map((s) => `<li><a href="${escape(s.url)}">${escape(s.name)}</a>${s.note ? " — " + escape(s.note) : ""}</li>`).join("")}</ol><p>${t.generalNote}</p></section>${guidePlants(a, l)}${comments(a, l, path)}${appNote(l)}</article></div><section class="related"><h2>${t.related}</h2><div class="post-grid">${related(a, l)
        .map((x) => (coverOf(x) ? postCard(x, l) : card(x, l, "articles", "h3")))
        .join("")}</div></section></div>`,
    });
  }
for (const a of plants)
  for (const l of languages) {
    if (!a[l]) continue;
    const c = a[l],
      t = locales[l],
      g = c.atAGlance || {};
    const path = plantPath(a, l);
    render({
      lang: l,
      path,
      title: c.title,
      seoTitle: c.seoTitle,
      description: c.description,
      alternates: counterparts(a, plantPath),
      sources: contentSources("plants", a.slug, l),
      images: a.image ? [absolute(a.image)] : [],
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: c.title,
          description: c.description,
          inLanguage: htmlLang(l),
          datePublished: a.published,
          dateModified: a.reviewed,
          mainEntityOfPage: origin + path,
          image: [...(a.image ? [absolute(a.image)] : []), origin + shareImagePath(path, l)],
          author,
          publisher: organization,
          citation: (a.sources || []).map((s) => s.url),
        },
        breadcrumbs([
          [t.home, prefix(l)],
          [t.plants, prefix(l) + "plants/"],
          [c.title, path],
        ]),
      ],
      body: `<div class="wrap document"><nav class="breadcrumbs" aria-label="${t.home}"><a href="${prefix(l)}">lilora</a><span>/</span><a href="${prefix(l)}plants/">${t.plants}</a></nav><header class="specimen-header"><p>${escape(a.family)}</p><h1>${escape(c.title)}</h1><p class="botanical-name"><em>${escape(a.botanicalName)}</em></p><p class="byline">${t.published} <time datetime="${a.published}">${formatDate(a.published, l)}</time> · ${t.reviewed} <time datetime="${a.reviewed}">${formatDate(a.reviewed, l)}</time></p></header>${a.image ? `<figure class="article-image plant-image"><img src="${a.image}" width="${a.imageWidth}" height="${a.imageHeight}" alt="${escape(c.imageAlt || "")}" fetchpriority="high"><figcaption>${c.caption || ""}</figcaption></figure>` : ""}<section class="at-a-glance"><h2>${t.atAGlance}</h2><dl>${["light", "watering", "humidity", "temperature", "petSafety", "careLevel"].map((k) => `<div><dt>${t[k]}</dt><dd>${escape(g[k])}${k === "petSafety" && g.petSafetySource ? ` <a href="${escape(g.petSafetySource)}">${t.sources}</a>` : ""}</dd></div>`).join("")}</dl></section><article class="prose">${c.answerHtml}${c.sections.map((s) => `<section><h2>${escape(s.title)}</h2>${s.html}</section>`).join("")}<section id="sources"><h2>${t.sources}</h2><ul>${(a.sources || []).map((s) => `<li><a href="${escape(s.url)}">${escape(s.name)}</a></li>`).join("")}</ul></section>${appNote(l)}</article></div>${plantGuides(l)}${plantTopics(a, l)}`,
    });
  }
// One plant-finder page per language; answers are matched in the browser, so no per-answer pages.
const finderLanguages = languages.filter((l) => finderCopy[l] && plants.filter((p) => p[l] && p.finderLight).length >= 3);
for (const l of finderLanguages) {
  const t = locales[l],
    c = finderCopy[l],
    path = finderPath(l);
  render({
    lang: l,
    path,
    title: c.title,
    description: c.description,
    alternates: Object.fromEntries(finderLanguages.map((x) => [x, finderPath(x)])),
    sources: ["scripts/plant-finder.mjs", ...plants.flatMap((p) => contentSources("plants", p.slug, l))],
    schema: [breadcrumbs([[t.home, prefix(l)], [t.plants, prefix(l) + "plants/"], [c.title, path]])],
    body: `<div class="wrap document"><nav class="breadcrumbs" aria-label="${t.home}"><a href="${prefix(l)}">lilora</a><span>/</span><a href="${prefix(l)}plants/">${t.plants}</a></nav><header class="article-heading"><h1>${escape(c.title)}</h1></header>${plantFinder(l, plants, articles, plantFilters[l])}</div>`,
  });
}
for (const slug of staticSlugs) {
  const meta = JSON.parse(readFileSync(`pages/${slug}/meta.json`));
  const available = languages.filter((l) =>
    existsSync(`pages/${slug}/${l}.md`),
  );
  const alternates = Object.fromEntries(
    available.map((l) => [l, staticPath(slug, l)]),
  );
  for (const l of available) {
    if (!meta[l]) throw Error(`Missing ${slug}/${l} metadata`);
    const path = staticPath(slug, l);
    render({
      lang: l,
      path,
      ...meta[l],
      alternates,
      sources: [`pages/${slug}/meta.json`, `pages/${slug}/${l}.md`, ...(slug === "home" ? ["pages/home/copy.json"] : [])],
      schema:
        slug === "home"
          ? [
              { "@context": "https://schema.org", ...organization },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": `${origin}${path}#website`,
                name: "Lilora",
                url: origin + path,
                inLanguage: htmlLang(l),
                publisher: { "@id": organization["@id"] },
              },
            ]
          : [breadcrumbs([[locales[l].home, prefix(l)], [meta[l].title, path]])],
      body: readFileSync(`pages/${slug}/${l}.md`, "utf8").replace(
        "{{HOME_EDITORIAL}}",
        () => homeEditorial(l),
      ),
    });
  }
}
// Blog and guide hubs share one visual layout: a hero with topic links, a featured
// card beside a short list (latest posts, or where to start), one image-card section
// per topic, then a pointer to the other hub. Every card shows its cover.
const startGuides = ["watering-houseplants", "indoor-plant-light-guide", "potting-mix-and-drainage", "overwatering-vs-underwatering"];
const visualHub = (kind, l, selection, english) => {
  const t = locales[l], blog = kind === "blog", labels = blog ? t.blogCategories : t.guideCategories;
  const items = [...selection].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
  const featured = items[0];
  const side = blog
    ? items.slice(1, 5)
    : startGuides.map((slug) => items.find((a) => a.slug === slug)).filter((a) => a && a !== featured);
  const topics = Object.keys(labels).filter((id) => items.some((a) => a.category === id));
  const other = articles.filter((a) => a.type === (blog ? "guide" : "post") && a[l]);
  const otherSection = other.length
    ? `<section class="hub-other"><h2>${escape(blog ? t.blogGuidesTitle : t.blogFrom)}</h2>${blog ? `<p>${escape(t.blogGuidesIntro)}</p>` : ""}<ul>${other.sort((a, b) => a[l].title.localeCompare(b[l].title, htmlLang(l))).map((a) => `<li><a href="${articlePath(a, l)}">${escape(a[l].title)}</a></li>`).join("")}</ul><a class="text-link" href="${prefix(l)}${blog ? "guides" : "blog"}/">${escape(blog ? t.guides : t.blog)}</a></section>`
    : "";
  return `<section class="hub-hero wrap"><div class="hub-hero-intro"><p class="eyebrow">LILORA / ${escape(t[kind])}</p><h1>${escape(t[kind])}</h1><p class="dek">${escape(t.hubDescription[kind])}</p>${topics.length ? `<nav class="hub-topics" aria-label="${escape(t.blogTopics)}">${topics.map((id) => `<a href="#topic-${id}">${escape(labels[id])}</a>`).join("")}</nav>` : ""}</div>${featured ? `<div class="hub-hero-grid">${postCard(featured, l, "feature")}${side.length ? `<div class="hub-hero-side"><h2>${escape(blog ? t.blogLatest : t.guidesStart)}</h2>${side.map((a) => postCard(a, l, "mini")).join("")}</div>` : ""}</div>` : `<p>${t.empty}</p>`}</section><div class="wrap collection hub-collection">${topics.map((id) => `<section class="hub-section" id="topic-${id}"><h2>${escape(labels[id])}</h2><div class="post-grid">${items.filter((a) => a.category === id).map((a) => postCard(a, l)).join("")}</div></section>`).join("")}${english.length ? `<section class="also-english"><h2>${t.alsoEnglish}</h2><div class="post-grid">${english.map((a) => postCard(a, "en")).join("")}</div></section>` : ""}${otherSection}${appNote(l)}</div>`;
};
for (const kind of ["guides", "plants", "blog", "compare"])
  for (const l of languages) {
    const t = locales[l],
      source = kind === "plants" ? plants : articles,
      match = (a) =>
        kind === "plants" ||
        a.type ===
          (kind === "blog"
            ? "post"
            : kind === "compare"
              ? "comparison"
              : "guide"),
      selection = source.filter((a) => a[l] && match(a));
    const english =
      selection.length < 3 && l !== "en"
        ? source.filter((a) => a.en && !a[l] && match(a)).slice(0, 3)
        : [];
    const title = t[kind];
    render({
      lang: l,
      path: prefix(l) + kind + "/",
      title: t.hubTitles[kind],
      description: t.hubDescription[kind],
      alternates: Object.fromEntries(
        languages.map((v) => [v, prefix(v) + kind + "/"]),
      ),
      sources: [
        `locales/${l}.json`,
        ...selection.flatMap((a) => contentSources(kind === "plants" ? "plants" : "articles", a.slug, l)),
      ],
      schema: [breadcrumbs([[t.home, prefix(l)], [t[kind], prefix(l) + kind + "/"]])],
      body: kind === "blog" || kind === "guides" ? visualHub(kind, l, selection, english) : `<section class="collection-heading wrap"><p class="eyebrow">LILORA / ${escape(title)}</p><h1>${escape(title)}</h1><p class="dek">${escape(t.hubDescription[kind])}</p></section><div class="wrap collection">${kind === "plants" && plantBrowser(l) ? plantBrowser(l) : `<div class="story-grid">${selection.map((a) => card(a, l, kind === "plants" ? "plants" : "articles")).join("")}</div>`}${!selection.length ? `<p>${t.empty}</p>` : ""}${english.length ? `<section class="also-english"><h2>${t.alsoEnglish}</h2><div class="story-grid">${english.map((a) => card(a, "en", kind === "plants" ? "plants" : "articles")).join("")}</div></section>` : ""}${kind === "compare" && existsSync(`pages/compare/${l}.html`) ? readFileSync(`pages/compare/${l}.html`, "utf8") : ""}${appNote(l)}</div>`,
    });
  }
const notFound = {
  lang: "en",
  path: "/404.html",
  title: locales.en.notFoundTitle,
  description: locales.en.notFoundDescription,
};
recordShareImage(notFound);
const notFoundImage = existsSync("assets/images/home/notebook-404-v1-640.webp")
  ? '<img class="promo-404-art" src="/assets/images/home/notebook-404-v1-640.webp" width="640" height="427" alt="" loading="lazy" decoding="async">'
  : "";
write(
  "404.html",
  page({
    ...notFound,
    noindex: true,
    body: `<section class="document wrap"><h1>${locales.en.notFoundTitle}</h1><p>${locales.en.notFoundDescription}</p>${notFoundImage}<div class="error-languages">${languages.map((l) => `<section lang="${l === "pt" ? "pt-BR" : l}" id="${l}"><h2>${names[l]}</h2><p>${locales[l].notFoundDescription}</p><a href="${prefix(l)}">${locales[l].home}</a> · <a href="${prefix(l)}guides/">${locales[l].guides}</a> · <a href="${prefix(l)}support/">${locales[l].support}</a></section>`).join("")}</div></section>`,
  }),
  {},
);
// Sitemap index with one sitemap per language; each URL lists its real
// counterparts, its source date and its content images.
const xml = (v) => escape(v);
for (const l of languages) {
  const own = routes.filter((r) => r.lang === l).sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(
    `sitemap-${l}.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${own
      .map(
        (r) =>
          `<url><loc>${origin}${r.path}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}${Object.entries({
            ...r.alternates,
            ...(r.alternates.en ? { "x-default": r.alternates.en } : {}),
          })
            .map(([v, p]) => `<xhtml:link rel="alternate" hreflang="${v === "x-default" ? v : htmlLang(v)}" href="${origin}${p}"/>`)
            .join("")}${r.images.map((src) => `<image:image><image:loc>${xml(src)}</image:loc></image:image>`).join("")}</url>`,
      )
      .join("\n")}\n</urlset>\n`,
  );
}
writeFileSync(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${languages
    .map((l) => {
      const date = routes.filter((r) => r.lang === l).map((r) => r.lastmod).filter(Boolean).sort().at(-1);
      return `<sitemap><loc>${origin}/sitemap-${l}.xml</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</sitemap>`;
    })
    .join("\n")}\n</sitemapindex>\n`,
);
// One Atom feed per language for guides and blog posts, newest first.
for (const l of languages) {
  const entries = articles
    .filter((a) => a[l] && a.type !== "comparison")
    .sort((a, b) => b.reviewed.localeCompare(a.reviewed) || b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
  const feedPath = `${prefix(l)}feed.xml`;
  const updated = entries.map((a) => a.reviewed).sort().at(-1);
  writeFileSync(
    "." + feedPath,
    `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${htmlLang(l)}">\n<title>${xml(locales[l].feedTitle)}</title>\n<subtitle>${xml(locales[l].hubDescription.guides)}</subtitle>\n<id>${origin}${feedPath}</id>\n<link rel="self" href="${origin}${feedPath}"/>\n<link rel="alternate" type="text/html" href="${origin}${prefix(l)}"/>\n<updated>${updated}T00:00:00Z</updated>\n<author><name>Lilora</name><uri>${origin}${prefix(l)}editorial/</uri></author>\n${entries
      .map(
        (a) =>
          `<entry><title>${xml(a[l].title)}</title><link rel="alternate" type="text/html" href="${origin}${articlePath(a, l)}"/><id>${origin}${articlePath(a, l)}</id><published>${a.published}T00:00:00Z</published><updated>${a.reviewed}T00:00:00Z</updated><summary>${xml(a[l].description)}</summary></entry>`,
      )
      .join("\n")}\n</feed>\n`,
  );
}
// Moved addresses (the journal became the blog on 23 October 2026) keep working:
// each old URL gets a noindex page that sends readers and crawlers to the new one.
const redirects = existsSync("content/redirects.json")
  ? JSON.parse(readFileSync("content/redirects.json", "utf8"))
  : {};
for (const [from, to] of Object.entries(redirects)) {
  if (!routes.some((r) => r.path === to)) throw Error(`Redirect target ${to} for ${from} is not a page.`);
  mkdirSync("." + from, { recursive: true });
  writeFileSync(
    "." + from + "index.html",
    `<!doctype html>\n<html lang="${htmlLang(routes.find((r) => r.path === to).lang)}"><head><meta charset="utf-8"><title>lilora</title><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p><a href="${to}">${origin}${to}</a></p></body></html>\n`,
  );
}
const record = "editorial/routes.json";
if (existsSync(record))
  for (const old of JSON.parse(readFileSync(record)))
    if (!routes.some((r) => r.path === old) && !redirects[old]) {
      throw Error(
        `Refusing to remove public URL ${old}; keep its source or provide a reviewed redirect.`,
      );
    }
writeFileSync(record, json(routes.map((r) => r.path)) + "\n");
mkdirSync("assets/brand", { recursive: true });
writeFileSync(
  "assets/brand/share-manifest.json",
  JSON.stringify(
    {
      width: 1200,
      height: 630,
      defaults: languages.map((lang) => ({
        lang,
        title: "lilora",
        image: defaultShareImagePath(lang),
      })),
      pages: sharePages.sort((a, b) => a.path.localeCompare(b.path)),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Built ${routes.length} indexable pages in ${languages.length} languages.`,
);
