# Lilora website

Official bilingual Lilora website, journal, care guides, comparison articles,
support and privacy information. Turkish is rooted at `/`; English at `/en/`.
The existing GitHub Pages deployment serves the repository root from `main`.
`CNAME` remains `lilora.app`; `.nojekyll` keeps this a plain static site.

## Edit and verify

Requires Node 22+ and Python 3; production has no runtime dependency or client framework.

1. Edit reviewed article Markdown in `editorial/drafts/` and its metadata in
   `editorial/manifest.json`. The directory name is a working-source convention:
   every entry in the manifest is published. Unlisted drafts are not rendered.
2. Include both complete `en` and `tr` bodies. Use sentence case, plain language,
   inline primary-source links, a meaningful answer, and distinct sections.
3. Run `npm run check`. This imports Markdown, builds static pages and sitemap,
   then checks routes, local links/fragments, languages, metadata and JSON-LD.
4. Serve with `python3 -m http.server 4173 --bind 127.0.0.1` and inspect mobile and
   desktop. With Playwright and Chromium available, run
   `node scripts/browser-check.cjs`. `CHROMIUM_PATH` can override the browser binary.
5. Review `git diff`, commit sources **and generated HTML**, then push one coherent
   update to the existing `main` route. Verify GitHub Pages deployment and public
   URLs. Do not change Pages settings, DNS, app code or store records.

`editorial/articles.json` is generated from Markdown, not a second editing surface.
The static generator is `scripts/build.mjs`; existing home/support/privacy pages
remain explicitly maintained HTML. Generated editorial URLs are stable. Removing
an article from the manifest does not delete its existing HTML: decide whether to
retain, update, or intentionally retire that URL, then update the sitemap and links.

## Editorial rules

- Prefer institutional horticultural sources and official product documents.
- Comparisons are desk research, not hands-on testing. Disclose Lilora's interest.
  Do not fabricate ratings, expert credentials, accuracy, absent features or offers.
- A reminder prompts a check, not automatic watering. Do not diagnose from one sign.
- Keep review dates tied to real research or substantive revisions. Do not rotate
  dates or churn pages to simulate freshness. Avoid thin competitor doorway pages.
- Current availability is awaiting App Store review. Use information/support CTAs.
  Do not insert a download badge or App Store destination until the exact public
  listing is verified. Update all affected availability wording after verification.
- Preserve useful source-backed answers. Article and BreadcrumbList metadata match
  visible content. No fabricated Review ratings, FAQ rich-result promises or special
  AI-ranking files. Search inclusion and answer-engine citations are not guaranteed.
- Turkish translations belong at root; English belongs under `/en/`. Keep reciprocal
  hreflang only for real counterparts. Do not put an English body under a Turkish title.
- Use the approved Paper/Ink/Fern/Terracotta palette, Newsreader and system body font.
  No AI-generated final imagery, copied competitor graphics or unlicensed photos.
- All six articles in the initial expansion have original editorial copy and complete
  Turkish counterparts. Source facts should be rechecked before material updates.

## Assets

`assets/editorial/*.webp` are optimized exports of existing owner-approved Lilora
store artwork with genuine app screens and sample plant records. They are labeled
as artwork/sample data rather than live customer accounts or competing products.
Sources are the Lilora Figma file `bPJXvFWNCgxgyrSM4JVtam`, frames `180:65`
(English collection), `180:74` (English care) and `180:11` (Turkish collection).
No new app build or generated interface was used. Their embedded specimen photos
retain the existing CC0 provenance: Flora Tietze, *Monstera V*; Eric Schmidt,
*Ficus elastica 343432165*; Bhuvanaalla, *Beautiful money plant*, Wikimedia Commons.

Newsreader remains under its existing SIL Open Font License in
`assets/Newsreader-LICENSE.txt`. WOFF copies are compressed from the original TTF
files without changing glyph coverage. Artwork is 34–35 KB each; it includes
explicit dimensions and lazy loading below the first screen.

## Optional Google Analytics

**Disabled:** `assets/analytics-config.js` contains a null measurement ID.
No Google tag is requested and no analytics consent UI appears in this state.
The mobile app's separate privacy statements remain intact.

Activation requires the owner's verified GA4 **web** measurement ID and access to
confirm that the data stream is the intended Lilora property. Do not invent an ID,
create credentials, or enable advertising features. Before activation:

1. Verify the ID and stream. Disable Enhanced Measurement in that stream so it
   does not add uncontrolled outbound-link, form, search, scroll or history events.
2. Update both website privacy sections from the current disabled-state wording to
   accurate active-service disclosure: Google Analytics provider, page/CTA events,
   cookie identifiers such as `_ga`, consent preference stored in localStorage,
   retention/property choices and Google's privacy information. Confirm those
   property choices instead of inventing retention settings.
3. Set only the verified ID in `assets/analytics-config.js`; repeat consent tests.
   Production activation is a separate coherent commit after those values exist.

Basic consent loads the Google script only after an explicit opt-in; declining
sends no Google requests. The footer offers a preference control and withdrawal.
Withdrawal disables GA, clears visible `_ga` cookies and reloads without the tag.
URLs exclude query strings and fragments; referrer is blank; Google signals and
ad personalization are disabled. Static navigation sends one manual page view.
Information CTAs use `app_info_click`, not a download event. `app_store_click` is
reserved for a real `apps.apple.com` link; neither event claims an installation.
Consent tests use a synthetic ID and intercept all Google network requests.

## Initial validation and limits

- `npm run check`: four suites passed; 26 indexable URLs, 20 generated editorial pages.
- Browser: all 26 URLs at 360, 768 and 1440 pixels (78 layout checks); no horizontal
  overflow, missing images or JavaScript errors. Local screenshots reviewed.
- Consent: default-off, decline, persistence, opt-in, withdrawal, sanitized URL,
  single page view and disabled advertising signals passed with intercepted requests.
- Existing support/privacy URLs and content retained; website analytics disclosure
  added separately. Error page is noindex and no longer canonicalizes to the home page.
- Institutional and competitor sources were researched externally. Some source
  hosts and the public custom domain are blocked by this execution gateway, so a
  complete external HTTP sweep and direct production rendering remain separate
  verification limits. A gateway failure is not evidence that a public site is down.
- No GA4 measurement ID has been supplied; analytics is not active.

CI impact: existing GitHub Pages build/deploy only; no heavy/native/macOS workflows;
changes are confined to the standalone public website repository.
