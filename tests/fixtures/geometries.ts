import type {
  Coordinate,
  RouteCandidate,
  InfrastructureSegment,
} from "../../types/routes";
const origin: Coordinate = [36.36, -94.2];
export function point(x: number, y = 0): Coordinate {
  return [
    origin[0] + y / 111195.0802335329,
    origin[1] + x / (111195.0802335329 * Math.cos((origin[0] * Math.PI) / 180)),
  ];
}
export function facility(
  a: number,
  b: number,
  y = 0,
  eligible = true,
): InfrastructureSegment {
  return {
    id: `${a}:${b}:${y}`,
    source: "live",
    kind: "sidewalk",
    geometry: [point(a, y), point(b, y)],
    eligible,
  };
}
export function candidate(
  id: string,
  coverage: number,
  seconds = 600,
  meters = 1000,
  score = coverage,
): RouteCandidate {
  return {
    id,
    name: id,
    geometry: [point(0), point(meters)],
    source: "live",
    recommended: false,
    metrics: {
      minutes: seconds / 60,
      miles: meters / 1609.344,
      seconds,
      providerDistanceMeters: meters,
      lengthMeters: meters,
      coverage,
      gaps: 0,
      score,
    },
  };
}
export function gisFeature(id = 1) {
  return {
    type: "Feature",
    properties: {
      OBJECTID: id,
      trltyptxt: "Sidewalk",
      facdescrip: "Sidewalk",
      surftype: "Concrete",
      bikesallow: "Yes",
      useaccess: "Public",
      Closure_Status: null,
    },
    geometry: {
      type: "LineString",
      coordinates: [point(0), point(100)].map(([lat, lon]) => [lon, lat]),
    },
  };
}
export function routingFixture() {
  return {
    code: "Ok",
    routes: [
      {
        weight_name: "pedestrian",
        distance: 1000,
        duration: 600,
        geometry: {
          type: "LineString",
          coordinates: [point(0), point(1000)].map(([lat, lon]) => [lon, lat]),
        },
      },
    ],
  };
}
