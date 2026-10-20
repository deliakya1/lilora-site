import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright-core";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const languages = ["tr", "en", "es", "de", "pt", "fr"];
const contexts = ["home", "download", "a6", "a4"];
const prefix = (lang) => (lang === "tr" ? "/" : `/${lang}/`);

test("24 offline QR SVGs decode to stable, language-matched URLs with four-module quiet zones", async () => {
  const browserPath =
    process.env.CHROMIUM_PATH ||
    [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ].find(existsSync);
  const browser = await chromium.launch({
    ...(browserPath ? { executablePath: browserPath } : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const manifest = JSON.parse(readFileSync("assets/brand/qr/manifest.json"));
  assert.equal(manifest.length, 24);
  try {
    for (const lang of languages) {
      for (const context of contexts) {
        const file = `assets/brand/qr/${lang}-${context}.svg`;
        const svg = readFileSync(file, "utf8");
        const encoded = Buffer.from(svg).toString("base64");
        const pixels = Number(svg.match(/width="(\d+)"/)[1]);
        await page.setViewportSize({ width: pixels, height: pixels });
        await page.setContent(
          `<style>body{margin:0}img{display:block}</style><img width="${pixels}" height="${pixels}" src="data:image/svg+xml;base64,${encoded}">`,
        );
        await page.waitForFunction(
          () =>
            document.images[0].complete && document.images[0].naturalWidth > 0,
        );
        const png = PNG.sync.read(await page.screenshot());
        const result = jsQR(
          new Uint8ClampedArray(png.data),
          png.width,
          png.height,
          { inversionAttempts: "dontInvert" },
        );
        const expected = `https://lilora.app${prefix(lang)}download/?utm_source=qr&utm_medium=${context}&utm_campaign=prelaunch`;
        assert.equal(result?.data, expected, `${lang}/${context}`);
        assert.equal(
          manifest.find(
            (item) => item.lang === lang && item.context === context,
          )?.url,
          expected,
        );
        const modules = Number(svg.match(/viewBox="0 0 (\d+) \d+"/)[1]);
        const quietZone = (pixels / modules) * 4;
        const isPaper = (x, y) => {
          const i = (y * png.width + x) * 4;
          return (
            png.data[i] === 247 &&
            png.data[i + 1] === 243 &&
            png.data[i + 2] === 236 &&
            png.data[i + 3] === 255
          );
        };
        for (let p = 0; p < pixels; p++) {
          for (let q = 0; q < quietZone; q++) {
            assert.ok(
              isPaper(p, q) &&
                isPaper(q, p) &&
                isPaper(p, pixels - q - 1) &&
                isPaper(pixels - q - 1, p),
              `${file}: quiet zone interrupted`,
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
});

test("all print PDFs are single-page A6/A4 documents", () => {
  for (const lang of languages) {
    for (const format of ["a6", "a4"]) {
      const path = `assets/brand/print/lilora-${lang}-${format}.pdf`;
      const pdf = readFileSync(path).toString("latin1");
      assert.ok(pdf.startsWith("%PDF-"), path);
      assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, 1, path);
      const box = pdf.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
      assert.ok(box, path);
      const mm = format === "a6" ? [105, 148] : [210, 297];
      const expected = mm.map((value) => (value / 25.4) * 72);
      assert.ok(Math.abs(Number(box[1]) - expected[0]) < 1, path);
      assert.ok(Math.abs(Number(box[2]) - expected[1]) < 1, path);
    }
  }
});

test("every share card and locale default is 1200×630; the touch icon is 180×180", () => {
  const manifest = JSON.parse(readFileSync("assets/brand/share-manifest.json"));
  const routes = JSON.parse(readFileSync("editorial/routes.json"));
  assert.equal(manifest.pages.length, routes.length + 1);
  assert.equal(manifest.defaults.length, 6);
  for (const page of [...manifest.pages, ...manifest.defaults]) {
    assert.ok(languages.includes(page.lang));
    const png = PNG.sync.read(readFileSync("." + page.image));
    assert.equal(png.width, 1200, page.image);
    assert.equal(png.height, 630, page.image);
  }
  const touch = PNG.sync.read(readFileSync("assets/apple-touch-icon.png"));
  assert.equal(touch.width, 180);
  assert.equal(touch.height, 180);
  const webmanifest = JSON.parse(readFileSync("site.webmanifest"));
  assert.equal(webmanifest.start_url, "/");
  assert.equal(webmanifest.display, "browser");
  assert.deepEqual(webmanifest.icons, [
    {
      src: "/assets/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
      purpose: "any",
    },
  ]);
});
