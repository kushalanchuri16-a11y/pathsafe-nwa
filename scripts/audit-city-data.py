import json,urllib.request,time,hashlib,subprocess
from pathlib import Path
from datetime import datetime,timezone
BASE='https://gis.bentonvillear.com/arcgis/rest/services/'
ROOT=Path('data/demo-search/audit')
def get(relative,name):
 if (ROOT/(name+'.json')).exists():return json.loads((ROOT/(name+'.json')).read_text())
 url=BASE+relative+('?' if '?' not in relative else '&')+'f=pjson'
 d=json.loads(subprocess.check_output(["curl","-fsS","--max-time","30",url]))
 if 'error' in d:raise RuntimeError(d['error'])
 (ROOT/(name+'.json')).write_text(json.dumps(d,indent=2)+'\n');time.sleep(.3);return d
for folder in ['Parks','Planning','Transportation']:
 d=get(folder,folder+'-services');print(folder,[s['name'] for s in d.get('services',[])])
parks=get('Parks/Parks_Recreation18/MapServer/layers','parks-layers')
print('PARKS LAYERS')
for layer in parks.get('layers',[]):
 if layer.get('geometryType')=='esriGeometryPolyline' or any(w in layer['name'].lower() for w in ['park','trail','sidewalk']):
  print(layer['id'],layer['name'],layer.get('geometryType'),layer.get('definitionExpression'),[f['name'] for f in (layer.get('fields') or [])])
get('Parks/Sidewalk_Gap_Identification_Web_Map/MapServer/layers','gap-map-layers')
get('Planning/Community_Development23/MapServer/174','sidewalk-174')
get('Planning/Community_Development23/MapServer/194','locations-194')
hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path('lib/scoring/pathsafeScore.ts'),Path('lib/scoring/recommendation.ts'),Path('lib/analysis/coverage.ts'),Path('data/demoLocations.ts')]}
manifest=ROOT/'audit-manifest.json'
if manifest.exists():
 original=json.loads(manifest.read_text())['unchangedBaselineHashes']
 if any(hashes[k] != v for k,v in original.items() if k != 'data/demoLocations.ts'):raise RuntimeError('Protected baseline files differ from the original audit manifest; do not overwrite historical hashes.')
else:
 manifest.write_text(json.dumps({'retrievedAt':datetime.now(timezone.utc).isoformat(),'unchangedBaselineHashes':hashes},indent=2)+'\n')
