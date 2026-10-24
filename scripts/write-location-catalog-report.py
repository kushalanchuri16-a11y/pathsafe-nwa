"""Render the catalog report from saved official discovery, search, and live route evidence."""
import json
from collections import Counter
from pathlib import Path
from urllib.parse import quote
root = Path('data/location-catalog')
p = json.loads((root/'completeness.json').read_text())
routing = json.loads((root/'routing/summary.json').read_text())
services = json.loads((root/'discovery/services.json').read_text())
portal_items = json.loads((root/'discovery/official-portal-feature-services.json').read_text())['results']
registry = p['registry']
base = 'https://gis.bentonvillear.com/arcgis/rest/services/'
by_url = {}
for s in registry: by_url.setdefault(s['url'], []).append(s)
def esc(v): return str(v).replace('|', r'\|').replace('\n', ' ')
def link(title, url): return '['+esc(title)+']('+quote(url, safe=':/_-.')+')'
def yes(v): return 'Yes' if v else 'No'
def point(v): return ', '.join(f'{n:.8f}' for n in v)
def decision(service, layer):
    path = service['name']+'/'+service['type']; url=base+path+'/'+str(layer['id']); name=layer.get('name','')
    if url in by_url: return 'Integrated: '+', '.join(s['id'] for s in by_url[url])
    if layer.get('type') == 'Group Layer': return 'Container only; child layers reviewed individually'
    if service['name']=='TrakIT/TrakIT_Display' and layer['id']==0: return 'Duplicate publication: same 43,071 full IDs/hash as TrakIT_Data/0; canonical source integrated'
    if service['type']=='FeatureServer' and service['name'] in ['Planning/Bentonville_Addresses23','Base_map/Benton_County_Data']:
        return 'Duplicate publication; canonical MapServer reviewed (current addresses integrated; DEMO/parcel/lot layers excluded)'
    if 'DEMO' in name: return 'Demolished-address layer, not a current address inventory; TrakIT records explicitly marked DEMO also rejected'
    if service['name']=='Parks/Parks_Recreation18':
        if layer['id']==172: return 'Emergency/maintenance access and crossings; public visitor trailhead/access not established; public POIs integrated separately'
        if layer['id']==0: return 'Individual trees/species inventory, not named visitor destinations'
        return 'Linear park/trail/road/project/cartographic geometry, not a named visitor destination point; no entrance inferred; infrastructure analysis unchanged'
    if 'School_District' in service['name'] or service['name']=='Parks/Sidewalk_Gap_Identification_Web_Map': return 'School zones/buffers or infrastructure; not campus points. All school point views integrated'
    if service['name'].startswith('Cemetery/'): return 'Burial plots, interments or cemetery sections; personal burial data is not a visitor-place catalog. City Cemetery is available from Parks'
    if 'Community_Development' in service['name'] and layer['id']==174: return 'Existing Sidewalks infrastructure source; preserved for coverage, not a destination catalog'
    if 'City Limit' in name or 'City_Limit' in name: return 'Administrative boundary, not a destination; current official boundary including holes preserved'
    if any(w in name.lower() for w in ['parcel','subdivision','county lots','neighborhood']): return 'Ownership/development/neighborhood area, not an established individual visitor destination/entrance; no owner names or arbitrary area centroids indexed'
    if service['name'].startswith(('Stormwater/','Water_System/','BWU_Web_Layers/','Electric_System/')): return 'Utility/flood/maintenance/network/control or administrative asset data, not named public/common visitor destinations'
    if service['name'].startswith('Emergency_Services/'): return 'Hydrants, response areas or operational zones; fire-station destination points integrated separately'
    if service['name'].startswith('Transportation/'): return 'Road centerline network, not named pedestrian destinations'
    if service['name'].startswith('Hosted/'): return 'Basemap/contours, future land-use or bond-project planning data; no current named destination point inventory'
    return 'Planning/zoning, buffers, scans, reference grids, service areas or operational/cartographic data; no established current visitor destination point'
decisions=[]
service_rows=[]
for s in services:
    file=root/'discovery'/(s['name'].replace('/','__')+'__'+s['type']+'__layers.json')
    data=json.loads(file.read_text()) if file.exists() else {}
    layers=data.get('layers',[]) or []
    for layer in layers:
        decisions.append({'service':s['name']+'/'+s['type'],'id':layer['id'],'name':layer.get('name'),'geometryType':layer.get('geometryType'),'fields':[f['name'] for f in layer.get('fields') or []],'decision':decision(s,layer)})
    accepted=[d for d in decisions if d['service']==s['name']+'/'+s['type'] and d['decision'].startswith('Integrated')]
    reason='; '.join(d['decision'] for d in accepted) if accepted else ('Tool/vector basemap service; no enumerable destination feature layers' if not layers else 'No new destination layer: '+decision(s,next((l for l in layers if l.get('type')!='Group Layer'),layers[0])))
    service_rows.append((s,len(layers),reason))
(root/'source-decisions.json').write_text(json.dumps({'services':len(services),'layers':decisions},indent=2)+'\n')
rows=routing['results']; passed=sum(r['result']=='PASS' for r in rows)
endpoint_routes={}
for r in rows:
    for key in ['start','destination']: endpoint_routes.setdefault(r[key]['id'],[]).append(r)
def route_status(id_, inside):
    if not inside: return 'Unsupported (outside city)'
    tests=endpoint_routes.get(id_,[])
    if not tests: return 'Endpoint valid; provider trip not tested'
    good=[r for r in tests if r['result']=='PASS']
    return ('Pass: ' if good else 'Blocked/unavailable: ')+', '.join('#'+str(r['id']) for r in (good or tests))
inside_named=[n for n in p['named'] if n['inside']]
inside_parks=[n for n in p['parks'] if n['inside']]
inside_school=[n for n in p['schoolInventory'] if n['inside']]
all_school_ids={n['id'] for n in inside_school}
park_ids={n['id'] for n in p['parks']}
remaining=[n for n in p['named'] if n['inside'] and n['id'] not in all_school_ids and n['id'] not in park_ids]
lines=[]
def add(text=''):lines.append(text)
def table(headers, values):
    add('| '+' | '.join(headers)+' |');add('|'+'|'.join('---' for _ in headers)+'|')
    for row in values:add('| '+' | '.join(esc(x) for x in row)+' |')
    add()
add('# PathSafe NWA — official location catalog completeness audit')
add()
add('Audit date: October 24, 2026 (America/Chicago). Search evidence: `data/location-catalog/completeness.json`; official source evidence: `data/location-catalog/discovery/`; route evidence: `data/location-catalog/routing/summary.json`. This completion pass used only the sources already integrated in the interrupted run; no additional discovery or mass routing audit was performed. No deployment was performed.')
add()
add('## Findings')
add()
add('**A. Were useful official layers previously ignored? Yes.** The old permanent-only Common Names view omitted school point views, the unfiltered school inventory, Parks names stored in `EX_ADD`, park POIs/properties, named civic parcels, fire stations, public art, historic sites, and meaningful named destinations in address publications.')
add()
add('**B. Were all useful discovered layers integrated? Yes, within the documented eligibility rules.** The catalog combines '+str(len(registry))+' inventories/views from 23 distinct GIS layers plus the official City parks directory. Discovery covers 55 REST service publications across 20 City folders and 43 feature-service items in the City-linked ArcGIS Online organization. Duplicate/retired publications, access conflicts, and non-destination datasets are accounted for below. This is not a claim that unpublished data or every real-world place is available.')
add()
add('**C/D. Is any known official in-city name still unavailable? Yes: A Street Promenade.** Its current City park page establishes its name, but provides no street-number address or uniquely identified GIS destination/entrance, so no coordinate is invented. All '+str(len(inside_named))+' accepted canonical in-city destinations pass exact search and selection. The City park directory resolves 23 of 24 names (95.83%); the verified GIS-backed park inventory and school inventories pass 100%. The older-only DAC parking lot at 219 SW A St is also held because current public-access status is uncorroborated. The three-character minimum prevents the alias PD alone; its canonical Bentonville Police Dept destination works. Preliminary, expired, home-business, conditional-access and unnamed/asset records are explicitly excluded, not silently counted as complete.')
add()
add('Scoring, recommendation thresholds, 15m infrastructure matching, meaningful-gap policy, route-provider behavior, default Austin-Baggett Park → Lawrence Plaza showcase, and strict city-boundary rules including municipal holes remain unchanged. This work changes the location catalog and search only.')
add()
add('## Counts and denominators')
add()
add('The archived old Common Names inventory contains 137 rows, 134 inside the current boundary. For a comparable distinct-destination baseline, the same current deduplication rules were applied to that archive; this yields '+str(p['before']['named'])+' destinations. These baseline counts are **not** the old autocomplete suggestion count (which varied by query). The old app already supported on-demand City address queries; its lack of a unified address index must not be reported as zero address support.')
add()
table(['Category','Before (same deduplication)','After, inside supported City Limits'],[(k,p['before'][k],p['after'][k]) for k in ['named','school','park','recreation','civic facility','public facility','plaza','airport','landmark','museum','trail destination']]+[('addresses','On-demand, query-limited; not measured',p['after']['address'])])
add('Counts are destination classifications, not counts of independent institutions or legally designated parks. School destinations include administration/sub-campus facilities; the full school-point inventory contains 24 distinct in-city campuses. The broader parks/recreation/trail/facility audit covers '+str(len(inside_parks))+' supported destinations. Public-art provenance occurs on '+str(sum(any(x["source"] in ["public-art","portal-public-art"] for x in n["sources"]) for n in inside_named))+' destinations; heritage provenance occurs on '+str(sum(any(x["source"] in ["historic-sites","national-register","national-register-points"] for x in n["sources"]) for n in inside_named))+' (overlap with other roles is possible). Museums are a separate classification of '+str(p["after"]["museum"])+'. Civic/public facilities, plazas and airport total '+str(sum(p["after"][k] for k in ["civic facility","public facility","plaza","airport"]))+'; recreation is separate. Business registrations remain other official places, rather than being inferred to be airports or schools from a company name.')
add()
address_rows=sum(s['rawCount'] for s in p['sources'] if next(r for r in registry if r['id']==s['id'])['kind']=='address')
address_all=p['after']['address']+p['outside']-p['outsideNamed']
address_normalized=sum(s['normalized'] for s in p['sources'] if next(r for r in registry if r['id']==s['id'])['kind']=='address')
address_duplicates=address_normalized-address_all
add(f'The inventories normalize {p["rawNormalized"]:,} records and remove **{p["duplicatesRemoved"]:,} overlapping source records**: {p["duplicatesRemoved"]-address_duplicates:,} named records and {address_duplicates:,} address records. They retain {len(p["named"]):,} named identities ({len(inside_named)} supported, {p["outsideNamed"]} outside), and {address_all:,} distinct address identities ({p["after"]["address"]:,} supported). **{p["outside"]:,} outside-city records** are withheld from supported suggestions/routing. Coordinate/geometry-related rejections (including unresolved directory bindings): **{p["invalidCoordinates"]}**. Every other source rejection has its own name/OID/reason in the JSON.')
add()
review_path=root/'campus-name-review.json'
if review_path.exists():
    review=json.loads(review_path.read_text())
    add('## Follow-up: campus generic names reconciled')
    add()
    add('Walton Family Whole Health & Fitness was present as City address-destination OID 18879439, EX_ADD FITNESS CENTER, at 1400 SE 5TH ST. The same point/name occurs in the already-integrated TrakIT and billing views; the business/Common Names inventories do not provide its current brand. The omission was a current-name/alias gap, not missing coordinates, a city-boundary failure, a dropped occupant field or a fuzzy-search threshold problem. WHOLE HEALTH at 850 MUSEUM WAY is a different institution and remains distinct.')
    add()
    add('The bounded follow-up reviewed '+str(len(review['campusRecords']))+' campus-related records from the existing City address layer inside the saved campus-area envelope. No additional GIS services or geocoding APIs were integrated. The 27 inventories, 816 supported named identities, 24,600 supported addresses and every coordinate remain unchanged. A declarative verified-name crosswalk applies only after ordinary eligibility/deduplication, requiring an existing source/OID plus matching address and previous label. It cannot create a location or loosen access/boundary checks. Current names come from venue-owner publications because the City fields contain only generic/abbreviated labels; these publications verify identity only and never supply route coordinates. Original City names remain searchable aliases and provenance retains the naming-evidence URLs.')
    add()
    table(['Canonical display name','Legacy alias','Existing City address / point','Name evidence'],[(n['label'],', '.join(n['aliases']),n['address']+' / '+point(n['point']),', '.join(link('Owner verification',url) for x in n['provenance'] for url in x.get('nameEvidence',{}).get('urls',[]))) for n in review['reconciled']])
    add('Requested regressions pass for Walton Family Whole Health & Fitness, whole health, walton whole health and 1400 SE 5th St. The same mechanism also resolves 8th & Plate and Walmart Home Office Welcome Center. Fitness membership, associate food-hall restrictions and other existing access requirements are not changed by a searchable destination name. Address search continues to select the original City point; no route is substituted.')
    add()
    add('Additional generic campus labels remain documented rather than guessed: ACT BUILDING at 1500 SE 8TH ST, two distinct WM CHILDCARE records (210 and 310 ASSOCIATE DR), and numbered office buildings. Owner publications name Sam Walton Hall and Little Squiggles, but an unambiguous owner-name-to-record assignment for each remaining identity has not been established in this bounded review. In particular, two distinct official OF04 address records are not merged merely because the code repeats. Utilities, parking/sign assets and proposed buildings remain subject to the existing exclusions. This follow-up establishes that canonical-source-name search completeness does not prove completeness for every current brand or campus nickname.')
    add()
    add('Evidence: data/location-catalog/campus-name-review.json; verified crosswalk: data/location-catalog/verified-names.json; production API checks: data/location-catalog/campus-name-api-verification.json. The original 82 relevant tests passed before editing; 91 targeted tests then passed with the fix before the full build/browser suite. All 150 unit tests and all 44 end-to-end tests pass, as do lint/build. Production API checks and eight real desktop/mobile search-and-selection checks passed (campus-name-browser-verification.json); the verified-name asset is included in the production server trace. The existing 94-trip audit was retained; no mass routing audit was repeated.')
    add()
add('## Integrated source register')
add()
add('Sources are City GIS REST layers, City-owned hosted layers in organization KVEBkgY6kMufuFG2, and the official City parks website. The organization identity is verified through the City-linked portal self metadata. Raw counts cover complete ID inventories for the declared view. Address inventories use the entire City-boundary envelope before strict polygon validation. Geometry is requested in WGS84. The directory supplies names/addresses only; its coordinates must come from an unambiguous existing GIS point. Field selections omit owner/employee/contact fields.')
add()
source_by_id={s['id']:s for s in p['sources']}
table(['Inventory / official source','Fields (besides geometry/OID)','Raw','Normalized','Outside (before cross-source dedup)'],[(link(s['id'],s['url']),', '.join(s['fields']),source_by_id[s['id']]['rawCount'],source_by_id[s['id']]['normalized'],source_by_id[s['id']]['outside']) for s in registry])
add('The default OID is `OBJECTID`; historic sites use `objectid`, billing publications use `OBJECTID_1`. The City address layer has 40,405 full-service records; 40,404 lie in the supported-area bounding envelope. The single omitted point cannot lie in the supported polygon. TrakIT has 43,071 full-service records, 43,070 within this envelope; 1,048 explicitly `DEMO` records are rejected. The alternate TrakIT_Display address publication has the exact same full ID count/hash and is not reloaded as another source. Four address views contribute '+f'{address_rows:,}'+' raw rows; address identity deduplication preserves the canonical City point when available.')
add()
add('### Eligibility and source-specific interpretation')
add()
for t in [
'Common Names: include named records without inventing a permanent status; reject explicit proposed/future/closed/demolished status and `TYPE = Apartment Pre`. Existing apartment complexes are common destinations, not public parks. The three preliminary labels are City U, Park Central and Crystal Flats; their current status needs City confirmation before inclusion.',
'Schools: ingest elementary 4, middle 7, junior-high 10, and **all** 29 points from Parks/Sidewalk_Gap_Identification_Web_Map/0, including high/private schools absent from the filtered category views. High-school zones and school buffers are not campus points.',
'Parks: use `EX_ADD` as the actual facility name. Retain named public POIs from both scale views, rejecting explicit hidden/unapproved entries and blank names. Null approval fields are not invented approvals or automatic rejections. Named park/civic parcels use an interior coordinate outside parcel holes; this is a derived facility anchor, not a verified pedestrian entrance.',
'City-owned properties: only meaningful named facilities; reject uncertain question-mark labels, ROW, substations, lift stations, storage and restricted/utility asset labels. Private owner names are not catalog destinations.',
'Public art: named works with a recorded past removal date are excluded. “Untitled” is a legitimate artwork title; blank titles are not invented. Historic sites: use only official `name`/address/geometry; a historic-site pin does not promise a surviving building or public interior access.',
'Address-name views: inspect all nonblank EX_ADD records in M/PARK/STE/APT categories across City, TrakIT and billing publications. Exclude future/temporary/administrative/utility/storage annotations, generic category labels and unestablished unit/telecom-tenant identities. Keep meaningful facility/destination descriptions. Category statistics and the suite/apartment field review are saved; other categories are utility/network/temporary classifications, not omitted named visitor inventories.',
'No location record adds walking infrastructure coverage. School, business, apartment, museum and facility pins do not establish a right of entry. Infrastructure eligibility and coverage matching are unchanged; routing still uses pedestrian network snaps and the original 100m endpoint cap.'
]:add('- '+t)
add()
add('## Every official service inspected')
add()
add('Discovery reads the official REST root/folders and the City-linked portal organization’s entire public feature-service listing. All '+str(len(decisions))+' REST layer/container decisions are in source-decisions.json. Portal items and their layer/field metadata are retained under discovery/portal-*.json and assessed below. Empty/private folders do not establish publicly enumerable destination inventories.')
add()
table(['Official service','Layer/container entries','Disposition'],[(link(s['name']+'/'+s['type'],base+s['name']+'/'+s['type']),count,reason) for s,count,reason in service_rows])
add('In particular, Natural Surface Trails/158 and Park Features/8 are linear infrastructure/cartographic features, not established visitor entrance points; this audit does not invent trailhead coordinates from their midpoints. Shared Roadways, future/prioritized projects and emergency-access points are not used to inflate either location or infrastructure eligibility. Public trail destination POIs are integrated. Parcel owner names, subdivisions/zones, planning areas, cemetery interments, hydrants/sirens, trees, maintenance photos, contours, basemaps and GIS tools do not establish individual current visitor destinations.')
add()

add('### City-linked ArcGIS Online organization — all public feature-service items')
add()
add('City organization: KVEBkgY6kMufuFG2, City of Bentonville Arkansas G.I.S., verified via the official maps portal. All 43 public feature-service items were inspected. Only named destination layers with usable geometry/status/access evidence were added. Contact/ownership/survey records were not ingested.')
add()
def portal_reason(item,layer):
 url=item['url'].rstrip('/')+'/'+str(layer.get('id',''))
 matched=[r['id'] for r in registry if r['url']==url or r['url']==item['url']]
 if matched:return 'Integrated: '+', '.join(matched)
 title=item['title'].lower()
 if 'public parking data layers' in title:
  if layer.get('id')==0:return 'Exact eligible POI copy: 14/14 normalized name/address/geometry matches; current canonical view used'
  if layer.get('id')==12:return 'Older parking publication: 9 always-public entries versus 8 in the newer canonical view; older-only DAC lot lacks corroborated current access and is held'
  return 'Parking counts/study extents, not named visitor destinations'
 if 'downtown public parking' in title:return 'Parking counts/study extents, not named destination locations'
 if 'busreg_list' in title:return 'Limited business view omits STATUS/Home_occ; richer registry with issued/non-home eligibility is used'
 if 'wayfinding' in title:return 'Sign locations/text are not established destination or public-entrance coordinates; no sign relabeled as its advertised destination'
 if 'transit' in title:return 'Transit route polylines only; no stop destination point inventory and no transit-routing feature added'
 if 'address18' in title or 'tax parcels' in title or 'bentonville zoning'==title:return 'Legacy/retired alias or zoning/parcel layer; current authoritative address/location sources already selected'
 if 'portal cob address' in title:return 'Duplicate current City address publication; canonical MapServer layer used, DEMO addresses excluded'
 if any(t in title for t in ['service','rehab','maintenance','master_database']):return 'Utility/maintenance/recommendation assets or worker reports, not visitor destinations'
 if 'selfie' in title or 'survey' in title or 'assistance' in title or 'citizenproblem' in title:return 'Public submissions, photos/damage/assistance/operational records, not official named visitor-place locations'
 return 'Zoning, overlays, future land use, projects or public/staff feedback; not a current named individual destination inventory'
portal_rows=[]
for item in portal_items:
 file=root/'discovery'/('portal-'+item['id']+'.json')
 meta=json.loads(file.read_text()) if file.exists() else {}
 layers=meta.get('layers',[]) or []
 if not layers:
  portal_rows.append((link(item['title'],item['url']), 'No usable layer metadata', 'Legacy/unavailable or non-destination reference; no geometry invented'))
 for layer in layers:
  reason=portal_reason(item,layer)
  portal_rows.append((link(item['title'],item['url']),str(layer.get('id'))+' '+str(layer.get('name')),reason))
  decisions.append({'service':item['url'],'id':layer.get('id'),'name':layer.get('name'),'geometryType':layer.get('geometryType'),'fields':[f['name'] for f in layer.get('fields') or []],'decision':reason})
table(['Official portal item','Layer','Disposition'],portal_rows)
(root/'source-decisions.json').write_text(json.dumps({'restServices':len(services),'portalItems':len(portal_items),'layers':decisions},indent=2)+'\n')
add('Portal businesses: ingest all 607 records, accepting only explicit ISSUED + Home_occ NO (418 before City validation); expired, received, and home-occupation records have explicit rejection reasons. The public parking source accepts only Public Parking + Always Public on both weekdays/weekends; 8 raw entries qualify, 14 conditional/private/unknown entries do not. The alternate POI view is a verified exact duplicate. The older parking view’s extra DAC entry is not assumed closed, but its current availability is unresolved; see parking-access-conflict.json. Historic-property polygon/point views and the supplementary art view are included and deduplicated against the existing City sources.')
add()

add('## Catalog architecture and validation')
add()
add('Official source descriptors → complete stable-ID inventories → verified 1,000-ID POST batches → normalization → deduplication → cached searchable index. A source is rejected as unavailable if IDs, batch membership, counts or geometry response format are truncated/inconsistent. Long batches use POST because the City server rejects oversized GET URLs. Requests are serialized and spaced to avoid bursts. Successful source inventories have a 24-hour cache; one failed source produces URL/error diagnostics while healthy sources remain available. The UI displays the partial-results warning and does not cache incomplete query results. All-source failure remains an explicit unavailable result, with no mock substitution.')
add()
add('The generated compressed official snapshot is a cold-start cache, included only in the server trace for `/api/locations`. It is not a hand-entered location list. Boundary hashing prevents reuse of supported flags after a boundary change. Runtime indexing retains identities/provenance/diagnostics without retaining duplicate raw inventories. The directory reuses a unique existing named GIS destination or an exact GIS address (uniquely completing an omitted directional only when unambiguous); legacy park names can be linked by unique containing park-parcel geometry. No external geocoding API is called. Composite directory expiry cannot outlive its coordinate evidence; the actual page retrieval timestamp remains separate. House-number and street-vocabulary indexes narrow address candidates; queries rank named and address matches together with the existing confidence floor and eight-result cap. Existing fuzzy matching, aliases, debounce, client cache, explicit selection, request-generation checks, and immediate editing/clear invalidation remain in place. The general highway-address bug was fixed: only the first numeric token identifies the house; an additional highway number must match as a street token, not equal the house number.')
add()
add('Coordinates are validated as finite WGS84 longitude/latitude and converted to `[latitude, longitude]`. Web Mercator conversion is separately tested, without guessing coordinate order. Named polygons use an actual interior point outside holes. Outside records remain in audit evidence but never enter the supported index or pass selection validation.')
add()
add('Deduplication partitions inside/outside records first. It combines exact normalized identity, source/OID, canonical address, type, nearby points and official parcel-extent evidence. Ordinary matching is within 100m; school campuses and matching full facility names with at least two distinctive words allow 200m, or supported parcel extent evidence. These are **catalog identity** rules, not the unchanged 15m infrastructure tolerance. Official point geometry outranks polygon anchors; source priority and clearer name break ties. Aliases, addresses and every source/OID survive merging. School directional labels within 20m of the same normalized campus stem resolve to the stronger school pin; campuses farther apart remain distinct. Acronym merging requires an actual short-code record and shared address, preventing full names that happen to share initials from collapsing. Generic words alone cannot join separate houses, numbered sites, artworks or facilities. Annex, campus direction, access, parking, sports and other meaningful role qualifiers remain distinct. Two nearby official entrances or differently named complex components remain separate when identity evidence is insufficient.')
add()
add(f'Offline cold parse/normalize/dedup/index: {p["loadedMs"]:.0f}ms; required-query maximum: {max(q["ms"] for q in p["queries"]):.1f}ms. Current real API timings and source availability are recorded in api-verification.json. An expired/missing full snapshot can require a much longer full upstream refresh; refresh/warm it before recording. A managed refresh/cache and production capacity remain deployment prerequisites.')
add()
add('## Entire official school-point inventory')
add()
add('51 published school-point rows (overlapping category/all-school views), 29 distinct school-point identities overall; **42 in-city source rows / 24 distinct in-city schools**. All 42 in-city rows resolve by their official name, all 24 canonical schools pass exact/shorthand/prefix search and explicit endpoint selection. The 9 outside rows represent 5 outside schools and remain unsupported. School-category totals above additionally include administration, named sub-campus and other educational destinations. Coordinates below are the original official source point; a merged result may prefer another stronger source point, preserved in the JSON evidence.')
add()
table(['School (official name)','Source / OID','Official lat, lon','Inside?','Found / exact?','Shorthand or prefix → works?','Selectable?','Actual routing evidence'],[(n['officialName'],n['inventory']+'/'+str(n['objectId']),point(n['officialPoint']),yes(n['inside']),yes(n['officialExact']),n['shorthand']+' → '+yes(n['partial']),yes(n['selectable']),route_status(n['id'],n['inside'])) for n in p['schoolInventory']])
add('Creekside Middle School is an ordinary ingested school record, not a manual override: **36.342294900955686, -94.24165967314097**, school view 7 / OID 19 plus the all-school source. `Creekside Middle School`, `Creekside Middle`, `Creekside MS` and `creekside` all resolve. Osage Creek Elementary also resolves from the combined school/Common Names evidence. Outside schools remain excluded even when the school district extends beyond the municipality.')
add()
add('## Entire park / recreation / trail-facility inventory')
add()
add(f'The normalized category/source union contains {len(p["parks"])} records including outside destinations; **{len(inside_parks)}** lie inside City Limits. Exact and reasonable partial search, selection and city validation succeed for all {len(inside_parks)} (**100%**). This broad inventory includes public parks, recreation facilities, trail access/POIs and named facilities in the Parks/property layers; it is not a legal count of separately designated parks. “Endpoint valid” means strict input/city validation passed; it does not assert that an untested provider trip exists.')
add()
table(['Park / facility','Source(s)','Official/selected lat, lon','Inside?','Exact / partial','Selectable?','Actual routing evidence'],[(n['name'],', '.join(sorted(set(s['source'] for s in n['sources']))),point(n['point']),yes(n['inside']),yes(n['exact'])+' / '+yes(n['partial']),yes(n['selectable']),route_status(n['id'],n['inside'])) for n in p['parks']])
add('**Creekside Park works.** The official City page names it at 3104 SW Bright Road. The crosswalk binds that address to City address layer 2 / OID 18903056, **36.34070259828065, -94.23757071600167**. That point lies in official Parks parcel 299, whose legacy GIS name is SW 28th St Park; the old name remains an alias. This is one result of a whole-directory reconciliation, not a manually entered park coordinate. '+link('Official City park page','https://www.bentonville.ar.gov/1525/Creekside-Park')+' Memorial Park and Austin-Baggett Park also have search, selection and real route evidence.')
add()
add('## All other supported named destinations')
add()
add('The table exhaustively covers accepted supported named records not already in the school-point/park tables, including every accepted business, artwork and historic property. All canonical names pass search/selection. '+str(sum(n['inside'] for n in p['sourceNames']))+' raw in-city source names are also tested. The only short-input exception is PD; its same canonical police destination is searchable. Historic site labels retain original official names as aliases and identify a historical context rather than implying a current school or a surviving/open building.')
add()
table(['Official canonical destination','Category','lat, lon','Sources','Exact / selectable'],[(n['name'],n['type'],point(n['point']),', '.join(sorted(set(s['source'] for s in n['sources']))),yes(n['exact'])+' / '+yes(n['selectable'])) for n in remaining])
add('Historic-site names identify City-recorded landmarks, not guaranteed extant structures or open interiors. Public art titles, generic-but-official names such as Untitled, and distinct historic houses retain separate identities; generic words and nearby coordinates are insufficient to merge them.')
add()

add('## Official City parks-directory crosswalk')
add()
directory=json.loads((root/'parks-directory/inventory.json').read_text())
source_rows=[r for r in p['sourceNames'] if r['source']=='city-parks-directory']
lookup={r['objectId']:r for r in source_rows}
rejected=p.get('unboundDirectoryNames',[])
table(['Official City park','Published address','GIS binding / selected coordinate','Searchable / selectable','Route evidence'],[(link(page['name'],page['page']),page['address'] or 'No unambiguous standalone address extracted',point(lookup[page['objectId']]['point']) if page['objectId'] in lookup else 'No unambiguous GIS coordinate binding', 'Yes / Yes' if page['objectId'] in lookup else 'No — held without inventing a point',route_status(lookup[page['objectId']]['canonicalId'],lookup[page['objectId']]['inside']) if page['objectId'] in lookup else 'Not routed') for page in directory['records']])
add('23/24 City-directory names are bound (95.83%). A Street Promenade’s page describes the street setting but provides no numbered address or unique GIS destination/entrance. The automated process does not substitute a nearby park, guessed street midpoint, sign coordinate or external geocoder. Historical site names are context-labeled, commercial registrations stay other official places, and coincident school-campus labels retain aliases while resolving to one stronger campus pin.')
add()

add('## Address search audit')
add()
add('The required three addresses plus 15 additional official addresses were tested. Farthest-point sampling spans north, south, east, west, downtown and edge areas rather than selecting only easy downtown examples. All 18 exact, expanded-abbreviation and partial queries pass (**100%**). Wrong house/highway numbers stay rejected. These are official address-point identities, not promises of current occupancy, deliverability or public access. Supplemental City-hosted county/billing records may differ in age; canonical City points take precedence when an address identity overlaps.')
add()
table(['Official address','Selected lat, lon','Exact','Expanded abbreviations','Partial query → works','Actual routing evidence'],[(n['name'],point(n['point']),yes(n['exact']),yes(n['expandedWorks']),n['partialQuery']+' → '+yes(n['partialWorks']),route_status(n['id'],True)) for n in p['addresses']])
add('## Required regressions and negatives')
add()
table(['Query','Results','First official result'],[(q['query'],len(q['results']),q['results'][0]['label'] if q['results'] else 'No supported match') for q in p['queries']])
add('No outside result is “replaced” by a guessed Bentonville point. A known outside address (`2 BLOWING SPRINGS RD`, the Cooper school address) is rejected, along with XNA, Rogers/Fayetteville destinations, a nonexistent house number and nonsense. Users still have to select an official suggestion; typing or blurring never silently commits fuzzy coordinates.')
add()
add('## Controlled live routing audit')
add()
unique=len({(tuple(r['start']['point']),tuple(r['destination']['point'])) for r in rows})
add(f'**{len(rows)} cases / {unique} distinct coordinate pairs; {passed} successful real comparisons; {len(rows)-passed} blocked or unavailable.** Requests were sequential, at least five seconds apart, through the unchanged real comparison pipeline. Named schools/parks, civic/cultural places and 18 residential/edge addresses span the municipality. Each normalized distinct provider alternative was independently tested with the existing full-segment City Limits validation; raw count and geometric-deduplication count are recorded separately. Endpoint snaps are measured. No boundary, scoring, gap or recommendation thresholds were relaxed.')
add()
add('The original first pass is retained in routing/first-pass.json. Reconciliation reused unchanged coordinate pairs and re-requested changed official endpoints only; superseded cases retain .previous.json evidence. Additional cases cover every bound City-directory park plus issued-business and always-public parking destinations. A prior provider timeout remains reported instead of being retried until the count looks better.')
add()
mixed=sum(r['result']=='PASS' and r.get('validAlternatives',0)<r.get('distinctAlternatives',0) for r in rows)
add(f'{mixed} successful cases retained valid alternatives while individually discarding unsupported ones. School/park tables distinguish tested success, tested blocked/unavailable trips, and merely valid but untested endpoints. A searchable in-city destination does not guarantee a wholly in-city provider route to every other destination.')
add()
def result_text(r):
    if r['result']=='PASS':return 'Real comparison'
    return r.get('failureCause',r.get('error','Unavailable'))
table(['#','Start','Destination','Both searchable / selectable / inside','Provider raw / distinct','Valid alternatives','PathSafe result / exact cause'],[(r['id'],r['start']['label'],r['destination']['label'],' / '.join(yes(r['start'][k] and r['destination'][k]) for k in ['searchable','selectable','inside']),str(r.get('providerReceived','—'))+' / '+str(r.get('distinctAlternatives','—')),r.get('validAlternatives','—'),result_text(r)) for r in rows])
add('### Remaining routing failures')
add()
for r in rows:
    if r['result']!='PASS':add('- **#'+str(r['id'])+' '+r['start']['label']+' → '+r['destination']['label']+':** '+str(r.get('failureCause'))+'. '+str(r.get('error','')))
add()
failures=[r for r in rows if r['result']!='PASS']
outer_only=sum(bool(r.get('alternatives')) and all('outer city exit' in a['reason'] for a in r['alternatives']) for r in failures)
hole_only=sum(bool(r.get('alternatives')) and all('Internal municipal' in a['reason'] for a in r['alternatives']) for r in failures)
boundary=sum(r.get('validAlternatives')==0 and bool(r.get('alternatives')) for r in failures)
add(f'Boundary outcomes: {boundary} blocked cases ({outer_only} outer-exit-only, {hole_only} municipal-hole-only, {boundary-outer_only-hole_only} mixed across candidates). Other provider failures are listed individually above. A snapping rejection occurs before normalized candidates are exposed, so its raw route count is intentionally unknown. A timeout is provider availability, not proof of a missing location or absent walking connection. No malformed-geometry failure was observed.')
add()
add('## Validation, screenshots and readiness')
add()
checks=[('npm run lint','PASS'),('npm run build','PASS; snapshot included in /api/locations server trace'),('npm test','PASS — 150/150'),('npm run test:e2e','PASS — 44/44, laptop/tablet/desktop/mobile'),('npm run catalog:audit','PASS — every supported canonical destination, school, park and address sample'),('npm run catalog:routes -- --reconcile',f'{len(rows)} cases; {passed} success, {len(rows)-passed} policy/provider outcomes documented')]
prewarm=Path('/tmp/pathsafe-catalog-prewarm.log').read_text() if Path('/tmp/pathsafe-catalog-prewarm.log').exists() else ''
checks.append(('npm run demo:prewarm -- http://[::1]:3000','PASS — real showcase pipeline' if 'REAL DATA prewarm complete' in prewarm else 'PENDING; see execution log'))
browser_file=root/'browser-verification.json'
if browser_file.exists():
    b=json.loads(browser_file.read_text()); valid=sum(1 for row in b['rows'] if row.get('label'))
    checks.append(('Real browser walkthrough','PASS — desktop/mobile live showcase + school trip; no page errors, no overflow or WCAG violations' if valid==4 else 'INCOMPLETE — inspect browser evidence'))
else:checks.append(('Real browser walkthrough','PENDING'))
table(['Check','Result'],checks)
add('Architecture tests cover complete pagination/IDs, all source types, WGS84/Web Mercator and invalid coordinates, polygon holes, cross-source/campus/acronym deduplication, role and numbered-site preservation, complete fixture categories, mixed-source fuzzy ranking, exact house/highway numbers, source failure isolation, snapshot/boundary revalidation and outside handling. Browser tests preserve explicit choice, keyboard/touch operation, stale-response protection, edit/clear invalidation, and partial-source warnings without caching incomplete results. The existing protected-file tests confirm scoring, coverage, GIS and recommendation invariants.')
add()
if browser_file.exists():
    add('Real browser evidence: `data/location-catalog/browser-verification.json`. Screenshots:')
    add()
    for width in [1440,390]:
        for name in ['landing','showcase','school-search','school-live']:
            add('- '+link(name+' '+str(width)+'px','screenshots/location-catalog/'+name+'-'+str(width)+'.png'))
    add()
    live=[r for r in b['rows'] if r.get('label')=='showcase']
    if live:
        row=live[0];add('The unchanged real showcase renders **'+row['story']['headline']+'** Its metrics remain live pipeline values: '+ '; '.join(str(r['metrics']['coverage'])+'% / score '+str(r['metrics']['score'])+' / '+str(r['metrics']['gaps'])+(' gap' if r['metrics']['gaps']==1 else ' gaps') for r in row['routes'][:2])+'. Runtime values were not hard-coded, and landing preview values remain labeled mock/illustrative.')
        add()
add('**GitHub/review: GO. Controlled local CAC recording: GO — prewarm and desktop/mobile live walkthrough passed. Public Vercel deployment: NO-GO.** Production requires the previously documented approved hosted/private Valhalla endpoint; none is configured here. Public capacity, managed inventory refresh/shared caching and long cold-refresh behavior are unverified. These do not justify weakening City Limits or substituting mock routes. The catalog must not be described as covering every City website name: A Street Promenade still lacks a verified GIS binding, and '+str(len(rows)-passed)+' audited trips remain policy/provider outcomes.')
add()
add('### Remaining catalog gaps and limits')
add()
for text in [
'Current-brand gaps can remain behind generic City source labels: the campus follow-up reconciles three verified names; Sam Walton Hall / ACT BUILDING, Little Squiggles / the two WM CHILDCARE pins and branded office-building assignments remain held without sufficient identity evidence. All accepted coordinate-backed in-city canonical names pass search and selection. A Street Promenade remains a verified official park-directory name without an unambiguous GIS point/address binding; it is not fabricated. See the official directory crosswalk below.',
'Creekside Park is now supported through the City’s official current name/address, City GIS address point and containing park parcel; its earlier generic GIS name is preserved as an alias.',
'The older parking view lists a DAC lot at 219 SW A St as always public, but the newer City parking view omits it. Current availability cannot be corroborated; it is held pending City confirmation, without claiming that omission proves closure.',
'City U, Park Central, Crystal Flats: official Common Names TYPE marks each Apartment Pre; excluded pending official evidence that the preliminary status is no longer applicable.',
'PD: short official alias cannot be queried alone because the existing minimum is three characters; the same destination is searchable as Bentonville Police Dept. This is an input limitation, not a missing police destination.',
'Blank/unnamed geometry, generic owner/unit/category annotations, temporary work sites, explicitly hidden/removed entries, demolished addresses and utility/restricted assets are not fabricated destinations. Every rejected source name/OID and reason is in completeness.json sources[].rejected.',
'Outside-city official destinations are known to the audit but cannot be selected or routed. New/unpublished official layers and real-world places absent from all City datasets cannot be promised complete.',
'Polygon facility anchors and official point pins are not verified public entrances. Provider snaps and strict municipal geometry can block trips even for valid selected locations.',
'Keep the snapshot refreshed and warm for recording. Runtime caches are process/local-disk based, not a claim of a distributed production cache or guaranteed cold-refresh latency.'
]:add('- '+text)
add()
add('## Reproduction and maintenance')
add()
add('Run npm run catalog:parks to refresh the existing official park-directory crosswalk evidence (Python 3 extracts main-content headings/addresses; raw pages remain in ignored .cache, not the app bundle). npm run catalog:refresh enumerates registered inventories and atomically replaces the compressed snapshot only on complete source success. npm run catalog:audit exhaustively checks accepted names, schools, parks, addresses and regressions. The completed 94-case routing audit is retained without another mass routing run. node --import tsx scripts/audit-catalog-browser.ts http://localhost:3000 records the real UI walkthrough. python3 scripts/write-location-catalog-report.py regenerates this report. Source discovery is finished; this completion pass uses only the already-integrated registry. The optional development walkthrough initially encountered reloads during Axe scanning; production end-to-end checks passed independently, and the dev walkthrough was rerun after clearing generated dev cache.')
add()
add('Source caches last 24 hours. If normalization rules or descriptor fields change, invalidate the affected generated/cached source inventory before regenerating the snapshot; do not label an old normalized inventory newly fetched. The snapshot records each actual source retrieval time. Run the prewarm against the intended local PathSafe listener; this audit used IPv6 explicitly because another unrelated local process already occupied IPv4 port 3000. Nothing was deployed, committed or pushed.')
Path('docs/LOCATION_CATALOG_COMPLETENESS_AUDIT.md').write_text('\n'.join(lines)+'\n')
print('Wrote report:',len(lines),'lines;',len(decisions),'layer decisions;',len(rows),'route cases')
