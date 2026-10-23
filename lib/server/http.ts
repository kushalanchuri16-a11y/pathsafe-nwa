export type Fetcher = typeof fetch;
export async function fetchJson(
  url: string,
  init: RequestInit = {},
  fetcher: Fetcher = fetch,
): Promise<unknown> {
  const response = await fetcher(url, {
    ...init,
    cache: "no-store",
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`Upstream request failed (HTTP ${response.status}).`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object")
    throw new Error("Invalid upstream JSON response.");
  if ("error" in body) throw new Error("Upstream API reported an error.");
  return body;
}
