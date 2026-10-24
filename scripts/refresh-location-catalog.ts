import { gzipSync } from "node:zlib";
import { writeFile, mkdir, rename } from "node:fs/promises";
import {
  fetchOfficialLocationSources,
  buildUnifiedLocationCatalog,
} from "../lib/geocoding/catalog";
import {
  packSnapshot,
  unpackSnapshot,
} from "../lib/geocoding/catalog/snapshot";
const { inventories, diagnostics } = await fetchOfficialLocationSources();
await mkdir("data/location-catalog", { recursive: true });
await writeFile(
  "data/location-catalog/refresh-diagnostics.json",
  JSON.stringify(
    { checkedAt: new Date().toISOString(), diagnostics },
    null,
    2,
  ) + "\n",
);
if (diagnostics.some((d) => d.status === "unavailable"))
  throw new Error(
    "Incomplete refresh; previous snapshot preserved, see refresh-diagnostics.json",
  );
if (!inventories.length)
  throw new Error("No official sources available; previous snapshot preserved");
const snapshot = packSnapshot(inventories);
await writeFile(
  "data/location-catalog/snapshot.json.gz.tmp",
  gzipSync(JSON.stringify(snapshot)),
);
await rename(
  "data/location-catalog/snapshot.json.gz.tmp",
  "data/location-catalog/snapshot.json.gz",
);
const catalog = buildUnifiedLocationCatalog(
  unpackSnapshot(snapshot),
  diagnostics,
);
console.log(
  JSON.stringify(
    {
      sources: inventories.length,
      failures: diagnostics.filter((d) => d.status === "unavailable"),
      raw: inventories.map((i) => ({
        source: i.id,
        raw: i.rawCount,
        normalized: i.records.length,
        rejected: i.rejected.length,
      })),
      deduplicated: catalog.records.length,
      duplicatesRemoved: catalog.duplicatesRemoved,
    },
    null,
    2,
  ),
);
