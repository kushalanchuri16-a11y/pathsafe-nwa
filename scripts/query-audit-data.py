import json,subprocess,time,collections
from pathlib import Path
from urllib.parse import urlencode
BASE='https://gis.bentonvillear.com/arcgis/rest/services/'
ROOT=Path('data/demo-search/audit')
def query(path,params,name):
 file=ROOT/(name+'.json')
 if file.exists():return json.loads(file.read_text())
 params={'f':'json',**params};url=BASE+path+'/query?'+urlencode(params)
 d=json.loads(subprocess.check_output(['curl','-fsS','--max-time','30',url]));
 if 'error' in d:raise RuntimeError(d['error'])
 file.write_text(json.dumps(d,indent=2)+'\n');time.sleep(.3);return d
where="UPPER(COMMON_NAME) LIKE '%PARK%' OR UPPER(COMMON_NAME) LIKE '%LIBRARY%' OR UPPER(COMMON_NAME) LIKE '%SCHOOL%' OR UPPER(COMMON_NAME) LIKE '%CITY HALL%' OR UPPER(COMMON_NAME) LIKE '%COMMUNITY%' OR UPPER(COMMON_NAME) LIKE '%PLAZA%'"
d=query('Planning/Community_Development23/MapServer/194',{'f':'geojson','where':where,'outFields':'OBJECTID,COMMON_NAME,ADDRESS,STATUS','outSR':'4326','returnGeometry':'true'},'public-location-candidates')
for f in d.get('features',[]):print('LOCATION',f['properties'],f['geometry']['coordinates'])
for layer in [158,51]:
 path=f'Parks/Parks_Recreation18/MapServer/{layer}'
 d=query(path,{'where':'1=1','geometry':'-94.27,36.32,-94.17,36.42','geometryType':'esriGeometryEnvelope','inSR':'4326','groupByFieldsForStatistics':'trltyptxt,trlsubtype','outStatistics':json.dumps([{'statisticType':'count','onStatisticField':'OBJECTID','outStatisticFieldName':'record_count'}]),'returnGeometry':'false'},f'parks-{layer}-statistics')
 print('STATS',layer,[f['attributes'] for f in d.get('features',[])])
d=query('Parks/Parks_Recreation18/MapServer/168',{'f':'geojson','where':"UPPER(city) = 'BENTONVILLE'",'outFields':'OBJECTID,name,address,city,subtype,cost,trail_access,visible,Approved','outSR':'4326','returnGeometry':'true'},'city-pois')
for f in d.get('features',[]):print('POI',f['properties'],f['geometry']['coordinates'])
