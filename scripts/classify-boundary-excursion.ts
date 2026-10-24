import { readFile, writeFile } from "node:fs/promises";
import boundary from "../data/boundary/bentonville.json";
import {
  withinPolygons,
  isWithinSupportedArea,
  type Polygon,
} from "../lib/geocoding/area";
const area: Polygon[] = boundary.features.flatMap(
    (f) => f.geometry.coordinates,
  ),
  rows = JSON.parse(
    await readFile(
      "data/reliability/reported-boundary-measurements.json",
      "utf8",
    ),
  ),
  data = JSON.parse(
    await readFile("data/reliability/reported-routing.json", "utf8"),
  );
const details = rows.flatMap(
  (r: {
    outsideIntervals: { from: [number, number]; to: [number, number] }[];
  }) =>
    r.outsideIntervals.map((s) => {
      const p: [number, number] = [
        (s.from[0] + s.to[0]) / 2,
        (s.from[1] + s.to[1]) / 2,
      ];
      return {
        point: p,
        insideMunicipality: isWithinSupportedArea(...p),
        insideAnyOuterRing: withinPolygons(
          ...p,
          area.map((poly) => [poly[0]]),
        ),
        reason: withinPolygons(
          ...p,
          area.map((poly) => [poly[0]]),
        )
          ? "City polygon hole/enclave"
          : "Outside outer municipal boundary",
      };
    }),
);
await writeFile(
  "data/reliability/excursion-classification.json",
  JSON.stringify(
    {
      details,
      snappedEndpoints: data.routing.result.routes.map(
        (r: { id: string; geometry: [number, number][] }) => ({
          id: r.id,
          startInside: isWithinSupportedArea(...r.geometry[0]),
          endInside: isWithinSupportedArea(...r.geometry.at(-1)!),
        }),
      ),
    },
    null,
    2,
  ),
);
console.log(details);
