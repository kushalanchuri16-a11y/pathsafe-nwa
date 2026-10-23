import { readFile, writeFile, readdir } from "node:fs/promises";
import { normalizeFeatures } from "../lib/gis/bentonville";
import { trailEligibility } from "../lib/gis/trailEligibility";
import { deduplicateInfrastructure } from "../lib/gis/deduplicateInfrastructure";
import { measureCoverage } from "../lib/analysis/coverage";
import { analyzeCandidates } from "../lib/analysis/compare";
import { demoQuality } from "../lib/demo-search/quality";
import type {
  InfrastructureSegment,
  RouteCandidate,
  Coordinate,
} from "../types/routes";
const dir = "data/demo-search";
const study = JSON.parse(await readFile(dir + "/sidewalk-study.json", "utf8"));
const raw = JSON.parse(
  await readFile(dir + "/audit/parks-trail-features.json", "utf8"),
);
const exclusions: Record<string, number> = {},
  accepted: InfrastructureSegment[] = [];
const acceptedFeatureIds: number[] = [];
for (const f of raw.features) {
  const check = trailEligibility(f.properties);
  if (!check.eligible) {
    exclusions[check.exclusion!] = (exclusions[check.exclusion!] ?? 0) + 1;
    continue;
  }
  acceptedFeatureIds.push(f.properties.OBJECTID);
  const paths =
    f.geometry.type === "LineString"
      ? [f.geometry.coordinates]
      : f.geometry.type === "MultiLineString"
        ? f.geometry.coordinates
        : [];
  if (!paths.length) throw new Error("Invalid accepted trail geometry");
  paths.forEach((path: number[][], i: number) =>
    accepted.push({
      id: `parks158:${f.properties.OBJECTID}:${i}`,
      kind: "trail",
      source: "live",
      eligible: true,
      geometry: path.map(([lon, lat]) => [lat, lon] as Coordinate),
      attributes: f.properties,
    }),
  );
}
console.log(
  "Accepted",
  acceptedFeatureIds.length,
  "trail features;",
  exclusions,
);
const dedup = deduplicateInfrastructure(study.dataset.segments, accepted);
console.log(
  "Infrastructure dedup",
  dedup.duplicateFeatures,
  "duplicates,",
  dedup.trimmedMeters,
  "meters trimmed",
);
await writeFile(
  dir + "/audited-infrastructure.json",
  JSON.stringify(
    {
      retrievedAt: raw.retrievedAt,
      scope: raw.scope,
      acceptedFeatureIds,
      exclusions,
      duplicateFeatures: dedup.duplicateFeatures,
      trimmedMeters: dedup.trimmedMeters,
      segments: dedup.segments,
    },
    null,
    2,
  ) + "\n",
);
const results = [];
function metrics(
  routes: RouteCandidate[],
  recommendation: { routeId: string },
) {
  const fastest = routes[0],
    rec = routes.find((r) => r.id === recommendation.routeId)!;
  const alt = rec.id !== fastest.id && routes.length > 1;
  const a = fastest.metrics,
    b = rec.metrics,
    gain = b.coverage - a.coverage,
    added = b.seconds! - a.seconds!;
  const overlapA = alt
      ? measureCoverage(fastest.geometry, [{ geometry: rec.geometry }], 5)
          .coverage
      : 100,
    overlapB = alt
      ? measureCoverage(rec.geometry, [{ geometry: fastest.geometry }], 5)
          .coverage
      : 100;
  const distinct = 1 - (overlapA + overlapB) / 200;
  return {
    fastestId: fastest.id,
    recommendedId: rec.id,
    qualifyingAlternative: alt,
    fastestCoverage: a.coverage,
    recommendedCoverage: b.coverage,
    coverageGain: gain,
    addedSeconds: added,
    addedDistanceMeters: b.providerDistanceMeters! - a.providerDistanceMeters!,
    fastestScore: a.score,
    recommendedScore: b.score,
    scoreGain: b.score - a.score,
    fastestGaps: a.gaps,
    recommendedGaps: b.gaps,
    fastestMinutes: a.minutes,
    recommendedMinutes: b.minutes,
    fastestDistanceMeters: a.providerDistanceMeters,
    recommendedDistanceMeters: b.providerDistanceMeters,
    recommendedMeasuredLengthMeters: b.lengthMeters,
    recommendedCoveredMeters: b.coveredMeters,
    recommendedUncoveredMeters: b.uncoveredMeters,
    distinctFraction: distinct,
    directionalOverlapWithin5m: [overlapA, overlapB],
    demoQuality: demoQuality({
      qualifying: alt,
      coverageGain: gain,
      recommendedCoverage: b.coverage,
      addedSeconds: added,
      distinctFraction: distinct,
    }),
  };
}
for (const file of (await readdir(dir))
  .filter((f) => f.endsWith("-routing.json"))
  .sort()) {
  const row = JSON.parse(await readFile(dir + "/" + file, "utf8"));
  if (row.error) {
    results.push({ ...row, status: "unavailable" });
    continue;
  }
  const baseline = analyzeCandidates(row.routing.routes, study.dataset),
    audited = analyzeCandidates(row.routing.routes, {
      ...study.dataset,
      segments: dedup.segments,
    });
  const original = metrics(baseline.routes, baseline.recommendation),
    expanded = metrics(audited.routes, audited.recommendation);
  results.push({
    pair: row.pair,
    routingRetrievedAt: row.retrievedAt,
    routingCacheHit: row.cacheHit,
    candidatesReceived: row.routing.received,
    candidatesRetained: row.routing.routes.length,
    baseline: {
      ...original,
      routes: baseline.routes,
      recommendation: baseline.recommendation,
    },
    audited: {
      ...expanded,
      routes: audited.routes,
      recommendation: audited.recommendation,
    },
  });
  console.log(
    row.pair.id,
    "baseline",
    original.fastestCoverage.toFixed(2),
    original.recommendedCoverage.toFixed(2),
    "audited",
    expanded.fastestCoverage.toFixed(2),
    expanded.recommendedCoverage.toFixed(2),
    "gain",
    expanded.coverageGain.toFixed(2),
    "quality",
    expanded.demoQuality.toFixed(2),
  );
}
const gap = JSON.parse(
  await readFile(dir + "/audit/gap-map-default-features.json", "utf8"),
);
const gapFeatures = gap.features.map(
  (f: { properties: Record<string, unknown>; geometry: unknown }) => ({
    ...f,
    properties: {
      ...f.properties,
      OBJECTID: f.properties.OBJECTID_1,
      Closure_Status: f.properties.Closure_St,
    },
  }),
);
const mirror = normalizeFeatures(gapFeatures);
const eligibleMirror = mirror.segments.filter((s) => s.eligible);
let mirrorLength = 0,
  near = 0;
for (const s of eligibleMirror) {
  const m = measureCoverage(s.geometry, study.dataset.segments, 0.25);
  mirrorLength += m.lengthMeters;
  near += m.coveredMeters;
}
const auditSummary = {
  generatedAt: new Date().toISOString(),
  baseSource: "Planning/Community_Development23/MapServer/174",
  trailSource: "Parks/Parks_Recreation18/MapServer/158",
  trailFeaturesInspected: raw.features.length,
  acceptedTrailFeatures: acceptedFeatureIds.length,
  acceptedPavedFeatures: raw.features.filter(
    (f: { properties: Record<string, string | number | null> }) =>
      trailEligibility(f.properties).eligible &&
      f.properties.trltyptxt !== "Hiking",
  ).length,
  acceptedPavedLineParts: accepted.filter(
    (s) => s.attributes?.trltyptxt !== "Hiking",
  ).length,
  acceptedHikingLineParts: accepted.filter(
    (s) => s.attributes?.trltyptxt === "Hiking",
  ).length,
  exclusions,
  duplicateFeatures: dedup.duplicateFeatures,
  trimmedMeters: dedup.trimmedMeters,
  mirrorSample: {
    features: gap.features.length,
    eligibleFeatures: eligibleMirror.length,
    totalMeters: mirrorLength,
    nearBaselineWithin25cmMeters: near,
    overlapPercent: (100 * near) / mirrorLength,
  },
  baselineFeatureCount: study.dataset.featureCount,
};
await writeFile(
  dir + "/search-results.json",
  JSON.stringify({ auditSummary, results }, null, 2) + "\n",
);
console.log(
  "RANKED",
  results
    .filter((r) => r.audited?.qualifyingAlternative)
    .sort((a, b) => b.audited!.demoQuality - a.audited!.demoQuality)
    .map((r) => ({
      pair: r.pair.id,
      origin: r.pair.start.label,
      destination: r.pair.destination.label,
      ...r.audited,
      routes: undefined,
      recommendation: undefined,
    })),
);
console.log("AUDIT", auditSummary);
