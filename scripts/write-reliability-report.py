import json,hashlib
from pathlib import Path
D=Path('data/reliability')
rows=json.loads((D/'live-summary.json').read_text())['cases']
diag=json.loads((D/'diagnosis.log').read_text());measurement=json.loads((D/'reported-boundary-measurements.json').read_text())
short=json.loads((D/'short-trip.json').read_text())
text='''# PathSafe NWA — final reliability audit

Audit date: October 23, 2026. **No deployment, redesign, new major feature, biking, outside-city expansion, scoring change, recommendation-threshold change or 15m matching change.** Austin-Baggett Park → Lawrence Plaza remains the showcase.

Result: **19 of 20 representative inside-city trips succeeded** through the actual search/comparison APIs. The reported Mistletoe trip is repaired. One meaningful boundary-policy rejection remains explicit and expected. A separately tested short trip exposed and verified another retrieval fix. All four verified outside-city submissions were rejected.

## 1. Confirmed bugs and smallest fixes

| Confirmed defect | Root cause | Fix |
| --- | --- | --- |
| One outside alternative blocked an otherwise valid trip | Comparison required every provider candidate to remain inside; one failure discarded all candidates | Validate each candidate independently, exclude unsupported geometry, retain and disclose supported alternatives; fail only when none remain |
| Valid locations blamed for route-policy failure | Route boundary error used LocationError / INVALID_LOCATION and “Check your locations” | Separate RouteBoundaryError, HTTP 422 ROUTE_OUTSIDE_SUPPORTED_AREA and “No supported walking route” |
| Short valid trip failed GIS retrieval | ArcGIS returned explicit `objectIds: null` for zero nearby trails; adapter treated it as incomplete | Independently confirm `count: 0` using identical filters before accepting an empty ID inventory; missing, contradictory or transfer-limited inventories still fail |
| Municipal airport name returned no result | City catalog calls the public visitor location “Thaden Field House” | Narrow verified municipal/Thaden/VBT aliases query City record 124; label explicitly identifies the Field House; no XNA alias |
| Expanded street/direction search failed | SQL compared SOUTHWEST / AVENUE literally to SW / AVE | Normalize common direction/street words before the existing official address query; no new provider |
| Duplicate Community Center suggestions | Multiple City names shared the same address and coordinate | Deduplicate equivalent address/coordinate records; preserve genuinely different locations |
| Endpoint map labels clipped | Fixed outward tooltip directions and unbounded text at narrow widths | Automatic inward direction plus bounded intrinsic width/wrapping; no layout redesign |
| Malformed routing data looked like “no walking route” | All non-Ok/missing response shapes used the same no-route error | Distinguish invalid response shape/code from genuine NoRoute/NoSegment/empty route lists |
| Invalid snap error lacked actionable cause | Snap failures were reduced to generic provider failure | Explain failure to connect to the walking network within the unchanged 100m limit; no fabricated connector |

## 2. Exact diagnosis: 3809 SW Mistletoe Ave → Crystal Bridges

Official City address record **18900897**, `3809 SW MISTLETOE AVE`, resolves to **[36.32936552602442, -94.2557953932388]**. City Common_Names record **44**, `Crystal Bridges`, resolves to **[36.38211712065461, -94.2033730929639]**. Both points are inside the unchanged official Bentonville City Limits polygon.

Actual Valhalla pedestrian alternatives were captured before the fix:

| Original candidate | Provider distance | Whole geometry inside? | Outside vertices | Start snap | End snap |
| --- | ---: | --- | ---: | ---: | ---: |
'''
for r in diag['routes']:
 text+=f"| {r['id']} | {r['meters']:.3f}m | {'Yes' if r['strictInside'] else 'No'} | {r['outsideVertices']} | {r['snapStartMeters']:.6f}m | {r['snapEndMeters']:.6f}m |\n"
text+='''
Both snapped endpoints are also inside the polygon. The first route **genuinely crosses a City polygon hole/enclave**, leaving and re-entering Bentonville. Exact segment/boundary partitioning measures **404.411988m outside**, about **3.61%** of its 11,203.027265m measured geometry. An outside interior sample at **[36.34297131627322, -94.22914134952623]** is inside an outer ring but outside the municipality because it is in a hole; one sampled interior point is approximately **198.52m from the boundary**. That depth is a sampled observation, not a claimed exact maximum or an acceptance threshold.

This is **not** reversed coordinate order, a WGS84/projection mismatch, an endpoint outside the City, or a snap outside the polygon. GeoJSON is converted once from longitude/latitude to the app’s latitude/longitude. Multipart polygons and holes are correctly retained. The one outside vertex plus intervening segments is sufficient for a genuine strict rejection; there is no reason to delete the hole or pretend the route stays inside.

The bug was rejecting **two other wholly supported alternatives** and calling the selected locations invalid. Before: HTTP **400 / INVALID_LOCATION**, “The walking provider returned a route outside Bentonville. Choose different locations within the supported area.” After: HTTP **200 / live**, two supported alternatives, one disclosed exclusion.

Evidence: [endpoint/snapping diagnosis](../data/reliability/diagnosis.log), [before API result](../data/reliability/reported-before.json), [real provider response](../data/reliability/reported-routing.json), [exact outside intervals](../data/reliability/reported-boundary-measurements.json), [hole classification and snapped containment](../data/reliability/excursion-classification.json), [repaired actual comparison](../data/reliability/case-10.json).

## 3. Boundary policy before / after and rationale

Endpoint policy is unchanged: **both selected coordinates must be inside the official City Limits**, including holes/enclaves. The boundary remains [City Limits layer 5](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer/5), OBJECTID 74, LABEL BENTONVILLE, preserved as the existing dated WGS84 MultiPolygon in `data/boundary/`.

| Policy considered | Decision |
| --- | --- |
| A: endpoints inside and every returned alternative wholly inside, otherwise reject comparison | Previous implementation; unnecessarily couples independent alternatives |
| B: allow a small outside-distance/depth tolerance | Not adopted. It would not solve this approximately 404m excursion without a substantial allowance, and no boundary expansion is needed to use the two valid alternatives |
| C: allow a percentage/length outside | Not adopted. A 5% rule could admit this genuine enclave crossing, masking meaningful outside routing |
| D: endpoints strictly inside; independently retain only wholly inside candidates | **Adopted: smallest safe change.** Keep valid alternatives without weakening any geographic containment rule |

There is **no allowed outside length or radius**, even for tiny exits. Segment checks still partition at boundary intersections, catching hole/concavity crossings between valid vertices. An unsupported alternative is excluded before GIS retrieval and the unchanged analysis. Retained candidates preserve travel-time order and get consistent fastest/alternative IDs on fresh copies; cached provider responses are not mutated. Fastest means the fastest retained wholly supported candidate. Exclusion count and that definition appear in source warnings; received/retained counts remain honest.

If none remain, return **422 / ROUTE_OUTSIDE_SUPPORTED_AREA** and explain that the selected locations are valid but the provider routes leave the supported area. No “Check your locations.” Outside endpoints still return **400 / INVALID_LOCATION** with the exact supported-area message. Very short inputs under the existing 20m separation rule remain rejected before routing.

## 4. Repaired trip metrics

| Measurement | Fastest supported | Other supported alternative |
| --- | ---: | ---: |
| Coverage | 81.30079758% | 89.05130667% |
| Score | 61 | 71 |
| Meaningful gaps | 15 | 9 |
| Provider time | 135.258850 min | 135.647983 min |
| Provider distance | 11505.996m | 11508.996m |

The faster supported candidate remains recommended: the other gains **7.75050910 pp**, below the unchanged **10 pp** recommendation requirement, despite its higher score. No threshold was loosened to force a recommendation. This is a long real walk; it is not marketed as a quick showcase.

## 5. Representative actual-app/API audit

The bounded official sample contains 200 City Address records; ten inside-city addresses were chosen by deterministic farthest-point sampling to spread them geographically. This is representative coverage, not a statistically random or exhaustive citywide test. The sample and selected records are preserved in `official-address-sample.json` and `sampled-addresses.json`. Original addresses/coordinates were never invented.

Each row used actual `/api/locations` results and `/api/compare`. New routing requests were spaced by **10 seconds** and normal provider/GIS caches were reused. Named places use City Common_Names 194; addresses use City Address layer 2. Destinations are Lawrence Plaza unless specified. “Route yes / policy no” means real candidates were received but none qualified geographically; GIS analysis is deliberately not run for those unsupported routes.

| # | Searched origin → destination | Search resolves | Source | Selected point inside | Routing | Boundary policy | Analysis / exact failure |
| --- | --- | --- | --- | --- | --- | --- | --- |
'''
for i,r in enumerate(rows,1):
 source='City places 194' if r['kind']=='named' else 'City Address 2'
 ok=r.get('status')==200
 failure='Success; source=live' if ok else r.get('body',{}).get('error','No resolved result')
 text+=f"| {i} | {r['query']} → {r.get('destination',{}).get('label','—')} | {'Yes' if r.get('selected') else 'No'} | {source} | {'Yes' if r.get('inside') else 'No'} | {'Yes' if r.get('status') in [200,422] else 'No'} | {'Pass' if ok else 'No supported candidate'} | {failure} |\n"
text+='''
All **seven named places** resolved and produced successful analyses: Austin-Baggett Park, Lawrence Plaza, Bentonville Public Library, Crystal Bridges Museum of American Art, Memorial Park, Bentonville Community Center, and Bentonville Municipal Airport. All **13 required addresses** resolved inside the City. **12** address trips succeeded; one failed for a correctly disclosed boundary-policy limitation.

The exact 20 API responses, source results, points, route geometry, coverage/scores, source dates and cache status are in [live-summary.json](../data/reliability/live-summary.json) and `case-01.json` through `case-20.json`. Actual browser checks separately verified the repaired reported trip at every requested viewport; the API audit does not falsely claim 20 separate manual browser flows.

## 6. Expected edge rejection and very short trip

**4208 E CENTRAL AVE → Lawrence Plaza** has a valid inside-city selected point, but all three real candidates leave the municipality for approximately **342.116690m each**. This is not just a numerical sliver. It remains an expected **422** policy rejection with valid endpoints explicitly acknowledged. See [edge alternatives](../data/reliability/edge-routing.json) and [outside measurements](../data/reliability/edge-boundary-measurements.json). Other sampled edge/cross-city trips, including 3000 NW A St and the 11.5km Mistletoe trip, succeed with supported alternatives.

The separately sampled **1509 SW A ST → 1601 SW A ST** short trip initially failed with a 503 City GIS error. Direct source diagnosis showed Parks `objectIdFieldName: OBJECTID, objectIds: null`, representing no trails in that small envelope. Both City inventory fetchers now accept explicit null only after a second identical-filter count query confirms zero. Missing IDs, unknown field identity, contradictory nonzero/missing counts, transfer-limit flags and partial batches still fail; no unknown infrastructure is admitted.

After repair this same actual trip returns **200**, one genuine **133.633m** pedestrian route and **77.25460753%** coverage. No alternative is invented. [Before failure](../data/reliability/short-before.json), [raw inventory diagnosis](../data/reliability/short-diagnosis.json), [successful short trip](../data/reliability/short-trip.json). GIS classification and normalization source regions are separately hash-verified unchanged despite the necessary retrieval-file edits.

## 7. Negative locations, XNA and municipal airport

All four verified outside points were submitted directly to the actual comparison API as well as searched:

| Outside location | Verified point source | Search | Comparison |
| --- | --- | --- | --- |
'''
for r in json.loads((D/'negative-tests.json').read_text()):text+=f"| {r['query']} | {r['source']} | No supported results | HTTP {r['status']}; endpoint outside official polygon |\n"
text+='''
All return “PathSafe currently supports locations within Bentonville, Arkansas.” XNA’s reference point is independently verified by the [Arkansas aeronautics airport document](https://fly.arkansas.gov/uploads/7/5/7/7/75772239/fayettevillespringdale.pdf); a Bentonville postal address does not establish municipal containment. The other three points are official City-hosted Benton County address records explicitly located in Rogers, Centerton and Bella Vista. No route to an outside endpoint was accepted. [Negative-test evidence](../data/reliability/negative-tests.json).

**Bentonville Municipal Airport is distinct from XNA.** The official City [airport page](https://www.bentonville.ar.gov/385/Airport) identifies Thaden Field and 2205 SW I Street; the City place catalog supplies permanent record **124**, Thaden Field House, at that address. The fix uses that existing public visitor-location record, not runway coordinates, and labels it “Bentonville Municipal Airport · Thaden Field House.” Its selected point and complete retained routes pass City validation; actual analysis succeeds. XNA/Northwest Arkansas National Airport is never redirected to this alias.

## 8. Search quality findings

Actual API checks confirmed exact address, lowercase, repeated whitespace, punctuation plus Bentonville/AR suffix, partial `3809 SW MIST`, and expanded `3809 Southwest Mistletoe Avenue` all resolve to the same official address. Expanded form failed before the normalization fix. The Community Center’s equivalent aliases now collapse to one suggestion rather than three; distinct addresses/coordinates remain distinct. Nonexistent address returns no result. [Search variations](../data/reliability/search-variations.json).

Apartment/unit-specific text is **not advertised as supported** by this adapter: `3809 ... APT 1` returns no result rather than silently inventing or dropping a unit. Use the verified building/street address. No broader geocoder was added. Minimum characters, debounce, caches and server pacing remain in force; the cache namespace changed only for corrected address/place lookup semantics.

Keyboard and mobile/touch selection, clearing while a request is pending, late-response suppression, selected coordinates, source switching and the compare button’s resolved-coordinate requirement pass browser regressions. No stale-suggestion production bug reproduced; the existing cancellation/generation protections were retained.

## 9. Routing / API failure handling

Tests cover endpoint snapping over the unchanged 100m maximum, malformed/non-pedestrian/length-inconsistent geometry, duplicate alternatives, timeout/network/HTTP/API failure, no route, identical/near-identical endpoints, short routes, boundary holes and tiny/meaningful exits. Genuine NoRoute/NoSegment responses are distinguished from malformed responses. Invalid snaps explicitly explain the inability to connect to the walking network within 100m, rather than suggesting the City location is invalid. Pedestrian costing, requested alternatives, snap maximum, length checks and route deduplication are unchanged.

Unavailable City search remains an explicit search error. Missing/incomplete GIS remains unavailable rather than partial “success.” The City Limits polygon is the existing bundled official snapshot: an outage of its source API does not remove runtime boundary protection, and no bounding-box fallback is used. Refreshing that snapshot remains deliberate maintenance. Normal unit tests use fixtures/stubs with no live requests; only the paced manual audit uses public sources.

Explicit mock mode remains separate and labeled. Every successful real comparison keeps source=live; failures never become mock results automatically.

## 10. UI, browser and hydration audit

Clean Playwright Chromium contexts have no installed extensions. The repaired trip was exercised through actual search selection and API analysis at **1440×1000**, **1280×900**, **834×1112**, and **390×844**. Markers and snapped route endpoints match selected locations, retained geometry is visible, cards/legend/source exclusions are honest, there is no horizontal overflow, keyboard/touch interaction works, and expanded methodology/source panels remain usable.

The original label clipping reproduced at laptop/tablet/mobile. Automatic inward-facing tooltip direction and bounded intrinsic-width wrapping now pass geometric clipping assertions at all four sizes. [Before measurements](../data/reliability/browser-before-label-fix.json), [after audit](../data/reliability/browser-audit.json), [desktop screenshot](screenshots/reliability/mistletoe-desktop.png), [mobile screenshot](screenshots/reliability/mistletoe-mobile.png). Laptop/tablet images are in the same directory.

**No application console errors, page errors or hydration mismatches reproduced in the final clean contexts.** No rendering suppression, body-attribute workaround or `suppressHydrationWarning` was added for Grammarly-injected attributes. A development asset reload loop occurred during a simultaneous build/dev validation attempt; validation was restarted cleanly and production builds were separated from active browser runs. It was not treated as a browser-extension or application hydration defect.

## 11. Regression tests and validation

Added `tests/reliability.test.ts` and `tests/reliability.spec.ts`. They cover the actual reported provider fixture and enclave, support filtering/ID relabeling without cache mutation, the unchanged showcase, tiny/meaningful exits, outside endpoints/XNA, municipal-airport lookup, address abbreviations and alias deduplication, malformed/no-route classification, invalid snaps, short routes, verified-null/contradictory inventories, unchanged eligibility/normalization, non-blaming route errors, tooltip clipping and late searches after clear.

Updated the older all-candidate test to the new explicit policy and the ambiguous fixture to represent genuinely different coordinates instead of duplicate aliases. Historical full-file hash exceptions are limited to routing error parsing and GIS retrieval files that necessarily changed; protected score/recommendation/coverage/eligibility/deduplication and normalization region checks still pass. No methodology constants were adjusted.

Final commands:

- `npm run lint` — passed.
- `npm run build` — passed, production build and TypeScript checks.
- `npm test` — **66 passed**, no live network calls.
- `npm run test:e2e` — **28 passed**, all four device projects.
- `npm run demo:prewarm` — passed through real sources/caches; showcase remains **74.64% → 96.39%**, scores **69 → 94**, gaps **3 → 1**, **4.753s** additional time and **8m shorter**.

After automated validation, the 20 representative trips were rechecked through the actual API using their normal real-response caches, with two-second spacing; unchanged 19 successes / one expected policy rejection. See [post-check live evidence](../data/reliability/post-check-live.json) and [prewarm log](../data/reliability/prewarm.log). No mock fixture was injected into runtime caches.

## 12. Files changed and evidence

Production fixes:

- `lib/geocoding/supportedRoutes.ts` (new), `lib/analysis/compare.ts`, `app/api/compare/route.ts` — independent route policy and accurate failure classification.
- `lib/geocoding/city.ts`, `lib/geocoding/index.ts` — verified municipal alias, common address words, equivalent suggestions and corrected-query cache namespace.
- `lib/gis/inventoryIds.ts` (new), `lib/gis/bentonville.ts`, `lib/gis/pedestrianInventory.ts` — explicit-null inventory confirmation; eligibility unchanged.
- `lib/routing/valhalla.ts` — malformed-versus-no-route error guard only; request and routing rules unchanged.
- `components/RouteExplorer.tsx`, `components/MapCanvas.tsx`, `app/globals.css` — accurate route-policy heading and endpoint-label containment.
- `app/methodology/page.tsx`, `docs/DEPLOYMENT.md` — exact candidate policy and retrieval/release notes.

Tests and audit artifacts:

- New reliability unit/browser suites; updated `tests/locations.test.ts`, `tests/trail-audit.test.ts`.
- `scripts/diagnose-reported-trip.ts`, `measure-reported-boundary.ts`, `classify-boundary-excursion.ts`, `sample-reliability-addresses.ts`, `run-reliability-live.ts`, `audit-negative-and-search.ts`, `audit-reliability-browser.ts`, `diagnose-edge-trip.ts`, `check-short-trip.ts`, `diagnose-short-trip.ts`, `recheck-reliability.ts`, and this report’s reproduction script.
- `data/reliability/` preserves official source samples, requests/results, diagnoses, before/after failures, eligibility hashes, all 20 comparisons, negative tests and logs. `docs/screenshots/reliability/` holds actual UI captures.

`data/demoLocations.ts`, scoring and recommendation modules, the 15m coverage/gap implementation, trail eligibility, and physical deduplication remain unchanged. No deployment or paid resources.

## 13. Remaining limitations and CAC deployment decision

The provider returns up to three alternatives; a valid wholly municipal route may exist but not be returned. Such trips now fail accurately when all supplied candidates leave the City. Even tiny exits remain excluded; this policy intentionally avoids a new geographical tolerance. The City boundary is a dated snapshot, not a legal determination or live annexation feed. Address/place points are not verified walking entrances, and source catalogs may omit places. Apartment/unit text is not supported. Coverage is proximity to mapped eligible infrastructure, not connectivity, condition, accessibility or personal safety.

**The repaired application is reliable enough for the local CAC showcase and representative Bentonville demonstration, with the documented boundary limitation. It is not yet approved/configured for public CAC deployment.** Existing production requirements remain: an approved HTTPS hosted/private routing provider (public Valhalla stays development-only), City search capacity or dedicated provider arrangements, shared cache/rate planning, privacy/retention review and owner deployment approval. See [deployment notes](DEPLOYMENT.md).

The audit is complete. No additional features were added or planned; **nothing was deployed**.
'''
Path('docs/FINAL_RELIABILITY_AUDIT.md').write_text(text)
print('Reliability report written with',len(rows),'representative cases.')
