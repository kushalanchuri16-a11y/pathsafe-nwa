import length from "@turf/length";
import { lineString } from "@turf/helpers";
import type { Coordinate } from "@/types/routes";
export function validLine(value: unknown): value is Coordinate[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 50000 &&
    value.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every(Number.isFinite) &&
        Math.abs(p[0]) <= 90 &&
        Math.abs(p[1]) <= 180,
    ) &&
    value.some(
      (p, i) => i > 0 && (p[0] !== value[i - 1][0] || p[1] !== value[i - 1][1]),
    )
  );
}
export function routeLengthMeters(line: Coordinate[]): number {
  if (!validLine(line)) throw new Error("Invalid route geometry.");
  return length(lineString(line.map(([lat, lon]) => [lon, lat])), {
    units: "meters",
  });
}
export type XY = [number, number];
// Local equirectangular coordinates anchored on the route. Under 5km in Bentonville;
// distance scales checked against Turf geodesic lengths, not Web Mercator meters.
export function projector(origin: Coordinate) {
  const r = 6371008.8,
    rad = Math.PI / 180,
    cos = Math.cos(origin[0] * rad);
  return ([lat, lon]: Coordinate): XY => [
    (lon - origin[1]) * rad * r * cos,
    (lat - origin[0]) * rad * r,
  ];
}
export function demoBounds(
  lines: Coordinate[][],
  paddingMeters = 75,
): [number, number, number, number] {
  const points = lines.flat();
  if (!points.length) throw new Error("No route geometry.");
  const latPad = paddingMeters / 111195,
    lonPad = latPad / Math.cos((points[0][0] * Math.PI) / 180);
  return [
    Math.min(...points.map((p) => p[1])) - lonPad,
    Math.min(...points.map((p) => p[0])) - latPad,
    Math.max(...points.map((p) => p[1])) + lonPad,
    Math.max(...points.map((p) => p[0])) + latPad,
  ];
}

export function coordinateDistance(a: Coordinate, b: Coordinate) {
  return length(
    lineString([
      [a[1], a[0]],
      [b[1], b[0]],
    ]),
    { units: "meters" },
  );
}
