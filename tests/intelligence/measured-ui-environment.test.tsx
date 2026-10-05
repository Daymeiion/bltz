import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MeasuredIntelligence } from "@/app/admin/intelligence/MeasuredIntelligence";
import { WorkflowReviewPanel } from "@/app/admin/intelligence/WorkflowReviewPanel";
import type { WorkspaceResult } from "@/lib/intelligence/workspace-types";
import type { WorkflowSummary } from "@/lib/intelligence/workflows/contracts";

function workspace(environment?: WorkflowSummary["environment"], synthetic = false): WorkspaceResult {
  const empty = { state: "ready" as const, rows: [], truncated: false };
  return { result: { query: "", asOf: "2026-10-05", evaluatedAt: "2026-10-05T12:00:00.000Z", search: empty, selectionState: "none", selected: null },
    directory: empty, profile: null, profileState: "ready", media: empty, mediaPreviewState: "ready", content: empty, momentMediaState: "ready",
    workflows: { environment, opportunities: [], activations: [], momentAssetLinks: [], history: [], measurementState: "unavailable", publishingState: "blocked_adapter_unavailable", truncated: false },
    workflowState: environment ? "ready" : "disabled", dataMode: synthetic ? "synthetic" : "live" };
}

describe("truthful measured and review environment labels", () => {
  it.each(["development", "production"] as const)("labels %s measurements and refresh without implying rights or revenue", environment => {
    const html = renderToStaticMarkup(<MeasuredIntelligence data={{ environment, reason: "No verified snapshot", snapshot: null, refreshAllowed: true }} onRefresh={vi.fn()} />);
    const title = environment === "production" ? "Production" : "Development";
    expect(html).toContain(`${title} measurements`);
    expect(html).toContain(`Refresh ${environment} measurements`);
    expect(html).toContain("These do not establish rights, revenue or returning visitors.");
    expect(html).not.toContain(environment === "production" ? "Development measurements" : "Production measurements");
  });
  it("uses neutral unavailable wording and never renders a live refresh for synthetic data", () => {
    const missing = renderToStaticMarkup(<MeasuredIntelligence data={undefined} />);
    expect(missing).toContain("Measurements · tab sessions");
    expect(missing).not.toContain("Production measurements"); expect(missing).not.toContain("Development measurements");
    const synthetic = renderToStaticMarkup(<MeasuredIntelligence data={{ environment: "synthetic", reason: "Fictional fixture", snapshot: null, refreshAllowed: true }} onRefresh={vi.fn()} />);
    expect(synthetic).toContain("Fictional synthetic measurements");
    expect(synthetic).not.toContain("<button"); expect(synthetic).not.toContain("Production measurements");
  });
  it.each(["development", "production"] as const)("labels %s review records without authorizing publication", environment => {
    const html = renderToStaticMarkup(<WorkflowReviewPanel data={workspace(environment)} momentId={null} />);
    expect(html).toContain(`${environment === "production" ? "Production" : "Development"} review.`);
    expect(html).toContain("proposals do not authorize publication.");
    expect(html).not.toContain("Development only.");
  });
  it("keeps unknown review scope neutral and synthetic examples visibly isolated", () => {
    const missing = renderToStaticMarkup(<WorkflowReviewPanel data={workspace()} momentId={null} />);
    expect(missing).toContain("Internal review."); expect(missing).toContain("Review storage is disabled or unavailable.");
    expect(missing).not.toContain("Production review");
    const synthetic = renderToStaticMarkup(<WorkflowReviewPanel data={workspace("production", true)} momentId={null} />);
    expect(synthetic).toContain("Fictional synthetic review."); expect(synthetic).toContain("Synthetic examples never write to live workflows.");
    expect(synthetic).not.toContain("Production review"); expect(synthetic).not.toContain("Review reason<textarea");
  });
});
