# Official-only smart location search

Search uses the existing City Common_Names (layer 194) and Bentonville Addresses (layer 2) services. No additional geocoder or AI API was added. Runtime coordinates are obtained from City records and filtered against the unchanged official city-boundary polygon. Saved verification records are test evidence only.

## Matching and ranking

`lib/geocoding/search.ts` isolates normalization, tokenization, street/direction normalization, edit distance, scoring, ranking and deduplication. Text is lowercase, accent-folded, trimmed, punctuation-normalized and token-deduplicated. Apostrophes join words; hyphens separate them; dotted directions such as S.W. become SW. Street suffixes and directions map to full-word canonical tokens, with no replacements inside words.

Meaningful query tokens must all match a candidate name or its known alias. The small stop-word set is `the/of/at/in/city/arkansas/ar`; clear Bentonville context, including a six-character prefix or one-character typo, is optional. Unknown locality words remain meaningful: there is no catch-all locality correction or outside-place substitution.

Token similarity is 1 exact, 0.94 prefix (at least three query characters), 0.84 one edit, or 0.76 two edits when both words have at least seven characters. Short tokens do not receive fuzzy matching. A single fuzzy token shorter than six characters is rejected. Every meaningful token must have evidence; the weighted average must be at least 0.76. Numbers must agree exactly and are never fuzzy matched.

Scores are deterministic:

1. Exact normalized official label: 110.
2. Exact normalized alias: 107.
3. Other matches: 100 × weighted token similarity, plus 3 for an exact address number.

Number tokens have weight 5; other tokens have weight `1 + 1/frequency` in the candidate labels, rewarding uncommon tokens. Wrong house numbers and unmatched meaningful tokens score zero. Scores below 75 are hidden; scores of 94 or higher are high confidence, with qualifying lower scores treated as medium confidence. These are internal search scores, unrelated to PathSafe route scores or recommendation thresholds. No low-confidence or “least bad” fallback exists. Ties use label then stable ID. Up to eight suggestions are returned.

Deduplication happens after ranking so the best representation survives: identical stable IDs, identical normalized postal-address labels, or matching normalized place labels/addresses at points within 10 meters, collapse. Multiple City point records for one identical postal address produce one suggestion; distinct named places with different addresses remain separate. This search-only duplicate distance does not change the 15-meter infrastructure-matching tolerance.

## Aliases

Aliases contain vocabulary and official source IDs, never coordinates:

| Official object ID | Destination vocabulary |
|---|---|
| 44 | Crystal Bridges, singular bridge, Crystal Bridges Museum of American Art |
| 68 | Library, Bentonville Public Library, public library |
| 67 | Lawrence Plaza; shorter input also matches by token/prefix |
| 17 | Bentonville Community Center, community center |
| 124 | Bentonville Municipal Airport, municipal airport, Bentonville airport, Thaden Field, VBT |

Original City labels remain visible; municipal airport retains its verified visitor-location clarification. Equivalent official community-center records remain available for matching before duplicate removal.

## Retrieval and performance

The complete small permanent-place catalog is cached for 24 hours, with a 1,000-record fail-closed size guard. Named places take priority for queries without a number. A number anywhere in a query triggers an exact-house-number remote filter, then local street/direction/suffix ranking over at most 200 returned candidates. Without a number, address-shaped input first matches a cached distinct official STNAME vocabulary (maximum 2,000 entries, fail closed if incomplete), then requests only the best three matching street names, capped at 200 address candidates. Broad street searches deliberately return a bounded useful sample, not an exhaustive address directory. There is no per-keystroke download/fuzzy scan of the full address inventory.

Search results retain a 24-hour versioned server cache, in-flight coalescing, bounded memory, serialized request starts and failure backoff. The input retains its 450ms debounce, 50-query client cache, cancellation and generation checks. Editing increments the generation immediately, invalidates selected coordinates and clears previous analysis. Compare is disabled until both endpoints are explicitly selected. Arrow keys highlight; Enter selects only a highlighted suggestion; Escape and Tab do not select; mouse/touch selection confirms. No top result is automatically chosen.

## Verification

See `data/search/README.md` and `data/search/live-search-audit.json` for official-source captures and actual API responses. Automated tests cover every requested input example, abbreviated/full directions and suffixes, punctuation, reordered words, prefixes, one/two-character typos, correct-number priority, ambiguity, deduplication and all seven negative searches. Browser tests cover rapid typing, response races, clearing, keyboard dismissal, touch selection, edited selections, and disabled comparison.

Creekside Park is absent from the current 137-record permanent Common_Names catalog. All three requested Creekside variants correctly produce no supported match; this is a source limitation, not corrected with invented coordinates or an unrelated park. The other requested named destinations and numbered-address examples resolve from existing official records. Outside/nonsense queries are rejected rather than replaced with plausible Bentonville guesses.

Routing, scoring, recommendation thresholds, city-boundary eligibility, infrastructure eligibility, coverage methodology and matching tolerances are unchanged. No deployment or redesign was performed.

Validation results are recorded below after the final checks.

## Route regressions

The unchanged default Austin-Baggett Park → Lawrence Plaza prewarm returned REAL DATA: 74.64% → 96.39% coverage, scores 69 → 94, meaningful gaps 3 → 1. Current provider durations remain 1044.537 → 1049.290 seconds (+4.753 seconds); the recommended route is 8 meters shorter by provider distance.

A separate actual API request for 3809 SW MISTLETOE AVE → Crystal Bridges also succeeded. Its two supported routes retain 81.3007975764% / 89.0513066733% coverage, scores 61 / 71, gaps 15 / 9. The 7.75-point coverage gain remains below the unchanged recommendation threshold, so the fastest supported route is retained. The previously documented city-boundary-crossing provider alternative remains excluded. See the compact live comparison evidence in `data/search/mistletoe-live-comparison.json`.

## Final validation results

- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript and prerendering.
- `npm test`: 115 passed, zero failures (49 more cases than the previous 66-test suite).
- `npm run test:e2e`: 32 passed across laptop, tablet, desktop and mobile. The final run used the locally served production build. An intervening dev-mode run was interrupted after a Next hot-reload loop repeatedly navigated pages; production-mode verification completed without that interference.
- `npm run demo:prewarm`: passed with REAL DATA and unchanged showcase results.
- 46 real local search API queries: zero API errors; all seven required outside/nonsense queries returned empty results. Three Creekside variants also returned empty results because that destination is missing from the existing official catalog.
- Actual Mistletoe → Crystal Bridges comparison: passed with the supported routes and unchanged recommendation behavior described above.

Files changed: `lib/geocoding/search.ts`, `lib/geocoding/city.ts`, `lib/geocoding/index.ts`, `components/LocationSearch.tsx`, `components/RouteExplorer.tsx`, `tests/search.test.ts`, `tests/locations.test.ts`, `tests/reliability.test.ts`, `tests/locations.spec.ts`, this report, and the verification records/readme in `data/search/`. Runtime imports none of those verification records.
