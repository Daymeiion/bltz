import type { ConversionDatabase } from "@/types/preview-conversion.generated";

type Tables = ConversionDatabase["public"]["Tables"];
export type Campaign = Tables["preview_conversion_campaigns"]["Row"];
export type Response = Tables["preview_conversion_responses"]["Row"];
export type Activity = Tables["preview_conversion_events"]["Row"];
export type Referral = Tables["preview_conversion_referrals"]["Row"];
export type PreviewRow = Campaign & {
  name: string;
  slug: string | null;
  response: Response | null;
  activity: Activity[];
};
export type Queue = "all" | "awaiting" | "dashboard" | "booked" | "declined";
export const hasActivity = (row: PreviewRow, kind: string) => row.activity.some(event => event.kind === kind);
export function inQueue(row: PreviewRow, queue: Queue) {
  if (queue === "awaiting") return !row.response;
  if (queue === "dashboard") return Boolean(row.response?.dashboard_interest && !hasActivity(row, "walkthrough_completed"));
  if (queue === "booked") return hasActivity(row, "booking_confirmed") && !hasActivity(row, "walkthrough_completed");
  if (queue === "declined") return row.response?.state === "declined";
  return true;
}
export function filterPreviews(rows: PreviewRow[], search: string, queue: Queue, sort: string) {
  const term = search.trim().toLowerCase();
  return rows.filter(row => inQueue(row, queue) && [row.name, row.campaign, row.source, row.channel, row.response?.email ?? ""].join(" ").toLowerCase().includes(term))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : (b.activity[0]?.created_at ?? b.created_at).localeCompare(a.activity[0]?.created_at ?? a.created_at));
}
export function pageOf<T>(rows: T[], requestedPage: number, size = 15) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(1, Math.min(requestedPage, pages));
  return { rows: rows.slice((page - 1) * size, page * size), page, pages, total: rows.length };
}

/** A bounded full read, separate from the presentation's 15-row pagination. */
export async function collectActivityPages<T>(read: (offset: number) => Promise<T[]>, limit = 20000) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await read(offset);
    rows.push(...page);
    if (rows.length >= limit) return { rows, limited: true };
    if (page.length < 1000) return { rows, limited: false };
  }
}
