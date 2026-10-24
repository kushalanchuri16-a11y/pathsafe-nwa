import {
  normalizeSearchText,
  normalizeStreetTokens,
  scoreCandidate,
  tokenizeSearch,
  streetWords,
  tokenSimilarity,
} from "../search";
import type { OfficialLocation, UnifiedCatalog } from "./model";
export interface CatalogIndex {
  catalog: UnifiedCatalog;
  named: OfficialLocation[];
  numbers: Map<string, OfficialLocation[]>;
  streets: Map<string, OfficialLocation[]>;
  frequency: Map<string, number>;
}
export function buildSearchIndex(catalog: UnifiedCatalog): CatalogIndex {
  const named: OfficialLocation[] = [],
    numbers = new Map<string, OfficialLocation[]>(),
    streets = new Map<string, OfficialLocation[]>(),
    frequency = new Map<string, number>();
  for (const r of catalog.records) {
    if (!r.supported) continue;
    if (r.kind !== "address") {
      named.push(r);
      for (const t of tokenizeSearch(r.label))
        frequency.set(t, (frequency.get(t) ?? 0) + 1);
      continue;
    }
    if (r.canonicalName) {
      named.push({
        ...r,
        label: r.canonicalName,
        normalizedName: normalizeSearchText(r.canonicalName),
        kind: "place",
        type: r.namedType ?? "other official place",
        address: r.label,
      });
      for (const t of tokenizeSearch(r.canonicalName))
        frequency.set(t, (frequency.get(t) ?? 0) + 1);
    }
    const tokens = tokenizeSearch(r.label, true),
      number = tokens.find((t) => /^\d+$/.test(t)),
      street = tokens
        .filter((t) => !/^\d+$/.test(t) && !streetWords.has(t))
        .join(" ");
    if (number) {
      const a = numbers.get(number) ?? [];
      a.push(r);
      numbers.set(number, a);
    }
    const a = streets.get(street) ?? [];
    a.push(r);
    streets.set(street, a);
  }
  return { catalog, named, numbers, streets, frequency };
}
export function rankLocationCandidates(
  query: string,
  candidates: OfficialLocation[],
  index: CatalogIndex,
) {
  const seen = new Set<string>();
  const numbered = tokenizeSearch(query, true).some((t) => /^\d+$/.test(t));
  return candidates
    .map((r) => ({
      r,
      score:
        scoreCandidate(query, r, index.frequency) +
        (numbered
          ? r.kind === "address"
            ? 0.01
            : 0
          : r.kind === "place"
            ? 0.01
            : 0),
    }))
    .filter(({ score }) => score >= 75)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.r.label.localeCompare(b.r.label) ||
        a.r.id.localeCompare(b.r.id),
    )
    .filter(({ r }) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .slice(0, 8)
    .map(({ r }) => r);
}
export function searchUnifiedCatalog(query: string, index: CatalogIndex) {
  const q = query.trim();
  if (q.length < 3 || q.length > 120 || !normalizeSearchText(q)) return [];
  const tokens = tokenizeSearch(q, true).filter(
    (t) =>
      ![
        "bentonville",
        "arkansas",
        "ar",
        "city",
        "of",
        "the",
        "in",
        "at",
      ].includes(t),
  );
  const number = tokens.find((t) => /^\d+$/.test(t));
  let addresses: OfficialLocation[] = [];
  if (number) addresses = index.numbers.get(number) ?? [];
  else {
    const important = tokens.filter((t) => !streetWords.has(t));
    if (important.length) {
      // Narrow address candidates by the cached street vocabulary before fuzzy ranking.
      const matched = [...index.streets.keys()].filter((street) =>
        important.every((t) =>
          tokenizeSearch(street).some((c) => tokenSimilarity(t, c) >= 0.76),
        ),
      );
      for (const street of matched)
        addresses.push(...index.streets.get(street)!);
    }
  }
  // Named places and relevant addresses compete in one list across every source.
  return rankLocationCandidates(q, [...index.named, ...addresses], index);
}
export const catalogQueryKey = (q: string) => normalizeStreetTokens(q);
