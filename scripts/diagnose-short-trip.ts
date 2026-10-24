import {readFile,writeFile} from "node:fs/promises";
import {walkingRoutingProvider} from "../lib/routing";
import {demoBounds} from "../lib/analysis/geometry";
import {getPedestrianInventory,PARKS_TRAIL_LAYER} from "../lib/gis/pedestrianInventory";
const row=JSON.parse(await readFile("data/reliability/short-trip.json","utf8"));
const routing=await walkingRoutingProvider.getCandidates({start:row.selected[0].point,destination:row.selected[1].point});const bounds=demoBounds(routing.result.routes.map(r=>r.geometry));
let error;try{await getPedestrianInventory(bounds)}catch(e){error=e instanceof Error?e.message:String(e)}
const url=new URL(PARKS_TRAIL_LAYER+"/query");url.search=new URLSearchParams({f:"json",where:"useaccess = 'Public' AND trltyptxt IN ('Off-Street Trail','Side-Path Trail','Park Trail','Neighborhood Trail','Hiking')",geometry:bounds.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',returnIdsOnly:'true'}).toString();
const inventory=await (await fetch(url)).json();await writeFile('data/reliability/short-diagnosis.json',JSON.stringify({routing,bounds,error,inventory},null,2));console.log(error,inventory);
