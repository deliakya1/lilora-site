# Lilora promotion assets

The website is in its prelaunch state. These files do not announce public
App Store availability. Promotional copy follows the ten website languages in
[`config/languages.json`](../../config/languages.json); the mobile app itself
remains English/Turkish. English page destinations use `/`, Turkish uses `/tr/`,
and Traditional Chinese uses `/zh-hant/`. File names retain the registry code,
including `zh-Hant`.

## Standard rebuild

Run `npm ci`, then `npm run build` with Node 22+, Python 3 and an existing Chromium
installation. Set `CHROMIUM_PATH` when the browser is not in a standard location.
The pinned `playwright-core` dependency does not install a browser. The final
build step, `scripts/promotion-assets.mjs`, renders the assets locally. After a
current content/site build, `npm run build:assets` runs that renderer alone.
Production remains committed static files on the existing GitHub Pages route;
Pages does not run the renderer.

The generators read `config/languages.json` through the shared locale registry.
Japanese, Korean, Italian and Traditional Chinese print copy is loaded from
`locales/<lang>.extras.json` through `scripts/locale-extras.mjs`; existing source
copy remains authoritative. Keep translated availability text, app-language
limits, QR captions and actual page destinations in sync.

## Output contract

- `artwork/`: 24 unchanged real Figma compositions for iPhone/iPad and
  English/Turkish, with source nodes, hashes and credits. These are press downloads;
  responsive WebP previews are in `../images/home/`. Extra website languages do not
  create translated app screenshots.
- `qr/`: **40 SVGs**, ten languages × home, download, A6 and A4 contexts. Ink on
  Paper with a four-module quiet zone. Every QR points to its language's canonical
  `download/` page with `utm_source=qr`, a context-specific `utm_medium`, and
  `utm_campaign=prelaunch`. For example, English uses `/download/`, Turkish
  `/tr/download/`, and Traditional Chinese `/zh-hant/download/`.
- `print/`: **20 one-page PDFs**, a localized A6 card and A4 poster per language.
  Print at actual size: 105×148 mm for A6 and 210×297 mm for A4. The QR occupies
  30 mm on A6 and 48 mm on A4. Refresh status text after launch; existing QR
  destinations remain valid.
- `share/`: **571 PNGs at 1200×630** for the current content set: 560 canonical
  pages, the 404, and ten language defaults. These are social metadata images.
  Latin headings use Newsreader; CJK headings use a local font with the required
  glyph coverage. The approved icon and existing illustrative image are retained.
- `share-manifest.json`: generated page titles and exact card destinations; it
  must match the current site build before rendering.
- `qr/manifest.json` and `print/manifest.json`: exact destinations, formats,
  dimensions and QR specifications for the generated outputs.
- `asset-fingerprints.json`: content fingerprints used to reuse unchanged renders.
  Inputs include renderer, title/copy, fonts, original icon and illustrative image.
- `../apple-touch-icon.png`: the existing approved icon at 180×180 pixels.

See [credits](CREDITS.md), [artwork provenance](artwork/CREDITS.md),
[generated illustration credits](../images/CREDITS.md) and
[CJK export-font provenance/license](../fonts/README.md).

## Offline portable renderer

When the npm/Chromium renderer is unavailable, use the local fallback after the
content importer and site build have refreshed `share-manifest.json`:

```sh
python3 scripts/promotion-assets-portable.py --review-dir /tmp/lilora-promotion-review
```

Run this command from the repository root. The fallback requires Python packages
**ReportLab, Pillow, fontTools, PyMuPDF (`fitz`) and pypdf**. It also invokes Node's
built-in `fs` and `vm` modules to read existing print-copy literals; it requires no
npm package, Chromium installation or network request.

Its font inputs are bundled `assets/Newsreader-Medium.woff` and
`assets/fonts/DroidSansFallback.ttf`, plus local
`/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` and
`/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`. Font availability is checked
before rendering. Droid Sans Fallback supplies Japanese, Korean and Traditional
Chinese export glyphs; its provenance and Apache license are recorded in
`assets/fonts/README.md` and `DroidSansFallback-LICENSE.txt`. Website pages use
their locale-specific system-font stacks; the export font is for generated assets.

The fallback writes the same QR/PDF/PNG/icon destinations, manifests and fingerprint
file as the standard renderer, plus `portable-render-report.json`. It does not
write `site.webmanifest`. `--review-dir` stores PNG previews of the print pages
outside the published asset tree. `--only qr,print,share,icon` can select output
groups; for example, `--only print` limits rendering to print files. `--force`
regenerates cached outputs and should be reserved for an intentional asset refresh.

Both renderers preserve the supplied words, approved icon and source image.
The fallback uses DejaVu for Latin body text, so its typography can differ from
Chromium's system fonts. Review print previews and output diffs when switching
renderers. The ten-language migration deliberately retains unaffected existing
assets and their original fingerprints; a full render with a different engine
can change those files even when their source words have not changed.

## Verification and preservation

Validate the current outputs, including retained Chromium originals and new
portable files, without rewriting them:

```sh
python3 scripts/promotion-assets-portable.py --verify-only
```

This reads the actual SVG/PDF pixels to decode their QR payloads, verifies PDF
page count, dimensions and translated text, and fully decodes every PNG. The QR
verifier handles clean generated level-M matrices; it is not a camera or physical
print-scanning test. The 29 October 2026 read-only run passed for **40 QR SVGs,
20 PDFs, 571 share PNGs and one icon**. The migration preserves 368 unchanged
original outputs byte-for-byte: 343 share PNGs, 16 QR SVGs, eight print PDFs and
the icon. The remaining 264 outputs are new or changed for the migration.
These checks do not execute the website's browser or Lighthouse suites.

The standard website verification receipt is in the
[root README](../../README.md#current-migration-verification--29-october-2026).
All 16 CommonJS files were syntax-checked; the full Chromium suites and fresh
Lighthouse measurements were not run for this migration. Keep those limitations
separate from successful static-content and asset checks.

## App Store badges at launch

No Apple badge, Smart App Banner or Lilora App Store link is rendered before the
public listing is verified. The owner supplied localized Apple badge files for the
launch step; those attachments were not readable in the original execution
environment, so no unverified replacement was added.

Use original Apple artwork matching each website language: English, Turkish,
Spanish, German, Brazilian Portuguese, French, Japanese, Korean, Italian and
Traditional Chinese. Verify the supplied file's language variant before use.
Apple lists Portuguese and Brazilian Portuguese separately: `PTPT` files must not
stand in for the site's `pt-BR` locale. Do not redraw or translate a badge.

The [official Apple marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/)
were reviewed on 20 October 2026. Prefer the black badge, preserve its proportions,
use at least 40 px screen height and one-quarter-height clear space, and follow
Apple's artwork and trademark-credit requirements when the launch step enables it.
No licence agreement or account setting was changed during this website task.
