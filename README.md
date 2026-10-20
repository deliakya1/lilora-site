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

## Google Analytics and custom cookie preferences

The owner supplied GA4 web measurement ID `G-2CYS6B75ET` on 16 October 2026.
`assets/analytics-config.js` configures that ID. The custom bilingual manager in
`assets/analytics.js` does not load Google or send requests until explicit opt-in.
The initial banner offers equal-weight accept/reject controls and preferences.
The footer always reopens the native modal dialog; keyboard focus is contained,
Escape closes it, and focus returns to its opener. Necessary preference storage is
separate from optional analytics. No marketing category is invented.

Preferences are stored as a versioned object under `lilora.cookie-preferences.v2`
with a choice and timestamp, valid for 180 days. A changed version or expired choice
asks again. A new in-page choice outranks any stale saved grant. Denials also use a tab-scoped
`lilora.cookie-preferences.v2.denied` sessionStorage record, so a read-only
localStorage grant cannot reactivate analytics on same-tab navigation. If neither
store can persist denial, tracking is stopped in place and no automatic reload
occurs; the UI asks the visitor to clear saved site data before leaving/reloading. Both languages use the same preference.
Cross-tab withdrawal uses storage events and, where supported, a same-origin
BroadcastChannel for denials even when writes fail. Another tab's grant cannot
overwrite a denial already made in the current document/tab.

Withdrawal sets GA's disable flag, clears the pending queue, removes accessible
owned `_ga` cookies where possible, and reloads without Google only when denial persistence has been verified.
Without durable denial it stays on the current page with GA disabled; a later
explicit re-grant requires recovered persistence and a clean load. It does not claim
to erase data previously processed by the provider. Cookie deletion does not touch
unrelated cookies. Both website privacy sections document actual behavior; the
mobile app's no-analytics-SDK statement remains explicitly scoped to the app.

Basic consent permits analytics storage only after opt-in and denies ad storage,
ad user data and ad personalization. Google signals and ad personalization are
disabled. URLs omit queries/fragments and referrer text is blank. Manual pageviews
are emitted once per static navigation. Information CTAs use `app_info_click`;
`app_store_click` is reserved for a verified App Store destination, and neither
claims an installation. Cookie lifetime is configured to 180 days without renewal
on each visit. No visitor-provided text is included in custom events.

The GA property dashboard, Enhanced Measurement settings, and server-side retention
were not accessible from this environment. The owner should review those property
settings, including disabling unwanted Enhanced Measurement events. No dashboard
receipt or end-to-end Google collection result is claimed. The static site has no
visitor-text forms or search fields; activation tests intercept Google requests.

Run `node scripts/consent-check.cjs` with Playwright/Chromium available. It tests
initial, reject, accept, reload, revoke, cookies, both languages at 320/1440 pixels,
keyboard focus, duplicate script/listeners, sanitized events, blocked storage and
cross-tab changes. Run `node scripts/consent-persistence-check.cjs` for readable-stale-grant
regressions: throwing and silently ignored writes, preference reopening, no unsafe
reload, cross-tab denial, persistence recovery and tab-scoped denial across pages.
Tests do not send production analytics hits.

## Initial validation and limits

- `npm run check`: four suites passed; 26 indexable URLs, 20 generated editorial pages.
- Browser: all 26 URLs at 360, 768 and 1440 pixels (78 layout checks); no horizontal
  overflow, missing images or JavaScript errors. Local screenshots reviewed.
- Consent: default-off, decline, persistence, opt-in, withdrawal, sanitized URL,
  single page view and disabled advertising signals passed with intercepted requests; the custom manager also passed both languages,
  320/1440-pixel layouts, focus return/trapping, blocked storage and cross-tab revocation.
- Existing support/privacy URLs and content retained; website analytics disclosure
  added separately. Error page is noindex and no longer canonicalizes to the home page.
- Institutional and competitor sources were researched externally. Some source
  hosts and the public custom domain are blocked by this execution gateway, so a
  complete external HTTP sweep and direct production rendering remain separate
  verification limits. A gateway failure is not evidence that a public site is down.
- GA4 is configured with the owner-supplied ID and gated by consent. Receipt in the
  Google Analytics dashboard remains unverified; no analytics result is fabricated.

CI impact: existing GitHub Pages build/deploy only; no heavy/native/macOS workflows;
changes are confined to the standalone public website repository.

## Maintenance — 17 October 2026: bilingual missing-page recovery

`404.html` now provides clear Turkish and English recovery links to home, guides,
journal, comparisons and support, with language annotations and an English section
anchor. All destinations/assets are absolute site paths, so recovery works from
missing nested URLs. It retains `noindex, follow`, no false canonical or hreflang,
and no sitemap entry. Existing GA/consent code, hosting and app availability copy
are unchanged. The existing root-file convention follows
[GitHub's custom 404 documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

`node scripts/not-found-check.cjs` models Pages error responses locally: twelve
scenarios cover TR/EN missing paths, 320/768/1440px, JavaScript on/off, ten working
recovery links, language annotations and no overflow. Keyboard skip/section-link
checks run with JavaScript enabled; no-JavaScript checks verify rendered content
and destinations. This is a local model, not production-response evidence.
`npm run check` and the existing 78-check responsive audit also passed.
The production error-page probe remains blocked by the execution gateway's CONNECT
403 response; the site's own status cannot be inferred from that failure.

## Maintenance — 17 October 2026: compact consent prompt

The initial prompt now uses one short localized sentence, equal Allow/Reject
buttons and a Preferences control. Details and the privacy link remain in the
accessible preferences dialog. All controls retain at least 44px touch targets;
only banner copy/markup and scoped presentation changed. The GA configuration,
consent state machine and failed-storage safeguards are unchanged.

At 390px viewport width, the banner height decreased from 424px to 121px in both
languages; at 320px it decreased from 473px TR / 479px EN to 121px, and at 1440px
from 265px to 100px. Measurements use Chromium, normal text and an 844px viewport
height. `node scripts/compact-consent-check.cjs` passes 36 cases across both
languages, six widths (320–1440px), normal/200% text/long copy, keyboard Preferences
and direct opt-in. Existing consent and failed-storage regression suites and
`npm run check` also pass. Google requests are intercepted in all consent tests.

At the time of the compact-banner update, language followed the URL only.
The later approved language-selection update below supersedes that behavior.


## Maintenance — 17 October 2026: first-entry language selection

`assets/language.js` negotiates only an unchosen first entry to `/`. A saved manual
choice takes priority; otherwise a primary browser language of `tr` or `tr-*`
selects Turkish, and all other/missing languages select English. `/en/`, article
URLs and all other deep links remain authoritative, even against a saved choice.
Internal visits, reloads, back/forward navigation and later visits in the same tab
are not redirected. The automatic move uses `location.replace`, avoiding an extra
history entry. No country detection or external requests are used.

Native language anchors retain their real paired paths in static HTML. JavaScript
adds the current query/hash and a temporary `lilora_lang` marker to the switch URL;
the destination consumes that marker and cleans it from the address bar. This
protects deliberate switches even when storage is blocked. Local and session
storage use `lilora.language.v1`; a separate session marker prevents repeat entry
negotiation. Language preferences are independent of optional analytics. If both
stores are unavailable, switches work but future visits cannot reliably remember
the choice. Without JavaScript, each URL renders its complete static language and
native links still work. Canonicals, hreflang and sitemap are unchanged.

The language script runs before analytics; a redirecting source page skips consent
initialization to avoid a duplicate pageview for a previously consenting visitor.
The compact prompt and consent persistence/withdrawal code are otherwise unchanged.
Both website privacy sections explain necessary language preference storage.

Validation: `node scripts/language-check.cjs` covers 44 scenarios, including every
paired page, browser/missing language, saved choice, toggles, reload/back, blocked
storage, query/hash, no-JavaScript rendering and one analytics tag after negotiation.
Existing consent tests explicitly set browser locale to retain their TR/EN coverage.
CI impact remains the existing lightweight GitHub Pages build/deploy only.

## Maintenance — 17 October 2026: shared plant-care guide

Published complete English and Turkish guides at `/en/guides/shared-plant-care/`
and `/guides/shared-plant-care/`, with visible FAQ answers, organization byline,
real publication/review dates, Article/BreadcrumbList data, reciprocal language
links and sitemap entries. Both hubs include the guide; watering articles link
back to it. No FAQ rich-result claims or invented author credentials are used.

The four linked UMD, Illinois Extension and RHS source pages were opened and
checked on 17 October 2026. They support species/condition-dependent watering,
drainage and runoff disposal, root damage/wilting from excess moisture, and the
limits of holiday watering systems. The household workflow, records and handover
checklist are explicitly original editorial advice, not tested customer outcomes.

Product wording was checked against existing care, care-event, plant-detail and
household-store source. Checked/watered care supports notes and actor/time history;
snoozing updates the plant's reminder and does not create a completed care entry.
The article states this distinction. Caretaker/backup arrangements are household
agreements. Existing awaiting-review availability copy and information CTAs remain.
No app, backend, hosting, consent or language-selection implementation changed.

`shared-care-diagram.mjs` creates an original accessible HTML/CSS diagram using
existing Paper, Ink, Fern and Terracotta tokens, Newsreader headings and system
body text. Text reflows on narrow screens; pending checks use a dashed border and
explicit words, with no completion symbol. It is labeled as an educational diagram,
not an app screenshot. No generated image, stock photo or external asset is used.

Validation passed: build/static SEO/link checks; all 28 pages at three widths
(84 responsive checks); 46 language-selection scenarios including the new pair;
consent lifecycle and stale-grant/failed-storage regressions. New article and diagram
screenshots were inspected in both languages at 320/390/1440px, with additional
FAQ/outcome and enlarged-text checks at 320/1440px. Direct production HTTP probing
was blocked by this environment's CONNECT 403 gateway; it is not site-response evidence.

## Maintenance — 18 October 2026: expandable article contents

Audit started from clean `main` commit `3dcd2ea`; no concurrent website edits or
additional local skill instructions were present. Static checks cover all 28 routes,
internal links/assets/fragments, canonical and reciprocal language metadata,
Article/BreadcrumbList data, sitemap and availability/analytics assertions. This
pass adds no care, product, pricing or availability claims and does not change
article review dates. Existing primary-source citations and approved artwork stay
in place; no new imagery is needed for this navigation improvement.

The contents list previously occupied 447px TR / 424px EN on the shared-care guide
at a 390px viewport. All fourteen article pages now use a native `details`/`summary`
control, initially closed on mobile and desktop, occupying 50px in that check.
Section links remain in the HTML. Readers can open and close the list by keyboard
or pointer without JavaScript; summary and section links have at least 44px touch
targets. Existing focus styling uses Lilora tokens. The native interaction follows
[MDN's details element documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details),
checked 18 October 2026. No new client script or third-party service was added.

`node scripts/contents-check.cjs` verifies all fourteen articles at 320/390/1440px,
with JavaScript both on and off, keyboard toggling, source-section navigation,
closed-state content, overflow and touch targets. Existing responsive, language,
consent and failed-storage checks remain applicable. The direct public HTTPS probe
still returns the execution gateway's CONNECT 403; this does not report the site's
own HTTP status. CI impact: existing GitHub Pages build/deploy only.

Results: 84 contents interaction checks passed, plus 84 whole-site responsive
checks, 46 language-selection scenarios, consent lifecycle and failed-storage
regressions, and build/static validation. Enlarged contents text was also checked
at 200% on a narrow viewport. Open lists scroll naturally rather than remaining
sticky beyond the viewport. All checks are local Chromium evidence; public delivery
requires a separate successful production probe.

## Maintenance — 19 October 2026: preserve answer citations

Started from clean website `main` commit `008f6ea`, with no concurrent edits or
additional local skill instructions. The audit found that the importer removed
Markdown links from short answers: the English watering summary named its source
but did not let readers follow it. Short answers now use the same HTML paragraph
and link conversion as article sections, while retaining their plain-text form in
the data. The matching citation was added to the Turkish summary. A regression
check compares published summary links against the original Markdown destinations.

The existing University of Maryland Extension watering page was opened on
19 October 2026 and checked against the unchanged summary's needs-based watering,
moisture/weight observation and drainage claims. This is a citation/rendering fix,
not a new horticultural recommendation or an article-wide re-review; publication
and review dates remain unchanged. No app launch, feature or price claim changed.
Existing awaiting-review copy, approved artwork and brand tokens remain in place.

Changed public pages:
- https://lilora.app/guides/watering-houseplants/
- https://lilora.app/en/guides/watering-houseplants/

Build/static validation includes canonical/hreflang, schema, sitemap, links and
availability assertions. Both citation layouts and focus were checked at 320 and
1440px with JavaScript on/off. The direct public HTTPS probe remains blocked by
this environment's CONNECT 403 gateway; that response is not the site's status.
CI impact: existing GitHub Pages build/deploy only. Consent, GA configuration,
language selection, expandable contents, hosting and security settings are unchanged.

## Maintenance — 20 October 2026: honor related-reading priority

Started from clean website `main` commit `e09fa71`; no concurrent edits or additional
local skills were present. The recommendation builder treated every listed related
article as equally ranked, retaining publication order instead of editorial order.
Consequently, the watering guide's first recommendation, shared plant care, was
omitted from the three published cards. The builder now honors manifest order,
excludes the current article, and fills remaining slots in publication order.
Regression checks verify published priorities in both languages and reject unknown,
duplicate or self-referencing recommendations.

Changed public pages:
- https://lilora.app/guides/watering-houseplants/
- https://lilora.app/en/guides/watering-houseplants/

The original editorial choices, care/product claims, dates, imagery and metadata
are unchanged. No new factual content or launch claim was added. Consent, GA ID
`G-2CYS6B75ET`, denial safeguards, language selection and expandable contents remain
unchanged. Both card layouts, keyboard focus and the shared-care destination were
checked at 320/1440px. Build checks cover links, schema, canonical/hreflang and sitemap.
The public HTTPS probe still fails at the environment gateway with CONNECT 403;
this is not the public site's HTTP status. Existing GitHub Pages deployment only.

## Prompt 01 — 20 October 2026: legal and support corrections

Source branch: `codex/site-01-legal`, based on clean `main` `c8c0254`.
No open PRs or remote `codex/site-*` branches existed at the ownership check.
This prompt owns the two privacy and two support pages and editorial Markdown
text corrections; the existing build generated the affected articles and hubs.
Global templates, CSS files, language logic and manifest metadata remain owned
by prompt 03. The existing GitHub Pages route is retained.

Privacy now has one dated update, seven plain summary points, the controller,
separate KVKK/GDPR rights and complaint routes, purpose/data/legal-basis and
retention tables, and a provider-by-provider transfer table. Both languages have
matching section anchors, including `#rights`, `#rights-kvkk`, `#rights-gdpr`,
`#retention` and `#international-transfers`. Contact is last. Tables have captions,
scoped headers, a visible horizontal-scroll hint and keyboard-focusable overflow
regions. Styles are local to the owned privacy documents.

Read-only verification on 20 October 2026 confirmed the verified `lilora.app`
Resend sending domain, sending enabled, tracking off, and `eu-west-1`; both
Supabase projects report `eu-central-1`. App labels, AI permission text and the
09:00 device-local reminder implementation were read against app `main`
`e67a024`. The app status still records build 12 awaiting review with manual
release. No public availability is inferred.

Sources checked: [Resend GDPR](https://resend.com/security/gdpr),
[Resend DPA](https://resend.com/legal/dpa),
[Supabase DPA](https://supabase.com/legal/dpa),
[Supabase plan retention](https://supabase.com/pricing),
[Pl@ntNet API terms](https://my.plantnet.org/terms_of_use),
[KVKK rights/application guidance](https://www.kvkk.gov.tr/Icerik/6938/Kurumumuza-Yapilan-Sikayetlerin-Usul-Sartlarina-Iliskin-Kamuoyu-Duyurusu),
[EDPB rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en),
[EDPB legal bases](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en),
[GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement),
[Google transfers](https://policies.google.com/privacy/frameworks),
[Google retention](https://support.google.com/analytics/answer/7667196),
[Apple privacy](https://www.apple.com/legal/privacy/en-ww/) and
[Namecheap privacy](https://www.namecheap.com/legal/general/privacy-policy/).
Resend states US storage despite Ireland sending, 30-day email/log retention on
standard plans, EU SCCs/DPF, and refusal of Türkiye-specific standard contracts.
Pl@ntNet receives JPEG bytes and language from the current adapter, not image URLs.
No claim of EU-only processing, Supabase DPF certification or KVKK contracts is made.

Owner follow-up: confirm the proposed processing legal bases. Purchase fulfillment
uses contract; fraud prevention is separate legitimate-interest processing, following
the EDPB distinction. Optional identification permission is described by the actual
app explanation, without inventing legal-transfer consent. Resolve KVKK Art. 9
routine-transfer grounds, provide a postal address for written requests, decide
whether GDPR Art. 27 representation is required, and review the 4+ store rating
alongside the unchanged under-13 audience statement. Legal review is recommended
before broad launch; drafting is not legal advice.

Verification limits: no authenticated Chrome/GA dashboard tool is exposed here.
The tools do not expose Supabase Auth SMTP configuration, current billing-plan/log
retention settings or GA4 property retention. Thus SMTP in each project, effective
Supabase operational/auth log durations and the GA4 setting need dashboard checks.
The policy describes plan/configuration-dependent retention without assumed numbers.
No dashboard settings changed. The production HTTPS probe is blocked by the
execution gateway's CONNECT 403; this is not the site's HTTP status. Deployment
and any direct production-page checks must be reported separately.

Support now matches the actual identification entry and purchase route, 09:00 local
reminders, language selection, DELETE/SİL confirmation, subscription cancellation
and permanent household-wide plant deletion. Both languages link to privacy rights.
Shared-care titles use sentence case; Turkish uses the sen voice; snoozing creates
no care entry to annotate. Drafts use the requested outcome/identification terms;
the watering guide is metric first. Editorial research dates are unchanged.

Prompt 03 handoff: replace remaining `tanımlama` in the two comparison descriptions
in `editorial/manifest.json`; align the generated diagram's outcome labels in
`scripts/shared-care-diagram.mjs`; implement the owner-confirmed NO for automatic
first-visit redirects with the planned suggestion/dropdown language controls. Those
paths were not rewritten by prompt 01.

Validation: `npm run check` passes build plus six static tests, including links,
metadata, schema, sitemap and availability. All seven existing `scripts/*.cjs`
suites are required; responsive (84), compact consent (36), consent lifecycle,
failed-storage consent, language (46), 404 (12) and article contents (84) cover the
site. The default contents run and isolated default rerun timed out on a native
no-JavaScript anchor click. All 84 checks passed using `CHROMIUM_PATH` with a
Chromium wrapper enabling the system reduced-motion preference. Targeted native
anchor checks passed with both baseline and current HTML; no repository test or
assertion was changed. The default-mode timing issue remains a prompt 03 test
harness follow-up. The four legal/support
pages were visually inspected at 390/1440px; eight additional layout checks verify
anchors, table keyboard scrolling, enlarged text and zero third-party requests.
CI impact: one coherent PR/squash publication through the existing Pages pipeline;
no workflow, hosting, DNS, app, backend, billing or store change.

<!-- site-prompt-01: done -->
