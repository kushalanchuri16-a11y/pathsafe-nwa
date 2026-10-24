import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOfficialLocation,
  normalizeSourceInventory,
  validateLocationCoordinate,
  type OfficialFeature,
} from "../lib/geocoding/catalog/normalize";
import { OFFICIAL_LOCATION_SOURCES } from "../lib/geocoding/catalog/sources";
import {
  buildUnifiedLocationCatalog,
  fetchOfficialLocationSources,
} from "../lib/geocoding/catalog";
import { fetchOfficialInventory } from "../lib/geocoding/catalog/inventory";
import {
  buildSearchIndex,
  searchUnifiedCatalog,
} from "../lib/geocoding/catalog/search";
import {
  packSnapshot,
  unpackSnapshot,
} from "../lib/geocoding/catalog/snapshot";
import { dedupeLocations } from "../lib/geocoding/catalog/dedupe";
import { scoreCandidate } from "../lib/geocoding/search";
import { validateSelection } from "../lib/geocoding/validate";
import { catalogFetcher } from "./fixtures/catalog";
const source = (id: string) =>
  OFFICIAL_LOCATION_SOURCES.find((s) => s.id === id)!;
const feature = (
  id: number,
  properties: Record<string, unknown>,
  point = [-94.208, 36.373],
): OfficialFeature => ({
  properties: { OBJECTID: id, ...properties },
  geometry: { type: "Point", coordinates: point },
});
const record = (id: string, properties: Record<string, unknown>, oid = 1) =>
  normalizeOfficialLocation(feature(oid, properties), source(id)).location!;
test("normalizes whole source categories with traceable identities and official coordinates", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["common", { COMMON_NAME: "Public Library" }, "civic facility"],
    ["schools-7", { LABEL: "Creekside Middle School" }, "school"],
    ["parks", { EX_ADD: "Example Park", ADDRESS: "100 Main St" }, "park"],
    ["fire-stations", { Description: "Station 1" }, "civic facility"],
    ["public-art", { title_artwork: "Untitled" }, "landmark"],
    ["city-addresses", { ADDRESS: "100 N Main St" }, "address"],
    [
      "address-destinations",
      {
        EX_ADD: "Example Event Pavilion",
        ADDRESS: "100 Main St",
        MISC_INFO: "M",
      },
      "other official place",
    ],
  ];
  for (const [id, p, type] of cases) {
    const r = record(id, p);
    assert.equal(r.type, type);
    assert.deepEqual(r.point, [36.373, -94.208]);
    assert.equal(r.provenance[0].source, id);
    assert.equal(r.provenance[0].sourceObjectId, 1);
    assert.ok(
      r.provenance[0].sourceLayer.startsWith("https://gis.bentonvillear.com/"),
    );
    assert.ok(r.supported);
  }
});
test("normalizes historical lower-case IDs and alternate billing OID fields", () => {
  for (const [id, p] of [
    ["historic-sites", { objectid: 19, name: "Historic House" }],
    ["billing-addresses", { OBJECTID_1: 20, ADDRESS: "200 Main St" }],
  ] as const) {
    const r = normalizeOfficialLocation(
      {
        properties: p,
        geometry: { type: "Point", coordinates: [-94.208, 36.373] },
      },
      source(id),
    ).location!;
    assert.ok(r);
    assert.equal(r.provenance[0].sourceObjectId, Object.values(p)[0]);
  }
});
test("coordinate conversion handles WGS84 and Web Mercator without coordinate-order guessing", () => {
  const lon = -94.208,
    lat = 36.373,
    x = ((lon * Math.PI) / 180) * 6378137,
    y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 6378137;
  for (const wkid of [3857, 102100, 102113]) {
    const result = validateLocationCoordinate([x, y], wkid)!;
    assert.ok(Math.abs(result[0] - lat) < 1e-10);
    assert.ok(Math.abs(result[1] - lon) < 1e-10);
  }
  for (const point of [
    [NaN, 36],
    [Infinity, 36],
    [-94, 95],
    [36, -94],
    [181, 36],
    null,
    [0],
    [0, 0, 0],
  ])
    assert.equal(validateLocationCoordinate(point), null);
  assert.equal(validateLocationCoordinate([x, y], 9999), null);
});
test("polygon destinations use an actual interior point outside their holes", () => {
  const outer = [
    [-94.21, 36.37],
    [-94.2, 36.37],
    [-94.2, 36.38],
    [-94.21, 36.38],
    [-94.21, 36.37],
  ];
  const hole = [
    [-94.208, 36.372],
    [-94.202, 36.372],
    [-94.202, 36.378],
    [-94.208, 36.378],
    [-94.208, 36.372],
  ];
  const r = normalizeOfficialLocation(
    {
      properties: { OBJECTID: 1, FACILITY_NAME: "Sample Park" },
      geometry: { type: "Polygon", coordinates: [outer, hole] },
    },
    source("park-properties"),
  ).location!;
  assert.ok(r);
  assert.equal(r.provenance[0].coordinateMethod, "polygon interior");
  assert.ok(
    !(
      r.point[0] > 36.372 &&
      r.point[0] < 36.378 &&
      r.point[1] > -94.208 &&
      r.point[1] < -94.202
    ),
  );
});
test("placeholder, invalid, demolished and explicitly hidden records stay excluded with reasons", () => {
  const cases: [string, OfficialFeature][] = [
    ["common", feature(1, { COMMON_NAME: "Unnamed" })],
    [
      "common",
      feature(10, {
        COMMON_NAME: "Preliminary Apartments",
        TYPE: "Apartment Pre",
      }),
    ],
    ["common", feature(2, { COMMON_NAME: "Future Hall", STATUS: "PROPOSED" })],
    ["poi-168", feature(3, { name: "Hidden Park", visible: "No" })],
    ["public-art", feature(4, { title_artwork: "Removed", removal_date: 1 })],
    [
      "public-art",
      feature(11, {
        title_artwork: "Removed ISO",
        removal_date: "2020-01-01T00:00:00Z",
      }),
    ],
    [
      "public-art",
      feature(12, {
        title_artwork: "Future ISO",
        install_date: "2099-01-01T00:00:00Z",
      }),
    ],
    [
      "trakit-addresses",
      feature(5, { ADDRESS: "100 Main St", MISC_INFO: "DEMO" }),
    ],
    [
      "address-destinations",
      feature(6, { EX_ADD: "TEMP WORK TRAILER", MISC_INFO: "M" }),
    ],
    ["address-destinations", feature(7, { EX_ADD: "SCHOOL", MISC_INFO: "M" })],
    [
      "address-destinations",
      feature(8, { EX_ADD: "TELECORP", MISC_INFO: "STE" }),
    ],
    [
      "common",
      {
        properties: { OBJECTID: 9, COMMON_NAME: "Bad Point" },
        geometry: { type: "Point", coordinates: [NaN, 36] },
      },
    ],
  ];
  for (const [id, f] of cases) {
    const r = normalizeOfficialLocation(f, source(id));
    assert.equal(r.location, undefined);
    assert.ok(r.reason);
  }
  assert.ok(
    record("common", { COMMON_NAME: "Named apartments", STATUS: null }),
  );
  assert.ok(
    record("address-destinations", {
      EX_ADD: "E CENTRAL PARKING GARAGE",
      MISC_INFO: "STE",
    }),
  );
});
test("point and polygon duplicate views are unioned before selecting the best official point", () => {
  const a = record("common", { COMMON_NAME: "Example Park" }),
    b = record("parks", { EX_ADD: "Example Park" }, 2);
  b.point = [36.373, -94.21];
  const bridge = record(
    "park-properties",
    { FACILITY_NAME: "Example Park" },
    3,
  );
  bridge.provenance[0].coordinateMethod = "polygon interior";
  bridge.provenance[0].extent = [-94.212, 36.37, -94.205, 36.375];
  const merged = dedupeLocations([a, b, bridge]);
  assert.equal(merged.records.length, 1);
  assert.equal(merged.duplicatesRemoved, 2);
  assert.deepEqual(merged.records[0].point, a.point);
  assert.equal(merged.records[0].provenance.length, 3);
});
test("campus spelling and institutional initialisms deduplicate without losing official aliases", () => {
  const a = record("schools-4", { LABEL: "Mary Jones Elementary" }),
    b = record("common", { COMMON_NAME: "Mary Mae Jones Elementary" }, 2);
  b.point = [36.3738, -94.208];
  const p = record(
      "common",
      { COMMON_NAME: "Bentonville Police Dept", ADDRESS: "908 SE 14TH ST" },
      3,
    ),
    q = record("common", { COMMON_NAME: "PD", ADDRESS: "908 SE 14TH ST" }, 4);
  const merged = dedupeLocations([a, b, p, q]);
  assert.equal(merged.records.length, 2);
  assert.ok(merged.records.some((r) => r.aliases.includes("PD")));
  assert.ok(
    merged.records.some((r) => r.aliases.includes("Mary Mae Jones Elementary")),
  );
});
test("distinct annexes, campus directions, access points and outside records do not merge", () => {
  const values = [
    "Library",
    "Library annex",
    "Library Trailhead",
    "Library North",
    "Library South",
  ].map((COMMON_NAME, i) =>
    record("common", { COMMON_NAME, ADDRESS: "100 Main St" }, i + 1),
  );
  const outside = {
    ...values[0],
    id: "outside",
    point: [36.5, -94.2] as [number, number],
    supported: false,
  };
  assert.equal(dedupeLocations([...values, outside]).records.length, 6);
});
test("all fixture categories compete in one ranked search, with outside endpoints excluded", () => {
  const inventories = [
    normalizeSourceInventory(
      [feature(1, { COMMON_NAME: "Creekside Library" })],
      source("common"),
    ),
    normalizeSourceInventory(
      [feature(2, { LABEL: "Creekside Middle School" })],
      source("schools-7"),
    ),
    normalizeSourceInventory(
      [feature(3, { EX_ADD: "Creekside Park" })],
      source("parks"),
    ),
    normalizeSourceInventory(
      [feature(4, { ADDRESS: "100 Creekside Rd" })],
      source("city-addresses"),
    ),
  ];
  const outside = record("common", { COMMON_NAME: "Creekside Outside" }, 5);
  outside.point = [36.5, -94.2];
  outside.supported = false;
  inventories[0].records.push(outside);
  const index = buildSearchIndex(buildUnifiedLocationCatalog(inventories));
  assert.equal(searchUnifiedCatalog("creekside", index).length, 4);
  for (const inventory of inventories)
    for (const r of inventory.records) {
      if (r.supported) {
        assert.ok(
          searchUnifiedCatalog(r.label, index).some((x) => x.id === r.id),
        );
        assert.ok(validateSelection(r));
      } else {
        assert.ok(
          !searchUnifiedCatalog(r.label, index).some((x) => x.id === r.id),
        );
        assert.throws(() => validateSelection(r));
      }
    }
  for (const q of [
    "Creekside Middle School",
    "Creekside Middle",
    "Creekside MS",
  ])
    assert.equal(searchUnifiedCatalog(q, index)[0].type, "school");
  assert.equal(searchUnifiedCatalog("100 creekside", index)[0].kind, "address");
  assert.equal(searchUnifiedCatalog("101 creekside", index).length, 0);
  assert.equal(
    searchUnifiedCatalog("creeksdie middle", index)[0].type,
    "school",
  );
});
test("numbered highway addresses distinguish house numbers from road numbers", () => {
  const r = record("city-addresses", { ADDRESS: "10310 W AR 264 HWY" });
  assert.ok(scoreCandidate("10310 W AR 264 HWY", r) >= 100);
  assert.ok(scoreCandidate("10310 west ar 264 highway", r) >= 75);
  assert.equal(scoreCandidate("10311 W AR 264 HWY", r), 0);
  assert.equal(scoreCandidate("10310 W AR 265 HWY", r), 0);
});
test("inventory reads enumerate all IDs and POST exact verified batches", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) =>
    feature(i + 1, { LABEL: `Official Middle School ${i + 1}` }),
  );
  let posts = 0;
  const inventory = await fetchOfficialInventory(
    source("schools-7"),
    catalogFetcher({ "schools-7": rows }, (_url, init) => {
      if (init?.method === "POST") {
        posts++;
        assert.ok(
          new URLSearchParams(String(init.body)).get("outSR") === "4326",
        );
      }
    }),
  );
  assert.equal(inventory.rawCount, 1001);
  assert.equal(inventory.records.length, 1001);
  assert.equal(posts, 2);
});
test("truncated or mismatched inventories fail rather than silently claiming completeness", async () => {
  let count = 0;
  await assert.rejects(
    fetchOfficialInventory(source("parks"), async () =>
      Response.json(
        ++count === 1
          ? { objectIds: [1, 2] }
          : {
              type: "FeatureCollection",
              features: [feature(1, { EX_ADD: "Park" })],
            },
      ),
    ),
    /Partial official/,
  );
  await assert.rejects(
    fetchOfficialInventory(source("parks"), async () =>
      Response.json({ objectIds: [1, 1] }),
    ),
    /Incomplete official/,
  );
});
test("one failed source preserves healthy categories and reports exactly which source failed", async () => {
  const parks = source("parks"),
    common = source("common");
  const healthy = catalogFetcher({
    parks: [feature(1, { EX_ADD: "Healthy Park" })],
  });
  const result = await fetchOfficialLocationSources(
    [common, parks],
    async (input, init) => {
      if (String(input).includes(common.path)) throw new Error("Source down");
      return healthy(input, init);
    },
  );
  assert.equal(result.inventories.length, 1);
  assert.equal(result.inventories[0].id, "parks");
  assert.equal(
    result.diagnostics.filter((d) => d.status === "unavailable").length,
    1,
  );
  assert.match(result.diagnostics[0].source, /194$/);
  const index = buildSearchIndex(
    buildUnifiedLocationCatalog(result.inventories, result.diagnostics),
  );
  assert.equal(searchUnifiedCatalog("healthy park", index).length, 1);
});
test("snapshot round-trip retains provenance, outside flags and boundary revalidation", () => {
  const inventory = normalizeSourceInventory(
    [
      feature(1, { LABEL: "School One" }),
      feature(2, { LABEL: "Outside School" }, [-94.1, 36.5]),
    ],
    source("schools-7"),
  );
  const snapshot = packSnapshot([inventory]),
    loaded = unpackSnapshot(snapshot);
  assert.equal(loaded[0].records.length, 2);
  assert.equal(loaded[0].records[1].supported, false);
  assert.ok(!("rows" in loaded[0]));
  snapshot.boundaryVersion = "old";
  snapshot.inventories[0].rows[1][7] = true;
  assert.equal(unpackSnapshot(snapshot)[0].records[1].supported, false);
});

test("shared generic nouns never merge distinct houses, numbered sites, or park amenities", () => {
  const houses = [
    "Barnett House",
    "Simpson House",
    "Patton House 1",
    "Patton House 2",
  ].map((name, i) =>
    record("historic-sites", { name, objectid: i + 1 }, i + 1),
  );
  const parks = [
    "Example Park",
    "Example Park Skate Park",
    "Example Park Trailhead",
  ].map((COMMON_NAME, i) => record("common", { COMMON_NAME }, i + 10));
  assert.equal(dedupeLocations([...houses, ...parks]).records.length, 7);
});

test("logical named/address views of one service retain independent inventories", async () => {
  const ids = [
    "city-addresses",
    "address-destinations",
    "trakit-destinations",
    "billing-destinations",
  ];
  const data = {
    "city-addresses": [feature(1, { ADDRESS: "100 Main St" })],
    "address-destinations": [
      feature(2, {
        EX_ADD: "Example Event Pavilion",
        ADDRESS: "100 Main St",
        MISC_INFO: "M",
      }),
    ],
    "trakit-destinations": [
      feature(3, {
        EX_ADD: "Example Museum",
        ADDRESS: "200 Main St",
        MISC_INFO: "M",
      }),
    ],
    "billing-destinations": [
      feature(4, {
        OBJECTID_1: 4,
        EX_ADD: "Example Recreation Center",
        ADDRESS: "300 Main St",
        MISC_INFO: "M",
      }),
    ],
  };
  const result = await fetchOfficialLocationSources(
    ids.map(source),
    catalogFetcher(data),
  );
  assert.equal(result.inventories.length, 4);
  for (const inventory of result.inventories) {
    assert.equal(inventory.records.length, 1);
    assert.equal(
      inventory.records[0].kind,
      inventory.id === "city-addresses" ? "address" : "place",
    );
  }
});

test("official park directory names bind only to verified GIS coordinates and unique park parcels", async () => {
  const { reconcileParkDirectory } =
    await import("../lib/geocoding/catalog/parksDirectory");
  const polygon: OfficialFeature = {
    properties: {
      OBJECTID: 2,
      FACILITY_NAME: "Earlier Park",
      CITY_USE: "PARK",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-94.21, 36.37],
          [-94.2, 36.37],
          [-94.2, 36.38],
          [-94.21, 36.38],
          [-94.21, 36.37],
        ],
      ],
    },
  };
  const inventories = [
    normalizeSourceInventory(
      [feature(1, { ADDRESS: "100 N Main St" })],
      source("city-addresses"),
    ),
    normalizeSourceInventory([polygon], source("park-properties")),
  ];
  const directory = {
    fetchedAt: new Date().toISOString(),
    directory: "https://www.bentonville.ar.gov/436/Parks",
    records: [
      {
        objectId: 123,
        name: "Current Official Park",
        address: "100 N Main Street",
        page: "https://www.bentonville.ar.gov/123/Current-Official-Park",
      },
    ],
  };
  const evidence = {
    fetchedAt: new Date().toISOString(),
    sourceLayer: source("park-properties").path,
    collection: { type: "FeatureCollection", features: [polygon] },
  };
  const inventory = reconcileParkDirectory(inventories, directory, evidence),
    r = inventory.records[0];
  assert.equal(r.label, "Current Official Park");
  assert.deepEqual(r.point, inventories[0].records[0].point);
  assert.equal(r.provenance[0].coordinateSource?.source, "city-addresses");
  assert.ok(r.aliases.includes("Earlier Park"));
  assert.equal(
    buildUnifiedLocationCatalog([...inventories, inventory]).records.filter(
      (r) => r.kind === "place",
    ).length,
    1,
  );
  const loaded = unpackSnapshot(packSnapshot([inventory]))[0].records[0];
  assert.deepEqual(
    loaded.provenance[0].coordinateSource,
    r.provenance[0].coordinateSource,
  );
  assert.equal(loaded.provenance[0].sourceLayer, directory.records[0].page);
  assert.deepEqual(
    loaded.provenance[0].parcelIdentity,
    r.provenance[0].parcelIdentity,
  );
});
test("directory names with no GIS binding are rejected; shared parcels do not join distinct amenities", async () => {
  const { reconcileParkDirectory } =
    await import("../lib/geocoding/catalog/parksDirectory");
  const inventories = [
    normalizeSourceInventory(
      [feature(1, { ADDRESS: "100 Main St" })],
      source("city-addresses"),
    ),
  ];
  const directory = {
    fetchedAt: new Date().toISOString(),
    directory: "https://www.bentonville.ar.gov/436/Parks",
    records: [
      {
        objectId: 1,
        name: "Unbound Promenade",
        address: null,
        page: "https://www.bentonville.ar.gov/1",
      },
      {
        objectId: 2,
        name: "Bark Park",
        address: "100 Main St",
        page: "https://www.bentonville.ar.gov/2",
      },
      {
        objectId: 3,
        name: "Bentonville Bike Playground",
        address: "100 Main St",
        page: "https://www.bentonville.ar.gov/3",
      },
    ],
  };
  const result = reconcileParkDirectory(inventories, directory, {
    fetchedAt: new Date().toISOString(),
    sourceLayer: "official parcel fixture",
    collection: { type: "FeatureCollection", features: [] },
  });
  assert.equal(result.rawCount, 3);
  assert.equal(result.records.length, 2);
  assert.equal(result.rejected[0].name, "Unbound Promenade");
  assert.match(result.rejected[0].reason, /no coordinate invented/);
  assert.equal(dedupeLocations(result.records).records.length, 2);
});
test("park-directory enrichment preserves established named points and strict outside exclusion", async () => {
  const { reconcileParkDirectory } =
    await import("../lib/geocoding/catalog/parksDirectory");
  const current = normalizeSourceInventory(
    [feature(1, { COMMON_NAME: "Example Park", ADDRESS: "100 Main St" })],
    source("common"),
  );
  const address = normalizeSourceInventory(
    [
      feature(2, { ADDRESS: "100 Main St" }, [-94.208, 36.3735]),
      feature(3, { ADDRESS: "200 Main St" }, [-94.1, 36.5]),
    ],
    source("city-addresses"),
  );
  const directory = {
    fetchedAt: new Date().toISOString(),
    directory: "https://www.bentonville.ar.gov/436/Parks",
    records: [
      {
        objectId: 1,
        name: "Example Park",
        address: "100 Main Street",
        page: "https://www.bentonville.ar.gov/1",
      },
      {
        objectId: 2,
        name: "Outside Park",
        address: "200 Main St",
        page: "https://www.bentonville.ar.gov/2",
      },
    ],
  };
  const result = reconcileParkDirectory([current, address], directory, {
    fetchedAt: new Date().toISOString(),
    sourceLayer: "official parcel fixture",
    collection: { type: "FeatureCollection", features: [] },
  });
  assert.deepEqual(result.records[0].point, current.records[0].point);
  assert.equal(result.records[1].supported, false);
  assert.throws(() => validateSelection(result.records[1]));
});
test("unavailable directory enrichment leaves healthy GIS sources usable with diagnostics", async () => {
  const result = await fetchOfficialLocationSources(
    [source("common"), source("city-parks-directory")],
    catalogFetcher({ common: [feature(1, { COMMON_NAME: "Example Park" })] }),
  );
  assert.equal(result.inventories.length, 1);
  assert.equal(result.diagnostics[1].status, "unavailable");
  assert.match(result.diagnostics[1].source, /bentonville\.ar\.gov/);
});

test("business and public-parking views require explicit eligible status and normalize address parts", () => {
  const business = record("registered-businesses", {
    Business_Name: "Example Books",
    Physical_Address: "100 Main St",
    STATUS: "ISSUED",
    Home_occ: "NO",
  });
  assert.ok(business);
  for (const p of [
    { STATUS: "EXPIRED", Home_occ: "NO" },
    { STATUS: "ISSUED", Home_occ: "YES" },
    { STATUS: "RECEIVED", Home_occ: "NO" },
    { STATUS: "ISSUED", Home_occ: null },
  ])
    assert.equal(
      normalizeOfficialLocation(
        feature(1, { Business_Name: "Not an eligible venue", ...p }),
        source("registered-businesses"),
      ).location,
      undefined,
    );
  assert.ok(
    record("public-parking", {
      FID: 1,
      NAME: "Public Lot",
      PUBLIC_ID: "Public Parking",
      WEEKDAY: "Always Public",
      WEEKEND: "Always Public",
    }),
  );
  assert.equal(
    normalizeOfficialLocation(
      feature(1, {
        FID: 1,
        NAME: "Conditional Lot",
        PUBLIC_ID: "Public with Exceptions",
        WEEKDAY: "After 5pm",
        WEEKEND: "Always Public",
      }),
      source("public-parking"),
    ).location,
    undefined,
  );
  assert.equal(
    record("national-register-points", {
      Name: "Historic Fixture House",
      Address: "100",
      STName: "N Main St",
    }).address,
    "100 N Main St",
  );
});

test("historic-school context preserves raw-name search while current campuses rank first", () => {
  const active = normalizeSourceInventory(
    [feature(1, { LABEL: "Example High School" })],
    source("schools-all"),
  );
  const historical = normalizeSourceInventory(
    [
      feature(
        2,
        { objectid: 2, name: "Example High School" },
        [-94.212, 36.375],
      ),
    ],
    source("historic-sites"),
  );
  assert.equal(historical.records[0].type, "landmark");
  assert.ok(historical.records[0].label.startsWith("Historic site"));
  const index = buildSearchIndex(
    buildUnifiedLocationCatalog([active, historical]),
  );
  const results = searchUnifiedCatalog("Example High School", index);
  assert.equal(results.length, 2);
  assert.equal(results[0].id, active.records[0].id);
  assert.ok(results[1].aliases.includes("Example High School"));
});

test("coincident campus labels merge into the official school point while distinct campuses remain separate", () => {
  const main = record("schools-all", { LABEL: "Example High School" }, 1);
  const north = record(
      "common",
      { COMMON_NAME: "Example High School-North" },
      2,
    ),
    south = record("common", { COMMON_NAME: "Example High School-South" }, 3);
  north.point = [main.point[0] + 0.00001, main.point[1]];
  south.point = north.point;
  const east = record(
    "common",
    { COMMON_NAME: "Example High School-East Campus" },
    4,
  );
  east.point = [main.point[0] + 0.003, main.point[1]];
  const result = dedupeLocations([north, south, main, east]);
  assert.equal(result.records.length, 2);
  const canonical = result.records.find((r) => r.id === main.id)!;
  assert.ok(canonical.aliases.includes(north.label));
  assert.ok(canonical.aliases.includes(south.label));
  assert.deepEqual(canonical.point, main.point);
});

test("official directory parsing reads main-content addresses and never the City footer", async () => {
  const { execFileSync } = await import("node:child_process");
  const parse = (input: string) =>
    JSON.parse(
      execFileSync("python3", ["scripts/extract-city-park-pages.py", "-"], {
        input,
        encoding: "utf8",
      }),
    );
  const footer = "<footer><p>305 SW A St.</p></footer>";
  assert.deepEqual(
    parse(
      '<div role="main"><h1>Example Park</h1><p><strong>3108 SE J Street</strong></p></div>' +
        footer,
    ).addresses,
    ["3108 SE J Street"],
  );
  assert.deepEqual(
    parse(
      "<main><h1>Unbound Promenade</h1><p>A public place along the street.</p></main>" +
        footer,
    ).addresses,
    [],
  );
  assert.deepEqual(
    parse("<main><h1>Another Park</h1><h3>270 NW F Street</h3></main>" + footer)
      .addresses,
    ["270 NW F Street"],
  );
});
