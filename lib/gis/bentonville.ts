import type {
  Coordinate,
  InfrastructureKind,
  InfrastructureSegment,
} from "@/types/routes";
import { validLine } from "@/lib/analysis/geometry";
import { fetchJson, type Fetcher } from "@/lib/server/http";
import { cached } from "@/lib/server/cache";
export const BENTONVILLE_LAYER =
  "https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174";
export const GIS_FIELDS = [
  "OBJECTID",
  "trltyptxt",
  "facdescrip",
  "surftype",
  "bikesallow",
  "useaccess",
  "Closure_Status",
];
export interface InfrastructureDataset {
  segments: InfrastructureSegment[];
  featureCount: number;
  countsByKind: Record<string, number>;
  warnings: string[];
}
type Properties = Record<string, string | number | null>;
export function classifyInfrastructure(p: Properties): {
  kind: InfrastructureKind;
  eligible: boolean;
  exclusion?: string;
} {
  const text = (key: string) =>
      String(p[key] ?? "")
        .trim()
        .toLowerCase(),
    cls = text("trltyptxt"),
    facility = text("facdescrip"),
    surface = text("surftype");
  let kind: InfrastructureKind =
    cls === "sidewalk"
      ? "sidewalk"
      : cls.includes("cross")
        ? "crossing"
        : "other";
  if (
    text("bikesallow") === "bike only" ||
    facility === "shared roadway" ||
    cls.includes("bicycle") ||
    cls.includes("bike")
  )
    kind = "bicycle";
  else if (
    (facility.includes("trail") ||
      facility === "shared use" ||
      facility === "razorback greenway") &&
    ["concrete", "asphalt", "paved"].includes(surface) &&
    !cls.includes("cross")
  )
    kind = "trail";
  if (text("Closure_Status") === "closed" || facility === "closed")
    return { kind, eligible: false, exclusion: "Reported closed" };
  if (text("useaccess") !== "public")
    return {
      kind,
      eligible: false,
      exclusion: "Public access not established",
    };
  if (!["sidewalk", "trail"].includes(kind))
    return {
      kind,
      eligible: false,
      exclusion: "Not classified as sidewalk or paved/shared-use trail",
    };
  return { kind, eligible: true };
}
export function normalizeFeatures(features: unknown[]): InfrastructureDataset {
  const segments: InfrastructureSegment[] = [],
    countsByKind: Record<string, number> = {};
  for (const raw of features) {
    const f = raw as {
      properties?: Properties;
      geometry?: { type?: string; coordinates?: unknown };
    };
    if (
      !f.properties ||
      !Number.isInteger(f.properties.OBJECTID) ||
      !f.geometry
    )
      throw new Error("Invalid GIS feature; analysis incomplete.");
    const coordinates = f.geometry.coordinates;
    const paths =
      f.geometry.type === "LineString"
        ? [coordinates]
        : f.geometry.type === "MultiLineString" && Array.isArray(coordinates)
          ? coordinates
          : null;
    if (!paths?.length)
      throw new Error(
        "Unsupported or empty GIS geometry; analysis incomplete.",
      );
    const classification = classifyInfrastructure(f.properties);
    countsByKind[classification.kind] =
      (countsByKind[classification.kind] ?? 0) + 1;
    paths.forEach((line, i) => {
      if (!Array.isArray(line)) throw new Error("Invalid GIS geometry.");
      const geometry = line.map((p) =>
        Array.isArray(p) && p.length >= 2 ? [p[1], p[0]] : null,
      ) as Coordinate[];
      if (
        !validLine(geometry) ||
        geometry.some(
          ([lat, lon]) =>
            lat < 36.2 || lat > 36.5 || lon < -94.4 || lon > -94.0,
        )
      )
        throw new Error("Invalid GIS geometry; analysis incomplete.");
      segments.push({
        id: `${f.properties!.OBJECTID}:${i}`,
        geometry,
        source: "live",
        ...classification,
        attributes: Object.fromEntries(
          GIS_FIELDS.map((key) => [key, f.properties![key] ?? null]),
        ),
      });
    });
  }
  const warnings: string[] = [];
  if (!features.length)
    warnings.push(
      "No mapped infrastructure features were returned near these routes. Zero mapped coverage does not establish that facilities are absent.",
    );
  if (segments.some((s) => s.exclusion === "Public access not established"))
    warnings.push(
      "Features without explicit public access are excluded from coverage.",
    );
  return { segments, featureCount: features.length, countsByKind, warnings };
}
export async function fetchBentonville(
  bounds: [number, number, number, number],
  fetcher: Fetcher = fetch,
): Promise<InfrastructureDataset> {
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
    throw new Error("GIS query outside supported demo area.");
  const deadline = AbortSignal.timeout(35000);
  const idsUrl = new URL(BENTONVILLE_LAYER + "/query");
  idsUrl.search = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnIdsOnly: "true",
  }).toString();
  const data = (await fetchJson(
    idsUrl.toString(),
    { signal: deadline },
    fetcher,
  )) as {
    objectIds?: unknown[];
    exceededTransferLimit?: boolean;
  };
  if (
    !Array.isArray(data.objectIds) ||
    data.exceededTransferLimit ||
    data.objectIds.some((id) => !Number.isInteger(id)) ||
    data.objectIds.length > 10000
  )
    throw new Error("Incomplete GIS record inventory.");
  const ids = [...new Set(data.objectIds as number[])].sort((a, b) => a - b),
    features: unknown[] = [];
  // ArcGIS IDs-only queries are not capped by MaxRecordCount. Fetch exact ID batches
  // below the layer's 2,000-record limit; verify every ID to detect partial responses.
  for (let offset = 0; offset < ids.length; offset += 250) {
    const batch = ids.slice(offset, offset + 250),
      url = new URL(BENTONVILLE_LAYER + "/query");
    url.search = new URLSearchParams({
      f: "geojson",
      objectIds: batch.join(","),
      outFields: GIS_FIELDS.join(","),
      outSR: "4326",
      returnGeometry: "true",
      returnZ: "false",
      returnM: "false",
    }).toString();
    const result = (await fetchJson(
      url.toString(),
      { signal: deadline },
      fetcher,
    )) as {
      type?: string;
      features?: { properties?: Properties }[];
      exceededTransferLimit?: boolean;
      properties?: { exceededTransferLimit?: boolean };
    };
    if (
      result.type !== "FeatureCollection" ||
      !Array.isArray(result.features) ||
      result.exceededTransferLimit ||
      result.properties?.exceededTransferLimit
    )
      throw new Error("Incomplete GIS geometry response.");
    const returned = result.features.map((f) => f.properties?.OBJECTID);
    if (
      returned.length !== batch.length ||
      new Set(returned).size !== batch.length ||
      batch.some((id) => !returned.includes(id))
    )
      throw new Error("Partial GIS data: requested features are missing.");
    features.push(...result.features);
  }
  return normalizeFeatures(features);
}
export function getBentonvilleInfrastructure(
  bounds: [number, number, number, number],
) {
  return cached(`bentonville-v2:${bounds.join(",")}`, 24 * 60 * 60 * 1000, () =>
    fetchBentonville(bounds),
  );
}
