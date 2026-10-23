# PathSafe NWA: Phase 2 data integration

Status: implemented for the fixed Bentonville High School → Bentonville Public Library demo pair. The approved frontend is retained, with explicit live/mock modes. Phase 3 is outside scope.

## Official source

[City of Bentonville GIS layer 174](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174), Planning / Community_Development23 → Sidewalk System → Sidewalks.

REST query endpoint: `https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174/query`.

The City describes a mixed sidewalk/trail/on-street bicycle facility layer. REST JSON metadata and actual GeoJSON were inspected; no HTML scraping was used. Source spatial reference is EPSG:3433; requests use `outSR=4326`, with ArcGIS doing the WGS84 transformation. Do not interpret raw source coordinates as longitude/latitude.

Minimal fields: `OBJECTID`, `trltyptxt`, `facdescrip`, `surftype`, `bikesallow`, `useaccess`, `Closure_Status`. Rating, lighting, road traffic, ownership, and dates are not requested for scoring.

A 75m-padded bounding envelope around all candidate routes limits retrieval. IDs-only inventory avoids record-limit truncation; sorted unique IDs are fetched in batches of at most 250, below the layer's advertised 2,000 record limit. Every batch is checked for exact IDs, duplicates, missing records, and exceeded-transfer flags. Inventories over 10,000 features, unsupported/invalid geometries, nonlocal coordinates, and partial retrievals fail closed. Multipart line features retain separate parts; unrelated vertices are never connected.

## Attribute mapping

| Attribute evidence                                                                         | Internal kind          | Counts toward coverage?                                            |
| ------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| `trltyptxt=Sidewalk`                                                                       | sidewalk               | Yes, with explicit Public access and no reported closure/exclusion |
| Recognized trail/shared-use description; Concrete/Asphalt/PAVED surface; not crossing-only | trail                  | Yes, with the same access/closure checks                           |
| `bikesallow=Bike Only`, bike/bicycle class, or Shared Roadway description                  | bicycle                | No                                                                 |
| Painted Cross / Other Cross class                                                          | crossing               | No in version 1                                                    |
| Other/unknown class                                                                        | other                  | No                                                                 |
| `useaccess=Private/Restricted` or absent/unknown access                                    | retained original kind | No                                                                 |
| `Closure_Status=CLOSED` or facility description CLOSED                                     | retained original kind | No                                                                 |

Trail descriptions recognized by the implementation contain “trail”, or equal Shared Use / Razorback Greenway; surface must explicitly be paved. This classification is provisional and based on field evidence, not a suitability guarantee. Absence of a closure status does not mean a facility is currently open. Crossings are shown but not scored as verified crossing conditions.

The recorded demo envelope contained 311 features: 235 sidewalk and 76 crossing; 233 sidewalk line parts passed access checks, two lacked explicit Public access. No trails or bike-class features appeared in this envelope. This is not a statement about all Bentonville infrastructure.

## Verified demo locations

City [Common_Names layer 194](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194) supplies verified WGS84 points:

- OBJECTID 20, Bentonville High School-North, 1801 SE J ST: latitude 36.351891386817904, longitude -94.19521148198835. Record 21 (South) shares this point; one campus location is used rather than fabricating an entrance.
- OBJECTID 68, Library, 405 S MAIN ST: latitude 36.36770870312484, longitude -94.20851110772566. The address matches the City's [Public Library page](https://www.bentonville.ar.gov/307/Public-Library).

`data/demoLocations.ts` records these separately from illustrative Phase 1 endpoints. `data/verification/location-candidates.geojson` preserves the official response. Points identify facilities, not approved pedestrian entrances; provider snapping and connectivity remain limitations.

## Routing

A `WalkingRoutingProvider` contract isolates analysis/UI from Valhalla. Development uses the FOSSGIS public demo `https://valhalla1.openstreetmap.de/route`, with pedestrian costing, `alternates=2`, OSRM JSON output, GeoJSON shapes, and kilometer units. Server-side requests include `X-Client-Id: PathSafe-NWA-development`. [Valhalla's API](https://valhalla.github.io/valhalla/api/route/api-reference/) documents pedestrian routing and that alternatives may be fewer than requested.

Time and distance are normalized from OSRM seconds/meters. Shape lengths are cross-checked against the provider (reject >10% disagreement). Snapping more than 100m from either verified location is rejected. Only two-point, non-time-dependent requests are used. At most three candidates are accepted. Equivalent geometries are removed if lengths differ by at most 2% and at least 98% of each route is within 5m of the other, bidirectionally. A single distinct candidate remains a single candidate, with no fabricated comparison.

The recorded request returned three genuinely different candidates. No extra via points, costing changes, or artificial routes were used to force alternatives. See validation records for measured spatial overlap.

The public demo is a low-volume development/testing dependency. Production requires an explicit `VALHALLA_URL` pointing to a hosted/private endpoint or a replacement provider. Accounts, general geocoding, and bulk queries are not included.

## Matching and gaps

1. Validate candidate and infrastructure geometry. Convert GeoJSON `[lon,lat]` to the internal `[lat,lon]` map contract at provider boundaries.
2. Project locally with a route-anchored equirectangular projection (Earth mean radius 6,371,008.8m). The small demo extent limits distortion; independent Turf geodesic segment lengths provide length weights. Do not generalize this projection to distant cities without validation.
3. Index eligible facility segments in 100m cells. For each route segment, intersect it analytically with 15m capsules around nearby facility segments (strip + endpoint circles).
4. Union intersected parameter intervals, including across route vertices. Never sum overlapping sidewalk buffers twice. Weight intervals by the route segment's geodesic length.
5. Coverage = 100 × covered meters / total geometry meters. Uncovered = total − covered.
6. Complement the union to find uncovered intervals. Group gaps separated by no more than 5m of covered geometry. Count a group only if its cumulative uncovered length is at least 20m. Grouping affects only the gap count, not coverage.

The 15m tolerance allows offset sidewalk/road geometry; it does not establish road-side connectivity, access, or usability. It was not tuned to inflate scores. Sensitivity at 10/15/20m and projection error checks are recorded in `geometry-checks.json` and the validation report. On this demo the local-vs-geodesic total-length difference was below 0.007%. A nearby parallel facility across a barrier can still be a false positive; missing GIS can be a false negative.

## Score and recommendation

Algorithm identifier: `coverage-v1`.

```text
coverageScore = coverage percent
G = min(20, 2 × meaningful gap count)
D = min(10, 10 × max(0, geometryLength / shortestCandidateGeometryLength − 1.10))
score = round(clamp(coverageScore − G − D, 0, 100))
```

Recommend an alternative only if it improves coverage by **at least 10 percentage points**, has a **strictly higher score**, adds **at most 5 minutes**, and is **at most 25% longer in both provider time and distance**. Choose the highest qualifying score, breaking ties by lower time. Otherwise recommend the fastest candidate, explaining similar coverage or failure to meet travel bounds. A single route has no comparative recommendation. Thresholds are fixed methodological defaults, not fitted to the demo outcome.

No personal safety, crime, lighting, traffic, crash risk, ADA compliance, condition, or crossing-safety term is included.

## Caching, failure, and transparency

GIS results are cached 24h by route envelope; routes 6h by verified pair/provider. Atomic JSON files under `.cache/pathsafe` survive development restarts. On Vercel, files use the temporary directory and are ephemeral/instance-local. Bounded process memory retains warm values; same-process in-flight requests are coalesced. Errors back off 60 seconds. Expired results are not silently served on failure. Upstream request timeout: 20 seconds; aggregate GIS retrieval deadline: 35 seconds; client analysis timeout: 60 seconds. No repeated provider calls occur on card selection/map toggles. Separate workers/hosts need a shared production cache and rate limiting.

No nearby features: display 0% measured coverage with an explicit limitation warning. Partial data, invalid geometry, upstream/API failure, or timeout: show “Live route analysis is temporarily unavailable.” The mock fallback must be explicitly selected and stays labeled. The app exposes data retrieval times, cache status, feature counts, score methodology, and recommendation rationale; retrieval dates are not GIS update dates. The landing preview remains mock.

Next polish should focus on explaining proximity uncertainty and recording the demo; do not imply access/condition/connectivity verification or add Phase 3 scope.

## Final polish notes

The score, matching method, gap threshold, and recommendation thresholds are unchanged. A separate presentation helper calculates seconds/coverage tradeoff copy from live metrics. The in-app methodology now leads with plain-language explanations and collapses equations into Technical details. See [DEMO_GUIDE.md](DEMO_GUIDE.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for prewarming, recording, and production configuration requirements.


## October 23, 2026 official trail audit

The [20-pair demo search](DEMO_ROUTE_SEARCH.md) establishes an additional qualified source: Parks/Parks_Recreation18/MapServer/158. Its REST query returns a mixed inventory, so only explicitly public, documented paved walking/shared-use or Hiking records with known surfaces and no reported closure/proposal/restriction qualify. Mountain-bike-primary and shared-roadway classes do not qualify. The audit accepts 139 paved features and five explicit natural-surface Hiking features within the broader study area. This expands data eligibility to documented public hiking infrastructure; coverage must not be described as pavement or accessibility.

The runtime retrieves both official inventories with complete ID checks, deduplicates supplementary linework before coverage (0.05m coincidence tolerance, not the 15m route matching tolerance), and records both source timestamps. Scoring, meaningful gaps, route matching and recommendation thresholds are unchanged. The default remains BHS → Library, now measuring 55.61% → 65.76% coverage, a smaller 10.16 pp advantage because the fastest candidate also benefits. Historical Phase 2 snapshots are retained. See the search report for all accepted/rejected layers, criteria, exact results and reproducible evidence.
