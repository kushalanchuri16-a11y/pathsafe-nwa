import type { InfrastructureKind } from "@/types/routes";
export type TrailAttributes = Record<string, string | number | null>;
// Admit explicit public pedestrian/shared-use inventory, never the whole mixed REST layer.
export function trailEligibility(
  p: TrailAttributes,
  now = Date.now(),
): { eligible: boolean; kind: InfrastructureKind; exclusion?: string } {
  const t = (k: string) =>
    String(p[k] ?? "")
      .trim()
      .toLowerCase();
  const reject = (reason: string) => ({
    eligible: false,
    kind: "other" as const,
    exclusion: reason,
  });
  if (t("useaccess") !== "public")
    return reject("Explicit public access missing");
  if (t("maintowner") === "private")
    return reject("Private facility maintenance/ownership");
  if (t("bikesallow") === "bike only") return reject("Bicycle-only facility");
  if (
    ["closed", "detour"].includes(t("Closure_Status")) ||
    t("facdescrip") === "closed"
  )
    return reject("Closed or detoured facility");
  const start = Number(p.Start_Closure),
    end = Number(p.End_Closure);
  if (start > 0 && start <= now && (!end || end >= now))
    return reject("Active dated closure");
  if (
    t("Approved") === "no" ||
    Number(p.constrdate) > now ||
    /\b(proposed|planned|future)\b/.test(t("prim_name") + " " + t("facdescrip"))
  )
    return reject("Unapproved/proposed/future facility");
  if (!["yes", "no"].includes(t("bikesallow")))
    return reject(
      "Walking/shared-use classification not sufficiently established",
    );
  const cls = t("trltyptxt"),
    surface = t("surftype");
  if (
    [
      "off-street trail",
      "side-path trail",
      "park trail",
      "neighborhood trail",
    ].includes(cls) &&
    ["concrete", "asphalt", "paved"].includes(surface)
  )
    return { eligible: true, kind: "trail" };
  if (
    cls === "hiking" &&
    [
      "dirt",
      "gravel",
      "unpaved",
      "wood",
      "concrete",
      "asphalt",
      "paved",
    ].includes(surface)
  )
    return { eligible: true, kind: "trail" };
  return reject(
    "Not a documented paved/shared-use or explicit hiking facility",
  );
}
