import { readFile, writeFile } from "node:fs/promises";
const original = JSON.parse(
    await readFile("data/reliability/live-summary.json", "utf8"),
  ),
  checks = [];
for (const row of original.cases) {
  await new Promise((r) => setTimeout(r, 2000));
  const searchResponse = await fetch(
      "http://127.0.0.1:3000/api/locations?q=" + encodeURIComponent(row.query),
    ),
    search = await searchResponse.json();
  const start = search.results[0],
    response = await fetch("http://127.0.0.1:3000/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: { label: start.label, point: start.point },
        destination: row.destination,
      }),
      signal: AbortSignal.timeout(65000),
    }),
    body = await response.json();
  if (response.status !== row.status)
    throw new Error("Changed result for " + row.query + JSON.stringify(body));
  checks.push({
    query: row.query,
    status: response.status,
    source: body.comparison?.source ?? null,
    error: body.error ?? null,
    metrics: body.comparison?.routes.map(
      (r: { id: string; metrics: unknown }) => ({
        id: r.id,
        metrics: r.metrics,
      }),
    ),
  });
  console.log(row.query, response.status);
}
await writeFile(
  "data/reliability/post-check-live.json",
  JSON.stringify({ validatedAt: new Date().toISOString(), checks }, null, 2) +
    "\n",
);
