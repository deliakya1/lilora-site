# CJK export fallback

`DroidSansFallback.ttf` is the Droid Sans Fallback font embedded in the locally
installed MuPDF/PyMuPDF runtime. The font bytes were extracted unchanged through
`fitz.Font("cjk").buffer`; no font was downloaded or synthesized. It supplies
Japanese, Korean and Traditional Chinese glyphs for local promotion exports.
The approved Newsreader face remains the Latin heading/wordmark font.

- Family in the embedded name table: Droid Sans Fallback, Regular.
- Extraction runtime: PyMuPDF 1.26.6.
- SHA-256: `ee38813ea00c3e32add4268fff7fff9e39417b4913cb13be2415164a47807cc2`.
- Upstream font provenance: Android DroidSansFallback, as identified in the
  installed MuPDF `mupdf/fitz/config.h` header.
- Font license: Apache License, Version 2.0. A complete copy is in
  `DroidSansFallback-LICENSE.txt`.
- Primary upstream license inventory explicitly covering DroidSansFallback.ttf
  and DroidSansFallbackFull.ttf:
  https://chromium.googlesource.com/chromium/src/+/accb28ab5/third_party/blimp_fonts/LICENSE
- Android's font directory also carries `MODULE_LICENSE_APACHE2` and `NOTICE`:
  https://android.googlesource.com/platform/frameworks/base/+/master/data/fonts/

The embedded font retains its supplied name table (family/style only). The font's
separate Apache license is distinct from the MuPDF software license. The website
contains font data, not MuPDF executable code. Font subsets embedded by the PDF
renderer are generated from this same local file.
