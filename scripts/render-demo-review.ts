import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import type {
  Coordinate,
  RouteCandidate,
  InfrastructureSegment,
} from "../types/routes";
const { results } = JSON.parse(
  await readFile("data/demo-search/search-results.json", "utf8"),
);
const { segments } = JSON.parse(
  await readFile("data/demo-search/audited-infrastructure.json", "utf8"),
) as { segments: InfrastructureSegment[] };
await mkdir("docs/demo-search", { recursive: true });
for (const id of ["pair-20", "pair-11", "pair-10"]) {
  const row = results.find((r: { pair: { id: string } }) => r.pair.id === id),
    a = row.audited;
  const routes = a.routes as RouteCandidate[],
    fast = routes.find((r) => r.id === a.fastestId)!,
    rec = routes.find((r) => r.id === a.recommendedId)!;
  const coords = [
    ...fast.geometry,
    ...rec.geometry,
    row.pair.start.point,
    row.pair.destination.point,
  ] as Coordinate[];
  const lat0 = coords.reduce((n, p) => n + p[0], 0) / coords.length,
    lon0 = coords[0][1];
  const xy = ([lat, lon]: Coordinate) => [
    (lon - lon0) * 111195.08 * Math.cos((lat0 * Math.PI) / 180),
    (lat - lat0) * 111195.08,
  ];
  const points = coords.map(xy),
    xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const xmin = Math.min(...xs) - 60,
    xmax = Math.max(...xs) + 60,
    ymin = Math.min(...ys) - 60,
    ymax = Math.max(...ys) + 60;
  const scale = Math.min(800 / (xmax - xmin), 610 / (ymax - ymin));
  const project = (p: Coordinate) => {
    const [x, y] = xy(p);
    return [50 + (x - xmin) * scale, 150 + (ymax - y) * scale];
  };
  const line = (g: Coordinate[]) =>
    g
      .map((p) =>
        project(p)
          .map((n) => n.toFixed(2))
          .join(","),
      )
      .join(" ");
  const xml = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const infrastructure = segments.filter(
    (s) =>
      s.eligible &&
      s.geometry.some((p) => {
        const [x, y] = xy(p);
        return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
      }),
  );
  const marker = (p: Coordinate, label: string) => {
    const [x, y] = project(p);
    return `<circle cx="${x}" cy="${y}" r="7" fill="white" stroke="#182536" stroke-width="2"/><text x="${x + 11}" y="${y - 9}" font-size="14" font-weight="bold">${label}</text>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="840" viewBox="0 0 900 840"><title>${xml(row.pair.start.label)} to ${xml(row.pair.destination.label)} — actual recorded route geometry</title><rect width="900" height="840" fill="#fff"/><style>text{font-family:Arial,sans-serif;fill:#182536}</style><text x="30" y="30" font-size="21" font-weight="bold">${xml(row.pair.start.label)} → ${xml(row.pair.destination.label)}</text><text x="30" y="58" font-size="16">Coverage ${a.fastestCoverage.toFixed(2)}% → ${a.recommendedCoverage.toFixed(2)}% · +${a.addedSeconds.toFixed(3)}s · ${a.addedDistanceMeters.toFixed(3)}m</text><path d="M30 90h30" stroke="#2469bd" stroke-width="5" stroke-dasharray="9 5"/><text x="70" y="95" font-size="14">Fastest</text><path d="M175 90h30" stroke="#008565" stroke-width="5"/><text x="215" y="95" font-size="14">Recommended</text><path d="M390 90h30" stroke="#aaa" stroke-width="3"/><text x="430" y="95" font-size="14">Eligible official infrastructure</text><text x="30" y="123" font-size="13">Geometry review · local meter projection · north up · no basemap · not navigation</text><defs><clipPath id="map"><rect x="30" y="140" width="840" height="635"/></clipPath></defs><g clip-path="url(#map)"><rect x="30" y="140" width="840" height="635" fill="#f6f8fa"/>${infrastructure.map((s) => `<polyline points="${line(s.geometry)}" fill="none" stroke="#b8bec5" stroke-width="2"/>`).join("")}<polyline points="${line(rec.geometry)}" fill="none" stroke="#008565" stroke-width="6"/><polyline points="${line(fast.geometry)}" fill="none" stroke="#2469bd" stroke-width="3" stroke-dasharray="9 5"/>${marker(row.pair.start.point, "Origin")}${marker(row.pair.destination.point, "Destination")}</g><text x="30" y="803" font-size="13">City facility points shown; provider may snap endpoints. Recorded 2026-10-23. See DEMO_ROUTE_SEARCH.md.</text><text x="30" y="824" font-size="13">Overlap/proximity does not establish connectivity, access, surface condition or crossing safety.</text></svg>`;
  await writeFile(`docs/demo-search/${id}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`docs/demo-search/${id}.png`);
}
