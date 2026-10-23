# PathSafe NWA — demo quality search

> Historical search report. The user subsequently approved Austin-Baggett Park → Lawrence Plaza as the default. See [CAC default validation](CAC_DEFAULT_DEMO.md) for the implementation and current live evidence. Statements below about retaining the old default describe the search stage.

Search and City GIS audit: **October 23, 2026**. Twenty location pairs were fixed before their routing results were analyzed. All twenty succeeded. This is a bounded search of meaningful public destinations, not a claim to have found the best trip anywhere in Bentonville.

**Recommended for review: Austin-Baggett Park → Lawrence Plaza; Sugar Creek Elementary School → Lawrence Plaza; Thomas Jefferson Elementary School → Library (backup).** The first two meet the requested target. The default remains Bentonville High School → Library. No deployment, UI redesign, Phase 3 feature, scoring change, or route-specific threshold change was made.

## Official data audit

City REST source inventories and relevant layers were inspected across Parks, Planning and Transportation. Metadata, field domains, grouped attribute counts, ID inventories and feature geometries are preserved in [the audit directory](../data/demo-search/audit/). Sources:

- [Planning Community Development service](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer).
- [Parks / Parks Recreation service](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer).
- [Parks sidewalk gap identification service](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Sidewalk_Gap_Identification_Web_Map/MapServer).
- [Official City trail map page](https://www.bentonville.ar.gov/1260/Trail-Map) and [City trail rules](https://www.bentonville.ar.gov/435/Trail-Rules) supply context; neither overrides restrictions on individual GIS records.

| Official layer inspected | Decision | Reason |
| --- | --- | --- |
| Planning 174 — current Sidewalks | Retain existing baseline | Current mapped sidewalk/crossing inventory. Existing eligibility rules continue to exclude crossing-only and unknown records. Study envelope contains 4,834 raw features. |
| Parks 158 — Natural Surface Trails (Mountain / Hiking) | Accept qualified subset only | REST exports a mixed inventory, including paved public off-street, side-path, park/neighborhood trails and explicit Hiking records omitted from layer 174. Explicit public walking/shared-use classes and known surfaces are required; mountain-bike classification alone does not establish walking permission. |
| Parks 51 — Shared Roadways | Reject as another source | Queries expose the same mixed infrastructure inventory as 158. Adding the whole layer duplicates infrastructure and admits roadways; shared roads never qualify here. |
| Parks 184 — Prioritized Projects | Reject | Planning/prioritization, not established current pedestrian infrastructure; sampled Existing values are null. |
| Parks 186 — Loop Trail | Corroboration only | Both Existing Yes and No occur. Even Yes does not by itself establish access, surface and physical inventory eligibility; adding this planning linework risks duplicates/proposals. |
| Parks 187 — Commute Zones | Reject | Planning corridors/zones with no established eligible facility status. |
| Parks 8 — Park Features | Reject | Generic park/walk linework lacks sufficient access, surface and status evidence. |
| Parks 1 — Park and Trail Properties | Reject for coverage | Property polygons do not identify usable linear infrastructure. |
| Parks 45 — Parks; 165/168 — POIs | Locations/context only | Points cannot count as covered route length. |
| Sidewalk Gap Map 1 — Current Sidewalks | Reject as additional network | Differently exported duplicate inventory with differing record identities/history. In the default-trip sample, 93.31% of eligible line length already coincides with baseline within 0.25m. Residual linework is discussed below; no wholesale union or automatic admission. |
| Sidewalk Gap Map 2 / 11 — Parks/Engineering priorities | Reject | Priority/future project linework is not proof of built facilities. |
| Sidewalk Gap Map 0 / 10 — School Locations / School buffers | Locations/context only | Points/buffers are not pedestrian infrastructure. |
| Planning 194 — Common_Names | Accept location verification only | Official named points, addresses and permanent status establish the chosen destinations. No contribution to coverage. |

**Important source behavior:** layer names and map renderer categories are not reliable query filters. Layer 174 did not return the trail classes found in Parks 158. Conversely, 158 and 51 return sidewalks, trails and roads together. The implementation explicitly filters attributes instead of treating every feature in a “trail” layer as pedestrian infrastructure.

### Accepted trail subset and exclusions

The broader trail audit envelope was `[-94.27, 36.32, -94.17, 36.42]` (longitude/latitude WGS84), encompassing all tested route envelopes. Of **439** inspected trail-class features, **144** qualify: **139 paved public walking/shared-use features and 5 explicit public Hiking features**. Multipart geometries produce **145 paved line parts + 5 hiking line parts**. The five hiking features have four gravel surfaces and one dirt surface.

Rules: `useaccess = Public`; no private maintenance/ownership; recognized off-street/side-path/park/neighborhood paved trail class, or explicit Hiking class with known natural/paved surface; `bikesallow` explicitly Yes or No; no bike-only designation, reported closed/detoured status, active dated closure, Approved No, future construction date, or proposed/planned/future designation. A null closure field is absence of a reported closure, not verified live availability. Public access to a mountain-bike-primary record does not by itself establish permission to walk.

Excluded: **117** missing explicit public access; **159** unsupported trail class/surface (including mountain-bike-primary/unknown inventory); **6** insufficient walking/shared-use evidence; **13** unapproved/proposed/future records. No roads, bicycle-only, private/restricted, known closed or unknown facilities were admitted to improve percentages.

### Methodology change, precisely

**Data eligibility expanded:** the eligible network now also contains conservatively qualified City Parks trail records absent from the existing sidewalk source, including explicit public natural-surface Hiking infrastructure. Coverage therefore means proximity to mapped pedestrian infrastructure; it does **not** mean paved, ADA-accessible, connected, or currently open walking space. Natural surfaces may be unsuitable for some users.

**Infrastructure is deduplicated before route analysis:** exact/reversed duplicates are removed; near-coincident supplemental line sections are trimmed against eligible existing linework with a separate **0.05m coincidence tolerance**. Point crossings under 0.5m are not duplicate line sections. The full study removed **5 duplicate features** and trimmed **601.395500m** of supplemental overlap. Excluded baseline records cannot suppress an otherwise eligible supplemental trail. Route coverage still unions all covered intervals, so residual overlapping matches cannot double-count a route meter.

**Unchanged:** 15m coverage matching tolerance; 20m meaningful-gap minimum; bridging covered islands at most 5m for gap counting; score formula and distance/gap penalties; ≥10 percentage-point improvement, higher score, ≤5 added minutes and ≤125% of fastest time AND distance recommendation rules. Original hashes for coverage, scoring, recommendation and default locations are recorded in [audit-manifest.json](../data/demo-search/audit/audit-manifest.json) and verified in regression tests. The demo-quality module is used only by the offline search.

### Sidewalk-gap mirror residual review

The 6.69% not coincident with layer 174 comes entirely from five exported Razorback Greenway / Town Branch segments (OBJECTID_1 8591, 8604, 8616, 8620, 8621), not additional sidewalk records. Full attributes do identify Public access, concrete surface, City maintenance and a named trail; the [official Town Branch Trail page](https://www.bentonville.ar.gov/1074/Town-Branch-Trail) confirms the trail exists. However, these exports have null original OBJECTID / text classification and repeat one 2016 source GlobalID across distinct geometries copied in 2025. Their exact alignments are not consistently corroborated by the accepted current Parks inventory. The trail’s existence does not independently verify every exported alignment. They are therefore **not added as another coverage source pending alignment/status reconciliation**, not asserted to be closed or nonexistent. This conservative exclusion may underestimate mapped coverage. Full attributes and a feature-by-feature geometric review are saved in `audit/gap-map-residual-full.json` and `audit/gap-map-residual-review.json`. No remaining sidewalk geometry in this sample is missing from the baseline at the 0.25m comparison tolerance.

Likewise, paved named records lacking explicit trail classification (including Crystal Bridges / Compton Gardens records) remain excluded under the conservative supplemental rule. Their names alone are not used to relax class eligibility. The audit identifies these possible follow-up records rather than treating all unknown classes as unusable on the ground.

## Search method and ranking

All origins/destinations use City Common_Names 194 records with permanent status; [verified-pairs.json](../data/demo-search/verified-pairs.json) records official object IDs, addresses, coordinates and source links. No invented coordinates or locations. These points identify facilities rather than verified pedestrian gates; public schools may have campus access restrictions outside normal arrival/dismissal contexts. The report does not imply unrestricted entry to school grounds.

Real Valhalla pedestrian routing requested up to two alternatives per pair. Ten-second spacing was used for new public development-provider requests; the default trip reused its cached real response. Normal endpoint-snap, geometry/length validation and candidate deduplication remained active. Eighteen pairs retained three candidates, Lawrence Plaza → Enfield Park retained two, and City Hall → Memorial Park retained one. A provider may omit other valid alternatives.

All candidates were measured against the same audited City inventory using the production analysis functions. The shared study envelope is `[-94.25247746926266, 36.32827250924052, -94.18627253073734, 36.40262049075948]`. Per-pair raw routing responses, timestamps, full analyzed candidate geometries and baseline-only results are preserved in [search-results.json](../data/demo-search/search-results.json). Live default-trip validation separately used the normal 75m-padded query envelope and reproduced the study result.

Demo-quality ranking, applied **after** unchanged production selection, considers only a qualifying recommended alternative:

```
Q = 100 × [0.40 × clamp(gain_pp / 30)
         + 0.30 × clamp(recommended_coverage / 100)
         + 0.20 × (1 − clamp(max(added_seconds, 0) / 300))
         + 0.10 × distinct_fraction]
```

`clamp` bounds a term to [0,1]. `distinct_fraction` is one minus the mean fraction of each route within 5m of the other route. Nonqualifying pairs have Q=0. This geometric comparison rewards different corridors; it is not a connectivity/safety metric. Constants are search presentation weights, not PathSafe scoring or recommendation thresholds.

## All twenty pairs — audited inventory

Coverage is percent; improvement is percentage points. Time/distance differences use provider values; a negative distance is an honestly shorter alternative. Scores are the unchanged integer infrastructure score. Gaps are fastest → recommended. **When no alternative qualifies, “recommended” is the fastest route and all deltas are zero**; this is not a claim that the provider returned a different equally good alternative. Full metrics for every nonqualifying alternative remain in the JSON evidence.

| # | Origin | Destination | Fastest coverage | Recommended coverage | Improvement | Added time | Added distance | Fastest score | Recommended score | Gaps | Recommendation status |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Bentonville High School-North | Library | 55.61% | 65.76% | 10.16 pp | 17.417 s | 41.293 m | 44 | 58 | 6 → 4 | Qualifying alternative |
| 2 | Bentonville High School-North | Memorial Park | 45.99% | 45.99% | 0.00 pp | 0.000 s | 0.000 m | 42 | 42 | 2 → 2 | Fastest; no qualifying alternative |
| 3 | Ruth Hale Barker Middle School | Library | 72.59% | 72.59% | 0.00 pp | 0.000 s | 0.000 m | 67 | 67 | 3 → 3 | Fastest; no qualifying alternative |
| 4 | Library | Memorial Park | 72.99% | 72.99% | 0.00 pp | 0.000 s | 0.000 m | 61 | 61 | 6 → 6 | Fastest; no qualifying alternative |
| 5 | Library | Park Springs Park | 80.22% | 80.22% | 0.00 pp | 0.000 s | 0.000 m | 74 | 74 | 3 → 3 | Fastest; no qualifying alternative |
| 6 | City Hall | Memorial Park | 89.48% | 89.48% | 0.00 pp | 0.000 s | 0.000 m | 85 | 85 | 2 → 2 | Single candidate |
| 7 | Lawrence Plaza | Enfield Park | 27.32% | 27.32% | 0.00 pp | 0.000 s | 0.000 m | 15 | 15 | 6 → 6 | Fastest; no qualifying alternative |
| 8 | Old High Middle School | Memorial Park | 93.29% | 93.29% | 0.00 pp | 0.000 s | 0.000 m | 89 | 89 | 2 → 2 | Fastest; no qualifying alternative |
| 9 | Lincoln Jr High School | Lawrence Plaza | 87.29% | 87.29% | 0.00 pp | 0.000 s | 0.000 m | 83 | 83 | 2 → 2 | Fastest; no qualifying alternative |
| 10 | Thomas Jefferson Elementary School | Library | 82.54% | 96.66% | 14.12 pp | 25.642 s | 43.000 m | 77 | 95 | 3 → 1 | Qualifying alternative |
| 11 | Sugar Creek Elementary School | Lawrence Plaza | 80.16% | 99.99% | 19.83 pp | 22.101 s | 40.000 m | 76 | 100 | 2 → 0 | Qualifying alternative |
| 12 | Bentonville Community Center | Wildwood Park | 89.41% | 89.41% | 0.00 pp | 0.000 s | 0.000 m | 87 | 87 | 1 → 1 | Fastest; no qualifying alternative |
| 13 | Bentonville Community Center | Library | 63.60% | 74.33% | 10.73 pp | 21.523 s | -18.001 m | 48 | 58 | 8 → 8 | Qualifying alternative |
| 14 | Ardis Ann Middle School | Bogle Park | 74.13% | 74.13% | 0.00 pp | 0.000 s | 0.000 m | 68 | 68 | 3 → 3 | Fastest; no qualifying alternative |
| 15 | Washington Jr High School | Library | 90.47% | 90.47% | 0.00 pp | 0.000 s | 0.000 m | 86 | 86 | 2 → 2 | Fastest; no qualifying alternative |
| 16 | Bogle Park | Park Springs Park | 68.45% | 68.45% | 0.00 pp | 0.000 s | 0.000 m | 58 | 58 | 5 → 5 | Fastest; no qualifying alternative |
| 17 | Bark Park | City Hall | 53.92% | 64.24% | 10.32 pp | 47.973 s | 43.002 m | 40 | 54 | 7 → 5 | Qualifying alternative |
| 18 | Enfield Park | Memorial Park | 100.00% | 100.00% | 0.00 pp | 0.000 s | 0.000 m | 100 | 100 | 0 → 0 | Fastest; no qualifying alternative |
| 19 | Durham Place Park | Library | 59.04% | 59.04% | 0.00 pp | 0.000 s | 0.000 m | 55 | 55 | 2 → 2 | Fastest; no qualifying alternative |
| 20 | Austin-Baggett Park | Lawrence Plaza | 74.64% | 96.39% | 21.75 pp | 4.753 s | -8.000 m | 69 | 94 | 3 → 1 | Qualifying alternative |

### Qualifying-pair ranking (search only)

| Rank | Pair | Demo quality | Geometry distinction |
| --- | --- | ---: | ---: |
| 1 | Austin-Baggett Park → Lawrence Plaza | 82.57 | 49.77% |
| 2 | Sugar Creek Elementary School → Lawrence Plaza | 82.09 | 71.27% |
| 3 | Thomas Jefferson Elementary School → Library | 71.69 | 55.71% |
| 4 | Bentonville Community Center → Library | 63.08 | 79.13% |
| 5 | Bentonville High School-North → Library | 62.04 | 99.31% |
| 6 | Bark Park → City Hall | 53.75 | 39.13% |

## Best candidates for review

The strongest two already produce these results with the **original sidewalk dataset alone**. Added Parks trail records do not change their metrics. They satisfy the requested demonstration target without relying on the new natural-surface scope.

### 1. Austin-Baggett Park → Lawrence Plaza

Demo quality **82.57/100**. Meets the target.

| Measurement | Fastest | Recommended |
| --- | ---: | ---: |
| Coverage | 74.64369816% | 96.38925953% |
| Time | 1044.537 s | 1049.290 s |
| Provider distance | 1482.055 m | 1474.055 m |
| Score | 69 | 94 |
| Meaningful gaps | 3 | 1 |

**Delta:** +21.74556136 pp coverage; +4.753 seconds; -8.000m distance; +25 score. Recommended geometry length **1474.910637m**, covered **1421.655441m**, uncovered **53.255195m**. Geometric distinction: **49.77%**, with directional overlap within 5m of 50.10% / 50.36%.

- Origin: City 194 OBJECTID **5**, **601 SE D ST**, latitude/longitude **[36.36571210106438, -94.20363133075323]**.
- Destination: City 194 OBJECTID **67**, **214 NE A ST**, latitude/longitude **[36.374649832783945, -94.20753355872435]**.

### 2. Sugar Creek Elementary School → Lawrence Plaza

Demo quality **82.09/100**. Meets the target.

| Measurement | Fastest | Recommended |
| --- | ---: | ---: |
| Coverage | 80.16009274% | 99.98771690% |
| Time | 1301.515 s | 1323.616 s |
| Provider distance | 1797.339 m | 1837.339 m |
| Score | 76 | 100 |
| Meaningful gaps | 2 | 0 |

**Delta:** +19.82762416 pp coverage; +22.101 seconds; 40.000m distance; +24 score. Recommended geometry length **1838.149995m**, covered **1837.924213m**, uncovered **0.225782m**. Geometric distinction: **71.27%**, with directional overlap within 5m of 29.04% / 28.41%.

- Origin: City 194 OBJECTID **118**, **1102  BELLA VISTA RD**, latitude/longitude **[36.383805847996555, -94.21640621628336]**.
- Destination: City 194 OBJECTID **67**, **214 NE A ST**, latitude/longitude **[36.374649832783945, -94.20753355872435]**.

### 3. Thomas Jefferson Elementary School → Library

Demo quality **71.69/100**. Backup: strong absolute coverage, but its improvement falls below the desired 15–20 pp target.

| Measurement | Fastest | Recommended |
| --- | ---: | ---: |
| Coverage | 82.54095527% | 96.66153696% |
| Time | 1821.226 s | 1846.868 s |
| Provider distance | 2536.263 m | 2579.263 m |
| Score | 77 | 95 |
| Meaningful gaps | 3 | 1 |

**Delta:** +14.12058169 pp coverage; +25.642 seconds; 43.000m distance; +18 score. Recommended geometry length **2579.079245m**, covered **2492.977638m**, uncovered **86.101607m**. Geometric distinction: **55.71%**, with directional overlap within 5m of 44.68% / 43.91%.

- Origin: City 194 OBJECTID **127**, **810  BELLA VISTA RD**, latitude/longitude **[36.38254124765499, -94.21646362903837]**.
- Destination: City 194 OBJECTID **68**, **405 S MAIN ST**, latitude/longitude **[36.36770870312484, -94.20851110772566]**.

Sugar Creek’s 99.98771690% rounds to 99.99%, and its score rounds to 100 under the existing formula. It still has about 0.226m unmatched geometry; “zero meaningful gaps” means none meet the 20m rule, not perfect infrastructure. Austin-Baggett’s recommended route still has about 53.26m unmatched geometry and one meaningful gap. Neither result establishes crossing safety, sidewalk condition, continuous access, ADA suitability or live closures.

## What happened to the current 65.54% result?

The default trip and its real walking candidates are unchanged. Additional eligible Parks inventory changes the default fastest route from **50.55490509% to 55.60619293%**, and the recommended alternative from **65.54260741% to 65.76231237%** (a **0.21970495 pp** increase in recommended coverage). The improvement between routes therefore **decreases from 14.98770232 pp to 10.15611944 pp**. Score changes from 39 → 58 to **44 → 58**; gaps remain **6 → 4**. Added time remains **17.417 seconds**, added distance **41.293m**. The alternative still qualifies; do not continue describing the live audited comparison as a nearly 15-point gain.

[default-live-after-audit.json](../data/demo-search/default-live-after-audit.json) preserves the normal live pipeline result and both source timestamps. The historical Phase 2 verification fixture remains intact as historical evidence; it is not a fallback or a claim about current live output. Source retrieval times are not data survey/update dates.

The Community Center → Wildwood Park pair also illustrates why the expanded inventory must be applied fairly: its formerly qualifying baseline-only alternative loses its ≥10 pp advantage after the added trails improve the fastest route. It is **not** promoted as a demo under the audited analysis.

## Reproduction and validation

Network collection scripts preserve responses in `data/demo-search/`; rerunning a live request later can produce different routing or City data. Saved evidence supports offline reproduction:

```sh
node --import tsx scripts/analyze-demo-search.ts
python3 scripts/write-demo-search-report.py
npm test
npm run lint
npm run build
```

Network collection: `audit-city-data.py`, `query-audit-data.py`, `fetch-audit-trails.ts`, `audit-layer-overlap.ts`, `search-demo-routes.ts`, `collect-search-infrastructure.ts`. `verify-audited-default.ts` validates the normal default trip without overwriting historical Phase 2 evidence. Collection uses official City source coordinates and real pedestrian responses; no fallback mock route enters this search. Runtime accepts the documented eligible Parks subset and deduplicates it before analysis; source failure stays unavailable rather than silently reverting to partial coverage.

Recorded geometry review images: [Austin-Baggett → Lawrence](demo-search/pair-20.png), [Sugar Creek → Lawrence](demo-search/pair-11.png), [Thomas Jefferson → Library](demo-search/pair-10.png). These show actual candidate and eligible infrastructure linework in a local projection, without a basemap; they are review artifacts, not app screenshots or navigation. `render-demo-review.ts` reproduces the SVG/PNG files. The geometries visibly follow different corridors, consistent with the bidirectional overlap measures.

Validation completed: **42 unit tests, 12 browser/accessibility checks, lint and production build passed**. The browser suite uses the preserved historical real fixture to test rendering; the separate live default validation establishes the new audited metrics.

Regression coverage verifies eligibility exclusions, malformed geometry/partial retrieval, overlap deduplication, preservation of legitimate parallel paths/crossings, and byte-identical original scoring/threshold/coverage/default files. This search is evidence for choosing a future demo, not authorization to change the default; the best three remain proposals for review.
