import type { GtmPriorityTier } from "@/lib/gtm/types";

export const ENTERPRISE_SCORE_MIN = 0;
export const ENTERPRISE_SCORE_MAX = 5;

export const ENTERPRISE_PRIORITY_WEIGHTS = Object.freeze({
  relationshipStrength: 0.25,
  bltzRelevance: 0.25,
  buyingAuthority: 0.2,
  networkLeverage: 0.15,
  timing: 0.15,
});

export type EnterprisePriorityCriterion =
  keyof typeof ENTERPRISE_PRIORITY_WEIGHTS;

export type EnterprisePriorityInputs = Record<
  EnterprisePriorityCriterion,
  number
>;

export interface EnterprisePriorityResult {
  score: number;
  tier: GtmPriorityTier;
}

function assertValidInput(
  criterion: EnterprisePriorityCriterion,
  value: number,
): void {
  if (
    !Number.isFinite(value) ||
    value < ENTERPRISE_SCORE_MIN ||
    value > ENTERPRISE_SCORE_MAX
  ) {
    throw new RangeError(
      `${criterion} must be a finite number from ${ENTERPRISE_SCORE_MIN} to ${ENTERPRISE_SCORE_MAX}`,
    );
  }
}

export function priorityTierForScore(score: number): GtmPriorityTier {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("priority score must be a finite number from 0 to 100");
  }

  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

/**
 * Calculates the founder-defined enterprise score only. Athlete contacts need
 * a separately approved model and must not be passed through this function.
 */
export function calculateEnterprisePriority(
  inputs: EnterprisePriorityInputs,
): EnterprisePriorityResult {
  const weightedValue = (
    Object.entries(ENTERPRISE_PRIORITY_WEIGHTS) as Array<
      [EnterprisePriorityCriterion, number]
    >
  ).reduce((total, [criterion, weight]) => {
    const value = inputs[criterion];
    assertValidInput(criterion, value);
    return total + value * weight;
  }, 0);

  const score = Math.round((weightedValue / ENTERPRISE_SCORE_MAX) * 100);

  return { score, tier: priorityTierForScore(score) };
}
