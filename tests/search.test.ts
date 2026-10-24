import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CityGeocodingProvider,
  normalizeCityResults,
} from "../lib/geocoding/city";
import {
  normalizeSearchText,
  normalizeStreetTokens,
  rankCandidates,
  isAddressLikeQuery,
  scoreCandidate,
} from "../lib/geocoding/search";
import type { Fetcher } from "../lib/server/http";
const places = JSON.parse(
  readFileSync("data/search/official-places.json", "utf8"),
);
const addresses = JSON.parse(
  readFileSync("data/search/official-addresses.json", "utf8"),
);
const provider = new CityGeocodingProvider((async (input) => {
  const url = new URL(String(input));
  if (url.pathname.includes("Community_Development"))
    return Response.json(places);
  if (url.searchParams.get("returnDistinctValues"))
    return Response.json({
      type: "FeatureCollection",
      features: [
        { properties: { STNAME: "MISTLETOE" } },
        { properties: { STNAME: "MAIN" } },
      ],
    });
  const number = url.searchParams.get("where")?.match(/LIKE '(\d+) %'/)?.[1];
  return Response.json({
    ...addresses,
    features: addresses.features.filter(
      (f: { properties: { ADDRESS: string } }) =>
        number
          ? f.properties.ADDRESS.startsWith(number + " ")
          : /MAIN|MISTLETOE/.test(f.properties.ADDRESS),
    ),
  });
}) as Fetcher);
const cases: [string[], string][] = [
  [
    [
      "crystal bridge",
      "crystal bridges",
      "crstal bridges",
      "crystal museum",
      "bridges museum",
      "  Crystal   Bridges  ",
      "crys",
      "crystl bridgs",
      "crystla bridges",
    ],
    "city-place:44",
  ],
  [
    [
      "bentonville library",
      "bentonvile library",
      "library bentonville",
      "public library",
      "Bentonville-Public Library",
      "city of bentonville public library",
      "benton lib",
    ],
    "city-place:68",
  ],
  [
    ["lawrence plaza", "lawerence plaza", "law plaza", "lawrence"],
    "city-place:67",
  ],
  [
    [
      "bentonville airport",
      "municipal airport",
      "bentonville municipal airport",
      "airport bentonville municipal",
    ],
    "city-place:124",
  ],
  [
    [
      "3809 mistletoe",
      "3809 sw mistletoe",
      "3809 southwest mistletoe avenue",
      "3809 mistltoe ave",
      "3809 SW MISTLETOE AVE",
      "3809 S.W. Mistletoe Ave.",
      "mistretoe 3809 sw",
      "3809 mist",
    ],
    "3809 SW MISTLETOE AVE",
  ],
  [["300 n main", "300 north main street"], "300 N MAIN ST"],
  [["500 s main", "500 south main st"], "500 S MAIN ST"],
];
for (const [queries, expected] of cases)
  for (const q of queries)
    test(`official autocomplete: ${q}`, async () => {
      const result = await provider.search(q);
      assert.ok(result.length > 0, q);
      assert.ok(
        result[0].id === expected || result[0].label === expected,
        JSON.stringify(result),
      );
    });
for (const query of [
  "XNA",
  "Northwest Arkansas National Airport",
  "Fayetteville airport",
  "Rogers high school",
  "New York",
  "asdfghjkl",
  "random park nowhere",
])
  test(`no forced guess: ${query}`, async () =>
    assert.deepEqual(await provider.search(query), []));
for (const query of ["Creekside park", "creekside", "CREEKSIDE PARK"])
  test(`absent official named record is not fabricated: ${query}`, async () =>
    assert.deepEqual(await provider.search(query), []));
test("normalization uses whole tokens, directions and punctuation", () => {
  assert.equal(normalizeSearchText("  Crystal   Bridges  "), "crystal bridges");
  assert.equal(
    normalizeStreetTokens("3809 S.W. Mistletoe Ave."),
    "3809 southwest mistletoe avenue",
  );
  assert.equal(
    normalizeStreetTokens("westwood strawberry"),
    "westwood strawberry",
  );
  assert.ok(isAddressLikeQuery("mistretoe 3809 sw"));
});
test("exact and prefix matches outrank typos; house number disagreement never wins", () => {
  const candidates = normalizeCityResults(addresses.features, "address");
  const c = candidates.find((c) => c.label === "3809 SW MISTLETOE AVE")!;
  assert.ok(
    scoreCandidate("3809 SW MISTLETOE AVE", c) > scoreCandidate("3809 mist", c),
  );
  assert.ok(
    scoreCandidate("3809 mist", c) > scoreCandidate("3809 mistltoe", c),
  );
  assert.equal(scoreCandidate("3808 mistletoe", c), 0);
  assert.equal(scoreCandidate("3809 nowhere", c), 0);
});
test("ambiguous street searches retain choices; dedup keeps the best-ranked official representation", async () => {
  const main = await provider.search("Main St");
  assert.ok(main.length > 1 && main.length <= 8);
  assert.equal(
    new Set(main.map((r) => r.label)).size,
    main.length,
    "identical postal addresses do not fill the suggestion list",
  );
  const c = normalizeCityResults(places.features, "place", false);
  assert.equal(
    rankCandidates("community recreation center", c)[0].id,
    "city-place:40",
  );
  const ranked = rankCandidates("community center", c);
  assert.equal(
    ranked.filter((r) => r.address === "1101 SW CITIZENS CIR").length,
    1,
  );
});
