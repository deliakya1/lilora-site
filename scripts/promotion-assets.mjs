import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import QRCode from "qrcode";

const root = process.cwd();
const require = createRequire(import.meta.url);
const languages = ["tr", "en", "es", "de", "pt", "fr"];
const origin = "https://lilora.app";
const ink = "#1E2620";
const paper = "#F7F3EC";
const fern = "#33613F";
const version = createHash("sha256")
  .update("promotion-assets-v1")
  .update(readFileSync(new URL(import.meta.url)))
  .digest("hex");
const output = "assets/brand";
const cachePath = `${output}/asset-fingerprints.json`;
const cache = existsSync(cachePath)
  ? JSON.parse(readFileSync(cachePath, "utf8"))
  : {};
const nextCache = {};
const generated = [];
const mkdir = (file) => mkdirSync(dirname(file), { recursive: true });
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const hash = (...values) => {
  const h = createHash("sha256");
  for (const value of values) h.update(value);
  return h.digest("hex");
};
const fileBytes = (path) => readFileSync(resolve(root, path));
const data = (path, type) =>
  `data:${type};base64,${fileBytes(path).toString("base64")}`;
const prefix = (lang) => (lang === "tr" ? "/" : `/${lang}/`);
const qrUrl = (lang, context) =>
  `${origin}${prefix(lang)}download/?utm_source=qr&utm_medium=${context}&utm_campaign=prelaunch`;
const unchanged = (file, fingerprint) => {
  nextCache[file] = fingerprint;
  return existsSync(file) && cache[file] === fingerprint;
};
const save = (file, bytes) => {
  mkdir(file);
  writeFileSync(file, bytes);
  generated.push(file);
};

// Literal copy is independently localized; the app's UI is only English/Turkish.
const printCopy = {
  tr: {
    title: "Aynı evde, aynı bitkinin hikâyesi.",
    shortPitch:
      "Kontrolleri ve sulamaları ayrı kaydet. Bitkilerinin bakımını evindekilerle paylaş.",
    pitch:
      "Bitkilerini, fotoğraflarını ve bakım geçmişini bir arada tut. Kontrolü ve sulamayı ayrı ayrı kaydet; evindekiler de son bakımı görebilsin.",
    status: "Lilora, App Store incelemesini bekliyor.",
    follow: "Yayımlandığında bu bağlantı seni App Store’a götürecek.",
    languages: "iPhone ve iPad · Uygulama Türkçe ve İngilizce",
    scan: "Lilora’yı tanı",
    free: "Elle bitki eklemek ve bakım kaydı tutmak ücretsiz. İsteğe bağlı bitki tanıma için ücretsiz ve ücretli seçenekler var.",
  },
  en: {
    title: "One home. A shared record of care.",
    shortPitch:
      "Keep checks and waterings separate. Share the care record with the people at home.",
    pitch:
      "Keep your plants, photos and care history together. Record checks and waterings separately, so everyone at home can see the last care.",
    status: "Lilora is awaiting App Store review.",
    follow: "Once it is live, this link will take you to the App Store.",
    languages: "iPhone & iPad · App in English and Turkish",
    scan: "Meet Lilora",
    free: "Manual plants and care records are free. Optional photo identification has free and paid options.",
  },
  es: {
    title: "Un hogar. El cuidado de las plantas, compartido.",
    shortPitch:
      "Registra revisiones y riegos por separado. Comparte los cuidados con quienes viven contigo.",
    pitch:
      "Reúne tus plantas, fotos e historial de cuidados. Registra por separado las revisiones y los riegos para que todos en casa sepan qué se hizo.",
    status: "Lilora está pendiente de revisión en el App Store.",
    follow: "Cuando se publique, este enlace te llevará al App Store.",
    languages: "iPhone y iPad · Aplicación en inglés y turco",
    scan: "Conoce Lilora",
    free: "Añadir plantas manualmente y registrar cuidados es gratis. La identificación opcional por foto tiene opciones gratuitas y de pago.",
  },
  de: {
    title: "Ein Zuhause. Gemeinsam die Pflanzen im Blick.",
    shortPitch:
      "Kontrollen und Gießen getrennt festhalten. Teile den Pflegeverlauf mit deinem Haushalt.",
    pitch:
      "Pflanzen, Fotos und Pflegeverlauf an einem Ort. Halte Kontrollen und Gießen getrennt fest, damit alle zu Hause den letzten Stand kennen.",
    status: "Lilora wartet auf die Prüfung im App Store.",
    follow: "Nach der Veröffentlichung führt dieser Link zum App Store.",
    languages: "iPhone und iPad · App auf Englisch und Türkisch",
    scan: "Lilora kennenlernen",
    free: "Pflanzen von Hand hinzufügen und Pflege festhalten ist kostenlos. Für die optionale Fotoerkennung gibt es kostenlose und kostenpflichtige Angebote.",
  },
  pt: {
    title: "Uma casa. O cuidado das plantas em comum.",
    shortPitch:
      "Registre verificações e regas separadamente. Compartilhe os cuidados com quem mora com você.",
    pitch:
      "Reúna plantas, fotos e histórico de cuidados. Registre verificações e regas separadamente para que todos em casa saibam o que foi feito.",
    status: "Lilora está aguardando análise na App Store.",
    follow: "Quando estiver disponível, este link levará você à App Store.",
    languages: "iPhone e iPad · App em inglês e turco",
    scan: "Conheça o Lilora",
    free: "Adicionar plantas manualmente e registrar cuidados é grátis. A identificação opcional por foto tem opções gratuitas e pagas.",
  },
  fr: {
    title: "Un foyer. Le soin des plantes en commun.",
    shortPitch:
      "Note les vérifications et les arrosages séparément. Partage les soins avec les personnes de ton foyer.",
    pitch:
      "Réunis tes plantes, tes photos et leur historique de soins. Note séparément les vérifications et les arrosages pour que chacun sache ce qui a été fait.",
    status: "Lilora est en attente d’examen sur l’App Store.",
    follow: "Après sa publication, ce lien te mènera à l’App Store.",
    languages: "iPhone et iPad · App en anglais et en turc",
    scan: "Découvrir Lilora",
    free: "L’ajout manuel de plantes et le suivi des soins sont gratuits. L’identification facultative par photo propose des options gratuites et payantes.",
  },
};

// QR generation is local. The stable website URL is deliberately retained prelaunch.
const qrManifest = [];
for (const lang of languages) {
  for (const context of ["home", "download", "a6", "a4"]) {
    const url = qrUrl(lang, context);
    const code = QRCode.create(url, { errorCorrectionLevel: "M" });
    const size = (code.modules.size + 8) * 8;
    const file = `${output}/qr/${lang}-${context}.svg`;
    const fingerprint = hash(version, url, ink, paper, "quiet-zone:4", "M");
    if (!unchanged(file, fingerprint)) {
      const svg = await QRCode.toString(url, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 4,
        width: size,
        color: { dark: ink, light: paper },
      });
      save(file, svg);
    }
    qrManifest.push({
      lang,
      context,
      file: `/${file}`,
      url,
      modules: code.modules.size,
      quietZone: 4,
      foreground: ink,
      background: paper,
      errorCorrection: "M",
    });
  }
}
save(`${output}/qr/manifest.json`, JSON.stringify(qrManifest, null, 2) + "\n");

let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  try {
    ({ chromium } = require("playwright"));
  } catch {
    throw new Error(
      "Promotion assets need Playwright and a local Chromium. Install project dev dependencies and set CHROMIUM_PATH if Chromium is not on a standard system path.",
    );
  }
}
const systemBrowser =
  process.env.CHROMIUM_PATH ||
  [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find(existsSync);
const browser = await chromium.launch({
  ...(systemBrowser ? { executablePath: systemBrowser } : {}),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
// All render inputs are embedded. This route prevents accidental external calls.
await page.route("**/*", (route) => {
  if (/^(?:data|about):/.test(route.request().url())) return route.continue();
  return route.abort();
});
const fontPath = "assets/Newsreader-Medium.woff";
const iconPath = "assets/icon.png";
const imagePath = "assets/images/home/window-hero-v1-640.webp";
const font = data(fontPath, "font/woff");
const icon = data(iconPath, "image/png");
const atmosphere = existsSync(imagePath) ? data(imagePath, "image/webp") : null;
const inputs = [
  fileBytes(fontPath),
  fileBytes(iconPath),
  atmosphere ? fileBytes(imagePath) : "optional-image-unavailable",
];
const fontStyle = `@font-face{font-family:Newsreader;src:url("${font}") format("woff");font-weight:500;font-display:block}`;
const html = (lang, css, body) =>
  `<!doctype html><html lang="${lang === "pt" ? "pt-BR" : lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lilora</title><style>${fontStyle}*{box-sizing:border-box}body{margin:0;color:${ink};background:${paper};font-family:Arial,Helvetica,sans-serif}h1,h2,.wordmark{font-family:Newsreader,Georgia,serif;font-weight:500}img{display:block}a{color:inherit;text-decoration:none}${css}</style><body>${body}</body></html>`;
const render = async (document) => {
  await page.setContent(document, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
};

try {
  const touchPath = "assets/apple-touch-icon.png";
  if (!unchanged(touchPath, hash(version, "icon180", fileBytes(iconPath)))) {
    await render(
      html(
        "en",
        "body{width:180px;height:180px}img{width:180px;height:180px}",
        `<img src="${icon}" width="180" height="180" alt="">`,
      ),
    );
    save(touchPath, await page.locator("img").screenshot({ type: "png" }));
  }
  const manifest = {
    name: "Lilora",
    short_name: "Lilora",
    description: "A houseplant notebook for shared care.",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: paper,
    theme_color: fern,
    icons: [
      {
        src: "/assets/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
  save("site.webmanifest", JSON.stringify(manifest, null, 2) + "\n");

  for (const lang of languages) {
    const copy = printCopy[lang];
    for (const format of ["a6", "a4"]) {
      const compact = format === "a6";
      const file = `${output}/print/lilora-${lang}-${format}.pdf`;
      const fingerprint = hash(
        version,
        "print-v1",
        lang,
        format,
        JSON.stringify(copy),
        fileBytes(`${output}/qr/${lang}-${format}.svg`),
        ...inputs,
      );
      if (unchanged(file, fingerprint)) continue;
      const qr = data(`${output}/qr/${lang}-${format}.svg`, "image/svg+xml");
      const document = html(
        lang,
        `
        @page{size:${compact ? "105mm 148mm" : "210mm 297mm"};margin:0}
        body{width:${compact ? "105mm" : "210mm"};height:${compact ? "148mm" : "297mm"};padding:${compact ? "8mm" : "19mm"};display:flex;flex-direction:column}
        .brand{display:flex;align-items:center;gap:${compact ? "2.5mm" : "4mm"}}
        .brand img{width:${compact ? "8mm" : "12mm"};height:${compact ? "8mm" : "12mm"}}
        .wordmark{font-size:${compact ? "24pt" : "36pt"};letter-spacing:-.025em}
        h1{font-size:${compact ? "22pt" : "46pt"};line-height:1.04;letter-spacing:-.025em;margin:${compact ? "5mm 0 2mm" : "11mm 0 6mm"};max-width:16cm}
        .pitch{font-size:${compact ? "9.5pt" : "16pt"};line-height:1.43;margin:0;max-width:16cm}
        .free{font-size:11pt;line-height:1.45;margin:5mm 0}
        .status{border-top:1px solid #b9bcad;padding-top:${compact ? "2mm" : "6mm"};margin-top:${compact ? "3mm" : "8mm"};font-size:${compact ? "8pt" : "14pt"};line-height:1.4}
        .status strong{font-weight:600;display:block;margin-bottom:1mm}
        .closing{display:flex;align-items:center;gap:${compact ? "4mm" : "10mm"};margin-top:auto;padding-top:3mm}
        .qr{width:${compact ? "30mm" : "48mm"};height:${compact ? "30mm" : "48mm"};flex:none}
        .scan{font-family:Newsreader,Georgia,serif;font-size:${compact ? "15pt" : "26pt"};line-height:1.15;margin:0 0 3mm}
        .url{font-size:${compact ? "8pt" : "12pt"};word-break:break-word}
        .platforms{font-size:${compact ? "7pt" : "10pt"};margin:${compact ? "3mm" : "7mm"} 0 0;line-height:1.4}
        .plant{height:${compact ? "33mm" : "42mm"};width:100%;object-fit:cover;margin-top:${compact ? "4mm" : "8mm"};object-position:center 58%}
        `,
        `<div class="brand"><img src="${icon}" width="96" height="96" alt=""><span class="wordmark">lilora</span></div>
        <h1>${escape(copy.title)}</h1><p class="pitch">${escape(compact ? copy.shortPitch : copy.pitch)}</p>
        ${!compact && atmosphere ? `<img class="plant" src="${atmosphere}" width="640" height="427" alt="">` : ""}
        ${!compact ? `<p class="free">${escape(copy.free)}</p>` : ""}
        <div class="status"><strong>${escape(copy.status)}</strong>${compact ? "" : escape(copy.follow)}</div>
        ${compact && atmosphere ? `<img class="plant" src="${atmosphere}" width="640" height="427" alt="">` : ""}
        <div class="closing"><a href="${escape(qrUrl(lang, format))}"><img class="qr" src="${qr}" width="432" height="432" alt="${escape(copy.scan)}"></a><div><p class="scan">${escape(copy.scan)}</p><a class="url" href="${origin}${prefix(lang)}download/">lilora.app${prefix(lang)}download/</a></div></div>
        <p class="platforms">${escape(copy.languages)}</p>`,
      );
      await render(document);
      const fits = await page.evaluate(
        () => document.body.scrollHeight <= document.body.clientHeight + 1,
      );
      if (!fits) throw new Error(`Print layout overflows ${lang}/${format}`);
      const qrBounds = await page.locator(".qr").boundingBox();
      if (
        !qrBounds ||
        (Math.min(qrBounds.width, qrBounds.height) / 96) * 25.4 < 25
      ) {
        throw new Error(`Print QR is below 25 mm in ${lang}/${format}`);
      }
      const pdf = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        tagged: true,
      });
      save(file, pdf);
    }
  }
  save(
    `${output}/print/manifest.json`,
    JSON.stringify(
      languages.flatMap((lang) =>
        ["a6", "a4"].map((format) => ({
          lang,
          format,
          file: `/${output}/print/lilora-${lang}-${format}.pdf`,
          pageMillimetres: format === "a6" ? [105, 148] : [210, 297],
          qrMillimetres: format === "a6" ? 30 : 48,
          qrUrl: qrUrl(lang, format),
          status: "prelaunch",
        })),
      ),
      null,
      2,
    ) + "\n",
  );
  const shareManifestPath = `${output}/share-manifest.json`;
  if (!existsSync(shareManifestPath)) {
    throw new Error("Build the page manifest before promotion assets.");
  }
  const share = JSON.parse(readFileSync(shareManifestPath, "utf8"));
  for (const entry of [...share.defaults, ...share.pages]) {
    const file = entry.image.replace(/^\//, "");
    const title = entry.title;
    const fingerprint = hash(
      version,
      "share-v1",
      JSON.stringify(entry),
      ...inputs,
    );
    if (unchanged(file, fingerprint)) continue;
    const titleSize = title.length > 100 ? 55 : title.length > 70 ? 63 : 76;
    await render(
      html(
        entry.lang,
        `body{width:1200px;height:630px;display:grid;grid-template-columns:${atmosphere ? "790px 410px" : "1200px"}}
        .copy{padding:64px 64px 50px;display:flex;flex-direction:column;min-width:0}
        .brand{display:flex;align-items:center;gap:15px}.brand img{width:64px;height:64px}.wordmark{font-size:50px;letter-spacing:-.035em}
        h1{font-size:${titleSize}px;line-height:1.06;letter-spacing:-.025em;margin:auto 0;overflow-wrap:break-word}
        .address{font-size:23px;letter-spacing:.02em;color:${fern};margin:0}
        .plant{width:410px;height:630px;object-fit:cover;object-position:60% center;border-left:1px solid #d8d6c9}
        `,
        `<div class="copy"><div class="brand"><img src="${icon}" width="64" height="64" alt=""><span class="wordmark">lilora</span></div><h1>${escape(title)}</h1><p class="address">lilora.app</p></div>${atmosphere ? `<img class="plant" src="${atmosphere}" width="410" height="630" alt="">` : ""}`,
      ),
    );
    const clipped = await page.locator("h1").evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.bottom > 525 || element.scrollWidth > element.clientWidth;
    });
    if (clipped) throw new Error(`Share card title overflows: ${entry.path}`);
    save(
      file,
      await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 1200, height: 630 },
      }),
    );
  }
  save(cachePath, JSON.stringify(nextCache, null, 2) + "\n");
  console.log(
    `Promotion assets: ${qrManifest.length} QR codes, 12 print PDFs, ${share.pages.length + share.defaults.length} share cards. ${generated.length} files written; unchanged renders reused.`,
  );
} finally {
  await browser.close();
}
