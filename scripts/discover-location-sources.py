import json,subprocess,time,sys
from pathlib import Path
from urllib.parse import quote
BASE='https://gis.bentonvillear.com/arcgis/rest/services/'
ROOT=Path('data/location-catalog/discovery');ROOT.mkdir(parents=True,exist_ok=True)
def get(path):
 file=ROOT/(path.replace('/','__')or'root')
 file=file.with_suffix('.json')
 if file.exists() and "--refresh" not in sys.argv and file.stat().st_mtime+86400>time.time():return json.loads(file.read_text())
 r=subprocess.run(['curl','-fsS','--max-time','25',BASE+quote(path,safe='/')+('?f=json' if '?' not in path else '&f=json')],capture_output=True,text=True)
 try:body=json.loads(r.stdout) if r.returncode==0 else {'error':r.stderr}
 except Exception:body={'error':'Invalid response'}
 file.write_text(json.dumps(body,indent=2)+'\n');time.sleep(.15);return body
root=get('');services=list(root.get('services',[]))
for folder in root.get('folders',[]):
 data=get(folder)
 services+=data.get('services',[])
 print(folder,[(s['name'],s['type']) for s in data.get('services',[])],flush=True)
(ROOT/'services.json').write_text(json.dumps(services,indent=2)+'\n')
for s in services:
 if s['type'] not in ['MapServer','FeatureServer']:continue
 data=get(s['name']+'/'+s['type']+'/layers')
 print('LAYERS',s['name'],len(data.get('layers',[])), 'ERROR' if data.get('error') else '',flush=True)
(ROOT/'manifest.json').write_text(json.dumps({'serviceCount':len(services),'rootFolders':root.get('folders',[]),'officialBase':BASE},indent=2)+'\n')
