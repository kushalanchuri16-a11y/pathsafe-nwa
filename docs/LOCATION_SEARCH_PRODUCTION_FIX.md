# Production location-search diagnosis and fix

October 25, 2026. Fix verified locally in development and production mode. **No commit, push or deployment performed.**

## Exact failure

`getUnifiedCatalog()` treated the committed official catalog as a 24-hour cache seed. Once inventories expired, it discarded those records as usable seeds and called `fetchOfficialLocationSources()` before completing any search. That rebuild loads 27 inventories, including large address datasets, through a serialized City GIS request queue. Each upstream request can take up to 20 seconds; the entire rebuild had no autocomplete-sized deadline.

The snapshot was created on October 24 at 19:44 UTC. All 27 inventory TTLs had expired by this investigation. The browser aborts location searches after 15 seconds, while Vercel's location API has a 60-second function budget. Increasing either timeout would leave autocomplete dependent on a citywide rebuild.

Observed evidence:

- Direct deployed Crystal Bridges search returned HTTP **504**, `FUNCTION_INVOCATION_TIMEOUT`, after **60.448 seconds**. Across the eight-query comparison, five requests timed out around 60 seconds; three completed slowly with partial-source warnings.
- Even successful rebuilds excluded the official parks-directory inventory because its supporting evidence also had a hard 24-hour expiry. This removed Creekside Park's verified mapping. The warmed local production rebuild returned no matches for Walmart Museum, Creekside Park or Whole Health.
- Local development also exceeded the 65-second observation limit for all eight baseline requests. Local production subsequently reused source caches warmed during that rebuild; it returned after about 5.4 seconds, but with incomplete search results. These baseline modes had different cache states and should not be compared as identical cold starts.
- A small direct query to the already-integrated City named-place endpoint returned HTTP 200 in 0.159 seconds. Some Vercel searches also returned 26 healthy GIS inventories. Outbound City connectivity is therefore not universally blocked; the request-time full-catalog rebuild and expiry dependency are the confirmed problem. Private Vercel networking/logs were not available for inspection.

## Checks requested

| Check | Finding |
|---|---|
| External search/GIS dependency | Expired catalog caused blocking requests to existing official sources; removed from runtime autocomplete |
| Timeouts | Browser 15s, individual upstream 20s, Vercel function 60s; unchanged because the rebuild does not belong inside search |
| Catalog bundled | Existing 5.1MB compressed snapshot is tracked; both baseline and fixed local production traces explicitly include it; no catalog records changed |
| Deployed filesystem | Cannot inspect private Vercel function contents via its public API; checked the committed asset, tracing configuration and generated function trace instead |
| Environment variables | No location-search credential or environment variable is required; `STADIA_API_KEY` is for routing only |
| CORS/runtime/cache | Browser calls same-origin `/api/locations`; City requests were server-side Node fetches, not browser CORS requests. Ephemeral/missing caches made the blocking rebuild particularly unreliable in serverless mode |
| Why demo works | Default park/plaza selections come from `data/demoLocations.ts` and bypass autocomplete through `validateTrip`; their success did not establish catalog health |
| Direct production API | Confirmed intermittent 504s/slow partial results independently of the UI |
| Local production | Built and ran baseline and fixed versions separately; baseline partial/missing results, fixed complete results |

## Smallest safe correction

Autocomplete now loads the **existing, complete official deployment snapshot** and builds one coalesced in-memory search index per process. The source-fetch TTL no longer determines whether deployed locations are searchable. There are no hardcoded place-name responses, new records, new sources or external geocoders.

The same snapshot unpacking, boundary revalidation, deduplication, verified-name reconciliation, indexing, fuzzy ranking and supported-location filters still run. A snapshot must contain the expected schema and all current source identities. Missing, corrupt or incomplete assets return the existing unavailable response promptly; they do not start an unbounded rebuild or silently fall back to demo points.

Search diagnostics retain original `fetchedAt` timestamps and explicitly identify bundled inventories. This is a **versioned reviewed catalog, not live-refreshed location data**. New City records/changes require an explicit catalog refresh, review and redeployment. The existing refresh tools and their conservative validation remain unchanged; no refresh or source discovery was run for this fix. See [deployment maintenance instructions](DEPLOYMENT.md).

The only client change converts native timeout/abort exception text into “Location search timed out. Please try again.” The existing spinner cleanup, 15-second deadline, debounce, selection rules and design are retained.

## Search comparison

Full timings, returned labels, diagnostics and browser evidence are in [validation JSON](LOCATION_SEARCH_PRODUCTION_VALIDATION.json). All eight real browser suggestion checks passed against the unmocked local production API. The broad `Walmart` query also returned HTTP 200 with eight suggestions after the fix.

| Search | Vercel existing deployment | Local production before | Local production fixed | Local dev fixed |
|---|---|---|---|---|
| Crystal Bridges | 504 / 60.8s | 3 matches, partial | 3 matches / 4720ms | 3 / 5180ms |
| Bentonville Public Library | Partial / 12.9s | 3 matches, partial | 3 / 13ms | 3 / 32ms |
| Walmart Museum | 504 / 60.7s | **0 matches** | 1 / 8ms | 1 / 18ms |
| Creekside Middle School | 504 / 60.4s | 1 match, partial | 1 / 11ms | 1 / 16ms |
| Creekside Park | 504 / 60.7s | **0 matches** | 1 / 9ms | 1 / 14ms |
| Osage Park | Partial / 55.7s | 1 match, partial | 1 / 7ms | 1 / 10ms |
| Northwest Arkansas Hindu Temple | Partial / 11.9s | 2 matches, partial | 2 / 10ms | 2 / 11ms |
| Walton Family Whole Health & Fitness | 504 / 60.7s | **0 matches** | 1 / 14ms | 1 / 15ms |

The first fixed request includes cold snapshot loading/indexing (and dev compilation where applicable). Remaining requests reuse the index. Measurements are local observations, not production latency guarantees. Multiple temple records retain the existing explicit-choice behavior.

**The deployed Vercel site has not received this fix.** Its column describes the diagnosed version, not a post-deployment verification. Repeat these eight direct/API/browser checks after an authorized redeployment.

## Route regressions and frozen behavior

Both requests used the actual local production comparison API and returned `source: live`:

- **Austin-Baggett Park → Lawrence Plaza:** HTTP 200, three retained candidates; fastest **74.643698%**, score **69**, **3** meaningful gaps; recommended **96.389260%**, score **94**, **1** meaningful gap.
- **3809 SW Mistletoe Ave → Crystal Bridges:** HTTP 200; three candidates received, one retained; **89.763687%**, score **74**, **8** meaningful gaps. Two outside-city alternatives remain excluded.

No scoring, recommendation thresholds, route-provider requests, route analysis, GIS matching/eligibility, 15m tolerance or city-boundary rules changed. No runtime comparison values were hardcoded. The existing comment-only edit in `lib/analysis/compare.ts` was present before this task and was preserved byte-for-byte as a diff; it is not part of this fix.

## Files changed by this fix

| File | Purpose |
|---|---|
| `lib/geocoding/catalog/index.ts` | Serve the complete bundled snapshot without blocking live rebuilds; validate assets and share the index |
| `components/LocationSearch.tsx` | Human-readable timeout recovery text only |
| `tests/catalog-runtime.test.ts` | Expired snapshot with blocked network/future clock, all eight searches, coalescing, complete-asset checks, missing-asset fast failure |
| `tests/locations.spec.ts` | Browser timeout clears loading state and allows another search |
| `README.md` | Explain deployment snapshot search and refresh maintenance |
| `docs/DEPLOYMENT.md` | Replace obsolete runtime-search refresh guidance |
| `docs/LOCATION_SEARCH_PRODUCTION_FIX.md` | This diagnosis/report |
| `docs/LOCATION_SEARCH_PRODUCTION_VALIDATION.json` | Environment comparison, real browser checks and route evidence |

## Validation

- `npm run lint`: **PASS**.
- `npm run build`: **PASS**; full catalog asset present in the production function trace.
- `npm test`: **189/189 PASS**.
- `npm run test:e2e`: **48/48 PASS** across desktop/tablet/mobile projects.
- Targeted catalog regressions: **58/58 PASS**.
- All eight required searches: **PASS** in fixed local dev, local production API and real unmocked browser flow.
- Both required live route regressions: **PASS**.
- Expiry regression advances the clock to 2030 and blocks all network calls: complete search still works without modifying retrieval timestamps.
- Missing-asset regression uses an empty deployment directory: prompt unavailable error and **zero external requests**.

## Commit and push

The following stages only this fix and leaves the earlier analysis comments unstaged:

```sh
git add README.md components/LocationSearch.tsx lib/geocoding/catalog/index.ts \
  tests/catalog-runtime.test.ts tests/locations.spec.ts docs/DEPLOYMENT.md \
  docs/LOCATION_SEARCH_PRODUCTION_FIX.md docs/LOCATION_SEARCH_PRODUCTION_VALIDATION.json
git commit -m "Fix production location search catalog loading"
git push origin main
```

Vercel must build/deploy the new commit before the public site can be verified as fixed. No commit, push or deployment was performed here.
