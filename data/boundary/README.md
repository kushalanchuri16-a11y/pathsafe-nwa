# Bentonville supported-area geometry

Source: https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer/5

Official layer name: **Bentonville City Limits**. Feature: OBJECTID **74**, LABEL **BENTONVILLE**. Retrieved **2026-10-23**, using `where=1=1`, `f=geojson`, `outFields=*`, `outSR=4326`. One MultiPolygon feature was returned without a transfer-limit flag. Full metadata is preserved in `metadata.json`; `bentonville.geojson` is the raw response and `bentonville.json` is an identical minified copy for application imports.

This is the explicit City Limits geometry, not the larger planning boundary or a bounding box. All outer rings, holes and disconnected polygons are preserved. Server-side point and full-line containment use this dated snapshot. Boundary updates/annexations require deliberate refresh and regression validation. Retrieval date is not a survey/update date; this is not a legal boundary opinion. City/Common_Names and street-address results may be outside the polygon and are filtered accordingly.
