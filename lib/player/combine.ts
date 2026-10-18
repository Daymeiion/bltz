export const combineMetricKeys = ["forty", "ten_split", "shuttle", "cone", "vertical", "broad_jump", "bench", "height", "weight", "arm", "hand"] as const;
export type CombineMetric = typeof combineMetricKeys[number];
export const combineMetricInfo: Record<CombineMetric, { label: string; unit: string; min: number; max: number; step: number }> = {
  forty: { label: "40-yard dash", unit: "SEC", min: 1, max: 30, step: 0.01 },
  ten_split: { label: "10-yard split", unit: "SEC", min: 0.1, max: 10, step: 0.01 },
  shuttle: { label: "20-yard shuttle", unit: "SEC", min: 1, max: 30, step: 0.01 },
  cone: { label: "3-cone drill", unit: "SEC", min: 1, max: 30, step: 0.01 },
  vertical: { label: "Vertical jump", unit: "IN", min: 1, max: 100, step: 0.125 },
  broad_jump: { label: "Broad jump", unit: "IN", min: 1, max: 240, step: 0.125 },
  bench: { label: "Bench press", unit: "REPS", min: 0, max: 100, step: 1 },
  height: { label: "Event height", unit: "IN", min: 40, max: 100, step: 0.125 },
  weight: { label: "Event weight", unit: "LBS", min: 60, max: 450, step: 0.1 },
  arm: { label: "Arm length", unit: "IN", min: 10, max: 50, step: 0.125 },
  hand: { label: "Hand size", unit: "IN", min: 4, max: 16, step: 0.125 },
};
export type CombineMeasurement = { metric: CombineMetric; value: number; sourceUrl: string | null };
export type CombineResult = {
  id: string; eventType: "combine" | "pro_day"; year: number | null;
  sourceUrl: string | null; timing: "not_recorded" | "official" | "unofficial";
  measurements: CombineMeasurement[];
};
export function combineEventLabel(event: Pick<CombineResult, "eventType" | "year">) {
  return `${event.eventType === "combine" ? "Combine" : "Pro Day"}${event.year === null ? "" : ` · ${event.year}`}`;
}
export function combineValue(metric: CombineMetric, value: number) {
  if (metric === "broad_jump") return `${Math.floor(value / 12)}′ ${Number((value % 12).toFixed(3))}″`;
  return combineMetricInfo[metric].unit === "SEC" ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 10, useGrouping: false }) : String(value);
}
