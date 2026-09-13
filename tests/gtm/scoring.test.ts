import { describe, expect, it } from "vitest";
import {
  calculateEnterprisePriority,
  ENTERPRISE_PRIORITY_WEIGHTS,
  priorityTierForScore,
} from "@/lib/gtm/scoring";

describe("enterprise GTM priority scoring", () => {
  it("keeps the approved weights explicit and normalized", () => {
    expect(ENTERPRISE_PRIORITY_WEIGHTS).toEqual({
      relationshipStrength: 0.25,
      bltzRelevance: 0.25,
      buyingAuthority: 0.2,
      networkLeverage: 0.15,
      timing: 0.15,
    });

    expect(
      Object.values(ENTERPRISE_PRIORITY_WEIGHTS).reduce(
        (total, weight) => total + weight,
        0,
      ),
    ).toBeCloseTo(1);
  });

  it("normalizes the 0-5 input scale to 0-100", () => {
    expect(
      calculateEnterprisePriority({
        relationshipStrength: 5,
        bltzRelevance: 5,
        buyingAuthority: 5,
        networkLeverage: 5,
        timing: 5,
      }),
    ).toEqual({ score: 100, tier: "A" });

    expect(
      calculateEnterprisePriority({
        relationshipStrength: 0,
        bltzRelevance: 0,
        buyingAuthority: 0,
        networkLeverage: 0,
        timing: 0,
      }),
    ).toEqual({ score: 0, tier: "D" });
  });

  it("rounds a weighted enterprise result once at the final boundary", () => {
    expect(
      calculateEnterprisePriority({
        relationshipStrength: 5,
        bltzRelevance: 4,
        buyingAuthority: 3,
        networkLeverage: 2,
        timing: 1,
      }),
    ).toEqual({ score: 66, tier: "B" });
  });

  it.each([
    [0, "D"],
    [39, "D"],
    [40, "C"],
    [59, "C"],
    [60, "B"],
    [79, "B"],
    [80, "A"],
    [100, "A"],
  ] as const)("maps score %s to tier %s", (score, tier) => {
    expect(priorityTierForScore(score)).toBe(tier);
  });

  it.each([-1, 5.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid criterion value of %s",
    (relationshipStrength) => {
      expect(() =>
        calculateEnterprisePriority({
          relationshipStrength,
          bltzRelevance: 3,
          buyingAuthority: 3,
          networkLeverage: 3,
          timing: 3,
        }),
      ).toThrow(RangeError);
    },
  );

  it.each([-1, 101, Number.NaN])(
    "rejects an invalid final score of %s",
    (score) => {
      expect(() => priorityTierForScore(score)).toThrow(RangeError);
    },
  );
});
