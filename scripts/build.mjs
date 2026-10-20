import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";
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
} from "./layout.mjs";
const articles = JSON.parse(readFileSync("editorial/articles.json", "utf8"));
const plants = JSON.parse(readFileSync("editorial/plants.json", "utf8"));
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
const write = (path, html, alternates) => {
  const file = path === "404.html" ? path : "." + path + "index.html";
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  if (path !== "404.html") routes.push({ path, alternates });
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
  );
};
const card = (a, l, kind = "articles", heading = "h2") => {
  const c = a[l];
  return `<article class="story-card" lang="${l === "pt" ? "pt-BR" : l}"><a href="${kind === "plants" ? plantPath(a, l) : articlePath(a, l)}">${a.image ? `<img src="${c.image || a.image}" width="${a.imageWidth || 553}" height="${a.imageHeight || 1200}" alt="${escape(c.imageAlt || "")}" loading="lazy" decoding="async">` : ""}<${heading}>${escape(c.title)}</${heading}></a><p>${escape(c.description)}</p></article>`;
};
const related = (a, l) => {
  const all = articles.filter((x) => x.slug !== a.slug && x[l]),
    ids = a.related || [];
  return [
    ...ids.map((id) => all.find((x) => x.slug === id)).filter(Boolean),
    ...all.filter((x) => !ids.includes(x.slug)),
  ].slice(0, 3);
};
const appNote = (l) =>
  `<aside class="app-note"><p class="eyebrow">lilora</p><h2>${escape(promotionCopy[l].recordTitle)}</h2><p>${escape(promotionCopy[l].recordBody)}</p><p>${locales[l].status}</p>${!["tr", "en"].includes(l) ? `<p>${locales[l].appLanguages}</p>` : ""}<a class="button" data-analytics-cta="app-info" href="${prefix(l)}download/">${locales[l].getApp}</a></aside>`;
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
    ? `<section class="home-editorial wrap"><h2>${escape(copy.guidesTitle)}</h2>${own.length ? `<div class="story-grid">${own.map((article) => card(article, l, "articles", "h3")).join("")}</div>` : ""}${english.length ? `<div class="also-english"><p class="eyebrow">${escape(t.alsoEnglish)}</p><div class="story-grid">${english.map((article) => card(article, "en", "articles", "h3")).join("")}</div></div>` : ""}<a class="text-link" href="${prefix(l)}guides/">${escape(t.guides)}</a></section>`
    : "";
  const plantTeaser = plantSelection.length
    ? `<section class="home-plants wrap"><h2>${escape(copy.plantsTitle)}</h2><div class="story-grid">${plantSelection.map((plant) => card(plant, l, "plants", "h3")).join("")}</div><a class="text-link" href="${prefix(l)}plants/">${escape(t.plants)}</a></section>`
    : "";
  return guides + plantTeaser;
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
            ? "journal"
            : "guides";
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: c.title,
        description: c.description,
        inLanguage: l,
        datePublished: a.published,
        dateModified: a.reviewed,
        mainEntityOfPage: origin + path,
        author: {
          "@type": "Organization",
          name: "Lilora",
          url: origin + prefix(l) + "editorial/",
        },
        publisher: { "@type": "Organization", name: "Lilora" },
        citation: a.sources.map((s) => s.url),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: t.home, item: origin + prefix(l) },
          { name: t[hub], item: origin + prefix(l) + hub + "/" },
          { name: c.title, item: origin + path },
        ].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
      },
    ];
    render({
      lang: l,
      path,
      title: c.title,
      description: c.description,
      alternates: counterparts(a, articlePath),
      schema,
      body: `<div class="wrap"><nav class="breadcrumbs" aria-label="${t.home}"><a href="${prefix(l)}">lilora</a><span>/</span><a href="${prefix(l)}${hub}/">${t[hub]}</a></nav><header class="article-heading"><h1>${escape(c.title)}</h1><p class="dek">${escape(c.description)}</p><p class="byline">${t.published} <time datetime="${a.published}">${formatDate(a.published, l)}</time> · ${t.reviewed} <time datetime="${a.reviewed}">${formatDate(a.reviewed, l)}</time></p></header>${a.image ? `<figure class="article-image"><img src="${c.image || a.image}" width="${a.imageWidth || 553}" height="${a.imageHeight || 1200}" alt="${escape(c.imageAlt || "")}"><figcaption>${c.caption || ""}</figcaption></figure>` : ""}<div class="article-layout"><details class="toc"><summary>${t.contents}</summary><nav aria-label="${t.contents}"><ol>${c.sections.map((s, i) => `<li><a href="#section-${i + 1}">${escape(s.title)}</a></li>`).join("")}<li><a href="#sources">${t.sources}</a></li></ol></nav></details><article class="prose"><div class="short-answer"><p class="eyebrow">${t.shortAnswer}</p>${c.answerHtml}</div>${a.diagram === "shared-care" ? sharedCareDiagram(l) : ""}${c.sections.map((s, i) => `<section id="section-${i + 1}"><h2>${escape(s.title)}</h2>${s.html}</section>`).join("")}<section id="sources" class="sources"><h2>${t.sources}</h2><ol>${a.sources.map((s) => `<li><a href="${escape(s.url)}">${escape(s.name)}</a>${s.note ? " — " + escape(s.note) : ""}</li>`).join("")}</ol><p>${t.generalNote}</p></section>${appNote(l)}</article></div><section class="related"><h2>${t.related}</h2><div class="story-grid">${related(
        a,
        l,
      )
        .map((x) => card(x, l))
        .join("")}</div></section></div>`,
    });
  }
for (const a of plants)
  for (const l of languages) {
    if (!a[l]) continue;
    const c = a[l],
      t = locales[l],
      g = c.atAGlance || {};
    render({
      lang: l,
      path: plantPath(a, l),
      title: c.title,
      description: c.description,
      alternates: counterparts(a, plantPath),
      body: `<div class="wrap document"><header class="specimen-header"><p>${escape(a.family)}</p><h1>${escape(c.title)}</h1><p class="botanical-name"><em>${escape(a.botanicalName)}</em></p></header><section class="at-a-glance"><h2>${t.atAGlance}</h2><dl>${["light", "watering", "humidity", "temperature", "petSafety", "careLevel"].map((k) => `<div><dt>${t[k]}</dt><dd>${escape(g[k])}${k === "petSafety" && g.petSafetySource ? ` <a href="${escape(g.petSafetySource)}">${t.sources}</a>` : ""}</dd></div>`).join("")}</dl></section><article class="prose">${c.answerHtml}${c.sections.map((s) => `<section><h2>${escape(s.title)}</h2>${s.html}</section>`).join("")}<section id="sources"><h2>${t.sources}</h2><ul>${(a.sources || []).map((s) => `<li><a href="${escape(s.url)}">${escape(s.name)}</a></li>`).join("")}</ul></section>${appNote(l)}</article></div>`,
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
    render({
      lang: l,
      path: staticPath(slug, l),
      ...meta[l],
      alternates,
      body: readFileSync(`pages/${slug}/${l}.md`, "utf8").replace(
        "{{HOME_EDITORIAL}}",
        () => homeEditorial(l),
      ),
    });
  }
}
for (const kind of ["guides", "plants", "journal", "compare"])
  for (const l of languages) {
    const t = locales[l],
      source = kind === "plants" ? plants : articles,
      match = (a) =>
        kind === "plants" ||
        a.type ===
          (kind === "journal"
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
      body: `<section class="collection-heading wrap"><p class="eyebrow">LILORA / ${escape(title)}</p><h1>${escape(title)}</h1><p class="dek">${escape(t.hubDescription[kind])}</p></section><div class="wrap collection"><div class="story-grid">${selection.map((a) => card(a, l, kind === "plants" ? "plants" : "articles")).join("")}</div>${!selection.length ? `<p>${t.empty}</p>` : ""}${english.length ? `<section class="also-english"><h2>${t.alsoEnglish}</h2><div class="story-grid">${english.map((a) => card(a, "en", kind === "plants" ? "plants" : "articles")).join("")}</div></section>` : ""}${kind === "compare" && existsSync(`pages/compare/${l}.html`) ? readFileSync(`pages/compare/${l}.html`, "utf8") : ""}${appNote(l)}</div>`,
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
writeFileSync(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${routes
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(
      (r) =>
        `<url><loc>${origin}${r.path}</loc>${Object.entries({
          ...r.alternates,
          ...(r.alternates.en ? { "x-default": r.alternates.en } : {}),
        })
          .map(
            ([l, p]) =>
              `<xhtml:link rel="alternate" hreflang="${l}" href="${origin}${p}"/>`,
          )
          .join("")}</url>`,
    )
    .join("\n")}\n</urlset>\n`,
);
const record = "editorial/routes.json";
if (existsSync(record))
  for (const old of JSON.parse(readFileSync(record)))
    if (!routes.some((r) => r.path === old)) {
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
