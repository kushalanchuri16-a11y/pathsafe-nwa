import { measureCoverage } from "@/lib/analysis/coverage";
import { routeLengthMeters } from "@/lib/analysis/geometry";
import type { Coordinate, InfrastructureSegment } from "@/types/routes";
export const INFRASTRUCTURE_DEDUP_METERS = 0.05;
function key(points: Coordinate[]) {
  const f = points.map((p) => p.map((v) => v.toFixed(8)).join(",")).join(";"),
    r = [...points]
      .reverse()
      .map((p) => p.map((v) => v.toFixed(8)).join(","))
      .join(";");
  return f < r ? f : r;
}
function sliceLine(line: Coordinate[], from: number, to: number): Coordinate[] {
  let cursor = 0;
  const points: Coordinate[] = [];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1],
      b = line[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const meters = routeLengthMeters([a, b]),
      end = cursor + meters;
    if (end >= from && cursor <= to) {
      const lo = Math.max(0, (from - cursor) / meters),
        hi = Math.min(1, (to - cursor) / meters);
      if (hi > lo) {
        for (const f of [lo, hi]) {
          const p: Coordinate = [
            a[0] + (b[0] - a[0]) * f,
            a[1] + (b[1] - a[1]) * f,
          ];
          if (
            !points.length ||
            p[0] !== points.at(-1)![0] ||
            p[1] !== points.at(-1)![1]
          )
            points.push(p);
        }
      }
    }
    cursor = end;
    if (cursor > to) break;
  }
  return points;
}
// Preserve baseline linework; remove duplicate features and trim near-coincident
// supplementary line sections BEFORE route coverage analysis. Crossing points
// shorter than 0.5m are not treated as duplicate line sections.
export function deduplicateInfrastructure(
  baseline: InfrastructureSegment[],
  additional: InfrastructureSegment[],
) {
  const segments: InfrastructureSegment[] = [],
    seen = new Set<string>(),
    rejectedSeen = new Set<string>();
  let duplicateFeatures = 0,
    trimmedMeters = 0;
  for (const s of [...baseline].sort(
    (a, b) => Number(b.eligible !== false) - Number(a.eligible !== false),
  )) {
    const k = key(s.geometry),
      registry = s.eligible === false ? rejectedSeen : seen;
    if (registry.has(k) || (s.eligible === false && seen.has(k))) {
      duplicateFeatures++;
      continue;
    }
    registry.add(k);
    segments.push(s);
  }
  for (const s of additional) {
    if (s.eligible === false) continue;
    const k = key(s.geometry);
    if (seen.has(k)) {
      duplicateFeatures++;
      trimmedMeters += routeLengthMeters(s.geometry);
      continue;
    }
    seen.add(k);
    const measured = measureCoverage(
      s.geometry,
      segments,
      INFRASTRUCTURE_DEDUP_METERS,
    );
    const overlap = measured.coveredIntervals.filter(([a, b]) => b - a >= 0.5);
    if (!overlap.length) {
      segments.push(s);
      continue;
    }
    const unique: [number, number][] = [];
    let end = 0;
    for (const [a, b] of overlap) {
      if (a > end) unique.push([end, a]);
      end = b;
    }
    if (end < measured.lengthMeters) unique.push([end, measured.lengthMeters]);
    trimmedMeters += overlap.reduce((sum, [a, b]) => sum + b - a, 0);
    const parts = unique
      .filter(([a, b]) => b - a > 0.01)
      .map(([a, b]) => sliceLine(s.geometry, a, b))
      .filter((g) => g.length >= 2);
    if (!parts.length) duplicateFeatures++;
    parts.forEach((geometry, i) =>
      segments.push({ ...s, id: `${s.id}:unique-${i}`, geometry }),
    );
  }
  return { segments, duplicateFeatures, trimmedMeters };
}
