export const SCORE_VERSION = "coverage-v1";
// Coverage percentage minus 2 points per >=20m grouped gap (cap 20), minus
// 10 points per 100% distance excess beyond a 10% allowance (cap 10).
export function pathsafeScore({
  coverage,
  gaps,
  lengthMeters,
  shortestMeters,
}: {
  coverage: number;
  gaps: number;
  lengthMeters: number;
  shortestMeters: number;
}) {
  if (
    ![coverage, gaps, lengthMeters, shortestMeters].every(Number.isFinite) ||
    coverage < 0 ||
    coverage > 100 ||
    gaps < 0 ||
    !Number.isInteger(gaps) ||
    lengthMeters <= 0 ||
    shortestMeters <= 0
  )
    throw new Error("Invalid scoring inputs.");
  const gapPenalty = Math.min(20, 2 * gaps),
    distancePenalty = Math.min(
      10,
      10 * Math.max(0, lengthMeters / shortestMeters - 1.1),
    );
  return Math.round(
    Math.max(0, Math.min(100, coverage - gapPenalty - distancePenalty)),
  );
}
