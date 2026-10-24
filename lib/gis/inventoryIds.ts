import { fetchJson, type Fetcher } from "@/lib/server/http";
// ArcGIS can represent zero matches as explicit null IDs. Confirm emptiness;
// never reinterpret a missing/malformed/incomplete inventory as zero coverage.
export async function confirmedInventoryIds(
  body: unknown,
  url: URL,
  signal: AbortSignal,
  fetcher: Fetcher,
  maximum: number,
) {
  const data = body as {
    objectIds?: unknown[] | null;
    objectIdFieldName?: string;
    exceededTransferLimit?: boolean;
  };
  if (!data || data.exceededTransferLimit)
    throw new Error("Incomplete GIS record inventory.");
  if (
    data.objectIds === null &&
    data.objectIdFieldName?.toUpperCase() === "OBJECTID"
  ) {
    const countUrl = new URL(url);
    countUrl.searchParams.delete("returnIdsOnly");
    countUrl.searchParams.set("returnCountOnly", "true");
    const result = (await fetchJson(
      countUrl.toString(),
      { signal },
      fetcher,
    )) as { count?: unknown; exceededTransferLimit?: boolean };
    if (result.count === 0 && !result.exceededTransferLimit) return [];
    throw new Error("Null GIS IDs do not have a confirmed zero count.");
  }
  if (
    !Array.isArray(data.objectIds) ||
    data.objectIds.some((id) => !Number.isInteger(id)) ||
    data.objectIds.length > maximum
  )
    throw new Error("Incomplete GIS record inventory.");
  return [...new Set(data.objectIds as number[])].sort((a, b) => a - b);
}
