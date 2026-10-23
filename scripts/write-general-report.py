import json, hashlib
from pathlib import Path
root=Path('data/general-validation')
rows=[]
for name in ['showcase','library-park','crystal-plaza','street-addresses']:
 c=json.loads((root/(name+'.json')).read_text())['comparison']
 fast=c['routes'][0];rec=next(r for r in c['routes'] if r['id']==c['recommendation']['routeId']);a=fast['metrics'];b=rec['metrics']
 rows.append(f"| {c['start']['label']} → {c['destination']['label']} | {a['coverage']:.2f}% | {b['coverage']:.2f}% | {a['score']} → {b['score']} | {a['gaps']} → {b['gaps']} | {b['seconds']-a['seconds']:.3f}s | {'Qualifying alternative' if rec['id']!=fast['id'] else 'Fastest retained'} |")
text='''# General Bentonville location support — final validation

Implemented October 23, 2026. **General walking-trip selection within Bentonville is supported. The Austin-Baggett Park → Lawrence Plaza showcase remains preselected. Ready for local CAC recording; public deployment still requires approval and provider readiness. Nothing deployed or purchased.** No additional major features were added.

## Provider and search behavior

The server uses **official City of Bentonville public ArcGIS place/address queries**, wrapped in the normalized `GeocodingProvider` contract. Named permanent places come from [Common_Names 194](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194); street addresses come from [City Address layer 2](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer/2). Normalized results contain ID, label, latitude/longitude, address, kind and City attribution. Provider-specific GeoJSON properties never enter UI components. No dependency, API key, paid service or account was added.

**Public Nominatim is deliberately not used.** Its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) prohibits autocomplete even when requests are debounced. City query capabilities supply the requested local autocomplete without generating prohibited Nominatim calls. The provider interface permits a later dedicated autocomplete provider; no assumption is made about City service production capacity or SLA.

Inputs require at least **three characters**, a **450ms pause**, and explicit selection. Suggestions support Arrow Up/Down, Enter, Escape, pointer/touch, active-option announcements, visible focus and clear buttons. Ambiguous matches remain separate suggestions; no first-result auto-selection. Editing invalidates the stored coordinate, prior analysis and stale results. Raw text cannot start a custom route. Loading, no-match, timeout and provider-failure messages are visible. Selected endpoint markers update before analysis. Opening/closing suggestions and selecting locations do not trigger routing. Compare routes explicitly starts analysis.

Case-insensitive browser caches retain up to 50 searches per input; server searches are cached **24 hours**, with existing duplicate-request coalescing/error backoff. Requests are serialized and start at most once per second **per process**, with a queue bound of four. Queries return up to eight candidates. House numbers are prefix-matched and compass directions are matched as standalone tokens, so “300 S Main” cannot accidentally suggest “300 N Main.” No bulk geocoding or background default-point lookup occurs. The known showcase uses its existing official coordinates unchanged.

The UI does not yet persist locations in URLs; this optional item was deferred to keep the core change focused.

## Bentonville boundary and outside rejection

Source: [official Bentonville City Limits layer 5](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer/5), OBJECTID **74**, LABEL **BENTONVILLE**, retrieved October 23, 2026 as WGS84 MultiPolygon. Raw geometry, matching JSON import, metadata and provenance are in `data/boundary/`. This is an explicit City Limits layer, not a planning boundary, ward approximation or bounding box. Rings, holes and disconnected components are retained. It is a dated GIS snapshot, not a legal boundary guarantee; annexations require a deliberate refresh.

`isWithinSupportedArea(lat, lon)` is reusable. Search normalization removes outside points. The comparison server independently validates finite coordinate pairs and point containment, even if a client bypasses the search UI. Outside submissions return HTTP 400 with:

> PathSafe currently supports locations within Bentonville, Arkansas.

Every returned route must also lie inside the polygon. The check partitions each segment at boundary intersections and checks interval midpoints, preventing a straight segment from cutting through a hole/concavity between otherwise valid vertices. Existing routing snap/length checks remain active. A comparison fails explicitly if any candidate leaves Bentonville; alternatives are not silently dropped or reranked. This conservative behavior can reject a trip whose endpoints are inside but whose provider alternatives leave the City.

Endpoints less than **20m apart** are rejected as effectively identical. This new input-validation rule does not change the existing 20m meaningful-gap threshold or any recommendation rule.

## Shared route pipeline and unchanged methodology

Resolved, validated locations flow to the existing pedestrian routing provider, then the same GIS inventory, `analyzeCandidates`, coverage matching, scoring, recommendation and presentation. There is no separate custom-trip score path. Exact showcase string identifiers remain backward-compatible with prewarm; arbitrary raw text is rejected.

Source retrieval remains local to actual candidate envelopes with the existing 75m padding. Larger envelopes are split into bounded tiles, each at most the existing source-fetch limit, requested only where candidate-segment envelopes intersect. Query concurrency is two tiles, and missing IDs, partial geometry, timeouts or failed tiles fail the whole analysis. Repeated tile line parts are deduplicated; the existing supplemental overlap preprocessing and union-of-covered-intervals behavior remain intact. Source cache lifetimes, completeness checks and GIS eligibility rules are unchanged. Multi-tile provenance counts summarize returned line records rather than claiming a citywide inventory.

Regression hashes verify **byte-identical scoring, recommendation thresholds, coverage matching/gap logic, baseline and supplemental eligibility, deduplication, inventory fetchers and Valhalla behavior** against the existing CAC protected-file manifest. The existing 15m tolerance, gap grouping, score penalties and recommendation bounds remain unchanged. The visible methodology now describes the supported geography and input source, not a new scoring method.

No biking, accounts, AI, crowdsourcing, new safety factors, silent mock fallback or deployment was introduced. PathSafe evaluates mapped pedestrian infrastructure, not personal safety. Geocoding, routing and GIS can be incomplete; no citywide completeness, guaranteed route availability, connectivity, entrances, current conditions or accessibility is implied.

## Manual live validation

All four trips were exercised through the actual browser search/selection and comparison API with **no network interception**. Official returned points and actual API results are saved per trip in `data/general-validation/`; request spacing was low-volume and caches reused. Every successful trip showed REAL DATA · V1, actual line geometry and calculated metrics; none showed mock values. Both selected points and every candidate line passed municipal containment. Screenshots were captured at **1440×1000** and **390×844**, with no horizontal overflow.

| Real trip | Fastest coverage | Recommended coverage | Scores | Gaps | Added time | Result |
| --- | ---: | ---: | --- | --- | ---: | --- |
'''+ '\n'.join(rows)+'''

The showcase remains **74.64369816% → 96.38925953%**, scores **69 → 94**, gaps **3 → 1**, **4.753 seconds** added, **8m shorter**. It matches the completed demo search. The preselected showcase was not geocoded again.

Library → Memorial Park retains the fastest route because alternatives do not provide the required coverage gain. Crystal Bridges → Lawrence Plaza has a higher-coverage alternative (69.41%, score 57), but it adds **657.905 seconds**, approximately **49.15% time** and **56.72% distance**; it fails the existing limits, so the 48.76% fastest route is retained. The address trip already has 99.06% fastest-route coverage; no better alternative is forced. No algorithm tuning followed these outcomes.

Street addresses were verified from City Address records: **300 N MAIN ST**, OBJECTID **18867441**, and **500 S MAIN ST**, OBJECTID **18850246**. Library resolves to City place 68 and Crystal Bridges to place 44. Community Center was separately searched successfully (place 17, with equivalent catalog aliases); that search is preserved in `community-center-search.json`. The library, Crystal Bridges, Community Center, default park/plaza and ordinary address examples are all supported by observed official results.

Outside-Bentonville submission: HTTP **400**, exact required message preserved in `outside-rejection.json`, with no outside routing request accepted. Stubs also test an outside route returned by a provider; it is rejected before GIS analysis.

Evidence: [summary](../data/general-validation/summary.json), [prewarm log](../data/general-validation/prewarm.log), [showcase](../data/general-validation/showcase.json), [library trip](../data/general-validation/library-park.json), [Crystal Bridges trip](../data/general-validation/crystal-plaza.json), [address trip](../data/general-validation/street-addresses.json).

## Validation and visual review

- `npm run lint` — passed.
- `npm run build` — passed, including TypeScript and the new location-search API.
- `npm test` — **54 passed**, no live network calls.
- `npm run test:e2e` — **20 passed** across laptop, tablet, desktop and mobile, including keyboard autocomplete, ambiguous selection, clear/touch, debounce/cache, empty/failure/unresolved search states, existing comparisons and WCAG checks.
- `npm run demo:prewarm` — passed through the actual default pipeline, REAL DATA prewarm complete.

Unit coverage includes official inside/outside points, polygon holes and between-vertex crossings, geocoding normalization/empty/ambiguous/failure responses, exact address matching, unresolved/equal endpoint validation, API outside rejection, shared custom/default analysis, unchanged showcase recommendation, routing/no-route/GIS failures and bounded query tiling. Browser tests use fixtures/stubs; separate manual validation uses real public sources.

Desktop/mobile screenshots were visually reviewed: [Crystal Bridges desktop](screenshots/general/crystal-plaza-desktop.png), [street-address mobile](screenshots/general/street-addresses-mobile.png), [search dropdown desktop](screenshots/general/search-desktop.png), [search dropdown mobile](screenshots/general/search-mobile.png). Full showcase/library/Crystal/address screenshots are in `docs/screenshots/general/`. Inputs, selected labels, map markers, dropdown bounds, comparison cards, real badge and recommendation remain readable. An accessible name was added to pre-analysis marker tooltips so their fade-out during route loading does not leave unnamed tooltip elements.

## Files created or modified

Created:

- `lib/geocoding/provider.ts`, `city.ts`, `index.ts`, `area.ts`, `validate.ts` — normalized search, provider adapter/cache, boundary and trip validation.
- `lib/gis/routeInventory.ts` — bounded envelope tiling/merged retrieval for larger trips.
- `lib/server/analysisError.ts` — plain-language routing/GIS failure distinction.
- `app/api/locations/route.ts`, `components/LocationSearch.tsx` — proxy and accessible search input.
- `data/boundary/` — official boundary geometry, metadata and source notes.
- `tests/locations.test.ts`, `tests/locations.spec.ts` — unit/browser coverage.
- `scripts/validate-general-locations.ts`, `capture-location-search.ts`, `write-general-report.py` — live validation, screenshots and report reproduction.
- `data/general-validation/`, `data/general-validation.log`, `docs/screenshots/general/`, this report — evidence.

Modified:

- `lib/analysis/compare.ts`, `app/api/compare/route.ts`, `lib/routes.ts` — validated endpoints into the shared pipeline and explicit error handling.
- `components/RouteExplorer.tsx`, `RouteMap.tsx`, `MapCanvas.tsx`, `app/globals.css` — selection state, search UI and pre-analysis markers; existing visual design retained.
- `app/methodology/page.tsx`, `README.md`, `docs/DEMO_GUIDE.md`, `docs/DEPLOYMENT.md` — supported geography, source limitations and operating/deployment requirements.
- `tests/frontend.spec.ts`, `tests/accessibility.spec.ts` — precise combobox selectors and clear-button keyboard order; `scripts/capture-cac-demo.ts` uses the updated exact input selector.
- Existing `data/verification/cac-live-comparison.json` was revalidated through the unchanged showcase pipeline; it is still evidence only, never a runtime fallback.

## Limitations and deployment decision

General Bentonville walking trips are now supported when both locations resolve in the official City place/address catalogs and the provider returns wholly supported candidate geometry. A business/POI absent from the City's catalog may need its street address; search results are limited to eight and are not a complete listing. Some City addresses have missing postal metadata, and building points are not verified entrances. Strict all-candidate containment may reject otherwise useful boundary-adjacent trips. Very long trips may hit existing function/time limits; wider-area projection accuracy and tiled inventory behavior have unit-level coverage, not exhaustive live validation across every City neighborhood. The boundary snapshot needs maintenance as the City changes.

The cache is process-local plus filesystem persistence, not shared distributed infrastructure. Public endpoints have no assumed uptime/capacity guarantees; server search rate control is per instance. Public deployment needs an approved HTTPS hosted/private routing provider, City search capacity/permission confirmation or a dedicated autocomplete-capable provider, shared rate/cache planning, a search-coordinate retention/privacy policy, and owner approval. See [deployment documentation](DEPLOYMENT.md). No public Nominatim autocomplete deployment is appropriate.

**Ready for local CAC recording and review. Not declared ready for public deployment. Nothing deployed; awaiting approval. No further major features are planned.**
'''
Path('docs/GENERAL_LOCATION_SUPPORT.md').write_text(text)
for p,h in json.loads(Path('data/verification/cac-protected-hashes.json').read_text()).items():
 assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==h,p
print('General-location report written; all protected analysis/provider hashes unchanged.')
