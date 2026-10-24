# Vercel deployment preparation

Status: code prepared and locally validated. **Nothing has been deployed and no paid infrastructure has been purchased or configured.** Deployment still requires owner approval and a suitable routing service.

## Required production configuration

Set `VALHALLA_URL` in the Vercel project environment to an **HTTPS hosted/private Valhalla `/route` endpoint** whose operator permits your expected traffic. Include the complete path, such as `https://your-routing-host.example/route`. Do not use the illustrative example as a real endpoint.

The production resolver rejects missing values, malformed URLs, non-HTTP(S) protocols, URL user credentials/fragments, paths not ending in `/route`, insecure HTTP, and the public `*.openstreetmap.de` demo domain. The public Valhalla default remains available only in development/testing. Public-demo usage is not a substitute for an approved production provider.

If the provider needs a query key, it remains server-side; public result provenance exposes only the endpoint origin/path. Do not put credentials in `NEXT_PUBLIC_*` values. Provider endpoints are configuration, never user input.

Run before approving a deployment:

```sh
# Put the real value in .env.local (gitignored), or provide it in the shell environment.
npm run check:deployment
npm run lint
npm test
npm run build
npm run test:e2e
```

The check validates configuration syntax/policy without calling the provider. It does not verify capacity, authentication, pricing, terms, or availability. A successful check with a placeholder is not evidence of a working routing service.

The build succeeds without contacting upstream APIs, so previews and static pages can be built safely. If live production configuration is absent, `/api/compare` returns HTTP 503 with code `ROUTING_NOT_CONFIGURED`; server logs identify the missing requirement and the UI displays the unavailable state. No mock substitution occurs.

## Vercel project settings for a future approved deployment

- Framework preset: **Next.js**, repository root as the project root.
- Node: **24.x**, matching the tested development environment and package engines.
- Install: `npm ci`; build: `npm run build`; default Next.js output handling.
- Set `VALHALLA_URL` separately for each environment in which live analysis is intended. Do not leave a production secret in source control.
- The Node API handler declares `maxDuration=60`. Confirm the chosen Vercel plan/runtime permits this duration. Individual upstream requests stop at 20s, the GIS sequence at 35s, and client comparison requests at 60s.
- Permit outbound HTTPS to the configured routing provider and `gis.bentonvillear.com`. Browsers load the OpenStreetMap basemap separately.
- Framework-generated metadata uses the Vercel production/preview domain environment automatically; local builds use localhost. Confirm the final Open Graph URL and icon after the actual domain exists.

No deployment command is part of the current task. Approval is required before publishing.

## Caching and serverless limits

Local development stores GIS data for 24h and routes for 6h under `.cache/pathsafe`; the demo-prewarm command uses the running server so both requests share that cache. Bounded process memory preserves successful values even if filesystem persistence is unavailable. Same-process requests coalesce, and failures back off for 60s.

On Vercel, cache files use the writable temporary directory, not the read-only application tree. This is **ephemeral and instance-local**. Cold starts, scaling, eviction, and redeployment can cause new upstream requests. There is no cross-instance cache lock or distributed rate limit. Do not promise a six-hour shared cache across all instances. The local JSON cache and process memory are not a database.

A low-volume preview still needs an authorized hosted/private routing provider. Before a broad public launch, assess a shared cache, concurrency/rate limits, provider capacity, and monitoring. No paid service is provisioned in this pass. Expired results are not silently served as fresh if retrieval fails.

## Before any public launch

Verify the actual hosted provider returns pedestrian OSRM-format GeoJSON and alternatives, confirm source attribution remains visible, check cold and warm requests, verify an unavailable provider remains explicitly unavailable, and review data limitations. General Bentonville place/address search is implemented; validate the official boundary snapshot and City search-service availability before deployment. PathSafe does not evaluate personal safety or guarantee conditions.

See [DEMO_GUIDE.md](DEMO_GUIDE.md) for the local CAC recording path, which can use the public development server conservatively with prewarmed responses.

## Platform references

Vercel's [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) document Node 24.x and the package engine override. Review [Function limits](https://vercel.com/docs/functions/limitations) and [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) against the actual project/plan before approval.


## Geocoding and municipal boundary

Development uses official City of Bentonville public ArcGIS queries: Community_Development23/MapServer/194 for named permanent places and Bentonville_Addresses23/MapServer/2 for street addresses. The normalized `GeocodingProvider` contract in `lib/geocoding/provider.ts` isolates UI from the City schema. Switch the server-side provider in `lib/geocoding/index.ts` for a dedicated autocomplete-capable service if City capacity/terms are unsuitable. No Nominatim public endpoint is used: its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) forbids autocomplete, even with debouncing.

Minimum three characters, 450ms browser debounce, bounded client cache, 24-hour server search cache, coalesced identical queries, and serialized provider calls starting no more often than once per second per running process keep local CAC use low volume. No background geocoding of default showcase points. These limits are not distributed rate limiting; multiple instances require a shared cache/limiter and an agreed capacity plan. City services have no assumed production SLA or guaranteed search completeness. Confirm permission/capacity with the operator or supply an appropriate dedicated provider before a public deployment. A low-volume local CAC recording is the validated setup; public deployment is not yet approved. No purchases or deployment performed.

Official City Limits polygon: Planning/Pending_PZitems_Publish23/MapServer/5, OBJECTID 74, LABEL BENTONVILLE, saved WGS84 GeoJSON under `data/boundary/`. Update it deliberately and revalidate boundary holes, representative locations and the showcase before release; do not substitute a bounding box. Points, snapped endpoints and candidate line segments must all remain inside. Each candidate is checked independently. Alternatives that leave the supported area are excluded with an explicit provenance warning; remaining supported candidates are relabeled by travel-time order and analyzed using unchanged rules. If no candidate stays inside, the API returns ROUTE_OUTSIDE_SUPPORTED_AREA (422), not an invalid-location error. No outside-distance tolerance is used.

Arbitrary trips use route-local 75m-padded envelopes. Envelopes larger than the unchanged source fetchers' 0.08-degree limit are split into bounded tiles, queried only where candidate segment envelopes intersect. Existing ID inventories, verified geometry batches, TTLs and eligibility rules remain active. Large/complex trips can still exceed function deadlines. The local cache stores search results and route coordinates; provide an appropriate retention/privacy policy before accepting public residential searches. Search text is not sent to Nominatim or logged by application handlers.

Reliability update: an explicit ArcGIS `objectIds: null` is treated as empty only after an independent count query with identical filters confirms zero. Missing IDs, contradictory counts and transfer-limit responses still fail. This is retrieval compatibility, not an eligibility or scoring change. Run production builds separately from an active development browser audit, then restart the development server before clean-browser checks to avoid testing stale development assets.
