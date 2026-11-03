import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityFeed, ApprovalRow, CommentThread, MemberPicker, NotificationItem, TaskRow, WorkloadLegend } from "@/components/enterprise-crm/workflow";

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

describe("Gate 3C workflow contracts", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("labels MemberPicker options, caller changes, disabled choices, disabled state, and errors", () => {
    const change = vi.fn();
    render(<MemberPicker value="" onChange={change} label="Eligible owner" members={[{ id: "one", label: "Morgan", context: "Rights" }, { id: "two", label: "Liam", disabled: true }]} error="Choose an owner" />);
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.labels?.[0]?.textContent).toContain("Eligible owner");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Choose an owner");
    expect(select.options[1].textContent).toBe("Morgan — Rights");
    expect(select.options[2].disabled).toBe(true);
    act(() => { select.value = "one"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(change).toHaveBeenCalledWith("one");

    render(<MemberPicker value="" onChange={change} members={[]} disabled />);
    expect((container.querySelector("select") as HTMLSelectElement).disabled).toBe(true);
    expect(container.querySelectorAll("option")).toHaveLength(1);
  });

  it("renders labelled workload distribution for populated and empty input with non-color labels", () => {
    render(<><WorkloadLegend items={[{ label: "High", count: 2, variant: "high" }, { label: "Delegated", count: 1, variant: "delegated" }]} /><WorkloadLegend items={[]} /></>);
    const lists = [...container.querySelectorAll('ul[aria-label="Workload distribution"]')];
    expect(lists).toHaveLength(2);
    expect(lists[0].textContent).toContain("High2");
    expect(lists[0].textContent).toContain("Delegated1");
    expect(lists[1].children).toHaveLength(0);
  });

  it("keeps task and approval status, priority, due date, approver, and actions visible without color-only meaning", () => {
    const taskAction = vi.fn(); const approvalAction = vi.fn();
    render(<><TaskRow title="Review fictional source" context="Media" status="Needs review" statusVariant="review" priority="high" due="Aug 26" action={<button type="button" onClick={taskAction}>Open task</button>} /><ApprovalRow title="Approve fictional source" context="Opportunity" status="Pending" approver="Taylor" due="Aug 29" action={<button type="button" onClick={approvalAction}>Open approval</button>} /></>);
    expect(container.textContent).toContain("Needs review");
    expect(container.textContent).toContain("High");
    expect(container.textContent).toContain("Aug 26");
    expect(container.textContent).toContain("Approver: Taylor");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Open task")!, "Enter");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Open approval")!, " ");
    expect(taskAction).toHaveBeenCalledOnce(); expect(approvalAction).toHaveBeenCalledOnce();
  });

  it("provides labelled ordered activity for populated and empty feeds with timestamps and context", () => {
    render(<><ActivityFeed label="Source activity" items={[{ id: "one", actor: "Morgan", action: "reviewed source", context: "Fictional context", timestamp: "Today, 8:42 AM" }]} /><ActivityFeed label="Empty activity" items={[]} /></>);
    const sections = [...container.querySelectorAll(".crm-activity-feed")];
    expect(sections[0].getAttribute("aria-labelledby")).toBe(sections[0].querySelector("h3")?.id);
    expect(sections[0].querySelector("ol")?.textContent).toContain("Morgan reviewed sourceFictional contextToday, 8:42 AM");
    expect(sections[1].querySelector("ol")?.children).toHaveLength(0);
  });

  it("supports native comment form submission, ignores blank input, clears success, and disables mutation controls", () => {
    const submit = vi.fn();
    render(<CommentThread comments={[{ id: "one", author: "Taylor", body: "Caller comment", timestamp: "Now" }]} onSubmit={submit} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(textarea.labels?.[0]?.textContent).toBe("Add comment");
    expect(button.disabled).toBe(true);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(textarea, "  Useful context  ");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(button.disabled).toBe(false);
    activate(button, "Enter");
    expect(submit).toHaveBeenCalledWith("Useful context");
    expect(textarea.value).toBe("");

    render(<CommentThread comments={[]} onSubmit={submit} disabled />);
    expect((container.querySelector("textarea") as HTMLTextAreaElement).disabled).toBe(true);
    expect((container.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector("ol")?.children).toHaveLength(0);
  });

  it("renders notification timestamp, safe context, unread text cue, optional action, and read state", () => {
    const action = vi.fn();
    render(<><NotificationItem title="Assigned" context="Permission-safe fictional context" timestamp="2 minutes ago" unread action={<button type="button" onClick={action}>View source</button>} /><NotificationItem title="Reviewed" context="Safe context" timestamp="Yesterday" /></>);
    const cards = [...container.querySelectorAll<HTMLElement>(".crm-notification-card")];
    expect(cards[0].dataset.unread).toBe("true");
    expect(cards[0].textContent).toContain("Unread");
    expect(cards[0].textContent).toContain("2 minutes ago");
    expect(cards[1].dataset.unread).toBeUndefined();
    expect(cards[1].textContent).not.toContain("Unread");
    activate(cards[0].querySelector("button")!, "Enter");
    expect(action).toHaveBeenCalledOnce();
  });
});
