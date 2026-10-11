import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewActivityPanel } from "@/app/admin/gtm/funnel/PreviewActivityPanel";
import type { loadPreviewFunnelReport } from "@/lib/analytics/preview-funnel";

type Report = Awaited<ReturnType<typeof loadPreviewFunnelReport>>;
const keith = { id: "10000000-0000-4000-8000-000000000001", label: "Keith Rivers", slug: "keith-rivers-preview", access: "public" as const };
function report(overrides: Partial<Report> = {}): Report {
  return {
    generatedAt: "2026-10-11T20:00:00Z", windowStart: "2026-07-13T20:00:00Z", windowEnd: "2026-10-11T20:00:00Z",
    environment: "production", previews: [keith, { ...keith, id: "10000000-0000-4000-8000-000000000002", label: "Future Player", slug: "future-player" }], previewsTruncated: false,
    selectedPreview: keith, selectionStatus: "ready",
    activity: { status: "available", reason: null, truncated: false, eventWatermark: "2026-10-11 19:30:00.000", metrics: [
      { eventKind: "locker_view", eventCount: 3, tabSessionCount: 2 }, { eventKind: "stats_view", eventCount: 1, tabSessionCount: 1 },
      { eventKind: "photo_open", eventCount: 4, tabSessionCount: null }, { eventKind: "accepted", eventCount: 1, tabSessionCount: 1 },
      { eventKind: "claim_submit", eventCount: 1, tabSessionCount: 1 },
    ] },
    delivery: { status: "available", reason: null, truncated: false, acceptedEventsTotal: 12, sampledEvents: 12,
      eventCountsByState: { queued: 1, pending: 1, published: 1, processing: 1, retry: 1, acknowledged: 5, quarantined: 1, dead_letter: 1, unknown: 0 },
      acceptedAtWatermark: "2026-10-11T19:30:00Z", acknowledgedAtWatermark: "2026-10-11T19:35:00Z", oldestPendingAgeSeconds: 600,
      basis: "latest_1000_preview_outbox_events", watermarkBasis: "highest_delivery_acknowledgment_not_contiguous_event_coverage" },
    ...overrides,
  };
}
function render(value = report(), query: Record<string, string | undefined> = {}) {
  return renderToStaticMarkup(<PreviewActivityPanel report={value} query={query} />);
}

describe("Admin public preview activity panel", () => {
  it("includes Keith and future shared previews while preserving cohort filters and measurement boundaries", () => {
    const html = render(report(), { campaign: "alumni", channel: "email", since: "2026-10-01", arbitrary: "discard" });
    expect(html).toContain('name="activity_preview"');
    expect(html).toContain("Keith Rivers");
    expect(html).toContain("Future Player");
    expect(html).toContain('name="campaign" value="alumni"');
    expect(html).not.toContain("discard");
    expect(html).toContain("Stats viewed");
    expect(html).toContain("Claim interest submitted");
    expect(html).toContain("tab sessions are not people");
    expect(html).toContain("does not verify identity or Locker ownership");
    expect(html).toContain("Unavailable across media groups");
    expect(html).toContain("analytics acknowledgment is not proof an invitation email was delivered");
    expect(html).not.toContain("Verified claims");
  });
  it("shows every delivery outcome and warns that the latest acknowledgment does not guarantee earlier delivery", () => {
    const html = render();
    for (const label of ["Queued", "Pending", "Published to QStash", "Processing", "Waiting to retry", "Acknowledged by Tinybird", "Quarantined", "Dead letter"]) expect(html).toContain(label);
    expect(html).toContain("10 minutes");
    expect(html).toContain("not a guarantee that all earlier events were delivered");
    expect(html).toContain("External video opens do not prove YouTube playback");
  });
  it("does not turn unavailable connections into zero engagement or an empty queue", () => {
    const value = report();
    const html = render(report({ activity: { ...value.activity, status: "unavailable", reason: "preview_report_unavailable" }, delivery: { ...value.delivery, status: "unavailable", reason: "analytics_delivery_registry_unavailable" } }));
    expect(html).toContain("Counts are not shown as zero");
    expect(html).toContain("Missing registry data is not counted as an empty queue");
    expect(html).not.toContain("Locker viewing tab sessions:");
    expect(html).not.toContain("Waiting to retry");
    expect(html).not.toContain("preview_report_unavailable");
  });
  it("withholds incomplete engagement totals and labels delivery statuses as a sample", () => {
    const value = report();
    const html = render(report({ activity: { ...value.activity, truncated: true }, delivery: { ...value.delivery, truncated: true, sampledEvents: 1000, acceptedEventsTotal: 1500 } }));
    expect(html).toContain("Engagement totals are withheld");
    expect(html).not.toContain("Locker viewing tab sessions:");
    expect(html).toContain("latest 1,000 accepted preview events");
    expect(html).toContain("sample counts, not complete totals");
    expect(html).toContain("1,500 accepted events");
  });
  it("labels assigned private previews without asserting an unexpired invitation or granting viewing access", () => {
    const privatePreview = { ...keith, access: "private" as const };
    const html = render(report({ previews: [privatePreview], selectedPreview: privatePreview }));
    expect(html).toContain("Assigned private invitation");
    expect(html).toContain("does not verify whether the private invitation has expired");
    expect(html).toContain("does not grant viewing access");
    expect(html).not.toContain("Open preview</a>");
  });
  it("makes unavailable private assignment checks explicit and withholds their activity", () => {
    const unavailablePreview = { ...keith, access: "unavailable" as const };
    const html = render(report({ previews: [unavailablePreview], selectedPreview: unavailablePreview, selectionStatus: "unavailable" }));
    expect(html).toContain("private access unavailable");
    expect(html).toContain("Preview activity unavailable");
    expect(html).not.toContain("Player engagement</h4>");
    expect(html).not.toContain("Analytics delivery status</h4>");
  });
  it("shows empty and invalid selection states without presenting draft activity as measured", () => {
    const empty = render(report({ previews: [], selectedPreview: null, selectionStatus: "empty" }));
    expect(empty).toContain("No shared previews yet");
    expect(empty).toContain("Future shared lockers will be included automatically");
    expect(empty).toContain('disabled=""');
    expect(empty).not.toContain("Player engagement</h4>");
    const invalid = render(report({ selectedPreview: null, selectionStatus: "invalid" }));
    expect(invalid).toContain("Choose a valid player preview");
    const draft = render(report({ selectedPreview: { ...keith, access: "unshared" }, selectionStatus: "unshared" }));
    expect(draft).toContain("Draft activity is excluded");
    expect(draft).not.toContain("Analytics delivery status</h4>");
  });
});
