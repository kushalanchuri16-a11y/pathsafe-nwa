# Verified names and search confidence — bounded follow-up

October 24, 2026. This work changes only search/catalog utilities, verified name data and targeted tests. No source discovery, citywide catalog audit, mass routing audit, UI change or deployment was performed.

## Walmart Museum

The original catalog record is the address **105 N MAIN ST**, canonical address ID `city-address:18876386`, at **36.37250862234924, -94.20902221035391**. It had no museum label. A targeted query of the already-integrated City address layer (`Planning/Bentonville_Addresses23/MapServer/2`) returns five rows for this postal address. The main-address row is OID **18876387**, `MISC_INFO = M`, `EX_ADD = null`; the other rows are utility/electric annotations. Ordinary address deduplication already resolves these to one identity and the stated City point.

The [museum owner's current visitor page](https://corporate.walmart.com/about/walmart-museum/plan-your-visit) verifies The Walmart Museum and Walton's 5&10 at 105 N. Main St. The existing declarative verified-name crosswalk now enriches that address identity with canonical name **The Walmart Museum**, aliases **Walmart Museum**, **Walton's 5&10**, and **Walton 5 and 10**, and retained original address. No historical GIS museum name was invented: its old stored label was the street address.

Name and address suggestions use different display views of the **same ID and exact coordinates**. The catalog retains one underlying record. Query results deduplicate by this stable ID after ranking. The numeric address remains searchable with its original label. The same rule applies to all verified address-name entries, including the earlier temple association records: their named views now reuse their original address IDs rather than creating `verified-place:` duplicates. Ordinary existing place renames for Whole Health, 8th & Plate and the Welcome Center use the same crosswalk as before.

## Osage Park and the Lake Bentonville suggestion

Osage Park was already present in both official property inventories as **Osage Park @ Lake Bentonville**, OID **315** (`Parks/Parks_Recreation18/MapServer/1`, also the civic-property view). Its existing polygon-interior anchor is **36.351640914616624, -94.21976250101292**. This is an existing facility anchor, not a newly verified public entrance.

The official park-directory crosswalk carried that whole parcel name as a Lake Bentonville alias. Deduplication then treated the contextual lake name as evidence that the park and lake shared an identity. Search matched the contaminated Osage alias and displayed the winning Lake Bentonville label. The failure was not merely generic-word fuzzy matching.

The general identity rule now interprets **A @ B** as a primary destination A with location context B. The context cannot make A an alias for B or merge their different primary names. True duplicate source views of A still merge. The crosswalk reconciles the official Osage parcel label to **Osage Park**, retaining the full official label as its alias. Lake Bentonville remains a separate destination with its own prior City point. No coordinates are copied from the lake or invented for the park.

`Osage Park`, `osage`, and `osge park` now rank Osage Park first; none returns Lake Bentonville. A test removes the actual Osage source records and confirms `Osage Park` returns no match instead of substituting the lake.

## General confidence and ordering

- Exact canonical name, exact verified alias, exact normalized address, all distinctive tokens, strong prefixes, then modest typo corrections form deterministic match tiers.
- Every meaningful query token must agree within a single canonical name or alias. Generic category words have low weight and cannot rescue a missing distinctive name. Tokens from unrelated aliases are not combined.
- Fuzzy matches require strong character agreement (at least 80%, counting an adjacent transposition as one correction). Prefixes remain useful. Weak short near-words, such as Bake/Lake, fail; osge/osage and crystla/crystal retain typo tolerance.
- Matching precision favors the actual destination over longer component or street names. Stable ID and label ordering break ties. A bare Osage query therefore does not fill its eight slots with Osage Street addresses before showing the named park.
- Generic words match complete category words/plurals, not arbitrary prefixes such as park/Parkwood. A category-only query is low-confidence browsing; known category classifications constrain such queries. It receives no exact-intended-name boost and never auto-selects a destination.
- There is no least-bad fallback. House/highway numbers remain exact, and outside-city filtering is unchanged.

These numbers are **location-search ranking tiers only**. PathSafe's pedestrian infrastructure score, route recommendation thresholds, routing, City Limits, gap policy and 15m matching tolerance are unchanged.

## Scope and validation

**Two current names recovered/clarified in this pass:** The Walmart Museum and Osage Park. No unrelated destinations were added or reviewed. Two narrow existing-layer queries checked the museum address/Common Names records; an owner page verified its current public name. No new GIS services or geocoding APIs were integrated. The snapshot's original museum and park coordinates were not edited.

- Targeted search/catalog/name/temple tests: **110 passed**.
- `npm run lint`: **passed**.
- `npm test`: **178 passed**, including the existing protected scoring/GIS/routing invariants.
- Build/e2e: **not run**, as requested for changes confined to search/catalog utilities.

Regressions include all five museum name/address queries, all three Osage queries, no lake substitution with/without an available Osage record, Memorial Park and Crystal Bridges distinctiveness, nonsense rejection, ambiguous generic browsing, typo examples, exact address numbers, source/alias safety, and the previous Creekside, Whole Health, Hindu Temple, library and plaza searches. A synthetic Birch Park @ Cedar Park case verifies the identity fix is general.

Saved query/source evidence: [search-quality-review.json](../data/location-catalog/search-quality-review.json). Current crosswalk: [verified-names.json](../data/location-catalog/verified-names.json).
