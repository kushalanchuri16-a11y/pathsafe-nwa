import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildUnifiedLocationCatalog } from "../lib/geocoding/catalog";
import { unpackSnapshot } from "../lib/geocoding/catalog/snapshot";
import { dedupeLocations } from "../lib/geocoding/catalog/dedupe";
import { reconcileOfficialNames } from "../lib/geocoding/catalog/reconcileNames";
import {
  buildSearchIndex,
  searchUnifiedCatalog,
} from "../lib/geocoding/catalog/search";
import { isWithinSupportedArea } from "../lib/geocoding/area";
import { scoreCandidate } from "../lib/geocoding/search";

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
const fitness = catalog.records.find(
  (r) => r.label === "Walton Family Whole Health & Fitness",
)!;

for (const query of [
  "Walton Family Whole Health & Fitness",
  "whole health",
  "walton whole health",
  "1400 SE 5th St",
]) {
  test(`official catalog resolves ${query} to the verified fitness location`, () => {
    const result = searchUnifiedCatalog(query, index).find(
      (r) =>
        r.point[0] === 36.36664876438695 && r.point[1] === -94.194025472946,
    );
    assert.ok(result, `Missing verified fitness point for ${query}`);
    assert.ok(result.supported && isWithinSupportedArea(...result.point));
    if (!/^1400/.test(query)) assert.equal(result.label, fitness.label);
  });
}
for (const [name, previous, address] of [
  ["8th & Plate", "WALMART FOOD HALL", "1600 SE 8TH ST"],
  ["Walmart Home Office Welcome Center", "WELCOM CTR", "1 CUSTOMER DR"],
]) {
  test(`same reconciliation handles campus legacy label ${previous}`, () => {
    const result = searchUnifiedCatalog(name, index).find(
      (r) => r.label === name,
    )!;
    assert.ok(result);
    assert.equal(result.address, address);
    assert.ok(result.aliases.includes(previous));
    assert.ok(
      searchUnifiedCatalog(previous, index).some((r) => r.id === result.id),
    );
    assert.ok(result.provenance.some((p) => p.nameEvidence?.urls.length));
  });
}
test("name reconciliation preserves original labels, geometry, identity, eligibility and source evidence", () => {
  const original = dedupeLocations(
    inventories.flatMap((i) => i.records),
  ).records;
  assert.equal(catalog.records.length, original.length);
  assert.ok(fitness.aliases.includes("FITNESS CENTER"));
  const byId = new Map(original.map((r) => [r.id, r]));
  for (const r of catalog.records) {
    const prior = byId.get(r.id)!;
    assert.deepEqual(r.point, prior.point);
    assert.equal(r.supported, prior.supported);
    assert.equal(r.kind, prior.kind);
    assert.equal(r.type, prior.type);
    assert.equal(r.provenance.length, prior.provenance.length);
  }
});
test("a verified naming crosswalk cannot rename an unrelated, moved, outside or replaced facility", () => {
  const raw = dedupeLocations(
    inventories.flatMap((i) => i.records),
  ).records.find((r) =>
    r.provenance.some(
      (p) =>
        p.source === "address-destinations" && p.sourceObjectId === 18879439,
    ),
  )!;
  for (const r of [
    { ...raw, supported: false },
    { ...raw, address: "1401 SE 5TH ST" },
    { ...raw, label: "Replacement Tenant", aliases: [] },
    {
      ...raw,
      provenance: raw.provenance.map((p) => ({ ...p, sourceObjectId: -1 })),
    },
  ])
    assert.deepEqual(reconcileOfficialNames([r])[0], r);
  assert.deepEqual(reconcileOfficialNames([]), []);
});
test("whole health keeps the distinct Museum Way institution rather than merging it with the fitness center", () => {
  const results = searchUnifiedCatalog("whole health", index);
  assert.ok(results.some((r) => r.id === fitness.id));
  const museumWay = results.find((r) => r.address === "850 MUSEUM WAY");
  assert.ok(museumWay);
  assert.notEqual(museumWay.id, fitness.id);
  assert.notDeepEqual(museumWay.point, fitness.point);
});

for (const query of [
  "The Walmart Museum",
  "Walmart Museum",
  "Walton's 5&10",
  "Walton 5 and 10",
  "105 N Main St",
]) {
  test(`museum name/address share one existing identity: ${query}`, () => {
    const results = searchUnifiedCatalog(query, index);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "city-address:18876386");
    assert.deepEqual(results[0].point, [36.37250862234924, -94.20902221035391]);
    assert.equal(
      results[0].label,
      query.startsWith("105") ? "105 N MAIN ST" : "The Walmart Museum",
    );
    assert.equal(
      catalog.records.filter((r) => r.id === results[0].id).length,
      1,
    );
    assert.ok(
      results[0].provenance.some(
        (p) => p.source === "city-addresses" && p.sourceObjectId === 18876387,
      ),
    );
  });
}
for (const query of ["Osage Park", "osage", "osge park"]) {
  test(`primary park identity ranks above contextual host and streets: ${query}`, () => {
    const results = searchUnifiedCatalog(query, index);
    assert.equal(results[0].label, "Osage Park");
    assert.equal(results[0].id, "park-properties:315");
    assert.deepEqual(
      results[0].point,
      [36.351640914616624, -94.21976250101292],
    );
    assert.ok(
      results.every((r) => !/lake bentonville|bentonville lake/i.test(r.label)),
    );
  });
}
for (const [query, id] of [
  ["crstal bridges", "city-place:44"],
  ["bentonvile library", "city-place:68"],
  ["lawerence plaza", "city-place:67"],
  ["Creekside Middle School", "schools-7:19"],
  ["Creekside Park", "city-parks-directory:1525"],
  ["Walton Family Whole Health & Fitness", "address-destinations:18879439"],
  ["Bentonville Public Library", "city-place:68"],
  ["Lawrence Plaza", "city-place:67"],
]) {
  test(`distinctive-name ranking preserves ${query}`, () => {
    assert.equal(searchUnifiedCatalog(query, index)[0].id, id);
  });
}
test("unavailable primary destinations never resolve to their contextual host", () => {
  const without = inventories.map((i) => ({
    ...i,
    records: i.records.filter(
      (r) =>
        !r.provenance.some(
          (p) =>
            ["park-properties", "civic-properties"].includes(p.source) &&
            p.sourceObjectId === 315,
        ),
    ),
  }));
  const absent = buildSearchIndex(buildUnifiedLocationCatalog(without));
  assert.deepEqual(searchUnifiedCatalog("Osage Park", absent), []);
});
test("host/component deduplication does not turn another destination's name into a host alias", () => {
  const lake = catalog.records.find(
    (r) => r.id === "city-parks-directory:772",
  )!;
  const osage = catalog.records.find((r) => r.id === "park-properties:315")!;
  assert.ok(lake && osage);
  assert.ok(!lake.aliases.some((n) => /osage/i.test(n)));
  assert.ok(osage.aliases.includes("Osage Park @ Lake Bentonville"));
  assert.ok(!osage.provenance.some((p) => p.source === "city-parks-directory"));
});
test("distinctive confidence rejects unrelated parks, attractions, weak near-words and nonsense", () => {
  for (const query of ["Memorial Park", "Crystal Bridges"]) {
    const results = searchUnifiedCatalog(query, index);
    assert.ok(results.length > 0);
    assert.ok(
      results.every((r) =>
        [r.label, ...r.aliases].some((name) =>
          (query === "Memorial Park" ? /memorial/i : /crystal.*bridg/i).test(
            name,
          ),
        ),
      ),
    );
  }
  assert.deepEqual(searchUnifiedCatalog("qxzvbrnflp park", index), []);
  const r = index.named.find((r) => r.label === "Osage Park")!;
  const unrelated = {
    ...r,
    id: "confidence-fixture",
    label: "Lake Park",
    aliases: [],
  };
  assert.equal(scoreCandidate("Osage Park", unrelated), 0);
  assert.equal(scoreCandidate("Bake Park", unrelated), 0);
  assert.equal(scoreCandidate("Memorial Park", unrelated), 0);
});
test("category-only search is ambiguous browsing with several genuine choices, never exact-name confidence", () => {
  const parks = searchUnifiedCatalog("park", index);
  assert.ok(parks.length > 1);
  assert.ok(parks.every((r) => r.kind === "place" && r.type === "park"));
  assert.ok(parks.every((r) => scoreCandidate("park", r) < 100));
});
test("deterministic match tiers order canonical, alias, normalized address, full tokens, prefixes and typos", () => {
  const sample = index.named.find((r) => r.label === "Osage Park")!;
  const exact = { ...sample, label: "Osage Park", aliases: [] };
  const alias = {
    ...sample,
    label: "Example Canonical",
    aliases: ["Osage Park"],
  };
  assert.ok(
    scoreCandidate("Osage Park", exact) > scoreCandidate("Osage Park", alias),
  );
  assert.ok(
    scoreCandidate("Osage Park", alias) >
      scoreCandidate("Osage Park", {
        ...sample,
        label: "Osage Park Extension",
        aliases: [],
      }),
  );
  assert.ok(
    scoreCandidate("Osage Park", exact) > scoreCandidate("Osa Park", exact),
  );
  assert.ok(
    scoreCandidate("Osa Park", exact) > scoreCandidate("osge park", exact),
  );
  const address = searchUnifiedCatalog("105 N Main St", index)[0];
  assert.ok(
    scoreCandidate("105 N Main St", address) >
      scoreCandidate("105 Main", address),
  );
  assert.equal(scoreCandidate("106 N Main St", address), 0);
});

test("locative names preserve primary identities generally, not only for Osage", () => {
  const template = index.named.find((r) => r.label === "Osage Park")!;
  const host = {
    ...template,
    id: "host",
    label: "Cedar Park",
    aliases: ["Birch Park @ Cedar Park"],
  };
  const primary = {
    ...template,
    id: "primary",
    label: "Birch Park @ Cedar Park",
    aliases: [],
  };
  const results = dedupeLocations([host, primary]).records;
  assert.equal(results.length, 2);
  assert.deepEqual(results.find((r) => r.id === "host")!.aliases, []);
  assert.equal(results.find((r) => r.id === "primary")!.label, primary.label);
});
