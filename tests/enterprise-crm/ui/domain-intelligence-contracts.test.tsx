import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivationSummaryRow, OpportunityRow, OpportunityStageBadge, ParticipantGroup, PartnerReference, RightsSummary } from "@/components/enterprise-crm/domain";
import { ConfidenceScore, IntelligenceCard, RecommendedAction, SourceIndicator } from "@/components/enterprise-crm/intelligence";

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode) {
  act(() => root.render(<div data-product="enterprise-crm">{node}</div>));
}

function activate(element: HTMLElement, key: "Enter" | " ") {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    element.click();
  });
}

describe("Gate 3C domain and intelligence contracts", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("keeps caller-supplied opportunity stage and partner context while supporting default and caller actions", () => {
    const action = vi.fn();
    render(<><OpportunityStageBadge label="Caller stage" variant="review" /><PartnerReference label="Partner A" context="Caller partner context" status={<span>Caller status</span>} /><OpportunityRow title="Opportunity A" context="Caller context" partner={<PartnerReference label="Partner A" />} stageLabel="Caller stage" value={<span>Caller value</span>} decisionDate="Caller date" /><OpportunityRow title="Opportunity B" partner={<span>Partner B</span>} stageLabel="Caller other stage" action={<button type="button" onClick={action}>Review opportunity</button>} /></>);
    expect(container.textContent).toContain("Caller stage");
    expect(container.textContent).toContain("Caller partner context");
    expect(container.textContent).toContain("Caller value");
    expect(container.querySelector('[aria-label="Open Opportunity A"]')).not.toBeNull();
    activate(container.querySelector('[aria-label="Open Opportunity A"]')!, "Enter");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Review opportunity")!, " ");
    expect(action).toHaveBeenCalledOnce();
  });

  it("renders activation optional context/actions and participant empty/remainder semantics", () => {
    const action = vi.fn();
    const participants = [{ id: "one", label: "Athlete A" }, { id: "two", label: "Athlete B" }];
    render(<><ParticipantGroup participants={[]} label="Empty participants" /><ParticipantGroup participants={participants} max={1} label="Activation participants" /><ActivationSummaryRow title="Activation A" context="Caller context" status="Caller status" owner={<span>Owner A</span>} participants={participants} due="Caller due" rights={<span>Caller rights</span>} action={<button type="button" onClick={action}>Open activation</button>} /><ActivationSummaryRow title="Activation minimal" status="Caller minimal status" owner={<span>Owner B</span>} participants={[]} /></>);
    const groups = [...container.querySelectorAll(".crm-participant-group")];
    expect(groups[0].textContent).toContain("0 participants");
    expect(groups[0].querySelector(".crm-avatar-group")?.getAttribute("aria-label")).toBe("Empty participants: none");
    expect(groups[1].textContent).toContain("2 participants");
    expect(groups[1].querySelector(".crm-avatar-group__remainder")?.textContent).toBe("+1");
    expect(container.textContent).toContain("Caller rights");
    expect(container.textContent).toContain("Caller due");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Open activation")!, "Enter");
    expect(action).toHaveBeenCalledOnce();
  });

  it("labels blocked and restricted rights without color-only meaning and supports caller actions", () => {
    const action = vi.fn();
    render(<><RightsSummary label="Rights A" status="Blocked by caller" statusVariant="blocked" context="Caller evidence" reviewer={<span>Reviewer A</span>} due="Caller due" action={<button type="button" onClick={action}>Review rights</button>} /><RightsSummary label="Rights B" status="Restricted by caller" statusVariant="restricted" /></>);
    const summaries = [...container.querySelectorAll(".crm-rights-summary")];
    expect(summaries[0].getAttribute("aria-label")).toBe("Rights A: Blocked by caller");
    expect(summaries[0].textContent).toContain("Blocked by caller");
    expect(summaries[1].getAttribute("aria-label")).toBe("Rights B: Restricted by caller");
    expect(summaries[1].textContent).toContain("Restricted by caller");
    activate(summaries[0].querySelector("button")!, " ");
    expect(action).toHaveBeenCalledOnce();
  });

  it("distinguishes detected, inferred, recommended, verified, stale, and restricted intelligence without inference", () => {
    const cards = (["detected", "inferred", "recommended", "verified"] as const).map((meaning) => <IntelligenceCard key={meaning} title={`${meaning} title`} meaning={meaning} reason={`${meaning} reason`} confidence={50} freshness="Now" sources={<span>{meaning} source</span>} />);
    render(<>{cards}<IntelligenceCard title="stale title" meaning="detected" reason="stale reason" confidence={50} freshness="Earlier" sources={<span>stale source</span>} state="stale" /><IntelligenceCard title="Hidden title" meaning="verified" reason="Hidden reason" confidence={99} freshness="Hidden freshness" sources={<span>Hidden source</span>} state="restricted" /></>);
    for (const meaning of ["Detected", "Inferred", "Recommended", "Verified"]) expect(container.textContent).toContain(meaning);
    expect(container.textContent).toContain("Stale");
    expect(container.textContent).toContain("Intelligence unavailable");
    expect(container.textContent).toContain("cannot reveal whether a signal exists");
    expect(container.textContent).not.toContain("Hidden title");
    expect(container.textContent).not.toContain("Hidden source");
    expect(container.textContent).not.toContain("99%");
  });

  it("clamps confidence bounds and exposes coverage with progress semantics", () => {
    render(<><ConfidenceScore value={-12} label="Low confidence" coverage="1 of 5 sources" /><ConfidenceScore value={132} label="High confidence" coverage="5 of 5 sources" /></>);
    const progress = [...container.querySelectorAll('[role="progressbar"]')];
    expect(progress.map((node) => node.getAttribute("aria-valuenow"))).toEqual(["0", "100"]);
    expect(progress[0].getAttribute("aria-label")).toBe("Low confidence: 0%");
    expect(container.textContent).toContain("1 of 5 sources");
    expect(container.textContent).toContain("5 of 5 sources");
  });

  it("labels source provenance with optional detail/freshness and correct link/non-link semantics", () => {
    render(<><SourceIndicator label="Archive" detail="Verified source" freshness="12 minutes ago" href="/archive" /><SourceIndicator label="Brief" /></>);
    const link = container.querySelector("a.crm-source-indicator")!;
    expect(link.getAttribute("href")).toBe("/archive");
    expect(link.textContent).toContain("ArchiveVerified source12 minutes ago");
    const plain = container.querySelector("span.crm-source-indicator")!;
    expect(plain.textContent).toBe("Brief");
    expect(plain.querySelector("a")).toBeNull();
  });

  it("keeps recommended actions visibly human-controlled, keyboard-native, callback-only, and disabled when requested", () => {
    const action = vi.fn(); const disabledAction = vi.fn();
    render(<><RecommendedAction label="Review analysis" context="A person must verify sources." onAction={action} /><RecommendedAction label="Unavailable action" onAction={disabledAction} disabled /></>);
    expect(container.textContent).toContain("Human-controlled action");
    expect(container.textContent).toContain("A person must verify sources.");
    const buttons = [...container.querySelectorAll("button")];
    activate(buttons[0], "Enter");
    expect(action).toHaveBeenCalledOnce();
    expect(buttons[1].disabled).toBe(true);
    activate(buttons[1], " ");
    expect(disabledAction).not.toHaveBeenCalled();
  });
});
