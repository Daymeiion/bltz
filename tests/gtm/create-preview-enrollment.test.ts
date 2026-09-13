import { describe, expect, it } from "vitest";
import { previewEnrollment } from "@/lib/preview-lockers/conversion";
describe("Combined preview enrollment input", () => {
  const input = { contact_id: "65fd4dbe-d2ab-4fd7-882c-1b024a10c354", campaign: "alumni-90", source: "founder_network", channel: "email", relationship: "warm" };
  it("requires an explicit contact and valid attribution", () => {
    expect(previewEnrollment.safeParse({ ...input, contact_id: "" }).success).toBe(false);
    expect(previewEnrollment.safeParse({ ...input, campaign: "" }).success).toBe(false);
    expect(previewEnrollment.safeParse({ ...input, source: "email@example.test" }).success).toBe(false);
  });
  it("retains test exclusion without accepting viewer or ownership grants", () => {
    expect(previewEnrollment.parse({ ...input, is_test: true }).is_test).toBe(true);
    expect(previewEnrollment.parse(input).is_test).toBe(false);
    expect(previewEnrollment.safeParse({ ...input, viewer_id: input.contact_id }).success).toBe(false);
  });
});
