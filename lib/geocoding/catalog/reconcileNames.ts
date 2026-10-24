import verified from "@/data/location-catalog/verified-names.json";
import { normalizeSearchText, normalizeStreetTokens } from "../search";
import type { OfficialLocation } from "./model";

// Only reviewed address-name links retain their exact official annotation.
// A changed/removed annotation stops the name projection on the next refresh.
export function verifiedAddressAliases(
  source: string,
  oid: number,
  address: string,
  annotation: unknown,
) {
  const name = typeof annotation === "string" ? annotation.trim() : "";
  return verified.entries.some(
    (entry) =>
      entry.addressName &&
      entry.source === source &&
      entry.objectId === oid &&
      normalizeStreetTokens(entry.address) === normalizeStreetTokens(address) &&
      normalizeSearchText(entry.previousName) === normalizeSearchText(name),
  )
    ? [name]
    : [];
}

// Resolve verified generic/legacy names after source deduplication. Address-name
// entries enrich the original identity; the search index exposes name/address views.
// No entry can supply coordinates or override eligibility/search ranking.
export function reconcileOfficialNames(records: OfficialLocation[]) {
  return records.flatMap((record): OfficialLocation[] => {
    if (!record.supported) return [record];
    const entry = verified.entries.find(
      (entry) =>
        (entry.addressName
          ? record.kind === "address"
          : record.kind === "place") &&
        record.provenance.some(
          (p) =>
            p.source === entry.source && p.sourceObjectId === entry.objectId,
        ) &&
        (entry.address
          ? normalizeStreetTokens(record.address ?? record.label) ===
            normalizeStreetTokens(entry.address)
          : !record.address) &&
        [record.label, ...record.aliases].some(
          (name) =>
            normalizeSearchText(name) ===
            normalizeSearchText(entry.previousName),
        ),
    );
    if (!entry) return [record];
    const named: OfficialLocation = {
      ...record,
      label: entry.canonicalName,
      normalizedName: normalizeSearchText(entry.canonicalName),
      aliases: [
        ...new Set([record.label, ...record.aliases, ...(entry.aliases ?? [])]),
      ].filter((name) => name !== entry.canonicalName),
      provenance: record.provenance.map((p) =>
        p.source === entry.source && p.sourceObjectId === entry.objectId
          ? {
              ...p,
              nameEvidence: {
                reviewedAt: verified.reviewedAt,
                urls: entry.evidence,
              },
            }
          : p,
      ),
    };
    if (entry.addressName) {
      named.canonicalName = entry.canonicalName;
      named.namedType = entry.namedType as OfficialLocation["namedType"];
      named.label = record.label;
      named.normalizedName = record.normalizedName;
      return [named];
    }
    return [named];
  });
}
