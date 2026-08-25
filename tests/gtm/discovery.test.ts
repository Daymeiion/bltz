import { describe, expect, it } from "vitest";
import { gtmCustomerDiscoveryInputSchema } from "@/lib/gtm/discovery";

const contactId = "8b148fe2-5e87-4a42-9b69-74341f75854a";

describe("GTM structured customer discovery input", () => {
  it("preserves unknown answers as null", () => {
    const value = gtmCustomerDiscoveryInputSchema.parse({
      contactId,
      problemDiscussed: "Teams lack a reliable alumni activation workflow.",
      wouldUse: null,
      wouldPilot: null,
      wouldPay: null,
    });

    expect(value).toMatchObject({ wouldUse: null, wouldPilot: null, wouldPay: null });
  });

  it("requires a structured finding rather than an empty shell record", () => {
    expect(gtmCustomerDiscoveryInputSchema.safeParse({ contactId }).success).toBe(false);
  });

  it("accepts an explicit no and does not confuse it with unknown", () => {
    const value = gtmCustomerDiscoveryInputSchema.parse({ contactId, wouldPay: false });
    expect(value.wouldPay).toBe(false);
  });

  it("rejects an introduction target after an explicit no", () => {
    const result = gtmCustomerDiscoveryInputSchema.safeParse({
      contactId,
      introductionOffered: false,
      introductionTarget: "Conference commissioner",
    });
    expect(result.success).toBe(false);
  });
});
