import { expect, it } from "vitest";
import { awardDescription, findAwardDescription } from "@/lib/preview-lockers/award-descriptions";
import { previewContent } from "@/lib/preview-lockers/validation";

it("uses reviewed descriptions before known definitions and avoids inventing unknown criteria", () => {
  expect(awardDescription("All-American")).toContain("one of the best");
  expect(awardDescription("Lott Trophy")).toContain("character");
  expect(awardDescription("All-American", "Reviewed definition")).toBe("Reviewed definition");
  expect(awardDescription("Unfamiliar Award")).toBe("Description pending review.");
});
it("extracts a definition from source prose, not a mere award mention", () => {
  expect(findAwardDescription("Example Award", "Example Award is presented to the season's top goalkeeper.")).toContain("top goalkeeper");
  expect(findAwardDescription("Example Award", "He was nominated for the Example Award.")).toBe("Description pending review.");
});
it("preserves bounded editable descriptions and accepts older awards without them", () => {
  const base = { slug: "test-athlete", full_name: "Test Athlete", awards: [{ year: "2007", label: "All-American", description: "National recognition." }] };
  expect(previewContent.parse(base).awards[0].description).toBe("National recognition.");
  expect(previewContent.safeParse({ ...base, awards: [{ ...base.awards[0], description: "x".repeat(161) }] }).success).toBe(false);
  expect(previewContent.safeParse({ ...base, awards: [{ year: "2007", label: "All-American" }] }).success).toBe(true);
});
