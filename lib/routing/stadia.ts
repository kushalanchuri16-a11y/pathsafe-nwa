import { RoutingProviderError } from "./errors";

// Stadia accepts polyline6, not GeoJSON, for shape_format. Decode only this
// transport representation; the existing GeoJSON parser retains all validation.
export function decodePolyline6(encoded: string): [number, number][] {
  let index = 0,
    lat = 0,
    lon = 0;
  const coordinates: [number, number][] = [];
  const invalid = () => new RoutingProviderError("ROUTING_MALFORMED_RESPONSE");
  function nextDelta() {
    let value = 0,
      shift = 0;
    while (true) {
      if (index >= encoded.length || shift > 30) throw invalid();
      const byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw invalid();
      value += (byte & 31) * 2 ** shift;
      if (byte < 32) break;
      shift += 5;
    }
    return value % 2 ? -(value + 1) / 2 : value / 2;
  }
  while (index < encoded.length) {
    lat += nextDelta();
    lon += nextDelta();
    if (Math.abs(lat) > 90000000 || Math.abs(lon) > 180000000) throw invalid();
    coordinates.push([lon / 1000000, lat / 1000000]);
  }
  if (coordinates.length < 2) throw invalid();
  return coordinates;
}

export function stadiaGeoJSON(body: unknown): unknown {
  if (
    !body ||
    typeof body !== "object" ||
    !("routes" in body) ||
    !Array.isArray(body.routes)
  )
    return body; // Existing parser handles OSRM no-route / malformed envelopes.
  return {
    ...body,
    routes: body.routes.map((route: unknown) => {
      if (
        !route ||
        typeof route !== "object" ||
        !("geometry" in route) ||
        typeof route.geometry !== "string"
      )
        throw new RoutingProviderError("ROUTING_MALFORMED_RESPONSE");
      return {
        ...route,
        geometry: {
          type: "LineString",
          coordinates: decodePolyline6(route.geometry),
        },
      };
    }),
  };
}
