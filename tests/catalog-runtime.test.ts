import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import {
  getUnifiedCatalog,
  indexCatalogSnapshot,
} from "../lib/geocoding/catalog";
import { searchUnifiedCatalog } from "../lib/geocoding/catalog/search";
import type { CatalogSnapshot } from "../lib/geocoding/catalog/snapshot";
import { isWithinSupportedArea } from "../lib/geocoding/area";
import { GET } from "../app/api/locations/route";
const snapshot = (): CatalogSnapshot =>
  JSON.parse(
    gunzipSync(readFileSync("data/location-catalog/snapshot.json.gz")).toString(
      "utf8",
    ),
  );
const queries = [
  "Crystal Bridges",
  "Bentonville Public Library",
  "Walmart Museum",
  "Creekside Middle School",
  "Creekside Park",
  "Osage Park",
  "Northwest Arkansas Hindu Temple",
  "Walton Family Whole Health & Fitness",
];

test("expired official snapshot serves the whole search API without network, and concurrent requests share its index", async (t) => {
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    networkCalls++;
    throw new Error("City GIS unreachable");
  });
  // Reproduce serverless cold starts long after every 24-hour source TTL expires.
  t.mock.method(Date, "now", () => Date.parse("2030-01-01T00:00:00Z"));
  const [a, b] = await Promise.all([getUnifiedCatalog(), getUnifiedCatalog()]);
  assert.equal(a, b);
  assert.equal(networkCalls, 0);
  assert.equal(a.catalog.diagnostics.length, 27);
  assert.ok(a.catalog.records.length > 0);
  for (const query of queries) {
    const response = await GET(
      new Request(
        "https://pathsafe.test/api/locations?q=" + encodeURIComponent(query),
      ),
    );
    assert.equal(response.status, 200, query);
    const body = await response.json();
    assert.ok(body.results.length > 0, query);
    assert.equal(body.warning, undefined);
    assert.ok(
      body.results.every((r: { point: [number, number] }) =>
        isWithinSupportedArea(...r.point),
      ),
    );
    assert.ok(
      body.diagnostics.every(
        (d: { fetchedAt: string }) => Date.parse(d.fetchedAt) < Date.now(),
      ),
    );
  }
  assert.ok(
    searchUnifiedCatalog("3809 SW Mistletoe Ave", a).some(
      (r) => r.label === "3809 SW MISTLETOE AVE",
    ),
  );
  assert.equal(networkCalls, 0);
});

test("unsupported schema and incomplete deployment snapshots fail instead of silently dropping sources", () => {
  const full = snapshot();
  assert.throws(
    () => indexCatalogSnapshot({ ...full, schemaVersion: 999 }),
    /Incomplete official catalog snapshot/,
  );
  assert.throws(
    () =>
      indexCatalogSnapshot({ ...full, inventories: full.inventories.slice(1) }),
    /Incomplete official catalog snapshot/,
  );
  assert.throws(
    () =>
      indexCatalogSnapshot({
        ...full,
        inventories: full.inventories.map((i, n) =>
          n === 0 ? full.inventories[1] : i,
        ),
      }),
    /Incomplete official catalog snapshot/,
  );
});

test("missing deployment asset returns unavailable promptly without rebuilding from external services", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "pathsafe-no-catalog-"));
  const moduleURL = pathToFileURL(
    path.resolve("lib/geocoding/catalog/index.ts"),
  ).href;
  try {
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `
      import {getUnifiedCatalog} from ${JSON.stringify(moduleURL)};
      process.chdir(${JSON.stringify(empty)});
      let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('network must not run');};
      try {await getUnifiedCatalog();process.exitCode=1;}catch(error){console.log(JSON.stringify({message:error.message,calls}));}
    `,
      ],
      { encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.deepEqual(JSON.parse(output), {
      message: "Official location catalog is unavailable",
      calls: 0,
    });
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
