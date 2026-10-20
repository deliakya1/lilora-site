# Lilora promotion assets

The website is still in its prelaunch state. These files do not announce public
App Store availability.

## Rebuild

Run `npm ci`, then `npm run build` with Node 22+, Python 3 and an existing Chromium
installation. Set `CHROMIUM_PATH` when the browser is not in a standard location.
The pinned `playwright-core` dependency does not install a browser. All rendering
and QR generation happen locally; production remains committed static files on
the existing GitHub Pages route.

- `artwork/`: 24 unchanged real Figma compositions for iPhone/iPad and English/Turkish,
  with source nodes, hashes and credits. These are press downloads, not eager page
  resources. Responsive WebP previews are in `../images/home/`.
- `qr/`: six languages × home, download, A6 and A4 contexts. Ink on Paper, four-module
  quiet zone. Every QR points to its language's stable `/download/` page with
  `utm_source=qr`, a context-specific `utm_medium`, and `utm_campaign=prelaunch`.
- `print/`: localized A6 cards and A4 posters. Print at actual size. The QR occupies
  30 mm on A6 and 48 mm on A4. Refresh status text after launch; existing QR
  destinations remain valid.
- `share/`: 1200×630 PNG cards for every public page plus a default for each language.
  The page title is rendered with the local Newsreader font; the icon is the
  existing approved asset. These are social metadata images, not page-load assets.
- `share-manifest.json`: generated page titles and exact card destinations.
- `asset-fingerprints.json`: content fingerprints for repeatable asset rendering. Inputs
  include the renderer, title/copy, fonts, original icon and illustrative image.

See [credits](CREDITS.md), [artwork provenance](artwork/CREDITS.md) and
[generated illustration credits](../images/CREDITS.md).

## App Store badges at launch

No Apple badge, Smart App Banner or Lilora App Store link is rendered before the
public listing is verified. The owner supplied localized Apple badge files for the
launch step; those attachments were not readable in this execution environment,
so no unverified replacement was added.

Use original Apple artwork matching `tr`, `en`, `es`, `de`, `pt-BR` and `fr`.
Apple lists Portuguese and Brazilian Portuguese separately: the supplied `PTPT`
files must not stand in for the site's Brazilian Portuguese. Italian is not a site
locale. Do not redraw or translate a badge.

The [official Apple marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/)
were reviewed on 20 October 2026. Prefer the black badge, preserve its proportions,
use at least 40 px screen height and one-quarter-height clear space, and follow
Apple's artwork and trademark-credit requirements when the launch step enables it.
No licence agreement or account setting was changed during this website task.
