# Approved CAC default — Austin-Baggett Park → Lawrence Plaza

Implemented and verified October 23, 2026. **Ready for local CAC recording. Not deployed.** The fixed supported live trip is now Austin-Baggett Park → Lawrence Plaza; arbitrary geocoding remains unsupported. The old school/library pair remains historical test evidence only.

## Verified City coordinates

Internal coordinate order is latitude, longitude. [Official City Common_Names layer 194](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194) supplies both points. Original evidence: [verified-pairs.json, pair-20](../data/demo-search/verified-pairs.json); runtime configuration: [demoLocations.ts](../data/demoLocations.ts).

| Location | Official OBJECTID | Official address | Latitude | Longitude |
| --- | ---: | --- | ---: | ---: |
| Austin-Baggett Park | 5 | 601 SE D ST | 36.36571210106438 | -94.20363133075323 |
| Lawrence Plaza | 67 | 214 NE A ST | 36.374649832783945 | -94.20753355872435 |

These are official facility points, not independently verified pedestrian entrances. Existing endpoint-snap validation remains active.

## Updated real analysis

| Metric | Fastest | Recommended PathSafe |
| --- | ---: | ---: |
| Mapped infrastructure coverage | 74.64369816% | 96.38925953% |
| Infrastructure score | 69 | 94 |
| Meaningful gaps | 3 | 1 |
| Provider time | 1044.537 seconds | 1049.290 seconds |
| Provider distance | 1482.055m | 1474.055m |
| Measured geometry length | 1482.449786m | 1474.910637m |

The alternative gains **21.74556136 percentage points**, adds **4.753 seconds**, is **8m shorter**, and gains **25 score points**. These values match the completed search at full stored precision; there is no observed change in route geometry or metrics. The third retained real candidate has 80.26834634% coverage, score 74 and three gaps; the unchanged recommendation selects the stronger first alternative.

The normal pipeline used the cached genuine Valhalla response retrieved **2026-10-23T22:18:57.031Z**, and fetched the two official GIS sources around the new trip at **2026-10-23T22:37:46.935Z / 22:37:46.794Z**. Subsequent prewarm and browser requests reused normal caches. No fixture or search snapshot was injected into runtime caches. Later provider or GIS updates can change these values.

Evidence: [direct pipeline result](../data/verification/cac-live-comparison.json), [actual browser API result](../data/verification/cac-browser-comparison.json), [prewarm log](../data/verification/cac-prewarm.log), [browser validation log](../data/verification/cac-browser-validation.log). The original Phase 2 fixture is preserved.

Geometry is genuinely different: only **50.10498763%** of the fastest route is within 5m of the recommendation (reverse direction: **50.36122364%** in the search). This corresponds to approximately **49.77%** geometric distinction. Runtime browser validation independently measured the fastest-direction overlap. This does not establish connectivity or crossing safety.

## Calculated recommendation copy

> About 5 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.

The expanded explanation reads:

> This route adds about 5 seconds while increasing mapped pedestrian infrastructure coverage from 74.6% to 96.4%.

Calculated factors highlight higher mapped pedestrian infrastructure coverage, fewer meaningful infrastructure gaps, and minimal additional travel time. The headline derives the seconds and coverage improvement from the selected and fastest live candidates. Regression tests vary both measurements and verify that the copy changes. No objective safety claim is made.

The landing preview and explicit mock fallback use separate illustrative geometry and rounded **75% / 96%** coverage, labeled **MOCK DATA**. Their measurements are never substituted for live results. The REAL DATA · V1 comparison renders 74.64% / 96.39% from the API.

## Files changed

- Fixed locations and illustrative fixture: `data/demoLocations.ts`, `data/mockRoutes.ts`.
- Default form/reset, supported-trip messages, preview and source labels: `components/RouteExplorer.tsx`, `components/ProductPreview.tsx`, `app/page.tsx`, `app/api/compare/route.ts`.
- Presentation-only live headline and mock explanation: `lib/presentation/recommendation.ts`, `lib/routes.ts`.
- Documentation: `docs/DEMO_GUIDE.md`, `README.md`, this report; `app/methodology/page.tsx` changes only the supported-trip name; the historical search report gains a notice linking here.
- Prewarm and verification tooling: `scripts/prewarm-demo.ts`, `scripts/verify-cac-demo.ts`, `scripts/capture-cac-demo.ts`; `scripts/audit-city-data.py` retains historical default hashes while allowing the explicitly approved location switch.
- Tests: `tests/routes.test.ts`, `tests/providers.test.ts`, `tests/polish.test.ts`, `tests/trail-audit.test.ts`, `tests/frontend.spec.ts`, `tests/accessibility.spec.ts`.
- Evidence: `data/verification/cac-*` snapshots/logs/protected-file manifest and `docs/screenshots/cac/` images.

**Analysis rules are unchanged.** Byte-for-byte hash checks cover scoring, recommendation, 15m coverage matching/gap analysis, baseline GIS classification, supplemental GIS eligibility and deduplication, inventory retrieval, and Valhalla behavior. The approved default-coordinate change is checked against official pair-20 evidence separately. There is no methodology change, scoring adjustment, new product feature or deployment.

## Validation and recording review

All requested commands passed:

- `npm run lint`
- `npm run build`
- `npm test` — **45 tests**
- `npm run test:e2e` — **12 browser/accessibility checks**, across laptop, tablet, desktop and mobile
- `npm run demo:prewarm` — **REAL DATA prewarm complete**, explicitly naming Austin-Baggett Park → Lawrence Plaza

Additional unmocked browser checks confirmed new input/location labels, REAL DATA · V1, calculated explanation, real route geometry difference, absence of mock values in live results, no page errors, and no horizontal overflow at 1440×1000 and 390×844. Desktop and mobile screenshots were visually reviewed; map labels, coverage cards and recommendation are readable. The mobile map and controls stack vertically using the existing layout.

Screenshots: [live desktop](screenshots/cac/live-desktop.png), [live mobile](screenshots/cac/live-mobile.png), [landing desktop](screenshots/cac/landing-desktop.png), [landing mobile](screenshots/cac/landing-mobile.png). Screenshot capture uses the local app's actual API without interception; the landing view remains illustrative.

Follow [DEMO_GUIDE.md](DEMO_GUIDE.md): keep the local dev server running, prewarm shortly before recording, open `/app`, compare the fixed pair, and show both candidate cards and the calculated explanation. The public routing provider remains development-only; this task does not authorize a deployment or alter that guard.
