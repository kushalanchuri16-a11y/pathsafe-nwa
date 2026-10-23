import boundary from "@/data/boundary/bentonville.json";
import type { Coordinate } from "@/types/routes";
export type Polygon = number[][][];
const polygons: Polygon[] = boundary.features.flatMap(
  (f) => f.geometry.coordinates,
);
export const BOUNDARY_SOURCE =
  "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Pending_PZitems_Publish23/MapServer/5";
function onEdge(x: number, y: number, a: number[], b: number[]) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  return (
    Math.abs((x - a[0]) * dy - (y - a[1]) * dx) < 1e-12 &&
    x >= Math.min(a[0], b[0]) - 1e-10 &&
    x <= Math.max(a[0], b[0]) + 1e-10 &&
    y >= Math.min(a[1], b[1]) - 1e-10 &&
    y <= Math.max(a[1], b[1]) + 1e-10
  );
}
function ringContains(x: number, y: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i];
    if (onEdge(x, y, a, b)) return 2;
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside ? 1 : 0;
}
export function withinPolygons(lat: number, lon: number, area: Polygon[]) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return area.some((p) => {
    const outer = ringContains(lon, lat, p[0]);
    return (
      outer === 2 ||
      (outer === 1 && !p.slice(1).some((r) => ringContains(lon, lat, r) === 1))
    );
  });
}
export function isWithinSupportedArea(lat: number, lon: number) {
  return withinPolygons(lat, lon, polygons);
}
// Partition each route segment at every boundary intersection: vertices alone miss
// excursions through enclaves/holes and concave municipal edges.
export function lineWithinArea(line: Coordinate[], area: Polygon[] = polygons) {
  if (
    line.length < 2 ||
    !line.every(([lat, lon]) => withinPolygons(lat, lon, area))
  )
    return false;
  for (let i = 1; i < line.length; i++) {
    const [ay, ax] = line[i - 1],
      [by, bx] = line[i],
      dx = bx - ax,
      dy = by - ay,
      ts = [0, 1];
    for (const p of area)
      for (const ring of p)
        for (let j = 1; j < ring.length; j++) {
          const [cx, cy] = ring[j - 1],
            [ex, ey] = ring[j],
            sx = ex - cx,
            sy = ey - cy,
            den = dx * sy - dy * sx;
          if (Math.abs(den) < 1e-18) continue;
          const t = ((cx - ax) * sy - (cy - ay) * sx) / den,
            u = ((cx - ax) * dy - (cy - ay) * dx) / den;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
        }
    ts.sort((a, b) => a - b);
    for (let j = 1; j < ts.length; j++) {
      const t = (ts[j - 1] + ts[j]) / 2;
      if (!withinPolygons(ay + dy * t, ax + dx * t, area)) return false;
    }
  }
  return true;
}
