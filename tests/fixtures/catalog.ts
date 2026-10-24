import type { Fetcher } from "../../lib/server/http";
import type { OfficialFeature } from "../../lib/geocoding/catalog/normalize";
import { OFFICIAL_LOCATION_SOURCES } from "../../lib/geocoding/catalog/sources";
import { sourceUrl } from "../../lib/geocoding/catalog/model";
export function catalogFetcher(
  data: Record<string, OfficialFeature[]>,
  observe?: (url: URL, init?: RequestInit) => void,
): Fetcher {
  return (async (input, init) => {
    const url = new URL(String(input));
    observe?.(url, init);
    const params = init?.body
      ? new URLSearchParams(String(init.body))
      : url.searchParams;
    const source = OFFICIAL_LOCATION_SOURCES.find((s) => {
      if (url.origin + url.pathname !== sourceUrl(s) + "/query") return false;
      return params.has("returnIdsOnly") || params.has("returnCountOnly")
        ? params.get("where") === (s.where ?? "1=1")
        : params.get("outFields") ===
            [s.objectIdField ?? "OBJECTID", ...s.fields].join(",");
    });
    if (!source) throw new Error("Unknown official fixture source/view");
    const features = data[source.id] ?? [],
      field = source.objectIdField ?? "OBJECTID";
    if (params.get("returnIdsOnly"))
      return Response.json({
        objectIds: features.map((f) => f.properties[field] ?? f.id),
        objectIdFieldName: field,
      });
    const ids = new Set((params.get("objectIds") ?? "").split(",").map(Number));
    return Response.json({
      type: "FeatureCollection",
      features: features.filter((f) =>
        ids.has(Number(f.properties[field] ?? f.id)),
      ),
    });
  }) as Fetcher;
}
