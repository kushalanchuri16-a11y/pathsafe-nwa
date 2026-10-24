import { isWithinSupportedArea, withinPolygons, type Polygon } from "../area";
import {
  normalizeSearchText,
  normalizeStreetTokens,
  placeAliases,
} from "../search";
import type { Coordinate } from "@/types/routes";
import { verifiedAddressAliases } from "./reconcileNames";
import {
  sourceUrl,
  type LocationSource,
  type OfficialLocation,
  type LocationType,
  type SourceInventory,
} from "./model";
export interface OfficialFeature {
  id?: number;
  properties: Record<string, unknown>;
  geometry?: { type: string; coordinates: unknown } | null;
}
export function validateLocationCoordinate(
  raw: unknown,
  wkid = 4326,
): Coordinate | null {
  if (
    !Array.isArray(raw) ||
    raw.length !== 2 ||
    !raw.every((n) => typeof n === "number" && Number.isFinite(n))
  )
    return null;
  let [x, y] = raw as number[];
  if ([3857, 102100, 102113].includes(wkid)) {
    x = ((x / 6378137) * 180) / Math.PI;
    y = ((2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180) / Math.PI;
  } else if (wkid !== 4326) return null;
  return Math.abs(x) <= 180 && Math.abs(y) <= 90 ? [y, x] : null;
}
function polygonPoint(
  geometry: NonNullable<OfficialFeature["geometry"]>,
): { point: Coordinate; extent: number[] } | null {
  const polygons = (
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
  ) as Polygon[];
  if (!Array.isArray(polygons) || !polygons.length) return null;
  let best: { point: Coordinate; extent: number[]; width: number } | null =
    null;
  for (const polygon of polygons) {
    if (
      !Array.isArray(polygon) ||
      !polygon.length ||
      polygon.some(
        (r) =>
          !Array.isArray(r) ||
          r.length < 4 ||
          r.some((p) => !validateLocationCoordinate(p)),
      )
    )
      continue;
    const xs = polygon[0].map((p) => p[0]),
      ys = polygon[0].map((p) => p[1]);
    const extent = [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ];
    // Scan between vertices to choose an interior point, including around polygon holes.
    const levels = [...new Set(ys)].sort((a, b) => a - b);
    for (let j = 1; j < levels.length; j++) {
      const y = (levels[j - 1] + levels[j]) / 2,
        intersections: number[] = [];
      for (const ring of polygon)
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1],
            b = ring[i];
          if (a[1] > y !== b[1] > y)
            intersections.push(
              a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]),
            );
        }
      intersections.sort((a, b) => a - b);
      for (let i = 1; i < intersections.length; i += 2) {
        const width = intersections[i] - intersections[i - 1],
          x = (intersections[i] + intersections[i - 1]) / 2;
        if (
          width > 0 &&
          (!best || width > best.width) &&
          withinPolygons(y, x, [polygon])
        )
          best = { point: [y, x], extent, width };
      }
    }
  }
  return best;
}
export function classifyLocation(
  name: string,
  source: LocationSource,
  p: Record<string, unknown>,
): LocationType {
  const n = normalizeSearchText(name);
  if (source.kind === "address") return "address";
  if (source.kind === "business") return "other official place";
  if (source.kind === "art" || source.kind === "historic") return "landmark";
  if (source.kind === "parking") return "public facility";
  if (
    source.kind === "school" ||
    /\bschool\b|\belementary\b|\bacademy\b|\bjunior high\b|\bjr high\b/.test(n)
  )
    return "school";
  if (source.kind === "common" && /^apartment/i.test(String(p.TYPE ?? "")))
    return "other official place";
  if (/\bairport\b|thaden field house/.test(n)) return "airport";
  if (/\bmuseum\b|\bamazeum\b|crystal bridges/.test(n)) return "museum";
  if (/\bplaza\b|\bsquare\b/.test(n)) return "plaza";
  if (/\btrail\b|\btrailhead\b|\bentrance\b/.test(n))
    return "trail destination";
  if (
    /community center|recreation|aquatic|soccer|tennis|stadium|skate|volley|baseball|sports/.test(
      n,
    )
  )
    return "recreation";
  if (/\bpark\b/.test(n) || source.kind === "park" || p.CITY_USE === "PARK")
    return "park";
  if (
    /library|city hall|municipal|fire station|police|public works|utility billing/.test(
      n,
    ) ||
    source.kind === "facility"
  )
    return "civic facility";
  if (source.kind === "property") return "public facility";
  return "other official place";
}
export function schoolAliases(name: string, p: Record<string, unknown>) {
  let full = name.replace(/\bjr\.?\s+high\b/gi, "Junior High");
  if (/\b(elementary|middle|high)$/i.test(full)) full += " School";
  const aliases = [full];
  const stem = full.match(
    /^(.*?)\s+(elementary|middle|junior high|high)(?: school)?$/i,
  );
  if (stem) {
    const words = stem[1].split(/\s+/);
    if (words.length >= 2 && words.every((w) => /^[a-z]+$/i.test(w)))
      aliases.push(words.map((w) => w[0]).join("") + " " + stem[2]);
  }
  for (const [pattern, short] of [
    [/middle school/gi, "MS"],
    [/elementary(?: school)?/gi, "ES"],
    [/junior high(?: school)?/gi, "JHS"],
    [/high school/gi, "HS"],
  ] as const)
    aliases.push(full.replace(pattern, short));
  if (p.TYPE === "Middle" && !/\bmiddle\b/i.test(full))
    aliases.push(name + " Middle School");
  return aliases;
}
function officialDate(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim())
    return Number.isFinite(Number(value)) ? Number(value) : Date.parse(value);
  return NaN;
}
export function normalizeOfficialLocation(
  f: OfficialFeature,
  source: LocationSource,
): {
  location?: OfficialLocation;
  reason?: string;
  name: string;
  objectId: unknown;
} {
  const p = f.properties ?? {},
    get = (fields: string[]) =>
      fields.map((field) => String(p[field] ?? "").trim()).find(Boolean) ?? "";
  let name = get(source.names);
  const oid = p[source.objectIdField ?? "OBJECTID"] ?? f.id;
  const fail = (reason: string) => ({ reason, name, objectId: oid });
  if (
    !name ||
    !/[a-z]/i.test(name) ||
    /^(unnamed|unknown|null|n\/a|shape\.starea\(\))$/i.test(name)
  )
    return fail("No meaningful official destination name");
  if (
    source.kind === "business" &&
    (String(p.STATUS ?? "")
      .trim()
      .toUpperCase() !== "ISSUED" ||
      String(p.Home_occ ?? "")
        .trim()
        .toUpperCase() !== "NO")
  )
    return fail(
      "Business is not explicitly issued/non-home-occupation in the official registry",
    );
  if (
    source.kind === "parking" &&
    (String(p.PUBLIC_ID ?? "").trim() !== "Public Parking" ||
      String(p.WEEKDAY ?? "").trim() !== "Always Public" ||
      String(p.WEEKEND ?? "").trim() !== "Always Public")
  )
    return fail(
      "Parking is private, conditional, restricted or insufficiently documented as always public",
    );
  if (source.kind === "art" && officialDate(p.install_date) > Date.now())
    return fail("Artwork installation date is in the future");
  if (!Number.isInteger(oid)) return fail("Missing stable object ID");
  if (source.kind === "address" && /^DEMO$/i.test(String(p.MISC_INFO ?? "")))
    return fail("Explicitly demolished address record");
  if (
    source.kind === "address-place" &&
    /^(STE|APT)$/i.test(String(p.MISC_INFO ?? "")) &&
    !/club ?house|food t[ru]uck|food tuck|training|parking garage|city of bentonville|layout ctr|museum|library|school|park|community|center|pavilion|hotel|camp|recreation/i.test(
      name,
    )
  )
    return fail(
      "Suite/apartment annotation has no established destination identity (unit or telecom/utility tenant)",
    );
  if (
    source.kind === "address-place" &&
    /demo|future|temp|work trailer|house moved|chg .*address|substation|sub sta|water meter|traffic|parking lot|^pg\d|^trug\d|^barn$|^inact|^meter|^west building$|^east building$|permit|water tower|water tanks|water station|wastewater|garbage|mercury|^tower$|^elec$|radio tower|trash|dumpster|storage|maintenance|maint b|^maint |^test$|^pre$|^sl-\d|^ct\d|construction trailer|^school$|^park$|^city of bentonville$|^pool( house)?$|^swimming pool$|^shop$|^cart barn$|^stabl$|^rented shop$|^barn office living$|^north building$|^south building$|^atm$|hang[ae]r|^roundabout$|^fountain$/i.test(
      name,
    )
  )
    return fail(
      "Administrative/temporary/utility description, not a named destination",
    );
  if (
    source.kind === "common" &&
    (/proposed|future|closed|demolished/i.test(String(p.STATUS ?? "")) ||
      /\bpre\b|proposed|future/i.test(String(p.TYPE ?? "")))
  )
    return fail("Explicit non-current status");
  if (
    source.kind === "poi" &&
    (/^(no|false|0)$/i.test(String(p.visible ?? "")) ||
      /^no$/i.test(String(p.Approved ?? "")))
  )
    return fail("Explicitly hidden or unapproved POI");
  if (
    source.kind === "art" &&
    Number.isFinite(officialDate(p.removal_date)) &&
    officialDate(p.removal_date) <= Date.now()
  )
    return fail("Artwork has a recorded removal date");
  if (
    source.kind === "property" &&
    (/\?|substation|lift station|storage|bomb squad|street row|alley road|^road$/i.test(
      name,
    ) ||
      p.CITY_USE === "ROW")
  )
    return fail(
      "Utility/restricted asset or uncertain parcel label, not a visitor destination",
    );
  if (source.kind === "facility") name = "Bentonville Fire " + name;
  let point: Coordinate | null = null,
    extent: number[] | undefined,
    coordinateMethod: "official point" | "polygon interior" = "official point";
  if (f.geometry?.type === "Point")
    point = validateLocationCoordinate(f.geometry.coordinates);
  else if (
    f.geometry &&
    ["Polygon", "MultiPolygon"].includes(f.geometry.type)
  ) {
    const derived = polygonPoint(f.geometry);
    if (derived) {
      point = derived.point;
      extent = derived.extent;
      coordinateMethod = "polygon interior";
    }
  }
  if (!point) return fail("Invalid or unsupported geometry/coordinate");
  const id =
    source.id === "common"
      ? `city-place:${oid}`
      : source.id === "city-addresses"
        ? `city-address:${oid}`
        : `${source.id}:${oid}`;
  const type = classifyLocation(name, source, p),
    aliases = [...(placeAliases[id] ?? [])];
  if (source.kind === "address")
    aliases.push(
      ...verifiedAddressAliases(source.id, oid as number, name, p.COMMENT),
    );
  if (source.kind === "historic") {
    aliases.push(name);
    name = `Historic site · ${name}`;
  }
  if (type === "school") aliases.push(...schoolAliases(name, p));
  if (id === "city-place:124") name = `Bentonville Municipal Airport · ${name}`;
  const address = source.addressParts
    ? source.addressParts
        .map((f) => String(p[f] ?? "").trim())
        .filter(Boolean)
        .join(" ")
    : get(source.addresses ?? []);
  const location: OfficialLocation = {
    id,
    label: name,
    point,
    address: address || undefined,
    kind: source.kind === "address" ? "address" : "place",
    type,
    aliases: [...new Set(aliases)],
    normalizedName: normalizeSearchText(name),
    supported: isWithinSupportedArea(...point),
    attribution: "City of Bentonville GIS",
    provenance: [
      {
        source: source.id,
        sourceLayer: sourceUrl(source),
        sourceObjectId: oid as number,
        coordinateMethod,
        priority: source.priority,
        extent,
      },
    ],
  };
  return { location, name, objectId: oid };
}
export function normalizeSourceInventory(
  features: OfficialFeature[],
  source: LocationSource,
  fetchedAt = new Date().toISOString(),
): SourceInventory {
  const records: OfficialLocation[] = [],
    rejected: SourceInventory["rejected"] = [];
  for (const f of features) {
    const r = normalizeOfficialLocation(f, source);
    if (r.location) records.push(r.location);
    else
      rejected.push({ objectId: r.objectId, name: r.name, reason: r.reason! });
  }
  return {
    id: source.id,
    fetchedAt,
    records,
    rawCount: features.length,
    rejected,
  };
}
export const canonicalAddress = (s: string) => normalizeStreetTokens(s);
