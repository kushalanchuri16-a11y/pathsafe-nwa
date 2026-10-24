import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildUnifiedLocationCatalog } from "../lib/geocoding/catalog";
import { unpackSnapshot } from "../lib/geocoding/catalog/snapshot";
import {
  buildSearchIndex,
  searchUnifiedCatalog,
} from "../lib/geocoding/catalog/search";
import { normalizeOfficialLocation } from "../lib/geocoding/catalog/normalize";
import { OFFICIAL_LOCATION_SOURCES } from "../lib/geocoding/catalog/sources";
import { isWithinSupportedArea } from "../lib/geocoding/area";
import { validateSelection } from "../lib/geocoding/validate";

const inventories = unpackSnapshot(
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL("../data/location-catalog/snapshot.json.gz", import.meta.url),
      ),
    ).toString("utf8"),
  ),
);
const catalog = buildUnifiedLocationCatalog(inventories);
const index = buildSearchIndex(catalog);
const source = OFFICIAL_LOCATION_SOURCES.find(
  (s) => s.id === "county-addresses",
)!;
const expected = new Map([
  ["2500 SW REGIONAL AIRPORT BLVD", [36.336382125641016, -94.24242528162843]],
  ["2502 SW REGIONAL AIRPORT BLVD", [36.33667361163425, -94.2424919298125]],
]);
for (const query of [
  "Northwest Arkansas Hindu Temple",
  "Hindu Temple",
  "NWA Hindu Temple",
]) {
  test(`${query} resolves the two verified religious-building address choices`, () => {
    const results = searchUnifiedCatalog(query, index);
    assert.equal(results.length, 2);
    for (const r of results) {
      assert.deepEqual(r.point, expected.get(r.address!));
      assert.ok(isWithinSupportedArea(...r.point));
      assert.deepEqual(validateSelection(r).point, r.point);
      assert.ok(r.aliases.includes("NWA HINDU ASSOC BLDG"));
      assert.ok(
        r.provenance.some(
          (p) =>
            p.source === "county-addresses" &&
            [1411896, 1412232].includes(p.sourceObjectId),
        ),
      );
    }
  });
}
test("temple named views retain ordinary address search and use the existing stronger City pins", () => {
  for (const [address, point] of expected) {
    const r = searchUnifiedCatalog(address, index)[0];
    assert.equal(r.kind, "address");
    assert.equal(r.label, address);
    assert.deepEqual(r.point, point);
  }
  assert.equal(
    catalog.records.filter((r) =>
      r.canonicalName?.startsWith("Northwest Arkansas Hindu Temple"),
    ).length,
    2,
  );
});
test("only the reviewed annotation/source/address identity can produce temple aliases", () => {
  const make = (
    properties: Record<string, unknown>,
    coordinates = [-94.24242085981575, 36.33638367190181],
  ) =>
    normalizeOfficialLocation(
      { properties, geometry: { type: "Point", coordinates } },
      source,
    ).location!;
  const properties = {
    OBJECTID: 1412232,
    FULL_ADDR: "2500 SW REGIONAL AIRPORT BLVD",
    COMMENT: "NWA HINDU ASSOC BLDG",
  };
  const r = make(properties);
  assert.ok(
    buildUnifiedLocationCatalog([
      {
        id: source.id,
        fetchedAt: new Date().toISOString(),
        rawCount: 1,
        records: [r],
        rejected: [],
      },
    ]).records.some((r) =>
      r.canonicalName?.startsWith("Northwest Arkansas Hindu Temple"),
    ),
  );
  for (const changed of [
    { ...properties, COMMENT: "Different tenant" },
    { ...properties, COMMENT: null },
    { ...properties, OBJECTID: 999 },
    { ...properties, FULL_ADDR: "2501 SW REGIONAL AIRPORT BLVD" },
  ])
    assert.deepEqual(make(changed).aliases, []);
  const outside = make(properties, [-94.31899844336795, 36.21882911466639]);
  assert.equal(outside.supported, false);
  assert.equal(
    buildUnifiedLocationCatalog([
      {
        id: source.id,
        fetchedAt: new Date().toISOString(),
        rawCount: 1,
        records: [outside],
        rejected: [],
      },
    ]).records.length,
    1,
  );
});
test("no unrelated county comment or partial Templeton name gains a temple destination", () => {
  const unrelated = normalizeOfficialLocation(
    {
      properties: {
        OBJECTID: 1451803,
        FULL_ADDR: "1105 MCCOLLUM RD",
        COMMENT: "LDS AR TEMPLE",
      },
      geometry: {
        type: "Point",
        coordinates: [-94.18266934552867, 36.3847027324287],
      },
    },
    source,
  ).location!;
  assert.deepEqual(unrelated.aliases, []);
  assert.ok(
    searchUnifiedCatalog("Hindu Temple", index).every(
      (r) => !r.label.includes("Templeton"),
    ),
  );
});
