export interface Thresholds { attach: number; confirm: number; }
export const DEFAULT_THRESHOLDS: Thresholds = { attach: 0.86, confirm: 0.72 };

export type ClusterDecision = "attach" | "confirm" | "new";

export function decideCluster(
  bestScore: number | null,
  t: Thresholds = DEFAULT_THRESHOLDS
): ClusterDecision {
  if (bestScore === null) return "new";
  if (bestScore >= t.attach) return "attach";
  if (bestScore >= t.confirm) return "confirm";
  return "new";
}
