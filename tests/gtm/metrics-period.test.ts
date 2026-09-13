import { describe, expect, it } from "vitest";
import { gtmMetricsSince, parseGtmMetricsPeriod } from "@/lib/gtm/metrics-period";
describe("GTM reporting period", () => {
  it("uses bounded periods and defaults invalid input to 30 days", () => {
    expect(parseGtmMetricsPeriod("90")).toBe("90");
    expect(parseGtmMetricsPeriod("all")).toBe("all");
    expect(parseGtmMetricsPeriod("365")).toBe("30");
    expect(parseGtmMetricsPeriod(undefined)).toBe("30");
  });
  it("queries actual historical windows including all history", () => {
    const now = new Date("2026-09-11T12:00:00Z");
    expect(gtmMetricsSince("30", now)).toBe("2026-08-12T12:00:00.000Z");
    expect(gtmMetricsSince("90", now)).toBe("2026-06-13T12:00:00.000Z");
    expect(gtmMetricsSince("all", now)).toBe("-infinity");
  });
});
