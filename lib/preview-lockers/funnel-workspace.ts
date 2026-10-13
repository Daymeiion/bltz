import type { ConversionDatabase } from "@/types/preview-conversion.generated";
import type { PreviewDatabase } from "@/types/preview-lockers.generated";

type Tables = ConversionDatabase["public"]["Tables"];
export type Campaign = Tables["preview_conversion_campaigns"]["Row"];
export type Response = Tables["preview_conversion_responses"]["Row"];
export type Activity = Tables["preview_conversion_events"]["Row"];
export type Referral = Tables["preview_conversion_referrals"]["Row"];
export type PublicInquiry = Pick<PreviewDatabase["public"]["Tables"]["preview_link_inquiries"]["Row"], "id" | "preview_id" | "email" | "feature_requests" | "created_at" | "reviewed_at" | "reviewed_contact_id">;
export type PreviewRow = Campaign & {
  name: string;
  slug: string | null;
  response: Response | null;
  activity: Activity[];
  inquiry?: PublicInquiry | null;
  contactEmail?: string | null;
  canReviewInquiryEmail?: boolean;
};
export type Queue = "all" | "awaiting" | "interest" | "dashboard" | "booked" | "declined";
export const hasActivity = (row: PreviewRow, kind: string) => row.activity.some(event => event.kind === kind);
export function inQueue(row: PreviewRow, queue: Queue) {
  if (queue === "awaiting") return !row.response && !row.inquiry;
  if (queue === "interest") return Boolean(row.inquiry);
  if (queue === "dashboard") return Boolean(row.response?.dashboard_interest && !hasActivity(row, "walkthrough_completed"));
  if (queue === "booked") return hasActivity(row, "booking_confirmed") && !hasActivity(row, "walkthrough_completed");
  if (queue === "declined") return row.response?.state === "declined";
  return true;
}
export function filterPreviews(rows: PreviewRow[], search: string, queue: Queue, sort: string) {
  const term = search.trim().toLowerCase();
  return rows.filter(row => inQueue(row, queue) && [row.name, row.campaign, row.source, row.channel, row.sent_channel ?? "", row.response?.email ?? "", row.inquiry?.email ?? "", row.contactEmail ?? ""].join(" ").toLowerCase().includes(term))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : latestActivity(b).localeCompare(latestActivity(a)));
}
function latestActivity(row: PreviewRow) {
  return [row.created_at, row.activity[0]?.created_at ?? "", row.inquiry?.created_at ?? ""].sort().at(-1)!;
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
