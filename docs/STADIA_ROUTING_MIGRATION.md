# Stadia hosted Valhalla migration

October 24, 2026. **Implemented and validated locally. Nothing deployed.**

## Provider architecture

`walkingRoutingProvider` keeps the existing normalized walking-provider contract. Its server-side adapter now resolves either Stadia hosted Valhalla or the existing local/private Valhalla service. Stadia-specific endpoint/authentication/encoding work stays in `lib/routing/`; analysis, scoring, search and UI do not choose providers.

Stadia uses **https://api.stadiamaps.com/route/v1**. Authentication uses the documented `Authorization: Stadia-Auth <key>` header. The credential never enters the request URL, response provenance, cache key or client JavaScript. See [Stadia authentication](https://docs.stadiamaps.com/authentication/) and [standard routing](https://docs.stadiamaps.com/routing/standard-routing/).

The request preserves the exact selected start/destination coordinates, `costing: pedestrian`, `alternates: 2` (up to three routes), `units: kilometers`, `format: osrm`, and `directions_type: none`.

**Necessary transport difference:** live Stadia requests rejected `shape_format: geojson` with HTTP 400, stating that only `polyline6` or `polyline5` were accepted. Stadia therefore receives `shape_format: polyline6`. A strict decoder turns that six-decimal encoded geometry into the existing GeoJSON `[longitude, latitude]` representation before the unchanged `parseValhalla` function runs. Local/private Valhalla still requests GeoJSON directly. Axis order, normalized `[latitude, longitude]` coordinates, seconds, meters, miles/minutes conversion, route deduplication, 100m endpoint-snap check and subsequent per-alternative City Limits validation are preserved.

Routing cache keys now include provider identity and a versioned namespace, keeping old public-demo entries separate from Stadia results. The six-hour success TTL, coalescing and one-minute failure backoff are unchanged. Successful cached routes do not contain credentials. Configuration is checked before cache access. No routing failure switches providers or substitutes mock data.

## Environment and provider selection

| Variable | Purpose |
|---|---|
| `STADIA_API_KEY` | Server-only Stadia credential; required when Stadia is selected |
| `ROUTING_PROVIDER` | Optional `stadia` or `valhalla`; rejects other values |
| `VALHALLA_URL` | Existing optional local/private Valhalla `/route` URL |

Selection order:

1. Explicit `ROUTING_PROVIDER` wins.
2. Otherwise, a configured Stadia key selects Stadia, including in local development.
3. Otherwise, an existing `VALHALLA_URL` retains the legacy private-provider configuration.
4. Otherwise, production selects Stadia and fails clearly if its key is missing. Development retains the public Valhalla demo for keyless local work.

Explicit `ROUTING_PROVIDER=valhalla` does not send a Stadia key, even if one is configured. Existing production rules still block insecure/public-demo Valhalla URLs. Never use `NEXT_PUBLIC_STADIA_API_KEY`.

## Local setup

Create or update the ignored `.env.local` with your real credential:

```dotenv
STADIA_API_KEY=<local secret>
ROUTING_PROVIDER=stadia
```

The provider variable is optional but makes the intended configuration explicit. `.env.example` contains only commented placeholders. `.gitignore` already ignores `.env*`, except `.env.example`; `.env.local` remains ignored and untracked. The existing local key was used without printing, copying, modifying or committing it.

Restart the local server after changing environment variables:

```sh
npm run dev
# Separate terminal:
npm run demo:prewarm
```

Production-mode local verification:

```sh
npm run check:deployment
npm run build
npm run start
```

Stop the development server before building. In this workspace, a separate unrelated app owns IPv4 port 3000; PathSafe was verified over IPv6. Prewarm used `npm run demo:prewarm -- 'http://[::1]:3000'` to reach PathSafe specifically. This is a local host arrangement, not a routing configuration requirement.

## Vercel setup — instructions only

In the Vercel project's environment settings, add **server-side** `STADIA_API_KEY` and optionally `ROUTING_PROVIDER=stadia` for each intended environment (Production and, if desired, Preview). Do not prefix the key with `NEXT_PUBLIC_` or commit a secret file. Remove a stale explicit `ROUTING_PROVIDER=valhalla` when choosing Stadia. `VALHALLA_URL` is unnecessary for Stadia and is ignored when Stadia is selected.

Use the existing Next.js project settings, Node 24.x, `npm ci` and `npm run build`. Environment changes apply to a subsequent deployment; no deployment was started here. See [Vercel environment variables](https://vercel.com/docs/environment-variables) and the project's [deployment guide](DEPLOYMENT.md).

The application retains its Node API runtime and 60-second function budget. Outbound HTTPS must reach Stadia and the existing City GIS services. Existing Vercel caches remain ephemeral and instance-local. Confirm the account's routing entitlement/quota and the selected Vercel plan before public launch; these were not provisioned or changed by this work.

## Error handling

| Condition | Result |
|---|---|
| Missing/invalid provider configuration | `ROUTING_NOT_CONFIGURED`, HTTP 503; static application unavailable message; safe server log identifies the required variable |
| Stadia 401/403 | `ROUTING_AUTHENTICATION_FAILED`, HTTP 503; clear server-credential guidance |
| Stadia 429 | `ROUTING_RATE_LIMITED`, HTTP 503; retry-later guidance |
| Fetch/body timeout | `ROUTING_TIMEOUT`, HTTP 503 |
| Malformed JSON, geometry or route fields | `ROUTING_MALFORMED_RESPONSE`, HTTP 503 |
| Network/other upstream failure | `ROUTING_UNAVAILABLE`, HTTP 503 |
| OSRM NoRoute/NoSegment/empty routes, or Valhalla error 442 | Existing no-walking-route location guidance, HTTP 400 |
| All candidates leave City Limits | Existing `ROUTE_OUTSIDE_SUPPORTED_AREA`, HTTP 422 |

Provider-unavailable errors retain `Cache-Control: no-store` and `Retry-After: 60`. Provider bodies and fetch exception messages/causes are not forwarded or logged. Authorization headers are sent only to the fixed Stadia origin/path, and redirects are rejected. Failure responses contain no route or mock comparison.

The only change to `lib/analysis/compare.ts` is importing/passing through the sanitized provider error after the existing no-route classification. Coverage, recommendation, inventory and boundary processing are unchanged.

## Real local results

Locations were selected from the existing official catalog/address API. No coordinates or destinations were invented. Full measured metrics, endpoint coordinates, geometry hashes and boundary assertions are in [validation evidence](STADIA_ROUTING_VALIDATION.json).

| Trip | Provider candidates | Retained | Fastest → chosen coverage | Score | Meaningful gaps | Added time | Added provider distance |
|---|---:|---:|---:|---:|---:|---:|---:|
| Austin-Baggett Park → Lawrence Plaza | 3 | 3 | 74.643698% → 96.389260% | 69 → 94 | 3 → 1 | 5.753s | −8m |
| 3809 SW Mistletoe Ave → Crystal Bridges | 3 | 1 | 89.763687% → 89.763687% | 74 → 74 | 8 → 8 | 0s | 0m |
| Bentonville Public Library → Memorial Park | 3 | 3 | 72.985576% → 72.985576% | 61 → 61 | 6 → 6 | 0s | 0m |

All endpoints and retained route segments passed the existing official boundary policy. Mistletoe's two outside-city alternatives were independently rejected; the valid retained route was still analyzed. The library trip keeps the fastest route because no alternative qualifies under the existing recommendation rules.

The showcase's coverage, scores, gaps, 21.745561 percentage-point gain and 8m-shorter recommendation match the recorded public-provider example. Stadia's fastest duration is **1050.538s**, recommended duration **1056.291s**, versus recorded **1044.537s / 1049.290s**. The incremental cost therefore changes from **4.753s** to **5.753s**. This provider-reported timing difference was accepted without tuning. The real UI correctly renders **“About 6 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.”**

Recorded landing showcases and mock previews remain clearly labeled and unchanged. Live cards use current metrics; no new runtime values were hardcoded. Live responses can change with provider/GIS updates. The production prewarm reused successful real Stadia/GIS caches normally.

## Security verification

- Only the server routing adapter reads the non-public environment credential and sends the authorization header.
- Actual configured key absent from 31 production browser assets, current tracked/unignored source files and committed HEAD contents.
- Actual key absent from the validation/server logs inspected. Tests deliberately inject secret-bearing upstream errors and verify sanitized responses/logs.
- A real production-browser comparison exposed neither the key nor Stadia authentication headers in browser requests, response payload or rendered results; the browser made no direct Stadia request.
- `.env.local` and `.env.production` are ignored; `.env.example` is the only tracked environment template.
- No key appears in URLs, public provenance, recorded test fixtures or cache keys. No new dependencies or client-side provider integration were introduced.

## Files changed

| File | Change |
|---|---|
| `lib/routing/config.ts` | Server provider selection and fixed Stadia endpoint |
| `lib/routing/transport.ts` | Header authentication, fixed-target protection, timeout and sanitized upstream errors |
| `lib/routing/stadia.ts` | Strict polyline6-to-GeoJSON adapter |
| `lib/routing/errors.ts` | Static, safe provider error codes/messages |
| `lib/routing/valhalla.ts` | Select transport format/configuration; retain existing parser and normalized output |
| `lib/routing/index.ts` | Clarify shared provider architecture |
| `lib/analysis/compare.ts` | Preserve sanitized provider error classification only |
| `app/api/compare/route.ts` | Return actionable sanitized provider failures |
| `scripts/check-deployment.ts` | Validate production Stadia/private-provider configuration without printing credentials |
| `.env.example` | Document server-only key/provider configuration |
| `tests/providers.test.ts` | Isolate the missing-production-configuration regression from any inherited Stadia environment |
| `tests/stadia.test.ts` | Configuration, request/auth, alternatives/units, decoder, failures, no fallback and no-secret-leak regressions |
| `tests/fixtures/stadia-showcase.json` | Unmodified credential-free live Stadia OSRM response for offline tests |
| `README.md`, `docs/DEPLOYMENT.md`, `docs/DEMO_GUIDE.md` | Replace stale production configuration guidance; disclose provider timing difference |
| `docs/STADIA_ROUTING_VALIDATION.json` | Three-trip live evidence and frozen-file checks |
| `docs/STADIA_ROUTING_MIGRATION.md` | This report |

Next may regenerate `next-env.d.ts` between build/dev type paths; this is not an intentional product change.

## Validation and readiness

| Check | Result |
|---|---|
| Targeted routing/provider/reliability/presentation unit tests | PASS — 36/36 |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS — 186/186 |
| `npm run test:e2e` | PASS — 44/44 |
| `npm run demo:prewarm` (explicit local IPv6 base) | PASS — REAL DATA via Stadia |
| `npm run check:deployment` | PASS — Stadia production configuration |
| Three requested live trips | PASS — all return live supported routes |
| Real production browser/security smoke check | PASS — live six-second explanation, no page errors or exposed key |
| Protected functionality | PASS — 436/437 frozen analysis/GIS/geocoding/data files byte-identical; sole difference is provider-error propagation in `compare.ts`; scoring files unchanged |

Browser regression tests use existing controlled fixtures; the separate three-trip/API and production-browser checks above used real Stadia results. Existing routing, boundary-hole and per-alternative regression tests remain passing. No UI/design, catalog, scoring, eligibility, boundary, recommendation-threshold or 15m matching change was made.

**GO for Vercel deployment preparation:** Stadia works locally in development and the production build; configure the server secret and provider/account settings in Vercel before an authorized deployment. Vercel itself has not been deployed or tested by this task. Public traffic capacity and existing serverless/GIS limitations remain as documented.
