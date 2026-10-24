import { confirmedInventoryIds } from "./inventoryIds";
import { fetchJson, type Fetcher } from "@/lib/server/http";
import { cached } from "@/lib/server/cache";
import {
  getBentonvilleInfrastructure,
  type InfrastructureDataset,
} from "./bentonville";
import { trailEligibility } from "./trailEligibility";
import { deduplicateInfrastructure } from "./deduplicateInfrastructure";
import { validLine } from "@/lib/analysis/geometry";
import type { Coordinate, InfrastructureSegment } from "@/types/routes";
export const PARKS_TRAIL_LAYER =
  "https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/158";
export const TRAIL_FIELDS = [
  "OBJECTID",
  "prim_name",
  "trlsubtype",
  "trltyptxt",
  "facdescrip",
  "surftype",
  "bikesallow",
  "useaccess",
  "maintowner",
  "Approved",
  "constrdate",
  "Closure_Status",
  "Start_Closure",
  "End_Closure",
];
export const TRAIL_QUERY =
  "useaccess = 'Public' AND trltyptxt IN ('Off-Street Trail','Side-Path Trail','Park Trail','Neighborhood Trail','Hiking')";
export function normalizeTrailFeatures(
  features: unknown[],
): InfrastructureDataset {
  const segments: InfrastructureSegment[] = [];
  const warnings: string[] = [];
  let acceptedFeatures = 0;
  for (const raw of features) {
    const f = raw as {
      properties?: Record<string, string | number | null>;
      geometry?: { type: string; coordinates: unknown };
    };
    if (!f.properties || !Number.isInteger(f.properties.OBJECTID))
      throw new Error("Invalid City trail feature.");
    const eligibility = trailEligibility(f.properties);
    if (!eligibility.eligible) continue;
    const paths =
      f.geometry?.type === "LineString"
        ? [f.geometry.coordinates]
        : f.geometry?.type === "MultiLineString" &&
            Array.isArray(f.geometry.coordinates)
          ? f.geometry.coordinates
          : [];
    if (!paths.length) throw new Error("Invalid City trail geometry.");
    acceptedFeatures++;
    paths.forEach((path, i) => {
      if (!Array.isArray(path)) throw new Error("Invalid City trail path.");
      const geometry = path.map((p: unknown) =>
        Array.isArray(p) && p.length >= 2 ? [p[1], p[0]] : null,
      ) as Coordinate[];
      if (
        !validLine(geometry) ||
        geometry.some(
          ([lat, lon]) => lat < 36.2 || lat > 36.5 || lon < -94.4 || lon > -94,
        )
      )
        throw new Error("Invalid City trail coordinates.");
      segments.push({
        id: `parks158:${f.properties!.OBJECTID}:${i}`,
        source: "live",
        kind: "trail",
        eligible: true,
        geometry,
        attributes: f.properties,
      });
    });
  }
  if (segments.some((s) => s.attributes?.trltyptxt === "Hiking"))
    warnings.push(
      "Eligible mapped infrastructure includes explicit public hiking trails, which may have natural surfaces. Coverage is not a pavement, condition, or accessibility assessment.",
    );
  return {
    segments,
    featureCount: features.length,
    countsByKind: { trail: acceptedFeatures },
    warnings,
  };
}
export async function fetchOfficialTrails(
  bounds: [number, number, number, number],
  fetcher: Fetcher = fetch,
) {
  if (
    bounds.some((n) => !Number.isFinite(n)) ||
    bounds[0] < -94.4 ||
    bounds[2] > -94 ||
    bounds[1] < 36.2 ||
    bounds[3] > 36.5 ||
    bounds[2] <= bounds[0] ||
    bounds[3] <= bounds[1] ||
    bounds[2] - bounds[0] > 0.08 ||
    bounds[3] - bounds[1] > 0.08
  )
    throw new Error("Trail query outside Bentonville study limits.");
  const deadline = AbortSignal.timeout(35000);
  const url = new URL(PARKS_TRAIL_LAYER + "/query");
  url.search = new URLSearchParams({
    f: "json",
    where: TRAIL_QUERY,
    geometry: bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    returnIdsOnly: "true",
  }).toString();
  const inventory = (await fetchJson(
    url.toString(),
    { signal: deadline },
    fetcher,
  )) as {
    objectIds?: unknown[] | null;
    objectIdFieldName?: string;
    exceededTransferLimit?: boolean;
  };
  const ids = await confirmedInventoryIds(
      inventory,
      url,
      deadline,
      fetcher,
      2000,
    ),
    features: unknown[] = [];
  for (let offset = 0; offset < ids.length; offset += 250) {
    const batch = ids.slice(offset, offset + 250),
      q = new URL(PARKS_TRAIL_LAYER + "/query");
    q.search = new URLSearchParams({
      f: "geojson",
      objectIds: batch.join(","),
      outFields: TRAIL_FIELDS.join(","),
      outSR: "4326",
      returnGeometry: "true",
      returnZ: "false",
      returnM: "false",
    }).toString();
    const result = (await fetchJson(
      q.toString(),
      { signal: deadline },
      fetcher,
    )) as {
      type?: string;
      features?: { properties?: { OBJECTID?: number } }[];
      exceededTransferLimit?: boolean;
      properties?: { exceededTransferLimit?: boolean };
    };
    const returned = result.features?.map((f) => f.properties?.OBJECTID) ?? [];
    if (
      result.type !== "FeatureCollection" ||
      !result.features ||
      result.exceededTransferLimit ||
      result.properties?.exceededTransferLimit ||
      returned.length !== batch.length ||
      new Set(returned).size !== batch.length ||
      batch.some((id) => !returned.includes(id))
    )
      throw new Error("Partial City trail geometry response.");
    features.push(...result.features);
  }
  return normalizeTrailFeatures(features);
}
export function getOfficialTrails(bounds: [number, number, number, number]) {
  return cached(
    `parks-trails-v1:${bounds.join(",")}`,
    24 * 60 * 60 * 1000,
    () => fetchOfficialTrails(bounds),
  );
}
export async function getPedestrianInventory(
  bounds: [number, number, number, number],
) {
  // Independent sources retrieve concurrently, keeping combined cold-start latency bounded.
  const [sidewalks, trails] = await Promise.all([
    getBentonvilleInfrastructure(bounds),
    getOfficialTrails(bounds),
  ]);
  const dedup = deduplicateInfrastructure(
    sidewalks.value.segments,
    trails.value.segments,
  );
  const dataset: InfrastructureDataset = {
    segments: dedup.segments,
    featureCount: sidewalks.value.featureCount + trails.value.featureCount,
    countsByKind: {
      ...sidewalks.value.countsByKind,
      trail:
        (sidewalks.value.countsByKind.trail ?? 0) +
        (trails.value.countsByKind.trail ?? 0),
    },
    warnings: [
      ...sidewalks.value.warnings,
      ...trails.value.warnings,
      `Overlapping infrastructure is deduplicated before coverage; ${dedup.duplicateFeatures} duplicate features removed and ${dedup.trimmedMeters.toFixed(2)}m of near-coincident supplemental linework trimmed.`,
    ],
  };
  return { dataset, sidewalks, trails };
}
