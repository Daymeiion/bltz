// @vitest-environment node
import { awardDescription } from "@/lib/preview-lockers/award-descriptions";
import { expect, it } from "vitest";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { PipelineDraft } from "@/lib/pipeline/types";

it("retains supplied award years and source links through preview validation", () => {
  const draft = { awards: [{ name: "All-American", year: "2007", source_url: "https://example.com/award" }] } as PipelineDraft;
  const result = discoveryDraft({ full_name: "Test Athlete" }, draft);
  expect(result.awards).toEqual([{ label: "All-American", description: awardDescription("All-American"), year: "2007", sourceUrl: "https://example.com/award" }]);
  expect(previewContent.parse(result).awards).toEqual(result.awards);
});

it("does not invent missing years or retain unsafe source links", () => {
  const draft = { awards: [{ name: "All-American", source_url: "javascript:alert(1)" }] } as PipelineDraft;
  expect(discoveryDraft({ full_name: "Test Athlete" }, draft).awards).toEqual([{ label: "All-American", description: awardDescription("All-American"), year: "", sourceUrl: null }]);
  expect(previewContent.safeParse({ slug: "test-athlete", full_name: "Test Athlete", awards: [{ label: "Award", year: "2007", sourceUrl: "javascript:alert(1)" }] }).success).toBe(false);
});
