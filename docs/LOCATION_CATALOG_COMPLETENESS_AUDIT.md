# PathSafe NWA — official location catalog completeness audit

Audit date: October 24, 2026 (America/Chicago). Search evidence: `data/location-catalog/completeness.json`; official source evidence: `data/location-catalog/discovery/`; route evidence: `data/location-catalog/routing/summary.json`. This completion pass used only the sources already integrated in the interrupted run; no additional discovery or mass routing audit was performed. No deployment was performed.

> Subsequent temple-only check: two existing county religious-building address records now have verified named views. See [TEMPLE_SEARCH_GAP.md](TEMPLE_SEARCH_GAP.md). The counts and full-suite validation below describe the earlier completeness pass; this follow-up ran only 88 targeted tests and did not repeat the citywide audit.

> Subsequent bounded search-quality fix: [SEARCH_QUALITY_FIX.md](SEARCH_QUALITY_FIX.md) records the museum name/address identity reconciliation, Osage/Lake identity correction and new confidence rules. Its validation is 110 targeted tests, lint and 178 unit tests; the earlier citywide evidence below was not rerun.

## Findings

**A. Were useful official layers previously ignored? Yes.** The old permanent-only Common Names view omitted school point views, the unfiltered school inventory, Parks names stored in `EX_ADD`, park POIs/properties, named civic parcels, fire stations, public art, historic sites, and meaningful named destinations in address publications.

**B. Were all useful discovered layers integrated? Yes, within the documented eligibility rules.** The catalog combines 27 inventories/views from 23 distinct GIS layers plus the official City parks directory. Discovery covers 55 REST service publications across 20 City folders and 43 feature-service items in the City-linked ArcGIS Online organization. Duplicate/retired publications, access conflicts, and non-destination datasets are accounted for below. This is not a claim that unpublished data or every real-world place is available.

**C/D. Is any known official in-city name still unavailable? Yes: A Street Promenade.** Its current City park page establishes its name, but provides no street-number address or uniquely identified GIS destination/entrance, so no coordinate is invented. All 816 accepted canonical in-city destinations pass exact search and selection. The City park directory resolves 23 of 24 names (95.83%); the verified GIS-backed park inventory and school inventories pass 100%. The older-only DAC parking lot at 219 SW A St is also held because current public-access status is uncorroborated. The three-character minimum prevents the alias PD alone; its canonical Bentonville Police Dept destination works. Preliminary, expired, home-business, conditional-access and unnamed/asset records are explicitly excluded, not silently counted as complete.

Scoring, recommendation thresholds, 15m infrastructure matching, meaningful-gap policy, route-provider behavior, default Austin-Baggett Park → Lawrence Plaza showcase, and strict city-boundary rules including municipal holes remain unchanged. This work changes the location catalog and search only.

## Counts and denominators

The archived old Common Names inventory contains 137 rows, 134 inside the current boundary. For a comparable distinct-destination baseline, the same current deduplication rules were applied to that archive; this yields 110 destinations. These baseline counts are **not** the old autocomplete suggestion count (which varied by query). The old app already supported on-demand City address queries; its lack of a unified address index must not be reported as zero address support.

| Category | Before (same deduplication) | After, inside supported City Limits |
|---|---|---|
| named | 110 | 816 |
| school | 22 | 29 |
| park | 15 | 31 |
| recreation | 10 | 18 |
| civic facility | 9 | 15 |
| public facility | 0 | 7 |
| plaza | 2 | 3 |
| airport | 1 | 1 |
| landmark | 0 | 96 |
| museum | 3 | 5 |
| trail destination | 1 | 19 |
| addresses | On-demand, query-limited; not measured | 24600 |

Counts are destination classifications, not counts of independent institutions or legally designated parks. School destinations include administration/sub-campus facilities; the full school-point inventory contains 24 distinct in-city campuses. The broader parks/recreation/trail/facility audit covers 70 supported destinations. Public-art provenance occurs on 51 destinations; heritage provenance occurs on 45 (overlap with other roles is possible). Museums are a separate classification of 5. Civic/public facilities, plazas and airport total 26; recreation is separate. Business registrations remain other official places, rather than being inferred to be airports or schools from a company name.

The inventories normalize 194,465 records and remove **139,314 overlapping source records**: 725 named records and 138,589 address records. They retain 879 named identities (816 supported, 63 outside), and 54,272 distinct address identities (24,600 supported). **29,735 outside-city records** are withheld from supported suggestions/routing. Coordinate/geometry-related rejections (including unresolved directory bindings): **1**. Every other source rejection has its own name/OID/reason in the JSON.

## Follow-up: campus generic names reconciled

Walton Family Whole Health & Fitness was present as City address-destination OID 18879439, EX_ADD FITNESS CENTER, at 1400 SE 5TH ST. The same point/name occurs in the already-integrated TrakIT and billing views; the business/Common Names inventories do not provide its current brand. The omission was a current-name/alias gap, not missing coordinates, a city-boundary failure, a dropped occupant field or a fuzzy-search threshold problem. WHOLE HEALTH at 850 MUSEUM WAY is a different institution and remains distinct.

The bounded follow-up reviewed 89 campus-related records from the existing City address layer inside the saved campus-area envelope. No additional GIS services or geocoding APIs were integrated. The 27 inventories, 816 supported named identities, 24,600 supported addresses and every coordinate remain unchanged. A declarative verified-name crosswalk applies only after ordinary eligibility/deduplication, requiring an existing source/OID plus matching address and previous label. It cannot create a location or loosen access/boundary checks. Current names come from venue-owner publications because the City fields contain only generic/abbreviated labels; these publications verify identity only and never supply route coordinates. Original City names remain searchable aliases and provenance retains the naming-evidence URLs.

| Canonical display name | Legacy alias | Existing City address / point | Name evidence |
|---|---|---|---|
| 8th & Plate | WALMART FOOD HALL | 1600 SE 8TH ST / 36.36328661, -94.19132467 | [Owner verification](https://corporate.walmart.com/about/newhomeoffice/explore-the-new-campus/tour), [Owner verification](https://corporate.walmart.com/content/dam/corporate/documents/about/new-home-office/tour/Walmart_Self-Guided_Tour_Map.pdf) |
| Walton Family Whole Health & Fitness | FITNESS CENTER | 1400 SE 5TH ST / 36.36664876, -94.19402547 | [Owner verification](https://wholehealth.walmart.com/content/wholehealth/en_us/whole-health0/whole-health0/faq.html) |
| Walmart Home Office Welcome Center | WELCOM CTR | 1 CUSTOMER DR / 36.36431736, -94.19468555 | [Owner verification](https://corporate.walmart.com/content/dam/corporate/documents/about/new-home-office/tour/Walmart_Self-Guided_Tour_Map.pdf), [Owner verification](https://corporate.walmart.com/about/newhomeoffice/explore-the-new-campus/public-spaces) |

Requested regressions pass for Walton Family Whole Health & Fitness, whole health, walton whole health and 1400 SE 5th St. The same mechanism also resolves 8th & Plate and Walmart Home Office Welcome Center. Fitness membership, associate food-hall restrictions and other existing access requirements are not changed by a searchable destination name. Address search continues to select the original City point; no route is substituted.

Additional generic campus labels remain documented rather than guessed: ACT BUILDING at 1500 SE 8TH ST, two distinct WM CHILDCARE records (210 and 310 ASSOCIATE DR), and numbered office buildings. Owner publications name Sam Walton Hall and Little Squiggles, but an unambiguous owner-name-to-record assignment for each remaining identity has not been established in this bounded review. In particular, two distinct official OF04 address records are not merged merely because the code repeats. Utilities, parking/sign assets and proposed buildings remain subject to the existing exclusions. This follow-up establishes that canonical-source-name search completeness does not prove completeness for every current brand or campus nickname.

Evidence: data/location-catalog/campus-name-review.json; verified crosswalk: data/location-catalog/verified-names.json; production API checks: data/location-catalog/campus-name-api-verification.json. The original 82 relevant tests passed before editing; 91 targeted tests then passed with the fix before the full build/browser suite. All 150 unit tests and all 44 end-to-end tests pass, as do lint/build. Production API checks and eight real desktop/mobile search-and-selection checks passed (campus-name-browser-verification.json); the verified-name asset is included in the production server trace. The existing 94-trip audit was retained; no mass routing audit was repeated.

## Integrated source register

Sources are City GIS REST layers, City-owned hosted layers in organization KVEBkgY6kMufuFG2, and the official City parks website. The organization identity is verified through the City-linked portal self metadata. Raw counts cover complete ID inventories for the declared view. Address inventories use the entire City-boundary envelope before strict polygon validation. Geometry is requested in WGS84. The directory supplies names/addresses only; its coordinates must come from an unambiguous existing GIS point. Field selections omit owner/employee/contact fields.

| Inventory / official source | Fields (besides geometry/OID) | Raw | Normalized | Outside (before cross-source dedup) |
|---|---|---|---|---|
| [common](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194) | COMMON_NAME, ADDRESS, STATUS, TYPE | 201 | 179 | 3 |
| [schools-4](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/School_District18/MapServer/4) | LABEL, TYPE, GlobalID | 13 | 13 | 3 |
| [schools-7](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/School_District18/MapServer/7) | LABEL, TYPE, GlobalID | 5 | 5 | 0 |
| [schools-10](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/School_District18/MapServer/10) | LABEL, TYPE, GlobalID | 4 | 4 | 1 |
| [schools-all](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Sidewalk_Gap_Identification_Web_Map/MapServer/0) | LABEL, TYPE, GlobalID | 29 | 29 | 5 |
| [parks](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/45) | EX_ADD, ADDRESS, MISC_INFO | 38 | 36 | 0 |
| [poi-168](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/168) | name, address, subtype, city, visible, Approved, trail_access | 234 | 173 | 71 |
| [poi-165](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/165) | name, address, subtype, city, visible, Approved, trail_access | 127 | 96 | 51 |
| [park-properties](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/1) | FACILITY_NAME, CITY_USE | 79 | 29 | 0 |
| [civic-properties](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/119) | FACILITY_NAME, CITY_USE | 969 | 43 | 0 |
| [fire-stations](https://gis.bentonvillear.com/arcgis/rest/services/Emergency_Services/Emergency_Services_CLOUD_PUBLIC/MapServer/4) | Description | 8 | 8 | 1 |
| [public-art](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Public_Art_Points_map_service/MapServer/0) | title_artwork, location_desc, removal_date, install_date, temp_perm | 52 | 50 | 0 |
| [historic-sites](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Historic_Sites_Field_Collection_%28VIEW%29/FeatureServer/0) | name, address | 47 | 23 | 0 |
| [city-addresses](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer/2) | ADDRESS | 40404 | 40404 | 253 |
| [address-destinations](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer/2) | EX_ADD, ADDRESS, MISC_INFO | 360 | 128 | 0 |
| [trakit-addresses](https://gis.bentonvillear.com/arcgis/rest/services/TrakIT/TrakIT_Data/MapServer/0) | ADDRESS, MISC_INFO | 43070 | 42022 | 271 |
| [county-addresses](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/Benton_County_Data/MapServer/0) | FULL_ADDR | 74266 | 74266 | 38659 |
| [billing-addresses](https://gis.bentonvillear.com/arcgis/rest/services/Utility_Billing/RouteMap_WebMap/MapServer/0) | ADDRESS | 36169 | 36169 | 262 |
| [trakit-destinations](https://gis.bentonvillear.com/arcgis/rest/services/TrakIT/TrakIT_Data/MapServer/0) | EX_ADD, ADDRESS, MISC_INFO | 360 | 128 | 0 |
| [billing-destinations](https://gis.bentonvillear.com/arcgis/rest/services/Utility_Billing/RouteMap_WebMap/MapServer/0) | EX_ADD, ADDRESS, MISC_INFO | 267 | 111 | 0 |
| [city-parks-directory](https://www.bentonville.ar.gov/436/Parks) | name, address, page | 24 | 23 | 0 |
| [registered-businesses](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Business_Registry_PORTAL_copy_Public_view/FeatureServer/0) | Business_Name, Physical_Address, STATUS, Home_occ | 607 | 418 | 0 |
| [national-register](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/National_Register_Properties_View/FeatureServer/0) | Name, Address, STName | 27 | 27 | 1 |
| [national-register-points](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Images_View/FeatureServer/0) | Name, Address, STName | 25 | 24 | 1 |
| [portal-public-art](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Art_Points_for_AGOL_Story_Map/FeatureServer/0) | title_artwork, location_desc, removal_date, install_date, temp_perm | 35 | 35 | 0 |
| [downtown-public-poi](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer/0) | Name, Street_Name, Label | 14 | 14 | 0 |
| [public-parking](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer/2) | NAME, Address, PUBLIC_ID, WEEKDAY, WEEKEND, PRKNG_TYPE | 22 | 8 | 0 |

The default OID is `OBJECTID`; historic sites use `objectid`, billing publications use `OBJECTID_1`. The City address layer has 40,405 full-service records; 40,404 lie in the supported-area bounding envelope. The single omitted point cannot lie in the supported polygon. TrakIT has 43,071 full-service records, 43,070 within this envelope; 1,048 explicitly `DEMO` records are rejected. The alternate TrakIT_Display address publication has the exact same full ID count/hash and is not reloaded as another source. Four address views contribute 193,909 raw rows; address identity deduplication preserves the canonical City point when available.

### Eligibility and source-specific interpretation

- Common Names: include named records without inventing a permanent status; reject explicit proposed/future/closed/demolished status and `TYPE = Apartment Pre`. Existing apartment complexes are common destinations, not public parks. The three preliminary labels are City U, Park Central and Crystal Flats; their current status needs City confirmation before inclusion.
- Schools: ingest elementary 4, middle 7, junior-high 10, and **all** 29 points from Parks/Sidewalk_Gap_Identification_Web_Map/0, including high/private schools absent from the filtered category views. High-school zones and school buffers are not campus points.
- Parks: use `EX_ADD` as the actual facility name. Retain named public POIs from both scale views, rejecting explicit hidden/unapproved entries and blank names. Null approval fields are not invented approvals or automatic rejections. Named park/civic parcels use an interior coordinate outside parcel holes; this is a derived facility anchor, not a verified pedestrian entrance.
- City-owned properties: only meaningful named facilities; reject uncertain question-mark labels, ROW, substations, lift stations, storage and restricted/utility asset labels. Private owner names are not catalog destinations.
- Public art: named works with a recorded past removal date are excluded. “Untitled” is a legitimate artwork title; blank titles are not invented. Historic sites: use only official `name`/address/geometry; a historic-site pin does not promise a surviving building or public interior access.
- Address-name views: inspect all nonblank EX_ADD records in M/PARK/STE/APT categories across City, TrakIT and billing publications. Exclude future/temporary/administrative/utility/storage annotations, generic category labels and unestablished unit/telecom-tenant identities. Keep meaningful facility/destination descriptions. Category statistics and the suite/apartment field review are saved; other categories are utility/network/temporary classifications, not omitted named visitor inventories.
- No location record adds walking infrastructure coverage. School, business, apartment, museum and facility pins do not establish a right of entry. Infrastructure eligibility and coverage matching are unchanged; routing still uses pedestrian network snaps and the original 100m endpoint cap.

## Every official service inspected

Discovery reads the official REST root/folders and the City-linked portal organization’s entire public feature-service listing. All 306 REST layer/container decisions are in source-decisions.json. Portal items and their layer/field metadata are retained under discovery/portal-*.json and assessed below. Empty/private folders do not establish publicly enumerable destination inventories.

| Official service | Layer/container entries | Disposition |
|---|---|---|
| [Base_map/Benton_County_Data/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/Benton_County_Data/FeatureServer) | 4 | No new destination layer: Duplicate publication; canonical MapServer reviewed (current addresses integrated; DEMO/parcel/lot layers excluded) |
| [Base_map/Benton_County_Data/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/Benton_County_Data/MapServer) | 4 | Integrated: county-addresses |
| [Base_map/School_District18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/School_District18/MapServer) | 13 | Integrated: schools-4; Integrated: schools-7; Integrated: schools-10 |
| [Base_map/Utility_Mapbooks18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/Utility_Mapbooks18/MapServer) | 2 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [BWU_Web_Layers/Water_and_Sewer_Systems__PUBLIC/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/BWU_Web_Layers/Water_and_Sewer_Systems__PUBLIC/MapServer) | 25 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Cemetery/Cemetery_WebService18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Cemetery/Cemetery_WebService18/MapServer) | 9 | No new destination layer: Burial plots, interments or cemetery sections; personal burial data is not a visitor-place catalog. City Cemetery is available from Parks |
| [Electric_System/Catalyst_BaseMap/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_BaseMap/FeatureServer) | 5 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Catalyst_BaseMap/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_BaseMap/MapServer) | 5 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Catalyst_Planning/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Planning/FeatureServer) | 8 | No new destination layer: Ownership/development/neighborhood area, not an established individual visitor destination/entrance; no owner names or arbitrary area centroids indexed |
| [Electric_System/Catalyst_Planning/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Planning/MapServer) | 10 | No new destination layer: Ownership/development/neighborhood area, not an established individual visitor destination/entrance; no owner names or arbitrary area centroids indexed |
| [Electric_System/Catalyst_Sewer/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Sewer/FeatureServer) | 1 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Catalyst_Sewer/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Sewer/MapServer) | 2 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Catalyst_Stormwater/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Stormwater/FeatureServer) | 1 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Catalyst_Stormwater/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Catalyst_Stormwater/MapServer) | 2 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Electric_System/Electric_System_Public18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Electric_System/Electric_System_Public18/MapServer) | 4 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Emergency_Services/Emergency_Services_CLOUD_PUBLIC/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Emergency_Services/Emergency_Services_CLOUD_PUBLIC/MapServer) | 8 | Integrated: fire-stations |
| [Hosted/2025_contours_vtpk/VectorTileServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/2025_contours_vtpk/VectorTileServer) | 0 | Tool/vector basemap service; no enumerable destination feature layers |
| [Hosted/Basemap_World_2023_UPDATE_updated_/VectorTileServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Basemap_World_2023_UPDATE_updated_/VectorTileServer) | 0 | Tool/vector basemap service; no enumerable destination feature layers |
| [Hosted/Bentonville_FLUM_PreferredScenario_View/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Bentonville_FLUM_PreferredScenario_View/FeatureServer) | 1 | No new destination layer: Basemap/contours, future land-use or bond-project planning data; no current named destination point inventory |
| [Hosted/Bond_Projects/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Bond_Projects/FeatureServer) | 1 | No new destination layer: Basemap/contours, future land-use or bond-project planning data; no current named destination point inventory |
| [Hosted/Centerton_Land_Use_Plan/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Centerton_Land_Use_Plan/FeatureServer) | 1 | No new destination layer: Basemap/contours, future land-use or bond-project planning data; no current named destination point inventory |
| [Hosted/Historic_Sites_Field_Collection_(VIEW)/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Hosted/Historic_Sites_Field_Collection_%28VIEW%29/FeatureServer) | 1 | Integrated: historic-sites |
| [Parks/Parks_Recreation18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer) | 15 | Integrated: poi-168; Integrated: poi-165; Integrated: parks; Integrated: park-properties |
| [Parks/Sidewalk_Gap_Identification_Web_Map/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Parks/Sidewalk_Gap_Identification_Web_Map/MapServer) | 5 | Integrated: schools-all |
| [Planning/2025_Traffic_Counts/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/2025_Traffic_Counts/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/ASBuilt_Scans18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/ASBuilt_Scans18/MapServer) | 3 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Bentonville_Addresses23/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/FeatureServer) | 2 | No new destination layer: Duplicate publication; canonical MapServer reviewed (current addresses integrated; DEMO/parcel/lot layers excluded) |
| [Planning/Bentonville_Addresses23/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer) | 2 | Integrated: city-addresses, address-destinations |
| [Planning/Community_Development23/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer) | 54 | Integrated: civic-properties; Integrated: common |
| [Planning/DEC_FLUM_layer/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/DEC_FLUM_layer/FeatureServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/DEC_FLUM_layer/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/DEC_FLUM_layer/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Downloadable_Contours_2017_Grid/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Downloadable_Contours_2017_Grid/FeatureServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Downloadable_Contours_2017_Grid/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Downloadable_Contours_2017_Grid/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/FLUM_26NOV2024/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/FLUM_26NOV2024/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/FLUM_JAN_2025/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/FLUM_JAN_2025/FeatureServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/FLUM_JAN_2025/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/FLUM_JAN_2025/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Great_Neighborhood_Program/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Great_Neighborhood_Program/FeatureServer) | 1 | No new destination layer: Ownership/development/neighborhood area, not an established individual visitor destination/entrance; no owner names or arbitrary area centroids indexed |
| [Planning/Great_Neighborhood_Program/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Great_Neighborhood_Program/MapServer) | 1 | No new destination layer: Ownership/development/neighborhood area, not an established individual visitor destination/entrance; no owner names or arbitrary area centroids indexed |
| [Planning/Land_Use_2025/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Land_Use_2025/FeatureServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Land_Use_2025/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Land_Use_2025/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Pending_PZitems_Publish23/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer) | 2 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/Public_Art_Points_map_service/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Public_Art_Points_map_service/MapServer) | 1 | Integrated: public-art |
| [Planning/SEP_Bentonville_FLUM_update_map_layer/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/SEP_Bentonville_FLUM_update_map_layer/FeatureServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Planning/SEP_Bentonville_FLUM_update_map_layer/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Planning/SEP_Bentonville_FLUM_update_map_layer/MapServer) | 1 | No new destination layer: Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point |
| [Stormwater/FEMA_DATA/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Stormwater/FEMA_DATA/MapServer) | 44 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Stormwater/StormWater_System18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Stormwater/StormWater_System18/MapServer) | 8 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Stormwater/TEST_geotagged_photos/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Stormwater/TEST_geotagged_photos/MapServer) | 1 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [TrakIT/TrakIT_Data/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/TrakIT/TrakIT_Data/MapServer) | 18 | Integrated: trakit-addresses, trakit-destinations |
| [TrakIT/TrakIT_Display/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/TrakIT/TrakIT_Display/MapServer) | 18 | No new destination layer: Duplicate publication: same 43,071 full IDs/hash as TrakIT_Data/0; canonical source integrated |
| [Transportation/NewWorldCenterlines18/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Transportation/NewWorldCenterlines18/MapServer) | 1 | No new destination layer: Road centerline network, not named pedestrian destinations |
| [Utilities/Geometry/GeometryServer](https://gis.bentonvillear.com/arcgis/rest/services/Utilities/Geometry/GeometryServer) | 0 | Tool/vector basemap service; no enumerable destination feature layers |
| [Utilities/PrintingTools/GPServer](https://gis.bentonvillear.com/arcgis/rest/services/Utilities/PrintingTools/GPServer) | 0 | Tool/vector basemap service; no enumerable destination feature layers |
| [Utility_Billing/RouteMap_WebMap/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Utility_Billing/RouteMap_WebMap/MapServer) | 9 | Integrated: billing-addresses, billing-destinations |
| [Water_System/Water_Leaks_Layer_for_Dashboard/FeatureServer](https://gis.bentonvillear.com/arcgis/rest/services/Water_System/Water_Leaks_Layer_for_Dashboard/FeatureServer) | 1 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |
| [Water_System/Water_Leaks_Layer_for_Dashboard/MapServer](https://gis.bentonvillear.com/arcgis/rest/services/Water_System/Water_Leaks_Layer_for_Dashboard/MapServer) | 1 | No new destination layer: Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations |

In particular, Natural Surface Trails/158 and Park Features/8 are linear infrastructure/cartographic features, not established visitor entrance points; this audit does not invent trailhead coordinates from their midpoints. Shared Roadways, future/prioritized projects and emergency-access points are not used to inflate either location or infrastructure eligibility. Public trail destination POIs are integrated. Parcel owner names, subdivisions/zones, planning areas, cemetery interments, hydrants/sirens, trees, maintenance photos, contours, basemaps and GIS tools do not establish individual current visitor destinations.

### City-linked ArcGIS Online organization — all public feature-service items

City organization: KVEBkgY6kMufuFG2, City of Bentonville Arkansas G.I.S., verified via the official maps portal. All 43 public feature-service items were inspected. Only named destination layers with usable geometry/status/access evidence were added. Contact/ownership/survey records were not ingested.

| Official portal item | Layer | Disposition |
|---|---|---|
| [Downtown Historic Overlay](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Historic_Overlay/FeatureServer) | 0 Downtown Historic Overlay | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [ServiceLine_viewing](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/ServiceLine_viewing_7d0412647fd342ba87d4b32b992dc149/FeatureServer) | 0 ServiceLine | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |
| [Bentonville_FLUM_ParcelJoin_071124](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Bentonville_FLUM_ParcelJoin_071124/FeatureServer) | 0 Bentonville_FLUM_ParcelJoin_071124 | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_4711fa67864d4129ae38591584f79266/FeatureServer) | 0 Blocks | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_4711fa67864d4129ae38591584f79266/FeatureServer) | 1 Closures | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_4711fa67864d4129ae38591584f79266/FeatureServer) | 2 Detours | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [26NOV24_FLUM](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/26NOV24_FLUM/FeatureServer) | 0 26NOV24_FLUM | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Service Line Self-Assessment_customer](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/survey123_fieldworker_7d0412647fd342ba87d4b32b992dc149/FeatureServer) | 0 survey | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |
| [ZoningRequestfromPublic](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/ZoningRequestfromPublic/FeatureServer) | 0 ZoningRequestfromPublic | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Downtown Public Parking_ view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer) | 0 Points_of_Interest | Integrated: downtown-public-poi |
| [Downtown Public Parking_ view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer) | 1 Parking_Points | Parking counts/study extents, not named destination locations |
| [Downtown Public Parking_ view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer) | 2 Parking_Polygons | Integrated: public-parking |
| [Downtown Public Parking_ view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Downtown_Public_Parking__view/FeatureServer) | 3 Study_Area | Parking counts/study extents, not named destination locations |
| [City of Bentonville Future Land Use Feedback Webl layer points](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Plan_Bentonville_Public_Response_points/FeatureServer) | 1 Reports_points | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [City of Bentonville Future Land Use Feedback Webl layer points](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Plan_Bentonville_Public_Response_points/FeatureServer) | 0 Reports | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Bus_Registry_PORTAL_new_Public VIEW](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Business_Registry_PORTAL_copy_Public_view/FeatureServer) | 0 Business_Registry | Integrated: registered-businesses |
| [Bentonville_FLUM_with_Parcel_Data---OLD](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Bentonville_FLUM_ParcelJoin_shp/FeatureServer) | 0 Bentonville_FLUM_ParcelJoin_shp | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [City of Bentonville Future Land Use Feedback Web layer Heatmap](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Plan_Bentonville_Public_Response_Heatmap/FeatureServer) | 0 Reports | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Final COB Zoning Viewing Layer](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Final_COB_Zoning_Viewing_Layer/FeatureServer) | 0 COBZoning | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Staff_Comment_Responses](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Staff_Comment_Responses/FeatureServer) | 0 Staff_Comment_Responses | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [National Register Properties View](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/National_Register_Properties_View/FeatureServer) | 0 NationalRegisterProperties | Integrated: national-register |
| [City_Owned_Property_in_SFHA_24](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/City_Owned_Property_in_SFHA_24/FeatureServer) | 0 City_Owned_Property_in_SFHA_24 | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [City_Hall_Selfie_Day](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/City_Hall_Selfie_Day/FeatureServer) | 0 City_Hall_Selfie_Day | Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations |
| [bentonville_dashboard_master_database view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/bentonville_dashboard_master_database_view/FeatureServer) | 1 mh_rehab_recommendations | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |
| [bentonville_dashboard_master_database view](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/bentonville_dashboard_master_database_view/FeatureServer) | 2 gravityMains_rehab_recommendations | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |
| [BusReg_List VIEW](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/BusReg_List/FeatureServer) | 0 Business_Registry | Limited business view omits STATUS/Home_occ; richer registry with issued/non-home eligibility is used |
| [BentonvilleAddress18](https://gis.bentonvillear.com/arcgis/rest/services/Planning/BentonvilleAddress18/MapServer/2) | No usable layer metadata | Legacy/unavailable or non-destination reference; no geometry invented |
| [Bentonville Zoning](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development18/MapServer/0) | No usable layer metadata | Legacy/unavailable or non-destination reference; no geometry invented |
| [Tax Parcels](https://gis.bentonvillear.com/arcgis/rest/services/Base_map/Benton_County_Data18/MapServer/2) | No usable layer metadata | Legacy/unavailable or non-destination reference; no geometry invented |
| [Public Art Points for AGOL Story Map](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Art_Points_for_AGOL_Story_Map/FeatureServer) | 0 Public_Art_Points | Integrated: portal-public-art |
| [TreeArea](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/TreeArea/FeatureServer) | 0 TreeArea | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Portal COB Address](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/FeatureServer) | 2 Address | Duplicate current City address publication; canonical MapServer layer used, DEMO addresses excluded |
| [Portal COB Address](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/FeatureServer) | 5 DEMO Address | Duplicate current City address publication; canonical MapServer layer used, DEMO addresses excluded |
| [Ozark Regional Transit](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Ozark_Regional_Transit/FeatureServer) | 0 directions | Transit route polylines only; no stop destination point inventory and no transit-routing feature added |
| [Bond Projects](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Bond_Projects/FeatureServer) | 0 Bond_Projects | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Plan Bentonville - Public Engagement NEW](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/service_e57b9d12593849f88f7c859324ad25c8/FeatureServer) | 0 Form_1 | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [PC Item Points](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/PC_Item_Points/FeatureServer) | 0 Development Points | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [FLUMRequests022626](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/FLUMRequests022626/FeatureServer) | 0 FLUMReqParcel | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Visit Bentonville Wayfinding VIEW LAYER](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Visit_Bentonville_Wayfinding_VIEW_LAYER/FeatureServer) | 0 VisitBentonville_Wayfinding | Sign locations/text are not established destination or public-entrance coordinates; no sign relabeled as its advertised destination |
| [CitizenProblems_URL](https://utility.arcgis.com/usrsvcs/servers/e05a4d34363941078db21177b1ca8bcf/rest/services/Hosted/CitizenProblems/FeatureServer) | 0 Citizen_Problems | Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_75e6a6095e9d451ca8adbb811ac48613/FeatureServer) | 0 Road Blocks | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_75e6a6095e9d451ca8adbb811ac48613/FeatureServer) | 1 Road Closures | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [RoadClosures_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/RoadClosures_public_75e6a6095e9d451ca8adbb811ac48613/FeatureServer) | 2 Road Detours | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Zoning_test](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Zoning_test/FeatureServer) | 0 Zoning | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [CoB Tree Giveaway Survey - TEST](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/service_b374e9ac16c14e7dbfa6e75e5ac45cf4/FeatureServer) | 0 CoB_Tree_Giveaway_Survey | Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations |
| [Public Parking Data Layers (view)](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Parking_Data_Layers_%28view%29/FeatureServer) | 0 Points of Interest | Exact eligible POI copy: 14/14 normalized name/address/geometry matches; current canonical view used |
| [Public Parking Data Layers (view)](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Parking_Data_Layers_%28view%29/FeatureServer) | 13 Parking_Points | Parking counts/study extents, not named visitor destinations |
| [Public Parking Data Layers (view)](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Parking_Data_Layers_%28view%29/FeatureServer) | 12 Parking_Polygons | Older parking publication: 9 always-public entries versus 8 in the newer canonical view; older-only DAC lot lacks corroborated current access and is held |
| [Public Parking Data Layers (view)](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Public_Parking_Data_Layers_%28view%29/FeatureServer) | 5 Study Area | Parking counts/study extents, not named visitor destinations |
| [Images View](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/Images_View/FeatureServer) | 0 Images | Integrated: national-register-points |
| [IndividualAssistance_report](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/IndividualAssistance_report_20f793c6f1b44bdb8eff0b6a1dddf1b9/FeatureServer) | 0 Damage Reports | Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations |
| [COB Zoning with Citizen Feedback](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/COB%20Zoning%20with%20Citizen%20Feedback/FeatureServer) | 0 outputLayer | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [IndividualAssistance_public](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/IndividualAssistance_public_20f793c6f1b44bdb8eff0b6a1dddf1b9/FeatureServer) | 0 Damage Reports | Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations |
| [Zoning - Plan Bentonville Citizen Feedback_form](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/service_c0f3646facd3442ab6e1c61788dcf71c_form/FeatureServer) | 0 Zoning___Plan_Bentonville_Citizen_Feedback | Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory |
| [Airport Maintenance _fieldworker](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/survey123_4a9119d7911541e0b4785d6c5cd30062_fieldworker/FeatureServer) | 0 surveyPoint | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |
| [Airport Maintenance 1 - Copy_fieldworker](https://services1.arcgis.com/KVEBkgY6kMufuFG2/arcgis/rest/services/survey123_33a7e98932434fa891266e163d263a45_fieldworker/FeatureServer) | 0 surveyPoint | Utility/maintenance/recommendation assets or worker reports, not visitor destinations |

Portal businesses: ingest all 607 records, accepting only explicit ISSUED + Home_occ NO (418 before City validation); expired, received, and home-occupation records have explicit rejection reasons. The public parking source accepts only Public Parking + Always Public on both weekdays/weekends; 8 raw entries qualify, 14 conditional/private/unknown entries do not. The alternate POI view is a verified exact duplicate. The older parking view’s extra DAC entry is not assumed closed, but its current availability is unresolved; see parking-access-conflict.json. Historic-property polygon/point views and the supplementary art view are included and deduplicated against the existing City sources.

## Catalog architecture and validation

Official source descriptors → complete stable-ID inventories → verified 1,000-ID POST batches → normalization → deduplication → cached searchable index. A source is rejected as unavailable if IDs, batch membership, counts or geometry response format are truncated/inconsistent. Long batches use POST because the City server rejects oversized GET URLs. Requests are serialized and spaced to avoid bursts. Successful source inventories have a 24-hour cache; one failed source produces URL/error diagnostics while healthy sources remain available. The UI displays the partial-results warning and does not cache incomplete query results. All-source failure remains an explicit unavailable result, with no mock substitution.

The generated compressed official snapshot is a cold-start cache, included only in the server trace for `/api/locations`. It is not a hand-entered location list. Boundary hashing prevents reuse of supported flags after a boundary change. Runtime indexing retains identities/provenance/diagnostics without retaining duplicate raw inventories. The directory reuses a unique existing named GIS destination or an exact GIS address (uniquely completing an omitted directional only when unambiguous); legacy park names can be linked by unique containing park-parcel geometry. No external geocoding API is called. Composite directory expiry cannot outlive its coordinate evidence; the actual page retrieval timestamp remains separate. House-number and street-vocabulary indexes narrow address candidates; queries rank named and address matches together with the existing confidence floor and eight-result cap. Existing fuzzy matching, aliases, debounce, client cache, explicit selection, request-generation checks, and immediate editing/clear invalidation remain in place. The general highway-address bug was fixed: only the first numeric token identifies the house; an additional highway number must match as a street token, not equal the house number.

Coordinates are validated as finite WGS84 longitude/latitude and converted to `[latitude, longitude]`. Web Mercator conversion is separately tested, without guessing coordinate order. Named polygons use an actual interior point outside holes. Outside records remain in audit evidence but never enter the supported index or pass selection validation.

Deduplication partitions inside/outside records first. It combines exact normalized identity, source/OID, canonical address, type, nearby points and official parcel-extent evidence. Ordinary matching is within 100m; school campuses and matching full facility names with at least two distinctive words allow 200m, or supported parcel extent evidence. These are **catalog identity** rules, not the unchanged 15m infrastructure tolerance. Official point geometry outranks polygon anchors; source priority and clearer name break ties. Aliases, addresses and every source/OID survive merging. School directional labels within 20m of the same normalized campus stem resolve to the stronger school pin; campuses farther apart remain distinct. Acronym merging requires an actual short-code record and shared address, preventing full names that happen to share initials from collapsing. Generic words alone cannot join separate houses, numbered sites, artworks or facilities. Annex, campus direction, access, parking, sports and other meaningful role qualifiers remain distinct. Two nearby official entrances or differently named complex components remain separate when identity evidence is insufficient.

Offline cold parse/normalize/dedup/index: 3075ms; required-query maximum: 200.8ms. Current real API timings and source availability are recorded in api-verification.json. An expired/missing full snapshot can require a much longer full upstream refresh; refresh/warm it before recording. A managed refresh/cache and production capacity remain deployment prerequisites.

## Entire official school-point inventory

51 published school-point rows (overlapping category/all-school views), 29 distinct school-point identities overall; **42 in-city source rows / 24 distinct in-city schools**. All 42 in-city rows resolve by their official name, all 24 canonical schools pass exact/shorthand/prefix search and explicit endpoint selection. The 9 outside rows represent 5 outside schools and remain unsupported. School-category totals above additionally include administration, named sub-campus and other educational destinations. Coordinates below are the original official source point; a merged result may prefer another stronger source point, preserved in the JSON evidence.

| School (official name) | Source / OID | Official lat, lon | Inside? | Found / exact? | Shorthand or prefix → works? | Selectable? | Actual routing evidence |
|---|---|---|---|---|---|---|---|
| Willowbrook Elementary | schools-4/1 | 36.32289434, -94.23312935 | Yes | Yes | Willowbrook ES → Yes | Yes | Pass: #22 |
| Thomas Jefferson Elementary | schools-4/4 | 36.38199327, -94.21617872 | Yes | Yes | Thomas Jefferson ES → Yes | Yes | Pass: #4 |
| Sugar Creek Elementary | schools-4/5 | 36.38325752, -94.21590021 | Yes | Yes | Sugar Creek ES → Yes | Yes | Pass: #3 |
| Mary Jones Elementary | schools-4/8 | 36.35644326, -94.20532155 | Yes | Yes | Mary Jones ES → Yes | Yes | Pass: #14 |
| Cooper Elementary | schools-4/9 | 36.43663208, -94.22994308 | No | No | Cooper ES → No | No | Unsupported (outside city) |
| RE Baker Elementary | schools-4/12 | 36.37462660, -94.21223324 | Yes | Yes | RE Baker ES → Yes | Yes | Pass: #6 |
| Elm Tree Elementary | schools-4/13 | 36.37105992, -94.24943028 | Yes | Yes | Elm Tree ES → Yes | Yes | Pass: #9 |
| Central Park Elementary | schools-4/15 | 36.31775485, -94.23003080 | Yes | Yes | Central Park ES → Yes | Yes | Blocked/unavailable: #25 |
| Apple Glen Elementary | schools-4/16 | 36.37464564, -94.18963553 | Yes | Yes | Apple Glen ES → Yes | Yes | Pass: #5 |
| Osage Creek Elementary | schools-4/20 | 36.34169461, -94.24356189 | Yes | Yes | Osage Creek ES → Yes | Yes | Blocked/unavailable: #20 |
| Centerton Gamble Elementary | schools-4/21 | 36.38137867, -94.29192306 | No | No | Centerton Gamble ES → No | No | Unsupported (outside city) |
| Evening Star Elementary | schools-4/23 | 36.29156888, -94.24332009 | No | No | Evening Star ES → No | No | Unsupported (outside city) |
| Vaughn Elementary School | schools-4/24 | 36.32152133, -94.29349311 | Yes | Yes | Vaughn ES → Yes | Yes | Blocked/unavailable: #23 |
| Ruth Barker Middle School | schools-7/6 | 36.35215312, -94.20503567 | Yes | Yes | Ruth Barker MS → Yes | Yes | Pass: #16 |
| Old High Middle School | schools-7/7 | 36.37358429, -94.21370716 | Yes | Yes | Old High MS → Yes | Yes | Pass: #7 |
| Bright Field Middle School | schools-7/10 | 36.32391715, -94.23432123 | Yes | Yes | Bright Field MS → Yes | Yes | Pass: #21 |
| Ardis Ann Middle School | schools-7/11 | 36.37082147, -94.24938057 | Yes | Yes | Ardis Ann MS → Yes | Yes | Pass: #10 |
| Creekside Middle School | schools-7/19 | 36.34229490, -94.24165967 | Yes | Yes | Creekside MS → Yes | Yes | Pass: #19 |
| Lincoln Jr. High | schools-10/2 | 36.38801515, -94.21179926 | Yes | Yes | Lincoln JHS → Yes | Yes | Pass: #2 |
| Washington Jr High | schools-10/3 | 36.37355604, -94.19136453 | Yes | Yes | Washington JHS → Yes | Yes | Pass: #8 |
| Grimsley Junior High School | schools-10/17 | 36.34544434, -94.30195980 | No | No | Grimsley JHS → No | No | Unsupported (outside city) |
| Fulbright Junior High School | schools-10/18 | 36.32040188, -94.23516716 | Yes | Yes | Fulbright JHS → Yes | Yes | Blocked/unavailable: #24 |
| Willowbrook Elementary | schools-all/1 | 36.32289434, -94.23312935 | Yes | Yes | Willowbrook ES → Yes | Yes | Pass: #22 |
| Lincoln Jr. High | schools-all/2 | 36.38801515, -94.21179926 | Yes | Yes | Lincoln JHS → Yes | Yes | Pass: #2 |
| Washington Jr High | schools-all/3 | 36.37355604, -94.19136453 | Yes | Yes | Washington JHS → Yes | Yes | Pass: #8 |
| Thomas Jefferson Elementary | schools-all/4 | 36.38199327, -94.21617872 | Yes | Yes | Thomas Jefferson ES → Yes | Yes | Pass: #4 |
| Sugar Creek Elementary | schools-all/5 | 36.38325752, -94.21590021 | Yes | Yes | Sugar Creek ES → Yes | Yes | Pass: #3 |
| Ruth Barker Middle School | schools-all/6 | 36.35215312, -94.20503567 | Yes | Yes | Ruth Barker MS → Yes | Yes | Pass: #16 |
| Old High Middle School | schools-all/7 | 36.37358429, -94.21370716 | Yes | Yes | Old High MS → Yes | Yes | Pass: #7 |
| Mary Jones Elementary | schools-all/8 | 36.35644326, -94.20532155 | Yes | Yes | Mary Jones ES → Yes | Yes | Pass: #14 |
| Cooper Elementary | schools-all/9 | 36.43663208, -94.22994308 | No | No | Cooper ES → No | No | Unsupported (outside city) |
| Bright Field Middle School | schools-all/10 | 36.32391715, -94.23432123 | Yes | Yes | Bright Field MS → Yes | Yes | Pass: #21 |
| Ardis Ann Middle School | schools-all/11 | 36.37082147, -94.24938057 | Yes | Yes | Ardis Ann MS → Yes | Yes | Pass: #10 |
| RE Baker Elementary | schools-all/12 | 36.37462660, -94.21223324 | Yes | Yes | RE Baker ES → Yes | Yes | Pass: #6 |
| Elm Tree Elementary | schools-all/13 | 36.37105992, -94.24943028 | Yes | Yes | Elm Tree ES → Yes | Yes | Pass: #9 |
| Bentonville West High School | schools-all/14 | 36.37803345, -94.29826503 | No | No | Bentonville West HS → No | No | Unsupported (outside city) |
| Central Park Elementary | schools-all/15 | 36.31775485, -94.23003080 | Yes | Yes | Central Park ES → Yes | Yes | Blocked/unavailable: #25 |
| Apple Glen Elementary | schools-all/16 | 36.37464564, -94.18963553 | Yes | Yes | Apple Glen ES → Yes | Yes | Pass: #5 |
| Grimsley Junior High School | schools-all/17 | 36.34544434, -94.30195980 | No | No | Grimsley JHS → No | No | Unsupported (outside city) |
| Fulbright Junior High School | schools-all/18 | 36.32040188, -94.23516716 | Yes | Yes | Fulbright JHS → Yes | Yes | Blocked/unavailable: #24 |
| Creekside Middle School | schools-all/19 | 36.34229490, -94.24165967 | Yes | Yes | Creekside MS → Yes | Yes | Pass: #19 |
| Osage Creek Elementary | schools-all/20 | 36.34169461, -94.24356189 | Yes | Yes | Osage Creek ES → Yes | Yes | Blocked/unavailable: #20 |
| Centerton Gamble Elementary | schools-all/21 | 36.38137867, -94.29192306 | No | No | Centerton Gamble ES → No | No | Unsupported (outside city) |
| Bentonville High School | schools-all/22 | 36.35192808, -94.19558392 | Yes | Yes | Bentonville HS → Yes | Yes | Pass: #17 |
| Evening Star Elementary | schools-all/23 | 36.29156888, -94.24332009 | No | No | Evening Star ES → No | No | Unsupported (outside city) |
| Vaughn Elementary School | schools-all/24 | 36.32152133, -94.29349311 | Yes | Yes | Vaughn ES → Yes | Yes | Blocked/unavailable: #23 |
| Haas Hall Academy | schools-all/25 | 36.34442439, -94.19808785 | Yes | Yes | Haas Hall → Yes | Yes | Pass: #18 |
| Founders Classical Academy-Bentonville | schools-all/26 | 36.36200110, -94.22823820 | Yes | Yes | Founders Classical → Yes | Yes | Pass: #13 |
| Thaden School-East Campus | schools-all/27 | 36.36220907, -94.20437473 | Yes | Yes | Thaden School-East → Yes | Yes | Pass: #12 |
| Thaden School | schools-all/28 | 36.36339977, -94.20702577 | Yes | Yes | THADEN ES → Yes | Yes | Pass: #11, #92 |
| Bentonville Seventh-Day Adventist School | schools-all/29 | 36.35534687, -94.18218917 | Yes | Yes | Bentonville Seventh-Day Adventist → Yes | Yes | Pass: #15 |

Creekside Middle School is an ordinary ingested school record, not a manual override: **36.342294900955686, -94.24165967314097**, school view 7 / OID 19 plus the all-school source. `Creekside Middle School`, `Creekside Middle`, `Creekside MS` and `creekside` all resolve. Osage Creek Elementary also resolves from the combined school/Common Names evidence. Outside schools remain excluded even when the school district extends beyond the municipality.

## Entire park / recreation / trail-facility inventory

The normalized category/source union contains 109 records including outside destinations; **70** lie inside City Limits. Exact and reasonable partial search, selection and city validation succeed for all 70 (**100%**). This broad inventory includes public parks, recreation facilities, trail access/POIs and named facilities in the Parks/property layers; it is not a legal count of separately designated parks. “Endpoint valid” means strict input/city validation passed; it does not assert that an untested provider trip exists.

| Park / facility | Source(s) | Official/selected lat, lon | Inside? | Exact / partial | Selectable? | Actual routing evidence |
|---|---|---|---|---|---|---|
| Austin-Baggett Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.36571210, -94.20363133 | Yes | Yes / Yes | Yes | Pass: #1, #8, #15, #22, #30, #37, #44, #51, #54, #58, #65, #80 |
| Bark Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.40195957, -94.21561889 | Yes | Yes / Yes | Yes | Pass: #83 |
| Bella Vista Lake | city-parks-directory, civic-properties, common, park-properties | 36.43238370, -94.23247128 | Yes | Yes / Yes | Yes | Blocked/unavailable: #84 |
| Bentonville Community Center | common | 36.33068663, -94.22562277 | Yes | Yes / Yes | Yes | Pass: #5, #12, #19, #34, #41, #48, #55, #76, #77, #80, #83, #85, #86, #87, #88, #89, #90 |
| Lake Bentonville | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.35144037, -94.22113619 | Yes | Yes / Yes | Yes | Pass: #56 |
| Bentonville Parks & Recreation Bldg | common | 36.36999832, -94.21002265 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Bogle Park | address-destinations, billing-destinations, city-parks-directory, common, parks, trakit-destinations | 36.37504547, -94.21650186 | Yes | Yes / Yes | Yes | Pass: #43 |
| Dave Peel Park | city-parks-directory, civic-properties, common, downtown-public-poi, park-properties, poi-165, poi-168 | 36.37210887, -94.20715955 | Yes | Yes / Yes | Yes | Pass: #85 |
| Dog Park | common | 36.40195957, -94.21561889 | Yes | Yes / Yes | Yes | Pass: #31 |
| Durham Place Park | address-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.36302089, -94.20218924 | Yes | Yes / Yes | Yes | Pass: #55 |
| Enfield Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.38687696, -94.20040325 | Yes | Yes / Yes | Yes | Pass: #32 |
| Gilmore Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.36673563, -94.21356397 | Yes | Yes / Yes | Yes | Pass: #52 |
| Lawrence Plaza | address-destinations, billing-destinations, civic-properties, common, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.37464983, -94.20753356 | Yes | Yes / Yes | Yes | Pass: #1, #2, #9, #16, #31, #38, #44, #45, #52, #59, #66, #77, #81, #91, #92, #93, #94 |
| Melvin Ford Aquatic Center | address-destinations, billing-destinations, common, parks, trakit-destinations | 36.37407941, -94.18713736 | Yes | Yes / Yes | Yes | Pass: #46, #47 |
| Memorial Park | city-parks-directory, civic-properties, common, park-properties, poi-165, poi-168 | 36.37405929, -94.18699732 | Yes | Yes / Yes | Yes | Pass: #7, #14, #21, #29, #36, #43, #50, #57, #71, #79, #82 |
| Merchant's Park | common | 36.37431922, -94.24963022 | Yes | Yes / Yes | Yes | Pass: #45 |
| NW A Street Park | address-destinations, common, parks, trakit-destinations | 36.38072641, -94.20954951 | Yes | Yes / Yes | Yes | Pass: #36 |
| Old Tiger Stadium | common | 36.38364751, -94.21697258 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Park Springs Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.38446940, -94.21172263 | Yes | Yes / Yes | Yes | Pass: #34 |
| Skate Park | civic-properties, common, park-properties | 36.37644138, -94.18693487 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Slaughter Pen Bike Trail | common | 36.40800057, -94.21463374 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Slaughter Pen NE Entrance | common | 36.40174455, -94.20138747 | No | No / No | No | Unsupported (outside city) |
| Soccer Complex | address-destinations, billing-destinations, common, parks, poi-165, poi-168, trakit-destinations | 36.37671630, -94.18992019 | Yes | Yes / Yes | Yes | Pass: #40 |
| Sugar Creek Soccer Fields | common | 36.43638801, -94.23173649 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| TAC SOCCER COMPLEX | common | 36.35370000, -94.20513736 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Tennis Complex | address-destinations, billing-destinations, common, parks, trakit-destinations | 36.37741453, -94.18931670 | Yes | Yes / Yes | Yes | Pass: #38 |
| Tiger Stadium | common | 36.35284223, -94.19820581 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Train Station Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, trakit-destinations | 36.36797251, -94.20897811 | Yes | Yes / Yes | Yes | Pass: #51 |
| Wildwood Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, common, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.33442321, -94.23648878 | Yes | Yes / Yes | Yes | Pass: #58 |
| Phillips Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.34097549, -94.20454245 | Yes | Yes / Yes | Yes | Pass: #57 |
| TRIAL ENTRANCE | address-destinations, billing-destinations, parks, trakit-destinations | 36.38301547, -94.20546057 | Yes | Yes / Yes | Yes | Pass: #35 |
| City Square | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, poi-168, trakit-destinations | 36.37261003, -94.20848030 | Yes | Yes / Yes | Yes | Pass: #48 |
| FOUNTAIN | parks | 36.36621315, -94.19711536 | Yes | Yes / Yes | Yes | Pass: #53 |
| Town Branch Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, poi-168, trakit-destinations | 36.37164339, -94.20441432 | Yes | Yes / Yes | Yes | Blocked/unavailable: #49 |
| CITY CEMETERY | address-destinations, billing-destinations, parks, trakit-destinations | 36.36870489, -94.21717073 | Yes | Yes / Yes | Yes | Pass: #50 |
| Old Tiger Track | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, trakit-destinations | 36.38552054, -94.21606283 | Yes | Yes / Yes | Yes | Pass: #33 |
| TRAIL ENTRANCE | address-destinations, billing-destinations, parks, trakit-destinations | 36.40800057, -94.21463374 | Yes | Yes / Yes | Yes | Pass: #29 |
| ROUNDABOUT | parks | 36.37668834, -94.18337311 | Yes | Yes / Yes | Yes | Pass: #41 |
| WEST SOCCER COMPLEX | address-destinations, billing-destinations, parks, trakit-destinations | 36.37652617, -94.19302817 | Yes | Yes / Yes | Yes | Pass: #42 |
| Merchants Baseball Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, trakit-destinations | 36.37431922, -94.24963022 | Yes | Yes / Yes | Yes | Pass: #86 |
| VOLLEY BALL PARK | address-destinations, billing-destinations, parks, trakit-destinations | 36.37737087, -94.18756048 | Yes | Yes / Yes | Yes | Pass: #39 |
| Orchards Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, parks, poi-165, poi-168, trakit-destinations | 36.37742187, -94.19555427 | Yes | Yes / Yes | Yes | Pass: #37 |
| NW PARK ENTRANCE | address-destinations, parks, trakit-destinations | 36.43238370, -94.23247128 | Yes | Yes / Yes | Yes | Blocked/unavailable: #27 |
| NE PARK ENTRANCE | address-destinations, billing-destinations, parks, trakit-destinations | 36.43288130, -94.22954455 | Yes | Yes / Yes | Yes | Blocked/unavailable: #26 |
| WISHING SPRING TRAIL | address-destinations, parks, poi-165, poi-168, trakit-destinations | 36.42141186, -94.22089585 | Yes | Yes / Yes | Yes | Blocked/unavailable: #28 |
| TRAIL TOILET-M-MARKER #34 | address-destinations, billing-destinations, parks, trakit-destinations | 36.40616435, -94.20820557 | Yes | Yes / Yes | Yes | Pass: #30 |
| Forester Park | poi-165, poi-168 | 36.34345859, -94.11971157 | No | No / No | No | Unsupported (outside city) |
| Frisco and Centennial Park | poi-165, poi-168 | 36.33281588, -94.11603707 | No | No / No | No | Unsupported (outside city) |
| Olive Street Park | poi-165, poi-168 | 36.34068355, -94.15368750 | No | No / No | No | Unsupported (outside city) |
| Northwest Park | poi-165, poi-168 | 36.34524468, -94.13356994 | No | No / No | No | Unsupported (outside city) |
| Veteran's Park | poi-165, poi-168 | 36.31840280, -94.11122104 | No | No / No | No | Unsupported (outside city) |
| Rogers Skate and Splash Park | poi-168 | 36.34076837, -94.11688075 | No | No / No | No | Unsupported (outside city) |
| Cambridge Park | poi-165, poi-168 | 36.34822849, -94.16962066 | No | No / No | No | Unsupported (outside city) |
| Rogers Regional Sports Park | poi-165, poi-168 | 36.35346539, -94.14443896 | No | No / No | No | Unsupported (outside city) |
| Ward Nail Park | poi-165, poi-168 | 36.25663376, -94.12015708 | No | No / No | No | Unsupported (outside city) |
| McClure Park | poi-165, poi-168 | 36.25724842, -94.13409619 | No | No / No | No | Unsupported (outside city) |
| Lowell Park | poi-165, poi-168 | 36.25796675, -94.13556425 | No | No / No | No | Unsupported (outside city) |
| Tower Park | poi-165, poi-168 | 36.32044701, -94.12792397 | No | No / No | No | Unsupported (outside city) |
| Mercy Trailhead | poi-165, poi-168 | 36.30498824, -94.18156431 | No | No / No | No | Unsupported (outside city) |
| Memorial Park Tennis Court Parking | poi-165, poi-168 | 36.37747886, -94.18816234 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Bark Park Trail Head | poi-165, poi-168 | 36.40243425, -94.21562036 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Melvin Ford Aquatic Center Parking | poi-165, poi-168 | 36.37499744, -94.18692413 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Memorial Park Parking | poi-165, poi-168 | 36.37341088, -94.18719839 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Rogers Aquatic Center | poi-165, poi-168 | 36.31650525, -94.15703726 | No | No / No | No | Unsupported (outside city) |
| Tower Park Fitness Trail | poi-165, poi-168 | 36.32029523, -94.12997412 | No | No / No | No | Unsupported (outside city) |
| Veterans Park Trailhead | poi-165, poi-168 | 36.31885017, -94.11293097 | No | No / No | No | Unsupported (outside city) |
| Lake Atalanta Trailhead | poi-165, poi-168 | 36.33186301, -94.10511629 | No | No / No | No | Unsupported (outside city) |
| Cambridge Park Trailhead | poi-165, poi-168 | 36.34796271, -94.16983025 | No | No / No | No | Unsupported (outside city) |
| Slaughter Pen Trail: Cub Street Parking Lot | poi-165, poi-168 | 36.38890548, -94.20383259 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Slaughter Pen Trail Parking | poi-165, poi-168 | 36.38350353, -94.20551007 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Slaughter Pen Trail Restroom | poi-165, poi-168 | 36.38311786, -94.20540303 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Park Springs Park Trailhead | poi-165, poi-168 | 36.38402106, -94.21193755 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Towers Park Parking | poi-165, poi-168 | 36.32063612, -94.12799568 | No | No / No | No | Unsupported (outside city) |
| Memorial Park Parking | poi-165, poi-168 | 36.37651067, -94.18799146 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| John DeShields Soccer Park | poi-165, poi-168 | 36.37724923, -94.19369115 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Horsebarn Trailhead and Park | poi-165, poi-168 | 36.33036468, -94.18841834 | No | No / No | No | Unsupported (outside city) |
| Olive Street Park Trailhead | poi-165, poi-168 | 36.34117931, -94.15369142 | No | No / No | No | Unsupported (outside city) |
| Hobbs State Park: Townsend Ridge Trailhead | poi-165, poi-168 | 36.27279522, -93.96645475 | No | No / No | No | Unsupported (outside city) |
| Hobbs State Park: Piney Road Trailhead | poi-165, poi-168 | 36.29197645, -93.97617117 | No | No / No | No | Unsupported (outside city) |
| Hobbs State Park: Historic Van Winkle Trailhead | poi-165, poi-168 | 36.29686433, -93.95819097 | No | No / No | No | Unsupported (outside city) |
| Hobbs State Park Visitors Center | poi-165, poi-168 | 36.28518998, -93.93873154 | No | No / No | No | Unsupported (outside city) |
| Bella Vista Lake Trailhead | poi-165, poi-168 | 36.43335040, -94.22885612 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Blowing Springs Trailhead | poi-165, poi-168 | 36.44057916, -94.22988140 | No | No / No | No | Unsupported (outside city) |
| Wishing Spring Trail Parking | poi-165, poi-168 | 36.42144156, -94.22082463 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| The Railyard Bike Park | poi-165, poi-168 | 36.32903548, -94.11415562 | No | No / No | No | Unsupported (outside city) |
| The Railyard Trailhead | poi-165, poi-168 | 36.32888184, -94.11402184 | No | No / No | No | Unsupported (outside city) |
| Rogers Sports Park | poi-165, poi-168 | 36.35461411, -94.14426821 | No | No / No | No | Unsupported (outside city) |
| Pigeon Roost Trail Head | poi-165, poi-168 | 36.29030729, -93.93084266 | No | No / No | No | Unsupported (outside city) |
| Flo Ride / Pinyon Creek Trailhead | poi-165, poi-168 | 36.47615131, -94.21199188 | No | No / No | No | Unsupported (outside city) |
| Metfield Recreational Facility | poi-165, poi-168 | 36.45547471, -94.19779762 | No | No / No | No | Unsupported (outside city) |
| Metfield Park | poi-165, poi-168 | 36.45558689, -94.19733628 | No | No / No | No | Unsupported (outside city) |
| Pleasant Ridge Trailhead | poi-165, poi-168 | 36.32290673, -94.10028856 | No | No / No | No | Unsupported (outside city) |
| Frisco Park Trail Head | poi-165, poi-168 | 36.33142722, -94.11568981 | No | No / No | No | Unsupported (outside city) |
| Metfield Park Pavilion | poi-168 | 36.45515939, -94.19736178 | No | No / No | No | Unsupported (outside city) |
| Blowing Springs Park | poi-165, poi-168 | 36.44508765, -94.22266116 | No | No / No | No | Unsupported (outside city) |
| Lake Bella Vista Trail | poi-165, poi-168 | 36.43248281, -94.23180781 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Enfield Trailhead | poi-165, poi-168 | 36.38680658, -94.20036729 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Future Trail Head | poi-165, poi-168 | 36.38666360, -94.23487043 | No | No / No | No | Unsupported (outside city) |
| Rim Trail | poi-168 | 36.38878785, -94.20471655 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Citizens Park | address-destinations, billing-destinations, city-parks-directory, civic-properties, park-properties, trakit-destinations | 36.33072098, -94.22537042 | Yes | Yes / Yes | Yes | Pass: #87 |
| Slaughter Pen Mountain Bike Park | city-parks-directory, civic-properties, park-properties | 36.40623302, -94.20717139 | Yes | Yes / Yes | Yes | Pass: #88 |
| City Hall Community Dev Bdlg | civic-properties, park-properties | 36.37007232, -94.20985200 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Creekside Park | city-parks-directory, civic-properties, park-properties | 36.34070260, -94.23757072 | Yes | Yes / Yes | Yes | Pass: #89 |
| Memorial Park Soccer Fields | civic-properties, park-properties | 36.37572035, -94.19309209 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Memorial Park Tennis Courts | civic-properties, park-properties | 36.37800521, -94.18884917 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| SOUTH TRAIL BATHROOM | address-destinations, billing-destinations, trakit-destinations | 36.37620122, -94.23673655 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| JAMES H BERRY PARK | address-destinations, billing-destinations, trakit-destinations | 36.36677867, -94.21673820 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| TRAIL PAVILION | address-destinations, trakit-destinations | 36.40190455, -94.17564828 | Yes | Yes / Yes | Yes | Endpoint valid; provider trip not tested |
| Bentonville Bike Playground | city-parks-directory | 36.40195957, -94.21561889 | Yes | Yes / Yes | Yes | Pass: #90 |

**Creekside Park works.** The official City page names it at 3104 SW Bright Road. The crosswalk binds that address to City address layer 2 / OID 18903056, **36.34070259828065, -94.23757071600167**. That point lies in official Parks parcel 299, whose legacy GIS name is SW 28th St Park; the old name remains an alias. This is one result of a whole-directory reconciliation, not a manually entered park coordinate. [Official City park page](https://www.bentonville.ar.gov/1525/Creekside-Park) Memorial Park and Austin-Baggett Park also have search, selection and real route evidence.

## All other supported named destinations

The table exhaustively covers accepted supported named records not already in the school-point/park tables, including every accepted business, artwork and historic property. All canonical names pass search/selection. 1467 raw in-city source names are also tested. The only short-input exception is PD; its same canonical police destination is searchable. Historic site labels retain original official names as aliases and identify a historical context rather than implying a current school or a surviving/open building.

| Official canonical destination | Category | lat, lon | Sources | Exact / selectable |
|---|---|---|---|---|
| Amazeum | museum | 36.37908658, -94.19720735 | common | Yes / Yes |
| Arend Arts Center | other official place | 36.35065529, -94.19574271 | common | Yes / Yes |
| Bella Vista Lake Bridge | other official place | 36.42541024, -94.22394830 | common | Yes / Yes |
| Historic site · Benton County Courthouse | landmark | 36.37261398, -94.20763661 | common, national-register, national-register-points | Yes / Yes |
| Benton Co Courthouse Annex | other official place | 36.37310269, -94.20779568 | common | Yes / Yes |
| Benton County Admin | other official place | 36.37260297, -94.20637818 | common | Yes / Yes |
| Benton County Jail | other official place | 36.35906544, -94.22904448 | address-destinations, billing-destinations, common, trakit-destinations | Yes / Yes |
| Benton County Senior Center | other official place | 36.33629822, -94.19347654 | common | Yes / Yes |
| Bentonville Cemetery | other official place | 36.37016551, -94.21693729 | common | Yes / Yes |
| Bentonville Convention Center | other official place | 36.37216417, -94.20863633 | common | Yes / Yes |
| Bentonville District Court | other official place | 36.34451744, -94.21162613 | common | Yes / Yes |
| Bentonville High School-North | school | 36.35189139, -94.19521148 | common | Yes / Yes |
| Bentonville Police Dept | civic facility | 36.35613770, -94.20063199 | civic-properties, common | Yes / Yes |
| Bentonville Rec Center | other official place | 36.33068663, -94.22562277 | common | Yes / Yes |
| Bentonville School Admin | school | 36.38640066, -94.21479246 | common | Yes / Yes |
| BHS Softball Field | other official place | 36.35265532, -94.20141229 | common | Yes / Yes |
| BHS Track & Field Center | other official place | 36.35370000, -94.20513736 | common | Yes / Yes |
| Buckyball | other official place | 36.37822561, -94.19847523 | common | Yes / Yes |
| Central Park Plaza | plaza | 36.37145313, -94.18429601 | common | Yes / Yes |
| City Hall | civic facility | 36.37211118, -94.20976430 | common | Yes / Yes |
| City Pool | other official place | 36.37407941, -94.18713736 | common | Yes / Yes |
| City Technical Services Bldg | other official place | 36.36939825, -94.21019808 | common | Yes / Yes |
| Community Development | other official place | 36.36878749, -94.21009011 | common | Yes / Yes |
| Compost Facility | other official place | 36.39431926, -94.20844333 | common | Yes / Yes |
| Compton Gardens | other official place | 36.37661899, -94.20820613 | common, downtown-public-poi, poi-165, poi-168 | Yes / Yes |
| Crystal Bridges | museum | 36.38211712, -94.20337309 | common, poi-168 | Yes / Yes |
| Downtown Activity Center | other official place | 36.36999832, -94.21002265 | common, poi-165, poi-168 | Yes / Yes |
| Fairgrounds | other official place | 36.31710047, -94.29716005 | common | Yes / Yes |
| Bentonville Fire Station 1 | civic facility | 36.36363070, -94.21089104 | address-destinations, billing-destinations, common, fire-stations, trakit-destinations | Yes / Yes |
| Bentonville Fire Station 2 | civic facility | 36.35381777, -94.18393120 | address-destinations, billing-destinations, civic-properties, common, fire-stations, trakit-destinations | Yes / Yes |
| Bentonville Fire Station 3 | civic facility | 36.38764448, -94.22266831 | address-destinations, billing-destinations, civic-properties, common, fire-stations, trakit-destinations | Yes / Yes |
| Bentonville Fire Station 4 | civic facility | 36.38131333, -94.17798664 | address-destinations, billing-destinations, civic-properties, common, fire-stations, trakit-destinations | Yes / Yes |
| Bentonville Fire Station 5 | civic facility | 36.36465202, -94.24913458 | address-destinations, billing-destinations, civic-properties, common, fire-stations, trakit-destinations | Yes / Yes |
| Bentonville Fire Station 6 | civic facility | 36.33800945, -94.22288657 | address-destinations, billing-destinations, civic-properties, common, fire-stations, trakit-destinations | Yes / Yes |
| Hospital | other official place | 36.33995540, -94.19149506 | common | Yes / Yes |
| Ice Skating Rink | other official place | 36.37464983, -94.20753356 | common | Yes / Yes |
| Juvenile Justice Center | other official place | 36.35995433, -94.22692769 | common | Yes / Yes |
| Library | civic facility | 36.36770870, -94.20851111 | civic-properties, common, downtown-public-poi, poi-165, poi-168 | Yes / Yes |
| Lift Station | other official place | 36.39591241, -94.20208075 | common | Yes / Yes |
| Lincoln Jr High-HLM Bldg | school | 36.38788671, -94.21295659 | common | Yes / Yes |
| Lincoln Jr High-Technology Center | school | 36.38907369, -94.21176054 | common | Yes / Yes |
| Museum of Native American Artifacts | museum | 36.37140409, -94.23113677 | common, poi-168 | Yes / Yes |
| N Walton Roundabout | other official place | 36.41339653, -94.21997711 | common | Yes / Yes |
| NW Medical Center | other official place | 36.33995540, -94.19149506 | common, poi-165, poi-168, registered-businesses | Yes / Yes |
| Old Fairgrounds | other official place | 36.36423292, -94.20901120 | common | Yes / Yes |
| Overlook Parking Lot | other official place | 36.38301547, -94.20546058 | common | Yes / Yes |
| Parks Department | other official place | 36.37447015, -94.18373510 | common | Yes / Yes |
| Parole Office | other official place | 36.35688240, -94.23091384 | common | Yes / Yes |
| Peel Mansion | other official place | 36.36914905, -94.22237706 | common | Yes / Yes |
| Post Office | other official place | 36.35311613, -94.21187421 | common | Yes / Yes |
| Public Defenders Office | other official place | 36.35778554, -94.22594992 | common | Yes / Yes |
| Rainbow Curve | other official place | 36.33595010, -94.20989840 | common | Yes / Yes |
| Sams Club Home Office | other official place | 36.34623806, -94.18677023 | common | Yes / Yes |
| Softball Fields | other official place | 36.37402126, -94.18525780 | common | Yes / Yes |
| Spark Cafe | other official place | 36.37236660, -94.20890980 | common | Yes / Yes |
| Special Services Building | other official place | 36.36385279, -94.20986657 | common | Yes / Yes |
| Supercenter | other official place | 36.36848311, -94.22492625 | common | Yes / Yes |
| Tiger Athletic Complex | other official place | 36.35369895, -94.19810126 | common | Yes / Yes |
| Bentonville Municipal Airport · Thaden Field House | airport | 36.35055955, -94.22128234 | civic-properties, common | Yes / Yes |
| USPS | other official place | 36.35311613, -94.21187421 | common | Yes / Yes |
| Utility Drive Thru | other official place | 36.36799971, -94.20926173 | common | Yes / Yes |
| WalMart Home Office | other official place | 36.36478752, -94.21818527 | common | Yes / Yes |
| Waste Water Treatment | other official place | 36.39254057, -94.20414461 | common | Yes / Yes |
| The Links at Rainbow Curve | other official place | 36.34034809, -94.23436003 | common | Yes / Yes |
| Sullivan Square | other official place | 36.34448577, -94.22540024 | common | Yes / Yes |
| The Trails at Bentonville | other official place | 36.34426407, -94.23859786 | common, registered-businesses | Yes / Yes |
| Walton Crossing | other official place | 36.34507054, -94.20558351 | common, registered-businesses | Yes / Yes |
| Touchstone Village | other official place | 36.34851303, -94.21624058 | common | Yes / Yes |
| Copperstone | other official place | 36.35555703, -94.24309456 | common | Yes / Yes |
| Town Square Apartments | other official place | 36.36066300, -94.21208066 | common | Yes / Yes |
| Meadowglad | other official place | 36.35998729, -94.20463141 | common | Yes / Yes |
| Durham Place | other official place | 36.36315563, -94.20181220 | common | Yes / Yes |
| Garden Walk | other official place | 36.36208750, -94.20025230 | common | Yes / Yes |
| Village Flats | other official place | 36.36527427, -94.21119121 | common | Yes / Yes |
| Four Frogs | other official place | 36.36627159, -94.21202941 | common | Yes / Yes |
| Cadence | other official place | 36.36671343, -94.21133838 | common | Yes / Yes |
| The Briq on 4th | other official place | 36.36788744, -94.20992456 | common | Yes / Yes |
| Parkwood | other official place | 36.37080031, -94.20461316 | common | Yes / Yes |
| Mayadventures | other official place | 36.37009919, -94.20803225 | common | Yes / Yes |
| Meadowood | other official place | 36.37398423, -94.19811569 | common | Yes / Yes |
| The Brownstones | other official place | 36.37562384, -94.20711901 | common | Yes / Yes |
| Apple Glen | other official place | 36.38667141, -94.21901216 | common | Yes / Yes |
| ZeeJay | other official place | 36.38455485, -94.20927286 | common | Yes / Yes |
| Delmar | other official place | 36.35788270, -94.18455880 | common, registered-businesses | Yes / Yes |
| Moberly Manor | other official place | 36.35225398, -94.18176284 | common | Yes / Yes |
| The Links | other official place | 36.34945381, -94.18614442 | common | Yes / Yes |
| Bentonville Commons | other official place | 36.35091547, -94.20130482 | common | Yes / Yes |
| The Pointe | other official place | 36.33250117, -94.21704451 | common | Yes / Yes |
| I Street Modern Apartments | other official place | 36.33319307, -94.22341898 | common | Yes / Yes |
| Harbin Pointe | other official place | 36.33392569, -94.24818232 | common | Yes / Yes |
| Buckeye Crossing | other official place | 36.33383206, -94.24334305 | common | Yes / Yes |
| Flagstone Creek | other official place | 36.32252590, -94.26411124 | common | Yes / Yes |
| Parc at Bentonville | other official place | 36.31662194, -94.26581312 | common | Yes / Yes |
| The Aviator Apartments | other official place | 36.31374665, -94.30028456 | common | Yes / Yes |
| Glen at Polo Park | other official place | 36.31381379, -94.30750170 | common | Yes / Yes |
| Trailside Place | other official place | 36.39327122, -94.20863247 | common | Yes / Yes |
| Red Barn Apartment | other official place | 36.39054073, -94.21259351 | common | Yes / Yes |
| Waterside | other official place | 36.37378745, -94.18213206 | common | Yes / Yes |
| Brick Avenue Lofts | other official place | 36.37024084, -94.19850875 | common | Yes / Yes |
| Garland Square | other official place | 36.37196172, -94.19280587 | common | Yes / Yes |
| The Woods at the Park | other official place | 36.34036358, -94.19839649 | common | Yes / Yes |
| G @ MARKET | other official place | 36.36921405, -94.20026892 | common | Yes / Yes |
| NALAGOANY GLEN | other official place | 36.38336064, -94.21277016 | common | Yes / Yes |
| HARBIN NORTH TOWNHOMES | other official place | 36.33495005, -94.24273370 | common | Yes / Yes |
| THE RESERVE | other official place | 36.33827607, -94.25562619 | common | Yes / Yes |
| Lot B | other official place | 36.43251314, -94.23239608 | poi-165, poi-168 | Yes / Yes |
| Crystal Bridges Trail Access | museum | 36.37765108, -94.20646156 | poi-165, poi-168 | Yes / Yes |
| Crystal Bridges Trailhead | museum | 36.37893834, -94.19991007 | poi-165, poi-168 | Yes / Yes |
| Lot A | other official place | 36.43151799, -94.23207672 | poi-165, poi-168 | Yes / Yes |
| Bentonville Public Restrooms | other official place | 36.37824435, -94.20562162 | poi-165, poi-168 | Yes / Yes |
| NE 5th St Parking Lot | other official place | 36.37764184, -94.20628465 | poi-165, poi-168 | Yes / Yes |
| NW A St Parking Lot | other official place | 36.38301874, -94.20516731 | poi-165, poi-168 | Yes / Yes |
| NE "A" Street | other official place | 36.39261490, -94.20304402 | poi-165, poi-168 | Yes / Yes |
| Coler Preserve Parking | other official place | 36.39712380, -94.23873586 | poi-165, poi-168 | Yes / Yes |
| Lake Bella Vista (portable) | other official place | 36.43284578, -94.22923840 | poi-165, poi-168 | Yes / Yes |
| Tree Cut Bridge | other official place | 36.39561201, -94.23530610 | poi-168 | Yes / Yes |
| THE HUB | other official place | 36.39154605, -94.23619575 | poi-168 | Yes / Yes |
| Coler Trails Map | other official place | 36.39722805, -94.23841854 | poi-165, poi-168 | Yes / Yes |
| Oscar's Loop | other official place | 36.39734530, -94.23817456 | poi-168 | Yes / Yes |
| Coler Bridge | other official place | 36.39686596, -94.23875540 | poi-168 | Yes / Yes |
| Three Bears | other official place | 36.37607696, -94.20778757 | poi-168 | Yes / Yes |
| Oscars Loop | other official place | 36.39644506, -94.23529666 | poi-168 | Yes / Yes |
| Fire Line | other official place | 36.39640263, -94.23532143 | poi-168 | Yes / Yes |
| Drop The Hammer Jump | other official place | 36.39552859, -94.23611625 | poi-168 | Yes / Yes |
| Cease and Desist Jump | other official place | 36.39522903, -94.23577378 | poi-168 | Yes / Yes |
| Cease and Desist | other official place | 36.39174106, -94.23624071 | poi-168 | Yes / Yes |
| Oscar's Loop | other official place | 36.39165955, -94.23613370 | poi-168 | Yes / Yes |
| Fire Line | other official place | 36.39158620, -94.23610215 | poi-168 | Yes / Yes |
| Rock Solid | other official place | 36.39140954, -94.23624172 | poi-168 | Yes / Yes |
| Copperhead Road | other official place | 36.38866231, -94.23610260 | poi-168 | Yes / Yes |
| Feature | other official place | 36.38809414, -94.23489940 | poi-168 | Yes / Yes |
| Tree Bridge | other official place | 36.38800353, -94.23479744 | poi-168 | Yes / Yes |
| X-ING | other official place | 36.38699367, -94.23521088 | poi-168 | Yes / Yes |
| Feature | other official place | 36.38681316, -94.23545623 | poi-168 | Yes / Yes |
| SERVICE ROAD | other official place | 36.38589409, -94.23594370 | poi-168 | Yes / Yes |
| Copperhead Road | other official place | 36.38413399, -94.23599809 | poi-168 | Yes / Yes |
| Oscar's Loop | other official place | 36.38412029, -94.23580893 | poi-168 | Yes / Yes |
| Wooden Bridge | other official place | 36.38269853, -94.23523594 | poi-168 | Yes / Yes |
| Oscar's Loop | other official place | 36.38744547, -94.23802965 | poi-168 | Yes / Yes |
| Steel Bridge | other official place | 36.38674377, -94.23850859 | poi-168 | Yes / Yes |
| Downhill Only | other official place | 36.39643310, -94.23860908 | poi-168 | Yes / Yes |
| Slaughter pen | other official place | 36.37521781, -94.20731295 | poi-165, poi-168 | Yes / Yes |
| Municipal Bldg | civic facility | 36.34041547, -94.21614046 | civic-properties | Yes / Yes |
| Bentonville Fire Station 7 | civic facility | 36.31769706, -94.26519753 | address-destinations, billing-destinations, civic-properties, fire-stations, trakit-destinations | Yes / Yes |
| Utility Billing | civic facility | 36.35775533, -94.22252493 | civic-properties | Yes / Yes |
| Public Works | civic facility | 36.34612358, -94.21630671 | civic-properties | Yes / Yes |
| Waste Water Compost | public facility | 36.39672297, -94.20573306 | civic-properties | Yes / Yes |
| This is Your Public Library | landmark | 36.36771168, -94.20799427 | portal-public-art, public-art | Yes / Yes |
| Bubble | landmark | 36.37464250, -94.20806269 | portal-public-art, public-art | Yes / Yes |
| Green Bike Tower (North) | landmark | 36.42527774, -94.22428407 | portal-public-art, public-art | Yes / Yes |
| Aura Activity | landmark | 36.33511883, -94.19008956 | portal-public-art, public-art | Yes / Yes |
| ColorFULL | landmark | 36.38606805, -94.21047399 | portal-public-art, public-art | Yes / Yes |
| Goldfish | landmark | 36.37139391, -94.20769318 | portal-public-art, public-art | Yes / Yes |
| Basketball Court Murals | landmark | 36.37288606, -94.18682851 | portal-public-art, public-art | Yes / Yes |
| Lil’ Library in the Park | landmark | 36.35123025, -94.22125454 | portal-public-art, public-art | Yes / Yes |
| Box Turtle | landmark | 36.38767638, -94.20363877 | portal-public-art, public-art | Yes / Yes |
| Flight | landmark | 36.35083900, -94.22151676 | portal-public-art, public-art | Yes / Yes |
| Hello | landmark | 36.40783215, -94.21484772 | portal-public-art, public-art | Yes / Yes |
| Triumph | landmark | 36.33410389, -94.21744180 | portal-public-art, public-art | Yes / Yes |
| Keep it Clean | landmark | 36.37301697, -94.21159636 | portal-public-art, public-art | Yes / Yes |
| A Tribute to the Almost Forgotten Osage Prairie | landmark | 36.35222756, -94.22155459 | portal-public-art, public-art | Yes / Yes |
| Seeds of Bentonville | landmark | 36.36856624, -94.21016688 | portal-public-art, public-art | Yes / Yes |
| Art Feeds | landmark | 36.32995617, -94.22671354 | portal-public-art, public-art | Yes / Yes |
| Cozy Apple | landmark | 36.36791926, -94.20805186 | portal-public-art, public-art | Yes / Yes |
| Mull It Over | landmark | 36.36683904, -94.20085737 | portal-public-art, public-art | Yes / Yes |
| Found | landmark | 36.36734811, -94.20905880 | portal-public-art, public-art | Yes / Yes |
| Open Heart | landmark | 36.32129659, -94.23636602 | portal-public-art, public-art | Yes / Yes |
| Arvest Bike Pavillion | landmark | 36.37748220, -94.22148636 | portal-public-art, public-art | Yes / Yes |
| Orange Bike Tower (South) | landmark | 36.33488066, -94.19000217 | portal-public-art, public-art | Yes / Yes |
| Hole in the Wall | landmark | 36.39233214, -94.22135426 | portal-public-art, public-art | Yes / Yes |
| Red Bike Tower (East) | landmark | 36.36018439, -94.17507544 | portal-public-art, public-art | Yes / Yes |
| Double Slit Skyline | landmark | 36.38661664, -94.20988631 | portal-public-art, public-art | Yes / Yes |
| PAC-Man | landmark | 36.40784873, -94.21152227 | portal-public-art, public-art | Yes / Yes |
| Monarch and Dandelions | landmark | 36.37817269, -94.19504363 | portal-public-art, public-art | Yes / Yes |
| Surfing Frog | landmark | 36.38665263, -94.20976313 | portal-public-art, public-art | Yes / Yes |
| New Growth | landmark | 36.38665525, -94.20985315 | portal-public-art, public-art | Yes / Yes |
| Canoe, Canoe | landmark | 36.35181349, -94.22041590 | portal-public-art, public-art | Yes / Yes |
| Sunkissed | landmark | 36.40860039, -94.21465330 | portal-public-art, public-art | Yes / Yes |
| Sassy | landmark | 36.38938457, -94.20372494 | portal-public-art, public-art | Yes / Yes |
| Natural Skate | landmark | 36.37675924, -94.18714254 | portal-public-art, public-art | Yes / Yes |
| Blue Bike Tower (West) | landmark | 36.33042756, -94.22040165 | portal-public-art, public-art | Yes / Yes |
| The Physics of Being (Here) | landmark | 36.34088384, -94.23741087 | public-art | Yes / Yes |
| Untitled | landmark | 36.36574276, -94.19641867 | public-art | Yes / Yes |
| "Unititled" | landmark | 36.36396611, -94.19220816 | public-art | Yes / Yes |
| Alchemist Table | landmark | 36.36791341, -94.20835719 | public-art | Yes / Yes |
| Dirty Gloves | landmark | 36.36795660, -94.20835719 | public-art | Yes / Yes |
| Double Dutch | landmark | 36.36785617, -94.20835585 | public-art | Yes / Yes |
| Roark Bluff | landmark | 36.36880080, -94.21004347 | public-art | Yes / Yes |
| Ernest and Ruth | landmark | 36.37366001, -94.20804220 | public-art | Yes / Yes |
| All Bike(r)s Welcome | landmark | 36.37575947, -94.23725128 | public-art | Yes / Yes |
| Infinite Slow Skies | landmark | 36.37440833, -94.20802696 | public-art | Yes / Yes |
| Embroidered Quilt | landmark | 36.36782702, -94.20835988 | public-art | Yes / Yes |
| Walk Like an Egyptian | landmark | 36.36812723, -94.20819626 | public-art | Yes / Yes |
| Tegyu and Terrin | landmark | 36.36803004, -94.20835988 | public-art | Yes / Yes |
| Hawksbill Crag | landmark | 36.36882672, -94.21004229 | public-art | Yes / Yes |
| Bentonville Bat | landmark | 36.34106910, -94.20410052 | public-art | Yes / Yes |
| Fish of Bentonville | landmark | 36.36939518, -94.20305312 | public-art | Yes / Yes |
| Historic site · Patton House #2 | landmark | 36.36972113, -94.20855677 | historic-sites | Yes / Yes |
| Historic site · Patton House #1 | landmark | 36.36954404, -94.20808596 | historic-sites | Yes / Yes |
| Historic site · Burns House | landmark | 36.36953151, -94.20777685 | historic-sites | Yes / Yes |
| Historic site · James A Rice House | landmark | 36.36929656, -94.20737460 | historic-sites, national-register, national-register-points | Yes / Yes |
| Historic site · Conner House | landmark | 36.36966454, -94.20711348 | historic-sites | Yes / Yes |
| Historic site · McAndrews-Pace House | landmark | 36.36948700, -94.20681513 | historic-sites | Yes / Yes |
| Historic site · Barnett House | landmark | 36.36966653, -94.20684430 | historic-sites | Yes / Yes |
| Historic site · Simpson House | landmark | 36.36964769, -94.20656120 | historic-sites | Yes / Yes |
| Historic site · Elliot House | landmark | 36.36967853, -94.20604353 | historic-sites | Yes / Yes |
| Historic site · Berry House | landmark | 36.37233360, -94.21098409 | historic-sites | Yes / Yes |
| Historic site · George Jackson House | landmark | 36.37234377, -94.21117326 | historic-sites | Yes / Yes |
| Historic site · Leon McGill House (aka Davis House) | landmark | 36.37231800, -94.21149447 | historic-sites | Yes / Yes |
| Historic site · Craig Bryan House | landmark | 36.37198239, -94.21233054 | historic-sites, national-register, national-register-points | Yes / Yes |
| Historic site · Flannery House | landmark | 36.37233791, -94.21333058 | historic-sites | Yes / Yes |
| Historic site · Duke House | landmark | 36.37232397, -94.21398374 | historic-sites | Yes / Yes |
| Historic site · Linebarger House | landmark | 36.37204823, -94.21601375 | historic-sites, national-register, national-register-points | Yes / Yes |
| Historic site · David Peel House | landmark | 36.37234494, -94.21433530 | historic-sites | Yes / Yes |
| Historic site · McKinney House (aka Rex Peel House) | landmark | 36.37241062, -94.21478368 | historic-sites | Yes / Yes |
| Historic site · Scates House (aka Applegate House) | landmark | 36.37233083, -94.21529125 | historic-sites | Yes / Yes |
| Historic site · Dexter House | landmark | 36.37235199, -94.21571565 | historic-sites | Yes / Yes |
| Historic site · Jones-Lincoln House | landmark | 36.37235588, -94.21613962 | historic-sites | Yes / Yes |
| Historic site · Delong House | landmark | 36.37237404, -94.21668691 | historic-sites | Yes / Yes |
| Historic site · Judge Dickson House | landmark | 36.37246944, -94.21703079 | historic-sites | Yes / Yes |
| Heartland Whole Health Institute | other official place | 36.37930293, -94.20037680 | address-destinations, billing-destinations, registered-businesses, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF04 | other official place | 36.36584891, -94.18872468 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF07 | other official place | 36.36195707, -94.19016628 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF 08 | other official place | 36.36144620, -94.19151643 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CAMPUS OPS | other official place | 36.36947197, -94.18715959 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WM LAYOUT CTR | other official place | 36.36555560, -94.18675239 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| PARKING GARAGE | other official place | 36.37061004, -94.20995996 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| TRANSPORTATION DEPT | other official place | 36.39394312, -94.20764581 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF10 | other official place | 36.36197674, -94.19447265 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| MEDICAL SCHOOL | school | 36.38277544, -94.19825778 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| DAVE PEEL EVENT PAVILION | other official place | 36.37210887, -94.20715955 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CLUB HOUSE | other official place | 36.35424239, -94.18063671 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| ACT BUILDING | other official place | 36.36322914, -94.19331315 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF03 | other official place | 36.36429037, -94.19147682 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF06 | other official place | 36.36250893, -94.18874586 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| 8th & Plate | other official place | 36.36328661, -94.19132467 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF09 | other official place | 36.36153957, -94.19321190 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| Walton Family Whole Health & Fitness | other official place | 36.36664876, -94.19402547 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WM CHILDCARE | other official place | 36.36806663, -94.19356801 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF12 | other official place | 36.36488335, -94.18864751 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| PARKS & REC FAC. | other official place | 36.36999832, -94.21002265 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| COUNTY OFFICE | other official place | 36.35778554, -94.22594992 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| COUNTY RD DEPT OFFICE | other official place | 36.35834833, -94.22709405 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| COUNTY  EMS TRAINING | other official place | 36.35932262, -94.22617051 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| Walmart Home Office Welcome Center | other official place | 36.36431736, -94.19468555 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WM HOTEL | other official place | 36.36439605, -94.19619537 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF04 | other official place | 36.36563062, -94.19144535 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF02 | other official place | 36.36625520, -94.19008403 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CITY STREET DEPT | other official place | 36.39409412, -94.20694536 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| NORTH CUP | other official place | 36.36867798, -94.19166202 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| E CENTRAL PARKING GARAGE | other official place | 36.37202167, -94.20624428 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CLUB HOUSE | other official place | 36.33821961, -94.23216521 | address-destinations, trakit-destinations | Yes / Yes |
| COUNTY DETENTION CENTER | other official place | 36.35996001, -94.23047506 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CABOOSE | other official place | 36.36693613, -94.20928327 | address-destinations, trakit-destinations | Yes / Yes |
| CORONER BUILDING | other official place | 36.36026122, -94.22611220 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CLUB HOUSE | other official place | 36.34439211, -94.23859527 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| PARKING GARAGE | other official place | 36.38005484, -94.19810133 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| GREENHOUSE | other official place | 36.36579550, -94.19918221 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| RED BARN | other official place | 36.36233364, -94.20436291 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WEST SIDE STORM SHELTER | other official place | 36.36248326, -94.20379268 | address-destinations, trakit-destinations | Yes / Yes |
| EAST SIDE STORM SHELTER | other official place | 36.36243570, -94.20374725 | address-destinations, trakit-destinations | Yes / Yes |
| THE BARN | other official place | 36.38974946, -94.21006405 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| RESTROOM | other official place | 36.39221439, -94.23988506 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| MY PLACE HOTEL | other official place | 36.35436080, -94.17492965 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| GREEN HOUSE | other official place | 36.36241701, -94.20800319 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| BIKE RACE | other official place | 36.36502769, -94.19793607 | address-destinations, trakit-destinations | Yes / Yes |
| POLICE TRAINING FACILITY | civic facility | 36.31092828, -94.32055628 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| ANIMAL SERVICES | other official place | 36.33096977, -94.22061750 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WALMART BUILDING OF11 | other official place | 36.36348726, -94.19621784 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| RESTROOM | other official place | 36.34070260, -94.23757072 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| FOOD TRUCK LOT | other official place | 36.35634181, -94.22109465 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| LOCKER-TRAINING BUILDING | other official place | 36.31997151, -94.25847160 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CLUB HOUSE | other official place | 36.33361603, -94.21496728 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CLUBHOUSE | other official place | 36.37524880, -94.22091606 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| SAMS DESIGN CENTER | other official place | 36.34497004, -94.18711667 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| POOL-PAVILION | other official place | 36.30766172, -94.25382569 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CITY CEMETERY COLUMBARIUM | other official place | 36.36693500, -94.21709473 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| PAVILION POOL | other official place | 36.34891095, -94.24176251 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| POOL CLUBHOUSE | other official place | 36.33767368, -94.18783148 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| EAST BRIDGE | other official place | 36.36464022, -94.22231156 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CORE PAVILION | other official place | 36.36297015, -94.22944684 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WEST RESTROOM | other official place | 36.36233838, -94.23334619 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CONCESSIONS/RESTROOMS | other official place | 36.34057787, -94.20335013 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CRYSTAL B NORTH ACCESS | other official place | 36.38402999, -94.20389751 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CAMP GROUND | other official place | 36.40147835, -94.18498279 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| COMMUNITY POOL | other official place | 36.38352553, -94.21310718 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| WEST BRIDGE | other official place | 36.36404418, -94.22494334 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| EAST RESTROOM | other official place | 36.36512789, -94.22295455 | address-destinations, billing-destinations, trakit-destinations | Yes / Yes |
| CoolWag | other official place | 36.37445752, -94.17317308 | registered-businesses | Yes / Yes |
| Nellie's Jellies Cafe | other official place | 36.37423133, -94.17316469 | registered-businesses | Yes / Yes |
| Sheeps and Peeps | other official place | 36.37497740, -94.17322759 | registered-businesses | Yes / Yes |
| Crystal sPAWs | other official place | 36.37847518, -94.19382936 | registered-businesses | Yes / Yes |
| Little Darlings Resale Shop LLC | other official place | 36.34602593, -94.21471625 | registered-businesses | Yes / Yes |
| Crown NorthWest LLC | other official place | 36.34322780, -94.19991235 | registered-businesses | Yes / Yes |
| Johnson Controls | other official place | 36.33892833, -94.21586537 | registered-businesses | Yes / Yes |
| Bentonville Massage Center LLC | other official place | 36.38503110, -94.22061175 | registered-businesses | Yes / Yes |
| Home2 Bentonville | other official place | 36.35442124, -94.17588051 | registered-businesses | Yes / Yes |
| Walker's Tiny Talkers | other official place | 36.35162373, -94.21217025 | registered-businesses | Yes / Yes |
| Moab Ventures LLC | other official place | 36.34623661, -94.20554068 | registered-businesses | Yes / Yes |
| New Season Mortgage | other official place | 36.36687779, -94.19926368 | registered-businesses | Yes / Yes |
| NWA JLV LLC dba Goodcents | other official place | 36.34656848, -94.21161424 | registered-businesses | Yes / Yes |
| Odyssey Tattoo | other official place | 36.34850349, -94.21104088 | registered-businesses | Yes / Yes |
| Mary Hawkins IBCLC | other official place | 36.35354980, -94.19692778 | registered-businesses | Yes / Yes |
| Art and Wellness Enterprises, LLC | other official place | 36.38211712, -94.20337309 | registered-businesses | Yes / Yes |
| Morning Glory Bentonville, LLC | other official place | 36.36467278, -94.19995193 | registered-businesses | Yes / Yes |
| Best Friends Animal Society | other official place | 36.36317474, -94.22711208 | registered-businesses | Yes / Yes |
| Art Bridges | other official place | 36.37930293, -94.20037680 | registered-businesses | Yes / Yes |
| Shelley Parson Insurance Agency LLC | other official place | 36.34973761, -94.19683058 | registered-businesses | Yes / Yes |
| Wags to Riches Pet Grooming | other official place | 36.34309319, -94.19840759 | registered-businesses | Yes / Yes |
| Rubright Imprints | other official place | 36.34850349, -94.21104088 | registered-businesses | Yes / Yes |
| Water for Good | other official place | 36.36838536, -94.20923251 | registered-businesses | Yes / Yes |
| TGC Bentonville LLC | other official place | 36.35436080, -94.17492965 | registered-businesses | Yes / Yes |
| Triad Eye Institute PLLC | other official place | 36.42066329, -94.22404863 | registered-businesses | Yes / Yes |
| Hit 'Em Straight Indoor Golf | other official place | 36.34801290, -94.19775720 | registered-businesses | Yes / Yes |
| PMI Imagine NWA | other official place | 36.34668530, -94.21445183 | registered-businesses | Yes / Yes |
| A Little Wicked | other official place | 36.36940575, -94.20464776 | registered-businesses | Yes / Yes |
| Vineyard Counseling LLC | other official place | 36.34400058, -94.20124454 | registered-businesses | Yes / Yes |
| The Dive Bar Bentonville | other official place | 36.37278476, -94.21002886 | registered-businesses | Yes / Yes |
| Archie's Sandwichery | other official place | 36.37524880, -94.22091606 | registered-businesses | Yes / Yes |
| yummy house | other official place | 36.35610975, -94.20235838 | registered-businesses | Yes / Yes |
| Nilfisk, Inc | other official place | 36.33106048, -94.25935950 | registered-businesses | Yes / Yes |
| Amanda Trageser | other official place | 36.34932435, -94.21128132 | registered-businesses | Yes / Yes |
| Goldfinch Tattoo | other official place | 36.35864300, -94.18392033 | registered-businesses | Yes / Yes |
| Glide Xpress | other official place | 36.33603817, -94.20165385 | registered-businesses | Yes / Yes |
| Auric Aesthetics | other official place | 36.35802582, -94.24083600 | registered-businesses | Yes / Yes |
| Papa's Ozark Mountain BBQ unit 1 | other official place | 36.38483306, -94.22174329 | registered-businesses | Yes / Yes |
| Take 5 Properties SPV LLC | other official place | 36.37292769, -94.22190669 | registered-businesses | Yes / Yes |
| Generations Legal Group | other official place | 36.34302389, -94.19672835 | registered-businesses | Yes / Yes |
| Kou’Sins | other official place | 36.37509821, -94.22216024 | registered-businesses | Yes / Yes |
| Byrd & Massey CPA, Inc. | other official place | 36.34313214, -94.19797505 | registered-businesses | Yes / Yes |
| Sugar Creek Oral Surgery PLLC | other official place | 36.38497152, -94.22258120 | registered-businesses | Yes / Yes |
| Flourish Functional Wellness Center, PLLC | other official place | 36.34391414, -94.19945647 | registered-businesses | Yes / Yes |
| ALBRIGHT BANNON PROPERTIES LLC DBA DRYBAR BENTONVILLE | other official place | 36.36204273, -94.19620810 | registered-businesses | Yes / Yes |
| Concorde Food Group LLC | other official place | 36.36195979, -94.19621230 | registered-businesses | Yes / Yes |
| ICD Retail, LLC dba Clementine's Ice Cream | other official place | 36.36370824, -94.19453385 | registered-businesses | Yes / Yes |
| Potter’s House 98 | other official place | 36.33593954, -94.18966947 | registered-businesses | Yes / Yes |
| Bella Emilia Boutique | other official place | 36.36894517, -94.20873901 | registered-businesses | Yes / Yes |
| The Little Candle of NWA, LLC | other official place | 36.37036703, -94.22050045 | registered-businesses | Yes / Yes |
| All Things Kindred | other official place | 36.36465997, -94.20925692 | registered-businesses | Yes / Yes |
| Siam Luck LLC | other official place | 36.35602124, -94.19633488 | registered-businesses | Yes / Yes |
| Tiffany Price | other official place | 36.33760379, -94.20868377 | registered-businesses | Yes / Yes |
| Townie | other official place | 36.37080615, -94.20875611 | registered-businesses | Yes / Yes |
| 1st Choice Home Care Inc. | other official place | 36.37269371, -94.22283748 | registered-businesses | Yes / Yes |
| Cellini Nail Lounge | other official place | 36.36173807, -94.19625434 | registered-businesses | Yes / Yes |
| West Airport, Inc. | other official place | 36.33680994, -94.25520075 | registered-businesses | Yes / Yes |
| Airport, Inc. | other official place | 36.33527438, -94.22164564 | registered-businesses | Yes / Yes |
| South Walton, Inc. | other official place | 36.37137337, -94.22102448 | registered-businesses | Yes / Yes |
| Phyllis, Inc. | other official place | 36.35560360, -94.17988383 | registered-businesses | Yes / Yes |
| Peach Orchard, Inc. | other official place | 36.42099156, -94.22365950 | registered-businesses | Yes / Yes |
| FS8 | other official place | 36.36007403, -94.21650468 | registered-businesses | Yes / Yes |
| Smith Family Clinic | other official place | 36.35573177, -94.19395475 | registered-businesses | Yes / Yes |
| the quantum i | other official place | 36.37188298, -94.22069334 | registered-businesses | Yes / Yes |
| Arkansas Crisis Center | other official place | 36.36024882, -94.22123569 | registered-businesses | Yes / Yes |
| Premier Dermatology & Aesthetics | other official place | 36.36355625, -94.19013255 | registered-businesses | Yes / Yes |
| AVI Systems, Inc. dba FORTÉ | other official place | 36.34925844, -94.19893604 | registered-businesses | Yes / Yes |
| TNA Mobile Notary & Apostille Services | other official place | 36.35624612, -94.18655740 | registered-businesses | Yes / Yes |
| Anibal Tattoo Art LLC | other official place | 36.35686754, -94.23073863 | registered-businesses | Yes / Yes |
| CoB Test | other official place | 36.36878749, -94.21009010 | registered-businesses | Yes / Yes |
| Grounded NWA LLC | other official place | 36.33493041, -94.19473234 | registered-businesses | Yes / Yes |
| Finnegan's Wine Beer & Spirits | other official place | 36.38798707, -94.22169409 | registered-businesses | Yes / Yes |
| Life Loft NWA | other official place | 36.33589887, -94.19253886 | registered-businesses | Yes / Yes |
| CODE NINJAS | other official place | 36.33579968, -94.19122789 | registered-businesses | Yes / Yes |
| Stone Mill Cafe Bentonville | other official place | 36.34203364, -94.21041023 | registered-businesses | Yes / Yes |
| Toasted NWA Store 1 LLC | other official place | 36.36190112, -94.19622026 | registered-businesses | Yes / Yes |
| Airship Porch LLC | other official place | 36.36270333, -94.19412441 | registered-businesses | Yes / Yes |
| K2M Design, Inc. | other official place | 36.35211413, -94.21207744 | registered-businesses | Yes / Yes |
| Wright's HQ, LLC | other official place | 36.36375073, -94.19417169 | registered-businesses | Yes / Yes |
| Slab Masters U.S. LLC dba Helitech | other official place | 36.34130888, -94.22183163 | registered-businesses | Yes / Yes |
| Tuckers Corner LLC | other official place | 36.37207188, -94.20787653 | registered-businesses | Yes / Yes |
| Advantage Title & Escrow, LLC | other official place | 36.35439044, -94.21378975 | registered-businesses | Yes / Yes |
| Arrow Art, Inc. | other official place | 36.37213700, -94.20949479 | registered-businesses | Yes / Yes |
| Next Phase Enterprises | other official place | 36.36118719, -94.21971569 | registered-businesses | Yes / Yes |
| Caffeine Bar | other official place | 36.37188190, -94.22057758 | registered-businesses | Yes / Yes |
| UAMS | other official place | 36.36293245, -94.21632252 | registered-businesses | Yes / Yes |
| Chipotle Mexican Grill of Colorado, LLC. | other official place | 36.36412604, -94.19026771 | registered-businesses | Yes / Yes |
| Elevate Therapeutics | other official place | 36.37704743, -94.22082291 | registered-businesses | Yes / Yes |
| Ozark Orthopaedics, PA | other official place | 36.35165968, -94.18440603 | registered-businesses | Yes / Yes |
| Bloom & Bond Maternity | other official place | 36.37976178, -94.22268686 | registered-businesses | Yes / Yes |
| Shear Joy Salon and Wig Studio | other official place | 36.38442932, -94.22339537 | registered-businesses | Yes / Yes |
| Club Infiniti, LLC | other official place | 36.37157041, -94.20573747 | registered-businesses | Yes / Yes |
| Wholesale Electric Supply Company Inc | other official place | 36.35972681, -94.22060118 | registered-businesses | Yes / Yes |
| U-Haul Moving & Storage of Bentonville | other official place | 36.35636632, -94.24725098 | registered-businesses | Yes / Yes |
| Purely Natural CBD Bentonville | other official place | 36.35529370, -94.21268584 | registered-businesses | Yes / Yes |
| Anthropologie | other official place | 36.36408903, -94.18973325 | registered-businesses | Yes / Yes |
| Gengler Enterprises, Inc | other official place | 36.36283665, -94.21633823 | registered-businesses | Yes / Yes |
| Thrive MedSpa | other official place | 36.35826689, -94.24052707 | registered-businesses | Yes / Yes |
| Aaron McLellan Counseling Services PLLC | other official place | 36.35725619, -94.19821722 | registered-businesses | Yes / Yes |
| Engel & Völkers Bentonville | other official place | 36.37104734, -94.20873981 | registered-businesses | Yes / Yes |
| Phat Tire Bike Shop | other official place | 36.37211237, -94.20998802 | registered-businesses | Yes / Yes |
| Remedy Road | other official place | 36.37245155, -94.20941652 | registered-businesses | Yes / Yes |
| Chick'n Headz, LLC | other official place | 36.35618380, -94.21106033 | registered-businesses | Yes / Yes |
| CRIT Inc. dba Drooly's Dog Bakery | other official place | 36.37219254, -94.20946236 | registered-businesses | Yes / Yes |
| RegenmaxAR | other official place | 36.33803782, -94.21046966 | registered-businesses | Yes / Yes |
| Connor Park | other official place | 36.39084385, -94.21019730 | registered-businesses | Yes / Yes |
| The Ink Lounge Tattoo Studio | other official place | 36.38594760, -94.22277327 | registered-businesses | Yes / Yes |
| B-O-F CORPORATION | other official place | 36.36992544, -94.19152028 | registered-businesses | Yes / Yes |
| Clarissa Ogden Agency LLC | other official place | 36.33585009, -94.19224190 | registered-businesses | Yes / Yes |
| AMP Sign & Banner | other official place | 36.34924468, -94.19819130 | registered-businesses | Yes / Yes |
| Botanic Plant Co | other official place | 36.36726076, -94.19751132 | registered-businesses | Yes / Yes |
| Better Hearing and Balance Connection | other official place | 36.38100497, -94.22210589 | registered-businesses | Yes / Yes |
| Bloom Flowers & Gifts | other official place | 36.33751742, -94.22303192 | registered-businesses | Yes / Yes |
| Gerber Collision & Glass | other official place | 36.35718428, -94.24489449 | registered-businesses | Yes / Yes |
| Flight Therapy Services | other official place | 36.37376024, -94.22068964 | registered-businesses | Yes / Yes |
| Mostyn Prettyman, PLLC | other official place | 36.40409762, -94.21679497 | registered-businesses | Yes / Yes |
| Tactical Auto Outfitters, Inc DBA Fast Auto & Tire | other official place | 36.35807275, -94.24929779 | registered-businesses | Yes / Yes |
| Nielsen Architecture, LLC | other official place | 36.35223780, -94.21341289 | registered-businesses | Yes / Yes |
| Burn Boot Camp Bentonville | other official place | 36.33399918, -94.21064878 | registered-businesses | Yes / Yes |
| KajSiab Therapy, PLLC | other official place | 36.35725619, -94.19821722 | registered-businesses | Yes / Yes |
| Eyes on the Square | other official place | 36.37191754, -94.20872139 | registered-businesses | Yes / Yes |
| Bentonville Towing | other official place | 36.33583263, -94.21263184 | registered-businesses | Yes / Yes |
| The Capital Salon & Suites | other official place | 36.37412585, -94.21047453 | registered-businesses | Yes / Yes |
| Anytime Labor - Springfield LLC dba LaborMax Staffing | other official place | 36.35536331, -94.21351322 | registered-businesses | Yes / Yes |
| Huega LLC | other official place | 36.37828085, -94.19341731 | registered-businesses | Yes / Yes |
| Yarn Alchemy | other official place | 36.36477086, -94.20940306 | registered-businesses | Yes / Yes |
| Genesis Gymnastics Academy | other official place | 36.38646421, -94.21693219 | registered-businesses | Yes / Yes |
| Label | other official place | 36.37245020, -94.20966642 | registered-businesses | Yes / Yes |
| PALISADE PEST CONTROL, LLC | other official place | 36.33541209, -94.23193186 | registered-businesses | Yes / Yes |
| Benton County Heating and Cooling Inc | other official place | 36.37220043, -94.22509665 | registered-businesses | Yes / Yes |
| Brown Orthodontics | other official place | 36.38588945, -94.22162990 | registered-businesses | Yes / Yes |
| Oasis Hospitality Group | other official place | 36.36732941, -94.21013343 | registered-businesses | Yes / Yes |
| Lava Retail LLC | other official place | 36.37412585, -94.21047453 | registered-businesses | Yes / Yes |
| The Higher Calling Agency Inc | other official place | 36.33477736, -94.18936515 | registered-businesses | Yes / Yes |
| Padilla Innovation & Marketing Agency LLC dba Spin365 | other official place | 36.34668583, -94.20881190 | registered-businesses | Yes / Yes |
| Elevate Pediatric Therapy | other official place | 36.35163932, -94.21289158 | registered-businesses | Yes / Yes |
| Forever Fit Permformance Institute | other official place | 36.34555982, -94.19085392 | registered-businesses | Yes / Yes |
| Fairchild Inc. | other official place | 36.35972782, -94.22013080 | registered-businesses | Yes / Yes |
| LAKA, LLC dba The Children's Hour | other official place | 36.34453553, -94.21388094 | registered-businesses | Yes / Yes |
| Superfine Sweets Shoppe | other official place | 36.37094012, -94.20873334 | registered-businesses | Yes / Yes |
| Gates Prosthetics & Mobility Clinic Co | other official place | 36.36496860, -94.22130913 | registered-businesses | Yes / Yes |
| Epting Funeral Home | other official place | 36.38051951, -94.22168850 | registered-businesses | Yes / Yes |
| Ozark Mountain Bagel Co | other official place | 36.33473150, -94.20823226 | registered-businesses | Yes / Yes |
| Imagine Commercial Solutions | other official place | 36.34684124, -94.21458493 | registered-businesses | Yes / Yes |
| Beautiful Lives Thrift Boutique Bentonville | other official place | 36.35770375, -94.20889640 | registered-businesses | Yes / Yes |
| Airship Coler | other official place | 36.38708723, -94.23787478 | registered-businesses | Yes / Yes |
| Airship Pumphouse | other official place | 36.38072641, -94.20954951 | registered-businesses | Yes / Yes |
| The Ferguson Companies, LLC dba Heroes Coffee | other official place | 36.36448175, -94.20998541 | registered-businesses | Yes / Yes |
| The Bluebird Group | other official place | 36.36300269, -94.21562095 | registered-businesses | Yes / Yes |
| Big Brothers Pawn | other official place | 36.37267698, -94.22104788 | registered-businesses | Yes / Yes |
| Susan Templeton | other official place | 36.34904242, -94.19670289 | registered-businesses | Yes / Yes |
| Stonebridge Coffee Co | other official place | 36.35455669, -94.19751200 | registered-businesses | Yes / Yes |
| Apex Marketing and Sales, LLC. | other official place | 36.37164933, -94.18272423 | registered-businesses | Yes / Yes |
| ETS Performance | other official place | 36.34920787, -94.19765703 | registered-businesses | Yes / Yes |
| Bentonville Brewing | other official place | 36.35675471, -94.22114726 | registered-businesses | Yes / Yes |
| BRR Architecture, Inc. | other official place | 36.36740666, -94.20120535 | registered-businesses | Yes / Yes |
| Block Street Records | other official place | 36.37325083, -94.20939985 | registered-businesses | Yes / Yes |
| Yoga Story | other official place | 36.37315481, -94.20964230 | registered-businesses | Yes / Yes |
| The Jackson House/Image Matters, Inc. | other official place | 36.36876714, -94.20868307 | registered-businesses | Yes / Yes |
| D.A. Davidson & Co. | other official place | 36.38498984, -94.17196168 | registered-businesses | Yes / Yes |
| Driving Academy of NW Arkansas, LLC | other official place | 36.33589927, -94.19270699 | registered-businesses | Yes / Yes |
| In Season | other official place | 36.37622629, -94.20906433 | registered-businesses | Yes / Yes |
| Cribb Insurance Group Inc | other official place | 36.33538649, -94.22987698 | registered-businesses | Yes / Yes |
| Peel Museum Store | other official place | 36.36914905, -94.22237706 | registered-businesses | Yes / Yes |
| Boss Hawg Off-Road Accessories | other official place | 36.35916615, -94.22128186 | registered-businesses | Yes / Yes |
| Wild Beaver Print Co LLC | other official place | 36.36171125, -94.21805928 | registered-businesses | Yes / Yes |
| Mertins Eye & Optical | other official place | 36.36950020, -94.20926792 | registered-businesses | Yes / Yes |
| Healing Paths, PLLC | other official place | 36.33760379, -94.20868377 | registered-businesses | Yes / Yes |
| Wellness Works, LLC Massage Therapy | other official place | 36.35727128, -94.20790822 | registered-businesses | Yes / Yes |
| Milan Laser | other official place | 36.33407148, -94.21043463 | registered-businesses | Yes / Yes |
| Cabin 3 Restaurant Group, Inc. | other official place | 36.37323126, -94.20900397 | registered-businesses | Yes / Yes |
| Stephanie Nunley | other official place | 36.35836941, -94.21666192 | registered-businesses | Yes / Yes |
| Arkansas Volleyhogs, Inc | other official place | 36.35993048, -94.18034793 | registered-businesses | Yes / Yes |
| W*E Interactive Ventures JV, LLC | other official place | 36.33079906, -94.26108885 | registered-businesses | Yes / Yes |
| Kirpa Indian Cuisine | other official place | 36.35603415, -94.19652683 | registered-businesses | Yes / Yes |
| Leafy Eats | other official place | 36.33383907, -94.19132982 | registered-businesses | Yes / Yes |
| Applied Research Associates, Inc. | other official place | 36.36283665, -94.21633823 | registered-businesses | Yes / Yes |
| Marvin's Building Maintenance, Inc. | other official place | 36.34345795, -94.20842539 | registered-businesses | Yes / Yes |
| Menasha Packaging | other official place | 36.37357541, -94.22089973 | registered-businesses | Yes / Yes |
| Children's Therapy Services Inc. | other official place | 36.34194362, -94.19216967 | registered-businesses | Yes / Yes |
| SunYin, Inc | other official place | 36.33347508, -94.20067137 | registered-businesses | Yes / Yes |
| Product Connections | other official place | 36.37000076, -94.19019613 | registered-businesses | Yes / Yes |
| Sidney Graham | other official place | 36.34360170, -94.19971300 | registered-businesses | Yes / Yes |
| Holden Psychiatric Institute, PA DBA Holden Institute | other official place | 36.34354340, -94.20111414 | registered-businesses | Yes / Yes |
| DUDE Products, LLC | other official place | 36.32604854, -94.26038274 | registered-businesses | Yes / Yes |
| The Gallery LLC | other official place | 36.37165266, -94.20906593 | registered-businesses | Yes / Yes |
| Jerry Derek Ford | other official place | 36.37718018, -94.22082283 | registered-businesses | Yes / Yes |
| DAYS INN & SUITES | other official place | 36.33652647, -94.18448923 | registered-businesses | Yes / Yes |
| ECO LODGE INN & SUITES | other official place | 36.33408348, -94.18549784 | registered-businesses | Yes / Yes |
| MDRN RITUALS, LLC | other official place | 36.36911353, -94.20912656 | registered-businesses | Yes / Yes |
| Treetop Counseling LLC | other official place | 36.38498844, -94.17196164 | registered-businesses | Yes / Yes |
| Eternal Warrior BJJ | other official place | 36.38496830, -94.22059943 | registered-businesses | Yes / Yes |
| Thomas E Gheen | other official place | 36.36586057, -94.20833986 | registered-businesses | Yes / Yes |
| Mac's Wine & Spirits | other official place | 36.33661906, -94.25202204 | registered-businesses | Yes / Yes |
| Burckart Construction Inc | other official place | 36.34941842, -94.22263146 | registered-businesses | Yes / Yes |
| Advanced Physical Therapy | other official place | 36.38691958, -94.22046195 | registered-businesses | Yes / Yes |
| BR410 | other official place | 36.36512311, -94.20007641 | registered-businesses | Yes / Yes |
| Lady Slipper | other official place | 36.37184297, -94.21000527 | registered-businesses | Yes / Yes |
| Louise Cafe | other official place | 36.35064455, -94.22095268 | registered-businesses | Yes / Yes |
| Straightline Automotive | other official place | 36.36708864, -94.18382498 | registered-businesses | Yes / Yes |
| The Record | other official place | 36.37183622, -94.21063828 | downtown-public-poi, registered-businesses | Yes / Yes |
| Ropeswing Group | other official place | 36.37321616, -94.20916941 | registered-businesses | Yes / Yes |
| Blue Moon Bentonville | other official place | 36.37246492, -94.20932682 | registered-businesses | Yes / Yes |
| Ledger Operations Community, LLC | other official place | 36.36993038, -94.20934707 | registered-businesses | Yes / Yes |
| BR323 | other official place | 36.37470623, -94.20639869 | registered-businesses | Yes / Yes |
| Jeffrey Scott O'Brien | other official place | 36.37741212, -94.22081289 | registered-businesses | Yes / Yes |
| jbpizzallc | other official place | 36.33491305, -94.20260510 | registered-businesses | Yes / Yes |
| Four Points by Sheraton-Bentonville | other official place | 36.33644008, -94.20804219 | registered-businesses | Yes / Yes |
| Healthcare Inspired | other official place | 36.38498984, -94.17196168 | registered-businesses | Yes / Yes |
| The Buttered Biscuit Moberly | other official place | 36.35564799, -94.18284805 | registered-businesses | Yes / Yes |
| The Buttered Biscuit I Street | other official place | 36.33508651, -94.22445050 | registered-businesses | Yes / Yes |
| one eyed jacks | other official place | 36.34200766, -94.18530053 | registered-businesses | Yes / Yes |
| Jaime Holthaus | other official place | 36.34661839, -94.20742619 | registered-businesses | Yes / Yes |
| Doubletree Bentonville-Rogers | other official place | 36.33622244, -94.20596175 | registered-businesses | Yes / Yes |
| Women's Specialty Group, PLLC | other official place | 36.34071286, -94.19067597 | registered-businesses | Yes / Yes |
| Juniper Hill Home | other official place | 36.34500127, -94.21140530 | registered-businesses | Yes / Yes |
| Square Foot Management | other official place | 36.33446494, -94.19573414 | registered-businesses | Yes / Yes |
| Scott Fitzgerald | other official place | 36.41968846, -94.22131217 | registered-businesses | Yes / Yes |
| Kathy Xiong | other official place | 36.34794191, -94.21126873 | registered-businesses | Yes / Yes |
| Nortons Construction Group | other official place | 36.34555328, -94.19284226 | registered-businesses | Yes / Yes |
| Frequency & Flow, LLC | other official place | 36.36720904, -94.21653361 | registered-businesses | Yes / Yes |
| Cornerstone Caregiving East LLC | other official place | 36.35253344, -94.21388909 | registered-businesses | Yes / Yes |
| Gas Express LLC | other official place | 36.36992304, -94.24809644 | registered-businesses | Yes / Yes |
| Shelley Hodnett | other official place | 36.34358890, -94.19988252 | registered-businesses | Yes / Yes |
| ARKANSAS COMPOUNDING, LLC | other official place | 36.37135843, -94.18509785 | registered-businesses | Yes / Yes |
| Nunnally Chevrolet | other official place | 36.34361534, -94.18511890 | registered-businesses | Yes / Yes |
| Alleviant Integrated Mental Health | other official place | 36.36514273, -94.22129678 | registered-businesses | Yes / Yes |
| Sushi House | other official place | 36.35697648, -94.18294092 | registered-businesses | Yes / Yes |
| 1st National Bank | other official place | 36.33500571, -94.20602975 | registered-businesses | Yes / Yes |
| Yokozuna Benton, LLC | other official place | 36.36410849, -94.19066121 | registered-businesses | Yes / Yes |
| Atlas Infastructure Group LLC | other official place | 36.36701067, -94.20049061 | registered-businesses | Yes / Yes |
| JHCC Holdings LLC DBA Gerber Collision & Glass | other official place | 36.38395130, -94.22194778 | registered-businesses | Yes / Yes |
| RMP LLP | other official place | 36.36358903, -94.21016213 | registered-businesses | Yes / Yes |
| Tavola Trattoria LLC | other official place | 36.37170544, -94.20821525 | registered-businesses | Yes / Yes |
| Table on 6th LLC | other official place | 36.36652859, -94.20468473 | registered-businesses | Yes / Yes |
| Table Mesa Bistro LLC | other official place | 36.37218482, -94.20851437 | registered-businesses | Yes / Yes |
| Table at the Hickory Inn LLC | other official place | 36.39030641, -94.22066507 | registered-businesses | Yes / Yes |
| Royal Academics LLC | other official place | 36.33400214, -94.21011211 | registered-businesses | Yes / Yes |
| The Cellar on B St. | other official place | 36.36786498, -94.21135829 | registered-businesses | Yes / Yes |
| Two Friends Bookstore Cafe | other official place | 36.36570887, -94.20009100 | registered-businesses | Yes / Yes |
| Trinity Bentonville Hotel LLC | other official place | 36.35903509, -94.17874189 | registered-businesses | Yes / Yes |
| SGS North America | other official place | 36.35800427, -94.23764677 | registered-businesses | Yes / Yes |
| Pain Treatment Centers of America, PLLC | other official place | 36.34060773, -94.19567828 | registered-businesses | Yes / Yes |
| Airship Coffee | other official place | 36.36733657, -94.19839004 | registered-businesses | Yes / Yes |
| FJELL FOUNDATION LLC | other official place | 36.36949701, -94.20946183 | registered-businesses | Yes / Yes |
| Copperstone Apartments, Phase II | other official place | 36.35649790, -94.24329028 | registered-businesses | Yes / Yes |
| Bike Rack Brewing Co Inc. | other official place | 36.36487042, -94.19965475 | registered-businesses | Yes / Yes |
| The Links at Rainbow Curve Golf & Country Club | other official place | 36.33813513, -94.23220991 | registered-businesses | Yes / Yes |
| The Links at Bentonville Golf & Country Club | other official place | 36.34891147, -94.18458646 | registered-businesses | Yes / Yes |
| Moberly Manor, Phase II | other official place | 36.35403266, -94.18063934 | registered-businesses | Yes / Yes |
| Moberly Place Apartments | other official place | 36.35433363, -94.18057867 | registered-businesses | Yes / Yes |
| ZipHealthy PLLC | other official place | 36.36993038, -94.20934707 | registered-businesses | Yes / Yes |
| Simmons Bank | other official place | 36.35519394, -94.21109290 | registered-businesses | Yes / Yes |
| Rafael Gonzalez BMC General Construction | other official place | 36.34776483, -94.19911606 | registered-businesses | Yes / Yes |
| Enhancing Homes, Inc | other official place | 36.38691958, -94.22046195 | registered-businesses | Yes / Yes |
| Bentonville Massage & Wellness | other official place | 36.38688914, -94.22061782 | registered-businesses | Yes / Yes |
| Apple Tree Academy LLC | other official place | 36.34354606, -94.20157153 | registered-businesses | Yes / Yes |
| Shadow Enrichment LLC | other official place | 36.35822202, -94.24191919 | registered-businesses | Yes / Yes |
| The Total Gentleman | other official place | 36.33488089, -94.20489498 | registered-businesses | Yes / Yes |
| On Shelf Marketing Group, LLC | other official place | 36.33347508, -94.20067137 | registered-businesses | Yes / Yes |
| MRC OF BENTONVILLE | other official place | 36.34323757, -94.20011804 | registered-businesses | Yes / Yes |
| Whitney Roofing & Guttering LLC | other official place | 36.35670757, -94.23070918 | registered-businesses | Yes / Yes |
| Nielsen Architecture | other official place | 36.33337179, -94.20068995 | registered-businesses | Yes / Yes |
| Larissa Watson | other official place | 36.35993048, -94.18034793 | registered-businesses | Yes / Yes |
| Yes Enterprises dba Yes Sales | other official place | 36.38639556, -94.22176706 | registered-businesses | Yes / Yes |
| Edward Jones | other official place | 36.36240812, -94.21885893 | registered-businesses | Yes / Yes |
| THE SIPLAB LLC | other official place | 36.33581216, -94.19172138 | registered-businesses | Yes / Yes |
| Amber Carsten, MC, LPC - Carsten Counseling Services PLLC | other official place | 36.35725619, -94.19821722 | registered-businesses | Yes / Yes |
| IntegriTech | other official place | 36.34553068, -94.19376489 | registered-businesses | Yes / Yes |
| Ewing Irrigation Products | other official place | 36.35778631, -94.17970410 | registered-businesses | Yes / Yes |
| Formed Bodywork | other official place | 36.36238338, -94.22050027 | registered-businesses | Yes / Yes |
| The Ironing Board | other official place | 36.38498984, -94.17196168 | registered-businesses | Yes / Yes |
| Flooring Liquidators | other official place | 36.35610172, -94.19593145 | registered-businesses | Yes / Yes |
| Smooth Vapes Inc | other official place | 36.35517653, -94.21259082 | registered-businesses | Yes / Yes |
| Branches Missional Marketing LLC | other official place | 36.36441421, -94.21123888 | registered-businesses | Yes / Yes |
| GoodLeap, LLC | other official place | 36.36950339, -94.20910963 | registered-businesses | Yes / Yes |
| Whataburger 1330 | other official place | 36.35602046, -94.21294982 | registered-businesses | Yes / Yes |
| Pedal Kids USA | other official place | 36.41968846, -94.22131217 | registered-businesses | Yes / Yes |
| EXIT Taylor Real Estate | other official place | 36.38419278, -94.17455058 | registered-businesses | Yes / Yes |
| MEZZALUNA PASTERIA | other official place | 36.37412585, -94.21047453 | registered-businesses | Yes / Yes |
| LearningRx NWA-North | other official place | 36.34577253, -94.19923399 | registered-businesses | Yes / Yes |
| KELLY AND KELLY FIRM | other official place | 36.36283665, -94.21633823 | registered-businesses | Yes / Yes |
| NWA Retails LLC | other official place | 36.33513821, -94.22425176 | registered-businesses | Yes / Yes |
| Oum Med Spa | other official place | 36.35629265, -94.21095449 | registered-businesses | Yes / Yes |
| The Dent Technicians | other official place | 36.34979304, -94.19820616 | registered-businesses | Yes / Yes |
| First Place Graphics llc | other official place | 36.37179097, -94.26302568 | registered-businesses | Yes / Yes |
| Lot 9 Billiards | other official place | 36.35445167, -94.17409667 | registered-businesses | Yes / Yes |
| Tristar Coffee & Crepes LLC | other official place | 36.33599961, -94.19476529 | registered-businesses | Yes / Yes |
| Hudson Hawk Barber & Shop | other official place | 36.36905803, -94.21044603 | registered-businesses | Yes / Yes |
| THE CLOROX SALES COMPANY | other official place | 36.34182727, -94.18743809 | registered-businesses | Yes / Yes |
| Harold Kim Jones ChFC | other official place | 36.35768048, -94.22506028 | registered-businesses | Yes / Yes |
| Royal Oak Enterprises | other official place | 36.34823872, -94.20842437 | registered-businesses | Yes / Yes |
| Starbucks Coffee #87279 | other official place | 36.36360904, -94.19018009 | registered-businesses | Yes / Yes |
| The Plaza | other official place | 36.37247887, -94.20988137 | registered-businesses | Yes / Yes |
| Bank OZK | other official place | 36.35657957, -94.21418046 | registered-businesses | Yes / Yes |
| Instant Vitality LLC | other official place | 36.36031010, -94.21544428 | registered-businesses | Yes / Yes |
| Millennium Brokers Group | other official place | 36.38498984, -94.17196168 | registered-businesses | Yes / Yes |
| Big Box Karaoke Bentonville | other official place | 36.36752596, -94.20349237 | registered-businesses | Yes / Yes |
| Miller Zell | other official place | 36.33126180, -94.26116921 | registered-businesses | Yes / Yes |
| Spectrum Brands | other official place | 36.34006547, -94.20884020 | registered-businesses | Yes / Yes |
| New American Funding, LLC | other official place | 36.36993038, -94.20934707 | registered-businesses | Yes / Yes |
| 37 North Expeditions LLC | other official place | 36.42170012, -94.22156740 | registered-businesses | Yes / Yes |
| Hill Counseling LLC | other official place | 36.34387403, -94.19910165 | registered-businesses | Yes / Yes |
| O2B Early Education Holding, Inc. | other official place | 36.33528902, -94.22889631 | registered-businesses | Yes / Yes |
| Skyline Merch | other official place | 36.34820363, -94.20184308 | registered-businesses | Yes / Yes |
| Glen S Fleming | other official place | 36.35898565, -94.21697198 | registered-businesses | Yes / Yes |
| Martinez Agency, LLC | other official place | 36.38662037, -94.18059608 | registered-businesses | Yes / Yes |
| The Preacher's Son | other official place | 36.37320087, -94.21049430 | registered-businesses | Yes / Yes |
| HDR ENGINEERING INC | other official place | 36.36993038, -94.20934707 | registered-businesses | Yes / Yes |
| Aura Global | other official place | 36.37216521, -94.20936846 | registered-businesses | Yes / Yes |
| Natural State Counseling Centers | other official place | 36.33588729, -94.19203624 | registered-businesses | Yes / Yes |
| Calcon Inc | other official place | 36.36955616, -94.25880689 | registered-businesses | Yes / Yes |
| The Momentary | other official place | 36.36655995, -94.20275336 | registered-businesses | Yes / Yes |
| Walter P. Moore | other official place | 36.36278519, -94.21563079 | registered-businesses | Yes / Yes |
| Creative Car Audio Inc DBA Creative Audio | other official place | 36.33490138, -94.19439590 | registered-businesses | Yes / Yes |
| Rachel's Worth | other official place | 36.36311289, -94.21562098 | registered-businesses | Yes / Yes |
| Braum's Ice Cream & Dairy Store | other official place | 36.33566687, -94.18656293 | registered-businesses | Yes / Yes |
| Lan D Head Spa LLC | other official place | 36.35726836, -94.20986876 | registered-businesses | Yes / Yes |
| BeetThyme | other official place | 36.34241174, -94.20964808 | registered-businesses | Yes / Yes |
| LABEL | other official place | 36.36950339, -94.20910963 | registered-businesses | Yes / Yes |
| WAL-MART REAL ESTATE BUSINESS TRUST | other official place | 36.36849355, -94.22469754 | registered-businesses | Yes / Yes |
| Prude Legacy Law Group, PLLC | other official place | 36.37019902, -94.24951068 | registered-businesses | Yes / Yes |
| Arkansas Security LLC | other official place | 36.34334485, -94.20129608 | registered-businesses | Yes / Yes |
| OPTIMAL PAIN AND WELLNESS | other official place | 36.34079161, -94.19043112 | registered-businesses | Yes / Yes |
| Pet Provision Inc (dba Whole Pet) | other official place | 36.33385916, -94.19250111 | registered-businesses | Yes / Yes |
| Onyx At The Preserve | other official place | 36.35936576, -94.19464208 | registered-businesses | Yes / Yes |
| HAUS OF BEAUTY | other official place | 36.33584987, -94.19215889 | registered-businesses | Yes / Yes |
| The People Place Counseling Center | other official place | 36.33768460, -94.21048089 | registered-businesses | Yes / Yes |
| EDcetera | other official place | 36.34646833, -94.21290195 | registered-businesses | Yes / Yes |
| Restroom Janitorial Crew | other official place | 36.41923277, -94.22174297 | registered-businesses | Yes / Yes |
| Sakar International | other official place | 36.36022102, -94.18244313 | registered-businesses | Yes / Yes |
| Ark Beauty Ink Salon | other official place | 36.37290979, -94.22104367 | registered-businesses | Yes / Yes |
| Headstrong Psychiatry | other official place | 36.34397174, -94.19901007 | registered-businesses | Yes / Yes |
| Triton Ventures LLC | other official place | 36.38662037, -94.18059608 | registered-businesses | Yes / Yes |
| Triton Foundation | other official place | 36.38662037, -94.18059608 | registered-businesses | Yes / Yes |
| Bentonville Garage Doors | other official place | 36.35688240, -94.23091384 | registered-businesses | Yes / Yes |
| Brew Culture, LLC | other official place | 36.37143337, -94.22198535 | registered-businesses | Yes / Yes |
| Brew Culture, LLC dba/ 7 Brew | other official place | 36.33575469, -94.20514037 | registered-businesses | Yes / Yes |
| Salads & Savory | other official place | 36.35858090, -94.21612685 | registered-businesses | Yes / Yes |
| Empower Learning Hub, LLC | other official place | 36.34306544, -94.20039058 | registered-businesses | Yes / Yes |
| Weekender Management, Inc. | other official place | 36.36602125, -94.20742194 | registered-businesses | Yes / Yes |
| AR Baptist Children & Family Ministries (DBA Living Well Counseling) | other official place | 36.37056705, -94.20913946 | registered-businesses | Yes / Yes |
| Sam's West, Inc. | other official place | 36.35182151, -94.17136059 | registered-businesses | Yes / Yes |
| Academic Advantage | other official place | 36.34306544, -94.20039058 | registered-businesses | Yes / Yes |
| The Hare Co. | other official place | 36.36853705, -94.20295265 | registered-businesses | Yes / Yes |
| Hoffmaster | other official place | 36.34492217, -94.19131912 | registered-businesses | Yes / Yes |
| Natural Construction LLC | other official place | 36.36677733, -94.21127228 | registered-businesses | Yes / Yes |
| Flor Interiano | other official place | 36.34314114, -94.20176039 | registered-businesses | Yes / Yes |
| Legacy Bank | other official place | 36.37282359, -94.20949730 | registered-businesses | Yes / Yes |
| Legacy Bank | other official place | 36.34248586, -94.21151030 | registered-businesses | Yes / Yes |
| Moonfolk | other official place | 36.36138592, -94.21082008 | registered-businesses | Yes / Yes |
| Learning and Behavior Solutions LLC | other official place | 36.33559953, -94.23343899 | registered-businesses | Yes / Yes |
| Halff Associates, Inc. | other official place | 36.34583294, -94.19822969 | registered-businesses | Yes / Yes |
| Northwest Arkansas Winwater Co. | other official place | 36.34455885, -94.21695059 | registered-businesses | Yes / Yes |
| Trail Chiropractic | other official place | 36.34666097, -94.20750389 | registered-businesses | Yes / Yes |
| RML BENTONVILLE FORD LLC DBA MCLARTY DANIEL FORD | other official place | 36.34541969, -94.20929081 | registered-businesses | Yes / Yes |
| CA Fortune Sales & Marketing, LLC | other official place | 36.37211237, -94.20998802 | registered-businesses | Yes / Yes |
| Central Bank | other official place | 36.33975746, -94.19685138 | registered-businesses | Yes / Yes |
| B&G Foods, Inc. | other official place | 36.38645315, -94.17066925 | registered-businesses | Yes / Yes |
| Origin Wellness Studio LLC | other official place | 36.34327656, -94.19906703 | registered-businesses | Yes / Yes |
| Paperback Porch, LLC | other official place | 36.35826689, -94.24052707 | registered-businesses | Yes / Yes |
| Rader Homes | other official place | 36.38637586, -94.21971716 | registered-businesses | Yes / Yes |
| Osage Veterinary Clinic | other official place | 36.33560101, -94.24379180 | registered-businesses | Yes / Yes |
| Plaza Surgery Center | other official place | 36.33448197, -94.20249102 | registered-businesses | Yes / Yes |
| Bentonville FW, LLC | other official place | 36.33477957, -94.20434402 | registered-businesses | Yes / Yes |
| Tribune Capital (The Ridges at Bentonville) | other official place | 36.31412917, -94.30183010 | registered-businesses | Yes / Yes |
| Neurodivergent Workforce Institute | other official place | 36.33760379, -94.20868377 | registered-businesses | Yes / Yes |
| Bentonville Veterinary Specialists | other official place | 36.34342975, -94.19378612 | registered-businesses | Yes / Yes |
| Dirks Heavy Contractors | other official place | 36.36477086, -94.20940306 | registered-businesses | Yes / Yes |
| Club Car Wash Operating LLC | other official place | 36.33502821, -94.20709120 | registered-businesses | Yes / Yes |
| Amazing childcare 2 | other official place | 36.34354606, -94.20157153 | registered-businesses | Yes / Yes |
| Single Parent Scholarship Fund of NWA | other official place | 36.34412107, -94.21397878 | registered-businesses | Yes / Yes |
| Ewing Capital LLC | other official place | 36.33604055, -94.19808095 | registered-businesses | Yes / Yes |
| Casey's 3076 | other official place | 36.34226187, -94.19652452 | registered-businesses | Yes / Yes |
| Casey's 3406 | other official place | 36.38406488, -94.17365385 | registered-businesses | Yes / Yes |
| Traverse Group, Inc. | other official place | 36.34820914, -94.20622723 | registered-businesses | Yes / Yes |
| NWA CREAMERY LLC | other official place | 36.35982563, -94.21628011 | registered-businesses | Yes / Yes |
| NIOKASKA INVESTMENTS LLC | other official place | 36.35903369, -94.21689434 | registered-businesses | Yes / Yes |
| Barbershop | other official place | 36.35992410, -94.21636759 | registered-businesses | Yes / Yes |
| Birdie and Brews Store 2 LLC | other official place | 36.35677379, -94.22124664 | registered-businesses | Yes / Yes |
| Andy's Frozen Custard Stores, LLC | other official place | 36.33609680, -94.22351595 | registered-businesses | Yes / Yes |
| Andy's Frozen Custard Stores, LLC | other official place | 36.35834087, -94.25662197 | registered-businesses | Yes / Yes |
| Kind Orthodontics | other official place | 36.34343423, -94.21268004 | registered-businesses | Yes / Yes |
| BVSP LLC, Pizza Supply Store | other official place | 36.35825702, -94.24031039 | registered-businesses | Yes / Yes |
| Thre Clinic - Tyler Lloyd, MD | other official place | 36.37412585, -94.21047453 | registered-businesses | Yes / Yes |
| Casey's 4538 | other official place | 36.33688709, -94.25462416 | registered-businesses | Yes / Yes |
| McLarty Daniel Lincoln | other official place | 36.34398027, -94.21004530 | registered-businesses | Yes / Yes |
| Bay Cities Container Corporation | other official place | 36.33508041, -94.18764615 | registered-businesses | Yes / Yes |
| New Life Church | other official place | 36.38428313, -94.20826693 | registered-businesses | Yes / Yes |
| V2M LLC | other official place | 36.37214655, -94.20666177 | registered-businesses | Yes / Yes |
| J&B Supply, Inc. | other official place | 36.33870295, -94.21598095 | registered-businesses | Yes / Yes |
| Northwest Arkansas Psychotherapy | other official place | 36.34387403, -94.19910165 | registered-businesses | Yes / Yes |
| Collins Chiropractic & Diagnostics | other official place | 36.38128944, -94.22201599 | registered-businesses | Yes / Yes |
| Bright Path Play Therapy and Counseling PLLC | other official place | 36.34006946, -94.19783294 | registered-businesses | Yes / Yes |
| Ozark Health and Wellness, PLLC | other official place | 36.36993038, -94.20934707 | registered-businesses | Yes / Yes |
| Kati Wells CBT | other official place | 36.35010655, -94.18030719 | registered-businesses | Yes / Yes |
| Pups & Pints LLC | other official place | 36.36802398, -94.20333019 | registered-businesses | Yes / Yes |
| Historic site · Bentonville Confederate Monument | landmark | 36.36675630, -94.21675005 | national-register, national-register-points | Yes / Yes |
| Historic site · Col. Samuel W. Peel House | landmark | 36.36887756, -94.22249805 | national-register, national-register-points | Yes / Yes |
| Historic site · Maxwell-Hinman House | landmark | 36.37343751, -94.22190459 | national-register, national-register-points | Yes / Yes |
| Historic site · Rice-Miner House | landmark | 36.37789271, -94.21039078 | national-register, national-register-points | Yes / Yes |
| Historic site · Macon Harrison House | landmark | 36.37324315, -94.20579296 | national-register, national-register-points | Yes / Yes |
| Historic site · Bentonville Train Station | landmark | 36.36741059, -94.20930464 | national-register, national-register-points | Yes / Yes |
| Historic site · Elliott House | landmark | 36.36988525, -94.20596805 | national-register, national-register-points | Yes / Yes |
| Historic site · Col Young House | landmark | 36.36786547, -94.19759283 | national-register, national-register-points | Yes / Yes |
| Historic site · Terry Block Building | landmark | 36.37253433, -94.20910286 | national-register, national-register-points | Yes / Yes |
| Historic site · Benton County Jail | landmark | 36.37364498, -94.20862984 | national-register, national-register-points | Yes / Yes |
| Historic site · Benton County National Bank | landmark | 36.37209863, -94.20961948 | national-register, national-register-points | Yes / Yes |
| Historic site · Bentonville High School (Old High) | landmark | 36.37400089, -94.21285537 | national-register, national-register-points | Yes / Yes |
| Historic site · Bentonville Post Office | landmark | 36.37314220, -94.20785775 | national-register, national-register-points | Yes / Yes |
| Historic site · Bogart Hardware Building | landmark | 36.37214670, -94.20834269 | national-register, national-register-points | Yes / Yes |
| Historic site · Charles R. Craig Building (Lawco) | landmark | 36.37102289, -94.20853680 | national-register, national-register-points | Yes / Yes |
| Historic site · Massey Hotel | landmark | 36.37200882, -94.21004246 | national-register, national-register-points | Yes / Yes |
| Historic site · Henry House | landmark | 36.36940844, -94.20602568 | national-register | Yes / Yes |
| Historic site · Braithwaite House | landmark | 36.38875130, -94.21734092 | national-register, national-register-points | Yes / Yes |
| Historic site · Putman Cemetery | landmark | 36.33401938, -94.18685214 | national-register, national-register-points | Yes / Yes |
| Historic site · SE 3rd St Historic District | landmark | 36.36978096, -94.20699857 | national-register | Yes / Yes |
| Historic site · W Central Ave Historic District | landmark | 36.37214971, -94.21466351 | national-register | Yes / Yes |
| Upper Cut | landmark | 36.34049313, -94.23767135 | portal-public-art | Yes / Yes |
| The Ledger | other official place | 36.37008807, -94.20915405 | downtown-public-poi | Yes / Yes |
| First Baptist Church | other official place | 36.37099314, -94.21081641 | downtown-public-poi | Yes / Yes |
| First United Methodist Church | other official place | 36.37273133, -94.21085341 | downtown-public-poi | Yes / Yes |
| Walmart Neighborhood Market | other official place | 36.37365425, -94.20930405 | downtown-public-poi | Yes / Yes |
| Bentonville City Hall | civic facility | 36.36881031, -94.21007775 | downtown-public-poi | Yes / Yes |
| Skylight Cinema | other official place | 36.36840626, -94.21083944 | downtown-public-poi | Yes / Yes |
| Bentonville Community Church of the Nazarene | other official place | 36.37483658, -94.20968300 | downtown-public-poi | Yes / Yes |
| The Howard | other official place | 36.37198878, -94.20530136 | downtown-public-poi | Yes / Yes |
| Slaughter Pen MTB Access | other official place | 36.37687614, -94.20730150 | downtown-public-poi | Yes / Yes |
| Parking Lot located on SW A and SW 2nd St. | public facility | 36.37178935, -94.20982456 | public-parking | Yes / Yes |
| Parking Lot located on N Main St. | public facility | 36.37439562, -94.20857096 | public-parking | Yes / Yes |
| Parking Lot located on NE B St. | public facility | 36.37340217, -94.20655807 | public-parking | Yes / Yes |
| Benton County Building Parking Lot | public facility | 36.37277205, -94.20686063 | public-parking | Yes / Yes |
| Bentonville Public Library Parking Lot | public facility | 36.36744725, -94.20822601 | public-parking | Yes / Yes |
| Streetside Parking Lot 402 S Main St | public facility | 36.36813718, -94.20925410 | public-parking | Yes / Yes |

Historic-site names identify City-recorded landmarks, not guaranteed extant structures or open interiors. Public art titles, generic-but-official names such as Untitled, and distinct historic houses retain separate identities; generic words and nearby coordinates are insufficient to merge them.

## Official City parks-directory crosswalk

| Official City park | Published address | GIS binding / selected coordinate | Searchable / selectable | Route evidence |
|---|---|---|---|---|
| [A Street Promenade](https://www.bentonville.ar.gov/1936/A-Street-Promenade) | No unambiguous standalone address extracted | No unambiguous GIS coordinate binding | No — held without inventing a point | Not routed |
| [Austin-Baggett Park](https://www.bentonville.ar.gov/767/Austin-Baggett-Park) | 601 SE D Street | 36.36571210, -94.20363133 | Yes / Yes | Pass: #1, #8, #15, #22, #30, #37, #44, #51, #54, #58, #65, #80 |
| [Bark Park](https://www.bentonville.ar.gov/781/Bark-Park) | 2400 N. Walton Blvd. | 36.40195957, -94.21561889 | Yes / Yes | Pass: #83 |
| [Bella Vista Lake](https://www.bentonville.ar.gov/771/Bella-Vista-Lake) | No unambiguous standalone address extracted | 36.43238370, -94.23247128 | Yes / Yes | Blocked/unavailable: #84 |
| [Bentonville Bike Playground](https://www.bentonville.ar.gov/783/Bentonville-Bike-Playground) | 2400 N. Walton Blvd. | 36.40195957, -94.21561889 | Yes / Yes | Pass: #90 |
| [Bogle Park](https://www.bentonville.ar.gov/1479/Bogle-Park) | 270 NW F Street | 36.37504547, -94.21650186 | Yes / Yes | Pass: #43 |
| [Citizens Park](https://www.bentonville.ar.gov/1052/Citizens-Park) | 1101 SW Citizens Circle | 36.33072098, -94.22537042 | Yes / Yes | Pass: #87 |
| [City Square](https://www.bentonville.ar.gov/784/City-Square) | 1 East Central Avenue | 36.37261003, -94.20848030 | Yes / Yes | Pass: #48 |
| [Creekside Park](https://www.bentonville.ar.gov/1525/Creekside-Park) | 3104 SW Bright Road | 36.34070260, -94.23757072 | Yes / Yes | Pass: #89 |
| [Dave Peel Park](https://www.bentonville.ar.gov/768/Dave-Peel-Park) | 206 E Central Avenue | 36.37210887, -94.20715955 | Yes / Yes | Pass: #85 |
| [Durham Place Park](https://www.bentonville.ar.gov/769/Durham-Place-Park) | 902 Durham Place | 36.36302089, -94.20218924 | Yes / Yes | Pass: #55 |
| [Enfield Park](https://www.bentonville.ar.gov/770/Enfield-Park) | 1205 NE Waverly Way | 36.38687696, -94.20040325 | Yes / Yes | Pass: #32 |
| [Gilmore Park](https://www.bentonville.ar.gov/779/Gilmore-Park) | 501 SW D St. | 36.36673563, -94.21356397 | Yes / Yes | Pass: #52 |
| [Lake Bentonville](https://www.bentonville.ar.gov/772/Lake-Bentonville) | 2100 SW I St. | 36.35144037, -94.22113619 | Yes / Yes | Pass: #56 |
| [Memorial Park](https://www.bentonville.ar.gov/773/Memorial-Park) | 401 NE Martin Luther King Jr Parkway | 36.37405929, -94.18699732 | Yes / Yes | Pass: #7, #14, #21, #29, #36, #43, #50, #57, #71, #79, #82 |
| [Merchants Baseball Park](https://www.bentonville.ar.gov/765/Merchants-Baseball-Park) | 201 Elm Tree Road | 36.37431922, -94.24963022 | Yes / Yes | Pass: #86 |
| [Old Tiger Track](https://www.bentonville.ar.gov/780/Old-Tiger-Track) | 517 Tiger Boulevard | 36.38552054, -94.21606283 | Yes / Yes | Pass: #33 |
| [Orchards Park](https://www.bentonville.ar.gov/774/Orchards-Park) | 1100 NE John Deshields Boulevard | 36.37742187, -94.19555427 | Yes / Yes | Pass: #37 |
| [Park Springs Park](https://www.bentonville.ar.gov/775/Park-Springs-Park) | 300 NW 10th Street | 36.38446940, -94.21172263 | Yes / Yes | Pass: #34 |
| [Phillips Park](https://www.bentonville.ar.gov/766/Phillips-Park) | 3108 SE J Street | 36.34097549, -94.20454245 | Yes / Yes | Pass: #57 |
| [Slaughter Pen Mountain Bike Park](https://www.bentonville.ar.gov/782/Slaughter-Pen-Mountain-Bike-Park) | No unambiguous standalone address extracted | 36.40623302, -94.20717139 | Yes / Yes | Pass: #88 |
| [Town Branch Park](https://www.bentonville.ar.gov/776/Town-Branch-Park) | 401 SE 2nd Street | 36.37164339, -94.20441432 | Yes / Yes | Blocked/unavailable: #49 |
| [Train Station Park](https://www.bentonville.ar.gov/777/Train-Station-Park) | 400 S. Main Street | 36.36797251, -94.20897811 | Yes / Yes | Pass: #51 |
| [Wildwood Park](https://www.bentonville.ar.gov/778/Wildwood-Park) | 3800 Bright Road | 36.33442321, -94.23648878 | Yes / Yes | Pass: #58 |

23/24 City-directory names are bound (95.83%). A Street Promenade’s page describes the street setting but provides no numbered address or unique GIS destination/entrance. The automated process does not substitute a nearby park, guessed street midpoint, sign coordinate or external geocoder. Historical site names are context-labeled, commercial registrations stay other official places, and coincident school-campus labels retain aliases while resolving to one stronger campus pin.

## Address search audit

The required three addresses plus 15 additional official addresses were tested. Farthest-point sampling spans north, south, east, west, downtown and edge areas rather than selecting only easy downtown examples. All 18 exact, expanded-abbreviation and partial queries pass (**100%**). Wrong house/highway numbers stay rejected. These are official address-point identities, not promises of current occupancy, deliverability or public access. Supplemental City-hosted county/billing records may differ in age; canonical City points take precedence when an address identity overlaps.

| Official address | Selected lat, lon | Exact | Expanded abbreviations | Partial query → works | Actual routing evidence |
|---|---|---|---|---|---|
| 300 N MAIN ST | 36.37528272, -94.20875532 | Yes | Yes | 300 N MAIN → Yes | Pass: #59 |
| 500 S MAIN ST | 36.36665665, -94.20929889 | Yes | Yes | 500 S MAIN → Yes | Pass: #60 |
| 3809 SW MISTLETOE AVE | 36.32936553, -94.25579539 | Yes | Yes | 3809 SW MISTLETOE → Yes | Pass: #61 |
| 10310 W AR 264 HWY | 36.25952868, -94.25829115 | Yes | Yes | 10310 W AR 264 → Yes | Blocked/unavailable: #62 |
| 1801 NW LIGHTNING LN | 36.43638802, -94.23173649 | Yes | Yes | 1801 NW LIGHTNING → Yes | Blocked/unavailable: #63 |
| 7555 HUTCHENS RD | 36.30276637, -94.32416347 | Yes | Yes | 7555 HUTCHENS → Yes | Blocked/unavailable: #64 |
| 100 SW AUTUMN HILLS RD | 36.37186651, -94.26512799 | Yes | Yes | 100 SW AUTUMN HILLS → Yes | Pass: #65 |
| 314 NE ROYCE LOOP | 36.37353939, -94.15487817 | Yes | Yes | 314 NE ROYCE → Yes | Pass: #66 |
| 12713 HUBER RD | 36.34320635, -94.30967437 | Yes | Yes | 12713 HUBER → Yes | Blocked/unavailable: #67 |
| 3679 SE MOBERLY LN | 36.33380210, -94.18480824 | Yes | Yes | 3679 SE MOBERLY → Yes | Pass: #68 |
| 9250 RIVER OAKS DR | 36.40833734, -94.17437885 | Yes | Yes | 9250 RIVER OAKS → Yes | Blocked/unavailable: #69 |
| 9962 GASTON RD | 36.29401995, -94.24530758 | Yes | Yes | 9962 GASTON → Yes | Blocked/unavailable: #70 |
| 2198 APPLEGATE TRAIL | 36.39723112, -94.23839132 | Yes | Yes | 2198 APPLEGATE → Yes | Pass: #71 |
| 6407 SW MEADOW WELL AVE | 36.30802031, -94.28507984 | Yes | Yes | 6407 SW MEADOW WELL → Yes | Blocked/unavailable: #72 |
| 5299 SW H ST | 36.32153151, -94.21990477 | Yes | Yes | 5299 SW H → Yes | Blocked/unavailable: #73 |
| 2503 SW 18TH ST | 36.35351595, -94.23937990 | Yes | Yes | 2503 SW 18TH → Yes | Pass: #74 |
| 8125 W FORD SPRINGS RD | 36.41250905, -94.20724922 | Yes | Yes | 8125 W FORD SPRINGS → Yes | Blocked/unavailable: #75 |
| 1205 PHYLLIS ST | 36.35829942, -94.17948178 | Yes | Yes | 1205 PHYLLIS → Yes | Pass: #76 |

## Required regressions and negatives

| Query | Results | First official result |
|---|---|---|
| Creekside Middle School | 1 | Creekside Middle School |
| Creekside Middle | 1 | Creekside Middle School |
| Creekside MS | 1 | Creekside Middle School |
| creekside | 2 | Creekside Middle School |
| Osage Creek Elementary | 1 | Osage Creek Elementary |
| Crystal Bridges | 3 | Crystal Bridges |
| crystal bridge | 3 | Crystal Bridges |
| crstal bridges | 3 | Crystal Bridges |
| Bentonville Public Library | 3 | Library |
| bentonville library | 4 | Bentonville Public Library Parking Lot |
| public library | 3 | Library |
| Bentonville Community Center | 1 | Bentonville Community Center |
| community center | 1 | Bentonville Community Center |
| Bentonville Municipal Airport | 1 | Bentonville Municipal Airport · Thaden Field House |
| bentonville airport | 8 | Bentonville Municipal Airport · Thaden Field House |
| municipal airport | 1 | Bentonville Municipal Airport · Thaden Field House |
| Memorial Park | 8 | Memorial Park |
| Austin-Baggett Park | 1 | Austin-Baggett Park |
| Lawrence Plaza | 1 | Lawrence Plaza |
| 300 N Main St | 1 | 300 N MAIN ST |
| 500 S Main St | 1 | 500 S MAIN ST |
| 3809 SW Mistletoe Ave | 1 | 3809 SW MISTLETOE AVE |
| Creekside Park | 1 | Creekside Park |
| XNA | 0 | No supported match |
| Northwest Arkansas National Airport | 0 | No supported match |
| Rogers High School | 0 | No supported match |
| Fayetteville Public Library | 0 | No supported match |
| 2 BLOWING SPRINGS RD | 0 | No supported match |
| 999999 Main Street | 0 | No supported match |
| unicorn blargh zzq | 0 | No supported match |

No outside result is “replaced” by a guessed Bentonville point. A known outside address (`2 BLOWING SPRINGS RD`, the Cooper school address) is rejected, along with XNA, Rogers/Fayetteville destinations, a nonexistent house number and nonsense. Users still have to select an official suggestion; typing or blurring never silently commits fuzzy coordinates.

## Controlled live routing audit

**94 cases / 94 distinct coordinate pairs; 76 successful real comparisons; 18 blocked or unavailable.** Requests were sequential, at least five seconds apart, through the unchanged real comparison pipeline. Named schools/parks, civic/cultural places and 18 residential/edge addresses span the municipality. Each normalized distinct provider alternative was independently tested with the existing full-segment City Limits validation; raw count and geometric-deduplication count are recorded separately. Endpoint snaps are measured. No boundary, scoring, gap or recommendation thresholds were relaxed.

The original first pass is retained in routing/first-pass.json. Reconciliation reused unchanged coordinate pairs and re-requested changed official endpoints only; superseded cases retain .previous.json evidence. Additional cases cover every bound City-directory park plus issued-business and always-public parking destinations. A prior provider timeout remains reported instead of being retried until the count looks better.

10 successful cases retained valid alternatives while individually discarding unsupported ones. School/park tables distinguish tested success, tested blocked/unavailable trips, and merely valid but untested endpoints. A searchable in-city destination does not guarantee a wholly in-city provider route to every other destination.

| # | Start | Destination | Both searchable / selectable / inside | Provider raw / distinct | Valid alternatives | PathSafe result / exact cause |
|---|---|---|---|---|---|---|
| 1 | Austin-Baggett Park | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 2 | Lincoln Jr. High | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 3 | Sugar Creek Elementary | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 4 | Thomas Jefferson Elementary | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 5 | Apple Glen Elementary | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 6 | RE Baker Elementary | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 7 | Old High Middle School | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 8 | Washington Jr High | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 9 | Elm Tree Elementary | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 10 | Ardis Ann Middle School | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 11 | Thaden School | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 12 | Thaden School-East Campus | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 13 | Founders Classical Academy-Bentonville | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 2 / 2 | 2 | Real comparison |
| 14 | Mary Jones Elementary | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 15 | Bentonville Seventh-Day Adventist School | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 16 | Ruth Barker Middle School | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 17 | Bentonville High School | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 18 | Haas Hall Academy | Crystal Bridges | Yes / Yes / Yes | 1 / 1 | 1 | Real comparison |
| 19 | Creekside Middle School | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 20 | Osage Creek Elementary | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 2 / 2 | 0 | Internal municipal polygon hole; Internal municipal polygon hole |
| 21 | Bright Field Middle School | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 22 | Willowbrook Elementary | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 23 | Vaughn Elementary School | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 0 | Internal municipal polygon hole; Internal municipal polygon hole; Real outer city exit (may also cross holes) |
| 24 | Fulbright Junior High School | Library | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Internal municipal polygon hole |
| 25 | Central Park Elementary | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 26 | NE PARK ENTRANCE | Crystal Bridges | Yes / Yes / Yes | 2 / 2 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 27 | NW PARK ENTRANCE | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 28 | WISHING SPRING TRAIL | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 0 | Internal municipal polygon hole; Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 29 | TRAIL ENTRANCE | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 30 | TRAIL TOILET-M-MARKER #34 | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 31 | Dog Park | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 32 | Enfield Park | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 33 | Old Tiger Track | Crystal Bridges | Yes / Yes / Yes | 2 / 2 | 2 | Real comparison |
| 34 | Park Springs Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 35 | TRIAL ENTRANCE | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 36 | NW A Street Park | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 37 | Orchards Park | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 38 | Tennis Complex | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 39 | VOLLEY BALL PARK | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 40 | Soccer Complex | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 41 | ROUNDABOUT | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 42 | WEST SOCCER COMPLEX | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 43 | Bogle Park | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 44 | Lawrence Plaza | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 45 | Merchant's Park | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 46 | Melvin Ford Aquatic Center | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 47 | Melvin Ford Aquatic Center | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 48 | City Square | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 49 | Town Branch Park | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | — / — | — | Provider unavailable: TimeoutError: The operation was aborted due to timeout |
| 50 | CITY CEMETERY | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 51 | Train Station Park | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 52 | Gilmore Park | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 53 | FOUNTAIN | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 54 | Austin-Baggett Park | Crystal Bridges | Yes / Yes / Yes | 1 / 1 | 1 | Real comparison |
| 55 | Durham Place Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 56 | Lake Bentonville | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 2 / 2 | 2 | Real comparison |
| 57 | Phillips Park | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 58 | Wildwood Park | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 59 | 300 N MAIN ST | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 60 | 500 S MAIN ST | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 61 | 3809 SW MISTLETOE AVE | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 62 | 10310 W AR 264 HWY | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 63 | 1801 NW LIGHTNING LN | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 1 / 1 | 0 | Real outer city exit (may also cross holes) |
| 64 | 7555 HUTCHENS RD | Memorial Park | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 65 | 100 SW AUTUMN HILLS RD | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 66 | 314 NE ROYCE LOOP | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 1 | Real comparison |
| 67 | 12713 HUBER RD | Library | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 68 | 3679 SE MOBERLY LN | Crystal Bridges | Yes / Yes / Yes | 3 / 3 | 1 | Real comparison |
| 69 | 9250 RIVER OAKS DR | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 70 | 9962 GASTON RD | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 71 | 2198 APPLEGATE TRAIL | Memorial Park | Yes / Yes / Yes | 3 / 3 | 1 | Real comparison |
| 72 | 6407 SW MEADOW WELL AVE | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 73 | 5299 SW H ST | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 74 | 2503 SW 18TH ST | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 75 | 8125 W FORD SPRINGS RD | Crystal Bridges | Yes / Yes / Yes | — / — | — | Endpoint snapping exceeds existing 100m limit |
| 76 | 1205 PHYLLIS ST | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 77 | Lawrence Plaza | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 78 | Library | Bentonville Municipal Airport · Thaden Field House | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 79 | Crystal Bridges | Memorial Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 80 | Bentonville Community Center | Austin-Baggett Park | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 81 | Bentonville Municipal Airport · Thaden Field House | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 82 | Memorial Park | Library | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 83 | Bark Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 84 | Bella Vista Lake | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 0 | Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes) |
| 85 | Dave Peel Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 86 | Merchants Baseball Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 87 | Citizens Park | Bentonville Community Center | Yes / Yes / Yes | 1 / 1 | 1 | Real comparison |
| 88 | Slaughter Pen Mountain Bike Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 89 | Creekside Park | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 90 | Bentonville Bike Playground | Bentonville Community Center | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 91 | NW Medical Center | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 92 | Thaden School | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |
| 93 | The Trails at Bentonville | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 2 | Real comparison |
| 94 | Parking Lot located on SW A and SW 2nd St. | Lawrence Plaza | Yes / Yes / Yes | 3 / 3 | 3 | Real comparison |

### Remaining routing failures

- **#20 Osage Creek Elementary → Bentonville Municipal Airport · Thaden Field House:** Internal municipal polygon hole; Internal municipal polygon hole. No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#23 Vaughn Elementary School → Lawrence Plaza:** Internal municipal polygon hole; Internal municipal polygon hole; Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#24 Fulbright Junior High School → Library:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Internal municipal polygon hole. No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#25 Central Park Elementary → Crystal Bridges:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#26 NE PARK ENTRANCE → Crystal Bridges:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#27 NW PARK ENTRANCE → Bentonville Community Center:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#28 WISHING SPRING TRAIL → Bentonville Municipal Airport · Thaden Field House:** Internal municipal polygon hole; Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#49 Town Branch Park → Bentonville Municipal Airport · Thaden Field House:** Provider unavailable: TimeoutError: The operation was aborted due to timeout. Live route analysis is temporarily unavailable. Walking routing failed or timed out. Please try again.
- **#62 10310 W AR 264 HWY → Bentonville Community Center:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#63 1801 NW LIGHTNING LN → Bentonville Municipal Airport · Thaden Field House:** Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#64 7555 HUTCHENS RD → Memorial Park:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#67 12713 HUBER RD → Library:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#69 9250 RIVER OAKS DR → Bentonville Community Center:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#70 9962 GASTON RD → Bentonville Municipal Airport · Thaden Field House:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#72 6407 SW MEADOW WELL AVE → Austin-Baggett Park:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#73 5299 SW H ST → Lawrence Plaza:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.
- **#75 8125 W FORD SPRINGS RD → Crystal Bridges:** Endpoint snapping exceeds existing 100m limit. The walking provider could not connect a selected location to its walking network within 100 meters. Try a nearby public entrance. No route was substituted.
- **#84 Bella Vista Lake → Bentonville Community Center:** Real outer city exit (may also cross holes); Real outer city exit (may also cross holes); Real outer city exit (may also cross holes). No returned walking route stays within Bentonville City Limits. Your selected locations are valid, but the provider routes leave the supported area. Try another trip.

Boundary outcomes: 16 blocked cases (12 outer-exit-only, 1 municipal-hole-only, 3 mixed across candidates). Other provider failures are listed individually above. A snapping rejection occurs before normalized candidates are exposed, so its raw route count is intentionally unknown. A timeout is provider availability, not proof of a missing location or absent walking connection. No malformed-geometry failure was observed.

## Validation, screenshots and readiness

| Check | Result |
|---|---|
| npm run lint | PASS |
| npm run build | PASS; snapshot included in /api/locations server trace |
| npm test | PASS — 150/150 |
| npm run test:e2e | PASS — 44/44, laptop/tablet/desktop/mobile |
| npm run catalog:audit | PASS — every supported canonical destination, school, park and address sample |
| npm run catalog:routes -- --reconcile | 94 cases; 76 success, 18 policy/provider outcomes documented |
| npm run demo:prewarm -- http://[::1]:3000 | PASS — real showcase pipeline |
| Real browser walkthrough | PASS — desktop/mobile live showcase + school trip; no page errors, no overflow or WCAG violations |

Architecture tests cover complete pagination/IDs, all source types, WGS84/Web Mercator and invalid coordinates, polygon holes, cross-source/campus/acronym deduplication, role and numbered-site preservation, complete fixture categories, mixed-source fuzzy ranking, exact house/highway numbers, source failure isolation, snapshot/boundary revalidation and outside handling. Browser tests preserve explicit choice, keyboard/touch operation, stale-response protection, edit/clear invalidation, and partial-source warnings without caching incomplete results. The existing protected-file tests confirm scoring, coverage, GIS and recommendation invariants.

Real browser evidence: `data/location-catalog/browser-verification.json`. Screenshots:

- [landing 1440px](screenshots/location-catalog/landing-1440.png)
- [showcase 1440px](screenshots/location-catalog/showcase-1440.png)
- [school-search 1440px](screenshots/location-catalog/school-search-1440.png)
- [school-live 1440px](screenshots/location-catalog/school-live-1440.png)
- [landing 390px](screenshots/location-catalog/landing-390.png)
- [showcase 390px](screenshots/location-catalog/showcase-390.png)
- [school-search 390px](screenshots/location-catalog/school-search-390.png)
- [school-live 390px](screenshots/location-catalog/school-live-390.png)

The unchanged real showcase renders **About 5 seconds longer for over 21 percentage points more mapped pedestrian infrastructure coverage.** Its metrics remain live pipeline values: 74.64369816375708% / score 69 / 3 gaps; 96.38925952666217% / score 94 / 1 gap. Runtime values were not hard-coded, and landing preview values remain labeled mock/illustrative.

**GitHub/review: GO. Controlled local CAC recording: GO — prewarm and desktop/mobile live walkthrough passed. Public Vercel deployment: NO-GO.** Production requires the previously documented approved hosted/private Valhalla endpoint; none is configured here. Public capacity, managed inventory refresh/shared caching and long cold-refresh behavior are unverified. These do not justify weakening City Limits or substituting mock routes. The catalog must not be described as covering every City website name: A Street Promenade still lacks a verified GIS binding, and 18 audited trips remain policy/provider outcomes.

### Remaining catalog gaps and limits

- Current-brand gaps can remain behind generic City source labels: the campus follow-up reconciles three verified names; Sam Walton Hall / ACT BUILDING, Little Squiggles / the two WM CHILDCARE pins and branded office-building assignments remain held without sufficient identity evidence. All accepted coordinate-backed in-city canonical names pass search and selection. A Street Promenade remains a verified official park-directory name without an unambiguous GIS point/address binding; it is not fabricated. See the official directory crosswalk below.
- Creekside Park is now supported through the City’s official current name/address, City GIS address point and containing park parcel; its earlier generic GIS name is preserved as an alias.
- The older parking view lists a DAC lot at 219 SW A St as always public, but the newer City parking view omits it. Current availability cannot be corroborated; it is held pending City confirmation, without claiming that omission proves closure.
- City U, Park Central, Crystal Flats: official Common Names TYPE marks each Apartment Pre; excluded pending official evidence that the preliminary status is no longer applicable.
- PD: short official alias cannot be queried alone because the existing minimum is three characters; the same destination is searchable as Bentonville Police Dept. This is an input limitation, not a missing police destination.
- Blank/unnamed geometry, generic owner/unit/category annotations, temporary work sites, explicitly hidden/removed entries, demolished addresses and utility/restricted assets are not fabricated destinations. Every rejected source name/OID and reason is in completeness.json sources[].rejected.
- Outside-city official destinations are known to the audit but cannot be selected or routed. New/unpublished official layers and real-world places absent from all City datasets cannot be promised complete.
- Polygon facility anchors and official point pins are not verified public entrances. Provider snaps and strict municipal geometry can block trips even for valid selected locations.
- Keep the snapshot refreshed and warm for recording. Runtime caches are process/local-disk based, not a claim of a distributed production cache or guaranteed cold-refresh latency.

## Reproduction and maintenance

Run npm run catalog:parks to refresh the existing official park-directory crosswalk evidence (Python 3 extracts main-content headings/addresses; raw pages remain in ignored .cache, not the app bundle). npm run catalog:refresh enumerates registered inventories and atomically replaces the compressed snapshot only on complete source success. npm run catalog:audit exhaustively checks accepted names, schools, parks, addresses and regressions. The completed 94-case routing audit is retained without another mass routing run. node --import tsx scripts/audit-catalog-browser.ts http://localhost:3000 records the real UI walkthrough. python3 scripts/write-location-catalog-report.py regenerates this report. Source discovery is finished; this completion pass uses only the already-integrated registry. The optional development walkthrough initially encountered reloads during Axe scanning; production end-to-end checks passed independently, and the dev walkthrough was rerun after clearing generated dev cache.

Source caches last 24 hours. If normalization rules or descriptor fields change, invalidate the affected generated/cached source inventory before regenerating the snapshot; do not label an old normalized inventory newly fetched. The snapshot records each actual source retrieval time. Run the prewarm against the intended local PathSafe listener; this audit used IPv6 explicitly because another unrelated local process already occupied IPv4 port 3000. Nothing was deployed, committed or pushed.
