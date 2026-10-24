import type { LocationResult } from "./provider";

const streets: Record<string, string> = {
  st: "street",
  rd: "road",
  ave: "avenue",
  blvd: "boulevard",
  dr: "drive",
  ln: "lane",
  ct: "court",
  cir: "circle",
  pkwy: "parkway",
  hwy: "highway",
  trl: "trail",
  pl: "place",
  ter: "terrace",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
};
export const streetWords = new Set([
  ...Object.keys(streets),
  ...Object.values(streets),
  "way",
]);
const stopWords = new Set(["the", "of", "at", "in", "city", "arkansas", "ar"]);
// Stable IDs in the existing official Common_Names layer; coordinates always
// come from the current City record, never from this vocabulary.
export const placeAliases: Record<string, string[]> = {
  "city-place:44": ["Crystal Bridges Museum of American Art", "crystal bridge"],
  "city-place:68": ["Bentonville Public Library", "public library"],
  "city-place:67": ["Lawrence Plaza"],
  "city-place:17": ["Bentonville Community Center", "community center"],
  "city-place:124": [
    "Bentonville Municipal Airport",
    "municipal airport",
    "bentonville airport",
    "Thaden Field",
    "VBT",
  ],
};
// Compare normalized whole words without replacing letters inside unrelated words.
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b([ns])\s*\.\s*([ew])\s*\./g, "$1$2")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function normalizeStreetTokens(text: string): string {
  return normalizeSearchText(text)
    .split(" ")
    .map((t) => streets[t] ?? t)
    .join(" ");
}
export function tokenizeSearch(text: string, address = false): string[] {
  return [
    ...new Set(
      (address ? normalizeStreetTokens(text) : normalizeSearchText(text))
        .split(" ")
        .filter(Boolean),
    ),
  ];
}
export function isAddressLikeQuery(text: string): boolean {
  const tokens = tokenizeSearch(text, true);
  return (
    tokens.some((t) => /^\d+$/.test(t)) ||
    (tokens.some((t) => streetWords.has(t)) &&
      tokens.some((t) => !streetWords.has(t)))
  );
}
export function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length];
}
export function tokenSimilarity(query: string, candidate: string): number {
  if (query === candidate) return 1;
  if (/^\d+$/.test(query) || /^\d+$/.test(candidate)) return 0;
  if (query.length >= 3 && candidate.startsWith(query)) return 0.94;
  if (query.length < 4 || Math.abs(query.length - candidate.length) > 2)
    return 0;
  const distance = editDistance(query, candidate);
  return distance <= (Math.min(query.length, candidate.length) >= 7 ? 2 : 1)
    ? distance === 1
      ? 0.84
      : 0.76
    : 0;
}
function queryTokens(query: string, address: boolean) {
  return tokenizeSearch(query, address).filter(
    (t) =>
      !stopWords.has(t) &&
      // City context is optional, including a clear prefix or one-character typo.
      !(t.length >= 6 && tokenSimilarity(t, "bentonville") >= 0.84),
  );
}
export function scoreCandidate(
  query: string,
  candidate: LocationResult,
  frequency = new Map<string, number>(),
): number {
  const address = candidate.kind === "address";
  const tokens = queryTokens(query, address);
  if (!tokens.length) return 0;
  const variants = [candidate.label, ...(placeAliases[candidate.id] ?? [])];
  return Math.max(
    ...variants.map((variant, index) => {
      const target = tokenizeSearch(variant, address);
      if (address) {
        const numbers = tokens.filter((t) => /^\d+$/.test(t));
        if (numbers.some((t) => t !== target[0])) return 0;
      }
      const matches = tokens.map((t) =>
        Math.max(0, ...target.map((c) => tokenSimilarity(t, c))),
      );
      // Every meaningful token needs evidence. No "least bad" fallback.
      if (matches.some((m) => m === 0)) return 0;
      if (tokens.length === 1 && matches[0] < 0.94 && tokens[0].length < 6)
        return 0;
      let weighted = 0,
        weights = 0;
      tokens.forEach((t, i) => {
        const weight = /^\d+$/.test(t) ? 5 : 1 + 1 / (frequency.get(t) ?? 1);
        weighted += matches[i] * weight;
        weights += weight;
      });
      const similarity = weighted / weights;
      // Minimum 75, high confidence >=94. Exact/prefix outrank fuzzy.
      if (similarity < 0.76) return 0;
      if (normalizeSearchText(query) === normalizeSearchText(variant))
        return index === 0 ? 110 : 107;
      return (
        100 * similarity +
        (address && tokens.some((t) => /^\d+$/.test(t)) ? 3 : 0)
      );
    }),
  );
}
export function dedupeCandidates(
  candidates: LocationResult[],
): LocationResult[] {
  const kept: LocationResult[] = [];
  for (const c of candidates) {
    if (
      kept.some(
        (k) =>
          k.id === c.id ||
          (k.kind === "address" &&
            c.kind === "address" &&
            normalizeStreetTokens(k.label) ===
              normalizeStreetTokens(c.label)) ||
          (Math.hypot(
            (k.point[0] - c.point[0]) * 111320,
            (k.point[1] - c.point[1]) * 90000,
          ) <= 10 &&
            (normalizeSearchText(k.label) === normalizeSearchText(c.label) ||
              (!!k.address &&
                normalizeStreetTokens(k.address) ===
                  normalizeStreetTokens(c.address ?? "")))),
      )
    )
      continue;
    kept.push(c);
  }
  return kept;
}
export function rankCandidates(
  query: string,
  candidates: LocationResult[],
): LocationResult[] {
  const frequency = new Map<string, number>();
  for (const c of candidates)
    for (const t of tokenizeSearch(c.label))
      frequency.set(t, (frequency.get(t) ?? 0) + 1);
  return dedupeCandidates(
    candidates
      .map((c) => ({ c, score: scoreCandidate(query, c, frequency) }))
      .filter((r) => r.score >= 75)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.c.label.localeCompare(b.c.label) ||
          a.c.id.localeCompare(b.c.id),
      )
      .map((r) => r.c),
  ).slice(0, 8);
}
