# PathSafe NWA

Infrastructure-aware walking routes for Bentonville, Arkansas. Built for the 2026 Congressional App Challenge.

## Problem

A fast walking route does not tell you how much pedestrian infrastructure is mapped along the way. Similar travel times can hide different sidewalk and trail coverage.

## Solution

PathSafe compares walking candidates using official City of Bentonville GIS geometry and real pedestrian routes. It makes coverage, meaningful gaps, travel time, and distance visible, with a transparent recommendation.

## How it works

Compare the verified Austin-Baggett Park → Lawrence Plaza trip, select a candidate on the map, and see the measured tradeoff. The approved CAC demo gains approximately 21.75 percentage points of mapped coverage for 4.753 extra seconds. See the [20-pair demo search](docs/DEMO_ROUTE_SEARCH.md) for the completed comparison and audit. That story is calculated from returned metrics, not hard-coded.

## Technology

Next.js, React, TypeScript, Tailwind CSS, Leaflet, Lucide, focused Turf utilities, and Valhalla pedestrian routing. The approved neutral/forest-green design keeps the map central.

## Data sources

Public City of Bentonville GIS Sidewalks layer 174 and a conservatively qualified subset of Parks trail layer 158 supply infrastructure. City Common_Names layer 194 supplies verified facility points. Valhalla/OpenStreetMap supplies walking candidates. This independent project is not endorsed by the City.

## Limitations

PathSafe evaluates mapped infrastructure, not personal safety. Public data can be incomplete or outdated; proximity does not verify connectivity, condition, entrances, ADA compliance, or crossing safety. Walking trips within the official Bentonville City Limits polygon are supported through resolved City place/address suggestions. The landing preview and explicitly selected mock fallback stay labeled; live failures never silently become mock results.

## Local development

Use the tested Node 24 environment:

```sh
npm ci
npm run dev
# In a second terminal, with the server running:
npm run demo:prewarm
```

Open http://localhost:3000/app and press **Compare routes**. Confirm **REAL DATA · V1**. Read the [demo/recording guide](docs/DEMO_GUIDE.md), [deployment requirements](docs/DEPLOYMENT.md), and [methodology](docs/DATA_PLAN.md).

**Deployment is prepared, not performed.** Production routing now supports Stadia hosted Valhalla using server-only `STADIA_API_KEY`. Configure it in `.env.local` for local use and in Vercel environment settings for a future deployment. See [Stadia migration/setup](docs/STADIA_ROUTING_MIGRATION.md). `npm run check:deployment` validates configuration; no deployment was performed.

---

## Implementation details and prototype scope

The approved frontend remains intact. `/app` now defaults to real analysis of the fixed **Austin-Baggett Park → Lawrence Plaza** pair, using official City GIS geometry and Valhalla pedestrian route candidates. The showcase remains preselected; users can search official City place/address suggestions for other supported Bentonville trips. The source selector separately offers a **Mock demo**. Live failures never silently become mock successes. The landing-page product preview remains mock and labeled.

Included: real candidate geometry/time/distance, alternative deduplication, route-to-infrastructure matching, meaningful mapped-coverage gaps, a versioned infrastructure score, travel-aware recommendations, subtle official infrastructure overlay, source/cache metadata, and a visible `/methodology` page.

General geocoding, accounts, crowdsourcing, AI, crossing/accessibility assessment, and expansion outside Bentonville are not implemented.

Location search uses the complete reviewed official catalog bundled with each deployment; it does not rebuild City GIS inventories during autocomplete. Source retrieval dates remain available in search diagnostics. Catalog updates require an explicit refresh and redeployment. See the [production search fix](docs/LOCATION_SEARCH_PRODUCTION_FIX.md).

## Run locally

Node 24.21.0 and npm 11.19.0 were inspected before initialization. The project pins Node 24.x for reproducible local/Vercel builds.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/app and press **Compare routes**. The initial live request retrieves provider data; subsequent comparisons use local caches. An internet connection is required for fresh GIS/routing data and the OpenStreetMap basemap.

```sh
npm run lint
npm run build
npm test
npx playwright install chromium  # one-time browser setup
npm run test:e2e
node --import tsx scripts/validate-demo.ts  # explicit low-volume live verification
node --import tsx scripts/inspect-demo.ts   # offline geometry checks on the saved run
node scripts/visual-demo.mjs               # real UI smoke test; dev server must be running
```

`npm test` uses synthetic fixtures/stubbed fetchers with no live network calls. E2E tests intercept the comparison API using a recorded real result; the separate visual smoke script checks the actual local API and cached providers.

`npm run start` serves a completed production build. **Production defaults to Stadia and requires server-only `STADIA_API_KEY`.** A configured key also selects Stadia in development. Explicit `ROUTING_PROVIDER=valhalla` retains local/private Valhalla support with `VALHALLA_URL`; production still rejects the public demo and insecure endpoints. On Vercel, temporary files and bounded memory are instance-local, not a shared durable cache; see the deployment guide.

## Data and locations

Official infrastructure endpoint:

```text
https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174/query
```

Only `OBJECTID,trltyptxt,facdescrip,surftype,bikesallow,useaccess,Closure_Status` and geometry are requested. `outSR=4326` returns WGS84 GeoJSON. Nearby feature IDs are inventoried first, then verified geometry batches of 250 are retrieved, below the advertised 2,000-record limit. Missing IDs, transfer-limit flags, API errors, malformed geometry, and timeouts fail the analysis.

Coordinates are verified against City **Common_Names layer 194**: Austin-Baggett Park record 5 and Lawrence Plaza record 67. Source response evidence is in `data/demo-search/verified-pairs.json` (pair-20); normalized points and provenance are in `data/demoLocations.ts`. These are campus/building points, not verified entrances. Provider snapping is measured and rejected beyond 100m. The Phase 1 coordinates were illustrative and remain isolated in the mock fixture.

Facility mapping is conservative: explicitly public sidewalks, paved/shared-use trails and explicit Hiking records with known surfaces qualify. Supplemental infrastructure is deduplicated before analysis; natural-surface coverage does not imply pavement or accessibility. Crossing-only records, bicycle-only facilities, shared roadways, unknown classifications/access, private/restricted use, and reported closures are excluded. The absence of a closure attribute does not establish live availability. The map shows excluded features with a separate style; they do not improve coverage. No lighting, crime, traffic, crash, ADA, or crossing-safety factors are scored.

## Routing and alternatives

Development endpoint: `https://valhalla1.openstreetmap.de/route`.

Request: `costing: pedestrian`, `alternates: 2`, `format: osrm`, `shape_format: geojson`, `units: kilometers`, `directions_type: none`. Server requests send `X-Client-Id: PathSafe-NWA-development`. At most three returned candidates are considered; missing alternatives are acknowledged, never fabricated.

Equivalent routes are removed when lengths differ by at most 2% and at least 98% of each geometry is within 5m of the other, tested bidirectionally. Provider distances and geometry lengths must agree within 10% or the response is rejected. This is a consistency check, not a quality guarantee.

## Method v1

- **Tolerance:** 15m around eligible facility lines. Exact capsule intersections in a local meter projection determine covered parameter intervals; intervals are unioned to prevent double counting. Turf geodesic segment lengths weight those intervals.
- **Coverage:** `100 × covered route meters / total geometry meters`.
- **Gaps:** uncovered intervals separated by at most 5m of covered geometry are grouped; a group must contain at least 20m of uncovered length. Covered islands remain covered in the percentage calculation.
- **Score:** `round(clamp(coverage − min(20, 2 × gaps) − min(10, 10 × max(0, routeGeometryLength / shortestGeometryLength − 1.10)), 0, 100))`.
- **Recommendation:** an alternative must improve coverage by at least 10 percentage points, add at most 5 minutes, stay within 25% added provider time AND 25% added provider distance, and have a strictly higher score than the fastest candidate. Highest qualifying score wins; faster time breaks ties. Otherwise prefer the fastest route. One candidate is shown without a comparative recommendation.

Proximity can match an inaccessible facility on the other side of a road or barrier. This does not establish connectivity, condition, access, or real safety. The 15m assumption was checked at 10/15/20m, not tuned for presentation; sensitivity and projection checks are recorded in `data/verification/geometry-checks.json`. See [DATA_PLAN.md](docs/DATA_PLAN.md) and the in-app methodology for details.

## Caching and failures

- GIS normalized response: **24 hours**, keyed by route envelope (75m padding).
- Walking candidates: **6 hours**, keyed by verified endpoints and configured provider.
- Successful responses are stored atomically under `.cache/pathsafe/` (gitignored), surviving dev restarts; Vercel uses its temporary directory instead. Bounded process memory retains warm values. Identical same-process in-flight requests are combined. Errors back off for **60 seconds** in process memory. Expired data is not served on failure.
- Each upstream request times out after **20 seconds**; the whole GIS inventory/batch sequence has a **35-second** deadline. Browser analysis requests time out after **60 seconds**. UI requests do not trigger GIS refetching on route selection.
- Empty GIS results produce an explicit warning and measured 0% mapped coverage, not a claim that facilities are absent. Partial/invalid geometry fails closed. Live failure shows **“Live route analysis is temporarily unavailable.”** Users can explicitly select the labeled mock fallback.
- Retrieval timestamps and cache hits are visible with live results. Retrieval times are not source survey or update dates. Local cache files can be removed to force a fresh low-volume development run; do not repeatedly clear them during demos.

## Historical Phase 2 real demo (2026-10-23)

This historical sidewalk-only retrieval predates the [official trail audit](docs/DEMO_ROUTE_SEARCH.md). The approved CAC default is now **Austin-Baggett Park → Lawrence Plaza**, measuring **74.64% → 96.39%**, a **21.75 pp** gain, with scores **69 → 94**. The old trip remains historical validation evidence. The table below preserves the original evidence rather than substituting new measurements into an old fixture.

311 City features were retrieved in the candidate envelope: 235 classified sidewalk, 76 crossing-only. Of 311 line parts, 233 sidewalks qualified; 76 crossings and 2 records without explicit public access were excluded. No trail or bicycle-class feature was returned in this small envelope; this is not a citywide inventory.

| Candidate                   | Provider time | Provider distance | Measured coverage | Meaningful gaps | Score |
| --------------------------- | ------------: | ----------------: | ----------------: | --------------: | ----: |
| Fastest                     |     33.71 min |         2,843.35m |            50.55% |               6 |    39 |
| Alternative 1 (recommended) |     34.00 min |         2,884.65m |            65.54% |               4 |    58 |
| Alternative 2               |     34.27 min |         2,898.35m |            37.32% |               7 |    23 |

Alternative 1 adds about 17.4 seconds and 41.3m while improving measured coverage by 14.99 percentage points. These are measured results from a saved provider/GIS retrieval, not constants used by the runtime. Data/provider updates may change them. See [Phase 2 validation](docs/PHASE2_VALIDATION.md) for covered/uncovered lengths, alternative differences, sensitivity, and screenshots.

## Architecture

- `app/`: approved pages plus `/methodology` and Node `/api/compare` POST handler.
- `components/`: existing reusable map, cards, score, preview, and controls; source-aware labels and computed explanations.
- `types/routes.ts`: normalized route, infrastructure, metric, comparison, provenance, and recommendation contracts.
- `data/mockRoutes.ts`: isolated Phase 1 fixture. `data/demoLocations.ts`: verified real endpoints. `data/verification/`: dated evidence/recorded results, not a live fallback.
- `lib/presentation/recommendation.ts`: display-only, calculated tradeoff copy; scoring/ranking stay unchanged.
- `lib/config.ts`: deployment routing validation and safe endpoint attribution.
- `lib/routes.ts`: client-facing `getRouteComparison()` boundary; live uses the server API, mock must be explicit.
- `lib/routing/provider.ts`, `index.ts`, `valhalla.ts`: replaceable walking provider and validated normalization; no Valhalla dependency in UI components.
- `lib/gis/bentonville.ts`: minimal fields, scoped queries, complete ID batching, normalization, eligibility rules.
- `lib/analysis/`: length/projection, indexed capsule intersections, interval union, gap grouping, and comparison orchestration.
- `lib/scoring/`: unit-tested score and recommendation thresholds.
- `lib/server/`: timed upstream fetch and local response cache.
- `tests/`: offline geometry/provider/cache tests and browser result/failure/fallback workflows.

## Frontend and accessibility

Next.js 16.4.3, React 19.3.1, TypeScript, Tailwind CSS 4, Lucide, Leaflet/React-Leaflet, locally bundled Manrope, focused Turf helpers/length, ESLint 10, Prettier, and Playwright. The map is dynamically imported with SSR disabled in a client component.

The approved off-white/forest-green design is retained. Desktop uses a scrolling control/result panel with a large map; mobile stacks the map/key above results. Semantic controls, labels, skip link, visible focus, source badges, route pressed states, score meters, live announcements, reduced motion, and text explanations remain. The submit action waits for client hydration. Map attribution remains visible; City GIS attribution does not imply endorsement.


## General Bentonville locations

PathSafe currently supports walking trips within Bentonville, Arkansas. Search places or addresses (at least three characters), choose a suggestion for each endpoint, then compare. The City public place/address provider returns normalized coordinates and metadata. All trips use the same unchanged scoring, GIS eligibility, 15m tolerance and recommendation rules. Server validation uses the official City Limits polygon, checks full candidate geometry, rejects outside or near-identical endpoints, and never silently falls back to mock data. See [general location validation](docs/GENERAL_LOCATION_SUPPORT.md) and [deployment requirements](docs/DEPLOYMENT.md).
