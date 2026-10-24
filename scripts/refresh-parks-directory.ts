import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = "https://www.bentonville.ar.gov",
  dir = "data/location-catalog/parks-directory",
  cacheDir = ".cache/pathsafe/parks-directory";
await mkdir(dir, { recursive: true });
await mkdir(cacheDir, { recursive: true });
async function page(path: string) {
  const file =
    cacheDir + "/" + path.replace(/^\//, "").replaceAll("/", "__") + ".html";
  let html: string;
  try {
    if ((await stat(file)).mtimeMs + 24 * 3600000 <= Date.now())
      throw new Error("Cached official page expired");
    html = await readFile(file, "utf8");
  } catch {
    await new Promise((r) => setTimeout(r, 200));
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error("Official parks page failed " + response.status);
    html = await response.text();
    await writeFile(file, html);
  }
  const fetchedAt = (await stat(file)).mtime.toISOString();
  return {
    fetchedAt,
    ...(JSON.parse(
      execFileSync("python3", ["scripts/extract-city-park-pages.py", file], {
        encoding: "utf8",
      }),
    ) as {
      links: { href: string; class: string; text: string }[];
      headings: { tag: string; text: string }[];
      addresses: string[];
    }),
  };
}
const directory = await page("/436/Parks");
const links = directory.links.filter(
  (l) =>
    l.class.split(/\s+/).includes("secondaryNavItem") &&
    /^\/\d+\/[a-z0-9-]+$/i.test(l.href),
);
if (
  links.length < 15 ||
  links.length > 100 ||
  new Set(links.map((l) => l.href)).size !== links.length
)
  throw new Error("Official parks directory structure changed");
const records = [];
for (const link of links) {
  const parsed = await page(link.href),
    title = parsed.headings.find((h) => h.tag === "h1")?.text.trim();
  const addresses = parsed.addresses;
  records.push({
    objectId: Number(link.href.split("/")[1]),
    name: title || link.text.trim(),
    address: addresses[0] ?? null,
    addressHeadings: addresses,
    page: base + link.href,
    fetchedAt: parsed.fetchedAt,
  });
  console.log(title, addresses);
}
await writeFile(
  dir + "/inventory.json",
  JSON.stringify(
    {
      fetchedAt: new Date(
        Math.min(...records.map((r) => Date.parse(r.fetchedAt))),
      ).toISOString(),
      directory: base + "/436/Parks",
      records,
    },
    null,
    2,
  ) + "\n",
);
const parcelFile = dir + "/parcel-evidence.json";
let parcelFresh = false;
try {
  const previous = JSON.parse(await readFile(parcelFile, "utf8"));
  parcelFresh = Date.parse(previous.fetchedAt) + 24 * 3600000 > Date.now();
} catch {
  /* First complete parcel inventory. */
}
if (!parcelFresh) {
  const sourceLayer =
    "https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/1";
  const response = await fetch(
      sourceLayer + "/query?f=json&where=1%3D1&returnIdsOnly=true",
      { signal: AbortSignal.timeout(20000) },
    ),
    idsBody = await response.json();
  if (
    !response.ok ||
    !Array.isArray(idsBody.objectIds) ||
    idsBody.exceededTransferLimit
  )
    throw new Error("Official park parcel IDs unavailable");
  const ids = idsBody.objectIds as number[];
  const featuresResponse = await fetch(sourceLayer + "/query", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      f: "geojson",
      objectIds: ids.join(","),
      outFields: "OBJECTID,FACILITY_NAME,CITY_USE",
      outSR: "4326",
      returnGeometry: "true",
    }),
    signal: AbortSignal.timeout(20000),
  });
  const collection = await featuresResponse.json();
  if (
    !featuresResponse.ok ||
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length !== ids.length ||
    collection.exceededTransferLimit ||
    new Set(
      collection.features.map(
        (f: { properties: { OBJECTID: number } }) => f.properties.OBJECTID,
      ),
    ).size !== ids.length ||
    collection.features.some(
      (f: { properties: { OBJECTID: number } }) =>
        !ids.includes(f.properties.OBJECTID),
    )
  )
    throw new Error("Incomplete official park parcel evidence");
  await writeFile(
    parcelFile,
    JSON.stringify({
      sourceLayer,
      fetchedAt: new Date().toISOString(),
      collection,
    }) + "\n",
  );
}
