# Creekside Park → Osage Park: routing diagnosis

Targeted check: October 24, 2026 (America/Chicago). One live Valhalla pedestrian request for this pair only; no mass routing audit, catalog/search changes, new data sources, policy changes or deployment.

**Conclusion: expected rejection under the unchanged City Limits policy. Both selected locations are inside Bentonville; all three distinct returned routes cross the same excluded internal municipal hole. No supported alternative was incorrectly discarded. This does not establish that no other walking connection exists; it establishes that none of the three returned alternatives satisfies the current policy.**

## Exact selected endpoints

- Creekside Park: **36.34070259828065, -94.23757071600167**; catalog ID `city-parks-directory:1525`; inside current bundled City polygon: **yes**.
- Osage Park: **36.351640914616624, -94.21976250101292**; catalog ID `park-properties:315`; inside current bundled City polygon: **yes**.

Coordinates were read from the current unified catalog and passed unchanged to Valhalla. Creekside is the verified City address-backed park point; Osage is its existing official park-property polygon anchor. No alternative entrances, guessed points or lake coordinates were substituted.

## Each provider alternative

Provider response captured at `2026-10-24T22:44:24.664Z` from the existing configured Valhalla endpoint. The request used `costing=pedestrian`, `alternates=2`, `format=osrm`, `shape_format=geojson`; **3 raw routes / 3 distinct normalized routes / 0 valid / 3 rejected**.

| Alternative (fastest first) | Provider distance (m) | Duration (seconds) | Full boundary | Outside length (m) | Outside outer outline (m) | Cause |
|---|---:|---:|---|---:|---:|---|
| 1 | 2745.467 | 1937.277 | Rejected | 404.412068951 | 0.000 | Internal City Limits hole |
| 2 | 2736.466 | 1974.586 | Rejected | 404.433757764 | 0.000 | Internal City Limits hole |
| 3 | 2713.467 | 1982.856 | Rejected | 404.354279872 | 0.000 | Internal City Limits hole |

Lengths are computed for the exact returned GeoJSON geometry, not physical survey measurements. Full floating-point results and every outside subsegment are in the diagnosis JSON. The measurement partitions each route segment at all intersections with every polygon ring, classifies each resulting open interval against the full polygon union and exterior-only union, and sums geodesic fragment lengths with the existing application Turf distance function. It does not sample at a distance interval, add a buffer, simplify the boundary or change the acceptance policy.

All three pass containment against the **outer rings only** and fail against the full boundary with holes. Their excluded interval lies in polygon index **3**, interior ring **12** (zero-based polygon index / ring index including outer ring 0), in the checked boundary snapshot. This identifies the fourth polygon and its twelfth interior ring, not a separate official object ID.

| Alternative | Hole-entry latitude, longitude | Hole-exit latitude, longitude |
|---|---|---|
| 1 | 36.34302363254643, -94.23135669905247 | 36.342916463005864, -94.22684341516104 |
| 2 | 36.343102935442296, -94.23135508518224 | 36.34299728647861, -94.22684149610944 |
| 3 | 36.34318613798468, -94.23135304625164 | 36.34309069199132, -94.22683999098916 |

## Failure classification

- **True exterior city exit:** no; 0m for each route against the exterior union.
- **Internal City Limits hole:** yes; approximately 404.4m for each route.
- **Endpoint snapping:** not the cause. All three snap Creekside by **4.960442755m** and Osage by **57.004240154m**. Both snapped endpoints remain inside City Limits and within the existing 100m limit. The excluded intervals occur between endpoints.
- **Geometry precision:** not the cause. Provider coordinates have up to six decimal places; the sampled outside-fragment midpoints reach approximately 196–199m inside the excluded region. This is not a rounding-level edge excursion. The reported depth is an observed midpoint diagnostic, not a claim of the exact maximum penetration.
- **Parsing:** no observed bug. Each normalized coordinate equals the raw provider coordinate after only the expected longitude/latitude → latitude/longitude swap. All three raw alternatives survive parsing and geometric deduplication.
- **Filtering:** no observed bug. `supportedCandidates` applies `lineWithinArea` independently to every candidate through `Array.filter`. It retains all passing routes, reassigns the fastest retained route, and throws only when the retained list is empty. The shared comparison pipeline filters before querying infrastructure and analyzing scores. No first-route early rejection hides another alternative.

## Current boundary corroboration

The application snapshot is the existing official **Bentonville City Limits** layer, `Planning/Pending_PZitems_Publish23/MapServer/5`, OBJECTID **74**, retrieved October 23. No boundary file was changed. A targeted read of this same existing live layer confirms both selected endpoints intersect OBJECTID 74. A representative point in the shared excluded interval, **36.34297, -94.22910**, returns a separately confirmed **count 0**. These point checks corroborate the hole locally; they do not claim that the entire live boundary was re-downloaded or compared.

Bundled boundary SHA-256: `341edf29d0e61264d2eb3ad789f05a3730facc8218bc0bf54558e9481ee5eb78`.

## Regression and validation

Added exactly one trip regression test in `tests/reliability.test.ts`, replaying the captured real provider response offline. It verifies the exact selected coordinates, three pedestrian alternatives, unchanged raw/parsed geometry, passing exterior containment, failing full-hole containment for every alternative, individually rejected candidates, no provider-result mutation, and the expected full-pipeline `RouteBoundaryError` before infrastructure fetching. The existing Mistletoe/Crystal test also confirms an invalid alternative does not suppress valid alternatives.

Command: `node --test --import tsx tests/reliability.test.ts tests/locations.test.ts` — **22 passed, 0 failed**. No full suite, build, e2e or mass audit was run. Routing, scoring, 15m infrastructure tolerance, boundary policy and search/catalog logic remain unchanged.

Evidence: [captured response](../data/reliability/creekside-osage-routing.json), [per-alternative diagnosis](../data/reliability/creekside-osage-diagnosis.json). Reproduce the offline measurements with `node --import tsx scripts/diagnose-creekside-osage.ts`; it makes no network requests.
