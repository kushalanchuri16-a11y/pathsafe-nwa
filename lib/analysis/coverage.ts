import { projector, routeLengthMeters, validLine, type XY } from "./geometry";
import type { Coordinate, InfrastructureSegment } from "@/types/routes";
export const TOLERANCE_METERS = 15;
export const MIN_GAP_METERS = 20;
export const GAP_BRIDGE_METERS = 5;
type Interval = [number, number];
const dot = (a: XY, b: XY) => a[0] * b[0] + a[1] * b[1];
const sub = (a: XY, b: XY): XY => [a[0] - b[0], a[1] - b[1]];
function clipLinear(
  range: Interval,
  value: number,
  delta: number,
  min: number,
  max: number,
): Interval | null {
  if (Math.abs(delta) < 1e-12)
    return value >= min && value <= max ? range : null;
  const a = (min - value) / delta,
    b = (max - value) / delta;
  const lo = Math.max(range[0], Math.min(a, b)),
    hi = Math.min(range[1], Math.max(a, b));
  return hi >= lo ? [lo, hi] : null;
}
function circle(a: XY, d: XY, c: XY, r: number): Interval | null {
  const q = sub(a, c),
    aa = dot(d, d),
    bb = 2 * dot(q, d),
    cc = dot(q, q) - r * r;
  if (aa < 1e-15) return cc <= 0 ? [0, 1] : null;
  const disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const lo = Math.max(0, (-bb - Math.sqrt(disc)) / (2 * aa)),
    hi = Math.min(1, (-bb + Math.sqrt(disc)) / (2 * aa));
  return hi >= lo ? [lo, hi] : null;
}
// Exact intersection parameter intervals of a route segment and an infrastructure
// capsule (a rectangular strip plus endpoint circles). Union prevents double counting.
function capsule(a: XY, b: XY, c: XY, e: XY, r: number): Interval[] {
  const d = sub(b, a),
    v = sub(e, c),
    l = Math.hypot(...v),
    intervals: Interval[] = [];
  if (l > 1e-9) {
    const u: XY = [v[0] / l, v[1] / l],
      n: XY = [-u[1], u[0]],
      q = sub(a, c);
    let strip = clipLinear([0, 1], dot(q, u), dot(d, u), 0, l);
    if (strip) strip = clipLinear(strip, dot(q, n), dot(d, n), -r, r);
    if (strip) intervals.push(strip);
  }
  for (const center of [c, e]) {
    const cap = circle(a, d, center, r);
    if (cap) intervals.push(cap);
  }
  return intervals;
}
export function mergeIntervals(ranges: Interval[], epsilon = 1e-6): Interval[] {
  const merged: Interval[] = [];
  for (const [a, b] of ranges.sort((x, y) => x[0] - y[0])) {
    const last = merged.at(-1);
    if (last && a <= last[1] + epsilon) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}
export function groupGaps(
  gaps: Interval[],
  minimum = MIN_GAP_METERS,
  bridge = GAP_BRIDGE_METERS,
) {
  const groups: { start: number; end: number; uncoveredMeters: number }[] = [];
  for (const [start, end] of gaps) {
    const last = groups.at(-1);
    if (last && start - last.end <= bridge + 1e-6) {
      last.end = end;
      last.uncoveredMeters += end - start;
    } else groups.push({ start, end, uncoveredMeters: end - start });
  }
  return groups.filter((g) => g.uncoveredMeters + 1e-6 >= minimum);
}
interface Segment {
  a: XY;
  b: XY;
  id: number;
}
class SegmentIndex {
  cells = new Map<string, Segment[]>();
  size = 100;
  constructor(lines: XY[][]) {
    let id = 0;
    for (const line of lines)
      for (let i = 1; i < line.length; i++) {
        const segment = { a: line[i - 1], b: line[i], id: id++ };
        for (const key of this.keys(segment.a, segment.b, 0)) {
          const list = this.cells.get(key) ?? [];
          list.push(segment);
          this.cells.set(key, list);
        }
      }
  }
  *keys(a: XY, b: XY, pad: number) {
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - pad) / this.size);
      x <= Math.floor((Math.max(a[0], b[0]) + pad) / this.size);
      x++
    )
      for (
        let y = Math.floor((Math.min(a[1], b[1]) - pad) / this.size);
        y <= Math.floor((Math.max(a[1], b[1]) + pad) / this.size);
        y++
      )
        yield `${x}:${y}`;
  }
  query(a: XY, b: XY, pad: number) {
    const found = new Map<number, Segment>();
    for (const key of this.keys(a, b, pad))
      for (const s of this.cells.get(key) ?? []) found.set(s.id, s);
    return found.values();
  }
}
export function measureCoverage(
  route: Coordinate[],
  infrastructure: Pick<InfrastructureSegment, "geometry" | "eligible">[],
  tolerance = TOLERANCE_METERS,
) {
  if (!validLine(route)) throw new Error("Invalid route geometry.");
  if (!Number.isFinite(tolerance) || tolerance <= 0)
    throw new Error("Invalid matching tolerance.");
  const eligible = infrastructure.filter((s) => s.eligible !== false);
  if (eligible.some((s) => !validLine(s.geometry)))
    throw new Error("Invalid infrastructure geometry; analysis incomplete.");
  const project = projector(route[0]),
    points = route.map(project),
    index = new SegmentIndex(eligible.map((s) => s.geometry.map(project)));
  const intervals: Interval[] = [];
  let cursor = 0;
  for (let i = 1; i < route.length; i++) {
    const a = points[i - 1],
      b = points[i],
      meters =
        Math.hypot(...sub(b, a)) < 1e-9
          ? 0
          : routeLengthMeters([route[i - 1], route[i]]);
    if (!meters) continue;
    const matches: Interval[] = [];
    for (const s of index.query(a, b, tolerance))
      matches.push(...capsule(a, b, s.a, s.b, tolerance));
    for (const [lo, hi] of mergeIntervals(matches))
      intervals.push([cursor + lo * meters, cursor + hi * meters]);
    cursor += meters;
  }
  const coveredIntervals = mergeIntervals(intervals),
    coveredMeters = Math.min(
      cursor,
      coveredIntervals.reduce((sum, [a, b]) => sum + b - a, 0),
    ),
    uncovered: Interval[] = [];
  let end = 0;
  for (const [a, b] of coveredIntervals) {
    if (a > end + 1e-6) uncovered.push([end, a]);
    end = Math.max(end, b);
  }
  if (cursor > end + 1e-6) uncovered.push([end, cursor]);
  return {
    lengthMeters: cursor,
    coveredMeters,
    uncoveredMeters: Math.max(0, cursor - coveredMeters),
    coverage: cursor ? (coveredMeters / cursor) * 100 : 0,
    gaps: groupGaps(uncovered).length,
    uncoveredIntervals: uncovered,
    coveredIntervals,
  };
}
