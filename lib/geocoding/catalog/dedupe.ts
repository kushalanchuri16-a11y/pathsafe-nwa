import { normalizeSearchText, normalizeStreetTokens } from "../search";
import type { OfficialLocation } from "./model";
export function nameKey(value: string) {
  return normalizeSearchText(value.split(/\s+@\s+/)[0])
    .replace(/^historic site /, "")
    .replace(/\bmain campus\b/g, "")
    .replace(/\bjr\b/g, "junior")
    .replace(/\bctr\b/g, "center")
    .replace(/\bfirestation\b/g, "fire station")
    .replace(/\bdept\b/g, "department")
    .replace(/\bbldg\b/g, "building")
    .split(" ")
    .filter(
      (t) =>
        ![
          "bentonville",
          "city",
          "the",
          "of",
          "school",
          "public",
          "no",
        ].includes(t),
    )
    .join(" ")
    .replace(/\b([a-z]) ([a-z])\b/g, "$1$2");
}
function initialisms(value: string) {
  const words = normalizeSearchText(value)
    .split(" ")
    .filter((t) => !["the", "of"].includes(t));
  return [words, words.filter((t) => !["bentonville", "city"].includes(t))].map(
    (tokens) =>
      tokens.length === 1 ? tokens[0] : tokens.map((t) => t[0]).join(""),
  );
}
function schoolCampusStem(record: OfficialLocation) {
  return record.type === "school"
    ? normalizeSearchText(record.label)
        .replace(/\bmain campus\b/g, "")
        .replace(/\s+(north|south|east|west)(?: campus)?$/, "")
        .trim()
    : "";
}
function nearby(a: OfficialLocation, b: OfficialLocation) {
  if (
    Math.hypot(
      (a.point[0] - b.point[0]) * 111320,
      (a.point[1] - b.point[1]) * 90000,
    ) <=
    ((a.type === "school" && b.type === "school") ||
    (nameKey(a.label) === nameKey(b.label) &&
      nameKey(a.label)
        .split(" ")
        .filter((t) => !genericWords.has(t)).length >= 2)
      ? 200
      : 100)
  )
    return true;
  const contains = (r: OfficialLocation, p: OfficialLocation) =>
    r.provenance.some(
      (x) =>
        x.extent &&
        p.point[1] >= x.extent[0] &&
        p.point[1] <= x.extent[2] &&
        p.point[0] >= x.extent[1] &&
        p.point[0] <= x.extent[3],
    );
  if (contains(a, b) || contains(b, a)) return true;
  return a.provenance.some(
    (x) =>
      x.extent &&
      b.provenance.some(
        (y) =>
          y.extent &&
          x.extent![0] <= y.extent[2] &&
          x.extent![2] >= y.extent[0] &&
          x.extent![1] <= y.extent[3] &&
          x.extent![3] >= y.extent[1],
      ),
  );
}
const genericWords = new Set([
  "house",
  "hall",
  "building",
  "park",
  "school",
  "center",
  "station",
  "department",
  "facility",
  "plaza",
  "square",
  "trail",
  "elementary",
  "middle",
  "high",
  "junior",
  "museum",
  "art",
  "office",
  "north",
  "south",
  "east",
  "west",
  "public",
  "courts",
  "fields",
  "complex",
  "pool",
  "restroom",
  "bathroom",
  "entrance",
  "parking",
  "campus",
]);
function similar(a: OfficialLocation, b: OfficialLocation) {
  const left = new Set(nameKey(a.label).split(" ")),
    right = new Set(nameKey(b.label).split(" "));
  const qualifiers = [
    "annex",
    "trailhead",
    "access",
    "parking",
    "fields",
    "courts",
    "playground",
    "pavilion",
    "entrance",
    "north",
    "south",
    "east",
    "west",
    "technology",
    "building",
    "playground",
    "skate",
    "soccer",
    "tennis",
    "aquatic",
    "volleyball",
    "baseball",
    "restroom",
    "bathroom",
  ];
  if (qualifiers.some((t) => left.has(t) !== right.has(t))) return false;
  const shared = [...left].filter((t) => right.has(t));
  if (!shared.some((t) => !genericWords.has(t))) return false;
  // Numbered buildings and artworks remain distinct even when their descriptive names overlap.
  if (
    [...left].filter((t) => /^\d+$/.test(t)).join(" ") !==
    [...right].filter((t) => /^\d+$/.test(t)).join(" ")
  )
    return false;
  const common = shared.length;
  return (
    common / Math.max(left.size, right.size) >= 0.5 ||
    (a.type === b.type &&
      Math.min(left.size, right.size) >= 2 &&
      common === Math.min(left.size, right.size))
  );
}
export function dedupeLocations(records: OfficialLocation[]) {
  records = records.map((record) => ({
    ...record,
    // "A @ B" names A; it must not become an alias that makes B answer to A.
    aliases: record.aliases.filter((alias) => {
      const parts = alias.split(/\s+@\s+/);
      return (
        parts.length < 2 ||
        nameKey(parts.slice(1).join(" @ ")) !== nameKey(record.label) ||
        nameKey(parts[0]) === nameKey(record.label)
      );
    }),
  }));
  const parent = records.map((_, i) => i),
    byKey = new Map<string, number[]>();
  const root = (i: number): number =>
    parent[i] === i ? i : (parent[i] = root(parent[i]));
  const names = records.map((r) =>
    [r.label, ...r.aliases].map(nameKey).filter(Boolean),
  );
  // Union shared identities before choosing points so polygon evidence can bridge duplicate views.
  for (const [i, r] of records.entries()) {
    const prefix = r.supported ? "inside:" : "outside:";
    const keys =
      r.kind === "address"
        ? [prefix + "address:" + normalizeStreetTokens(r.label)]
        : [
            ...names[i].map((n) => prefix + "name:" + n),
            ...(schoolCampusStem(r)
              ? [prefix + "campus:" + schoolCampusStem(r)]
              : []),
            ...nameKey(r.label)
              .split(" ")
              .filter(
                (t) =>
                  t.length > 3 &&
                  ![
                    "park",
                    "school",
                    "center",
                    "elementary",
                    "middle",
                    "high",
                    "junior",
                    "building",
                    "playground",
                    "facility",
                    "trail",
                  ].includes(t),
              )
              .map((t) => prefix + "place-token:" + t),
            ...(r.type === "school"
              ? nameKey(r.label)
                  .split(" ")
                  .filter(
                    (t) =>
                      ![
                        "elementary",
                        "middle",
                        "junior",
                        "high",
                        "academy",
                      ].includes(t) && t.length > 2,
                  )
                  .map((t) => prefix + "school-token:" + t)
              : []),
            ...(r.address
              ? [prefix + "site:" + normalizeStreetTokens(r.address)]
              : []),
          ];
    for (const key of new Set(keys)) {
      const previous = byKey.get(key) ?? [];
      for (const j of previous) {
        const k = records[j];
        if (root(i) === root(j) || k.kind !== r.kind) continue;
        const sameName = names[j].some((n) => names[i].includes(n));
        const sameSite =
          !!r.address &&
          !!k.address &&
          normalizeStreetTokens(r.address) === normalizeStreetTokens(k.address);
        const shortIdentity =
          sameSite &&
          (/^[A-Z0-9]{2,5}$/.test(r.label) ||
            /^[A-Z0-9]{2,5}$/.test(k.label)) &&
          initialisms(r.label).some(
            (n) => n.length >= 2 && initialisms(k.label).includes(n),
          );
        const sameCampusPin =
          !!schoolCampusStem(r) &&
          schoolCampusStem(r) === schoolCampusStem(k) &&
          Math.hypot(
            (r.point[0] - k.point[0]) * 111320,
            (r.point[1] - k.point[1]) * 90000,
          ) <= 20;
        if (
          r.kind === "address" ||
          sameCampusPin ||
          (nearby(k, r) &&
            (sameName ||
              shortIdentity ||
              (r.type === k.type && similar(k, r)) ||
              (!!r.address &&
                !!k.address &&
                normalizeStreetTokens(r.address) ===
                  normalizeStreetTokens(k.address) &&
                similar(k, r))))
        )
          parent[root(i)] = root(j);
      }
      previous.push(i);
      byKey.set(key, previous);
    }
  }
  const groups = new Map<number, OfficialLocation[]>();
  records.forEach((r, i) => {
    const group = groups.get(root(i)) ?? [];
    group.push(r);
    groups.set(root(i), group);
  });
  const quality = (r: OfficialLocation) =>
    Math.max(
      ...r.provenance.map(
        (p) =>
          (p.coordinateMethod === "official point" ? 1000 : 0) + p.priority,
      ),
    );
  const result = [...groups.values()].map((group) => {
    group.sort(
      (a, b) =>
        quality(b) - quality(a) ||
        b.label.length - a.label.length ||
        a.id.localeCompare(b.id),
    );
    const winner = group[0];
    return {
      ...winner,
      address: group.find((r) => r.address)?.address,
      aliases: [
        ...new Set(group.flatMap((r) => [r.label, ...r.aliases])),
      ].filter((n) => n !== winner.label),
      provenance: group.flatMap((r) => r.provenance),
      type:
        winner.type === "other official place"
          ? (group.find((r) => r.type !== "other official place")?.type ??
            winner.type)
          : winner.type,
    };
  });
  return { records: result, duplicatesRemoved: records.length - result.length };
}
