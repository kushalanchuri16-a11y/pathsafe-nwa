// Search-only ranking: NEVER imported by production analysis, scoring, or UI.
export interface DemoQualityInput {
  qualifying: boolean;
  coverageGain: number;
  recommendedCoverage: number;
  addedSeconds: number;
  distinctFraction: number;
}
export function demoQuality(x: DemoQualityInput) {
  if (!x.qualifying) return 0;
  return (
    100 *
    (0.4 * Math.min(1, Math.max(0, x.coverageGain) / 30) +
      0.3 * Math.min(1, Math.max(0, x.recommendedCoverage) / 100) +
      0.2 * (1 - Math.min(1, Math.max(0, x.addedSeconds) / 300)) +
      0.1 * Math.min(1, Math.max(0, x.distinctFraction)))
  );
}
