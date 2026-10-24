# Northwest Arkansas Hindu Temple — targeted search check

> Later general identity correction: temple name/address views now share their original address IDs and records. The points and aliases below are unchanged; the earlier `verified-place:` representation and count adjustment are historical. See [SEARCH_QUALITY_FIX.md](SEARCH_QUALITY_FIX.md).

Checked October 24, 2026. Scope: this temple only, using the already-integrated 27 inventories. No new sources, external websites, citywide audit, build/e2e suite, routing requests or deployment.

**Found:** two official religious-building records in the existing City-hosted county address layer, `Base_map/Benton_County_Data/MapServer/0`. Both have `COMMENT = NWA HINDU ASSOC BLDG`, `CLASSIFICA = RELIGIOUS`, `POINT_TYPE = DRIVE_ADDR`, and county parcel `01-16546-001`.

| County OID | Official address | County latitude, longitude | Preferred City address OID | Selected existing City latitude, longitude |
|---|---|---|---|---|
| 1412232 | 2500 SW REGIONAL AIRPORT BLVD | 36.33638367190181, -94.24242085981575 | 18874516 | 36.336382125641016, -94.24242528162843 |
| 1411896 | 2502 SW REGIONAL AIRPORT BLVD | 36.336653273241275, -94.24249110763982 | 18893410 | 36.33667361163425, -94.2424919298125 |

Both selected points pass the existing City Limits boundary check. The two City address records share City parcel `01-16546-000`; neither the City nor county evidence identifies a main temple building or public pedestrian entrance. The two distinct addresses remain separate choices. No guessed centroid, merged midpoint or arbitrary preferred address is used.

**Root cause:** the county inventory requested only `FULL_ADDR`, so its `COMMENT` facility annotations never entered named search. The City/TrakIT/billing address-name extraction could not supply the missing name: the City records' `EX_ADD` fields are null. Targeted name searches in the existing address-name, Common Names and business publications did not establish another temple record. An unrelated Templeton business is not a match.

**Reconciliation:** the current temple query name supplied by the user is associated with the official NWA Hindu association religious-building records. The display names are `Northwest Arkansas Hindu Temple · 2500 SW REGIONAL AIRPORT BLVD` and `Northwest Arkansas Hindu Temple · 2502 SW REGIONAL AIRPORT BLVD`. Each retains `NWA HINDU ASSOC BLDG` and aliases `Northwest Arkansas Hindu Temple`, `Hindu Temple`, `NWA Hindu Temple`, and `Northwest Arkansas Hindu Association Building`, plus the original address.

The existing verified-name mechanism now supports explicitly reviewed named views of existing address records. Original numeric-address identities remain intact, including the already-established preference for City address coordinates. A source/OID, address and exact official annotation must all match. The county descriptor requests COMMENT on future refresh; only these two reviewed identities retain this annotation for named reconciliation. Changed or missing annotations disable the link on refresh. Other county comments are not extracted into destinations. The revised county cache key prevents reuse of its previous field schema; the other 26 inventory keys are unchanged.

The bundled snapshot's two county rows retain the verified annotations from the targeted live check. Other snapshot rows, source retrieval timestamps and coordinates were preserved; this is not a newly fetched complete inventory. The two named views add two supported name choices to the prior 816 named destinations; the 24,600 numeric address identities are unchanged. This is a targeted count adjustment, not a repeated completeness audit.

**Tests:** `node --test --import tsx tests/temple-search.test.ts tests/catalog-names.test.ts tests/catalog.test.ts tests/search.test.ts` — **88 passed, 0 failed**. All three requested queries return both choices. Tests cover unchanged numeric-address search and City coordinates, outside-city rejection, removed/changed annotations, wrong source/OID/address, unrelated comments and preservation of prior naming reconciliations. Full build/e2e tests were intentionally not run.

Evidence: [temple-search-review.json](../data/location-catalog/temple-search-review.json). Verified identity entries: [verified-names.json](../data/location-catalog/verified-names.json). Routing, scoring, recommendation rules, city boundaries and fuzzy thresholds are unchanged.
