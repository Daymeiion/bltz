import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { collectActivityPages, filterPreviews, pageOf, type PreviewRow } from "@/lib/preview-lockers/funnel-workspace";
import { funnelMetrics } from "@/lib/preview-lockers/conversion";
vi.mock("@/app/admin/gtm/funnel/actions", () => ({ conversionAdminAction: vi.fn() }));
import { FunnelWorkspace } from "@/app/admin/gtm/funnel/FunnelWorkspace";

const rows: PreviewRow[] = Array.from({ length: 100 }, (_, i) => ({
  preview_id: `preview-${i}`, contact_id: `contact-${i}`, name: `Athlete ${String(i).padStart(3, "0")}`,
  slug: `athlete-${i}`, campaign: "spring", channel: "email", source: "alumni", relationship: "warm",
  is_test: false, sent_at: i < 50 ? "2026-09-01T12:00:00Z" : null, created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z", created_by: "admin", referral_token: null,
  response: i === 99 ? { preview_id: `preview-${i}`, actor_id: "user", state: "declined", email: null, decline_reason: null, dashboard_interest: false, updates_permission: false, created_at: "2026-09-02T12:00:00Z", updated_at: "2026-09-02T12:00:00Z" } : null,
  activity: [],
}));

describe("Preview funnel at 100 athletes", () => {
  it("reads beyond the database 1000-row page without withholding complete totals", async () => {
    const events = Array.from({ length: 1205 }, (_, id) => ({ id }));
    const result = await collectActivityPages(async offset => events.slice(offset, offset + 1000));
    expect(result.rows).toHaveLength(1205);
    expect(result.limited).toBe(false);
    expect((await collectActivityPages(async offset => events.slice(offset, offset + 1000), 1000)).limited).toBe(true);
    await expect(collectActivityPages(async () => { throw Error("unavailable"); })).rejects.toThrow("unavailable");
  });
  it("paginates without dropping or duplicating athletes", () => {
    const pages = Array.from({ length: 7 }, (_, i) => pageOf(rows, i + 1));
    expect(pages[0].rows).toHaveLength(15);
    expect(pages[6].rows).toHaveLength(10);
    expect(new Set(pages.flatMap(p => p.rows.map(r => r.preview_id))).size).toBe(100);
    expect(pageOf([], 8)).toMatchObject({ page: 1, pages: 1, total: 0 });
  });
  it("filters across the entire cohort before pagination", () => {
    expect(filterPreviews(rows, "Athlete 099", "all", "name")).toHaveLength(1);
    expect(filterPreviews(rows, "", "declined", "latest")[0].name).toBe("Athlete 099");
    expect(filterPreviews(rows, "", "awaiting", "name")).toHaveLength(99);
    expect(pageOf(filterPreviews(rows, "Athlete 099", "all", "name"), 7).page).toBe(1);
  });
  it("renders 15 summary rows, keeps details on demand and preserves sent denominators", () => {
    const html = renderToStaticMarkup(<FunnelWorkspace rows={rows} referrals={[]} metrics={funnelMetrics(rows, [])} truncated={false} listsTruncated={false} contacts={[]} previews={[]} query={{}} />);
    expect(html.match(/aria-label="Open timeline for/g)).toHaveLength(15);
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain("50");
    expect(html).toContain("All conversion measures");
    expect(html).toContain("Next previews page");
  });
  it("withholds visual totals when activity is incomplete", () => {
    const html = renderToStaticMarkup(<FunnelWorkspace rows={rows} referrals={[]} metrics={funnelMetrics(rows, [])} truncated listsTruncated={false} contacts={[]} previews={[]} query={{}} />);
    expect(html).toContain("Totals are withheld");
    expect(html).not.toContain('aria-label="Conversion overview"');
  });
});
