import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  trailEligibility,
  type TrailAttributes,
} from "../lib/gis/trailEligibility";
import { deduplicateInfrastructure } from "../lib/gis/deduplicateInfrastructure";
import {
  fetchOfficialTrails,
  normalizeTrailFeatures,
  TRAIL_QUERY,
} from "../lib/gis/pedestrianInventory";
import { routeLengthMeters } from "../lib/analysis/geometry";
import { facility, gisFeature, point } from "./fixtures/geometries";
import type { Fetcher } from "../lib/server/http";
const publicTrail = {
  useaccess: "Public",
  trltyptxt: "Off-Street Trail",
  surftype: "Concrete",
  bikesallow: "Yes",
  Closure_Status: null,
};
test("only documented public walking/shared-use trail classes qualify", () => {
  assert.ok(trailEligibility(publicTrail).eligible);
  assert.ok(
    trailEligibility({
      ...publicTrail,
      trltyptxt: "Hiking",
      surftype: "Dirt",
      bikesallow: "No",
    }).eligible,
  );
  const exclusions: TrailAttributes[] = [
    { useaccess: null },
    { useaccess: "Private" },
    { maintowner: "Private" },
    { bikesallow: "Bike Only" },
    { bikesallow: null },
    { trltyptxt: "Mountain Bike Primary" },
    { trltyptxt: "Shared Roadway" },
    { surftype: null },
    { Approved: "No" },
    { prim_name: "Future trail" },
    { constrdate: Date.now() + 86400000 },
    { Closure_Status: "Closed" },
    { Closure_Status: "Detour" },
    { Start_Closure: 1, End_Closure: null },
  ];
  for (const patch of exclusions) {
    assert.equal(
      trailEligibility({ ...publicTrail, ...patch }).eligible,
      false,
      JSON.stringify(patch),
    );
  }
});
test("trail normalization preserves explicit hiking classification and rejects malformed accepted geometry", () => {
  const f = gisFeature();
  const feature = {
    ...f,
    properties: {
      ...f.properties,
      ...publicTrail,
      trltyptxt: "Hiking",
      surftype: "Gravel",
    },
  };
  const result = normalizeTrailFeatures([feature]);
  assert.equal(result.countsByKind.trail, 1);
  assert.equal(result.segments[0].attributes?.surftype, "Gravel");
  assert.match(result.warnings[0], /natural surfaces/);
  assert.throws(
    () => normalizeTrailFeatures([{ ...feature, geometry: null }]),
    /geometry/,
  );
});
test("supplemental trail fetch verifies exact complete IDs and scopes its mixed source", async () => {
  const bounds: [number, number, number, number] = [
    -94.21, 36.35, -94.19, 36.37,
  ];
  for (const partial of [false, true]) {
    const fetcher = (async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.has("returnIdsOnly")) {
        assert.equal(url.searchParams.get("where"), TRAIL_QUERY);
        return Response.json({ objectIds: [1] });
      }
      return Response.json({
        type: "FeatureCollection",
        features: partial
          ? []
          : [{ ...gisFeature(), properties: { OBJECTID: 1, ...publicTrail } }],
      });
    }) as Fetcher;
    if (partial)
      await assert.rejects(fetchOfficialTrails(bounds, fetcher), /Partial/);
    else
      assert.equal(
        (await fetchOfficialTrails(bounds, fetcher)).segments.length,
        1,
      );
  }
});
test("dedup removes reverse and partial overlaps without merging parallel paths or point crossings", () => {
  const base = facility(0, 100);
  const duplicate = {
    ...base,
    id: "reverse",
    geometry: [...base.geometry].reverse(),
  };
  assert.equal(
    deduplicateInfrastructure([base], [duplicate]).segments.length,
    1,
  );
  const trimmed = deduplicateInfrastructure([base], [facility(50, 150)]);
  assert.ok(trimmed.trimmedMeters > 49.9 && trimmed.trimmedMeters < 50.2);
  const added = trimmed.segments
    .slice(1)
    .reduce((n, s) => n + routeLengthMeters(s.geometry), 0);
  assert.ok(added > 49.8 && added < 50.1);
  assert.equal(
    deduplicateInfrastructure([base], [facility(0, 100, 1)]).segments.length,
    2,
  );
  const crossing = {
    ...facility(0, 100),
    geometry: [point(50, -50), point(50, 50)],
  };
  assert.equal(deduplicateInfrastructure([base], [crossing]).trimmedMeters, 0);
});
test("excluded baseline geometry cannot suppress an eligible supplementary trail", () => {
  const result = deduplicateInfrastructure(
    [facility(0, 100, 0, false)],
    [facility(0, 100)],
  );
  assert.equal(result.segments.filter((s) => s.eligible).length, 1);
  assert.equal(result.trimmedMeters, 0);
});
test("audit leaves scoring, recommendation thresholds, coverage matching byte-identical; approved CAC default is checked separately", () => {
  const manifest = JSON.parse(
    readFileSync("data/demo-search/audit/audit-manifest.json", "utf8"),
  );
  const hashes = manifest.unchangedBaselineHashes;
  assert.ok(hashes, "audit manifest must record original hashes");
  for (const [file, expected] of Object.entries(hashes)) {
    if (file === "data/demoLocations.ts") continue; // Approved CAC default switch; historical manifest retained.
    assert.equal(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      expected,
      file,
    );
  }
});

test("CAC switch preserves every protected analysis and provider file", () => {
  const hashes = JSON.parse(
    readFileSync("data/verification/cac-protected-hashes.json", "utf8"),
  );
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      expected,
      file,
    );
});
