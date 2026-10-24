# Official search verification records

Captured 2026-10-23 from the same two sources used at runtime:

- `official-places.json`: [City Common_Names layer 194](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/194), `STATUS = 'PERMANENT'`, fields OBJECTID/COMMON_NAME/ADDRESS, GeoJSON in EPSG:4326. 137 records. No Creekside Park record is present.
- `official-addresses.json`: [City address layer 2](https://gis.bentonvillear.com/arcgis/rest/services/Planning/Bentonville_Addresses23/MapServer/2), ADDRESS starts with `3809 `, `300 `, or `500 `, fields OBJECTID/ADDRESS, GeoJSON in EPSG:4326.
- `live-search-audit.json`: local `/api/locations` responses from the real provider and its ordinary 24-hour cache. These are verification evidence, never imported by runtime search or routing.

Official source coordinates remain authoritative. Tests use these records without network access and retain the production city-boundary filter. Named aliases reference existing layer-194 object IDs; no alias contains coordinates. Municipal airport refers to the verified Thaden Field House public visitor location, not a runway or XNA (see the earlier reliability audit).
- `mistletoe-live-comparison.json`: compact summary of an actual `/api/compare` response for the reported Mistletoe → Crystal Bridges trip after this search change. Geometry/inventory omitted to avoid duplicating megabytes of earlier audit evidence; the complete original provider geometry remains in `data/reliability/reported-routing.json`.
