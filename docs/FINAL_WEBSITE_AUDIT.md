# Final website audit — PathSafe NWA

Completed 2026-10-24T04:19:35.231205+00:00 (2026-10-23 local audit session, America/Chicago). This is an audit of the current working tree, including the previously approved smart-search changes. No commit, push, deployment, credentials, default-route change, or new product feature was performed.

**Recommendation: GO for GitHub push and local CAC recording; NO-GO for public deployment of the current configuration.** The site passes the checks below, but production live routing deliberately refuses to run until an approved hosted/private HTTPS `VALHALLA_URL` is configured and its capacity/hosting behavior is validated. `npm run check:deployment` currently exits 1 for that missing configuration. This guard was preserved.

## 1. Pages and audit scope

Audited `/`, `/app`, `/methodology`, missing-page handling, `/api/locations`, `/api/compare`, `/icon.svg`, and `/opengraph-image`. Checked landing hero/problem/data copy, every unique internal link/anchor, primary buttons, form controls, route selection, disclosure panels, metadata, icons, history, direct app loading and refresh. Screenshots and raw findings are in `docs/screenshots/website-audit/` and `data/website-audit/`.

Responsive widths: **1440, 1280, 1024, 834, 768, 430, 390 and 375 pixels**. Baseline layouts include autocomplete suggestions. Expanded layouts include methodology technical details, recommendation reasoning, score explanation and live provenance.

## 2. Confirmed bugs and targeted fixes

| Finding | Fix | Regression evidence |
|---|---|---|
| One-gap cards said “1 … gaps”; a one-minute tradeoff said “1.0 minutes” | Use singular nouns for one gap and a displayed 1.0 minute | Server-rendered RouteCard test plus added assertion in the existing presentation test |
| Gateway HTML exposed raw JSON parser errors; malformed search results could reach rendering, and a missing comparison could appear to be an empty result | Show readable unavailable messages; require a result array and a nonempty live comparison; reject mock-shaped responses on the live path | Client unit tests and browser gateway/malformed-search recovery test |
| Default 404 had no `main#main` for the global skip link and no recovery link | Small branded not-found screen with the existing Header, main landmark, and home/app links | Real 404 status, accessibility scan and return-home browser test |
| Airport start label was hidden behind the overlaid legend at 834px; automatic resizing could leave a label outside the map | Measure the legend when fitting bounds, reserve bottom padding, fit without competing pan animation, and re-fit on resize with listener cleanup | Real airport geometry fixture; automatic 1440→834→375→1024 resize checks; final live map checks at all eight widths |

The before-fix airport screenshot is retained as `docs/screenshots/website-audit/airport-library-834-before.png`. Final screenshots use the corrected framing. No stylesheet redesign was needed.

## 3. Search findings

Rechecked **46 real API queries, zero API errors**. Exact names, aliases, misspellings, prefixes, street suffixes, expanded directions, punctuation, case, whitespace and reordered words resolve through the existing official City sources. Examples include `crstal bridges`, `bentonvile library`, `law pla`, `3809 S.W. Mistletoe Ave.`, `mistretoe 3809 sw`, and `Mistltoe Ave`.

All seven required negatives return no suggestions: XNA, Northwest Arkansas National Airport, Fayetteville airport, Rogers high school, New York, asdfghjkl, and random park nowhere. Creekside Park remains absent from the existing permanent City place catalog; its three variants correctly return no match. No coordinates were fabricated and no source was added.

Deduplication, 450ms debounce, keyboard selection, Escape/Tab, touch, cache reuse, late-response rejection and immediate selection invalidation are covered. Editing text disables Compare and removes the previous comparison. Selecting a suggestion is still mandatory. The source/ranking rules were preserved; the audit only improved malformed-response handling and added comments.

## 4. Representative live trip results

These were selected through the real website autocomplete and compared through `/api/compare` **after the automated checks passed**. Values came from the actual production analysis functions using the normal local development providers/caches. They were not injected into the manual walkthrough. E2E fault/layout fixtures are separately identified below.

Coverage/score/gaps columns use mapped infrastructure coverage percentage, integer Pedestrian Infrastructure Score and meaningful gap count. Time is provider seconds; distance is provider meters. “Chosen” means the algorithm's recommendation, which can remain the fastest route.

| Trip | Fastest coverage / score / gaps | Chosen coverage / score / gaps | Fastest → chosen seconds | Fastest → chosen meters | Result |
|---|---:|---:|---:|---:|---|
| Austin-Baggett Park → Lawrence Plaza | 74.64% / 69 / 3 | 96.39% / 94 / 1 | 1044.537 → 1049.290 | 1482.055 → 1474.055 | Alternative recommended |
| Library → Lawrence Plaza | 99.98% / 100 / 0 | 99.98% / 100 / 0 | 687.927 → 687.927 | 956.000 → 956.000 | Fastest retained |
| 3809 SW MISTLETOE AVE → Crystal Bridges | 81.30% / 61 / 15 | 81.30% / 61 / 15 | 8115.531 → 8115.531 | 11505.996 → 11505.996 | Fastest retained |
| Library → Memorial Park | 72.99% / 61 / 6 | 72.99% / 61 / 6 | 1900.667 → 1900.667 | 2674.514 → 2674.514 | Fastest retained |
| Bentonville Municipal Airport · Thaden Field House → Library | 47.87% / 34 / 7 | 68.30% / 54 / 7 | 2076.254 → 2195.673 | 2932.959 → 3082.960 | Alternative recommended |
| 300 N MAIN ST → 500 S MAIN ST | 99.06% / 99 / 0 | 99.06% / 99 / 0 | 688.024 → 688.024 | 971.034 → 971.034 | Fastest retained |
| 1509 SW A ST → 1601 SW A ST | 77.25% / 75 / 1 | 77.25% / 75 / 1 | 98.374 → 98.374 | 133.633 → 133.633 | One distinct route; no comparative badge |
| Bentonville Community Center → Crystal Bridges | 59.87% / 40 / 17 | 76.74% / 57 / 12 | 6094.478 → 6143.057 | 8710.154 → 8708.155 | Alternative recommended |
| 4208 E CENTRAL AVE → Lawrence Plaza | — | — | — | — | 422: all alternatives outside City Limits; no comparison |

The showcase remains **74.643698% → 96.389260%**, **69 → 94**, **3 → 1 gaps**, **+4.753 seconds** and **8 meters shorter** by provider distance. Its live headline remains “About 5 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.”

Mistletoe retains two supported routes and discloses one excluded city-boundary-crossing alternative. Its other retained route has 89.051307% coverage, score 71 and 9 gaps, but the 7.750509-point gain is below the unchanged 10-point minimum, so the fastest remains chosen. The edge trip returns 422 with valid-endpoint-specific boundary feedback, rather than blaming the locations or showing old/mock routes.

Changing only the starting endpoint from the showcase to Library → Lawrence Plaza was also rerun successfully; both fields were then cleared and other trips selected. The final `crstal bridges` search resolved correctly, and replacing the other endpoint with XNA disabled Compare and removed all old cards.

## 5. Routing and map findings

All returned/retained route geometries satisfy the existing full-segment City Limits check, including enclave crossings. Provider endpoint snaps remain within the existing 100m validation limit. Distinct alternatives retain the existing deduplication checks; no duplicate route IDs/cards or invented alternatives appeared. Walking speeds, distances and travel costs were plausible for the observed trips; long trips were also visually inspected.

Each card was selected and its map stroke/color verified. Endpoint labels were checked against the actual current start/destination, map boundaries and legend obstruction. **64 successful trip/viewport combinations** pass after the fix. Short-trip labels were also checked separately at 375 and 1440 pixels and did not overlap. Zoom, recenter, loaded tiles, attribution, resize, navigation and refresh remain usable; no Leaflet exception was observed.

## 6. Cards and recommendation content

Coverage, time, miles, integer scores, gap counts, covered/uncovered meters, progress meters and recommendation badges agree with API values. Fastest labels refer to the fastest retained wholly supported route. Clicking another card changes the highlight without changing the recommendation badge. A single route has no comparative badge or fabricated alternative. No NaN, Infinity, undefined or null text appeared.

The actual scoring formula, recommendation thresholds, 15m coverage tolerance, 20m gap minimum, 5m gap grouping rule, infrastructure eligibility and showcase coordinates are byte-identical to the pre-audit hashes. Coverage remains a proximity measure, not proof of connected or accessible infrastructure.

## 7. Methodology and CAC content

The landing page identifies route comparison, mapped pedestrian infrastructure and official City data in the hero. The fastest/infrastructure tradeoff is clear in the labeled preview and live recommendation. Source attribution and independent-project wording are visible.

Methodology copy matches the implementation: capsule intersections are unioned and geodesically weighted; overlapping eligible facilities count once; gaps and distance penalties match V1; qualifying alternatives require ≥10 percentage points gain, a strictly higher score, ≤5 added minutes and ≤125% time AND distance. Technical disclosures were opened and checked at every width.

No guaranteed-safety, crime, lighting, traffic/crash-risk, crossing-safety or ADA scoring claim was found. Natural-surface coverage is not represented as pavement or accessibility. No debug log or local filesystem path is rendered to users. Prototype scenario controls appear only in explicitly selected mock mode.

## 8. Live versus mock behavior

Landing mock values are labeled illustrative; the live app defaults to REAL DATA · V1. Real search/route failures do not become mock successes. Switching sources resets the comparison and selections; old mock cards do not survive a switch to live. The explicit fallback remains clearly labeled. Live response handling now rejects mock-shaped comparisons.

Browser regression tests inject clearly scoped fixtures/failures to exercise deterministic states. The final live walkthrough and prewarm use the real API, real source coordinates and normal caches. The airport test fixture retains captured real route geometry/metrics but omits infrastructure geometry for a compact layout-only test; application runtime imports none of these audit/test records.

## 9. Error-state verification

`data/website-audit/errors.json` records fault injection into the shared analysis pipeline and real API input rejection. Provider offline/timeout/malformed responses stay unavailable; City infrastructure failure identifies GIS loading; an empty provider yields no walking route; all unsupported alternatives yield the boundary-specific message. Invalid start, invalid destination, identical endpoints and XNA coordinates return 400. Gateway HTML and malformed search/compare JSON produce readable unavailable feedback and remain recoverable.

An independently confirmed empty ArcGIS inventory is valid zero mapped coverage with an explicit warning; missing, truncated or contradictory inventory fails closed. Existing unit tests cover null ID/count confirmation and malformed geometry. City Limits is a bundled official polygon snapshot, so an upstream City Limits service outage is not a runtime boundary-fetch dependency. Its current source metadata was reachable; no live boundary rule was disabled or relaxed.

## 10. Responsive and accessibility findings

All **25 baseline page/viewport scans** and **16 expanded-content scans** have zero horizontal overflow, clipped form controls, broken loaded images or reported WCAG A/AA violations. Screenshot review found the legend issue described above; no other redesign or spacing change was justified. Full-page images and contact sheets support visual review at the requested widths. Final landing captures additionally wait for every basemap tile to finish loading; see `data/website-audit/landing-tiles.json`.

Keyboard flow, focus outlines, skip links, headings/main landmarks, form labels, combobox selection, screen-reader ARIA labels, route-card buttons/meters and map control labels were checked. Touch selection passes in mobile browser tests. These are automated and keyboard checks; a dedicated VoiceOver/Safari session was not performed.

## 11. Browser, navigation and console findings

Clean Chromium contexts pass the complete suite and live walkthroughs. Installed Google Chrome successfully loads the landing map and completes a real live comparison without console errors, hydration errors, React warnings or uncaught exceptions. WebKit's browser binary is not installed; Safari/WebKit was not tested and is not claimed as verified.

All unique internal links/anchors resolve. Landing → app → methodology, browser back/forward, direct `/app`, refresh, missing-page recovery, favicon and Open Graph image were checked. Asset endpoints return 200; the missing page returns 404. The only console error in the representative live matrix is the intentional HTTP 422 resource-status notice for the rejected city-edge trip. No genuine application crash, failed application request indicating a bug, or repeated polling appeared.

## 12. Performance and caching

The multi-trip UI walkthrough made 16 location HTTP requests and 9 comparison requests; repeated client queries reused the suggestion cache. After input settled, API request counts stayed unchanged during the idle check. Provenance confirms ordinary warm route/GIS cache reuse. No per-keystroke full address download, background route polling or duplicate comparison submission was observed. Existing cache coalescing, expiry and failure-backoff tests pass. No speculative optimization was made.

## 13. Configuration and security

Only `.env.example` is tracked; no active `.env` file is present. `.gitignore` excludes actual environment files, `.next`, `.cache`, browser output and dependencies. A credential-pattern scan of tracked text files found no matching secret. Production client JavaScript contains no local user paths, `VALHALLA_URL`, or server filesystem module import. No credentials were created, rotated or printed.

`npm audit --omit=dev --json` reports **zero known production dependency advisories** at audit time. This is a dependency scan, not a penetration test. Configured routing credentials remain server-side; routing provenance strips URL query strings. City-query tokens are escaped/normalized; requests and selected coordinates are validated.

**Public-deployment blocker:** `npm run check:deployment` exits 1 because `VALHALLA_URL` is missing. The public Valhalla demo remains development-only. Before Vercel publication, provide/validate an approved HTTPS private/hosted provider, confirm City source permission/capacity, and verify production function/network limits and shared/ephemeral cache behavior as documented in `docs/DEPLOYMENT.md`. No configuration guard was weakened.

## 14. Files changed by this audit

Application changes (separate from the prior smart-search working-tree changes):

- `app/not-found.tsx`: missing-page landmark and recovery navigation.
- `components/RouteCard.tsx`: singular gap wording.
- `lib/presentation/recommendation.ts`: singular displayed minute wording.
- `lib/routes.ts`: readable malformed/unreadable response handling and live comparison shape guard.
- `components/LocationSearch.tsx`: unreadable/malformed result handling and selection-safety comment.
- `components/MapCanvas.tsx`: legend-aware fitting, deterministic resize framing and cleanup.
- `components/RouteExplorer.tsx`, `lib/geocoding/search.ts`, `lib/geocoding/validate.ts`, `lib/analysis/compare.ts`, `lib/server/cache.ts`, `app/api/compare/route.ts`: short explanatory comments only during this audit.

Verification/documentation additions: `tests/website-audit.test.ts`, `tests/website-audit.spec.ts`, `tests/fixtures/airport-map-comparison.json` and its explanation; the minute assertion in `tests/polish.test.ts`; `scripts/audit-website.ts`, `scripts/audit-website-errors.ts`; records in `data/website-audit/`; screenshots in `docs/screenshots/website-audit/`; and this report. Previous approved smart-search changes were retained, not reverted. No broad refactor, package update or source expansion occurred.

## 15. Comments added

Short comments explain normalized whole-word comparison, invalidating selected coordinates, server-side boundary rechecking, independent route filtering, using one shared analysis pipeline, coalescing upstream requests, keeping API error classes distinct, drawing selected routes last, reserving legend space and handling non-JSON gateway pages. Existing protected coverage/GIS/recommendation math and their explanatory comments were retained without changing protected files.

## 16. Tests added and final validation

Only confirmed-bug regressions were added: singular gap rendering; unreadable/malformed live comparison responses; browser gateway/search recovery plus 404 return navigation; and long airport-label framing after automatic resize. The existing presentation test gained a one-minute assertion. Baseline smart-search tests were preserved.

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS, TypeScript and prerendering included |
| `npm test` | PASS: 117 tests, zero failures |
| `npm run test:e2e` | PASS: 40 tests across four profiles, zero failures |
| `npm run demo:prewarm` | PASS: REAL DATA; approved showcase metrics retained |
| `npm run check:deployment` | EXPECTED FAIL: production `VALHALLA_URL` missing |
| Production dependency audit | PASS: zero reported advisories |
| Official source health | Five City service metadata endpoints returned 200 |
| Post-suite live walkthrough | Eight successful trip comparisons, one correctly rejected edge trip, fuzzy selection and XNA rejection |

The final browser suite ran against the local production build to avoid development hot-reload interference. Post-suite live checks ran in the ordinary local development configuration because production correctly blocks the unconfigured public provider. Earlier audit-harness selector/navigation timing errors were corrected; they were not counted as website bugs. No failing final app check was hidden.

## 17. Remaining limitations and readiness

- **GitHub push: GO.** Source checks pass and no credential-pattern hit/real environment file was found. This audit did not commit or push.
- **Vercel/public deployment: NO-GO.** Hosted/private routing configuration and production capacity/cache/function verification remain unresolved. Publishing the current configuration would leave live routing unavailable by design.
- **Local CAC recording: GO.** Prewarm the showcase, confirm REAL DATA · V1, and use the existing demo guide. The default remains Austin-Baggett Park → Lawrence Plaza with live-calculated values.
- Safari/WebKit and a dedicated assistive-technology session remain unverified. City named-place coverage is incomplete (including Creekside Park); the boundary is a dated official snapshot; provider/GIS/basemap availability and small live metric changes remain external limitations. Infrastructure coverage is not personal-safety or accessibility scoring.

**Final publishing decision: NO-GO for public publication until the documented production routing blocker is resolved.**
