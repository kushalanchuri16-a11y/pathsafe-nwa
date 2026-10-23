// Internal map coordinates are [latitude, longitude]. GeoJSON conversion occurs at provider boundaries.
export type Coordinate = [number, number];
export type DataSource = "mock" | "live";
export type InfrastructureKind =
  "sidewalk" | "trail" | "crossing" | "bicycle" | "other";
export interface RouteMetrics {
  minutes: number;
  miles: number;
  coverage: number;
  gaps: number;
  score: number;
  lengthMeters?: number;
  coveredMeters?: number;
  uncoveredMeters?: number;
  providerDistanceMeters?: number;
  seconds?: number;
}
export interface InfrastructureSegment {
  id: string;
  kind: InfrastructureKind;
  geometry: Coordinate[];
  source: DataSource;
  eligible?: boolean;
  exclusion?: string;
  attributes?: Record<string, string | number | null>;
}
export interface RouteCandidate {
  id: string;
  name: string;
  recommended: boolean;
  geometry: Coordinate[];
  metrics: RouteMetrics;
  source?: DataSource;
}
export interface Recommendation {
  routeId: string;
  explanation: string;
  factors: string[];
}
export interface DataProvenance {
  gisEndpoint: string;
  gisSources?: {
    endpoint: string;
    fetchedAt: string;
    cacheHit: boolean;
    featureCount: number;
  }[];
  gisFetchedAt: string;
  routingFetchedAt: string;
  gisCacheHit: boolean;
  routingCacheHit: boolean;
  featureCount: number;
  segmentCount: number;
  eligibleSegmentCount: number;
  countsByKind: Record<string, number>;
  toleranceMeters: number;
  gapThresholdMeters: number;
  algorithm: string;
  candidatesReceived: number;
  candidatesRetained: number;
  routingEndpoint: string;
  warnings: string[];
}
export interface RouteComparison {
  source: DataSource;
  start: { label: string; point: Coordinate };
  destination: { label: string; point: Coordinate };
  routes: RouteCandidate[];
  infrastructure: InfrastructureSegment[];
  recommendation?: Recommendation;
  provenance?: DataProvenance;
}
export type DemoScenario = "success" | "no-route" | "error";
