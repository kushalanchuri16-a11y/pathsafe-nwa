# PathSafe NWA: CAC recording guide

Use the real local development pipeline for recording. This keeps the public Valhalla demo at low volume and makes the existing cache reusable. This guide does not authorize deployment.

## 1. Start the local server

From the project directory, with the tested Node 24 environment:

```sh
cd ~/pathsafe-nwa
npm ci                    # only if dependencies are not already installed
npm run dev
```

Keep this terminal running. If port 3000 is occupied, use `npm run dev -- --port 3001` and substitute that port below. Do not start multiple copies unnecessarily.

## 2. Confirm internet

Open http://localhost:3000/app. Confirm the Bentonville basemap loads, with attribution in the corner. Fresh route and GIS requests also require internet. A loaded basemap does not establish that the other providers are available.

## 3. Prewarm the live route

In a second terminal:

```sh
cd ~/pathsafe-nwa
npm run demo:prewarm
# For a different local port:
# npm run demo:prewarm -- http://localhost:3001
```

The command makes one request to the running app's real comparison API. It prints **REAL DATA prewarm complete**, the measured metrics, retrieval timestamps, and cache-hit status. On a cold cache, the server retrieves official GIS and real pedestrian routes. On a warm cache, the same validated provider responses are reused. It never seeds the cache with recorded snapshots or mock fixtures.

Prewarm shortly before recording. Route cache TTL is 6 hours; GIS cache TTL is 24 hours. Do not repeatedly clear caches or hammer Compare routes to work around an upstream outage. Card selection, map zooming, and expanded methodology do not cause route/GIS refetches. Local caches survive development restarts; Vercel's temporary cache does not provide the same persistence guarantee.

## 4. Open the app

Open http://localhost:3000/app at the intended recording resolution (1440×1000 or 1280×900 works well). Confirm:

- Analysis source: **Live analysis · City GIS + walking routes**.
- Start: **Austin-Baggett Park**.
- Destination: **Lawrence Plaza**.

The landing preview is intentionally illustrative and labeled MOCK DATA. Use `/app` for the live comparison story.

## 5. Run the comparison

Click **Compare routes**. The app shows the analysis steps without fabricated progress percentages. Once ready, it brings the comparison heading into view, with the computed tradeoff and two primary cards. Select the fastest card and then the recommended **PathSafe Route** to highlight each on the map. The additional real candidate remains available under **View 1 more walking alternative**.

## 6. Verify the REAL DATA badge

Verify **REAL DATA · V1** beside the result heading. Expand **Data sources & limitations** to confirm official City GIS attribution, retrieval timestamps, feature counts, and cache hits. These are retrieval dates, not source update dates.

Mock mode has a warning banner, MOCK DATA badge, and illustrative-value labels. Do not describe its metrics as live measurements.

## 7. Expected approximate result

The audited two-source retrieval from 2026-10-23 produced (see [demo search](DEMO_ROUTE_SEARCH.md)):

| Candidate               |      Time | Distance | Mapped coverage | Meaningful gaps | Score |
| ----------------------- | --------: | -------: | --------------: | --------------: | ----: |
| Fastest                 | 17.41 min |  0.92 mi |          74.64% |               3 |    69 |
| Recommended alternative | 17.49 min |  0.92 mi |          96.39% |               1 |    94 |
| Additional alternative  | 17.61 min |  0.92 mi |          80.27% |               3 |    74 |

The primary story is about **5 seconds longer for over 21 percentage points more mapped coverage**. The UI computes this from returned metrics; it is not a runtime constant. Provider/GIS updates can change these values or the recommendation. Do not tune the methodology or force an outdated result for the video.

Expand **Why is this route recommended?** to show the plain-English explanation and measured benefits. Then open `/methodology` to explain what is measured and what is not. Technical equations are collapsed by default.

## 8. If routing or GIS is unavailable

The app shows **Live route analysis is temporarily unavailable.** No mock result is silently substituted. Keep the status visible, wait at least a minute before retrying, and inspect server logs if necessary. Preserve the cache; clearing it can make an upstream outage harder to demonstrate around.

If production configuration is missing, the deployment check/server logs name `VALHALLA_URL`. Do not point a production deployment at the public demo to bypass that guard. Use the local development server for this recording or supply an appropriate hosted/private provider later.

## 9. Explicitly switch to demo fallback

Click **View demo data** on the unavailable state. This explicitly loads mock mode and shows its warning banner and MOCK DATA badge. Alternatively, select **Mock demo · illustrative values** in Analysis source and press Compare routes. Say clearly that the fallback is illustrative. To return to real analysis, select Live analysis and compare again.

## Recording language

Say “mapped pedestrian infrastructure coverage,” “measured coverage gaps,” and “the recommended route.” Explain that PathSafe evaluates mapped infrastructure, not personal safety. Do not claim current conditions, verified entrances, guaranteed connectivity, ADA compliance, or accident prevention. City data use does not imply City endorsement.

## Verified coordinates and current validation

City Common_Names layer 194: Austin-Baggett Park OBJECTID 5, 601 SE D ST, `[36.36571210106438, -94.20363133075323]`; Lawrence Plaza OBJECTID 67, 214 NE A ST, `[36.374649832783945, -94.20753355872435]` (latitude/longitude). Evidence: `data/demo-search/verified-pairs.json`, pair-20. These are official facility points, not independently verified entrances.

The approved fixed demo replaces BHS → Library. Prewarm reads `data/demoLocations.ts`, so it now warms this new pair automatically. Normal real GIS/routing responses and cache lifetimes remain in use; no recorded fixture is injected into runtime. The verified result adds **4.753 seconds**, is **8m shorter**, gains **21.74556136 pp**, and changes score **69 → 94**, meaningful gaps **3 → 1**. Both cards round distance to 0.92 mi; use the source metrics for the precise difference.

The headline and recommendation factors come from live metrics: “About 5 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.” Expand the explanation to show higher coverage, fewer meaningful gaps, and minimal extra travel time. This compares mapped infrastructure and makes no claim that the route is objectively safer. Live provider or City-data updates may change the measurements. The ~75% / ~96% landing preview is separate illustrative mock data.

## General Bentonville location search

The approved showcase remains preselected and prewarms without geocoding. To demonstrate another supported trip, type at least three characters into either location input, pause for suggestions, and choose one with Arrow Down / Enter or a pointer/touch. Selected coordinates are required. Clear buttons allow replacement. Selecting locations updates map markers without starting route analysis; use Compare routes when both are selected. All real trips use the same analysis rules and show REAL DATA · V1 only after success.

PathSafe currently supports walking trips within Bentonville, Arkansas. City place/address data, walking routes and GIS coverage may be incomplete. Outside coordinates or route geometry are rejected. No arbitrary raw text, biking, accounts, or automatic mock substitution is supported. The explicit mock demo remains the separate illustrative showcase.
