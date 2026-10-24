import { createHash } from "node:crypto";
import boundary from "@/data/boundary/bentonville.json";
import { isWithinSupportedArea } from "../area";
import { normalizeSearchText } from "../search";
import { validateLocationCoordinate, schoolAliases } from "./normalize";
import { OFFICIAL_LOCATION_SOURCES } from "./sources";
import {
  sourceUrl,
  type SourceInventory,
  type OfficialLocation,
} from "./model";
export const BOUNDARY_VERSION = createHash("sha256")
  .update(JSON.stringify(boundary))
  .digest("hex");
export interface CatalogSnapshot {
  schemaVersion: number;
  createdAt: string;
  boundaryVersion: string;
  inventories: {
    id: string;
    fetchedAt: string;
    expiresAt?: number;
    rawCount: number;
    rejected: SourceInventory["rejected"];
    rows: unknown[][];
  }[];
}
export function packSnapshot(inventories: SourceInventory[]): CatalogSnapshot {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    boundaryVersion: BOUNDARY_VERSION,
    inventories: inventories.map((i) => ({
      id: i.id,
      fetchedAt: i.fetchedAt,
      expiresAt: i.expiresAt,
      rawCount: i.rawCount,
      rejected: i.rejected,
      rows: i.records.map((r) => [
        r.id,
        r.label,
        ...r.point,
        r.address ?? null,
        r.type,
        r.aliases,
        r.supported,
        r.provenance[0].sourceObjectId,
        r.provenance[0].coordinateMethod,
        r.provenance[0].extent ?? null,
        ...(r.provenance[0].coordinateSource
          ? [
              {
                sourceLayer: r.provenance[0].sourceLayer,
                coordinateSource: r.provenance[0].coordinateSource,
                parcelIdentity: r.provenance[0].parcelIdentity,
              },
            ]
          : []),
      ]),
    })),
  };
}
export function unpackSnapshot(snapshot: CatalogSnapshot): SourceInventory[] {
  if (snapshot.schemaVersion !== 1) return [];
  return snapshot.inventories.flatMap((i) => {
    const source = OFFICIAL_LOCATION_SOURCES.find((s) => s.id === i.id);
    if (!source) return [];
    const records: OfficialLocation[] = [];
    for (const row of i.rows) {
      const [
        id,
        label,
        lat,
        lon,
        address,
        type,
        aliases,
        supported,
        oid,
        method,
        extent,
        extra,
      ] = row;
      const point = validateLocationCoordinate([lon, lat]);
      if (
        !point ||
        typeof id !== "string" ||
        typeof label !== "string" ||
        !Array.isArray(aliases) ||
        !Number.isInteger(oid)
      )
        throw new Error("Invalid official catalog snapshot");
      records.push({
        id,
        label,
        point,
        address: typeof address === "string" ? address : undefined,
        type: type as OfficialLocation["type"],
        aliases: [
          ...new Set([
            ...(aliases as string[]),
            ...(type === "school" ? schoolAliases(label, {}) : []),
          ]),
        ],
        supported:
          snapshot.boundaryVersion === BOUNDARY_VERSION
            ? supported === true
            : isWithinSupportedArea(...point),
        normalizedName: normalizeSearchText(label),
        kind: source.kind === "address" ? "address" : "place",
        attribution: "City of Bentonville GIS",
        provenance: [
          {
            source: source.id,
            sourceLayer:
              (extra as { sourceLayer?: string } | undefined)?.sourceLayer ??
              sourceUrl(source),
            sourceObjectId: oid as number,
            coordinateMethod: method as "official point" | "polygon interior",
            priority: source.priority,
            extent: Array.isArray(extent) ? (extent as number[]) : undefined,
            coordinateSource: (
              extra as
                | {
                    coordinateSource?: OfficialLocation["provenance"][number]["coordinateSource"];
                  }
                | undefined
            )?.coordinateSource,
            parcelIdentity: (
              extra as
                | {
                    parcelIdentity?: OfficialLocation["provenance"][number]["parcelIdentity"];
                  }
                | undefined
            )?.parcelIdentity,
          },
        ],
      });
    }
    return [
      {
        id: i.id,
        fetchedAt: i.fetchedAt,
        expiresAt: i.expiresAt,
        rawCount: i.rawCount,
        rejected: i.rejected,
        records,
      },
    ];
  });
}
