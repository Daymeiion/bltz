export type GtmMetricsPeriod = "30" | "90" | "all";

export function parseGtmMetricsPeriod(value: unknown): GtmMetricsPeriod {
  return value === "90" || value === "all" ? value : "30";
}

export function gtmMetricsSince(period: GtmMetricsPeriod, now = new Date()): string {
  // PostgreSQL timestamptz supports -infinity: include all historical records.
  return period === "all" ? "-infinity" : new Date(now.getTime() - Number(period) * 86_400_000).toISOString();
}
