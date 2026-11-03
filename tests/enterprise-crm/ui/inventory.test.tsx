import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Breadcrumb, FilterBar, SearchInput } from "@/components/enterprise-crm/navigation";
import { AvatarGroup, DataTable, MetricDelta, Pagination, Sparkline } from "@/components/enterprise-crm/data";
import { ActivityFeed, ApprovalRow, CommentThread, MemberPicker, NotificationItem, TaskRow, WorkloadLegend } from "@/components/enterprise-crm/workflow";
import { ActivationSummaryRow, OpportunityRow, OpportunityStageBadge, ParticipantGroup, PartnerReference, RightsSummary } from "@/components/enterprise-crm/domain";
import { ConfidenceScore, IntelligenceCard, RecommendedAction, SourceIndicator } from "@/components/enterprise-crm/intelligence";

let container: HTMLDivElement;
let root: Root;
function render(node: React.ReactNode) { act(() => root.render(<div data-product="enterprise-crm">{node}</div>)); }
function click(element: Element) { act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }

describe("Wave 2 Enterprise CRM component inventory", () => {
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it("provides labelled hierarchy, search, filters, and keyboard-native controls", () => {
    const reset = vi.fn();
    function Harness() { const [query, setQuery] = useState("rights"); return <><Breadcrumb items={[{ label: "Home", href: "/home" }, { label: "Rights" }]} /><FilterBar activeCount={1} onReset={reset} resultSummary="1 result"><SearchInput value={query} onChange={setQuery} label="Search rights" resultCount={1} /></FilterBar></>; }
    render(<Harness />);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Rights");
    const clear = container.querySelector('[aria-label="Clear Search rights"]')!;
    (clear as HTMLElement).focus(); expect(document.activeElement).toBe(clear); click(clear);
    expect((container.querySelector('input[type="search"]') as HTMLInputElement).value).toBe("");
    click([...container.querySelectorAll("button")].find((button) => button.textContent === "Reset filters")!);
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders accessible trend, delta, avatars, sortable responsive table states, and pagination", () => {
    const sort = vi.fn(); const page = vi.fn();
    render(<><Sparkline values={[1, 3, 2, 5]} label="Trend" summary="Rises overall" /><MetricDelta value="3" direction="up" sentiment="positive" context="this period" /><AvatarGroup items={[{ id: "1", label: "Morgan Lee" }, { id: "2", label: "Liam Patel" }]} max={1} /><DataTable caption="Members" rows={[{ id: "1", name: "Morgan" }]} rowKey={(row) => row.id} columns={[{ id: "name", header: "Name", sortable: true, cell: (row) => row.name }]} onSort={sort} /><Pagination page={1} pageCount={2} onPageChange={page} /></>);
    expect(container.querySelector('svg[role="img"]')?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(container.querySelector(".crm-avatar-group")?.getAttribute("aria-label")).toContain("Morgan Lee");
    const sortButton = container.querySelector('th button')!; (sortButton as HTMLElement).focus(); click(sortButton); expect(sort).toHaveBeenCalledWith({ columnId: "name", direction: "ascending" });
    click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Next"))!); expect(page).toHaveBeenCalledWith(2);
    render(<DataTable caption="Restricted records" rows={[]} rowKey={() => "none"} columns={[]} state="restricted" />);
    expect(container.textContent).toContain("Access restricted");
  });

  it("exports member, workload, task, approval, activity, comment, and notification contracts", () => {
    const memberChange = vi.fn(); const comment = vi.fn();
    render(<><MemberPicker value="" onChange={memberChange} members={[{ id: "1", label: "Morgan", context: "Eligible" }]} /><WorkloadLegend items={[{ label: "High", count: 1, variant: "high" }]} /><TaskRow title="Review source" status="Open" priority="high" /><ApprovalRow title="Approve source" status="Review" approver="Taylor" /><ActivityFeed items={[{ id: "1", actor: "Morgan", action: "reviewed source", timestamp: "Now" }]} /><CommentThread comments={[]} onSubmit={comment} /><NotificationItem title="Assigned" context="Safe context" timestamp="Now" unread /></>);
    const select = container.querySelector("select") as HTMLSelectElement; select.value = "1"; act(() => select.dispatchEvent(new Event("change", { bubbles: true }))); expect(memberChange).toHaveBeenCalledWith("1");
    expect(container.querySelector(".crm-workload-legend")?.getAttribute("aria-label")).toBe("Workload distribution");
    expect(container.textContent).toContain("Taylor"); expect(container.textContent).toContain("reviewed source"); expect(container.textContent).toContain("Unread");
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement; act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(textarea, "Useful context"); textarea.dispatchEvent(new Event("input", { bubbles: true })); }); const submit = [...container.querySelectorAll("button")].find((button) => button.textContent === "Add comment")!; (submit as HTMLElement).focus(); click(submit); expect(comment).toHaveBeenCalledWith("Useful context");
  });

  it("composes opportunity, activation, partner, participant, stage, and rights context without fixed domain vocabulary", () => {
    render(<><OpportunityStageBadge label="Caller stage" variant="review" /><PartnerReference label="Partner A" /><ParticipantGroup participants={[{ id: "1", label: "Athlete A" }]} /><OpportunityRow title="Opportunity A" partner={<PartnerReference label="Partner A" />} stageLabel="Caller stage" /><ActivationSummaryRow title="Activation A" status="Caller status" owner={<span>Owner A</span>} participants={[]} /><RightsSummary label="Rights A" status="Caller rights" statusVariant="blocked" /></>);
    expect(container.textContent).toContain("Caller stage"); expect(container.textContent).toContain("Partner A"); expect(container.textContent).toContain("1 participant"); expect(container.textContent).toContain("Activation A");
    expect(container.querySelector('[aria-label="Rights A: Caller rights"]')).not.toBeNull();
  });

  it("distinguishes intelligence meaning, evidence, confidence, freshness, and human action", () => {
    const action = vi.fn();
    render(<><IntelligenceCard title="Review timing" meaning="recommended" reason="Human review is required." confidence={78} coverage="4 of 5 sources" freshness="18 minutes ago" sources={<SourceIndicator label="Archive" detail="Verified source" freshness="12 minutes ago" />} action={<RecommendedAction label="Review analysis" onAction={action} />} /><ConfidenceScore value={120} label="Coverage" /><SourceIndicator label="Brief" /><RecommendedAction label="Save for review" disabled /></>);
    expect(container.textContent).toContain("Recommended"); expect(container.textContent).toContain("Provenance"); expect(container.textContent).toContain("18 minutes ago");
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("78");
    const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Review analysis"))!; (button as HTMLElement).focus(); click(button); expect(action).toHaveBeenCalledOnce();
    render(<IntelligenceCard title="Hidden" meaning="detected" reason="Hidden" confidence={50} freshness="Now" sources={<span>Hidden source</span>} state="restricted" />);
    expect(container.textContent).toContain("Intelligence unavailable"); expect(container.textContent).not.toContain("Hidden source"); expect(container.textContent).not.toContain("Hidden");
  });
});
