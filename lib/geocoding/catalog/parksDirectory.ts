import { readFile } from "node:fs/promises";
import { withinPolygons, type Polygon } from "../area";
import { normalizeStreetTokens } from "../search";
import { nameKey, dedupeLocations } from "./dedupe";
import { normalizeOfficialLocation, type OfficialFeature } from "./normalize";
import { OFFICIAL_LOCATION_SOURCES } from "./sources";
import type { OfficialLocation, SourceInventory } from "./model";
export const PARKS_DIRECTORY_ID = "city-parks-directory";
export interface ParkDirectory {
  fetchedAt: string;
  directory: string;
  records: {
    objectId: number;
    name: string;
    address: string | null;
    page: string;
    fetchedAt?: string;
  }[];
}
export interface ParcelEvidence {
  sourceLayer: string;
  fetchedAt: string;
  collection: { type: string; features: OfficialFeature[] };
}
const directions = new Set([
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
]);
const addressCore = (s: string) =>
  normalizeStreetTokens(s)
    .split(" ")
    .filter((t) => !directions.has(t))
    .join(" ");
const fullIdentity = (s: string) => nameKey(s).split(" ").sort().join(" ");
const identity = (s: string) =>
  nameKey(s)
    .split(" ")
    .filter((t) => t !== "park")
    .sort()
    .join(" ");
export function reconcileParkDirectory(
  inventories: SourceInventory[],
  directory: ParkDirectory,
  parcels: ParcelEvidence,
): SourceInventory {
  const source = OFFICIAL_LOCATION_SOURCES.find(
    (s) => s.id === PARKS_DIRECTORY_ID,
  )!;
  const records = dedupeLocations(
    inventories.flatMap((i) => i.records),
  ).records;
  const named = records.filter((r) => r.kind === "place"),
    addresses = records.filter((r) => r.kind === "address");
  const byAddress = new Map<string, OfficialLocation[]>(),
    byCore = new Map<string, OfficialLocation[]>();
  for (const r of addresses)
    for (const [map, key] of [
      [byAddress, normalizeStreetTokens(r.label)],
      [byCore, addressCore(r.label)],
    ] as const) {
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
  const insidePreferred = (values: OfficialLocation[]) => {
    const inside = values.filter((r) => r.supported);
    return inside.length ? inside : values;
  };
  const resolved = directory.records.map((page) => {
    const roles = [
      "portable",
      "restroom",
      "toilet",
      "parking",
      "trailhead",
      "bridge",
      "access",
      "playground",
    ];
    const roleCompatible = (r: OfficialLocation) =>
      !roles.some(
        (role) =>
          nameKey(r.label).split(" ").includes(role) &&
          !nameKey(page.name).split(" ").includes(role),
      );
    const exactNames = insidePreferred(
      named.filter(
        (r) =>
          roleCompatible(r) &&
          [r.label, ...r.aliases].some(
            (n) => fullIdentity(n) === fullIdentity(page.name),
          ),
      ),
    );
    const names = exactNames.length
      ? exactNames
      : insidePreferred(
          named.filter(
            (r) =>
              roleCompatible(r) &&
              [r.label, ...r.aliases].some(
                (n) => identity(n) === identity(page.name),
              ),
          ),
        );
    let candidates = page.address
      ? insidePreferred(
          byAddress.get(normalizeStreetTokens(page.address)) ?? [],
        )
      : [];
    let method = "exact normalized GIS address";
    if (
      !candidates.length &&
      page.address &&
      !normalizeStreetTokens(page.address)
        .split(" ")
        .some((t) => directions.has(t))
    ) {
      candidates = insidePreferred(byCore.get(addressCore(page.address)) ?? []);
      method = "unique GIS address with omitted direction completed";
    }
    let coordinate: OfficialLocation | undefined;
    if (
      names.length === 1 &&
      (!candidates.length ||
        !page.address ||
        addressCore(names[0].address ?? "") === addressCore(page.address))
    ) {
      coordinate = names[0];
      method = "unique existing GIS destination identity";
    } else if (candidates.length === 1) coordinate = candidates[0];
    return { page, coordinate, method, parcels: [] as OfficialFeature[] };
  });
  const eligibleParcels = new Set(
    inventories
      .find((i) => i.id === "park-properties")
      ?.records.map((r) => r.provenance[0].sourceObjectId) ?? [],
  );
  for (const item of resolved)
    if (item.coordinate)
      item.parcels = parcels.collection.features.filter((f) => {
        const oid = Number(f.properties.OBJECTID ?? f.id);
        if (!eligibleParcels.has(oid) || !f.geometry) return false;
        const polygons = (
          f.geometry.type === "Polygon"
            ? [f.geometry.coordinates]
            : f.geometry.type === "MultiPolygon"
              ? f.geometry.coordinates
              : []
        ) as Polygon[];
        return (
          polygons.length > 0 &&
          withinPolygons(...item.coordinate!.point, polygons)
        );
      });
  const output: OfficialLocation[] = [],
    rejected: SourceInventory["rejected"] = [];
  for (const item of resolved) {
    const { page, coordinate } = item;
    if (!coordinate) {
      rejected.push({
        objectId: page.objectId,
        name: page.name,
        reason:
          "Official page has no unambiguous named GIS identity or verified GIS address point; no coordinate invented",
      });
      continue;
    }
    const normalized = normalizeOfficialLocation(
      {
        properties: {
          OBJECTID: page.objectId,
          name: page.name,
          address: page.address,
        },
        geometry: {
          type: "Point",
          coordinates: [coordinate.point[1], coordinate.point[0]],
        },
      },
      source,
    );
    if (!normalized.location) {
      rejected.push({
        objectId: page.objectId,
        name: page.name,
        reason: normalized.reason!,
      });
      continue;
    }
    const r = normalized.location,
      p = coordinate.provenance[0];
    r.provenance[0].sourceLayer = page.page;
    r.provenance[0].coordinateMethod = p.coordinateMethod;
    r.provenance[0].coordinateSource = {
      source: p.source,
      sourceLayer: p.sourceLayer,
      sourceObjectId: p.sourceObjectId,
      method: item.method,
    };
    if (item.method === "unique existing GIS destination identity")
      r.aliases.push(coordinate.label, ...coordinate.aliases);
    // A unique containing park parcel can establish a legacy park name, never an arbitrary nearby place.
    if (item.parcels.length === 1) {
      const parcel = item.parcels[0],
        oid = Number(parcel.properties.OBJECTID ?? parcel.id);
      const occupants = resolved.filter((other) =>
        other.parcels.some(
          (f) => Number(f.properties.OBJECTID ?? f.id) === oid,
        ),
      );
      if (occupants.length === 1) {
        r.aliases.push(String(parcel.properties.FACILITY_NAME));
        r.provenance[0].parcelIdentity = {
          sourceLayer: parcels.sourceLayer,
          sourceObjectId: oid,
        };
      }
    }
    r.aliases = [...new Set(r.aliases)].filter((n) => n && n !== r.label);
    output.push(r);
  }
  return {
    id: PARKS_DIRECTORY_ID,
    fetchedAt: directory.fetchedAt,
    expiresAt:
      Math.min(
        Date.parse(directory.fetchedAt),
        Date.parse(parcels.fetchedAt),
        ...inventories.map((i) => Date.parse(i.fetchedAt)),
      ) +
      24 * 3600000,
    rawCount: directory.records.length,
    records: output,
    rejected,
  };
}
export async function loadParkDirectory(inventories: SourceInventory[]) {
  if (!inventories.some((i) => i.records.length))
    throw new Error(
      "GIS coordinate sources unavailable for official park directory",
    );
  const directory = JSON.parse(
    await readFile(
      "data/location-catalog/parks-directory/inventory.json",
      "utf8",
    ),
  ) as ParkDirectory;
  const parcels = JSON.parse(
    await readFile(
      "data/location-catalog/parks-directory/parcel-evidence.json",
      "utf8",
    ),
  ) as ParcelEvidence;
  if (
    !Array.isArray(directory.records) ||
    directory.records.length < 1 ||
    parcels.collection?.type !== "FeatureCollection" ||
    !Array.isArray(parcels.collection.features)
  )
    throw new Error("Incomplete official park directory evidence");
  if (
    Date.parse(directory.fetchedAt) + 24 * 3600000 <= Date.now() ||
    Date.parse(parcels.fetchedAt) + 24 * 3600000 <= Date.now()
  )
    throw new Error(
      "Official parks directory evidence expired; refresh required",
    );
  return reconcileParkDirectory(inventories, directory, parcels);
}
