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
  return `<div class="plant-browser" data-count-template="${escape(f.count)}"><nav class="plant-chips" aria-label="${escape(f.title)}"><a href="#plant-grid" class="plant-chip" data-filter="all" aria-current="true">${escape(f.all)}</a>${groups.map(([id]) => `<a href="#${id}" class="plant-chip" data-filter="${id}">${escape(f.short[id])}</a>`).join("")}</nav>${f.note ? `<p class="plant-note">${f.note}</p>` : ""}<p class="plant-count" aria-live="polite">${count(own.length)}</p><ul class="plant-grid" id="plant-grid">${own.map(plantCard).join("")}</ul>${groups.map(([id, label, list]) => `<section id="${id}" class="plant-filter"><h2>${escape(label)}</h2><ul class="plant-filter-links">${list.map((p) => `<li><a href="${plantPath(p, l)}">${escape(p[l].title)}</a> <em>${escape(p.botanicalName)}</em></li>`).join("")}</ul></section>`).join("")}</div>`;
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
    const images = [c.image || a.image].filter(Boolean).map(absolute);
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
        author: {
          "@type": "Organization",
          name: "Lilora",
          url: origin + prefix(l) + "editorial/",
        },
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
          author: { "@type": "Organization", name: "Lilora", url: origin + prefix(l) + "editorial/" },
          publisher: organization,
          citation: (a.sources || []).map((s) => s.url),
        },
        breadcrumbs([
          [t.home, prefix(l)],
          [t.plants, prefix(l) + "plants/"],
          [c.title, path],
        ]),
      ],
      body: `<div class="wrap document"><header class="specimen-header"><p>${escape(a.family)}</p><h1>${escape(c.title)}</h1><p class="botanical-name"><em>${escape(a.botanicalName)}</em></p></header>${a.image ? `<figure class="article-image plant-image"><img src="${a.image}" width="${a.imageWidth}" height="${a.imageHeight}" alt="${escape(c.imageAlt || "")}"><figcaption>${c.caption || ""}</figcaption></figure>` : ""}<section class="at-a-glance"><h2>${t.atAGlance}</h2><dl>${["light", "watering", "humidity", "temperature", "petSafety", "careLevel"].map((k) => `<div><dt>${t[k]}</dt><dd>${escape(g[k])}${k === "petSafety" && g.petSafetySource ? ` <a href="${escape(g.petSafetySource)}">${t.sources}</a>` : ""}</dd></div>`).join("")}</dl></section><article class="prose">${c.answerHtml}${c.sections.map((s) => `<section><h2>${escape(s.title)}</h2>${s.html}</section>`).join("")}<section id="sources"><h2>${t.sources}</h2><ul>${(a.sources || []).map((s) => `<li><a href="${escape(s.url)}">${escape(s.name)}</a></li>`).join("")}</ul></section>${appNote(l)}</article></div>`,
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
      sources: [
        `locales/${l}.json`,
        ...selection.flatMap((a) => contentSources(kind === "plants" ? "plants" : "articles", a.slug, l)),
      ],
      schema: [breadcrumbs([[t.home, prefix(l)], [t[kind], prefix(l) + kind + "/"]])],
      body: `<section class="collection-heading wrap"><p class="eyebrow">LILORA / ${escape(title)}</p><h1>${escape(title)}</h1><p class="dek">${escape(t.hubDescription[kind])}</p></section><div class="wrap collection">${kind === "plants" && plantBrowser(l) ? plantBrowser(l) : `<div class="story-grid">${selection.map((a) => card(a, l, kind === "plants" ? "plants" : "articles")).join("")}</div>`}${!selection.length ? `<p>${t.empty}</p>` : ""}${english.length ? `<section class="also-english"><h2>${t.alsoEnglish}</h2><div class="story-grid">${english.map((a) => card(a, "en", kind === "plants" ? "plants" : "articles")).join("")}</div></section>` : ""}${kind === "compare" && existsSync(`pages/compare/${l}.html`) ? readFileSync(`pages/compare/${l}.html`, "utf8") : ""}${appNote(l)}</div>`,
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
            .map(([v, p]) => `<xhtml:link rel="alternate" hreflang="${v}" href="${origin}${p}"/>`)
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
// One Atom feed per language for guides and journal posts, newest first.
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
