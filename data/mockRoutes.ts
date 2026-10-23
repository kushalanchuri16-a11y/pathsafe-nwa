import type { RouteComparison } from "@/types/routes";
// Hand-drawn schematic demo geometry. Not routing output or verified facility geometry.
export const mockComparison: RouteComparison = {
  source: "mock",
  start: { label: "Austin-Baggett Park", point: [36.3657, -94.2036] },
  destination: { label: "Lawrence Plaza", point: [36.3746, -94.2075] },
  routes: [
    {
      id: "fastest",
      name: "Fastest Route",
      recommended: false,
      geometry: [
        [36.3657, -94.2036],
        [36.366, -94.206],
        [36.371, -94.206],
        [36.371, -94.208],
        [36.3746, -94.208],
        [36.3746, -94.2075],
      ],
      metrics: { minutes: 17, miles: 0.9, coverage: 75, gaps: 3, score: 70 },
    },
    {
      id: "pathsafe",
      name: "PathSafe Route",
      recommended: true,
      geometry: [
        [36.3657, -94.2036],
        [36.366, -94.205],
        [36.369, -94.205],
        [36.369, -94.208],
        [36.3746, -94.208],
        [36.3746, -94.2075],
      ],
      metrics: { minutes: 17.1, miles: 0.9, coverage: 96, gaps: 1, score: 95 },
    },
  ],
  infrastructure: [
    {
      id: "demo-trail",
      kind: "trail",
      source: "mock",
      geometry: [
        [36.366, -94.205],
        [36.369, -94.205],
        [36.369, -94.208],
        [36.3746, -94.208],
      ],
    },
  ],
};
