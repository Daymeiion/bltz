import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PillTabs } from "@/components/enterprise-crm/navigation";
import { KpiCard, PriorityBadge, StatusBadge } from "@/components/enterprise-crm/data";
import { AttentionRow, ExecutiveAttentionCard, MemberWorkload } from "@/components/enterprise-crm/workflow";
import { ErrorState, RestrictedState, SuccessState } from "@/components/enterprise-crm/states";

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode) {
  act(() => root.render(<div data-product="enterprise-crm">{node}</div>));
}

function TabsHarness() {
  const [current, setCurrent] = useState("overview");
  return <PillTabs label="Executive views" currentId={current} onChange={setCurrent} items={[{ id: "overview", label: "Executive Overview" }, { id: "athletics", label: "Athletics" }, { id: "pipeline", label: "Pipeline", disabled: true }]} />;
}

describe("Enterprise CRM shared UI contracts", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("supports roving selection and disabled state in PillTabs", () => {
    render(<TabsHarness />);
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs[0].focus();
    act(() => tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    expect(container.querySelector('[aria-disabled="true"]')?.textContent).toContain("Pipeline");
  });

  it("does not substitute zeroes for loading or unavailable KPI values", () => {
    render(<><KpiCard label="Active Activations" timeframe="Current" state="loading" /><KpiCard label="Revenue YTD" timeframe="YTD" state="unavailable" /></>);
    expect(container.querySelector('[aria-label="Active Activations is loading"]')).not.toBeNull();
    expect(container.textContent).toContain("Metric unavailable");
    expect(container.textContent).not.toContain("0");
  });

  it("pairs semantic and priority colors with visible text and icons", () => {
    render(<><StatusBadge label="Needs review" variant="review" /><PriorityBadge priority="high" /></>);
    expect(container.textContent).toContain("Needs review");
    expect(container.textContent).toContain("High");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("composes attention and workload without business mutations", () => {
    render(<><ExecutiveAttentionCard count={1}><AttentionRow title="Rights review" context="Media" status="Needs review" statusVariant="review" priority="high" due="Aug 26" /></ExecutiveAttentionCard><MemberWorkload members={[{ id: "1", name: "Morgan Lee", context: "Rights manager", assigned: 4, capacityPercent: 75, band: "high" }]} /></>);
    expect(container.textContent).toContain("Executive Attention");
    expect(container.textContent).toContain("Morgan Lee");
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("75");
  });

  it("announces recoverable errors and durable success without exposing restricted data", () => {
    render(<><ErrorState onRetry={() => undefined} /><RestrictedState /><SuccessState /></>);
    expect(container.querySelector('[aria-live="assertive"]')).not.toBeNull();
    expect(container.textContent).toContain("Access restricted");
    expect(container.textContent).toContain("Update complete");
  });
});
