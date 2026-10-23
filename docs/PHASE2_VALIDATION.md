# Phase 2 validation report

Recorded 2026-10-23. Scope: approved frontend plus real analysis for Bentonville High School → Bentonville Public Library. No Phase 3 features.

## Files created/modified

Created: `data/demoLocations.ts`; `lib/gis/bentonville.ts`; `lib/routing/{provider,index,valhalla,deduplicate}.ts`; `lib/analysis/{geometry,coverage,compare}.ts`; `lib/scoring/{pathsafeScore,recommendation}.ts`; `lib/server/{http,cache}.ts`; `app/api/compare/route.ts`; `app/methodology/page.tsx`; geometry/provider/cache fixture tests; validation/inspection/visual scripts; `.env.example`; verification evidence and screenshots.

Updated: domain types, client comparison abstraction, existing explorer/map/cards/score/header/preview, landing data-status wording, accessibility/hydration handling, responsive legend, README, data plan, package dependencies/lockfile, and browser tests. The original visual system and isolated mock route fixture are retained.

New runtime packages: focused `@turf/length` and `@turf/helpers`. Buffer matching uses analytic line/capsule intervals rather than approximate sample counts or an expensive union of every polygon buffer.

## Official GIS endpoint and fields

[Sidewalks layer 174](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174), query endpoint `/174/query` on the same service.

Fields used: `OBJECTID,trltyptxt,facdescrip,surftype,bikesallow,useaccess,Closure_Status`, plus geometry requested with `outSR=4326`. Server queries use REST JSON/GeoJSON, not HTML scraping.

The demo envelope returned **311 features / 311 line parts**: **235 sidewalk-class**, **76 crossing-class**. **233 sidewalk parts** qualify for coverage. **76 crossings and 2 sidewalk records without explicit public access** are excluded. No trail or bicycle-class record was returned in this envelope. These are feature counts for this request, not a citywide count or completeness estimate.

Real data was retrieved at 2026-10-23 20:09:53 UTC (3:09:53 PM America/Chicago); retrieval timestamps are not source update dates. The raw initial inspection envelope is separate and larger; its count is not used for these metrics. Runtime analysis reads only scoped, validated provider responses, never verification snapshots.

## Location verification and snapping

Official Common_Names layer 194 provides school OBJECTID 20 (North; South record 21 shares its point) and library OBJECTID 68. Exact coordinates, addresses, and source evidence are in `data/demoLocations.ts` and `data/verification/location-candidates.geojson`. These differ from the Phase 1 illustrative coordinates.

All returned routes snap approximately **52.54m from the school point** and **15.37m from the library point**. This is below the initial 100m rejection threshold but remains a limitation: these points are facility locations, not verified entrances or accessible approaches. No artificial connector line is added.

## Provider and genuine candidates

Development provider: `https://valhalla1.openstreetmap.de/route`.

Configuration: pedestrian costing, two requested alternatives, two fixed locations, no time dependence or artificial via points, OSRM JSON, GeoJSON geometry, kilometer request units, directions disabled. Server requests identify `PathSafe-NWA-development` through X-Client-Id. Production requires an explicitly configured hosted/private provider.

Three candidates were returned and retained. Each length differs by under 0.3% from its provider distance. Deduplication removes routes with lengths within 2% and at least 98% bidirectional overlap within 5m. Actual directional proximity fractions:

| Pair                          | First near second within 5m | Second near first within 5m |
| ----------------------------- | --------------------------: | --------------------------: |
| Fastest / Alternative 1       |                       0.70% |                       0.69% |
| Fastest / Alternative 2       |                       8.31% |                       8.14% |
| Alternative 1 / Alternative 2 |                      50.29% |                      50.11% |

The alternatives are geometrically different, not relabeled duplicates. Proximity is not a topological proof, but the routes also visibly follow different corridors on the map. No mock route participates in the live comparison.

## Matching, gaps, and formula

Chosen tolerance: **15 meters** around eligible facility lines. Exact capsule/route intersections are unioned and weighted by geodesic route segment lengths. Minimum meaningful gap: **20 meters cumulative uncovered length**. Uncovered gaps separated by **≤5m covered islands** are grouped only for counting; coverage remains unchanged.

```text
G = min(20, 2 × meaningful gaps)
D = min(10, 10 × max(0, geometryLength / shortestGeometryLength − 1.10))
Pedestrian Infrastructure Score = round(clamp(coveragePercent − G − D, 0, 100))
```

A qualifying alternative must have coverage gain **≥10 percentage points**, score **strictly greater** than the fastest route, added provider time **≤5 min**, time ratio **≤1.25**, and provider distance ratio **≤1.25**. Choose highest qualifying score, then faster time. Otherwise prefer the fastest candidate. One route receives no comparative recommendation.

## Actual metrics

Coverage calculations use measured geometry length; time/distance displayed in the route header come from the provider.

| Candidate     | Time (min) | Provider distance (m) | Geometry length (m) | Covered (m) | Uncovered (m) | Coverage | Gaps | Score |
| ------------- | ---------: | --------------------: | ------------------: | ----------: | ------------: | -------: | ---: | ----: |
| Fastest       |    33.7059 |              2843.354 |            2835.768 |    1433.620 |      1402.148 | 50.5549% |    6 |    39 |
| Alternative 1 |    33.9962 |              2884.647 |            2882.532 |    1889.287 |       993.245 | 65.5426% |    4 |    58 |
| Alternative 2 |    34.2668 |              2898.353 |            2892.895 |    1079.770 |      1813.126 | 37.3249% |    7 |    23 |

**Recommended: Alternative 1**, adding 17.417 seconds (~0.29min) and 41.293m (~1.45%), with a 14.9877-percentage-point coverage improvement. The UI rounds for legibility; decisions use full precision. Values are recorded measurements, not runtime constants. They may change with new provider/GIS retrievals.

## Tolerance and projection checks

| Candidate     | Coverage at 10m | Coverage at 15m | Coverage at 20m |
| ------------- | --------------: | --------------: | --------------: |
| Fastest       |          45.30% |          50.55% |          53.44% |
| Alternative 1 |          57.13% |          65.54% |          67.12% |
| Alternative 2 |          30.20% |          37.32% |          44.15% |

The 15m value was retained as an initial offset allowance, not tuned to maximize coverage. Sensitivity is meaningful and is disclosed. Local-projection total-length differences against geodesic lengths were **0.00678%, 0.00149%, and 0.00317%**, respectively. This establishes numerical scale consistency for this small area; it does not establish correct sidewalk/road-side matching or connectivity.

## What remains mock

The landing product preview and explicitly selected **Mock demo** retain Phase 1 geometry and fixed metrics, labeled MOCK DATA. Mock mode offers deterministic loading/no-route/error controls. Live failure never substitutes those values automatically. The archived real result is used for deterministic browser tests and evidence, not runtime fallback.

## Cache and failure behavior

GIS: 24h by padded envelope. Routes: 6h by endpoint/provider. Atomic local `.cache/pathsafe` JSON entries persist across development restarts. Same-process pending requests coalesce; failures back off 60s. Actual browser verification reported cache hits for both providers. Route selection and map interactions do not issue external routing/GIS requests.

Upstream timeout: 20s each; GIS aggregate deadline: 35s; browser analysis timeout: 60s. Missing/truncated IDs, malformed or unsupported geometry, wrong routing mode, inconsistent lengths, unavailable services, and timeout errors fail closed. Empty nearby infrastructure remains a valid 0%-mapped result with a limitation warning. Fewer alternatives remain fewer alternatives.

## Tests and visual inspection

- `npm run lint`: passed without warnings/errors.
- `npm run build`: passed, including TypeScript and static generation; `/api/compare` remains a dynamic Node route.
- `npm test`: 30 tests passed. Offline fixtures cover geodesic length, interval union/capsule buffering, 0/100% coverage, gap grouping, score caps, recommendation thresholds, deduplication, GIS batching/completeness/type mapping, routing normalization, failures, explicit mock isolation, cache coalescing/persistence/backoff, and API behavior.
- `npm run test:e2e`: 8 browser tests across 1440px desktop, 1280px laptop, 834px tablet, and 390px mobile. Tests use intercepted recorded result fixtures and include explicit failure/fallback and one-route behavior.
- Actual browser smoke: the real local API completed for desktop and mobile, returning cached official GIS/provider data, no browser page errors, and the expected three routes. Geometry follows different real mapped corridors; source labels and recommendation match calculated values.
- Small verification fixes: submit is disabled until hydration, skip-link clipping avoids an offscreen fixed-element capture artifact, and map padding/tooltip placement leaves more room around endpoints. No redesign was performed.

Review screenshots: [Desktop](screenshots/phase2-desktop.png), [Mobile](screenshots/phase2-mobile.png). These show the actual live/cached pipeline rather than the intercepted browser fixtures. The desktop result panel scrolls independently to expose all three cards and methodology.

## Known limitations and readiness

**Phase 2 is ready for final polish of the fixed demo.** It is not a production routing service or a safety assessment.

The public Valhalla service is development/testing only. File caching is local, not distributed; separate hosts/processes need production concurrency/rate-limit controls. City public GIS and OSM can be incomplete or outdated. Tolerance may match an inaccessible parallel facility; no road-side topology, actual crossing safety, entrance verification, sidewalk condition, ADA, traffic, lighting, or crash-risk assessment is performed. Crossing-only records are deliberately excluded, so mapped-coverage gaps may include crossings. General geocoding and Phase 3 features remain out of scope.
