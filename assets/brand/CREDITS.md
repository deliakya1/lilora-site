# Lilora promotion asset sources

Prepared on 20 October 2026 for prompt 04. These files are local renderings, not
AI-generated app screens or newly drawn brand marks.

- `qr/*.svg`: generated offline with `qrcode` 1.5.4 from the stable, localized
  Lilora download URLs. Ink on Paper, four-module quiet zone, error correction M.
  `qr/manifest.json` records every encoded URL and placement context. The print
  layouts use 30 mm (A6) or 48 mm (A4) QR squares at actual print size.
- `print/lilora-<lang>-a6.pdf` and `print/lilora-<lang>-a4.pdf`: localized HTML/CSS
  rendered to single-page PDF using Playwright and local Chromium. No external
  font, script, image, tracking or rendering service is used.
- `share/*.png`: 1200 × 630 localized page-title cards rendered from HTML/CSS.
  `share-manifest.json` records the page/language mapping and six defaults.
- The plant-tag icon comes unchanged from the site's approved `assets/icon.png`.
  `assets/apple-touch-icon.png` is its 180 × 180 size derivative. No logo or
  wordmark has been generated or redrawn.
- The display typeface is the existing Newsreader Medium, licensed under the
  SIL Open Font License in `assets/Newsreader-LICENSE.txt`.
- The atmospheric plant image is `assets/images/home/window-hero-v1-640.webp`.
  Its generated-image provenance and prompt are recorded in
  `assets/images/CREDITS.md`. It is illustrative imagery, not a customer's plant
  photo, a diagnostic specimen or an app screenshot.

The current prints describe an app awaiting App Store review. Their QR URLs remain
stable after launch, but the printed availability copy should be refreshed before
printing a new batch after launch. Print at actual size; do not trim the QR's quiet
zone. No Apple download badge or App Store destination is embedded in these
prelaunch assets.

Rebuild with `npm run build`. The asset generator embeds all render inputs, blocks
network requests and caches render fingerprints from the script, copy, font, icon
and image. A missing optional atmosphere image leaves a usable Paper layout.
The generator never modifies app artwork or a third-party badge.
